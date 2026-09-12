import type { Question } from '../data/questions';
import type { Random } from './random';
import { integer, pick, seededRandom, shuffle } from './random';
import { numberToIPv4 as ip, subnet, smallestLanPrefix } from './network';
import { validateQuestion } from './grading';
import { CLOUD_SOURCE, NETWORK_SOURCE, localSource, type Track, type Variant } from './types';
import type { TopologyDiagramData, TopologyEdge, TopologyNode } from './topology';
import { logScenarioBuilders } from './logScenarios';
import { orderingScenarios } from './policyOrdering';

type Scenario = Pick<Question, 'question' | 'options' | 'correctAnswers' | 'explanation'> &
  Partial<Pick<Question, 'type' | 'logMessage' | 'networkDiagram' | 'orderingDetails' | 'topology'>>;
export interface QuestionTemplate {
  id: number; title: string; topic: Question['topic']; track: Track; section: string;
  build: (rng: Random) => Scenario;
}
const one = (question: string, answer: string, wrong: string[], explanation: string): Scenario =>
  ({ question, options: [answer, ...wrong], correctAnswers: [answer], explanation });
const lan = (r: Random) => {
  const prefix = integer(r, 25, 29);
  const block = 2 ** (32 - prefix);
  const base = `10.${integer(r, 1, 200)}.${integer(r, 1, 200)}.${integer(r, 0, 256 / block - 1) * block}`;
  const range = subnet(base, prefix);
  return { ...range, prefix, base, host: ip(range.network + integer(r, 2, block - 2)) };
};
const networks = (r: Random) => {
  const n = integer(r, 10, 180), host = integer(r, 20, 200);
  return { client: `10.${n}.1.${host}`, gateway: `10.${n}.1.1`, router: `10.${n}.2.254`,
    server: `10.${n}.3.${host}`, remote: `10.${n}.3.0/24`, publicIP: `203.0.113.${integer(r, 10, 200)}` };
};
const local = (id: number, title: string, topic: Question['topic'], section: string, build: QuestionTemplate['build']): QuestionTemplate =>
  ({ id, title, topic, section, track: 'local', build });
const net = (id: number, title: string, topic: Question['topic'], section: string, build: QuestionTemplate['build']): QuestionTemplate =>
  ({ id, title, topic, section, track: 'network-plus', build });

const node = (
  id: string, kind: TopologyNode['kind'], label: string, x: number, y: number,
  extra: Partial<TopologyNode> = {},
): TopologyNode => ({ id, kind, label, x, y, ...extra });
const link = (id: string, from: string, to: string, extra: Partial<TopologyEdge> = {}): TopologyEdge =>
  ({ id, from, to, ...extra });
const diagram = (
  title: string, width: number, height: number,
  nodes: TopologyNode[], edges: TopologyEdge[], hotspots?: TopologyDiagramData['hotspots'],
): TopologyDiagramData => ({ version: 1, title, width, height, nodes, edges, hotspots });

