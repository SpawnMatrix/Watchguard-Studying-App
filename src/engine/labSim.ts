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
 * automatic order, traffic management actions, configuration files, backup images and OS upgrades,
 * Link Monitor and SD-WAN actions, HTTP URL path rules with HTTPS content inspection, and Firebox-DB
 * users and groups with the authentication portal.
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
  /** SD-WAN action name; empty to use the routing table. */
  sdwan: string;
}

export interface ProbeTarget { type: 'Ping' | 'DNS' | 'TCP'; host: string; port: number; query: string }
export interface MonitoredInterface { ifaceId: number; nextHop: string; targets: ProbeTarget[]; measure: number | null }
export interface SdwanAction { name: string; interfaces: number[] }
export interface UrlPathRule { pattern: string; action: 'Allow' | 'Deny'; log: boolean }
export interface FireboxDbUser { name: string; passphrase: string; groups: string[] }

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
  linkMonitor: MonitoredInterface[];
  sdwanActions: SdwanAction[];
  /** Default-HTTP-Client URL path rules, and what the HTTPS-proxy does when no domain rule matches. */
  proxy: { urlPaths: UrlPathRule[]; httpsNoMatch: 'Allow' | 'Inspect' };
  auth: { users: FireboxDbUser[]; groups: string[]; autoRedirect: boolean };
}

export interface BackupImage { id: string; name: string; version: string; key: string; automatic: boolean; snapshot: ConfigSnapshot }

export type PageId =
  | 'bench' | 'wizard' | 'frontPanel' | 'trafficMonitor' | 'fireWatch' | 'statusRoutes'
  | 'interfaces' | 'routes' | 'policies' | 'policyChecker' | 'trafficManagement'
  | 'globalSettings' | 'usersRoles' | 'configFile' | 'backup' | 'upgrade'
  | 'linkMonitor' | 'sdwan' | 'sdwanStatus' | 'proxyActions' | 'authServers' | 'authSettings' | 'authList';

export type SimEvent =
  | { kind: 'ipconfig'; ip: string }
  | { kind: 'ping'; dst: string; egress: string; replied: boolean }
  | { kind: 'browse'; host: string; url: string; allowed: boolean; policy: string; redirected?: boolean; blockedBy?: 'policy' | 'proxy' | 'certificate' }
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
  | { kind: 'upgrade'; from: string; to: string }
  | { kind: 'caInstalled' }
  | { kind: 'authLogin'; user: string };

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
  /** The management PC's own state: certificate trust and who is signed in to the Firebox. */
  pc: { caDownloaded: boolean; trustsProxyCa: boolean; authUser: string };
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
  'search.lab.test': '198.51.100.90',
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
    ({ id, name, service, enabled: true, action: 'Allowed', from: [...internal], to, tmForward: '', tmReverse: '', sdwan: '' });
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
  linkMonitor: [],
  sdwanActions: [],
  proxy: { urlPaths: [], httpsNoMatch: 'Allow' },
  auth: { users: [], groups: [], autoRedirect: false },
  pc: { caDownloaded: false, trustsProxyCa: false, authUser: '' },
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
  linkMonitor: s.linkMonitor, sdwanActions: s.sdwanActions, proxy: s.proxy, auth: s.auth,
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

export interface Flow { protocol: 'tcp' | 'udp' | 'icmp'; port: number; srcIp: string; srcZone: InterfaceType; dst: string; fqdn?: string; user?: string }

function endpointMatches(entry: string, ip: string, zone: InterfaceType, s: FireboxSim, fqdn?: string, user?: string): boolean {
  if (entry === 'Any') return true;
  // A Firebox-DB group or user only matches traffic from someone signed in as that user or a member.
  if (s.auth.groups.includes(entry)) return !!user && !!s.auth.users.find(u => u.name === user)?.groups.includes(entry);
  if (s.auth.users.some(u => u.name === entry)) return user === entry;
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
    return serviceOk && p.from.some(f => endpointMatches(f, flow.srcIp, flow.srcZone, s, undefined, flow.user)) && p.to.some(t => endpointMatches(t, flow.dst, dstZone, s, flow.fqdn));
  });
}

export interface TraceResult { allowed: boolean; policy: string; egress: string; reached: boolean; detail: string; redirected?: boolean }

export interface InterfaceHealth { monitored: boolean; active: boolean; lossPct: number; latencyMs: number | null; jitterMs: number | null; detail: string }

/**
 * What Link Monitor concludes about an interface. External targets on the Internet answer when the
 * external link is up; nothing answers on internal networks, because the lab has no devices there.
 * An interface is active while at least one of its probes succeeds.
 */
