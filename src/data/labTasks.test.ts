import { describe, expect, it } from 'vitest';
import { handsOnLabs, simForStep } from './labTasks';
import { watchguardLabs } from './labs';
import { configuredFirebox, factoryDefault, globMatch, interfaceHealth, matchPolicy, pcAddress, routeLookup, simReduce, type FireboxSim, type SimAction } from '../engine/labSim';

const run = (s: FireboxSim, ...actions: SimAction[]) => actions.reduce(simReduce, s);

describe('hands-on lab tasks', () => {
  it('only attach tasks to steps that exist', () => {
    for (const [labId, lab] of Object.entries(handsOnLabs)) {
      const steps = watchguardLabs.find(l => l.id === Number(labId))!.steps.map(s => s.stepNumber);
      for (const stepNumber of Object.keys(lab.tasks).map(Number)) expect(steps, `lab ${labId}`).toContain(stepNumber);
    }
  });

  for (const [labId, lab] of Object.entries(handsOnLabs)) {
    it(`lab ${labId}: every task is unmet before doing it and met after doing exactly what it says`, () => {
      let s = lab.initial();
      for (const [stepNumber, task] of Object.entries(lab.tasks).sort(([a], [b]) => Number(a) - Number(b))) {
        expect(task.check(s), `step ${stepNumber} should not already be done`).toBe(false);
        s = task.solve(s);
        expect(s.message?.tone, `step ${stepNumber}: ${s.message?.text}`).not.toBe('error');
        expect(task.check(s), `step ${stepNumber} should be verified after its solution`).toBe(true);
      }
    });
  }

  it('rebuilds the simulator for a returning learner up to, but not including, their step', () => {
    const atStep3 = simForStep(6, 2)!;
    expect(atStep3.interfaces.find(i => i.id === 2)!.name).toBe('DMZ');
    expect(atStep3.routes).toEqual([]);
    expect(handsOnLabs[6].tasks[3].check(atStep3)).toBe(false);
    expect(simForStep(2, 0)).toBeNull();
  });
});

