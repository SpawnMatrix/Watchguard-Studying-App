/**
 * Hands-on tasks: what each lab step asks the learner to actually do in the simulated Firebox.
 *
 * A task has a goal in simulator terms, the page it starts from, a check against the simulator's
 * configuration and the events it recorded, and a scripted solution. The solution is not shown to
 * learners. It does two jobs: it rebuilds the simulator to the state a returning learner had reached
 * (simulator state is not saved, step progress is), and it lets labTasks.test.ts prove every check can
 * be satisfied by doing exactly what the lab says, and is not satisfied before.
 *
 * Only single-Firebox labs are hands-on: 1, 3, 6, 8, 9, 10, 11, 14 and 17. Labs needing a second Firebox, Active Directory, Dimension or
 * WatchGuard Cloud keep their instructions and checkpoints.
 */
import {
  configuredFirebox, factoryDefault, pcAddress, simReduce, UPGRADE_VERSION,
  type FireboxSim, type PageId, type SimAction,
} from '../engine/labSim';

export interface LabTask {
  /** What to do, phrased for the simulator. */
  goal: string;
  page: PageId;
  check: (s: FireboxSim) => boolean;
  solve: (s: FireboxSim) => FireboxSim;
}

export interface HandsOnLab {
  initial: () => FireboxSim;
  /** Shown above the simulator: what is already set up and any credentials the lab needs. */
  briefing: string;
  tasks: Record<number, LabTask>;
}

const run = (s: FireboxSim, ...actions: SimAction[]) => actions.reduce(simReduce, s);
const afterIndex = (s: FireboxSim, first: (e: FireboxSim['events'][number]) => boolean, then: (e: FireboxSim['events'][number]) => boolean) => {
  const i = s.events.findIndex(first);
  return i >= 0 && s.events.slice(i + 1).some(then);
};
const policyNamed = (s: FireboxSim, name: string) => s.policies.find(p => p.name.toLowerCase() === name.toLowerCase());
const manualBackup = (s: FireboxSim) => [...s.backups].reverse().find(b => !b.automatic && b.version === s.version);

/** A lab's finished state, as the starting point for a lab that builds on it, with its history cleared. */
function afterLab(labId: number): FireboxSim {
  const lab = handsOnLabs[labId];
  const done = Object.entries(lab.tasks).sort(([a], [b]) => Number(a) - Number(b)).reduce((s, [, task]) => task.solve(s), lab.initial());
  return { ...done, events: [], log: [], terminal: [], message: null };
}

const CONFIGURED_BRIEFING = 'This Firebox already has the Lab 1 configuration: Trusted 10.0.1.1/24 with DHCP, External 203.0.113.2/24, DNS 1.1.1.1 and 8.8.8.8. Admin passphrase: readwrite-pass.';

