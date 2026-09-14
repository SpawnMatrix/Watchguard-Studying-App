/**
 * Break/fix troubleshooting labs.
 *
 * Every other exercise in the portal asks the learner to recognise an answer. A real ticket does not
 * come with options: something is broken, a few things work, and you have to find out which setting
 * is wrong by testing and reading configuration. This builds that situation.
 *
 * A seed produces a small office network that works, then breaks exactly one thing in it. The
 * learner runs connectivity tests, inspects devices, edits settings and re-tests. Tests are not
 * compared against an answer key: each one traces the packet through whatever the configuration
 * currently says - host addressing, switch VLANs, the Firebox route table, policies in order, NAT,
 * the return path - so any genuinely correct fix passes and a wrong change can break something else,
 * exactly as it would on a live network.
 *
 * The model is deliberately small and explicit. It is a teaching simulation of the behaviour the NSE
 * and Network+ troubleshooting objectives rely on, not an emulator of Fireware.
 */
import { ipv4ToNumber, subnet } from './network';
import { integer, pick, seededRandom, shuffle, type Random } from './random';
import type { TopologyDiagramData } from './topology';

/* ------------------------------------------------------------------------------------------------
 * Configuration model
 * ---------------------------------------------------------------------------------------------- */

export type HostSegment = 'trusted' | 'optional' | 'lab';
export type Protocol = 'tcp' | 'udp' | 'icmp';

export interface HostConfig {
  id: string;
  name: string;
  role: 'client' | 'server';
  segment: HostSegment;
  addressing: 'static' | 'dhcp';
  ip: string;
  prefix: number;
  gateway: string;
  dns: string;
  /** Services the host answers on. ICMP echo is always answered. */
  services: { protocol: 'tcp' | 'udp'; port: number }[];
}

export interface SwitchPort { id: string; label: string; device: string; vlan: number }

export interface FireboxInterface { id: 'eth0' | 'eth1' | 'eth2'; name: string; zone: 'external' | 'trusted' | 'optional'; ip: string; prefix: number }

/** Policy endpoints use Fireware alias names, `Any`, or a single IPv4 address. */
export interface Policy {
  id: string;
  name: string;
  enabled: boolean;
  action: 'allow' | 'deny';
  protocol: Protocol;
  /** Destination port; ignored for ICMP. */
  port: number;
  from: string;
  to: string;
}

export interface StaticNat { id: string; publicIp: string; internalIp: string; port: number }
export interface StaticRoute { id: string; network: string; prefix: number; gateway: string }
export interface DhcpScope { enabled: boolean; start: string; end: string; gateway: string; dns: string }

export interface BreakFixNetwork {
  firebox: {
    interfaces: FireboxInterface[];
    externalGateway: string;
    policies: Policy[];
    dynamicNat: { trusted: boolean; optional: boolean };
    staticNat: StaticNat[];
    routes: StaticRoute[];
    dhcp: DhcpScope;
  };
  switch: { uplinkVlan: number; ports: SwitchPort[] };
  router: { insideIp: string; insidePrefix: number; labIp: string; labPrefix: number; defaultGateway: string };
  hosts: HostConfig[];
  /** The world outside. Not editable: it is the part of a real ticket you do not control. */
  internet: { ispGateway: string; webName: string; webIp: string; resolverIp: string; clientIp: string; publicWebName: string };
}

/* ------------------------------------------------------------------------------------------------
 * Address helpers
 * ---------------------------------------------------------------------------------------------- */

export function isIPv4(value: string): boolean {
  try { ipv4ToNumber(value); return true; } catch { return false; }
}
const validPrefix = (prefix: number) => Number.isInteger(prefix) && prefix >= 1 && prefix <= 32;

export function sameSubnet(a: string, b: string, prefix: number): boolean {
  if (!isIPv4(a) || !isIPv4(b) || !validPrefix(prefix)) return false;
  return subnet(a, prefix).network === subnet(b, prefix).network;
}

const isPrivate = (ip: string) => isIPv4(ip) && (sameSubnet(ip, '10.0.0.0', 8) || sameSubnet(ip, '172.16.0.0', 12) || sameSubnet(ip, '192.168.0.0', 16));

/* ------------------------------------------------------------------------------------------------
 * Tracing
 * ---------------------------------------------------------------------------------------------- */

export interface TraceLine { device: string; text: string; ok: boolean }
export interface TestResult { id: string; label: string; pass: boolean; lines: TraceLine[]; stoppedAt?: string }

interface Effective { ip: string; prefix: number; gateway: string; dns: string; problem?: string }

const iface = (net: BreakFixNetwork, id: FireboxInterface['id']) => net.firebox.interfaces.find(i => i.id === id)!;
const host = (net: BreakFixNetwork, id: string) => net.hosts.find(h => h.id === id)!;
const portOf = (net: BreakFixNetwork, device: string) => net.switch.ports.find(p => p.device === device);

/** What a host is actually using: its static settings, or the lease the Firebox would give it. */
export function effectiveAddressing(net: BreakFixNetwork, h: HostConfig): Effective {
  if (h.addressing === 'static') return { ip: h.ip, prefix: h.prefix, gateway: h.gateway, dns: h.dns };
  const apipa = { ip: '169.254.38.7', prefix: 16, gateway: '', dns: '' };
  const port = portOf(net, h.id);
  const eth1 = iface(net, 'eth1'), { dhcp } = net.firebox;
  if (!port || port.vlan !== net.switch.uplinkVlan) {
    return { ...apipa, problem: `No DHCP offer arrived: switch ${port?.label ?? 'port'} is on VLAN ${port?.vlan}, but the Firebox trusted interface is on VLAN ${net.switch.uplinkVlan}.` };
  }
  if (!dhcp.enabled) return { ...apipa, problem: 'No DHCP offer arrived: the DHCP server on the trusted interface is disabled.' };
  const inScope = isIPv4(dhcp.start) && isIPv4(dhcp.end) && sameSubnet(dhcp.start, eth1.ip, eth1.prefix) && sameSubnet(dhcp.end, eth1.ip, eth1.prefix) &&
    ipv4ToNumber(dhcp.start) <= ipv4ToNumber(dhcp.end);
  if (!inScope) {
    return { ...apipa, problem: `No DHCP offer arrived: the scope ${dhcp.start}-${dhcp.end} is not inside the trusted interface network ${eth1.ip}/${eth1.prefix}, so the Firebox has no address to lease on it.` };
  }
  return { ip: dhcp.start, prefix: eth1.prefix, gateway: dhcp.gateway, dns: dhcp.dns };
}

