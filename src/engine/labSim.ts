/**
 * The simulated Firebox that hands-on labs run against.
 *
 * Until now a lab was a page of instructions: learners read "In Network > Routes, add a Host IPv4
 * route" and pressed a button saying they had. Most have no Firebox to follow along on, so nothing
 * was ever actually configured. This gives each lab a device to configure and a management PC to
 * test from, and lets a lab step check the resulting configuration and what the learner observed.
 *
 * It models what the single-Firebox labs exercise, and no more: interfaces, static routes, a first
 * setup wizard, DNS, device passphrases and users, packet filter and proxy policies in a simplified
 * automatic order, traffic management actions, configuration files, backup images and OS upgrades.
 * Traffic from the management PC is traced through the route table and the policies and written to
 * a Traffic Monitor log in the shape Fireware uses. It is a teaching simulation, not Fireware.
 */
import { ipv4ToNumber, subnet } from './network';

/* ------------------------------------------------------------------------------------------------
 * Model
 * ---------------------------------------------------------------------------------------------- */

export type InterfaceType = 'External' | 'Trusted' | 'Optional' | 'Custom' | 'Disabled';

export interface SimInterface {
  id: number;
  name: string;
  type: InterfaceType;
  ip: string;
  prefix: number;
  /** Default gateway, for external interfaces. */
  gateway: string;
  dhcpServer: boolean;
  dhcpStart: string;
  dhcpEnd: string;
}

export type RouteType = 'Host IPv4' | 'Network IPv4';
export interface SimRoute { type: RouteType; destination: string; prefix: number; gateway: string; metric: number }

export type PolicyService =
  'Ping' | 'DNS' | 'HTTP' | 'HTTPS' | 'FTP' | 'HTTP-proxy' | 'HTTPS-proxy' | 'FTP-proxy' | 'WatchGuard Web UI' | 'WatchGuard' | 'Outgoing';

export interface SimPolicy {
  id: string;
  name: string;
  service: PolicyService;
  enabled: boolean;
  action: 'Allowed' | 'Denied';
  from: string[];
  to: string[];
  /** Traffic management action names; empty for none. */
  tmForward: string;
  tmReverse: string;
}

export interface TmAction { name: string; maxKbps: number; scope: 'Per policy' | 'All policies' }
export interface DeviceUser { name: string; role: 'Device Administrator' | 'Device Monitor' }

export interface ConfigSnapshot {
  deviceName: string;
  interfaces: SimInterface[];
  routes: SimRoute[];
  policies: SimPolicy[];
  dns: string[];
  trafficManagement: { enabled: boolean; actions: TmAction[] };
  users: DeviceUser[];
}

export interface BackupImage { id: string; name: string; version: string; key: string; automatic: boolean; snapshot: ConfigSnapshot }

export type PageId =
  | 'bench' | 'wizard' | 'frontPanel' | 'trafficMonitor' | 'fireWatch' | 'statusRoutes'
  | 'interfaces' | 'routes' | 'policies' | 'policyChecker' | 'trafficManagement'
  | 'globalSettings' | 'usersRoles' | 'configFile' | 'backup' | 'upgrade';

export type SimEvent =
  | { kind: 'ipconfig'; ip: string }
  | { kind: 'ping'; dst: string; egress: string; replied: boolean }
  | { kind: 'browse'; host: string; allowed: boolean; policy: string }
  | { kind: 'speedtest'; downMbps: number; upMbps: number }
  | { kind: 'view'; page: PageId }
  | { kind: 'trafficFilter'; text: string }
  | { kind: 'fireWatchFilter'; source: string }
  | { kind: 'policyCheck'; policy: string }
  | { kind: 'downloadConfig' }
  | { kind: 'configReport' }
  | { kind: 'saveConfig'; withBackup: boolean }
  | { kind: 'createBackup'; id: string; version: string }
  | { kind: 'restore'; id: string; version: string }
  | { kind: 'upgrade'; from: string; to: string };

export interface LogLine { id: number; disposition: 'Allow' | 'Deny' | 'Info'; text: string }

export interface WizardState {
  page: number;
  deviceName: string;
  externalMode: 'DHCP' | 'Static';
  externalIp: string;
  externalPrefix: number;
  externalGateway: string;
  trustedIp: string;
  trustedPrefix: number;
  dhcpEnabled: boolean;
  dns1: string;
  dns2: string;
  statusPassphrase: string;
  adminPassphrase: string;
}

export interface FireboxSim extends ConfigSnapshot {
  model: string;
  version: string;
  bench: { power: boolean; externalCable: boolean; trustedCable: boolean };
  setupComplete: boolean;
  wizard: WizardState;
  passphrases: { status: string; admin: string };
  configFiles: string[];
  alwaysBackup: boolean;
  backups: BackupImage[];
  events: SimEvent[];
  log: LogLine[];
  terminal: string[];
  message: { tone: 'error' | 'success'; text: string } | null;
  seq: number;
}

/* ------------------------------------------------------------------------------------------------
 * The world outside the Firebox
 * ---------------------------------------------------------------------------------------------- */