describe('simulated Firebox behaviour the labs depend on', () => {
  it('gives the management PC a lease only once the Firebox is powered and cabled', () => {
    const off = factoryDefault();
    expect(pcAddress(off).problem).toMatch(/powered off/);
    const on = run(off, { type: 'bench', power: true, trustedCable: true });
    expect(pcAddress(on).ip).toBe('10.0.1.2');
  });

  it('refuses a static route whose gateway is not on an enabled interface network', () => {
    const s = run(configuredFirebox(), { type: 'addRoute', route: { type: 'Host IPv4', destination: '8.8.4.4', prefix: 32, gateway: '192.168.10.200', metric: 1 } });
    expect(s.message?.tone).toBe('error');
    expect(s.routes).toEqual([]);
  });

  it('prefers a host route over the default route', () => {
    const s = simForStep(6, 3)!;
    const route = routeLookup(s, '8.8.4.4');
    expect('iface' in route && route.iface.name).toBe('DMZ');
    const other = routeLookup(s, '8.8.8.8');
    expect('iface' in other && other.iface.name).toBe('External');
  });

  it('puts a domain-specific deny ahead of the broad proxy policy', () => {
    const s = simForStep(10, 3)!;
    const flow = { protocol: 'tcp' as const, port: 80, srcIp: '10.0.1.2', srcZone: 'Trusted' as const, dst: '198.51.100.80', fqdn: 'www.example.com' };
    expect(matchPolicy(s, flow, 'External')?.name).toBe('HTTP Deny');
    expect(matchPolicy(s, { ...flow, dst: '198.51.100.40', fqdn: 'www.watchguard.com' }, 'External')?.name).toBe('HTTP-proxy');
  });

  it('breaks name resolution if DNS is restricted to servers the clients do not use', () => {
    let s = configuredFirebox();
    s = run(s, { type: 'setPolicy', id: 'outgoing', patch: { enabled: false } }, { type: 'setPolicy', id: 'dns', patch: { to: ['9.9.9.9'] } }, { type: 'browse', url: 'https://www.watchguard.com' });
    expect(s.terminal.join('\n')).toMatch(/DNS lookup for www\.watchguard\.com timed out/);
    expect(s.log[0].text).toMatch(/Unhandled Internal Packet/);
  });

  it('ignores traffic management actions until the global setting is on', () => {
    let s = simForStep(9, 3)!; // actions exist, not yet applied
    s = handsOnLabs[9].tasks[4].solve(s);
    s = run(s, { type: 'setTrafficManagement', enabled: false }, { type: 'speedtest' });
    expect(s.events.at(-1)).toMatchObject({ kind: 'speedtest', downMbps: 250, upMbps: 50 });
    s = run(s, { type: 'setTrafficManagement', enabled: true }, { type: 'speedtest' });
    expect(s.events.at(-1)).toMatchObject({ kind: 'speedtest', downMbps: 1, upMbps: 0.5 });
  });

  it('will not restore an image made for a different Fireware version', () => {
    let s = run(configuredFirebox(), { type: 'upgrade', adminPassphrase: 'readwrite-pass' });
    const automatic = s.backups.find(b => b.automatic)!;
    s = run(s, { type: 'restoreBackup', id: automatic.id, key: 'readwrite-pass' });
    expect(s.message?.text).toMatch(/created for Fireware 12\.9\.2, but the Firebox runs 12\.11/);
  });

  it('rejects the upgrade with the wrong admin passphrase', () => {
    const s = run(configuredFirebox(), { type: 'upgrade', adminPassphrase: 'nope' });
    expect(s.version).toBe('12.9.2');
    expect(s.message?.tone).toBe('error');
  });

  it('never mutates the state it was given', () => {
    const before = configuredFirebox();
    const copy = structuredClone(before);
    simReduce(before, { type: 'setPolicy', id: 'outgoing', patch: { enabled: false } });
    expect(before).toEqual(copy);
  });

  it('requires distinct passphrases of at least 8 characters before finishing setup', () => {
    let s = handsOnLabs[1].tasks[2].solve(handsOnLabs[1].tasks[1].solve(factoryDefault()));
    s = run(s, { type: 'wizardUpdate', patch: { dns1: '1.1.1.1' } }, { type: 'wizardNext' }, { type: 'wizardUpdate', patch: { statusPassphrase: 'same-pass', adminPassphrase: 'same-pass' } }, { type: 'wizardNext' });
    expect(s.setupComplete).toBe(false);
    expect(s.message?.text).toMatch(/must be different/);
  });
});