export const questionTemplates: QuestionTemplate[] = [
  net(10001, 'Find the network address', 'IP Addressing', '1.7 IPv4 addressing', r => {
    const n = lan(r);
    return one(`A workstation uses ${n.host}/${n.prefix}. Which network address belongs in its subnet documentation?`, ip(n.network),
      [ip(n.network + 1), ip(n.broadcast), n.host], `A /${n.prefix} contains blocks of ${n.size} addresses. This host is in ${ip(n.network)}/${n.prefix}; the network identifier has all host bits set to zero.`);
  }),
  net(10002, 'Find the directed broadcast', 'IP Addressing', '1.7 IPv4 addressing', r => {
    const n = lan(r);
    return one(`For the LAN ${n.base}/${n.prefix}, which address is the directed broadcast?`, ip(n.broadcast),
      [ip(n.network), ip(n.network + 1), ip(n.broadcast - 1)], `The block spans ${ip(n.network)} through ${ip(n.broadcast)}. Setting every host bit to one gives the broadcast address.`);
  }),
  net(10003, 'Calculate usable LAN addresses', 'IP Addressing', '1.7 IPv4 addressing', r => {
    const bits = integer(r, 22, 29), n = subnet('10.10.0.0', bits);
    return one(`How many usable host addresses does a conventional IPv4 /${bits} LAN provide? Exclude the network and broadcast addresses.`, String(n.usable),
      [String(n.size), String(n.size - 1), String(n.size / 2 - 2)], `There are 32 − ${bits} = ${32 - bits} host bits. 2^${32 - bits} − 2 = ${n.usable} usable addresses.`);
  }),
  net(10004, 'Convert prefix to mask', 'IP Addressing', '1.7 IPv4 addressing', r => {
    const bits = integer(r, 24, 29), masks = [24,25,26,27,28,29,30].map(p => subnet('10.0.0.0', p).mask);
    const answer = subnet('10.0.0.0', bits).mask;
    return one(`A router configuration requires a dotted-decimal mask for /${bits}. Which mask should you enter?`, answer,
      shuffle(masks.filter(m => m !== answer), r).slice(0,3), `The mask has ${bits} consecutive one bits followed by ${32 - bits} zero bits, giving ${answer}.`);
  }),
  net(10005, 'Size a subnet for a branch', 'IP Addressing', '1.7 IPv4 addressing', r => {
    const hosts = pick(r, [12,25,50,110,220,400]), bits = smallestLanPrefix(hosts);
    return one(`A branch needs ${hosts} usable IPv4 addresses, including its gateway. Choose the smallest conventional subnet that fits.`, `/${bits}`,
      [`/${bits+1}`, `/${bits-1}`, `/${bits-2}`], `/${bits} provides ${2 ** (32-bits)-2} usable addresses. /${bits+1} provides only ${2 ** (31-bits)-2}; larger networks waste addresses for this requirement.`);
  }),
  net(10006, 'Select valid hosts', 'IP Addressing', '1.7 IPv4 addressing', r => {
    const n = lan(r), answers = [ip(n.network+1), ip(n.broadcast-1)];
    return { question: `Select TWO assignable host addresses in ${n.base}/${n.prefix}.`, options: [...answers, ip(n.network), ip(n.broadcast)], correctAnswers: answers,
      explanation: `Usable addresses run from ${answers[0]} through ${answers[1]}. ${ip(n.network)} identifies the network and ${ip(n.broadcast)} is its broadcast.` };
  }),
  local(10007, 'Longest-prefix route selection', 'Routing', 'Static Routing; Routing Decisions Logic, pp. 90–91, 114–118', r => {
    const n=networks(r), target=pick(r,[true,false]);
    const destination=target?n.server:n.server.replace(/\.\d+$/,'.210');
    const route=target?`${n.server}/32`:n.remote;
    return {...one(`A local Firebox has active routes 0.0.0.0/0 → WAN, ${n.remote} → Branch, and ${n.server}/32 → Tunnel. No policy routing, SD-WAN, or VPN selector overrides apply. Which route matches ${destination}?`,route,
      [target?n.remote:`${n.server}/32`, '0.0.0.0/0', 'No matching route'], `For ordinary destination routing, the longest matching prefix wins. ${destination} matches ${route}, which is more specific than the other applicable entries.`),
      type:'topology',networkDiagram:[{label:'Firebox',detail:'Destination route lookup'},{label:'Branch',detail:n.remote},{label:'Tunnel',detail:`${n.server}/32`}]};
  }),
  net(10008, 'Calculate DHCP pool capacity', 'Network Services', '3.4 IPv4 network services', r => {
    const start=integer(r,20,60), end=start+integer(r,30,100), excluded=integer(r,2,10);
    return one(`A /24 DHCP scope offers .${start} through .${end}, inclusive. ${excluded} addresses inside that range are excluded. With no other reservations or exclusions, how many leases are available?`,String(end-start+1-excluded),
      [String(end-start-excluded),String(end-start+1),String(end-start+1+excluded)],`Inclusive pool size = ${end} − ${start} + 1 = ${end-start+1}. Subtract ${excluded} exclusions to get ${end-start+1-excluded} leases.`);
  }),
  local(10009, 'SNAT destination and port translation', 'NAT', 'Static NAT, pp. 126–127', r => {
    const n=networks(r), port=pick(r,[8080,8443,9443]);
    return one(`A TCP policy accepts connections to ${n.publicIP}:443. Its static NAT action maps to ${n.server} with internal port ${port}. What destination reaches the server?`,`${n.server}:${port}`,
      [`${n.publicIP}:${port}`,`${n.server}:443`,`${n.client}:${port}`],`The static NAT action replaces the destination with ${n.server} and translates its port to ${port}. This is destination translation; the inbound policy must also allow the connection.`);
  }),
  local(10010, 'Dynamic NAT source translation', 'NAT', 'Dynamic NAT, pp. 123–125', r => {
    const n=networks(r);
    return one(`Client ${n.client} opens an allowed Internet session. Dynamic NAT uses external interface address ${n.publicIP}, with no source-IP override. Which source IP does the Internet server see?`,n.publicIP,
      [n.client,n.gateway,n.server],`Dynamic NAT substitutes ${n.publicIP} for the private source ${n.client}. The Firebox tracks the connection so replies can return to that client.`);
  }),
  local(10011, 'Translate a 1-to-1 NAT range', 'NAT', '1-to-1 NAT, pp. 128–129', r => {
    const offset=integer(r,1,6), start=integer(r,20,80);
    return one(`A 1-to-1 NAT rule maps eight real addresses starting at 10.20.1.${start} to eight public addresses starting at 198.51.100.100. Which public IP corresponds to 10.20.1.${start+offset}?`, `198.51.100.${100+offset}`,
      ['198.51.100.99',`198.51.100.${100+offset+1}`,`198.51.100.${100+offset-1}`],`Preserve the offset within the range: ${start+offset} − ${start} = ${offset}. The public address is 198.51.100.${100+offset}. Firewall policies still control access.`);
  }),
  local(10012, 'Diagnose NAT loopback access', 'NAT', 'NAT Loopback, pp. 130–131', r => {
    const n=networks(r), allowed=pick(r,[true,false]);
    return one(`Internet users can reach ${n.publicIP}, mapped by SNAT to ${n.server}. Trusted client ${n.client} uses that public address. The publishing policy ${allowed?'already includes':'excludes'} Trusted sources. Which next step addresses ${allowed?'possible asymmetric replies':'the policy mismatch'}?`,
      allowed?'Check the server return path and whether source NAT is required for this topology.':'Include the required Trusted sources in the policy that uses the SNAT action.',
      ['Replace the SNAT action with an outbound-only dynamic NAT rule.','Disable every inbound policy.','Change the client address to the public server address.'],
      `NAT loopback lets internal clients use the published address. Both the policy source scope and the return path matter. ${allowed?'If replies bypass the Firebox, source translation may be needed.':'An external-only source scope does not permit a Trusted client.'}`);
  }),
  local(10013, 'Manual policy order', 'Policies', 'Policy Precedence, pp. 148–149', r => {
    const denyFirst=pick(r,[true,false]), n=networks(r);
    return {...one(`Manual-order mode is enabled. Two enabled packet-filter policies match a NEW TCP/443 session from ${n.client}. Rule 1 ${denyFirst?'denies':'allows'} it; rule 2 ${denyFirst?'allows':'denies'} it. No other checks block it. What happens?`,denyFirst?'The first policy denies the connection.':'The first policy allows the connection.',
      [denyFirst?'The second policy allows the connection.':'The second policy denies the connection.','The Firebox merges both actions.','The policy names determine the outcome.'],`In manual-order mode, the first matching policy applies. Here that policy ${denyFirst?'denies':'allows'} the new connection.`),type:'log',logMessage:`SIMULATED CONFIGURATION\norder=manual\n1 tcp/443 from=${n.client} action=${denyFirst?'deny':'allow'}\n2 tcp/443 from=${n.client} action=${denyFirst?'allow':'deny'}`};
  }),
  local(10014, 'Automatic policy specificity', 'Policies', 'Policy Precedence, pp. 148–149', r => {
    const n=networks(r), direction=pick(r,['source','destination']);
    return one(`In auto-order mode, two TCP/443 packet filters are identical except the ${direction}. One matches a single host ${n.client}; the other matches that host's /24 subnet. Which is more specific?`,`The policy matching only ${n.client}.`,
      ['The policy matching the entire /24.','Whichever policy was created last.','The policy with the longest name.'],`With the other precedence criteria equal, a single-host ${direction} is narrower than its enclosing subnet. Auto-order compares specificity; it is not creation order.`);
  }),
  local(10015, 'Choose a reachable static next hop', 'Routing', 'Routing to Another Device · Lab 7; Static Routing, pp. 90–91', r => {
    const n=networks(r);
    return {...one(`A Firebox Optional interface is ${n.router.replace('.254','.1')}/24. A router at ${n.router} reaches ${n.remote}. Which static route should the Firebox use?`,`${n.remote} via ${n.router}`,
      [`${n.remote} via ${n.server}`,`${n.remote} via ${n.client}`,`${n.router}/32 via ${n.server}`],`The route destination is the remote network ${n.remote}; its next hop must be reachable on the directly connected Optional network: ${n.router}. Also verify policies and a return route.`),
      type:'topology',networkDiagram:[{label:'Firebox Optional',detail:n.router.replace('.254','.1')+'/24'},{label:'Downstream router',detail:n.router},{label:'Server LAN',detail:n.remote}]};
  }),
  local(10016, 'VLAN tag mismatch', 'Routing', 'VLANs, pp. 82–89', r => {
    const vlan=integer(r,10,200), wrong=vlan+1;
    return one(`The switch sends tagged VLAN ${vlan} on its uplink. The Firebox port accepts tagged VLAN ${wrong} only. Physical link is up but VLAN ${vlan} clients cannot reach their gateway. What should you correct first?`,`Allow the matching tagged VLAN ${vlan} on the Firebox uplink.`,
      ['Change the public DNS server.','Enable outbound static NAT for every client.','Disable spanning tree on all switches.'],`802.1Q VLAN IDs must agree across the tagged link. Link-up proves the physical connection, not VLAN membership.`);
  }),
  net(10017, 'Separate DNS failure from IP reachability', 'Troubleshooting', '5.3 Network services troubleshooting', r => {
    const n=networks(r), resolves=pick(r,[true,false]);
    return one(`A workstation ${resolves?'resolves portal.example to '+n.publicIP+' but TCP/443 fails':'can connect by IP to '+n.publicIP+' but cannot resolve portal.example'}. Which area should you investigate first?`,
      resolves?'The TCP path, firewall policy, and listening service.':'DNS server reachability and the requested DNS record.',
      [resolves?'Replace the DNS record without checking the TCP path.':'Replace the working Ethernet cable first.','Reinstall the entire operating system.','Increase the DHCP lease time to fix all sessions.'],
      resolves?'Successful resolution narrows this symptom to the connection path or service, though additional tests are needed to identify the cause.':'IP connectivity works for the tested destination. Name resolution is the next layer to test; do not assume all IP services are broken.');
  }),
  local(10018, 'Read an unhandled-packet log', 'Logging & Monitoring', 'Traffic Monitor, pp. 60–61', r => {
    const n=networks(r), port=pick(r,[80,443,22,3389]);
    return {...one(`A new session from ${n.client} is denied in the simulated Traffic Monitor excerpt. What does the policy field indicate?`,'No configured policy matched this connection.',
      ['The server accepted and then closed the application session.','The correct allow policy matched and inspected the content.','The DNS TTL expired.'],`An Unhandled Packet denial indicates the packet did not match an allowing configured policy. Examine protocol, port, source, destination, and interface scope before adding a narrowly scoped rule.`),
      type:'log',logMessage:`SIMULATED TRAFFIC LOG\nDeny ${n.client} ${n.server} ${integer(r,49152,65535)} ${port} tcp\npolicy="Unhandled Internal Packet-00"`};
  }),
  local(10019, 'BOVPN PFS mismatch', 'BOVPN', 'VPN Negotiations; Troubleshoot BOVPN Tunnels, pp. 277–280, 305–312', r => {
    const group=pick(r,[14,19,20]), n=networks(r);
    return {...one(`An IKEv1 BOVPN to ${n.publicIP} completes Phase 1. Local Phase 2 requires PFS group ${group}; the peer proposes no PFS. Which change addresses this mismatch?`,`Configure compatible Phase 2 PFS settings on both peers.`,
      ['Change only the local DNS suffix.','Open the Fireware Web UI management port to everyone.','Change only the Phase 1 gateway display name.'],`Phase 1 success does not establish the IPsec data SA. Phase 2 PFS settings must be compatible; the peer must offer the required group ${group}, or both sides must adopt another agreed secure configuration.`),type:'log',logMessage:`SIMULATED IKE DIAGNOSTIC\npeer=${n.publicIP}\nphase1=established\nphase2: received proposal without PFS; expecting PFS group ${group}`};
  }),
  local(10020, 'Interpret an allowed session', 'Logging & Monitoring', 'Read Traffic Log Messages, pp. 60–61', r => {
    const n=networks(r), port=pick(r,[80,443,25]);
    return {...one(`Traffic Monitor records an Allow for ${n.client} to ${n.server}:${port}. The application still fails. What can you conclude from this entry alone?`,'The logged traffic matched an allow action; application success is not proven.',
      ['The full application transaction succeeded.','Every packet in both directions arrived.','The server certificate is trusted by every client.'],`An Allow entry describes the firewall decision for the logged traffic. Inspect replies, server availability, TLS, and application behavior to locate a later failure.`),type:'log',logMessage:`SIMULATED TRAFFIC LOG\nAllow ${n.client} ${n.server} 51432 ${port} tcp\npolicy="Branch-Service"`};
  }),
  local(10021, 'DHCP across a routed boundary', 'Routing', 'Interfaces; VLANs, pp. 71–74, 82–89', r => {
    const n=networks(r), vlan=integer(r,10,90);
    return one(`Clients in VLAN ${vlan} broadcast DHCP Discover, but the only DHCP server is ${n.server} on another routed subnet. What is needed at the client subnet's Layer 3 boundary?`,'DHCP relay directed to the server, with a matching remote scope and permitted traffic.',
      ['Static NAT for the DHCP server public address.','A longer DNS TTL.','A default route on each client before it has any address.'],`DHCP Discover is a local broadcast. A relay forwards the request to the server and identifies the client subnet so the server can choose the appropriate scope.`);
  }),
  local(10022, 'Choose an SD-WAN path', 'Routing', 'Link Monitor; SD-WAN, pp. 110–113, 119–122', r => {
    const threshold=integer(r,50,100), good=threshold-integer(r,10,30), bad=threshold+integer(r,10,30), goodA=pick(r,[true,false]);
    return one(`An SD-WAN action requires latency below ${threshold} ms. WAN-A measures ${goodA?good:bad} ms; WAN-B measures ${goodA?bad:good} ms. Both are up and meet all other configured thresholds. Which link meets the latency requirement?`,goodA?'WAN-A':'WAN-B',
      [goodA?'WAN-B':'WAN-A','Both links','Neither link'],`${good} ms is below ${threshold} ms; ${bad} ms is above it. Link-up alone does not prove a path meets an SD-WAN quality threshold.`);
  }),
  local(10023, 'Choose a recovery artifact', 'Initial Setup', 'Configuration Files and Backup Images, pp. 18–22', r => {
    const full=pick(r,[true,false]);
    return one(`Before a local Firebox maintenance window, you need ${full?'a supported recovery artifact with device configuration, feature key, passphrases, and certificates':'a file to review or edit firewall policies offline in Policy Manager'}. What should you save?`,full?'A compatible Firebox backup image.':'An XML configuration file.',
      [full?'Only an XML configuration file.':'Only a Traffic Monitor text export.','Only a screenshot of the dashboard.','Only the administrator display name.'],full?'A backup image contains more than policy configuration. OS inclusion depends on the backup method and version. Verify device and Fireware restore compatibility before the maintenance window.':'Policy Manager works with configuration files. XML is useful for offline policy editing but is not a complete OS and certificate backup.');
  }),
  local(10024, 'Connect to the Fireware CLI', 'Initial Setup', 'Firebox Management Tools, pp. 16–17', r => {
    const n=networks(r);
    return one(`From an authorized management workstation, which SSH command targets the default network CLI port on a locally managed Firebox at ${n.gateway}?`,`ssh -p 4118 admin@${n.gateway}`,
      [`ssh -p 8080 admin@${n.gateway}`,`ssh -p 4117 admin@${n.gateway}`,`ssh -p 4100 admin@${n.gateway}`],`The Fireware CLI uses SSH on TCP 4118 by default. TCP 8080 is the Web UI, 4117 is WSM management, and 4100 is the Authentication Portal. Access still requires an appropriate management policy and credentials.`);
  }),
  local(10025, 'Diagnose HTTPS inspection trust', 'Proxies', 'HTTPS-proxy Policies, pp. 209–217', r => {
    const trusted=pick(r,[true,false]);
    return one(`After HTTPS content inspection is enabled, a client reports ${trusted?'a hostname mismatch for portal.example, although its certificate chain is trusted':'an untrusted issuer, and the client does not trust the Firebox inspection CA'}. What should you check first?`,
      trusted?'Whether the presented certificate covers portal.example in its subject alternative names.':'Whether the correct inspection CA certificate is installed in the client trust store.',
      ['Disable all HTTPS filtering permanently.','Change the DHCP subnet mask.','Replace the DNS server with the Firebox public IP without testing.'],
      trusted?'Certificate trust and hostname validation are separate checks. A trusted issuer does not make a certificate valid for every hostname.':'Content inspection creates a separate TLS connection to the client. The client must trust the CA that signs that connection; also validate name and date checks.');
  }),
  net(10026, 'Match a service and transport', 'Network Services', '1.4 Common protocols', r => {
    const services=[['DNS ordinary query','UDP/53'],['DHCP server','UDP/67'],['NTP','UDP/123'],['HTTPS over HTTP/1.1 or HTTP/2','TCP/443'],['SSH','TCP/22'],['SMTP server-to-server delivery','TCP/25']];
    const [service,answer]=pick(r,services);
    return one(`A packet-filter policy must permit ${service} on its standard port. Which transport and port matches?`,answer,
      shuffle(services.map(x=>x[1]).filter(x=>x!==answer),r).slice(0,3),`${service} uses ${answer} in the stated standard configuration. Check actual service configuration when ports have been customized; DNS also supports TCP.`);
  }),
  local(10027, 'Mobile VPN routing intent', 'Mobile VPN', 'Mobile VPN Routing Options, pp. 262–263', r => {
    const n=networks(r), full=pick(r,[true,false]);
    return one(`Remote staff must reach ${n.remote}. The requirement is that ${full?'all their Internet traffic also pass through the Firebox':'ordinary Internet traffic keep using their local Internet connection'}. Which routing design fits?`,full?'Full tunnel with suitable policies, routes, and outbound NAT.':'Split tunnel with the required corporate routes.',
      [full?'Split tunnel containing only the corporate subnet.':'Full tunnel for every destination.','No VPN routes at all.','Publish the internal server with an unrestricted public policy instead.'],full?'Full tunnel sends Internet-bound traffic through the VPN too. The Firebox needs policies and translation for that egress traffic.':'Split tunneling includes the corporate destinations while other traffic follows the client’s local route table. Validate DNS and overlapping subnet behavior.');
  }),
  local(10028, 'Mirror BOVPN selectors', 'BOVPN', 'BOVPN Configuration, pp. 281–289', r => {
    const n=integer(r,10,90), a=`10.${n}.0.0/24`, b=`10.${n+100}.0.0/24`;
    return one(`A policy-based BOVPN at Site A defines local ${a} and remote ${b}. There is no VPN NAT. What selector pair belongs at Site B?`,`Local ${b}; remote ${a}`,
      [`Local ${a}; remote ${b}`,`Local ${a}; remote ${a}`,`Local ${b}; remote ${b}`],`Each endpoint's local network is the other endpoint's remote network. Mirror the selectors; do not copy their directions unchanged.`);
  }),
  {id:10029,title:'Choose the management plane',topic:'WatchGuard Cloud',track:'cloud',section:'Management and visibility',build:r=>{
    const cloud=pick(r,[true,false]);
    return one(`A branch Firebox is ${cloud?'cloud-managed':'locally managed and added to WatchGuard Cloud for visibility'}. Where should its firewall policy configuration be managed?`,cloud?'In WatchGuard Cloud.':'In the supported local tools, such as Policy Manager or Fireware Web UI.',
      [cloud?'In Policy Manager as if it were locally managed.':'In Cloud solely because visibility was enabled.','In a DNS TXT record.','By editing Traffic Monitor history.'],`Configuration ownership depends on management mode. Cloud visibility for a locally managed device does not transfer ownership of its firewall configuration to Cloud.`);
  }},
  local(10030, 'Calculate a temporary block expiry', 'Security Services', 'Default Threat Protection, pp. 32–35', r => {
    const hour=integer(r,8,18), minute=integer(r,0,39), duration=pick(r,[10,20,30]), total=hour*60+minute+duration;
    const time=(v:number)=>`${String(Math.floor(v/60)).padStart(2,'0')}:${String(v%60).padStart(2,'0')}`;
    return one(`The configured temporary blocked-site duration is ${duration} minutes. A host is added at ${time(hour*60+minute)}. With no new trigger or administrative change, when should the temporary entry expire?`,time(total),
      [time(total+duration),time(total-1),time(total+1)],`Use the configured duration, not an assumed default: ${time(hour*60+minute)} + ${duration} minutes = ${time(total)}. A new event or manual change can alter the actual expiry.`);
  }),
  // -------------------------------------------------------------------------------------------
  // Diagram-driven templates, authored against topology contract v1 (./topology.ts). Each one
  // varies its addressing, VLAN identifiers or metrics per seed, so the diagram a learner reads
  // is the one the arithmetic in the stem refers to.
  // -------------------------------------------------------------------------------------------
  net(10051, 'Locate a host in a subnetted /24', 'IP Addressing', '1.7 IPv4 addressing', r => {
    const octet = integer(r, 16, 199), prefix = pick(r, [26, 27, 28]);
    const blockSize = 2 ** (32 - prefix), blocks = 256 / blockSize;
    const index = integer(r, 1, blocks - 2), base = `10.${octet}.7.${index * blockSize}`;
    const network = subnet(base, prefix), host = ip(network.network + integer(r, 1, blockSize - 2));
    const answer = `${ip(network.network)}/${prefix}`;
    return { ...one(`The distribution router splits 10.${octet}.7.0/24 into /${prefix} segments. Which segment contains the workstation ${host}?`, answer,
      [`${ip(network.network - blockSize)}/${prefix}`, `${ip(network.network + blockSize)}/${prefix}`, `10.${octet}.7.0/24`],
      `A /${prefix} steps in blocks of ${blockSize} addresses, so the boundaries are ${ip(network.network - blockSize)}, ${ip(network.network)} and ${ip(network.network + blockSize)}. ${host} falls inside ${answer}, whose usable range runs from ${ip(network.network + 1)} to ${ip(network.broadcast - 1)}. The /24 is the unsubnetted supernet, which would only be the answer if the router were not subnetting at all.`),
      type: 'topology', topology: diagram('Subnetted distribution LAN', 900, 460, [
        node('a', 'subnet', 'Segment A', 130, 90, { detail: `${ip(network.network - blockSize)}/${prefix}`, zone: 'trusted' }),
        node('b', 'subnet', 'Segment B', 130, 230, { detail: answer, zone: 'trusted' }),
        node('c', 'subnet', 'Segment C', 130, 370, { detail: `${ip(network.network + blockSize)}/${prefix}`, zone: 'trusted' }),
        node('rtr', 'router', 'Distribution', 450, 230, { detail: `10.${octet}.7.0/24 split into /${prefix}` }),
        node('host', 'client', 'Workstation', 770, 230, { detail: host, zone: 'trusted' }),
      ], [
        link('l1', 'a', 'rtr', { zone: 'trusted' }), link('l2', 'b', 'rtr', { zone: 'trusted' }),
        link('l3', 'c', 'rtr', { zone: 'trusted' }), link('l4', 'rtr', 'host', { zone: 'trusted', flow: true }),
      ]) };
  }),
  net(10052, 'Identify the tagged uplink', 'Switching & Wireless', '2.3 VLANs and switching', r => {
    const low = integer(r, 10, 90), high = low + integer(r, 5, 60);
    const answer = 'The switch-to-router uplink';
    return { ...one(`Hosts in VLAN ${low} and VLAN ${high} share one access switch, and the router provides inter-VLAN routing. Which link has to carry 802.1Q tags?`, answer,
      [`The access link to the VLAN ${low} host`, `The access link to the VLAN ${high} host`, 'Every link in the diagram'],
      `Only the uplink carries traffic for more than one VLAN, so only it needs tags to keep VLAN ${low} and VLAN ${high} apart. The host links are access ports carrying a single untagged VLAN each, because an ordinary workstation does not read tags: tagging them would break those hosts, and leaving the uplink untagged would merge both VLANs into whichever one the port is assigned.`),
      type: 'topology', topology: diagram('Two VLANs behind one uplink', 1070, 460, [
        node('h1', 'client', `Host VLAN ${low}`, 130, 90, { detail: `10.${low}.0.20`, zone: 'trusted' }),
        node('h2', 'client', `Host VLAN ${high}`, 130, 370, { detail: `10.${high}.0.20`, zone: 'trusted' }),
        node('sw', 'switch', 'Access switch', 400, 230, { zone: 'trusted' }),
        node('rtr', 'router', 'Router', 670, 230, { detail: 'inter-VLAN routing' }),
        node('net', 'cloud', 'Internet', 940, 230, { zone: 'external' }),
      ], [
        link('a1', 'h1', 'sw', { label: `access VLAN ${low}`, zone: 'trusted' }),
        link('a2', 'h2', 'sw', { label: `access VLAN ${high}`, zone: 'trusted' }),
        link('up', 'sw', 'rtr', { label: '802.1Q uplink', zone: 'trusted', flow: true }),
        link('wan', 'rtr', 'net', { zone: 'external' }),
      ], [
        { target: 'edge', targetId: 'up', answer },
        { target: 'edge', targetId: 'a1', answer: `The access link to the VLAN ${low} host` },
        { target: 'edge', targetId: 'a2', answer: `The access link to the VLAN ${high} host` },
      ]) };
  }),
  net(10053, 'Compare OSPF path costs', 'Routing', '2.2 Routing technologies', r => {
    const first = integer(r, 5, 40), second = integer(r, 5, 40);
    const viaR2 = first + second;
    // Keep the single-link path strictly different so exactly one option is lowest.
    const viaR3 = viaR2 + pick(r, [-1, 1]) * integer(r, 2, 18);
    const r2Wins = viaR2 < viaR3;
    const answer = r2Wins ? `Through R2, with a total cost of ${viaR2}` : `Through R3, with a total cost of ${viaR3}`;
    const other = r2Wins ? `Through R3, with a total cost of ${viaR3}` : `Through R2, with a total cost of ${viaR2}`;
    return { ...one(`OSPF on R1 has two paths to the target LAN: through R2 over links costing ${first} and ${second}, or through R3 over a single link costing ${viaR3}. Which path does R1 install?`, answer,
      [other, 'Through R3, because a single link is always preferred', 'Both paths, alternating packets between them'],
      `OSPF sums the cost of every link on a path and installs the lowest total: ${first} + ${second} = ${viaR2} against ${viaR3}, so the ${r2Wins ? 'two-hop path through R2' : 'single link through R3'} wins. Hop count is a RIP metric and never enters an OSPF decision, which is exactly why OSPF handles mixed link speeds better. Equal-cost paths are installed side by side, but only when the totals actually tie.`),
      type: 'topology', topology: diagram('Two paths, one metric', 1070, 460, [
        node('r1', 'router', 'R1', 130, 230, { detail: 'source' }),
        node('r2', 'router', 'R2', 400, 90, { detail: `cost ${first} + ${second}` }),
        node('r3', 'router', 'R3', 400, 370, { detail: `cost ${viaR3}` }),
        node('r4', 'router', 'R4', 670, 230, { detail: 'gateway' }),
        node('dest', 'subnet', 'Target LAN', 940, 230, { detail: '10.80.9.0/24', zone: 'trusted' }),
      ], [
        link('e1', 'r1', 'r2', { label: `cost ${first}` }), link('e2', 'r2', 'r4', { label: `cost ${second}` }),
        link('e3', 'r1', 'r3', { label: `cost ${viaR3}` }), link('e4', 'r3', 'r4', { label: 'cost 0' }),
        link('e5', 'r4', 'dest', { zone: 'trusted' }),
      ]) };
  }),
  local(10054, 'Find the missing return route', 'Routing', 'Static Routing; Routing Decisions Logic, pp. 90-91, 114-118', r => {
    const n = networks(r), optional = n.router.replace(/\.\d+$/, '.1');
    const clientNet = `${n.client.replace(/\.\d+$/, '.0')}/24`;
    const answer = `A route to ${clientNet} via ${optional}, added on the downstream router`;
    return { ...one(`The Firebox has a static route for ${n.remote} via ${n.router}, and a packet capture confirms requests from ${n.client} arrive at the server. Replies never come back. Which route is missing, and where?`, answer,
      [`A route to ${n.remote} via ${n.router}, added again on the Firebox`, `A default route configured on ${n.client}`, `A host route to ${n.server} added on the core switch`],
      `Forward delivery only proves half the path. The downstream router receives a packet sourced from ${clientNet}, a network it has no route to, so it sends the reply to its own default gateway instead of back through ${optional}. Adding the return route on that router completes the path. Repeating the forward route on the Firebox changes nothing, because that half already works.`),
      type: 'topology', topology: diagram('Asymmetric return path', 1070, 460, [
        node('client', 'client', 'Trusted client', 130, 230, { detail: n.client, zone: 'trusted' }),
        node('fw', 'firebox', 'Firebox', 400, 230, { detail: `Optional ${optional}` }),
        node('rtr', 'router', 'Downstream router', 670, 230, { detail: n.router, zone: 'optional' }),
        node('srv', 'server', 'Server', 940, 230, { detail: n.server, zone: 'optional' }),
        node('lan', 'subnet', 'Server LAN', 940, 370, { detail: n.remote, zone: 'optional' }),
      ], [
        link('e1', 'client', 'fw', { label: 'Eth1', zone: 'trusted', flow: true }),
        link('e2', 'fw', 'rtr', { label: 'Optional', zone: 'optional', flow: true }),
        link('e3', 'rtr', 'srv', { zone: 'optional', flow: true }),
        link('e4', 'rtr', 'lan', { zone: 'optional' }),
      ]) };
  }),
  local(10055, 'Write the inbound policy destination', 'NAT', 'Static NAT, pp. 126-127', r => {
    const n = networks(r), port = pick(r, [443, 8443, 993, 3389]);
    return { ...one(`An SNAT action maps ${n.publicIP}:${port} to the internal server ${n.server}:${port}. Which destination should the inbound policy that permits this traffic specify?`, n.server,
      [n.publicIP, 'The Any-External alias', n.gateway],
      `For an inbound connection the Firebox applies NAT before it looks for a matching policy, so by the time the lookup runs the packet is addressed to ${n.server}. A policy written to ${n.publicIP} never matches and the connection is denied as an unhandled packet. That ordering is the most common reason a correct-looking SNAT rule appears to do nothing at all.`),
      type: 'topology', topology: diagram('Inbound translation order', 900, 460, [
        node('client', 'client', 'Internet client', 130, 230, { detail: `to ${n.publicIP}:${port}`, zone: 'external' }),
        node('fw', 'firebox', 'Firebox', 450, 230, { detail: 'SNAT, then policy lookup' }),
        node('srv', 'server', 'Published server', 770, 230, { detail: `${n.server}:${port}`, zone: 'dmz' }),
      ], [
        link('e1', 'client', 'fw', { label: `dst ${n.publicIP}`, zone: 'external', flow: true }),
        link('e2', 'fw', 'srv', { label: `dst ${n.server}`, zone: 'dmz', flow: true }),
      ]) };
  }),
  local(10056, 'Choose an interface zone', 'Policies', 'Interfaces and Zones, pp. 71-74', r => {
    const n = integer(r, 10, 200), segment = `10.${n}.5.0/24`;
    const publicFacing = pick(r, [true, false]);
    const purpose = publicFacing ? 'a web server that Internet users must reach' : 'staff workstations that need no inbound access';
    const answer = publicFacing ? 'Optional' : 'Trusted';
    return { ...one(`A new segment ${segment} will host ${purpose}. Which zone should its Firebox interface use?`, answer,
      [publicFacing ? 'Trusted' : 'Optional', 'External', 'A tagged VLAN on the external interface'],
      publicFacing
        ? `An Optional interface keeps a publicly reachable host off the Trusted network, so a compromise of that server does not put it on the same segment as staff machines. It still needs an explicit policy plus static NAT to be reachable; the zone provides the separation, not the access. Trusted is the tempting answer because it also works technically, and that is the point: it works while removing the separation you wanted.`
        : `Trusted is the zone for internal hosts that make outbound connections and accept none from the Internet, and the default Outgoing policy already covers them. Optional would also function, but it is meant for hosts that need separation from the Trusted network, and using it here gains nothing while complicating internal access.`),
      type: 'topology', topology: diagram('Placing a new segment', 900, 460, [
        node('seg', 'subnet', 'New segment', 130, 230, { detail: segment, zone: publicFacing ? 'optional' : 'trusted' }),
        node('fw', 'firebox', 'Firebox', 450, 230, { detail: 'Eth1 / Eth2 / Eth0' }),
        node('lan', 'subnet', 'Existing LAN', 130, 90, { detail: `10.${n}.1.0/24`, zone: 'trusted' }),
        node('net', 'cloud', 'Internet', 770, 230, { zone: 'external' }),
      ], [
        link('e1', 'seg', 'fw', { label: 'new interface', zone: publicFacing ? 'optional' : 'trusted', flow: true }),
        link('e2', 'lan', 'fw', { label: 'Eth1 trusted', zone: 'trusted' }),
        link('e3', 'fw', 'net', { label: 'Eth0 external', zone: 'external' }),
      ]) };
  }),
];

