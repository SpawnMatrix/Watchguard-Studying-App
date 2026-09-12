import type { Question } from './questions';
import type { TopologyDiagramData, TopologyEdge, TopologyHotspot, TopologyNode } from '../engine/topology';
import { CLOUD_SOURCE, NETWORK_SOURCE, localSource, type Track } from '../engine/types';

/**
 * Diagram-driven questions, authored against topology contract v1
 * (`src/engine/topology.ts`, documented in `docs/visual-workstream.md`).
 *
 * The real WatchGuard exam puts a network diagram on screen and asks where something belongs -
 * which interface owns a subnet, which device terminates a tunnel, which link has to be a trunk.
 * The bank previously gestured at that with four questions pointing at SVG files that were never
 * added to `public/assets`, so they rendered as placeholder text. These carry their diagram as
 * structured data instead, so the renderer draws them and nothing depends on a missing asset.
 *
 * Layout uses the shared column and row constants below. The contract asks for at least 250 units
 * between node centers horizontally and 105/60 units of clearance around each node;
 * `topologyQuestions.test.ts` enforces that, along with unique ids, resolvable edge endpoints, and
 * hotspot answers that exactly match an option string.
 */

/** Column centers. Adjacent columns are >= 250 units apart, per the contract. */
const COL4 = [130, 400, 670, 940];
const COL3 = [130, 450, 770];
const COL2 = [130, 560];
/** Row centers. Adjacent rows are >= 120 units apart so the 60-unit clearance never overlaps. */
const ROW3 = [90, 230, 370];
const ROW2 = [120, 300];

const SIZE4 = { width: 1070, height: 460 };
const SIZE3 = { width: 900, height: 460 };
const SIZE2 = { width: 690, height: 420 };

interface TopoSpec {
  id: number;
  topic: Question['topic'];
  track: Track;
  objective: string;
  question: string;
  answer: string;
  wrong: string[];
  explanation: string;
  title: string;
  description?: string;
  size: { width: number; height: number };
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  /** Hotspot answers must be one of `answer` or `wrong`, so a click maps onto a real option. */
  hotspots?: TopologyHotspot[];
}

function topo(spec: TopoSpec): Question {
  const topology: TopologyDiagramData = {
    version: 1,
    title: spec.title,
    description: spec.description,
    width: spec.size.width,
    height: spec.size.height,
    nodes: spec.nodes,
    edges: spec.edges,
    hotspots: spec.hotspots,
  };
  return {
    id: spec.id,
    question: spec.question,
    options: [spec.answer, ...spec.wrong],
    correctAnswer: spec.answer,
    correctAnswers: [spec.answer],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: spec.topic,
    type: 'topology',
    topology,
    explanation: spec.explanation,
    track: spec.track,
    difficulty: 'applied',
    objective: spec.objective,
    firewareVersion: spec.track === 'local' ? '12.9.2 study baseline' : undefined,
    sources: [spec.track === 'local' ? localSource(spec.objective)
      : spec.track === 'cloud' ? CLOUD_SOURCE : NETWORK_SOURCE],
  };
}

const node = (
  id: string, kind: TopologyNode['kind'], label: string, x: number, y: number,
  extra: Partial<TopologyNode> = {},
): TopologyNode => ({ id, kind, label, x, y, ...extra });

const edge = (
  id: string, from: string, to: string, extra: Partial<TopologyEdge> = {},
): TopologyEdge => ({ id, from, to, ...extra });

const spot = (targetId: string, answer: string, target: TopologyHotspot['target'] = 'node'): TopologyHotspot =>
  ({ target, targetId, answer });

// ---------------------------------------------------------------------------------------------
// Locally-managed Firebox track
// ---------------------------------------------------------------------------------------------