export const MANAGEMENT_PC = 'Management PC';
export const ISP_GATEWAY = '203.0.113.1';
export const UPGRADE_VERSION = '12.11';
/** Internet link speed before any traffic management, in Mbps. */
export const LINK = { down: 250, up: 50 };

/** Names the management PC can resolve, and hosts on the Internet that answer ping. */
export const INTERNET_HOSTS: Record<string, string> = {
  'www.example.com': '198.51.100.80',
  'downloads.example.com': '198.51.100.81',
  'www.watchguard.com': '198.51.100.40',
  'speedtest.example.net': '198.51.100.200',
};
const PINGABLE = new Set(['8.8.4.4', '8.8.8.8', '1.1.1.1', '198.51.100.40', '198.51.100.80']);
const DNS_SERVERS = new Set(['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1', '9.9.9.9']);

/* ------------------------------------------------------------------------------------------------
 * Addressing helpers
 * ---------------------------------------------------------------------------------------------- */

export function isIPv4(value: string): boolean {
  try { ipv4ToNumber(value); return true; } catch { return false; }
}
const validPrefix = (p: number) => Number.isInteger(p) && p >= 1 && p <= 32;
export const sameSubnet = (a: string, b: string, prefix: number) =>
  isIPv4(a) && isIPv4(b) && validPrefix(prefix) && subnet(a, prefix).network === subnet(b, prefix).network;
const isFqdnPattern = (value: string) => /^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(value) && !isIPv4(value);

/* ------------------------------------------------------------------------------------------------
 * Initial states
 * ---------------------------------------------------------------------------------------------- */

const iface = (id: number, name: string, type: InterfaceType, ip: string, extra: Partial<SimInterface> = {}): SimInterface =>
  ({ id, name, type, ip, prefix: 24, gateway: '', dhcpServer: false, dhcpStart: '', dhcpEnd: '', ...extra });

/** The policies the setup wizard creates. Order is for display; evaluation uses automatic order. */
export function defaultPolicies(): SimPolicy[] {
  const internal = ['Any-Trusted', 'Any-Optional'];
  const policy = (id: string, name: string, service: PolicyService, to: string[]): SimPolicy =>
    ({ id, name, service, enabled: true, action: 'Allowed', from: [...internal], to, tmForward: '', tmReverse: '' });
  return [
    policy('ftp-proxy', 'FTP-proxy', 'FTP-proxy', ['Any-External']),
    policy('http-proxy', 'HTTP-proxy', 'HTTP-proxy', ['Any-External']),
    policy('https-proxy', 'HTTPS-proxy', 'HTTPS-proxy', ['Any-External']),
    policy('webui', 'WatchGuard Web UI', 'WatchGuard Web UI', ['Firebox']),
    policy('ping', 'Ping', 'Ping', ['Any']),
    policy('dns', 'DNS', 'DNS', ['Any-External']),
    policy('watchguard', 'WatchGuard', 'WatchGuard', ['Firebox']),
    policy('outgoing', 'Outgoing', 'Outgoing', ['Any-External']),
  ];
}

const base = (): Omit<FireboxSim, 'deviceName' | 'setupComplete' | 'bench' | 'policies' | 'dns' | 'passphrases' | 'interfaces'> => ({
  model: 'Firebox T45',
  version: '12.9.2',
  routes: [],
  trafficManagement: { enabled: false, actions: [] },
  users: [],
  wizard: {
    page: 0, deviceName: '', externalMode: 'Static', externalIp: '', externalPrefix: 24, externalGateway: '',
    trustedIp: '10.0.1.1', trustedPrefix: 24, dhcpEnabled: true, dns1: '', dns2: '', statusPassphrase: '', adminPassphrase: '',
  },
  configFiles: [],
  alwaysBackup: false,
  backups: [],
  events: [],
  log: [],
  terminal: [],
  message: null,
  seq: 0,
});

/** A Firebox straight out of the box, for Lab 1. */
export function factoryDefault(): FireboxSim {
  return {
    ...base(),
    deviceName: 'FireboxT45',
    setupComplete: false,
    bench: { power: false, externalCable: false, trustedCable: false },
    interfaces: [
      iface(0, 'External', 'External', '', { prefix: 24 }),
      iface(1, 'Trusted', 'Trusted', '10.0.1.1', { dhcpServer: true, dhcpStart: '10.0.1.2', dhcpEnd: '10.0.1.254' }),
      iface(2, 'Optional-1', 'Disabled', '10.0.2.1'),
      iface(3, 'Optional-2', 'Disabled', '10.0.3.1'),
    ],
    policies: [],
    dns: [],
    passphrases: { status: '', admin: '' },
  };
}

