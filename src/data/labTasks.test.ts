import { describe, expect, it } from 'vitest';
import { handsOnLabs, simForStep } from './labTasks';
import { watchguardLabs } from './labs';
import { configuredFirebox, factoryDefault, matchPolicy, pcAddress, routeLookup, simReduce, type FireboxSim, type SimAction } from '../engine/labSim';

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
