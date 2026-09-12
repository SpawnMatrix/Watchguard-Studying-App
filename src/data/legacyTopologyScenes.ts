import type { Question } from './questions';
import type { TopologyDiagramData } from '../engine/topology';

/**
 * Repairs for the four Phase 2 topology questions (201, 203, 205, 208).
 *
 * Each of them set `topologyImage` to a file under `/assets/` that was never added to the repo, so
 * `TopologyQuizzer` rendered the literal placeholder `[Topology Diagram: /assets/topology-1.svg]`
 * and the question was unanswerable from what the learner could see. Question 208 was the worst of
 * them: it asked the learner to "select the hotspot that represents the Edge Router" against three
 * unlabelled rectangles floating over a diagram that did not exist.
 *
 * These entries give each one a real diagram under topology contract v1 and, where the original
 * options only made sense next to a picture, replace them with options a hotspot can bind to. The
 * question ids are unchanged, so historical progress records still resolve.
 */
export interface LegacyTopologyScene {
  question?: string;
  options?: string[];
  answer?: string;
  explanation?: string;
  topic?: Question['topic'];
  topology: TopologyDiagramData;
}

export const legacyTopologyScenes: Record<number, LegacyTopologyScene> = {
  201: {
    question: 'Trusted clients must reach the 192.168.50.0/24 subnet, which sits behind the downstream router at 10.0.1.254. Select the device that needs a static route added.',
    options: ['Firebox', 'Downstream router', 'Core switch', 'Client workstation'],
    answer: 'Firebox',
    explanation: 'The Firebox has no interface on 192.168.50.0/24 and no route to it, so it sends that traffic to its default route and out to the Internet. A static route for 192.168.50.0/24 with next hop 10.0.1.254 - an address the Firebox can reach on its directly connected network - fixes the forward path. The downstream router already knows the subnet; what it may still need is a route back toward the client network, which is the second half of this problem.',
    topology: {
      version: 1, title: 'Route to a downstream subnet', width: 1070, height: 460,
      description: 'Illustrative links. Policy decisions are evaluated separately from this drawing.',
      nodes: [
        { id: 'client', kind: 'client', label: 'Trusted client', detail: '10.0.1.30', zone: 'trusted', x: 130, y: 230 },
        { id: 'sw', kind: 'switch', label: 'Core switch', zone: 'trusted', x: 400, y: 230 },
        { id: 'fw', kind: 'firebox', label: 'Firebox', detail: 'Eth1 10.0.1.1/24', x: 670, y: 90 },
        { id: 'rtr', kind: 'router', label: 'Downstream router', detail: '10.0.1.254', zone: 'trusted', x: 670, y: 370 },
        { id: 'far', kind: 'subnet', label: 'Remote subnet', detail: '192.168.50.0/24', zone: 'trusted', x: 940, y: 370 },
        { id: 'net', kind: 'cloud', label: 'Internet', zone: 'external', x: 940, y: 90 },
      ],
      edges: [
        { id: 'e1', from: 'client', to: 'sw', zone: 'trusted', flow: true },
        { id: 'e2', from: 'sw', to: 'fw', label: 'Eth1', zone: 'trusted' },
        { id: 'e3', from: 'sw', to: 'rtr', zone: 'trusted' },
        { id: 'e4', from: 'rtr', to: 'far', zone: 'trusted' },
        { id: 'e5', from: 'fw', to: 'net', label: 'Eth0 default route', zone: 'external' },
      ],
      hotspots: [
        { target: 'node', targetId: 'fw', answer: 'Firebox' },
        { target: 'node', targetId: 'rtr', answer: 'Downstream router' },
        { target: 'node', targetId: 'sw', answer: 'Core switch' },
        { target: 'node', targetId: 'client', answer: 'Client workstation' },
      ],
    },
  },
  203: {
    question: 'A branch office VPN runs between this site and a remote office. Select the link on which the traffic travelling between the two sites is already encrypted by the BOVPN.',
    options: [
      'The Firebox-to-Internet link',
      'The core switch-to-Firebox link',
      'The client-to-switch link',
      'The switch-to-file server link',
    ],
    answer: 'The Firebox-to-Internet link',
    explanation: 'The Firebox is the tunnel endpoint, so it encapsulates traffic on its way out and decrypts it on the way in. Everything on the LAN side of the Firebox - client to switch, switch to Firebox, switch to server - is ordinary cleartext traffic. That is the practical point: a BOVPN protects data between sites, not inside either one, so internal segmentation is still your job.',
    topology: {
      version: 1, title: 'Where BOVPN encryption begins', width: 1070, height: 460,
      nodes: [
        { id: 'client', kind: 'client', label: 'Branch client', detail: '10.30.0.25', zone: 'trusted', x: 130, y: 230 },
        { id: 'sw', kind: 'switch', label: 'Core switch', zone: 'trusted', x: 400, y: 230 },
        { id: 'srv', kind: 'server', label: 'File server', detail: '10.30.0.50', zone: 'trusted', x: 400, y: 370 },
        { id: 'fw', kind: 'firebox', label: 'Firebox', detail: 'BOVPN endpoint', x: 670, y: 230 },
        { id: 'net', kind: 'cloud', label: 'Internet', zone: 'external', x: 940, y: 90 },
        { id: 'remote', kind: 'cloud', label: 'Remote office', zone: 'vpn', x: 940, y: 370 },
      ],
      edges: [
        { id: 'c1', from: 'client', to: 'sw', label: 'cleartext', zone: 'trusted' },
        { id: 'c2', from: 'sw', to: 'srv', label: 'cleartext', zone: 'trusted' },
        { id: 'c3', from: 'sw', to: 'fw', label: 'Eth1 cleartext', zone: 'trusted' },
        { id: 'vpn', from: 'fw', to: 'net', label: 'Eth0 IPSec', kind: 'vpn', zone: 'vpn', flow: true },
        { id: 'far', from: 'net', to: 'remote', label: 'IPSec', kind: 'vpn', zone: 'vpn' },
      ],
      hotspots: [
        { target: 'edge', targetId: 'vpn', answer: 'The Firebox-to-Internet link' },
        { target: 'edge', targetId: 'c3', answer: 'The core switch-to-Firebox link' },
        { target: 'edge', targetId: 'c1', answer: 'The client-to-switch link' },
        { target: 'edge', targetId: 'c2', answer: 'The switch-to-file server link' },
      ],
    },
  },
  205: {
    topology: {
      version: 1, title: 'Internal client reaching a published address', width: 900, height: 460,
      description: 'Client A uses the public address of a server that sits behind the same Firebox.',
      nodes: [
        { id: 'a', kind: 'client', label: 'Client A', detail: '10.0.1.30 trusted', zone: 'trusted', x: 130, y: 90 },
        { id: 'fw', kind: 'firebox', label: 'Firebox', detail: 'SNAT 203.0.113.5', x: 450, y: 230 },
        { id: 'b', kind: 'server', label: 'Server B', detail: '10.0.2.80 optional', zone: 'optional', x: 770, y: 230 },
        { id: 'net', kind: 'cloud', label: 'Internet', zone: 'external', x: 130, y: 370 },
      ],
      edges: [
        { id: 'e1', from: 'a', to: 'fw', label: 'dst 203.0.113.5', zone: 'trusted', flow: true },
        { id: 'e2', from: 'fw', to: 'b', label: 'dst 10.0.2.80', zone: 'optional', flow: true },
        { id: 'e3', from: 'net', to: 'fw', label: 'Eth0 203.0.113.5', zone: 'external' },
      ],
    },
  },
  208: {
    question: 'Internet clients reach the web server at 203.0.113.80, and the Firebox static NAT rewrites that destination to 10.0.2.80. Select the device that receives the packet after the rewrite.',
    options: ['Web server', 'Firebox', 'Edge router', 'Core switch'],
    answer: 'Web server',
    topic: 'NAT',
    explanation: 'Static NAT rewrites the destination on the Firebox, so the packet leaves it addressed to 10.0.2.80 and the web server is the only device on this path that ever receives that form. The edge router and the Firebox both handle the packet while it still carries the public address. That ordering is why the server access log shows the private IP, and why the inbound policy has to be written to 10.0.2.80 rather than to 203.0.113.80. The core switch sits on the trusted side and is not on this path at all.',
    topology: {
      version: 1, title: 'Publishing a DMZ server', width: 1070, height: 460,
      nodes: [
        { id: 'net', kind: 'cloud', label: 'Internet', zone: 'external', x: 130, y: 230 },
        { id: 'rtr', kind: 'router', label: 'Edge router', detail: 'ISP handoff', zone: 'external', x: 400, y: 230 },
        { id: 'fw', kind: 'firebox', label: 'Firebox', detail: 'Eth0 203.0.113.80', x: 670, y: 230 },
        { id: 'sw', kind: 'switch', label: 'Core switch', zone: 'trusted', x: 670, y: 90 },
        { id: 'web', kind: 'server', label: 'Web server', detail: '10.0.2.80:443', zone: 'dmz', x: 940, y: 370 },
      ],
      edges: [
        { id: 'e1', from: 'net', to: 'rtr', zone: 'external', flow: true },
        { id: 'e2', from: 'rtr', to: 'fw', label: 'Eth0', zone: 'external', flow: true },
        { id: 'e3', from: 'fw', to: 'sw', label: 'Eth1 trusted', zone: 'trusted' },
        { id: 'e4', from: 'fw', to: 'web', label: 'Eth2 DMZ', zone: 'dmz', flow: true },
      ],
      hotspots: [
        { target: 'node', targetId: 'web', answer: 'Web server' },
        { target: 'node', targetId: 'fw', answer: 'Firebox' },
        { target: 'node', targetId: 'rtr', answer: 'Edge router' },
        { target: 'node', targetId: 'sw', answer: 'Core switch' },
      ],
    },
  },
};