/**
 * Log-analysis and policy-ordering scenarios are registered as ordinary
 * templates so they flow through the existing pool, filter, exam and
 * grading paths untouched.
 *
 * Each builder's title, topic and section are fixed properties of the
 * scenario rather than of the random draw, so probing once with a constant
 * seed is a safe way to read them without duplicating the metadata.
 */
const PROBE_SEED = 1;

logScenarioBuilders.forEach((build, index) => {
  const probe = build(seededRandom(PROBE_SEED));
  questionTemplates.push({
    id: 10101 + index,
    title: probe.title,
    topic: probe.topic,
    track: 'local',
    section: probe.section,
    build: r => {
      const spec = build(r);
      return {
        question: `Read the Traffic Monitor entry below. Why did the Firebox drop the connection from ${spec.subject}? (Select one.)`,
        options: [spec.cause, ...spec.distractors],
        correctAnswers: [spec.cause],
        explanation: `${spec.explanation}\n\nWhere to look in Fireware Web UI: ${spec.webUi}`,
        type: 'log',
        logMessage: spec.log,
      };
    },
  });
});

orderingScenarios.forEach((build, index) => {
  const probe = build(seededRandom(PROBE_SEED));
  questionTemplates.push({
    id: 10201 + index,
    title: probe.title,
    topic: probe.topic,
    track: 'local',
    section: probe.section,
    build: r => {
      const scenario = build(r);
      const order = scenario.order.map(policy => policy.label);
      return {
        question: `${scenario.brief}\n\nDrag the five policies into the correct top-to-bottom processing order so that every policy can be reached.`,
        options: order,
        correctAnswers: order,
        explanation: `Correct order:\n${order.map((label, position) => `${position + 1}. ${label}`).join('\n')}\n\n${scenario.explanation}\n\nWhere to look in Fireware Web UI: ${scenario.webUi}`,
        type: 'ordering',
        orderingDetails: Object.fromEntries(scenario.order.map(policy => [policy.label, policy.detail])),
      };
    },
  });
});

export function generateQuestion(variant: Variant): Question {
  if (variant.version !== 1 || !Number.isInteger(variant.seed) || variant.seed < 0 || variant.seed > 0xffffffff) throw new Error('Unsupported question variant');
  const template=questionTemplates.find(t=>t.id===variant.templateId);
  if (!template) throw new Error('Unknown template');
  const rng=seededRandom(variant.seed), scenario=template.build(rng);
  const question: Question={...scenario,id:template.id,topic:template.topic,track:template.track,
    difficulty:'applied',objective:template.section,firewareVersion:template.track==='local'?'12.9.2 study baseline':undefined,
    sources:[template.track==='local'?localSource(template.section):template.track==='cloud'?CLOUD_SOURCE:NETWORK_SOURCE],
    variant:{...variant}, options:shuffle(scenario.options,rng), correctAnswer:scenario.correctAnswers.join(' | '),
    isMultiSelect:scenario.correctAnswers.length>1, correctAnswersCount:scenario.correctAnswers.length};
  validateQuestion(question);
  return question;
}