describe('simulated behaviour for the labs that build on the basics', () => {
  const lastBrowse = (s: FireboxSim) => [...s.events].reverse().find(e => e.kind === 'browse');

  it('matches proxy URL patterns the way the lab writes them', () => {
    expect(globMatch('*example*', 'search.lab.test/search?q=example')).toBe(true);
    expect(globMatch('*example*', 'www.watchguard.com/')).toBe(false);
    expect(globMatch('*.exe', 'downloads.lab.test/setup.exe')).toBe(true);
  });

  it('only applies URL path rules inside HTTPS once content inspection is on and the CA is trusted', () => {
    const search = { type: 'browse' as const, url: 'https://search.lab.test/search?q=example' };
    let s = simForStep(11, 2)!; // packet filters removed, *example* rule added, no inspection yet
    s = run(s, search);
    expect(lastBrowse(s)).toMatchObject({ allowed: true });
    s = run(s, { type: 'setHttpsNoMatch', value: 'Inspect' }, search);
    expect(lastBrowse(s)).toMatchObject({ allowed: false, blockedBy: 'certificate' });
    s = run(s, { type: 'downloadProxyCa' }, { type: 'installProxyCa' }, search);
    expect(lastBrowse(s)).toMatchObject({ allowed: false, blockedBy: 'proxy' });
    expect(s.log.find(l => l.text.includes('ProxyDeny'))?.text).toContain('rule="*example*" tls_inspected="yes"');
    s = run(s, { type: 'browse', url: 'https://www.watchguard.com/' });
    expect(lastBrowse(s)).toMatchObject({ allowed: true });
  });

  it('will not install a certificate that was never downloaded', () => {
    const s = run(configuredFirebox(), { type: 'installProxyCa' });
    expect(s.pc.trustsProxyCa).toBe(false);
    expect(s.message?.tone).toBe('error');
  });

  it('fails SD-WAN traffic over to the next active interface, and drops it when none is active', () => {
    let s = simForStep(8, 3)!; // External and DMZ monitored, no SD-WAN yet
    expect(interfaceHealth(s, 0).active).toBe(true);
    expect(interfaceHealth(s, 2).active).toBe(false);
    s = run(s, { type: 'addSdwanAction', action: { name: 'DMZ-then-External', interfaces: [2, 0] } }, { type: 'setPolicy', id: 'ping', patch: { sdwan: 'DMZ-then-External' } }, { type: 'ping', host: '1.1.1.1' });
    expect(s.events.at(-1)).toMatchObject({ kind: 'ping', replied: true, egress: 'External' });
    s = run(s, { type: 'addSdwanAction', action: { name: 'DMZ-only', interfaces: [2] } }, { type: 'setPolicy', id: 'ping', patch: { sdwan: 'DMZ-only' } }, { type: 'ping', host: '1.1.1.1' });
    expect(s.events.at(-1)).toMatchObject({ kind: 'ping', replied: false });
    expect(s.log[0].text).toMatch(/all gateways are down/);
  });

  it('validates Link Monitor targets', () => {
    const base = simForStep(8, 1)!;
    const dnsWithoutQuery = run(base, { type: 'setMonitoredInterface', entry: { ifaceId: 0, nextHop: '', measure: 0, targets: [{ type: 'DNS', host: '1.1.1.1', port: 53, query: '' }] } });
    expect(dnsWithoutQuery.message?.text).toMatch(/needs a domain name/);
    const dmzWithoutNextHop = run(base, { type: 'setMonitoredInterface', entry: { ifaceId: 2, nextHop: '10.9.9.9', measure: null, targets: [] } });
    expect(dmzWithoutNextHop.message?.text).toMatch(/next hop on the DMZ network/);
  });

  it('lets only signed-in group members through a group-scoped policy, redirecting everyone else when asked to', () => {
    let s = simForStep(14, 2)!; // group exists and the proxies are scoped to it
    s = run(s, { type: 'browse', url: 'https://www.watchguard.com' });
    expect(lastBrowse(s)).toMatchObject({ allowed: false, blockedBy: 'policy' });
    s = run(s, { type: 'setAutoRedirect', enabled: true }, { type: 'browse', url: 'https://www.watchguard.com' });
    expect(lastBrowse(s)).toMatchObject({ allowed: false, redirected: true });
    s = run(s, { type: 'authLogin', user: 'jsmith', passphrase: 'wrong-pass' });
    expect(s.pc.authUser).toBe('');
    s = run(s, { type: 'authLogin', user: 'jsmith', passphrase: 'jsmith-pass' }, { type: 'browse', url: 'https://www.watchguard.com' });
    expect(lastBrowse(s)).toMatchObject({ allowed: true });
    expect(s.log.find(l => l.disposition === 'Allow' && l.text.includes('HTTPS-proxy'))?.text).toMatch(/src_user="jsmith"/);
    // DNS is still allowed from Any-Trusted, so lookups never needed a signed-in user.
    expect(s.log.some(l => l.text.includes('(DNS-00)') && !l.text.includes('src_user') && l.disposition === 'Allow')).toBe(true);
  });

  it('carries the new configuration through backup and restore', () => {
    let s = simForStep(14, 3)!;
    s = run(s, { type: 'createBackup', name: 'with-auth', key: 'lab-backup-key' });
    s = run(s, { type: 'setAutoRedirect', enabled: false }, { type: 'deleteUrlPath', index: 0 });
    s = run(s, { type: 'restoreBackup', id: s.backups.at(-1)!.id, key: 'lab-backup-key' });
    expect(s.auth.autoRedirect).toBe(true);
    expect(s.proxy.urlPaths).toHaveLength(1);
  });
});