export const handsOnLabs: Record<number, HandsOnLab> = {
  1: {
    initial: factoryDefault,
    briefing: 'A factory-default Firebox on the bench, powered off, with nothing plugged in. The simulator uses a setup wizard that asks for the same settings as the Quick Setup Wizard.',
    tasks: {
      1: {
        goal: 'On the Management PC page, power on the Firebox, connect both cables, then run ipconfig and confirm a lease on 10.0.1.0/24.',
        page: 'bench',
        check: s => s.bench.power && s.bench.externalCable && s.bench.trustedCable && s.events.some(e => e.kind === 'ipconfig' && e.ip.startsWith('10.0.1.')),
        solve: s => run(s, { type: 'bench', power: true, externalCable: true, trustedCable: true }, { type: 'ipconfig' }),
      },
      2: {
        goal: 'In the Setup Wizard, name the Firebox, configure the external interface, and keep the trusted interface at 10.0.1.1/24 with DHCP on. Continue until you reach DNS.',
        page: 'wizard',
        check: s => s.setupComplete || (s.wizard.page >= 3 && s.wizard.deviceName.trim() !== '' && s.wizard.trustedIp === '10.0.1.1' && s.wizard.trustedPrefix === 24 && s.wizard.dhcpEnabled),
        solve: s => run(s,
          { type: 'wizardUpdate', patch: { deviceName: 'Firebox-Lab', externalMode: 'Static', externalIp: '203.0.113.2', externalPrefix: 24, externalGateway: '203.0.113.1' } },
          { type: 'wizardNext' }, { type: 'wizardNext' }, { type: 'wizardNext' }),
      },
      3: {
        goal: 'Enter DNS servers 1.1.1.1 and 8.8.8.8, set different status and admin passphrases, and finish the wizard.',
        page: 'wizard',
        check: s => s.setupComplete && s.dns.length > 0 && s.passphrases.status !== s.passphrases.admin,
        solve: s => run(s,
          { type: 'wizardUpdate', patch: { dns1: '1.1.1.1', dns2: '8.8.8.8' } }, { type: 'wizardNext' },
          { type: 'wizardUpdate', patch: { statusPassphrase: 'readonly-pass', adminPassphrase: 'readwrite-pass' } }, { type: 'wizardNext' }),
      },
      4: {
        goal: 'In System > Users and Roles, add a device management user with the Device Monitor role.',
        page: 'usersRoles',
        check: s => s.users.some(u => u.role === 'Device Monitor'),
        solve: s => run(s, { type: 'addUser', user: { name: 'monitor', role: 'Device Monitor' }, passphrase: 'monitor-pass' }),
      },
      5: {
        goal: 'In System > Configuration File, save the configuration, turn on Always create a backup, and save again. Confirm both files are listed.',
        page: 'configFile',
        check: s => s.configFiles.some(f => f.endsWith('.xml')) && s.configFiles.some(f => f.endsWith('.fxi')),
        solve: s => run(s, { type: 'saveConfig' }, { type: 'setAlwaysBackup', enabled: true }, { type: 'saveConfig' }),
      },
    },
  },

  3: {
    initial: configuredFirebox,
    briefing: `${CONFIGURED_BRIEFING} It runs Fireware 12.9.2, and ${UPGRADE_VERSION} is ready to install.`,
    tasks: {
      1: {
        goal: `In System > Upgrade OS, upgrade to Fireware ${UPGRADE_VERSION} with the admin passphrase.`,
        page: 'upgrade',
        check: s => s.version === UPGRADE_VERSION,
        solve: s => run(s, { type: 'upgrade', adminPassphrase: 'readwrite-pass' }),
      },
      2: {
        goal: 'In System > Backup and Restore Image, create a new backup image with an encryption key. Check which Fireware version it is made for.',
        page: 'backup',
        check: s => s.version === UPGRADE_VERSION && !!manualBackup(s),
        solve: s => run(s, { type: 'createBackup', name: 'after-upgrade', key: 'lab-backup-key' }),
      },
      3: {
        goal: 'In Firewall > Firewall Policies, add a Ping policy. This is the throwaway change the restore should remove.',
        page: 'policies',
        check: s => {
          const image = manualBackup(s);
          const before = image?.snapshot.policies.filter(p => p.service === 'Ping').length ?? 0;
          return !!image && s.policies.filter(p => p.service === 'Ping').length > before;
        },
        solve: s => run(s, { type: 'addPolicy', service: 'Ping', name: 'Ping.1', action: 'Allowed', from: ['Any-Trusted'], to: ['Any-External'] }),
      },
      4: {
        goal: 'Restore the backup image you made after the upgrade, then check Firewall Policies: the extra Ping policy should be gone.',
        page: 'backup',
        check: s => {
          const restored = [...s.events].reverse().find(e => e.kind === 'restore');
          const image = restored && restored.kind === 'restore' ? s.backups.find(b => b.id === restored.id) : undefined;
          return !!image && !image.automatic && s.policies.map(p => p.name).join() === image.snapshot.policies.map(p => p.name).join();
        },
        solve: s => run(s, { type: 'restoreBackup', id: manualBackup(s)!.id, key: 'lab-backup-key' }),
      },
    },
  },

  6: {
    initial: configuredFirebox,
    briefing: CONFIGURED_BRIEFING,
    tasks: {
      1: {
        goal: 'On the Management PC page, ping 8.8.4.4. Then open Dashboard > Traffic Monitor and find which interface carried it.',
        page: 'bench',
        check: s => afterIndex(s, e => e.kind === 'ping' && e.dst === '8.8.4.4' && e.egress === 'External', e => e.kind === 'view' && e.page === 'trafficMonitor'),
        solve: s => run(s, { type: 'ping', host: '8.8.4.4' }, { type: 'view', page: 'trafficMonitor' }),
      },
      2: {
        goal: 'In Network > Interfaces, edit interface 2: name DMZ, type Optional, 192.168.10.1/24, DHCP server off.',
        page: 'interfaces',
        check: s => {
          const i = s.interfaces.find(x => x.id === 2)!;
          return i.name === 'DMZ' && i.type === 'Optional' && i.ip === '192.168.10.1' && i.prefix === 24 && !i.dhcpServer;
        },
        solve: s => run(s, { type: 'saveInterface', iface: { ...s.interfaces.find(i => i.id === 2)!, name: 'DMZ', type: 'Optional', ip: '192.168.10.1', prefix: 24, dhcpServer: false } }),
      },
      3: {
        goal: 'In Network > Routes, add a Host IPv4 route to 8.8.4.4 through gateway 192.168.10.200, metric 1.',
        page: 'routes',
        check: s => s.routes.some(r => r.type === 'Host IPv4' && r.destination === '8.8.4.4' && r.gateway === '192.168.10.200' && r.metric === 1),
        solve: s => run(s, { type: 'addRoute', route: { type: 'Host IPv4', destination: '8.8.4.4', prefix: 32, gateway: '192.168.10.200', metric: 1 } }),
      },
      4: {
        goal: 'Ping 8.8.4.4 again and confirm it now leaves through DMZ (it times out: nothing answers at .200). Then check the route in System Status > Routes.',
        page: 'bench',
        check: s => s.events.some(e => e.kind === 'ping' && e.dst === '8.8.4.4' && e.egress === 'DMZ') && s.events.some(e => e.kind === 'view' && e.page === 'statusRoutes'),
        solve: s => run(s, { type: 'ping', host: '8.8.4.4' }, { type: 'view', page: 'statusRoutes' }),
      },
    },
  },

  9: {
    initial: configuredFirebox,
    briefing: `${CONFIGURED_BRIEFING} The Internet link is 250 Mbps down and 50 Mbps up.`,
    tasks: {
      1: {
        goal: 'On the Management PC page, run a speed test and note the baseline.',
        page: 'bench',
        check: s => s.events.some(e => e.kind === 'speedtest'),
        solve: s => run(s, { type: 'speedtest' }),
      },
      2: {
        goal: 'In System > Global Settings, on the Networking tab, enable all traffic management and QoS features.',
        page: 'globalSettings',
        check: s => s.trafficManagement.enabled,
        solve: s => run(s, { type: 'setTrafficManagement', enabled: true }),
      },
      3: {
        goal: 'In Firewall > Traffic Management, add a 500 Kbps action and a 1 Mbps (1000 Kbps) action, both scoped to All policies.',
        page: 'trafficManagement',
        check: s => [500, 1000].every(k => s.trafficManagement.actions.some(a => a.maxKbps === k && a.scope === 'All policies')),
        solve: s => run(s,
          { type: 'addTmAction', action: { name: 'Limit-500Kbps', maxKbps: 500, scope: 'All policies' } },
          { type: 'addTmAction', action: { name: 'Limit-1Mbps', maxKbps: 1000, scope: 'All policies' } }),
      },
      4: {
        goal: 'On the Outgoing, HTTP-proxy and HTTPS-proxy policies, set Forward to the 500 Kbps action and Reverse to the 1 Mbps action.',
        page: 'policies',
        check: s => ['Outgoing', 'HTTP-proxy', 'HTTPS-proxy'].every(name => {
          const p = policyNamed(s, name);
          const kbps = (action: string) => s.trafficManagement.actions.find(a => a.name === action)?.maxKbps;
          return !!p && kbps(p.tmForward) === 500 && kbps(p.tmReverse) === 1000;
        }),
        solve: s => {
          const fwd = s.trafficManagement.actions.find(a => a.maxKbps === 500)!.name;
          const rev = s.trafficManagement.actions.find(a => a.maxKbps === 1000)!.name;
          return run(s, ...['Outgoing', 'HTTP-proxy', 'HTTPS-proxy'].map(name =>
            ({ type: 'setPolicy', id: policyNamed(s, name)!.id, patch: { tmForward: fwd, tmReverse: rev } }) as SimAction));
        },
      },
      5: {
        goal: 'Run the speed test again and confirm upload and download are capped. Then disable traffic management to restore full speed.',
        page: 'bench',
        check: s => s.events.some(e => e.kind === 'speedtest' && e.upMbps <= 0.5 && e.downMbps <= 1) && !s.trafficManagement.enabled,
        solve: s => run(s, { type: 'speedtest' }, { type: 'setTrafficManagement', enabled: false }),
      },
    },
  },

  10: {
    initial: configuredFirebox,
    briefing: CONFIGURED_BRIEFING,
    tasks: {
      1: {
        goal: 'In Firewall > Firewall Policies, disable the Outgoing policy.',
        page: 'policies',
        check: s => policyNamed(s, 'Outgoing')?.enabled === false,
        solve: s => run(s, { type: 'setPolicy', id: policyNamed(s, 'Outgoing')!.id, patch: { enabled: false } }),
      },
      2: {
        goal: "Edit the DNS policy: remove Any-External from To and add only the Firebox's DNS servers, 1.1.1.1 and 8.8.8.8.",
        page: 'policies',
        check: s => {
          const to = policyNamed(s, 'DNS')?.to ?? [];
          return !to.includes('Any-External') && to.length === s.dns.length && s.dns.every(d => to.includes(d));
        },
        solve: s => run(s, { type: 'setPolicy', id: policyNamed(s, 'DNS')!.id, patch: { to: [...s.dns] } }),
      },
      3: {
        goal: 'Add an HTTP policy named HTTP Deny and an HTTPS policy named HTTPS Deny. Set each to Denied, with To set to *.example.com.',
        page: 'policies',
        check: s => ([['HTTP Deny', 'HTTP'], ['HTTPS Deny', 'HTTPS']] as const).every(([name, service]) => {
          const p = policyNamed(s, name);
          return !!p && p.service === service && p.action === 'Denied' && p.enabled && p.to.some(t => /example\.com$/i.test(t));
        }),
        solve: s => run(s,
          { type: 'addPolicy', service: 'HTTP', name: 'HTTP Deny', action: 'Denied', from: ['Any-Trusted'], to: ['*.example.com'] },
          { type: 'addPolicy', service: 'HTTPS', name: 'HTTPS Deny', action: 'Denied', from: ['Any-Trusted'], to: ['*.example.com'] }),
      },
      4: {
        goal: 'On the Management PC page, open http://www.example.com and https://www.watchguard.com. Then filter Traffic Monitor for deny.',
        page: 'bench',
        check: s => s.events.some(e => e.kind === 'browse' && /example\.com$/i.test(e.host) && !e.allowed) &&
          s.events.some(e => e.kind === 'browse' && !/example\.com$/i.test(e.host) && e.allowed) &&
          s.events.some(e => e.kind === 'trafficFilter' && /deny/i.test(e.text)),
        solve: s => run(s, { type: 'browse', url: 'http://www.example.com' }, { type: 'browse', url: 'https://www.watchguard.com' }, { type: 'trafficFilter', text: 'deny' }),
      },
    },
  },

  17: {
    initial: configuredFirebox,
    briefing: `${CONFIGURED_BRIEFING} Step 4 needs the Active Directory server from Lab 13, which this simulator does not include.`,
    tasks: {
      1: {
        goal: 'In System > Configuration File, download the configuration file and open the Configuration Report.',
        page: 'configFile',
        check: s => s.events.some(e => e.kind === 'downloadConfig') && s.events.some(e => e.kind === 'configReport'),
        solve: s => run(s, { type: 'downloadConfig' }, { type: 'configReport' }),
      },
      2: {
        goal: 'Browse from the Management PC to create some traffic, then open Dashboard > FireWatch and filter Source to the management PC address.',
        page: 'fireWatch',
        check: s => s.events.some(e => e.kind === 'fireWatchFilter' && e.source === pcAddress(s).ip),
        solve: s => run(s, { type: 'browse', url: 'https://www.watchguard.com' }, { type: 'fireWatchFilter', source: pcAddress(s).ip }),
      },
      3: {
        goal: 'In Firewall > Policy Checker, test a connection, for example from Trusted 10.0.1.2 to 198.51.100.40 on TCP 443, and read which policy handles it.',
        page: 'policyChecker',
        check: s => s.events.some(e => e.kind === 'policyCheck'),
        solve: s => run(s, { type: 'policyCheck', flow: { protocol: 'tcp', port: 443, srcIp: '10.0.1.2', srcZone: 'Trusted', dst: '198.51.100.40' } }),
      },
    },
  },
};