type Where = { kind: 'vlan'; vlan: number } | { kind: 'optional' } | { kind: 'lab' } | { kind: 'external' };
interface L2Node { device: string; ip: string; via?: FireboxInterface['id'] | 'inside' | 'lab' }

const whereOfHost = (net: BreakFixNetwork, h: HostConfig): Where =>
  h.segment === 'trusted' ? { kind: 'vlan', vlan: portOf(net, h.id)?.vlan ?? -1 } : { kind: h.segment };

const describeWhere = (w: Where) => w.kind === 'vlan' ? `VLAN ${w.vlan}` : w.kind === 'optional' ? 'the optional (DMZ) segment' : w.kind === 'lab' ? 'the lab segment' : 'the external link';

/** Everything that would answer ARP on a segment. */
function members(net: BreakFixNetwork, where: Where): L2Node[] {
  const nodes: L2Node[] = [];
  if (where.kind === 'vlan') {
    if (where.vlan === net.switch.uplinkVlan) nodes.push({ device: 'firebox', ip: iface(net, 'eth1').ip, via: 'eth1' });
    for (const port of net.switch.ports.filter(p => p.vlan === where.vlan)) {
      if (port.device === 'r1') nodes.push({ device: 'r1', ip: net.router.insideIp, via: 'inside' });
      else {
        const h = net.hosts.find(x => x.id === port.device);
        if (h) nodes.push({ device: h.id, ip: effectiveAddressing(net, h).ip });
      }
    }
  } else if (where.kind === 'optional') {
    nodes.push({ device: 'firebox', ip: iface(net, 'eth2').ip, via: 'eth2' });
    for (const h of net.hosts.filter(x => x.segment === 'optional')) nodes.push({ device: h.id, ip: h.ip });
  } else if (where.kind === 'lab') {
    nodes.push({ device: 'r1', ip: net.router.labIp, via: 'lab' });
    for (const h of net.hosts.filter(x => x.segment === 'lab')) nodes.push({ device: h.id, ip: h.ip });
  } else {
    nodes.push({ device: 'firebox', ip: iface(net, 'eth0').ip, via: 'eth0' }, { device: 'isp', ip: net.internet.ispGateway });
  }
  return nodes;
}

const arp = (net: BreakFixNetwork, where: Where, ip: string) => members(net, where).find(n => n.ip === ip);

interface Packet { protocol: Protocol; port: number; src: string; dst: string; service: string }

const serviceName = (p: Packet) => p.protocol === 'icmp' ? 'ping' : `${p.service}/${p.protocol} ${p.port}`;

type Step = { ok: true; node: L2Node; where: Where } | { ok: false; device: string; text: string };
const stepFailed = (s: Step): s is Extract<Step, { ok: false }> => !s.ok;

/** A host (or router interface) deciding where to send a packet, and whether that next hop answers. */
function firstHop(net: BreakFixNetwork, device: string, name: string, cfg: { ip: string; prefix: number; gateway: string }, where: Where, dst: string, lines: TraceLine[]): Step {
  if (!isIPv4(cfg.ip) || !validPrefix(cfg.prefix)) return { ok: false, device, text: `${name} has no valid IPv4 address or prefix configured.` };
  if (sameSubnet(cfg.ip, dst, cfg.prefix)) {
    lines.push({ device, text: `${name} (${cfg.ip}/${cfg.prefix}): ${dst} is on the local network, so it ARPs for it directly.`, ok: true });
    const node = arp(net, where, dst);
    if (!node) return { ok: false, device, text: `ARP who-has ${dst} on ${describeWhere(where)}: no reply.` };
    return { ok: true, node, where };
  }
  if (!cfg.gateway) return { ok: false, device, text: `${name} (${cfg.ip}/${cfg.prefix}): ${dst} is on another network and no default gateway is configured.` };
  lines.push({ device, text: `${name} (${cfg.ip}/${cfg.prefix}): ${dst} is on another network, so it sends to its gateway ${cfg.gateway}.`, ok: true });
  if (!sameSubnet(cfg.ip, cfg.gateway, cfg.prefix)) {
    return { ok: false, device, text: `The gateway ${cfg.gateway} is not inside ${name}'s own network ${cfg.ip}/${cfg.prefix}, so it cannot be reached.` };
  }
  const node = arp(net, where, cfg.gateway);
  if (!node) return { ok: false, device, text: `ARP who-has ${cfg.gateway} on ${describeWhere(where)}: no reply. Nothing on that segment owns the gateway address.` };
  return { ok: true, node, where };
}

const zoneMatch = (endpoint: string, ip: string, zone: FireboxInterface['zone']) =>
  endpoint === 'Any' || endpoint === ip ||
  (endpoint === 'Any-Trusted' && zone === 'trusted') || (endpoint === 'Any-Optional' && zone === 'optional') || (endpoint === 'Any-External' && zone === 'external');

const zoneLabel = (zone: FireboxInterface['zone']) => zone[0].toUpperCase() + zone.slice(1);

interface Arrival { ok: true; device: string; lines: TraceLine[]; natSource?: string }
interface Failure { ok: false; lines: TraceLine[]; stoppedAt: string }
const didFail = (r: Arrival | Failure): r is Failure => !r.ok;

/**
 * Carries a packet from a source host to wherever it ends up. Returns the device that received it,
 * or where and why it stopped. Return traffic is checked separately by the caller.
 */
