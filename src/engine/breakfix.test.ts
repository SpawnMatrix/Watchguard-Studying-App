import { describe, expect, it } from 'vitest';
import { breakFixDiagram, buildWorkingNetwork, connectivityTests, createScenario, effectiveAddressing, faults, runAllTests, type BreakFixNetwork } from './breakfix';
import { seededRandom } from './random';

const failing = (net: BreakFixNetwork) => runAllTests(net).filter(t => !t.pass).map(t => t.id).sort();
const clone = (net: BreakFixNetwork): BreakFixNetwork => JSON.parse(JSON.stringify(net));

/** What each fault must break, and nothing more. This pins the simulation's behaviour. */
const EXPECTED: Record<string, string[]> = {
  'pc2-gateway': ['pc2-lab', 'pc2-web'],
  'pc2-mask': ['pc2-files', 'pc2-lab', 'pc2-web'],
  'pc2-dns': ['pc2-web'],
  'pc1-vlan': ['pc1-dns', 'pc1-web'],
  'pc2-vlan': ['pc2-files', 'pc2-lab', 'pc2-web'],
  'https-disabled': ['pc1-web', 'pc2-web'],
  'dns-policy': ['pc1-dns', 'pc1-web', 'pc2-web'],
  'deny-above': ['pc1-web', 'pc2-web'],
  'nat-off': ['pc1-dns', 'pc1-web', 'pc2-web'],
  'snat-target': ['customer-web'],
  'inbound-port': ['customer-web'],
  'web-gateway': ['customer-web'],
  'lab-route': ['pc2-lab'],
  'lab-return': ['pc2-lab'],
  'dhcp-scope': ['pc1-dns', 'pc1-web'],
  'dhcp-dns': ['pc1-dns', 'pc1-web'],
  'dhcp-gateway': ['pc1-dns', 'pc1-web'],
};

describe('break/fix working network', () => {
  it('passes every connectivity test for every addressing plan', () => {
    for (let seed = 1; seed <= 200; seed++) {
      expect(failing(buildWorkingNetwork(seededRandom(seed))), `seed ${seed}`).toEqual([]);
    }
  });

  it('gives the DHCP client a real lease from the scope', () => {
    const net = buildWorkingNetwork(seededRandom(3));
    const lease = effectiveAddressing(net, net.hosts.find(h => h.id === 'pc1')!);
    expect(lease.problem).toBeUndefined();
    expect(lease.ip).toBe(net.firebox.dhcp.start);
    expect(lease.gateway).toBe(net.firebox.interfaces.find(i => i.id === 'eth1')!.ip);
  });
});

describe('break/fix faults', () => {
  it('has an expectation for every fault', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual(faults.map(f => f.id).sort());
  });

  for (const fault of faults) {
    it(`${fault.id}: breaks exactly the expected tests, and restoring the setting fixes them`, () => {
      for (let seed = 1; seed <= 40; seed++) {
        const scenario = createScenario(seed, fault.id);
        expect(scenario.fault.id).toBe(fault.id);
        expect(failing(scenario.broken), `seed ${seed}`).toEqual(EXPECTED[fault.id]);
        expect(failing(scenario.working), `seed ${seed}`).toEqual([]);
        // Explanations quote both the broken and the correct value where there is one.
        expect(fault.explain(scenario.working, scenario.broken).length).toBeGreaterThan(60);
      }
    });
  }

  it('reaches every fault from random seeds', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 400; seed++) seen.add(createScenario(seed).fault.id);
    expect([...seen].sort()).toEqual(faults.map(f => f.id).sort());
  });

  it('is reproducible from its seed', () => {
    expect(createScenario(77)).toEqual(createScenario(77));
  });
});