/** The state a learner has after Lab 1, which every later single-Firebox lab starts from. */
export function configuredFirebox(): FireboxSim {
  return {
    ...base(),
    deviceName: 'Firebox-Lab',
    setupComplete: true,
    bench: { power: true, externalCable: true, trustedCable: true },
    interfaces: [
      iface(0, 'External', 'External', '203.0.113.2', { gateway: ISP_GATEWAY }),
      iface(1, 'Trusted', 'Trusted', '10.0.1.1', { dhcpServer: true, dhcpStart: '10.0.1.2', dhcpEnd: '10.0.1.100' }),
      iface(2, 'Optional-1', 'Disabled', '10.0.2.1'),
      iface(3, 'Optional-2', 'Disabled', '10.0.3.1'),
    ],
    policies: defaultPolicies(),
    dns: ['1.1.1.1', '8.8.8.8'],
    passphrases: { status: 'readonly-pass', admin: 'readwrite-pass' },
  };
}

export const snapshot = (s: FireboxSim): ConfigSnapshot => structuredClone({
  deviceName: s.deviceName, interfaces: s.interfaces, routes: s.routes, policies: s.policies,
  dns: s.dns, trafficManagement: s.trafficManagement, users: s.users,
});

/* ------------------------------------------------------------------------------------------------
 * Traffic
 * ---------------------------------------------------------------------------------------------- */

/** The management PC's DHCP lease from the trusted interface, or why it has none. */
export function pcAddress(s: FireboxSim): { ip: string; gateway: string; dns: string[]; problem?: string } {
  const trusted = s.interfaces.find(i => i.id === 1)!;
  if (!s.bench.power) return { ip: '169.254.12.40', gateway: '', dns: [], problem: 'The Firebox is powered off.' };
  if (!s.bench.trustedCable) return { ip: '169.254.12.40', gateway: '', dns: [], problem: 'The management PC is not cabled to the trusted interface.' };
  if (trusted.type === 'Disabled' || !trusted.dhcpServer || !isIPv4(trusted.dhcpStart)) {
    return { ip: '169.254.12.40', gateway: '', dns: [], problem: 'No DHCP server answered on interface 1.' };
  }
  return { ip: trusted.dhcpStart, gateway: trusted.ip, dns: s.setupComplete ? s.dns : [] };
}

interface RouteChoice { iface: SimInterface; nextHop: string; label: string }

export function routeLookup(s: FireboxSim, dst: string): RouteChoice | { error: string } {
  const live = s.interfaces.filter(i => i.type !== 'Disabled' && isIPv4(i.ip));
  const choices: (RouteChoice & { prefix: number; metric: number })[] = [];
  for (const i of live) if (sameSubnet(i.ip, dst, i.prefix)) choices.push({ iface: i, nextHop: dst, prefix: i.prefix, metric: 0, label: `connected network on ${i.name}` });
  for (const r of s.routes) {
    const matches = r.type === 'Host IPv4' ? r.destination === dst : sameSubnet(r.destination, dst, r.prefix);
    if (!matches) continue;
    const via = live.find(i => sameSubnet(i.ip, r.gateway, i.prefix));
    if (!via) continue;
    const prefix = r.type === 'Host IPv4' ? 32 : r.prefix;
    choices.push({ iface: via, nextHop: r.gateway, prefix, metric: r.metric, label: `${r.type} route ${r.destination}${r.type === 'Host IPv4' ? '' : `/${r.prefix}`} via ${r.gateway}` });
  }
  const external = live.find(i => i.type === 'External' && isIPv4(i.gateway));
  if (external) choices.push({ iface: external, nextHop: external.gateway, prefix: 0, metric: 0, label: `default route via ${external.gateway}` });
  if (!choices.length) return { error: 'No route to the destination.' };
  choices.sort((a, b) => b.prefix - a.prefix || a.metric - b.metric);
  return choices[0];
}

const SERVICE_PORTS: Record<PolicyService, { protocol: 'tcp' | 'udp' | 'icmp' | 'any'; ports: number[] }> = {
  Ping: { protocol: 'icmp', ports: [] },
  DNS: { protocol: 'udp', ports: [53] },
  HTTP: { protocol: 'tcp', ports: [80] },
  'HTTP-proxy': { protocol: 'tcp', ports: [80] },
  HTTPS: { protocol: 'tcp', ports: [443] },
  'HTTPS-proxy': { protocol: 'tcp', ports: [443] },
  FTP: { protocol: 'tcp', ports: [21] },
  'FTP-proxy': { protocol: 'tcp', ports: [21] },
  'WatchGuard Web UI': { protocol: 'tcp', ports: [8080] },
  WatchGuard: { protocol: 'tcp', ports: [4105, 4117, 4118] },
  Outgoing: { protocol: 'any', ports: [] },
};

export interface Flow { protocol: 'tcp' | 'udp' | 'icmp'; port: number; srcIp: string; srcZone: InterfaceType; dst: string; fqdn?: string }

function endpointMatches(entry: string, ip: string, zone: InterfaceType, s: FireboxSim, fqdn?: string): boolean {
  if (entry === 'Any') return true;
  if (entry === 'Any-Trusted') return zone === 'Trusted';
  if (entry === 'Any-Optional') return zone === 'Optional';
  if (entry === 'Any-External') return zone === 'External';
  if (entry === 'Firebox') return s.interfaces.some(i => i.ip === ip && i.type !== 'Disabled');
  if (isIPv4(entry)) return entry === ip;
  if (fqdn && isFqdnPattern(entry)) {
    const pattern = entry.toLowerCase(), name = fqdn.toLowerCase();
    return pattern.startsWith('*.') ? name === pattern.slice(2) || name.endsWith(pattern.slice(1)) : name === pattern;
  }
  return false;
}