function forward(net: BreakFixNetwork, sourceId: string, packet: Packet): Arrival | Failure {
  const lines: TraceLine[] = [];
  const stop = (device: string, text: string): Failure => { lines.push({ device, text, ok: false }); return { ok: false, lines, stoppedAt: device }; };

  let current: { node: L2Node; where: Where };
  let pkt = { ...packet };
  let natSource: string | undefined;

  if (sourceId === 'internet-client') {
    lines.push({ device: 'internet', text: `A client at ${pkt.src} on the Internet connects to ${pkt.dst} (${serviceName(pkt)}).`, ok: true });
    const eth0 = iface(net, 'eth0');
    const owned = pkt.dst === eth0.ip || net.firebox.staticNat.some(n => n.publicIp === pkt.dst);
    if (!owned) return stop('internet', `Nothing on the Firebox's external interface owns ${pkt.dst}, so the connection never arrives.`);
    current = { node: { device: 'firebox', ip: eth0.ip, via: 'eth0' }, where: { kind: 'external' } };
  } else {
    const h = host(net, sourceId), cfg = effectiveAddressing(net, h);
    if (cfg.problem) return stop(h.id, `${h.name} self-assigned ${cfg.ip}. ${cfg.problem}`);
    pkt = { ...pkt, src: cfg.ip };
    const step = firstHop(net, h.id, h.name, cfg, whereOfHost(net, h), pkt.dst, lines);
    if (stepFailed(step)) return stop(step.device, step.text);
    current = { node: step.node, where: step.where };
  }

  for (let hops = 0; hops < 8; hops++) {
    const { node } = current;

    // Delivered to a host.
    if (node.device !== 'firebox' && node.device !== 'r1' && node.device !== 'isp') {
      const target = host(net, node.device);
      if (node.ip !== pkt.dst) return stop(target.id, `${target.name} received a packet for ${pkt.dst}, which is not its address, and dropped it.`);
      const listens = pkt.protocol === 'icmp' || target.services.some(s => s.protocol === pkt.protocol && s.port === pkt.port);
      if (!listens) return stop(target.id, `${target.name} is not listening on ${serviceName(pkt)}: connection refused.`);
      lines.push({ device: target.id, text: `${target.name} (${pkt.dst}) accepts ${serviceName(pkt)}.`, ok: true });
      return { ok: true, device: target.id, lines, natSource };
    }

    // The Internet side: the ISP hands the packet to the destination if it exists.
    if (node.device === 'isp') {
      const { webIp, resolverIp, webName } = net.internet;
      const service = pkt.dst === webIp && pkt.protocol === 'tcp' && pkt.port === 443 ? `${webName} answers HTTPS` :
        pkt.dst === resolverIp && pkt.protocol === 'udp' && pkt.port === 53 ? 'the public DNS resolver answers the query' : '';
      if (!service) return stop('internet', `No service on the Internet answers ${serviceName(pkt)} at ${pkt.dst}.`);
      lines.push({ device: 'internet', text: `Internet: ${service}.`, ok: true });
      return { ok: true, device: 'internet', lines, natSource };
    }

    // The lab router.
    if (node.device === 'r1') {
      const r = net.router;
      if (sameSubnet(pkt.dst, r.labIp, r.labPrefix)) {
        lines.push({ device: 'r1', text: `Lab router: ${pkt.dst} is on its lab interface ${r.labIp}/${r.labPrefix}.`, ok: true });
        const next = arp(net, { kind: 'lab' }, pkt.dst);
        if (!next) return stop('r1', `ARP who-has ${pkt.dst} on the lab segment: no reply.`);
        current = { node: next, where: { kind: 'lab' } };
        continue;
      }
      const where: Where = { kind: 'vlan', vlan: portOf(net, 'r1')?.vlan ?? -1 };
      const step = firstHop(net, 'r1', 'Lab router', { ip: r.insideIp, prefix: r.insidePrefix, gateway: r.defaultGateway }, where, pkt.dst, lines);
      if (stepFailed(step)) return stop(step.device, step.text);
      current = { node: step.node, where: step.where };
      continue;
    }

    // The Firebox.
    const ingress = iface(net, node.via as FireboxInterface['id']);
    const originalDst = pkt.dst;
    if (ingress.zone === 'external') {
      const nat = net.firebox.staticNat.find(n => n.publicIp === pkt.dst && n.port === pkt.port);
      if (!nat) return stop('firebox', `Traffic Monitor: Deny ${pkt.src} ${pkt.dst} ${serviceName(pkt)} External→Firebox (Unhandled External Packet-00). No static NAT rule publishes ${pkt.dst} on port ${pkt.port}.`);
      pkt = { ...pkt, dst: nat.internalIp };
      lines.push({ device: 'firebox', text: `Static NAT: ${originalDst}:${nat.port} is translated to ${nat.internalIp}.`, ok: true });
    } else if (net.firebox.interfaces.some(i => i.ip === pkt.dst)) {
      return stop('firebox', `Traffic Monitor: Deny ${pkt.src} ${pkt.dst} ${serviceName(pkt)} ${zoneLabel(ingress.zone)}→Firebox. The Firebox itself does not provide this service.`);
    }

    // Route lookup: connected networks, static routes, then the default route. Longest prefix wins.
    type Choice = { egress: FireboxInterface; nextHop: string; prefix: number; label: string };
    const choices: Choice[] = [];
    for (const i of net.firebox.interfaces) {
      if (isIPv4(i.ip) && sameSubnet(i.ip, pkt.dst, i.prefix)) choices.push({ egress: i, nextHop: pkt.dst, prefix: i.prefix, label: `connected network on ${i.name}` });
    }
    for (const route of net.firebox.routes) {
      if (!isIPv4(route.network) || !sameSubnet(route.network, pkt.dst, route.prefix)) continue;
      const egress = net.firebox.interfaces.find(i => isIPv4(route.gateway) && sameSubnet(i.ip, route.gateway, i.prefix));
      if (!egress) return stop('firebox', `The static route to ${route.network}/${route.prefix} uses gateway ${route.gateway}, which is not on any Firebox interface network, so the route cannot be used.`);
      choices.push({ egress, nextHop: route.gateway, prefix: route.prefix, label: `static route ${route.network}/${route.prefix} via ${route.gateway}` });
    }
    choices.push({ egress: iface(net, 'eth0'), nextHop: net.firebox.externalGateway, prefix: 0, label: `default route via ${net.firebox.externalGateway}` });
    const route = choices.sort((a, b) => b.prefix - a.prefix)[0];
    lines.push({ device: 'firebox', text: `Route lookup for ${pkt.dst}: ${route.label}, out ${route.egress.name}.`, ok: true });

    const policy = net.firebox.policies.find(p => p.enabled && p.protocol === pkt.protocol && (p.protocol === 'icmp' || p.port === pkt.port) &&
      zoneMatch(p.from, pkt.src, ingress.zone) && zoneMatch(p.to, ingress.zone === 'external' ? originalDst : pkt.dst, route.egress.zone));
    const flow = `${pkt.src} ${ingress.zone === 'external' ? originalDst : pkt.dst} ${serviceName(pkt)} ${zoneLabel(ingress.zone)}→${zoneLabel(route.egress.zone)}`;
    if (!policy) {
      const kind = ingress.zone === 'external' ? 'External' : 'Internal';
      return stop('firebox', `Traffic Monitor: Deny ${flow} (Unhandled ${kind} Packet-00). No enabled policy matched, so the implicit deny applied.`);
    }
    if (policy.action === 'deny') return stop('firebox', `Traffic Monitor: Deny ${flow} policy "${policy.name}". The first matching policy denies this traffic.`);

    if (route.egress.zone === 'external' && isPrivate(pkt.src)) {
      const zone = ingress.zone === 'optional' ? 'optional' : 'trusted';
      if (!net.firebox.dynamicNat[zone]) {
        return stop('firebox', `Traffic Monitor: Allow ${flow} policy "${policy.name}", but no dynamic NAT applies to ${zoneLabel(zone)} traffic. It leaves with the private source ${pkt.src}, which cannot be routed back from the Internet.`);
      }
      natSource = route.egress.ip;
      lines.push({ device: 'firebox', text: `Traffic Monitor: Allow ${flow} policy "${policy.name}" src_ip_nat="${natSource}".`, ok: true });
    } else {
      lines.push({ device: 'firebox', text: `Traffic Monitor: Allow ${flow} policy "${policy.name}".`, ok: true });
    }

    const egressWhere: Where = route.egress.id === 'eth0' ? { kind: 'external' } : route.egress.id === 'eth2' ? { kind: 'optional' } : { kind: 'vlan', vlan: net.switch.uplinkVlan };
    const next = arp(net, egressWhere, route.nextHop);
    if (!next) return stop('firebox', `ARP who-has ${route.nextHop} on ${describeWhere(egressWhere)}: no reply. The next hop does not exist on that segment.`);
    current = { node: next, where: egressWhere };
  }
  return stop('firebox', 'The packet looped without reaching its destination.');
}