handsOnLabs[8] = {
  initial: () => afterLab(6),
  briefing: 'This Firebox has the Lab 1 configuration plus Lab 6: interface 2 is DMZ, Optional, 192.168.10.1/24. Nothing on the DMZ network answers, which is what this lab relies on.',
  tasks: {
    1: {
      goal: 'On the Management PC page, ping 1.1.1.1 as your baseline and note that it replies through External.',
      page: 'bench',
      check: s => s.events.some(e => e.kind === 'ping' && e.dst === '1.1.1.1' && e.replied && e.egress === 'External'),
      solve: s => run(s, { type: 'ping', host: '1.1.1.1' }),
    },
    2: {
      goal: 'In Network > Link Monitor, monitor External with three targets: Ping 8.8.8.8, DNS 1.1.1.1 querying watchguard.com, and TCP www.watchguard.com on port 80. Measure loss, latency and jitter with the DNS probe.',
      page: 'linkMonitor',
      check: s => {
        const m = s.linkMonitor.find(x => x.ifaceId === 0);
        if (!m) return false;
        const has = (type: string, host: string) => m.targets.some(x => x.type === type && x.host === host);
        return has('Ping', '8.8.8.8') && m.targets.some(x => x.type === 'DNS' && x.host === '1.1.1.1' && x.query.trim() !== '') &&
          m.targets.some(x => x.type === 'TCP' && x.port === 80) && m.measure !== null && m.targets[m.measure]?.type === 'DNS';
      },
      solve: s => run(s, { type: 'setMonitoredInterface', entry: { ifaceId: 0, nextHop: '', measure: 1, targets: [
        { type: 'Ping', host: '8.8.8.8', port: 0, query: '' },
        { type: 'DNS', host: '1.1.1.1', port: 53, query: 'watchguard.com' },
        { type: 'TCP', host: 'www.watchguard.com', port: 80, query: '' },
      ] } }),
    },
    3: {
      goal: 'Add the DMZ interface to Link Monitor with next hop 192.168.10.2.',
      page: 'linkMonitor',
      check: s => s.linkMonitor.some(x => x.ifaceId === 2 && x.nextHop === '192.168.10.2'),
      solve: s => run(s, { type: 'setMonitoredInterface', entry: { ifaceId: 2, nextHop: '192.168.10.2', measure: null, targets: [] } }),
    },
    4: {
      goal: 'In Network > SD-WAN, add an action named DMZ that uses the DMZ interface. Then edit the Ping policy to route through the DMZ SD-WAN action.',
      page: 'sdwan',
      check: s => !!s.sdwanActions.find(a => a.name === 'DMZ')?.interfaces.includes(2) && policyNamed(s, 'Ping')?.sdwan === 'DMZ',
      solve: s => run(s, { type: 'addSdwanAction', action: { name: 'DMZ', interfaces: [2] } }, { type: 'setPolicy', id: policyNamed(s, 'Ping')!.id, patch: { sdwan: 'DMZ' } }),
    },
    5: {
      goal: 'Ping 1.1.1.1 again and watch it fail, then look at System Status > SD-WAN to see why. Finally remove the SD-WAN action from the Ping policy.',
      page: 'bench',
      check: s => s.events.some(e => e.kind === 'ping' && e.dst === '1.1.1.1' && !e.replied) &&
        s.events.some(e => e.kind === 'view' && e.page === 'sdwanStatus') && policyNamed(s, 'Ping')?.sdwan === '',
      solve: s => run(s, { type: 'ping', host: '1.1.1.1' }, { type: 'view', page: 'sdwanStatus' }, { type: 'setPolicy', id: policyNamed(s, 'Ping')!.id, patch: { sdwan: '' } }),
    },
  },
};