const localScenarios: Question[] = [
  topo({
    id: 1600, topic: 'Policies', track: 'local',
    objective: 'Interfaces and Zones; Policy Precedence, pp. 71-74, 148-149',
    title: 'Three-zone perimeter',
    description: 'Illustrative links. Policy decisions are evaluated separately from this drawing.',
    size: SIZE3,
    question: 'The public web server sits on the Optional (DMZ) interface. A workstation on the Trusted LAN needs to reach it on TCP 443. With only the default policy set in place, what happens?',
    answer: 'The connection is denied, because no default policy allows Trusted to Optional traffic.',
    wrong: [
      'The connection is allowed, because the default Outgoing policy covers Trusted to Optional traffic.',
      'The connection is allowed, because both interfaces are behind the same Firebox.',
      'The connection is denied, because Optional interfaces cannot accept any inbound traffic.',
    ],
    explanation: 'The default Outgoing policy allows Any-Trusted and Any-Optional to reach Any-External only. Traffic between the Trusted and Optional zones is not covered by it, so it hits the implicit deny and is logged as an unhandled packet. Add a policy scoped to that source, destination and port. The tempting distractor is the last one: an Optional interface accepts inbound traffic perfectly well once a policy permits it - what it lacks is a default policy doing so.',
    nodes: [
      node('lan', 'subnet', 'Trusted LAN', COL3[0], ROW3[0], { detail: '10.0.1.0/24', zone: 'trusted' }),
      node('dmz', 'subnet', 'Optional DMZ', COL3[0], ROW3[2], { detail: '10.0.2.0/24', zone: 'optional' }),
      node('fw', 'firebox', 'Firebox', COL3[1], ROW3[1], { detail: 'Eth1 / Eth2 / Eth0' }),
      node('web', 'server', 'Web server', COL3[2], ROW3[2], { detail: '10.0.2.80:443', zone: 'optional' }),
      node('net', 'cloud', 'Internet', COL3[2], ROW3[0], { zone: 'external' }),
    ],
    edges: [
      edge('e1', 'lan', 'fw', { label: 'Eth1 trusted', zone: 'trusted' }),
      edge('e2', 'dmz', 'fw', { label: 'Eth2 optional', zone: 'optional' }),
      edge('e3', 'fw', 'net', { label: 'Eth0 external', zone: 'external' }),
      edge('e4', 'dmz', 'web', { zone: 'optional' }),
    ],
  }),
  topo({
    id: 1601, topic: 'NAT', track: 'local', objective: '1-to-1 NAT, pp. 128-129',
    title: 'Published mail server',
    size: SIZE3,
    question: 'A 1-to-1 NAT rule maps 10.0.2.25 to 198.51.100.25. The mail server at 10.0.2.25 opens an outbound SMTP connection to a partner on the Internet. Which source address does the partner see?',
    answer: '198.51.100.25, the public address mapped to that host by the 1-to-1 NAT rule',
    wrong: [
      '203.0.113.1, the primary address of the external interface',
      '10.0.2.25, because a 1-to-1 NAT rule only ever translates inbound connections',
      'A port-translated address drawn from the dynamic NAT pool',
    ],
    explanation: '1-to-1 NAT is bidirectional: the mapped host is reached at 198.51.100.25 from outside, and it also leaves as 198.51.100.25. That consistency is the reason to use it for a mail server, since receiving mail systems check that the sending address matches the published records. Static NAT, by contrast, is the inbound-only variant, and dynamic NAT would give this host the external interface address instead.',
    nodes: [
      node('mail', 'server', 'Mail server', COL3[0], ROW3[1], { detail: '10.0.2.25', zone: 'optional' }),
      node('fw', 'firebox', 'Firebox', COL3[1], ROW3[1], { detail: '1-to-1 NAT' }),
      node('net', 'cloud', 'Internet', COL3[2], ROW3[0], { zone: 'external' }),
      node('peer', 'server', 'Partner MTA', COL3[2], ROW3[2], { detail: 'TCP 25', zone: 'external' }),
    ],
    edges: [
      edge('e1', 'mail', 'fw', { label: 'Eth2 optional', zone: 'optional', flow: true }),
      edge('e2', 'fw', 'net', { label: 'Eth0 203.0.113.1', zone: 'external', flow: true }),
      edge('e3', 'net', 'peer', { zone: 'external' }),
    ],
  }),
  topo({
    id: 1602, topic: 'NAT', track: 'local', objective: 'Static NAT, pp. 126-127',
    title: 'Inbound SNAT path',
    size: SIZE3,
    question: 'An SNAT action maps 203.0.113.80:443 to the internal server 10.0.2.80:443. When you write the policy that permits this inbound traffic, which destination should it use?',
    answer: 'The private address 10.0.2.80, because NAT is applied before the policy lookup for inbound traffic',
    wrong: [
      'The public address 203.0.113.80, because that is the address the external client actually targets',
      'The external interface alias Any-External, so any published address matches',
      'Either address, because the Firebox resolves the SNAT mapping in both directions',
    ],
    explanation: 'For an inbound connection the Firebox rewrites the destination first and then looks for a policy, so by the time the policy lookup runs the packet is already addressed to 10.0.2.80. A policy written to the public address never matches and the traffic is denied as unhandled. That ordering is the single most common reason a correct-looking SNAT rule appears to do nothing.',
    nodes: [
      node('client', 'client', 'Internet client', COL3[0], ROW3[1], { detail: 'to 203.0.113.80:443', zone: 'external' }),
      node('fw', 'firebox', 'Firebox', COL3[1], ROW3[1], { detail: 'SNAT then policy' }),
      node('web', 'server', 'Web server', COL3[2], ROW3[1], { detail: '10.0.2.80:443', zone: 'optional' }),
    ],
    edges: [
      edge('e1', 'client', 'fw', { label: 'dst 203.0.113.80', zone: 'external', flow: true }),
      edge('e2', 'fw', 'web', { label: 'dst 10.0.2.80', zone: 'optional', flow: true }),
    ],
  }),
  topo({
    id: 1603, topic: 'BOVPN', track: 'local', objective: 'BOVPN Configuration, pp. 281-289',
    title: 'Two-site BOVPN selectors',
    size: SIZE4,
    question: 'Site A defines its policy-based BOVPN tunnel route as local 10.10.0.0/24, remote 10.20.0.0/24. No VPN NAT is configured. What must Site B define?',
    answer: 'Local 10.20.0.0/24, remote 10.10.0.0/24',
    wrong: [
      'Local 10.10.0.0/24, remote 10.20.0.0/24 as well',
      'Local 10.10.0.0/24, remote 10.10.0.0/24',
      'Local 10.20.0.0/24, remote 10.20.0.0/24',
    ],
    explanation: 'Tunnel routes are written from the perspective of the device they sit on, so each endpoint mirrors the other: what Site A calls remote, Site B calls local. Copying Site A settings unchanged is the classic mistake - Phase 1 comes up, and then Phase 2 fails because the proposed selectors do not correspond.',
    nodes: [
      node('lana', 'subnet', 'Site A LAN', COL4[0], ROW3[1], { detail: '10.10.0.0/24', zone: 'trusted' }),
      node('fwa', 'firebox', 'Firebox A', COL4[1], ROW3[1], { detail: '203.0.113.10' }),
      node('fwb', 'firebox', 'Firebox B', COL4[2], ROW3[1], { detail: '198.51.100.20' }),
      node('lanb', 'subnet', 'Site B LAN', COL4[3], ROW3[1], { detail: '10.20.0.0/24', zone: 'trusted' }),
    ],
    edges: [
      edge('e1', 'lana', 'fwa', { label: 'Eth1', zone: 'trusted' }),
      edge('e2', 'fwa', 'fwb', { label: 'IPSec BOVPN', kind: 'vpn', zone: 'vpn', flow: true }),
      edge('e3', 'fwb', 'lanb', { label: 'Eth1', zone: 'trusted' }),
    ],
  }),
  topo({
    id: 1604, topic: 'BOVPN', track: 'local', objective: 'VPN Negotiations, pp. 277-280',
    title: 'Tunnel endpoint behind an edge router',
    size: SIZE4,
    question: 'An ISP-owned edge router sits in front of the Firebox. Click or select the device that must be configured as the local BOVPN gateway endpoint.',
    answer: 'Firebox',
    wrong: ['Edge router', 'Core switch', 'File server'],
    explanation: 'The Firebox terminates the IPSec tunnel, so it is the local gateway endpoint even though the edge router owns the physical link to the ISP. The router only needs to forward UDP 500, UDP 4500 and ESP to the Firebox - a detail worth remembering, because a router that quietly blocks ESP produces a Phase 1 that never completes.',
    nodes: [
      node('lan', 'subnet', 'Trusted LAN', COL4[0], ROW3[1], { detail: '10.30.0.0/24', zone: 'trusted' }),
      node('sw', 'switch', 'Core switch', COL4[1], ROW3[1], { zone: 'trusted' }),
      node('fw', 'firebox', 'Firebox', COL4[2], ROW3[1], { detail: 'Eth0 203.0.113.30' }),
      node('rtr', 'router', 'Edge router', COL4[3], ROW3[1], { detail: 'ISP handoff', zone: 'external' }),
      node('srv', 'server', 'File server', COL4[1], ROW3[0], { detail: '10.30.0.50', zone: 'trusted' }),
      node('peer', 'cloud', 'Remote site', COL4[3], ROW3[2], { zone: 'vpn' }),
    ],
    edges: [
      edge('e1', 'lan', 'sw', { zone: 'trusted' }),
      edge('e2', 'sw', 'srv', { zone: 'trusted' }),
      edge('e3', 'sw', 'fw', { label: 'Eth1', zone: 'trusted' }),
      edge('e4', 'fw', 'rtr', { label: 'Eth0', zone: 'external' }),
      edge('e5', 'fw', 'peer', { label: 'IPSec BOVPN', kind: 'vpn', zone: 'vpn', flow: true }),
    ],
    hotspots: [spot('fw', 'Firebox'), spot('rtr', 'Edge router'), spot('sw', 'Core switch'), spot('srv', 'File server')],
  }),
  topo({
    id: 1605, topic: 'Routing', track: 'local', objective: 'Multi-WAN; Link Monitor, pp. 110-113',
    title: 'Dual-ISP failover',
    size: SIZE3,
    question: 'Both external interfaces are configured for Multi-WAN failover with Eth0 as primary. Link Monitor stops receiving responses on Eth0. What happens to a user session already running over Eth0?',
    answer: 'It breaks, and the client must reconnect over Eth3; only new connections use the surviving link.',
    wrong: [
      'It continues uninterrupted, because the Firebox moves the existing session to Eth3.',
      'It continues uninterrupted, because the source address does not change at any point during failover.',
      'It is queued until Eth0 recovers, then resumes where it stopped.',
    ],
    explanation: 'Failover redirects new connections to the surviving interface. Existing sessions cannot survive it, because their NAT state and source address belong to the failed interface and the far end has no way to accept the change. Multi-WAN protects continuity of service, not individual sessions - which is why a failover still looks like a brief outage to users.',
    nodes: [
      node('lan', 'subnet', 'Trusted LAN', COL3[0], ROW3[1], { detail: '10.40.0.0/24', zone: 'trusted' }),
      node('fw', 'firebox', 'Firebox', COL3[1], ROW3[1], { detail: 'Multi-WAN failover' }),
      node('isp1', 'cloud', 'ISP A', COL3[2], ROW3[0], { detail: 'Eth0 primary', zone: 'external' }),
      node('isp2', 'cloud', 'ISP B', COL3[2], ROW3[2], { detail: 'Eth3 backup', zone: 'external' }),
    ],
    edges: [
      edge('e1', 'lan', 'fw', { label: 'Eth1', zone: 'trusted' }),
      edge('e2', 'fw', 'isp1', { label: 'Eth0', zone: 'external', flow: true }),
      edge('e3', 'fw', 'isp2', { label: 'Eth3', zone: 'external' }),
    ],
  }),
  topo({
    id: 1606, topic: 'Routing', track: 'local', objective: 'Secondary Networks; VLANs, pp. 78-89',
    title: 'Two subnets on one interface',
    size: SIZE3,
    question: 'Eth1 carries 10.50.1.0/24. During a renumbering project, hosts on 10.50.9.0/24 must also use Eth1 as their gateway, on the same untagged broadcast domain. Which configuration fits?',
    answer: 'Add 10.50.9.1/24 as a secondary network on Eth1',
    wrong: [
      'Create a tagged VLAN interface for 10.50.9.0/24 on Eth1',
      'Add a static route for 10.50.9.0/24 pointing at Eth1',
      'Configure a second DHCP scope for 10.50.9.0/24 on Eth1',
    ],
    explanation: 'A secondary network gives the interface an additional address on the same physical segment, which is exactly what a renumbering window needs: both subnets work at once and hosts move over as they renew. The strongest distractor is the VLAN option - it would also give you two subnets, but it puts them in separate tagged broadcast domains, and the stem says the hosts share one untagged segment. A static route pointing at a directly connected interface adds nothing, and a DHCP scope hands out addresses without giving the interface one.',
    nodes: [
      node('a', 'subnet', 'Existing subnet', COL3[0], ROW3[0], { detail: '10.50.1.0/24', zone: 'trusted' }),
      node('b', 'subnet', 'New subnet', COL3[0], ROW3[2], { detail: '10.50.9.0/24', zone: 'trusted' }),
      node('sw', 'switch', 'Access switch', COL3[1], ROW3[1], { detail: 'one untagged segment', zone: 'trusted' }),
      node('fw', 'firebox', 'Firebox', COL3[2], ROW3[1], { detail: 'Eth1 10.50.1.1/24' }),
    ],
    edges: [
      edge('e1', 'a', 'sw', { zone: 'trusted' }),
      edge('e2', 'b', 'sw', { zone: 'trusted' }),
      edge('e3', 'sw', 'fw', { label: 'Eth1 untagged', zone: 'trusted' }),
    ],
  }),
  topo({
    id: 1607, topic: 'Mobile VPN', track: 'local', objective: 'Mobile VPN Routing Options, pp. 262-263',
    title: 'Remote worker address overlap',
    size: SIZE4,
    question: 'A remote user connects with Mobile VPN with SSL and the tunnel establishes, but nothing on the corporate LAN responds. Their home network is 192.168.113.0/24. What should you change?',
    answer: 'The virtual IP pool, which still uses the default 192.168.113.0/24 and overlaps the home network',
    wrong: [
      'The Phase 2 proposal, so it matches the client settings',
      'The authentication server, from Firebox-DB to Active Directory',
      'The client default gateway, so that it points at the external address of the Firebox instead',
    ],
    explanation: 'The client resolves 192.168.113.x to its own local network, so traffic for the corporate side never enters the tunnel - a tunnel that is up but carries nothing. Change the virtual IP pool to a range no user site is likely to have, which is the main reason to move off the 192.168.113.0/24 default. Phase 2 proposals belong to IPSec rather than SSL, and an authentication problem would have stopped the connection instead of allowing it.',
    nodes: [
      node('home', 'subnet', 'Home network', COL4[0], ROW3[1], { detail: '192.168.113.0/24', zone: 'external' }),
      node('user', 'client', 'Remote laptop', COL4[1], ROW3[1], { detail: 'VPN IP 192.168.113.4', zone: 'vpn' }),
      node('fw', 'firebox', 'Firebox', COL4[2], ROW3[1], { detail: 'SSL VPN pool' }),
      node('lan', 'subnet', 'Corporate LAN', COL4[3], ROW3[1], { detail: '10.60.0.0/24', zone: 'trusted' }),
    ],
    edges: [
      edge('e1', 'home', 'user', { zone: 'external' }),
      edge('e2', 'user', 'fw', { label: 'SSL VPN TCP 443', kind: 'vpn', zone: 'vpn', flow: true }),
      edge('e3', 'fw', 'lan', { label: 'Eth1', zone: 'trusted' }),
    ],
  }),
  topo({
    id: 1608, topic: 'Proxies', track: 'local', objective: 'HTTPS-proxy Policies, pp. 209-217',
    title: 'Where inspection happens',
    size: SIZE3,
    question: 'Clients reach an external HTTPS site through an HTTPS-proxy with content inspection enabled. Which certificate must the client trust for the session to complete without a warning?',
    answer: 'The Firebox Proxy Authority certificate, which signs the connection presented to the client',
    wrong: [
      'The external site certificate, which the Firebox simply forwards on to the client unchanged',
      'The Firebox Web UI management certificate on TCP 8080',
      'The certificate of the WebBlocker cloud lookup service',
    ],
    explanation: 'Content inspection splits the session in two: the Firebox holds a TLS connection to the site and builds a second one to the client, signing it with its Proxy Authority certificate. The client therefore validates that certificate, not the original - which is why deploying the Proxy Authority into the client trust store is a prerequisite rather than an optional step. The management certificate secures administration and is unrelated to the path traffic takes.',
    nodes: [
      node('client', 'client', 'Trusted client', COL3[0], ROW3[1], { detail: 'browser trust store', zone: 'trusted' }),
      node('fw', 'firebox', 'Firebox', COL3[1], ROW3[1], { detail: 'HTTPS-proxy inspection' }),
      node('site', 'server', 'External site', COL3[2], ROW3[1], { detail: 'TLS 443', zone: 'external' }),
    ],
    edges: [
      edge('e1', 'client', 'fw', { label: 'TLS signed by Firebox', zone: 'trusted', flow: true }),
      edge('e2', 'fw', 'site', { label: 'TLS to the site', zone: 'external', flow: true }),
    ],
  }),
  topo({
    id: 1609, topic: 'Logging & Monitoring', track: 'local', objective: 'Traffic Monitor, pp. 60-61',
    title: 'Reading a denied path',
    size: SIZE4,
    question: 'A client cannot reach the application server, and Traffic Monitor logs the attempt as Allow. Which conclusion does that log entry support?',
    answer: 'The Firebox permitted the traffic, so the failure is somewhere past the policy decision.',
    wrong: [
      'The application transaction completed successfully.',
      'The server replied and the client successfully received the complete response.',
      'The policy is misconfigured and should be rewritten.',
    ],
    explanation: 'An Allow entry records one thing: the firewall permitted the connection. It says nothing about whether the server was listening, whether TLS negotiated, or whether the application returned an error - so the next step is to test from the client and look at the server, not to rewrite a policy that is already doing what it should.',
    nodes: [
      node('client', 'client', 'Client', COL4[0], ROW3[1], { detail: '10.70.1.25', zone: 'trusted' }),
      node('fw', 'firebox', 'Firebox', COL4[1], ROW3[1], { detail: 'Allow logged' }),
      node('sw', 'switch', 'Server switch', COL4[2], ROW3[1], { zone: 'optional' }),
      node('app', 'server', 'App server', COL4[3], ROW3[1], { detail: '10.70.2.40:8443', zone: 'optional' }),
    ],
    edges: [
      edge('e1', 'client', 'fw', { label: 'Eth1', zone: 'trusted', flow: true }),
      edge('e2', 'fw', 'sw', { label: 'Eth2', zone: 'optional', flow: true }),
      edge('e3', 'sw', 'app', { zone: 'optional' }),
    ],
  }),
];