/**
 * Whether a reply can get back. Replies to a connection the Firebox allowed are permitted by its
 * state table, so what matters is that each device on the way back knows where to send them.
 */
function returnPath(net: BreakFixNetwork, responderId: string, replyTo: string, lines: TraceLine[]): Failure | null {
  if (responderId === 'internet') {
    lines.push({ device: 'internet', text: `The reply returns to ${replyTo} and the Firebox forwards it back through its connection table.`, ok: true });
    return null;
  }
  const h = host(net, responderId), cfg = effectiveAddressing(net, h);
  const step = firstHop(net, h.id, h.name, cfg, whereOfHost(net, h), replyTo, lines);
  const stop = (device: string, text: string): Failure => { lines.push({ device, text: `Reply lost: ${text}`, ok: false }); return { ok: false, lines, stoppedAt: device }; };
  if (stepFailed(step)) return stop(step.device, step.text);
  const { node } = step;
  if (node.device === 'r1') {
    const r = net.router;
    // The lab router delivers replies to the trusted network directly, or hands the rest to its gateway.
    if (sameSubnet(replyTo, r.insideIp, r.insidePrefix)) {
      const where: Where = { kind: 'vlan', vlan: portOf(net, 'r1')?.vlan ?? -1 };
      if (!arp(net, where, replyTo)) return stop('r1', `the lab router cannot find ${replyTo} on its inside network.`);
    } else if (!sameSubnet(r.defaultGateway, r.insideIp, r.insidePrefix) || !arp(net, { kind: 'vlan', vlan: portOf(net, 'r1')?.vlan ?? -1 }, r.defaultGateway)) {
      return stop('r1', `the lab router has no working default gateway toward ${replyTo}.`);
    }
  }
  lines.push({ device: h.id, text: `The reply from ${h.name} finds its way back to ${replyTo}.`, ok: true });
  return null;
}

function resolve(net: BreakFixNetwork, sourceId: string, lines: TraceLine[]): Failure | null {
  const h = host(net, sourceId), cfg = effectiveAddressing(net, h);
  const name = net.internet.webName;
  if (cfg.problem) { lines.push({ device: h.id, text: `${h.name} self-assigned ${cfg.ip}. ${cfg.problem}`, ok: false }); return { ok: false, lines, stoppedAt: h.id }; }
  if (!isIPv4(cfg.dns)) { lines.push({ device: h.id, text: `${h.name} has no DNS server configured, so it cannot look up ${name}.`, ok: false }); return { ok: false, lines, stoppedAt: h.id }; }
  lines.push({ device: h.id, text: `${h.name} asks its DNS server ${cfg.dns} for ${name}.`, ok: true });
  const sent = forward(net, sourceId, { protocol: 'udp', port: 53, src: cfg.ip, dst: cfg.dns, service: 'dns' });
  lines.push(...sent.lines);
  if (didFail(sent)) {
    lines.push({ device: h.id, text: `DNS request timed out: ${name} could not be resolved.`, ok: false });
    return { ok: false, lines, stoppedAt: sent.stoppedAt };
  }
  const back = returnPath(net, sent.device, sent.natSource ?? cfg.ip, lines);
  if (back) return back;
  lines.push({ device: h.id, text: `${name} resolves to ${net.internet.webIp}.`, ok: true });
  return null;
}

export interface ConnectivityTest { id: string; label: string; run: (net: BreakFixNetwork) => TestResult }