export function interfaceHealth(s: FireboxSim, ifaceId: number): InterfaceHealth {
  const i = s.interfaces.find(x => x.id === ifaceId);
  const entry = s.linkMonitor.find(m => m.ifaceId === ifaceId);
  const linkUp = !!i && i.type !== 'Disabled' && (i.type !== 'External' || s.bench.externalCable);
  if (!entry) return { monitored: false, active: linkUp, lossPct: linkUp ? 0 : 100, latencyMs: null, jitterMs: null, detail: linkUp ? 'Not monitored; link is up.' : 'Link is down.' };
  const onInternet = linkUp && i!.type === 'External';
  const answers = (target: ProbeTarget) => {
    if (!onInternet) return false;
    const ip = isIPv4(target.host) ? target.host : INTERNET_HOSTS[target.host.toLowerCase()];
    if (!ip) return false;
    if (target.type === 'Ping') return PINGABLE.has(ip);
    if (target.type === 'DNS') return DNS_SERVERS.has(ip) && target.query.trim() !== '';
    return Object.values(INTERNET_HOSTS).includes(ip) && (target.port === 80 || target.port === 443);
  };
  const probes = entry.targets.length ? entry.targets : [{ type: 'Ping' as const, host: entry.nextHop || i?.gateway || '', port: 0, query: '' }];
  const results = probes.map(answers);
  const active = results.some(Boolean);
  const measured = entry.measure !== null && entry.targets[entry.measure] ? answers(entry.targets[entry.measure]) : active;
  return {
    monitored: true, active,
    lossPct: measured ? 0 : 100, latencyMs: measured ? 24 : null, jitterMs: measured ? 3 : null,
    detail: active ? `${results.filter(Boolean).length} of ${probes.length} probes answering.` : `No probe answers${entry.nextHop ? ` through next hop ${entry.nextHop}` : ''}.`,
  };
}

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
  const srcUser = flow.user ? ` src_user="${flow.user}"` : '';
  if (!policy) {
    if (s.auth.autoRedirect && !flow.user && flow.protocol === 'tcp' && (flow.port === 80 || flow.port === 443)) {
      const portal = `https://${s.interfaces.find(i => i.id === 1)!.ip}:4100`;
      logLine(s, 'Info', `${flow.srcIp} ${dstLabel} ${serviceLabel(flow)} ${src} ${zoneName} redirected to authentication portal ${portal}`);
      return { allowed: false, policy: 'Authentication redirect', egress: egress.name, reached: false, detail: `Sign in at ${portal} first.`, redirected: true };
    }
    logLine(s, 'Deny', `${flow.srcIp} ${dstLabel} ${serviceLabel(flow)} ${src} ${zoneName} Denied (Unhandled Internal Packet-00)`);
    return { allowed: false, policy: 'Unhandled Internal Packet', egress: egress.name, reached: false, detail: 'No policy matched, so the implicit deny applied.' };
  }
  if (policy.action === 'Denied') {
    logLine(s, 'Deny', `${flow.srcIp} ${dstLabel} ${serviceLabel(flow)} ${src} ${zoneName} Denied (${policy.name}-00)`);
    return { allowed: false, policy: policy.name, egress: egress.name, reached: false, detail: `Denied by ${policy.name}.` };
  }
  let out = egress, nextHop = route.nextHop, routeLabel = route.label;
  if (policy.sdwan) {
    // An SD-WAN action overrides the routing table for this policy: use the first active interface it lists.
    const action = s.sdwanActions.find(a => a.name === policy.sdwan);
    const chosen = action?.interfaces.map(id => s.interfaces.find(i => i.id === id)).find(i => i && interfaceHealth(s, i.id).active);
    if (!chosen) {
      logLine(s, 'Deny', `${flow.srcIp} ${dstLabel} ${serviceLabel(flow)} ${src} ${zoneName} Denied (${policy.name}-00)${srcUser} SD-WAN action "${policy.sdwan}": all gateways are down`);
      return { allowed: false, policy: policy.name, egress: '', reached: false, detail: `SD-WAN action ${policy.sdwan} has no active interface: all gateways are down.` };
    }
    out = chosen;
    nextHop = chosen.type === 'External' ? chosen.gateway : s.linkMonitor.find(m => m.ifaceId === chosen.id)?.nextHop ?? '';
    routeLabel = `SD-WAN action ${policy.sdwan} via ${chosen.name}`;
  }
  const nat = out.type === 'External' ? ` src_ip_nat="${out.ip}"` : '';
  logLine(s, 'Allow', `${flow.srcIp} ${dstLabel} ${serviceLabel(flow)} ${src} ${out.id}-${out.name} Allowed (${policy.name}-00)${srcUser}${nat} route="${routeLabel}"`);
  const onInternet = out.type === 'External' && nextHop === out.gateway && out.gateway === ISP_GATEWAY && s.bench.externalCable;
  return { allowed: true, policy: policy.name, egress: out.name, reached: onInternet, detail: `Allowed by ${policy.name}, out ${out.name}.` };
}