handsOnLabs[11] = {
  initial: () => afterLab(10),
  briefing: 'This Firebox has Lab 10 applied: Outgoing is disabled, DNS only reaches 1.1.1.1 and 8.8.8.8, and HTTP Deny and HTTPS Deny block *.example.com. The management PC does not yet trust the Firebox Proxy Authority.',
  tasks: {
    1: {
      goal: 'In Firewall > Firewall Policies, delete the HTTP Deny and HTTPS Deny policies so the proxies take over.',
      page: 'policies',
      check: s => !policyNamed(s, 'HTTP Deny') && !policyNamed(s, 'HTTPS Deny'),
      solve: s => run(s, { type: 'deletePolicy', id: policyNamed(s, 'HTTP Deny')!.id }, { type: 'deletePolicy', id: policyNamed(s, 'HTTPS Deny')!.id }),
    },
    2: {
      goal: 'In Firewall > Proxy Actions, add a URL Paths rule to Default-HTTP-Client: pattern *example*, action Deny, logging on.',
      page: 'proxyActions',
      check: s => s.proxy.urlPaths.some(r => r.action === 'Deny' && r.log && /example/i.test(r.pattern)),
      solve: s => run(s, { type: 'addUrlPath', rule: { pattern: '*example*', action: 'Deny', log: true } }),
    },
    3: {
      goal: 'On Default-HTTPS-Client, set the action for connections that match no rule to Inspect, using Default-HTTP-Client.',
      page: 'proxyActions',
      check: s => s.proxy.httpsNoMatch === 'Inspect',
      solve: s => run(s, { type: 'setHttpsNoMatch', value: 'Inspect' }),
    },
    4: {
      goal: 'On the Management PC page, download the Proxy Authority certificate from the Certificate Portal, then install it as a trusted root. Try an HTTPS site first if you want to see the warning it fixes.',
      page: 'bench',
      check: s => s.pc.trustsProxyCa,
      solve: s => run(s, { type: 'downloadProxyCa' }, { type: 'installProxyCa' }),
    },
    5: {
      goal: 'Open https://search.lab.test/search?q=example and confirm the proxy blocks the search: it can only see "example" because it is inspecting inside the encrypted session.',
      page: 'bench',
      check: s => s.events.some(e => e.kind === 'browse' && e.host === 'search.lab.test' && e.blockedBy === 'proxy'),
      solve: s => run(s, { type: 'browse', url: 'https://search.lab.test/search?q=example' }),
    },
  },
};