function test(id: string, label: string, body: (net: BreakFixNetwork, lines: TraceLine[]) => Failure | null): ConnectivityTest {
  return {
    id, label,
    run: net => {
      const lines: TraceLine[] = [];
      const failure = body(net, lines);
      return failure ? { id, label, pass: false, lines: failure.lines, stoppedAt: failure.stoppedAt } : { id, label, pass: true, lines };
    },
  };
}

/** Connect, then check the reply can return. */
function connect(net: BreakFixNetwork, sourceId: string, packet: Omit<Packet, 'src'>, lines: TraceLine[]): Failure | null {
  const src = sourceId === 'internet-client' ? net.internet.clientIp : effectiveAddressing(net, host(net, sourceId)).ip;
  const sent = forward(net, sourceId, { ...packet, src });
  lines.push(...sent.lines);
  if (didFail(sent)) return { ok: false, lines, stoppedAt: sent.stoppedAt };
  // Inbound traffic is un-translated on the way back, so the server replies to the real client address.
  return returnPath(net, sent.device, sent.natSource ?? src, lines);
}

export const connectivityTests: ConnectivityTest[] = [
  test('pc1-dns', 'PC-1 looks up www.example.com', (net, lines) => resolve(net, 'pc1', lines)),
  test('pc1-web', 'PC-1 opens https://www.example.com', (net, lines) =>
    resolve(net, 'pc1', lines) ?? connect(net, 'pc1', { protocol: 'tcp', port: 443, dst: net.internet.webIp, service: 'https' }, lines)),
  test('pc2-web', 'PC-2 opens https://www.example.com', (net, lines) =>
    resolve(net, 'pc2', lines) ?? connect(net, 'pc2', { protocol: 'tcp', port: 443, dst: net.internet.webIp, service: 'https' }, lines)),
  test('pc2-files', 'PC-2 opens a share on the file server', (net, lines) =>
    connect(net, 'pc2', { protocol: 'tcp', port: 445, dst: host(net, 'files').ip, service: 'smb' }, lines)),
  test('customer-web', 'A customer on the Internet opens the company website', (net, lines) =>
    connect(net, 'internet-client', { protocol: 'tcp', port: 443, dst: net.firebox.staticNat[0]?.publicIp ?? '', service: 'https' }, lines)),
  test('pc2-lab', 'PC-2 pings the lab server', (net, lines) =>
    connect(net, 'pc2', { protocol: 'icmp', port: 0, dst: host(net, 'lab').ip, service: 'ping' }, lines)),
];

export const runAllTests = (net: BreakFixNetwork): TestResult[] => connectivityTests.map(t => t.run(net));

/* ------------------------------------------------------------------------------------------------
 * The working network
 * ---------------------------------------------------------------------------------------------- */

const PLANS = [
  { trusted: '10.0.1', dmz: '10.0.2', lab: '10.20.0' },
  { trusted: '192.168.40', dmz: '192.168.50', lab: '192.168.70' },
  { trusted: '172.16.8', dmz: '172.16.9', lab: '172.16.30' },
  { trusted: '10.10.20', dmz: '10.10.30', lab: '10.30.5' },
];
const PUBLIC = [
  { fw: '203.0.113.2', gw: '203.0.113.1', prefix: 24, web: '203.0.113.10' },
  { fw: '198.51.100.34', gw: '198.51.100.33', prefix: 28, web: '198.51.100.40' },
];

export function buildWorkingNetwork(r: Random): BreakFixNetwork {
  const plan = pick(r, PLANS), pub = pick(r, PUBLIC);
  const uplinkVlan = pick(r, [10, 20, 100]);
  const t = (n: number) => `${plan.trusted}.${n}`, d = (n: number) => `${plan.dmz}.${n}`, l = (n: number) => `${plan.lab}.${n}`;
  const resolverIp = '192.0.2.53', webIp = '192.0.2.80';
  const pc2 = integer(r, 20, 60), files = integer(r, 5, 15), dhcpStart = pick(r, [100, 120, 150]);
  return {
    firebox: {
      interfaces: [
        { id: 'eth0', name: 'Eth0 (External)', zone: 'external', ip: pub.fw, prefix: pub.prefix },
        { id: 'eth1', name: 'Eth1 (Trusted)', zone: 'trusted', ip: t(1), prefix: 24 },
        { id: 'eth2', name: 'Eth2 (Optional)', zone: 'optional', ip: d(1), prefix: 24 },
      ],
      externalGateway: pub.gw,
      policies: [
        { id: 'ping', name: 'Ping', enabled: true, action: 'allow', protocol: 'icmp', port: 0, from: 'Any-Trusted', to: 'Any' },
        { id: 'dns', name: 'DNS', enabled: true, action: 'allow', protocol: 'udp', port: 53, from: 'Any-Trusted', to: resolverIp },
        { id: 'https', name: 'HTTPS-proxy', enabled: true, action: 'allow', protocol: 'tcp', port: 443, from: 'Any-Trusted', to: 'Any-External' },
        { id: 'web-in', name: 'HTTPS-Website-Inbound', enabled: true, action: 'allow', protocol: 'tcp', port: 443, from: 'Any-External', to: pub.web },
      ],
      dynamicNat: { trusted: true, optional: true },
      staticNat: [{ id: 'snat-web', publicIp: pub.web, internalIp: d(80), port: 443 }],
      routes: [{ id: 'lab', network: `${plan.lab}.0`, prefix: 24, gateway: t(254) }],
      dhcp: { enabled: true, start: t(dhcpStart), end: t(dhcpStart + 49), gateway: t(1), dns: resolverIp },
    },
    switch: {
      uplinkVlan,
      ports: [
        { id: 'p2', label: 'Port 2', device: 'pc1', vlan: uplinkVlan },
        { id: 'p3', label: 'Port 3', device: 'pc2', vlan: uplinkVlan },
        { id: 'p4', label: 'Port 4', device: 'files', vlan: uplinkVlan },
        { id: 'p24', label: 'Port 24', device: 'r1', vlan: uplinkVlan },
      ],
    },
    router: { insideIp: t(254), insidePrefix: 24, labIp: l(1), labPrefix: 24, defaultGateway: t(1) },
    hosts: [
      { id: 'pc1', name: 'PC-1', role: 'client', segment: 'trusted', addressing: 'dhcp', ip: '', prefix: 24, gateway: '', dns: '', services: [] },
      { id: 'pc2', name: 'PC-2', role: 'client', segment: 'trusted', addressing: 'static', ip: t(pc2), prefix: 24, gateway: t(1), dns: resolverIp, services: [] },
      { id: 'files', name: 'File server', role: 'server', segment: 'trusted', addressing: 'static', ip: t(files), prefix: 24, gateway: t(1), dns: resolverIp, services: [{ protocol: 'tcp', port: 445 }] },
      { id: 'web', name: 'Web server', role: 'server', segment: 'optional', addressing: 'static', ip: d(80), prefix: 24, gateway: d(1), dns: resolverIp, services: [{ protocol: 'tcp', port: 443 }] },
      { id: 'lab', name: 'Lab server', role: 'server', segment: 'lab', addressing: 'static', ip: l(10), prefix: 24, gateway: l(1), dns: resolverIp, services: [] },
    ],
    internet: { ispGateway: pub.gw, webName: 'www.example.com', webIp, resolverIp, clientIp: '198.18.44.20', publicWebName: 'the company website' },
  };
}