function logLine(s: FireboxSim, disposition: LogLine['disposition'], text: string) {
  s.seq++;
  s.log = [{ id: s.seq, disposition, text }, ...s.log].slice(0, 200);
}

function resolve(s: FireboxSim, host: string, pc: ReturnType<typeof pcAddress>): { ip?: string; problem?: string } {
  if (isIPv4(host)) return { ip: host };
  const known = INTERNET_HOSTS[host.toLowerCase()];
  for (const server of pc.dns) {
    const result = trace(s, { protocol: 'udp', port: 53, srcIp: pc.ip, srcZone: 'Trusted', dst: server, user: s.pc.authUser || undefined });
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
  | { type: 'setPolicy'; id: string; patch: Partial<Pick<SimPolicy, 'enabled' | 'action' | 'to' | 'from' | 'tmForward' | 'tmReverse' | 'name' | 'sdwan'>> }
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
  | { type: 'setMonitoredInterface'; entry: MonitoredInterface }
  | { type: 'removeMonitoredInterface'; ifaceId: number }
  | { type: 'addSdwanAction'; action: SdwanAction }
  | { type: 'addUrlPath'; rule: UrlPathRule }
  | { type: 'deleteUrlPath'; index: number }
  | { type: 'setHttpsNoMatch'; value: 'Allow' | 'Inspect' }
  | { type: 'downloadProxyCa' }
  | { type: 'installProxyCa' }
  | { type: 'addAuthUser'; name: string; passphrase: string }
  | { type: 'addAuthGroup'; name: string; members: string[] }
  | { type: 'setAutoRedirect'; enabled: boolean }
  | { type: 'authLogin'; user: string; passphrase: string }
  | { type: 'authLogout' }
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
      const result = trace(s, { protocol: 'icmp', port: 0, srcIp: pc.ip, srcZone: 'Trusted', dst: resolved.ip, user: s.pc.authUser || undefined });
      const replied = result.allowed && (result.reached ? PINGABLE.has(resolved.ip) : s.interfaces.some(i => i.ip === resolved.ip));
      say(s, replied ? `   Reply from ${resolved.ip}: bytes=32 time=18ms TTL=117 (via ${result.egress})` : `   Request timed out.${result.allowed ? ` (sent out ${result.egress})` : ` (${result.detail})`}`);
      event(s, { kind: 'ping', dst: resolved.ip, egress: result.egress, replied });
      return s;
    }

    case 'browse': {
      const match = /^(https?):\/\/([^/\s?#]+)([^\s]*)$/i.exec(action.url.trim());
      const pc = pcAddress(s);
      say(s, `> open ${action.url.trim()}`);
      if (!match) { say(s, '   Enter a URL such as http://www.example.com'); return s; }
      const [, scheme, rawHost, path] = match;
      const host = rawHost.toLowerCase(), url = action.url.trim();
      if (pc.problem) { say(s, '   This site can\'t be reached: no network connection.'); return s; }
      const resolved = resolve(s, host, pc);
      if (!resolved.ip) { say(s, `   This site can't be reached. ${resolved.problem ?? ''}`); event(s, { kind: 'browse', host, url, allowed: false, policy: 'DNS' }); return s; }
      const https = scheme.toLowerCase() === 'https';
      const result = trace(s, { protocol: 'tcp', port: https ? 443 : 80, srcIp: pc.ip, srcZone: 'Trusted', dst: resolved.ip, fqdn: host, user: s.pc.authUser || undefined });
      if (result.redirected) {
        say(s, `   Redirected to the Firebox authentication portal. ${result.detail}`);
        event(s, { kind: 'browse', host, url, allowed: false, policy: result.policy, redirected: true });
        return s;
      }
      if (result.allowed && result.reached) {
        const policy = s.policies.find(p => p.name === result.policy);
        const inspected = https && policy?.service === 'HTTPS-proxy' && s.proxy.httpsNoMatch === 'Inspect';
        if (inspected && !s.pc.trustsProxyCa) {
          say(s, `   Your connection is not private: the certificate for ${host} was issued by the Firebox Proxy Authority, which this PC does not trust.`);
          event(s, { kind: 'browse', host, url, allowed: false, policy: result.policy, blockedBy: 'certificate' });
          return s;
        }
        // Without inspection the HTTPS-proxy only sees the host name, so URL path rules cannot apply.
        const visible = policy?.service === 'HTTP-proxy' && !https ? host + (path || '/') : inspected ? host + (path || '/') : '';
        const rule = visible ? s.proxy.urlPaths.find(r => r.action === 'Deny' && globMatch(r.pattern, visible)) : undefined;
        if (rule) {
          if (rule.log) logLine(s, 'Deny', `${pc.ip} ${resolved.ip} (${host}) ${https ? 'https' : 'http'}/tcp ${https ? 443 : 80} ProxyDeny: HTTP Request URL match (${policy!.name}-00)${s.pc.authUser ? ` src_user="${s.pc.authUser}"` : ''} rule="${rule.pattern}"${inspected ? ' tls_inspected="yes"' : ''}`);
          say(s, `   ${host} is blocked: the URL matched the proxy rule ${rule.pattern}.`);
          event(s, { kind: 'browse', host, url, allowed: false, policy: result.policy, blockedBy: 'proxy' });
          return s;
        }
        say(s, `   ${host} loaded (${result.policy}${inspected ? ', inspected' : ''}).`);
        event(s, { kind: 'browse', host, url, allowed: true, policy: result.policy });
        return s;
      }
      say(s, result.allowed ? `   ${host} timed out after leaving ${result.egress || 'the Firebox'}.` : `   ${host} is blocked: ${result.detail}`);
      event(s, { kind: 'browse', host, url, allowed: false, policy: result.policy, blockedBy: result.allowed ? undefined : 'policy' });
      return s;
    }

    case 'speedtest': {
      const pc = pcAddress(s);
      say(s, '> speed test (speedtest.example.net)');
      if (pc.problem) { say(s, '   No network connection.'); return s; }
      const resolved = resolve(s, 'speedtest.example.net', pc);
      if (!resolved.ip) { say(s, `   Test failed. ${resolved.problem ?? ''}`); return s; }
      const result = trace(s, { protocol: 'tcp', port: 443, srcIp: pc.ip, srcZone: 'Trusted', dst: resolved.ip, fqdn: 'speedtest.example.net', user: s.pc.authUser || undefined });
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
      s.policies = [...s.policies, { id: `p${s.seq}`, name, service: action.service, enabled: true, action: action.action, from: action.from, to: action.to, tmForward: '', tmReverse: '', sdwan: '' }];
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

    case 'setMonitoredInterface': {
      const m = action.entry;
      const i = s.interfaces.find(x => x.id === m.ifaceId);
      if (!i || i.type === 'Disabled') return fail(s, 'Choose an enabled interface to monitor.');
      if (i.type !== 'External' && !sameSubnet(m.nextHop, i.ip, i.prefix)) return fail(s, `Enter a next hop on the ${i.name} network (${i.ip}/${i.prefix}).`);
      for (const target of m.targets) {
        if (!target.host.trim()) return fail(s, 'Every probe target needs a host or IP address.');
        if (target.type === 'TCP' && !(Number.isInteger(target.port) && target.port >= 1 && target.port <= 65535)) return fail(s, 'A TCP probe needs a port from 1 to 65535.');
        if (target.type === 'DNS' && !target.query.trim()) return fail(s, 'A DNS probe needs a domain name to query.');
      }
      if (m.measure !== null && !m.targets[m.measure]) return fail(s, 'Choose a probe target to measure loss, latency and jitter.');
      s.linkMonitor = [...s.linkMonitor.filter(x => x.ifaceId !== m.ifaceId), structuredClone(m)].sort((a, b) => a.ifaceId - b.ifaceId);
      return ok(s, `Link Monitor settings for ${i.name} saved.`);
    }
    case 'removeMonitoredInterface': s.linkMonitor = s.linkMonitor.filter(x => x.ifaceId !== action.ifaceId); return ok(s, 'Interface removed from Link Monitor.');
    case 'addSdwanAction': {
      const name = action.action.name.trim();
      if (!name) return fail(s, 'Enter a name for the SD-WAN action.');
      if (s.sdwanActions.some(a => a.name === name)) return fail(s, `An SD-WAN action named ${name} already exists.`);
      if (!action.action.interfaces.length) return fail(s, 'Add at least one interface to the SD-WAN action.');
      if (action.action.interfaces.some(id => s.interfaces.find(i => i.id === id)?.type === 'Disabled')) return fail(s, 'SD-WAN actions can only use enabled interfaces.');
      s.sdwanActions = [...s.sdwanActions, { name, interfaces: [...action.action.interfaces] }];
      return ok(s, `SD-WAN action ${name} added.`);
    }
    case 'addUrlPath': {
      if (!action.rule.pattern.trim()) return fail(s, 'Enter a URL path pattern, such as *example*.');
      s.proxy.urlPaths = [...s.proxy.urlPaths, { ...action.rule, pattern: action.rule.pattern.trim() }];
      return ok(s, `URL path rule ${action.rule.pattern.trim()} added to Default-HTTP-Client.`);
    }
    case 'deleteUrlPath': s.proxy.urlPaths = s.proxy.urlPaths.filter((_, i) => i !== action.index); return ok(s, 'URL path rule removed.');
    case 'setHttpsNoMatch':
      s.proxy.httpsNoMatch = action.value;
      return ok(s, action.value === 'Inspect' ? 'Default-HTTPS-Client now inspects connections with Default-HTTP-Client.' : 'Default-HTTPS-Client now allows connections without inspection.');
    case 'downloadProxyCa': {
      if (pcAddress(s).problem) return fail(s, 'The management PC cannot reach the Firebox.');
      s.pc.caDownloaded = true;
      say(s, `> open http://${s.interfaces.find(i => i.id === 1)!.ip}:4126`, '   Downloaded Proxy Authority certificate (Firebox HTTPS Proxy Authority CA).');
      return s;
    }
    case 'installProxyCa': {
      if (!s.pc.caDownloaded) return fail(s, 'Download the Proxy Authority certificate from the Certificate Portal first.');
      s.pc.trustsProxyCa = true;
      say(s, '   Certificate imported into Trusted Root Certification Authorities.');
      event(s, { kind: 'caInstalled' });
      return s;
    }
    case 'addAuthUser': {
      const name = action.name.trim();
      if (!name) return fail(s, 'Enter a user name.');
      if (s.auth.users.some(u => u.name === name) || s.auth.groups.includes(name)) return fail(s, `${name} already exists in Firebox-DB.`);
      if (action.passphrase.length < 8) return fail(s, 'The passphrase must be at least 8 characters.');
      s.auth.users = [...s.auth.users, { name, passphrase: action.passphrase, groups: [] }];
      return ok(s, `Firebox-DB user ${name} added.`);
    }
    case 'addAuthGroup': {
      const name = action.name.trim();
      if (!name) return fail(s, 'Enter a group name.');
      if (s.auth.groups.includes(name) || s.auth.users.some(u => u.name === name)) return fail(s, `${name} already exists in Firebox-DB.`);
      s.auth.groups = [...s.auth.groups, name];
      s.auth.users = s.auth.users.map(u => action.members.includes(u.name) ? { ...u, groups: [...u.groups, name] } : u);
      return ok(s, `Firebox-DB group ${name} added with ${action.members.length} member${action.members.length === 1 ? '' : 's'}.`);
    }
    case 'setAutoRedirect':
      s.auth.autoRedirect = action.enabled;
      return ok(s, `Automatic redirect to the authentication page ${action.enabled ? 'enabled' : 'disabled'}.`);
    case 'authLogin': {
      const pc = pcAddress(s);
      if (pc.problem) return fail(s, 'The management PC cannot reach the authentication portal.');
      const user = s.auth.users.find(u => u.name === action.user.trim());
      if (!user || user.passphrase !== action.passphrase) {
        logLine(s, 'Info', `Authentication of Firebox-DB user [${action.user.trim()}@Firebox-DB] from ${pc.ip} was rejected, invalid credentials`);
        return fail(s, 'Sign-in failed: check the user name and passphrase.');
      }
      s.pc.authUser = user.name;
      logLine(s, 'Info', `Authentication of Firebox-DB user [${user.name}@Firebox-DB] from ${pc.ip} was accepted`);
      event(s, { kind: 'authLogin', user: user.name });
      return ok(s, `Signed in as ${user.name}.`);
    }
    case 'authLogout': s.pc.authUser = ''; return ok(s, 'Signed out of the Firebox.');

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

/** Proxy-style wildcard match: * matches any run of characters; the whole string must match. */
export function globMatch(pattern: string, value: string): boolean {
  const escaped = pattern.trim().toLowerCase().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(value.toLowerCase());
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