handsOnLabs[14] = {
  initial: () => afterLab(11),
  briefing: 'This Firebox has Lab 11 applied: the HTTP-proxy blocks *example* and HTTPS is inspected, and the management PC trusts the Proxy Authority. Web access still comes from Any-Trusted.',
  tasks: {
    1: {
      goal: 'In Authentication > Servers, on Firebox-DB, add a user with a passphrase. Then add a group with that user as a member.',
      page: 'authServers',
      check: s => s.auth.groups.some(g => s.auth.users.some(u => u.groups.includes(g))),
      solve: s => run(s, { type: 'addAuthUser', name: 'jsmith', passphrase: 'jsmith-pass' }, { type: 'addAuthGroup', name: 'Web-Users', members: ['jsmith'] }),
    },
    2: {
      goal: 'Edit the HTTP-proxy and HTTPS-proxy policies: remove Any-Trusted and Any-Optional from From, and add your Firebox-DB group instead.',
      page: 'policies',
      check: s => ['HTTP-proxy', 'HTTPS-proxy'].every(name => {
        const from = policyNamed(s, name)?.from ?? [];
        return from.some(f => s.auth.groups.includes(f)) && !from.includes('Any-Trusted') && !from.includes('Any-Optional');
      }),
      solve: s => {
        const group = s.auth.groups.find(g => s.auth.users.some(u => u.groups.includes(g)))!;
        return run(s, ...['HTTP-proxy', 'HTTPS-proxy'].map(name => ({ type: 'setPolicy', id: policyNamed(s, name)!.id, patch: { from: [group] } }) as SimAction));
      },
    },
    3: {
      goal: 'In Authentication > Settings, enable automatic redirect to the authentication page. Then open a website from the Management PC and confirm you are sent to the login page.',
      page: 'authSettings',
      check: s => s.auth.autoRedirect && s.events.some(e => e.kind === 'browse' && e.redirected),
      solve: s => run(s, { type: 'setAutoRedirect', enabled: true }, { type: 'browse', url: 'https://www.watchguard.com' }),
    },
    4: {
      goal: 'Sign in to the authentication portal as your user, open a website again, and find src_user in Traffic Monitor. Then check System Status > Authentication List for your session.',
      page: 'bench',
      check: s => afterIndex(s, e => e.kind === 'authLogin', e => e.kind === 'browse' && e.allowed) && s.events.some(e => e.kind === 'view' && e.page === 'authList'),
      solve: s => run(s, { type: 'authLogin', user: s.auth.users[0].name, passphrase: 'jsmith-pass' }, { type: 'browse', url: 'https://www.watchguard.com' }, { type: 'view', page: 'authList' }),
    },
  },
};

export const isHandsOn = (labId: number) => labId in handsOnLabs;

/** The simulator as a learner would have it at the start of a step: every earlier task done. */
export function simForStep(labId: number, stepIndex: number): FireboxSim | null {
  const lab = handsOnLabs[labId];
  if (!lab) return null;
  let s = lab.initial();
  for (const [stepNumber, task] of Object.entries(lab.tasks).sort(([a], [b]) => Number(a) - Number(b))) {
    if (Number(stepNumber) - 1 >= stepIndex) break;
    s = task.solve(s);
  }
  return { ...s, message: null, terminal: [] };
}