/* ------------------------------------------------------------------------------------------------
 * Faults
 * ---------------------------------------------------------------------------------------------- */

export interface Fault {
  id: string;
  /** Plain description of what is wrong, shown when the ticket is solved or given up. */
  title: string;
  /** Where the fault lives, for the second hint. Matches a diagram node id. */
  device: string;
  /** Which setting to look at, for the third hint. */
  setting: string;
  /** The ticket a user would actually raise. */
  ticket: string;
  topic: 'Troubleshooting' | 'Policies' | 'NAT' | 'Routing' | 'Network Services' | 'Switching & Wireless' | 'IP Addressing';
  break: (net: BreakFixNetwork, r: Random) => void;
  explain: (working: BreakFixNetwork, broken: BreakFixNetwork) => string;
}

const clone = (net: BreakFixNetwork): BreakFixNetwork => JSON.parse(JSON.stringify(net));
const lastOctet = (ip: string, n: number) => ip.split('.').slice(0, 3).concat(String(n)).join('.');
const policy = (net: BreakFixNetwork, id: string) => net.firebox.policies.find(p => p.id === id)!;

export const faults: Fault[] = [
  {
    id: 'pc2-gateway', title: "PC-2's default gateway points at an address nothing owns", device: 'pc2', setting: 'Default gateway', topic: 'IP Addressing',
    ticket: 'PC-2 can open file shares, but the Internet and the lab network are both unreachable from it.',
    break: (net, r) => { host(net, 'pc2').gateway = lastOctet(host(net, 'pc2').gateway, pick(r, [200, 250, 11])); },
    explain: (w, b) => `PC-2's gateway was ${host(b, 'pc2').gateway}; it should be the Firebox trusted interface, ${host(w, 'pc2').gateway}. Anything on its own subnet still works, because that never uses the gateway, which is exactly the pattern in the ticket.`,
  },
  {
    id: 'pc2-mask', title: "PC-2 has the wrong subnet mask", device: 'pc2', setting: 'Prefix length', topic: 'IP Addressing',
    ticket: 'PC-2 cannot reach anything at all, not even the file server in the same office.',
    break: (net, r) => { host(net, 'pc2').prefix = pick(r, [28, 29, 30]); },
    explain: (w, b) => `PC-2 was set to /${host(b, 'pc2').prefix}, which shrinks its network so the gateway ${host(w, 'pc2').gateway} and the file server fall outside it. The office network is /${host(w, 'pc2').prefix}.`,
  },
  {
    id: 'pc2-dns', title: "PC-2 is using the wrong DNS server", device: 'pc2', setting: 'DNS server', topic: 'Network Services',
    ticket: 'PC-2 says websites "cannot be found", but file shares and pinging the lab server work.',
    break: (net, r) => { host(net, 'pc2').dns = pick(r, [lastOctet(net.internet.resolverIp, 35), iface(net, 'eth1').ip]); },
    explain: (w, b) => `PC-2 asked ${host(b, 'pc2').dns} for names, but the resolver the network uses is ${host(w, 'pc2').dns}. "Cannot be found" with working IP connectivity is the classic DNS symptom.`,
  },
  {
    id: 'pc1-vlan', title: "PC-1's switch port is in the wrong VLAN", device: 'switch', setting: 'Port 2 VLAN', topic: 'Switching & Wireless',
    ticket: 'PC-1 shows "No Internet" and has a 169.254 address. PC-2 at the next desk is fine.',
    break: (net, r) => { net.switch.ports.find(p => p.device === 'pc1')!.vlan = pick(r, [30, 99, 200].filter(v => v !== net.switch.uplinkVlan)); },
    explain: (w, b) => `Port 2 was in VLAN ${b.switch.ports.find(p => p.device === 'pc1')!.vlan}, where there is no DHCP server, so PC-1 self-assigned a link-local address. The office VLAN is ${w.switch.uplinkVlan}.`,
  },
  {
    id: 'pc2-vlan', title: "PC-2's switch port is in the wrong VLAN", device: 'switch', setting: 'Port 3 VLAN', topic: 'Switching & Wireless',
    ticket: 'PC-2 cannot reach anything, even though its IP settings match everyone else in the office.',
    break: (net, r) => { net.switch.ports.find(p => p.device === 'pc2')!.vlan = pick(r, [30, 99, 200].filter(v => v !== net.switch.uplinkVlan)); },
    explain: (w, b) => `Port 3 was in VLAN ${b.switch.ports.find(p => p.device === 'pc2')!.vlan}, a separate broadcast domain, so PC-2's ARP requests never reached the gateway or the file server. Correct IP settings cannot help across a VLAN mismatch. The office VLAN is ${w.switch.uplinkVlan}.`,
  },
  {
    id: 'https-disabled', title: 'The outbound HTTPS policy is disabled', device: 'firebox', setting: 'Firewall policies', topic: 'Policies',
    ticket: 'Nobody in the office can browse the web since last night\'s change. Name lookups and file shares still work.',
    break: net => { policy(net, 'https').enabled = false; },
    explain: () => 'The HTTPS-proxy policy was disabled, so outbound HTTPS matched nothing and hit the implicit deny ("Unhandled Internal Packet" in Traffic Monitor). DNS kept working because it has its own policy.',
  },
  {
    id: 'dns-policy', title: 'The DNS policy allows the wrong server address', device: 'firebox', setting: 'DNS policy To list', topic: 'Policies',
    ticket: 'Every website fails with "server not found" for everyone. Pinging the lab server works.',
    break: (net, r) => { policy(net, 'dns').to = lastOctet(net.internet.resolverIp, pick(r, [35, 54, 3])); },
    explain: (w, b) => `The DNS policy's To list held ${policy(b, 'dns').to} instead of the resolver ${policy(w, 'dns').to}, so every lookup reached the implicit deny. Restricting DNS to known servers is good practice; a typo in that list breaks name resolution for the whole office.`,
  },
  {
    id: 'deny-above', title: 'A leftover deny policy sits above the HTTPS policy', device: 'firebox', setting: 'Policy order', topic: 'Policies',
    ticket: 'Web browsing is blocked for everyone, but the HTTPS policy is enabled and looks correct.',
    break: net => { net.firebox.policies.splice(1, 0, { id: 'block-test', name: 'Block-Web-Test', enabled: true, action: 'deny', protocol: 'tcp', port: 443, from: 'Any-Trusted', to: 'Any-External' }); },
    explain: () => 'A test policy, Block-Web-Test, denied HTTPS and was placed above HTTPS-proxy. The Firebox uses the first policy that matches, so the correct allow below it was never reached. Disable the test policy or move it below HTTPS-proxy.',
  },
  {
    id: 'nat-off', title: 'Dynamic NAT is off for trusted networks', device: 'firebox', setting: 'Dynamic NAT', topic: 'NAT',
    ticket: 'Nothing on the Internet works for anyone: no websites, no name lookups. The internal network is fine.',
    break: net => { net.firebox.dynamicNat.trusted = false; },
    explain: () => 'Dynamic NAT for trusted networks was turned off, so outbound traffic left with private source addresses that the Internet cannot route back to. Traffic Monitor shows the policy allowing it; the failure is that no reply ever returns.',
  },
  {
    id: 'snat-target', title: 'Static NAT publishes the website to the wrong internal address', device: 'firebox', setting: 'Static NAT internal address', topic: 'NAT',
    ticket: 'Customers report the company website is down. Staff inside can still reach the Internet.',
    break: (net, r) => { const n = net.firebox.staticNat[0]; n.internalIp = lastOctet(n.internalIp, pick(r, [81, 8, 90])); },
    explain: (w, b) => `The static NAT rule translated the public address to ${b.firebox.staticNat[0].internalIp}, but the web server is ${w.firebox.staticNat[0].internalIp}. The policy allowed the traffic; it was delivered to an address nothing owns.`,
  },
  {
    id: 'inbound-port', title: 'The inbound website policy allows the wrong port', device: 'firebox', setting: 'Inbound policy port', topic: 'Policies',
    ticket: 'The company website stopped loading for customers right after a firewall change.',
    break: (net, r) => { policy(net, 'web-in').port = pick(r, [8443, 4443, 80]); },
    explain: (w, b) => `HTTPS-Website-Inbound allowed TCP ${policy(b, 'web-in').port}, but customers connect on ${policy(w, 'web-in').port}. Inbound HTTPS matched no policy and was dropped as an unhandled external packet.`,
  },
  {
    id: 'web-gateway', title: "The web server's default gateway is wrong", device: 'web', setting: 'Default gateway', topic: 'Routing',
    ticket: 'The website times out for customers. The Firebox logs show their connections being allowed.',
    break: (net, r) => { const h = host(net, 'web'); h.gateway = lastOctet(h.gateway, pick(r, [254, 2, 100])); },
    explain: (w, b) => `Requests reached the web server, but it sent replies to ${host(b, 'web').gateway} instead of the Firebox optional interface ${host(w, 'web').gateway}, so they never returned. "Allowed in the logs but still timing out" points to the return path.`,
  },
  {
    id: 'lab-route', title: 'The static route to the lab network uses the wrong gateway', device: 'firebox', setting: 'Static route gateway', topic: 'Routing',
    ticket: 'Nobody can reach the lab network since the lab router was re-cabled. Everything else works.',
    break: (net, r) => { const route = net.firebox.routes[0]; route.gateway = lastOctet(route.gateway, pick(r, [253, 250, 2])); },
    explain: (w, b) => `The Firebox route to the lab network pointed at ${b.firebox.routes[0].gateway}, but the lab router's inside address is ${w.firebox.routes[0].gateway}. The route existed, so the Firebox tried to use it and got no ARP reply from the next hop.`,
  },
  {
    id: 'lab-return', title: "The lab server's default gateway is wrong", device: 'lab', setting: 'Default gateway', topic: 'Routing',
    ticket: 'Pings to the lab server time out, but the lab team says the server is up and its interface shows traffic arriving.',
    break: (net, r) => { const h = host(net, 'lab'); h.gateway = lastOctet(h.gateway, pick(r, [254, 100, 2])); },
    explain: (w, b) => `Echo requests arrived, but the lab server replied via ${host(b, 'lab').gateway} instead of the lab router ${host(w, 'lab').gateway}. Traffic arriving with no reply is a return-path problem, not a reachability one.`,
  },
  {
    id: 'dhcp-scope', title: 'The DHCP scope is outside the trusted network', device: 'firebox', setting: 'DHCP address range', topic: 'Network Services',
    ticket: 'PC-1 has a 169.254 address after a reboot. PC-2, which uses a static address, works normally.',
    break: (net, r) => {
      const other = pick(r, ['192.168.1', '10.99.0', '172.31.5'].filter(p => !net.firebox.dhcp.start.startsWith(p)));
      const start = Number(net.firebox.dhcp.start.split('.')[3]);
      net.firebox.dhcp.start = `${other}.${start}`; net.firebox.dhcp.end = `${other}.${start + 49}`;
    },
    explain: (w, b) => `The DHCP range ${b.firebox.dhcp.start}-${b.firebox.dhcp.end} did not sit inside the trusted interface network, so the Firebox had nothing to offer. It should be ${w.firebox.dhcp.start}-${w.firebox.dhcp.end}. Static hosts are unaffected, which is why PC-2 kept working.`,
  },
  {
    id: 'dhcp-dns', title: 'DHCP hands out the wrong DNS server', device: 'firebox', setting: 'DHCP DNS server', topic: 'Network Services',
    ticket: 'PC-1 cannot load any websites by name. PC-2, which has static settings, browses normally.',
    break: (net, r) => { net.firebox.dhcp.dns = pick(r, [lastOctet(net.internet.resolverIp, 35), iface(net, 'eth1').ip]); },
    explain: (w, b) => `DHCP gave clients ${b.firebox.dhcp.dns} as their DNS server instead of ${w.firebox.dhcp.dns}. Only DHCP clients were affected, which is the clue that separates this from a DNS policy problem.`,
  },
  {
    id: 'dhcp-gateway', title: 'DHCP hands out the wrong default gateway', device: 'firebox', setting: 'DHCP default gateway', topic: 'Network Services',
    ticket: 'PC-1 gets an address but cannot reach anything outside the office. PC-2 is fine.',
    break: (net, r) => { net.firebox.dhcp.gateway = lastOctet(net.firebox.dhcp.gateway, pick(r, [200, 2, 250])); },
    explain: (w, b) => `DHCP leases carried ${b.firebox.dhcp.gateway} as the gateway instead of the Firebox trusted interface ${w.firebox.dhcp.gateway}. The client had a valid address, so the local network looked healthy.`,
  },
];