/**
 * Simplified automatic policy order: policies naming a specific host or domain come before policies
 * naming zones, which come before Any; a specific service comes before the Outgoing catch-all; and
 * between otherwise equal policies, Denied comes first.
 */
export function orderedPolicies(s: FireboxSim): SimPolicy[] {
  const destScore = (p: SimPolicy) => Math.max(...p.to.map(t => isIPv4(t) || isFqdnPattern(t) ? 3 : t === 'Firebox' ? 2 : t === 'Any' ? 0 : 1), 0);
  return s.policies
    .map((p, index) => ({ p, index }))
    .sort((a, b) => destScore(b.p) - destScore(a.p) ||
      Number(b.p.service !== 'Outgoing') - Number(a.p.service !== 'Outgoing') ||
      Number(b.p.action === 'Denied') - Number(a.p.action === 'Denied') ||
      a.index - b.index)
    .map(x => x.p);
}

export function matchPolicy(s: FireboxSim, flow: Flow, dstZone: InterfaceType): SimPolicy | undefined {
  return orderedPolicies(s).find(p => {
    if (!p.enabled) return false;
    const svc = SERVICE_PORTS[p.service];
    const serviceOk = svc.protocol === 'any' ? flow.protocol !== 'icmp' : svc.protocol === flow.protocol && (svc.protocol === 'icmp' || svc.ports.includes(flow.port));
    return serviceOk && p.from.some(f => endpointMatches(f, flow.srcIp, flow.srcZone, s)) && p.to.some(t => endpointMatches(t, flow.dst, dstZone, s, flow.fqdn));
  });
}

export interface TraceResult { allowed: boolean; policy: string; egress: string; reached: boolean; detail: string }

const serviceLabel = (f: Flow) => f.protocol === 'icmp' ? 'icmp' : `${f.protocol === 'udp' && f.port === 53 ? 'dns' : f.port === 443 ? 'https' : f.port === 80 ? 'http' : f.protocol}/${f.protocol} ${f.port}`;

/** Trace one flow from the management PC, appending Traffic Monitor lines. */
function trace(s: FireboxSim, flow: Flow): TraceResult {
  const route = routeLookup(s, flow.dst);
  if ('error' in route) {
    logLine(s, 'Deny', `${flow.srcIp} ${flow.dst} ${serviceLabel(flow)} ${flow.srcZone}→? No route to host.`);
    return { allowed: false, policy: '', egress: '', reached: false, detail: 'No route to the destination.' };
  }
  const egress = route.iface;
  const zoneName = `${egress.id}-${egress.name}`;
  const src = `1-${s.interfaces.find(i => i.id === 1)!.name}`;
  const dstLabel = flow.fqdn ? `${flow.dst} (${flow.fqdn})` : flow.dst;
  const policy = matchPolicy(s, flow, egress.type);
  if (!policy) {
    logLine(s, 'Deny', `${flow.srcIp} ${dstLabel} ${serviceLabel(flow)} ${src} ${zoneName} Denied (Unhandled Internal Packet-00)`);
    return { allowed: false, policy: 'Unhandled Internal Packet', egress: egress.name, reached: false, detail: 'No policy matched, so the implicit deny applied.' };
  }
  if (policy.action === 'Denied') {
    logLine(s, 'Deny', `${flow.srcIp} ${dstLabel} ${serviceLabel(flow)} ${src} ${zoneName} Denied (${policy.name}-00)`);
    return { allowed: false, policy: policy.name, egress: egress.name, reached: false, detail: `Denied by ${policy.name}.` };
  }
  const nat = egress.type === 'External' ? ` src_ip_nat="${egress.ip}"` : '';
  logLine(s, 'Allow', `${flow.srcIp} ${dstLabel} ${serviceLabel(flow)} ${src} ${zoneName} Allowed (${policy.name}-00)${nat} route="${route.label}"`);
  const onInternet = egress.type === 'External' && route.nextHop === egress.gateway && egress.gateway === ISP_GATEWAY && s.bench.externalCable;
  return { allowed: true, policy: policy.name, egress: egress.name, reached: onInternet, detail: `Allowed by ${policy.name}, out ${egress.name}.` };
}

function logLine(s: FireboxSim, disposition: LogLine['disposition'], text: string) {
  s.seq++;
  s.log = [{ id: s.seq, disposition, text }, ...s.log].slice(0, 200);
}