// ---------------------------------------------------------------------------------------------
// Network+ track
// ---------------------------------------------------------------------------------------------

const networkScenarios: Question[] = [
  topo({
    id: 1610, topic: 'IP Addressing', track: 'network-plus', objective: '1.7 IPv4 addressing',
    title: 'Which subnet holds the host',
    size: SIZE3,
    question: 'Using the addressing in the diagram, which subnet contains the host 172.16.4.200?',
    answer: '172.16.4.192/26',
    wrong: ['172.16.4.128/26', '172.16.4.0/24', '172.16.4.224/27'],
    explanation: 'A /26 steps in blocks of 64, so the boundaries are .0, .64, .128 and .192. The address .200 falls in the last block, 172.16.4.192/26, whose usable range is .193 through .254. The /27 distractor starts at .224, which is above .200, and the /24 would be right only if the network were not subnetted at all.',
    nodes: [
      node('a', 'subnet', 'Engineering', COL3[0], ROW3[0], { detail: '172.16.4.128/26', zone: 'trusted' }),
      node('b', 'subnet', 'Operations', COL3[0], ROW3[2], { detail: '172.16.4.192/26', zone: 'trusted' }),
      node('rtr', 'router', 'Distribution', COL3[1], ROW3[1], { detail: 'router on a stick' }),
      node('host', 'client', 'Workstation', COL3[2], ROW3[1], { detail: '172.16.4.200', zone: 'trusted' }),
    ],
    edges: [
      edge('e1', 'a', 'rtr', { label: 'VLAN 40', zone: 'trusted' }),
      edge('e2', 'b', 'rtr', { label: 'VLAN 50', zone: 'trusted' }),
      edge('e3', 'b', 'host', { zone: 'trusted' }),
    ],
  }),
  topo({
    id: 1611, topic: 'Switching & Wireless', track: 'network-plus', objective: '2.3 VLANs and switching',
    title: 'Trunk or access',
    size: SIZE4,
    question: 'VLANs 10 and 20 both have hosts on the access switch, and the router provides inter-VLAN routing. Which link must carry 802.1Q tags?',
    answer: 'The switch-to-router uplink',
    wrong: [
      'Each switch-to-host link',
      'Every link in the diagram',
      'None of them, because the router separates the VLANs',
    ],
    explanation: 'Only the uplink carries traffic for more than one VLAN, so only it needs tagging to keep the two apart. Host links are access ports: one untagged VLAN each, because an ordinary workstation has no idea what a tag is. Tagging the host links would break them, and leaving the uplink untagged would collapse both VLANs into whichever one the port is assigned.',
    nodes: [
      node('h1', 'client', 'Host VLAN 10', COL4[0], ROW3[0], { detail: '10.10.10.20', zone: 'trusted' }),
      node('h2', 'client', 'Host VLAN 20', COL4[0], ROW3[2], { detail: '10.10.20.20', zone: 'trusted' }),
      node('sw', 'switch', 'Access switch', COL4[1], ROW3[1], { zone: 'trusted' }),
      node('rtr', 'router', 'Router', COL4[2], ROW3[1], { detail: 'inter-VLAN routing' }),
      node('net', 'cloud', 'Internet', COL4[3], ROW3[1], { zone: 'external' }),
    ],
    edges: [
      edge('a1', 'h1', 'sw', { label: 'access VLAN 10', zone: 'trusted' }),
      edge('a2', 'h2', 'sw', { label: 'access VLAN 20', zone: 'trusted' }),
      edge('up', 'sw', 'rtr', { label: '802.1Q uplink', zone: 'trusted', flow: true }),
      edge('wan', 'rtr', 'net', { zone: 'external' }),
    ],
    hotspots: [spot('up', 'The switch-to-router uplink', 'edge'), spot('a1', 'Each switch-to-host link', 'edge')],
  }),
  topo({
    id: 1612, topic: 'Routing', track: 'network-plus', objective: '2.2 Routing technologies',
    title: 'OSPF cost comparison',
    size: SIZE4,
    question: 'OSPF has two paths from R1 to the 10.80.9.0/24 network: through R2 with costs 10 and 10, or through R3 with a single link of cost 30. Which path does R1 install?',
    answer: 'The path through R2, with a total cost of 20',
    wrong: [
      'The path through R3, because it has fewer hops',
      'The path through R3, because a single link is always preferred',
      'Both paths, alternating packets between them',
    ],
    explanation: 'OSPF adds the cost of every link along a path and picks the lowest total: 10 + 10 = 20 beats 30, so the two-hop path through R2 wins. Hop count never enters into it - that is RIP metric - and this is exactly the case OSPF handles better, since a pair of fast links can beat one slow one. OSPF does install equal-cost paths side by side, but only when the totals actually tie.',
    nodes: [
      node('r1', 'router', 'R1', COL4[0], ROW3[1], { detail: 'source' }),
      node('r2', 'router', 'R2', COL4[1], ROW3[0], { detail: 'cost 10 + 10' }),
      node('r3', 'router', 'R3', COL4[1], ROW3[2], { detail: 'cost 30' }),
      node('r4', 'router', 'R4', COL4[2], ROW3[1], { detail: 'gateway' }),
      node('dest', 'subnet', 'Target LAN', COL4[3], ROW3[1], { detail: '10.80.9.0/24', zone: 'trusted' }),
    ],
    edges: [
      edge('e1', 'r1', 'r2', { label: 'cost 10' }),
      edge('e2', 'r2', 'r4', { label: 'cost 10' }),
      edge('e3', 'r1', 'r3', { label: 'cost 30' }),
      edge('e4', 'r3', 'r4', { label: 'cost 0' }),
      edge('e5', 'r4', 'dest', { zone: 'trusted' }),
    ],
  }),
  topo({
    id: 1613, topic: 'Network Services', track: 'network-plus', objective: '3.4 IPv4 network services',
    title: 'DHCP across a router',
    size: SIZE4,
    question: 'Hosts in VLAN 60 get no address, while VLAN 50 hosts on the same switch lease normally from the server at 10.90.50.10. What does VLAN 60 need?',
    answer: 'A DHCP relay on the VLAN 60 gateway, pointing at 10.90.50.10',
    wrong: [
      'A default gateway configured on each VLAN 60 host before it requests an address',
      'A static route on the DHCP server back to VLAN 60',
      'A longer DHCP lease time on the existing scope',
    ],
    explanation: 'A DHCP Discover is a broadcast, and routers do not forward broadcasts, so a client on a subnet without a local server is only reachable through a relay. The relay forwards the request as unicast and stamps it with the client subnet so the server picks the right scope. The gateway distractor inverts the order of events: a host has no address yet, so it cannot use a gateway. A return route matters for the reply but does nothing about the request never arriving.',
    nodes: [
      node('v50', 'subnet', 'VLAN 50', COL4[0], ROW3[0], { detail: '10.90.50.0/24', zone: 'trusted' }),
      node('v60', 'subnet', 'VLAN 60', COL4[0], ROW3[2], { detail: '10.90.60.0/24', zone: 'trusted' }),
      node('sw', 'switch', 'Access switch', COL4[1], ROW3[1], { zone: 'trusted' }),
      node('rtr', 'router', 'L3 gateway', COL4[2], ROW3[1], { detail: 'routes both VLANs' }),
      node('dhcp', 'server', 'DHCP server', COL4[3], ROW3[0], { detail: '10.90.50.10', zone: 'trusted' }),
    ],
    edges: [
      edge('e1', 'v50', 'sw', { label: 'access VLAN 50', zone: 'trusted' }),
      edge('e2', 'v60', 'sw', { label: 'access VLAN 60', zone: 'trusted' }),
      edge('e3', 'sw', 'rtr', { label: '802.1Q uplink', zone: 'trusted' }),
      edge('e4', 'rtr', 'dhcp', { zone: 'trusted' }),
    ],
  }),
  topo({
    id: 1614, topic: 'Troubleshooting', track: 'network-plus', objective: '5.2 Troubleshoot general networking issues',
    title: 'Local works, remote does not',
    size: SIZE4,
    question: 'A workstation at 10.100.1.40/24 reaches other hosts on its own subnet but nothing beyond it. Its configured gateway is 10.100.2.1. What is wrong?',
    answer: 'The gateway address is outside the workstation own subnet, so it cannot be reached',
    wrong: [
      'The subnet mask is too small for the number of hosts on the segment',
      'The switch uplink port has been configured as an access port rather than as a trunk',
      'DNS is unreachable, so no destination outside the subnet resolves',
    ],
    explanation: 'With a /24 the host can only speak directly to 10.100.1.0 through 10.100.1.255, and 10.100.2.1 is not in that range, so every off-subnet packet is dropped before it reaches a router. Local traffic still works because it never needs a gateway - which is precisely the pattern that identifies this fault. A DNS problem would break name lookups while connections by IP address still succeeded.',
    nodes: [
      node('host', 'client', 'Workstation', COL4[0], ROW3[1], { detail: '10.100.1.40/24', zone: 'trusted' }),
      node('peer', 'client', 'Local peer', COL4[0], ROW3[0], { detail: '10.100.1.55', zone: 'trusted' }),
      node('sw', 'switch', 'Access switch', COL4[1], ROW3[1], { zone: 'trusted' }),
      node('rtr', 'router', 'Real gateway', COL4[2], ROW3[1], { detail: '10.100.1.1' }),
      node('net', 'cloud', 'Internet', COL4[3], ROW3[1], { zone: 'external' }),
    ],
    edges: [
      edge('e1', 'host', 'sw', { zone: 'trusted', flow: true }),
      edge('e2', 'peer', 'sw', { zone: 'trusted' }),
      edge('e3', 'sw', 'rtr', { label: 'uplink', zone: 'trusted' }),
      edge('e4', 'rtr', 'net', { zone: 'external' }),
    ],
  }),
  topo({
    id: 1615, topic: 'IP Addressing', track: 'network-plus', objective: '1.7 IPv4 addressing',
    title: 'Sizing a branch subnet',
    size: SIZE2,
    question: 'The branch in the diagram needs 58 usable addresses, including its gateway, and the design calls for the smallest subnet that fits. Which prefix should you assign?',
    answer: '/26',
    wrong: ['/27', '/25', '/24'],
    explanation: 'A /26 leaves 6 host bits: 64 addresses, minus the network and broadcast addresses, gives 62 usable - enough for 58 with a little room. A /27 provides only 30, so it does not fit, and a /25 provides 126, which fits but is not the smallest. The gateway counts as one of the usable addresses, so include it in the requirement rather than adding it afterwards.',
    nodes: [
      node('branch', 'subnet', 'Branch LAN', COL2[0], ROW2[0], { detail: '58 usable needed', zone: 'trusted' }),
      node('rtr', 'router', 'Branch router', COL2[1], ROW2[0], { detail: 'gateway counts as a host' }),
      node('wan', 'cloud', 'WAN', COL2[1], ROW2[1], { zone: 'external' }),
    ],
    edges: [
      edge('e1', 'branch', 'rtr', { zone: 'trusted' }),
      edge('e2', 'rtr', 'wan', { zone: 'external' }),
    ],
  }),
];

export const topologyQuestions: Question[] = [...localScenarios, ...networkScenarios];