/* ------------------------------------------------------------------------------------------------
 * Scenarios
 * ---------------------------------------------------------------------------------------------- */

export interface BreakFixScenario {
  seed: number;
  fault: Fault;
  working: BreakFixNetwork;
  broken: BreakFixNetwork;
}

export function createScenario(seed: number, faultId?: string): BreakFixScenario {
  const r = seededRandom(seed);
  const working = buildWorkingNetwork(r);
  // Try faults in a seeded order until one genuinely breaks a test with this addressing plan.
  const order = faultId ? faults.filter(f => f.id === faultId) : shuffle(faults, r);
  for (const fault of order) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const broken = clone(working);
      fault.break(broken, r);
      if (runAllTests(broken).some(t => !t.pass)) return { seed, fault, working, broken };
    }
  }
  throw new Error(`No fault produced a failing test for seed ${seed}${faultId ? ` and fault ${faultId}` : ''}.`);
}

/* ------------------------------------------------------------------------------------------------
 * Diagram
 * ---------------------------------------------------------------------------------------------- */

export const deviceLabels: Record<string, string> = {
  internet: 'Internet', firebox: 'Firebox', switch: 'Office switch', pc1: 'PC-1', pc2: 'PC-2', files: 'File server', web: 'Web server', r1: 'Lab router', lab: 'Lab server',
};