describe('the simulation judges the configuration, not an answer key', () => {
  it('accepts either real fix for a deny policy placed above an allow', () => {
    const { broken } = createScenario(5, 'deny-above');
    const disabled = clone(broken);
    disabled.firebox.policies.find(p => p.id === 'block-test')!.enabled = false;
    expect(failing(disabled)).toEqual([]);

    const moved = clone(broken);
    const index = moved.firebox.policies.findIndex(p => p.id === 'block-test');
    const [deny] = moved.firebox.policies.splice(index, 1);
    moved.firebox.policies.splice(moved.firebox.policies.findIndex(p => p.id === 'https') + 1, 0, deny);
    expect(failing(moved)).toEqual([]);
  });

  it('does not accept a plausible but wrong fix', () => {
    const { broken, working } = createScenario(9, 'pc2-gateway');
    const wrong = clone(broken);
    // The file server's address is on the right subnet, but it is not a router.
    wrong.hosts.find(h => h.id === 'pc2')!.gateway = working.hosts.find(h => h.id === 'files')!.ip;
    expect(failing(wrong)).toContain('pc2-web');
  });

  it('lets a careless change break something that was working', () => {
    const { working } = createScenario(12, 'lab-route');
    const net = clone(working);
    net.firebox.dynamicNat.trusted = false;
    expect(failing(net)).toEqual(['pc1-dns', 'pc1-web', 'pc2-web']);
  });

  it('accepts a different correct design, such as moving the DHCP scope within the subnet', () => {
    const { broken, working } = createScenario(21, 'dhcp-scope');
    const net = clone(broken);
    const base = working.firebox.dhcp.start.split('.').slice(0, 3).join('.');
    net.firebox.dhcp.start = `${base}.200`;
    net.firebox.dhcp.end = `${base}.220`;
    expect(failing(net)).toEqual([]);
  });

  it('rejects invalid addresses instead of crashing', () => {
    const { working } = createScenario(2, 'pc2-dns');
    const net = clone(working);
    const pc2 = net.hosts.find(h => h.id === 'pc2')!;
    pc2.ip = '10.0.1.300';
    pc2.gateway = 'not an address';
    expect(() => runAllTests(net)).not.toThrow();
    expect(failing(net)).toContain('pc2-files');
  });
});

describe('trace evidence', () => {
  const trace = (seed: number, faultId: string, testId: string) =>
    runAllTests(createScenario(seed, faultId).broken).find(t => t.id === testId)!.lines.map(l => l.text).join('\n');

  it('reports what a technician would see for each kind of fault', () => {
    expect(trace(1, 'https-disabled', 'pc1-web')).toMatch(/Unhandled Internal Packet-00/);
    expect(trace(1, 'deny-above', 'pc2-web')).toMatch(/policy "Block-Web-Test"/);
    expect(trace(1, 'dhcp-scope', 'pc1-dns')).toMatch(/self-assigned 169\.254/);
    expect(trace(1, 'pc2-gateway', 'pc2-web')).toMatch(/ARP who-has|not its address/);
    expect(trace(1, 'nat-off', 'pc2-web')).toMatch(/no dynamic NAT/);
    expect(trace(1, 'inbound-port', 'customer-web')).toMatch(/Unhandled External Packet-00/);
    expect(trace(1, 'web-gateway', 'customer-web')).toMatch(/Reply lost/);
    expect(trace(1, 'pc1-vlan', 'pc1-dns')).toMatch(/VLAN/);
  });

  it('marks the device where each failing test stopped', () => {
    const results = runAllTests(createScenario(4, 'snat-target').broken);
    expect(results.find(t => t.id === 'customer-web')!.stoppedAt).toBe('firebox');
    const vlan = runAllTests(createScenario(4, 'pc2-vlan').broken);
    expect(vlan.find(t => t.id === 'pc2-files')!.stoppedAt).toBe('pc2');
  });
});

describe('break/fix diagram', () => {
  it('draws every device the tests refer to, with a selectable hotspot for each', () => {
    const d = breakFixDiagram(createScenario(6).broken);
    const ids = new Set(d.nodes.map(n => n.id));
    for (const id of ['internet', 'firebox', 'switch', 'pc1', 'pc2', 'files', 'web', 'r1', 'lab']) expect(ids.has(id), id).toBe(true);
    for (const edge of d.edges) { expect(ids.has(edge.from)).toBe(true); expect(ids.has(edge.to)).toBe(true); }
    expect(d.hotspots!.map(h => h.targetId).sort()).toEqual([...ids].sort());
    expect(connectivityTests).toHaveLength(6);
  });

  it('never prints the settings under test on the map', () => {
    for (const faultId of ['pc2-gateway', 'pc2-dns', 'pc1-vlan', 'lab-return']) {
      const { broken } = createScenario(8, faultId);
      const diagram = breakFixDiagram(broken);
      const text = JSON.stringify(diagram);
      const detail = (id: string) => diagram.nodes.find(n => n.id === id)!.detail ?? '';
      const pc2 = broken.hosts.find(h => h.id === 'pc2')!, lab = broken.hosts.find(h => h.id === 'lab')!;
      // A wrong gateway can coincide with another device's real address, which the map may show on that device.
      if (faultId === 'pc2-gateway') expect(detail('pc2')).not.toContain(pc2.gateway);
      if (faultId === 'pc2-dns') expect(text).not.toContain(`"${pc2.dns}"`);
      if (faultId === 'pc1-vlan') expect(text).not.toMatch(/VLAN \d/);
      if (faultId === 'lab-return') expect(detail('lab')).not.toContain(lab.gateway);
    }
  });
});