function resolve(s: FireboxSim, host: string, pc: ReturnType<typeof pcAddress>): { ip?: string; problem?: string } {
  if (isIPv4(host)) return { ip: host };
  const known = INTERNET_HOSTS[host.toLowerCase()];
  for (const server of pc.dns) {
    const result = trace(s, { protocol: 'udp', port: 53, srcIp: pc.ip, srcZone: 'Trusted', dst: server });
    if (result.allowed && result.reached && DNS_SERVERS.has(server)) return known ? { ip: known } : { problem: `DNS server ${server} returned NXDOMAIN for ${host}.` };
  }
  return { problem: pc.dns.length ? `DNS lookup for ${host} timed out: no DNS server could be reached.` : `No DNS server is configured for ${host}.` };
}

/* ------------------------------------------------------------------------------------------------
 * Actions
 * ---------------------------------------------------------------------------------------------- */

export type SimAction =
  | { type: 'bench'; power?: boolean; externalCable?: boolean; trustedCable?: boolean }
  | { type: 'ipconfig' }
  | { type: 'ping'; host: string }
  | { type: 'browse'; url: string }
  | { type: 'speedtest' }
  | { type: 'view'; page: PageId }
  | { type: 'wizardUpdate'; patch: Partial<WizardState> }
  | { type: 'wizardNext' }
  | { type: 'wizardBack' }
  | { type: 'saveInterface'; iface: SimInterface }
  | { type: 'addRoute'; route: SimRoute }
  | { type: 'deleteRoute'; index: number }
  | { type: 'setPolicy'; id: string; patch: Partial<Pick<SimPolicy, 'enabled' | 'action' | 'to' | 'from' | 'tmForward' | 'tmReverse' | 'name'>> }
  | { type: 'addPolicy'; service: PolicyService; name: string; action: SimPolicy['action']; from: string[]; to: string[] }
  | { type: 'deletePolicy'; id: string }
  | { type: 'setTrafficManagement'; enabled: boolean }
  | { type: 'addTmAction'; action: TmAction }
  | { type: 'addUser'; user: DeviceUser; passphrase: string }
  | { type: 'trafficFilter'; text: string }
  | { type: 'fireWatchFilter'; source: string }
  | { type: 'policyCheck'; flow: Flow }
  | { type: 'downloadConfig' }
  | { type: 'configReport' }
  | { type: 'setAlwaysBackup'; enabled: boolean }
  | { type: 'saveConfig' }
  | { type: 'createBackup'; name: string; key: string }
  | { type: 'restoreBackup'; id: string; key: string }
  | { type: 'upgrade'; adminPassphrase: string }
  | { type: 'dismissMessage' };

const fail = (s: FireboxSim, text: string) => { s.message = { tone: 'error', text }; return s; };
const ok = (s: FireboxSim, text: string) => { s.message = { tone: 'success', text }; return s; };
const event = (s: FireboxSim, e: SimEvent) => { s.events = [...s.events, e]; };
const say = (s: FireboxSim, ...lines: string[]) => { s.terminal = [...s.terminal, ...lines].slice(-80); };