/** The diagram shows addresses a technician would see on a network map, never the settings under test. */
export function breakFixDiagram(net: BreakFixNetwork): TopologyDiagramData {
  const eth = (id: FireboxInterface['id']) => iface(net, id);
  const addr = (id: string) => { const h = host(net, id), e = effectiveAddressing(net, h); return h.addressing === 'dhcp' ? 'DHCP client' : `${e.ip}/${e.prefix}`; };
  return {
    version: 1,
    title: 'Branch office network',
    description: 'Select a device to inspect its configuration. Links show cabling, not permission to pass traffic.',
    width: 1060,
    height: 820,
    nodes: [
      { id: 'internet', kind: 'cloud', label: 'Internet', detail: `${net.internet.webName} ${net.internet.webIp}`, zone: 'external', x: 560, y: 80 },
      { id: 'firebox', kind: 'firebox', label: 'Firebox', detail: `${eth('eth0').ip} · ${eth('eth1').ip} · ${eth('eth2').ip}`, x: 560, y: 250 },
      { id: 'web', kind: 'server', label: 'Web server', detail: addr('web'), zone: 'optional', x: 900, y: 250 },
      { id: 'switch', kind: 'switch', label: 'Office switch', detail: '24-port access switch', zone: 'trusted', x: 560, y: 420 },
      { id: 'pc1', kind: 'client', label: 'PC-1', detail: addr('pc1'), zone: 'trusted', x: 130, y: 590 },
      { id: 'pc2', kind: 'client', label: 'PC-2', detail: addr('pc2'), zone: 'trusted', x: 360, y: 590 },
      { id: 'files', kind: 'server', label: 'File server', detail: addr('files'), zone: 'trusted', x: 590, y: 590 },
      { id: 'r1', kind: 'router', label: 'Lab router', detail: `${net.router.insideIp} · ${net.router.labIp}`, zone: 'trusted', x: 840, y: 590 },
      { id: 'lab', kind: 'server', label: 'Lab server', detail: addr('lab'), x: 840, y: 740 },
    ],
    edges: [
      { id: 'e-ext', from: 'firebox', to: 'internet', label: 'Eth0 external', zone: 'external' },
      { id: 'e-opt', from: 'firebox', to: 'web', label: 'Eth2 optional', zone: 'optional' },
      { id: 'e-trust', from: 'firebox', to: 'switch', label: 'Eth1 trusted', zone: 'trusted' },
      { id: 'e-pc1', from: 'switch', to: 'pc1', label: 'Port 2', zone: 'trusted' },
      { id: 'e-pc2', from: 'switch', to: 'pc2', label: 'Port 3', zone: 'trusted' },
      { id: 'e-files', from: 'switch', to: 'files', label: 'Port 4', zone: 'trusted' },
      { id: 'e-r1', from: 'switch', to: 'r1', label: 'Port 24', zone: 'trusted' },
      { id: 'e-lab', from: 'r1', to: 'lab', label: 'Lab LAN' },
    ],
    hotspots: Object.entries(deviceLabels).map(([targetId, answer]) => ({ target: 'node' as const, targetId, answer })),
  };
}