/** Applies one learner action. Pure: returns a new state and never mutates the one passed in. */
export function simReduce(previous: FireboxSim, action: SimAction): FireboxSim {
  const s = structuredClone(previous);
  if (action.type !== 'dismissMessage' && action.type !== 'view' && action.type !== 'wizardUpdate') s.message = null;

  switch (action.type) {
    case 'dismissMessage': s.message = null; return s;
    case 'view': event(s, { kind: 'view', page: action.page }); return s;

    case 'bench': {
      if (action.power !== undefined) s.bench.power = action.power;
      if (action.externalCable !== undefined) s.bench.externalCable = action.externalCable;
      if (action.trustedCable !== undefined) s.bench.trustedCable = action.trustedCable;
      if (action.power) logLine(s, 'Info', `${s.model} started Fireware OS ${s.version}.`);
      return s;
    }

    case 'ipconfig': {
      const pc = pcAddress(s);
      say(s, '> ipconfig', `   IPv4 Address . . . : ${pc.ip}`, `   Subnet Mask  . . . : ${pc.problem ? '255.255.0.0' : '255.255.255.0'}`,
        `   Default Gateway  . : ${pc.gateway || '(none)'}`, `   DNS Servers  . . . : ${pc.dns.join(', ') || '(none)'}`, ...(pc.problem ? [`   ${pc.problem}`] : []));
      event(s, { kind: 'ipconfig', ip: pc.ip });
      return s;
    }

    case 'ping': {
      const host = action.host.trim();
      const pc = pcAddress(s);
      say(s, `> ping ${host}`);
      if (pc.problem) { say(s, '   PING: transmit failed. General failure.'); return s; }
      const resolved = resolve(s, host, pc);
      if (!resolved.ip) { say(s, `   Ping request could not find host ${host}. ${resolved.problem ?? ''}`); return s; }
      const result = trace(s, { protocol: 'icmp', port: 0, srcIp: pc.ip, srcZone: 'Trusted', dst: resolved.ip });
      const replied = result.allowed && (result.reached ? PINGABLE.has(resolved.ip) : s.interfaces.some(i => i.ip === resolved.ip));
      say(s, replied ? `   Reply from ${resolved.ip}: bytes=32 time=18ms TTL=117 (via ${result.egress})` : `   Request timed out.${result.allowed ? ` (sent out ${result.egress})` : ` (${result.detail})`}`);
      event(s, { kind: 'ping', dst: resolved.ip, egress: result.egress, replied });
      return s;
    }

    case 'browse': {
      const match = /^(https?):\/\/([^/\s]+)/i.exec(action.url.trim());
      const pc = pcAddress(s);
      say(s, `> open ${action.url.trim()}`);
      if (!match) { say(s, '   Enter a URL such as http://www.example.com'); return s; }
      const [, scheme, host] = match;
      if (pc.problem) { say(s, '   This site can\'t be reached: no network connection.'); return s; }
      const resolved = resolve(s, host, pc);
      if (!resolved.ip) { say(s, `   This site can't be reached. ${resolved.problem ?? ''}`); event(s, { kind: 'browse', host, allowed: false, policy: 'DNS' }); return s; }
      const port = scheme.toLowerCase() === 'https' ? 443 : 80;
      const result = trace(s, { protocol: 'tcp', port, srcIp: pc.ip, srcZone: 'Trusted', dst: resolved.ip, fqdn: host });
      const loaded = result.allowed && result.reached;
      say(s, loaded ? `   ${host} loaded (${result.policy}).` : result.allowed ? `   ${host} timed out after leaving ${result.egress}.` : `   ${host} is blocked: ${result.detail}`);
      event(s, { kind: 'browse', host, allowed: loaded, policy: result.policy });
      return s;
    }

    case 'speedtest': {
      const pc = pcAddress(s);
      say(s, '> speed test (speedtest.example.net)');
      if (pc.problem) { say(s, '   No network connection.'); return s; }
      const resolved = resolve(s, 'speedtest.example.net', pc);
      if (!resolved.ip) { say(s, `   Test failed. ${resolved.problem ?? ''}`); return s; }
      const result = trace(s, { protocol: 'tcp', port: 443, srcIp: pc.ip, srcZone: 'Trusted', dst: resolved.ip, fqdn: 'speedtest.example.net' });
      if (!result.allowed || !result.reached) { say(s, `   Test failed: ${result.detail}`); return s; }
      let { down, up } = LINK;
      if (s.trafficManagement.enabled) {
        const policy = s.policies.find(p => p.name === result.policy);
        const fwd = s.trafficManagement.actions.find(a => a.name === policy?.tmForward);
        const rev = s.trafficManagement.actions.find(a => a.name === policy?.tmReverse);
        if (fwd) up = Math.min(up, fwd.maxKbps / 1000);
        if (rev) down = Math.min(down, rev.maxKbps / 1000);
      }
      say(s, `   Download ${down} Mbps · Upload ${up} Mbps (through ${result.policy})`);
      event(s, { kind: 'speedtest', downMbps: down, upMbps: up });
      return s;
    }

    case 'wizardUpdate': s.wizard = { ...s.wizard, ...action.patch }; return s;
    case 'wizardBack': s.wizard.page = Math.max(0, s.wizard.page - 1); return s;
    case 'wizardNext': {
      const w = s.wizard;
      if (s.setupComplete) return fail(s, 'This Firebox has already been configured.');
      if (w.page === 0 && !w.deviceName.trim()) return fail(s, 'Enter a name for the Firebox.');
      if (w.page === 1 && w.externalMode === 'Static' && (!isIPv4(w.externalIp) || !isIPv4(w.externalGateway) || !sameSubnet(w.externalIp, w.externalGateway, w.externalPrefix))) {
        return fail(s, 'Enter a valid external IP address and a default gateway on the same network.');
      }
      if (w.page === 2 && (!isIPv4(w.trustedIp) || !validPrefix(w.trustedPrefix))) return fail(s, 'Enter a valid trusted interface address.');
      if (w.page === 3 && (!isIPv4(w.dns1) || (w.dns2 !== '' && !isIPv4(w.dns2)))) return fail(s, 'Enter at least one valid DNS server address.');
      if (w.page === 4) {
        if (w.statusPassphrase.length < 8 || w.adminPassphrase.length < 8) return fail(s, 'Passphrases must be at least 8 characters.');
        if (w.statusPassphrase === w.adminPassphrase) return fail(s, 'The status and admin passphrases must be different.');
        // Finish: apply the wizard's configuration.
        s.deviceName = w.deviceName.trim();
        s.interfaces = s.interfaces.map(i => i.id === 0
          ? { ...i, type: 'External', ip: w.externalMode === 'DHCP' ? '203.0.113.2' : w.externalIp, prefix: w.externalMode === 'DHCP' ? 24 : w.externalPrefix, gateway: w.externalMode === 'DHCP' ? ISP_GATEWAY : w.externalGateway }
          : i.id === 1 ? { ...i, ip: w.trustedIp, prefix: w.trustedPrefix, dhcpServer: w.dhcpEnabled, dhcpStart: w.dhcpEnabled ? lastOctet(w.trustedIp, 2) : '', dhcpEnd: w.dhcpEnabled ? lastOctet(w.trustedIp, 100) : '' }
          : { ...i, type: 'Disabled' });
        s.dns = [w.dns1, w.dns2].filter(Boolean);
        s.passphrases = { status: w.statusPassphrase, admin: w.adminPassphrase };
        s.policies = defaultPolicies();
        s.setupComplete = true;
        s.wizard.page = 5;
        logLine(s, 'Info', `Setup wizard completed; configuration saved to ${s.deviceName}.`);
        return ok(s, 'Setup complete. The Firebox restarted with the new configuration.');
      }
      w.page++;
      return s;
    }

    case 'saveInterface': {
      const next = action.iface;
      if (next.type !== 'Disabled') {
        if (!next.name.trim()) return fail(s, 'Enter an interface name.');
        if (!isIPv4(next.ip) || !validPrefix(next.prefix)) return fail(s, 'Enter a valid IPv4 address in slash notation.');
        const clash = s.interfaces.find(i => i.id !== next.id && i.type !== 'Disabled' && (sameSubnet(i.ip, next.ip, Math.min(i.prefix, next.prefix))));
        if (clash) return fail(s, `The network overlaps ${clash.name} (${clash.ip}/${clash.prefix}).`);
        if (next.type === 'External' && !isIPv4(next.gateway)) return fail(s, 'An external interface needs a default gateway.');
        if (next.dhcpServer && (next.type === 'External' || !sameSubnet(next.ip, next.dhcpStart, next.prefix) || !sameSubnet(next.ip, next.dhcpEnd, next.prefix))) {
          return fail(s, 'The DHCP address pool must be on the same subnet as the interface.');
        }
      }
      s.interfaces = s.interfaces.map(i => i.id === next.id ? structuredClone(next) : i);
      return ok(s, `Interface ${next.id} (${next.name}) saved.`);
    }

    case 'addRoute': {
      const r = action.route;
      if (!isIPv4(r.destination) || !isIPv4(r.gateway)) return fail(s, 'Enter a valid destination and gateway.');
      if (r.type === 'Network IPv4' && !validPrefix(r.prefix)) return fail(s, 'Enter a valid network prefix.');
      if (!Number.isInteger(r.metric) || r.metric < 1 || r.metric > 1024) return fail(s, 'The metric must be between 1 and 1024.');
      if (!s.interfaces.some(i => i.type !== 'Disabled' && sameSubnet(i.ip, r.gateway, i.prefix))) {
        return fail(s, `The gateway ${r.gateway} is not on the network of any enabled interface. Configure that interface first.`);
      }
      s.routes = [...s.routes, { ...r, prefix: r.type === 'Host IPv4' ? 32 : r.prefix }];
      return ok(s, `Route to ${r.destination} added.`);
    }
    case 'deleteRoute': s.routes = s.routes.filter((_, i) => i !== action.index); return ok(s, 'Route removed.');

    case 'setPolicy': {
      const policy = s.policies.find(p => p.id === action.id);
      if (!policy) return fail(s, 'That policy no longer exists.');
      const next = { ...policy, ...action.patch };
      if (!next.to.length || !next.from.length) return fail(s, 'A policy needs at least one From and one To member.');
      s.policies = s.policies.map(p => p.id === action.id ? next : p);
      return ok(s, `Policy ${next.name} saved.`);
    }
    case 'addPolicy': {
      const name = action.name.trim();
      if (!name) return fail(s, 'Enter a policy name.');
      if (s.policies.some(p => p.name.toLowerCase() === name.toLowerCase())) return fail(s, `A policy named ${name} already exists.`);
      if (!action.from.length || !action.to.length) return fail(s, 'A policy needs at least one From and one To member.');
      s.seq++;
      s.policies = [...s.policies, { id: `p${s.seq}`, name, service: action.service, enabled: true, action: action.action, from: action.from, to: action.to, tmForward: '', tmReverse: '' }];
      return ok(s, `Policy ${name} added.`);
    }
    case 'deletePolicy': s.policies = s.policies.filter(p => p.id !== action.id); return ok(s, 'Policy deleted.');

    case 'setTrafficManagement':
      s.trafficManagement.enabled = action.enabled;
      return ok(s, `Traffic management and QoS ${action.enabled ? 'enabled' : 'disabled'}.`);
    case 'addTmAction': {
      const a = action.action;
      if (!a.name.trim()) return fail(s, 'Enter an action name.');
      if (!Number.isFinite(a.maxKbps) || a.maxKbps < 1) return fail(s, 'Enter a maximum bandwidth in Kbps.');
      if (s.trafficManagement.actions.some(x => x.name === a.name.trim())) return fail(s, `An action named ${a.name} already exists.`);
      s.trafficManagement.actions = [...s.trafficManagement.actions, { ...a, name: a.name.trim() }];
      return ok(s, `Traffic management action ${a.name.trim()} added.`);
    }

    case 'addUser': {
      const name = action.user.name.trim();
      if (!name) return fail(s, 'Enter a user name.');
      if (['admin', 'status'].includes(name.toLowerCase()) || s.users.some(u => u.name === name)) return fail(s, `The user ${name} already exists.`);
      if (action.passphrase.length < 8) return fail(s, 'The passphrase must be at least 8 characters.');
      s.users = [...s.users, { name, role: action.user.role }];
      return ok(s, `Device management user ${name} added with the ${action.user.role} role.`);
    }

    case 'trafficFilter': event(s, { kind: 'trafficFilter', text: action.text }); return s;
    case 'fireWatchFilter': event(s, { kind: 'fireWatchFilter', source: action.source.trim() }); return s;
    case 'policyCheck': {
      const route = routeLookup(s, action.flow.dst);
      const zone = 'error' in route ? 'External' : route.iface.type;
      const policy = matchPolicy(s, action.flow, zone);
      event(s, { kind: 'policyCheck', policy: policy?.name ?? 'Unhandled Internal Packet' });
      return s;
    }

    case 'downloadConfig': event(s, { kind: 'downloadConfig' }); return ok(s, `${s.deviceName}.xml downloaded.`);
    case 'configReport': event(s, { kind: 'configReport' }); return s;
    case 'setAlwaysBackup': s.alwaysBackup = action.enabled; return s;
    case 'saveConfig': {
      const name = `${s.deviceName}.xml`;
      const files = new Set(s.configFiles);
      files.add(name);
      if (s.alwaysBackup) files.add(`${s.deviceName}-backup-${s.version}.fxi`);
      s.configFiles = [...files];
      event(s, { kind: 'saveConfig', withBackup: s.alwaysBackup });
      return ok(s, s.alwaysBackup ? `Saved ${name} and created a backup image.` : `Saved ${name}.`);
    }

    case 'createBackup': {
      if (!action.name.trim()) return fail(s, 'Enter a name for the backup image.');
      if (action.key.length < 8) return fail(s, 'The encryption key must be at least 8 characters.');
      s.seq++;
      const id = `b${s.seq}`;
      s.backups = [...s.backups, { id, name: action.name.trim(), version: s.version, key: action.key, automatic: false, snapshot: snapshot(s) }];
      event(s, { kind: 'createBackup', id, version: s.version });
      return ok(s, `Backup image ${action.name.trim()} created for Fireware ${s.version}.`);
    }
    case 'restoreBackup': {
      const image = s.backups.find(b => b.id === action.id);
      if (!image) return fail(s, 'Select a backup image.');
      if (image.version !== s.version) {
        return fail(s, `This image was created for Fireware ${image.version}, but the Firebox runs ${s.version}. Restore an image made on the installed version.`);
      }
      if (image.key !== action.key) return fail(s, 'The encryption key is not correct for this backup image.');
      Object.assign(s, structuredClone(image.snapshot));
      event(s, { kind: 'restore', id: image.id, version: image.version });
      logLine(s, 'Info', `Backup image ${image.name} restored; the Firebox restarted.`);
      return ok(s, `Restored ${image.name}. The Firebox restarted.`);
    }

    case 'upgrade': {
      if (s.version === UPGRADE_VERSION) return fail(s, `Fireware ${UPGRADE_VERSION} is already installed.`);
      if (action.adminPassphrase !== s.passphrases.admin) return fail(s, 'The admin passphrase is not correct.');
      s.seq++;
      s.backups = [...s.backups, { id: `b${s.seq}`, name: `Automatic pre-upgrade backup`, version: s.version, key: s.passphrases.admin, automatic: true, snapshot: snapshot(s) }];
      event(s, { kind: 'upgrade', from: s.version, to: UPGRADE_VERSION });
      logLine(s, 'Info', `Fireware OS upgraded from ${s.version} to ${UPGRADE_VERSION}; the Firebox restarted.`);
      const from = s.version;
      s.version = UPGRADE_VERSION;
      return ok(s, `Upgraded from Fireware ${from} to ${UPGRADE_VERSION}. An automatic backup of the ${from} configuration was saved.`);
    }
  }
}

const lastOctet = (ip: string, n: number) => isIPv4(ip) ? ip.split('.').slice(0, 3).concat(String(n)).join('.') : '';

/** Connections FireWatch shows: recent allowed traffic plus other hosts on the network. */
export function fireWatchConnections(s: FireboxSim): { source: string; destination: string; policy: string; interface: string }[] {
  const background = [
    { source: '10.0.1.23', destination: '198.51.100.40', policy: 'HTTPS-proxy', interface: 'External' },
    { source: '10.0.1.37', destination: '8.8.8.8', policy: 'DNS', interface: 'External' },
    { source: '10.0.1.37', destination: '198.51.100.80', policy: 'HTTP-proxy', interface: 'External' },
  ];
  const own = s.log.filter(l => l.disposition === 'Allow').slice(0, 20).map(l => {
    const [source, destination] = l.text.split(' ');
    const policy = /\(([^)]+)-00\)/.exec(l.text)?.[1] ?? '';
    const out = /\d-([^\s]+) Allowed/.exec(l.text)?.[1] ?? '';
    return { source, destination, policy, interface: out };
  });
  return s.setupComplete ? [...own, ...background] : [];
}
