/**
 * "Explain Like I'm an L1" breakdowns.
 *
 * Triggered on an incorrect answer. The goal is not to restate the correct
 * option — the learner can already see it — but to give the four things a
 * junior technician actually needs before the next ticket:
 *
 *   1. the idea in plain language, with no product vocabulary
 *   2. the underlying Network+ concept, so it transfers
 *   3. where the setting lives in Fireware Web UI, by menu path
 *   4. what to check first on a real device
 *
 * This is deliberately rule-based rather than model-generated: the portal's
 * default mode is fully offline, and a beginner is the worst possible
 * audience for a confidently wrong explanation.
 */
import type { Question } from '../data/questions';

export interface L1Breakdown {
  plainLanguage: string;
  networkPlus: string;
  webUiPath: string;
  checkFirst: string;
}

interface TopicGuide {
  plainLanguage: string;
  networkPlus: string;
  webUiPath: string;
  checkFirst: string;
}

/**
 * One guide per topic in the question bank. Menu paths follow Fireware Web
 * UI as shipped in the 12.x releases the study guide covers; the portal
 * reminds the learner to confirm against their own Fireware version.
 */
const GUIDES: Record<string, TopicGuide> = {
  'Policies': {
    plainLanguage:
      'A policy is a rule that says "traffic that looks like this is allowed (or denied)". The Firebox reads its rules from the top down and stops at the first one that fits. Everything it never finds a rule for is dropped at the end — that final drop is not a rule you can see in the list.',
    networkPlus:
      'This is access control list (ACL) processing. Network+ covers it as first-match-wins rule evaluation with an implicit deny at the end — the same model as a router ACL or a cloud security group.',
    webUiPath: 'Firewall → Firewall Policies. Set Manual Order to control the sequence yourself.',
    checkFirst:
      'Read the policy name in the Traffic Monitor log. If it says "Unhandled Internal Packet", no rule matched and you need to add one. If it names a real policy, that policy matched and you need to change or reorder it.',
  },
  'Proxies': {
    plainLanguage:
      'A packet filter only checks the envelope — addresses and port numbers. A proxy opens the envelope and reads what is inside, so it can block a file type or a URL that a packet filter would happily pass. That extra inspection is configured in a proxy action, which is separate from the policy itself.',
    networkPlus:
      'Network+ frames this as the difference between a stateful firewall operating at layers 3–4 and an application-layer gateway operating at layer 7.',
    webUiPath: 'Firewall → Proxy Actions to change inspection rules; Firewall → Firewall Policies to change which traffic is inspected.',
    checkFirst:
      'A log line reading "ProxyDrop" means the policy allowed the connection and the proxy action rejected the content. Editing the policy will not fix it — edit the proxy action.',
  },
  'NAT': {
    plainLanguage:
      'NAT rewrites addresses as traffic crosses the Firebox. Dynamic NAT lets many internal devices share one public address on the way out. Static NAT (SNAT) publishes one internal server on a public address so people outside can reach it.',
    networkPlus:
      'Network+ calls these PAT/NAT overload for the outbound case and port forwarding or destination NAT for the inbound case.',
    webUiPath: 'Firewall → NAT for dynamic NAT; Firewall → SNAT for published servers.',
    checkFirst:
      'Confirm which direction is failing. Outbound problems are usually dynamic NAT or routing; inbound problems are usually a missing SNAT action or a policy whose destination is the public address rather than the SNAT object.',
  },
  'BOVPN': {
    plainLanguage:
      'A branch office VPN is an encrypted tunnel between two Fireboxes. It comes up in two stages: Phase 1 authenticates the two devices to each other, and Phase 2 agrees how to encrypt the actual data. Traffic only enters the tunnel if it matches the tunnel route — the pair of local and remote networks you configured.',
    networkPlus:
      'Network+ covers this as IPsec site-to-site VPN, with IKE for key exchange and ESP for the encrypted payload.',
    webUiPath: 'VPN → Branch Office VPN. Gateways hold Phase 1; Tunnels hold Phase 2 and the tunnel routes.',
    checkFirst:
      'Find out which phase failed. Phase 1 problems point at the peer address, the shared key, or a mismatched authentication setting. Phase 2 problems point at mismatched encryption, PFS, or tunnel routes that do not line up on both sides.',
  },
  'Mobile VPN': {
    plainLanguage:
      'Mobile VPN lets one person connect into the network from anywhere. The Firebox has to know who they are, which is why an authentication server and a group are involved as well as the VPN settings themselves.',
    networkPlus:
      'Network+ treats this as remote-access VPN, in contrast with the site-to-site kind, usually paired with AAA (authentication, authorization, accounting).',
    webUiPath: 'VPN → Mobile VPN (choose the type: IKEv2, SSL, or L2TP), and Authentication → Servers for the user directory.',
    checkFirst:
      'Separate "cannot connect" from "connects but cannot reach anything". The first is authentication or the VPN configuration; the second is almost always the virtual IP pool, the allowed resources, or a missing route back.',
  },
  'Routing': {
    plainLanguage:
      'Routing decides which way out a packet goes. The Firebox picks the most specific matching route — a /32 beats a /24, which beats the default route. Routing happens independently of your policies: a packet can be allowed by policy and still go nowhere because there is no route.',
    networkPlus:
      'This is longest-prefix match, a core Network+ routing concept, along with the difference between connected, static, and dynamic routes.',
    webUiPath: 'Network → Routes to configure them; System Status → Routes to see what is actually in use.',
    checkFirst:
      'Look at the active routing table rather than the configuration. A log line reading "no route to host", or an empty out_ifname, means routing failed before policy even mattered.',
  },
  'Security Services': {
    plainLanguage:
      'Security services are the subscription features layered on top of the firewall — antivirus, intrusion prevention, reputation and botnet blocking. They run after a policy has matched and can drop traffic the policy allowed.',
    networkPlus:
      'Network+ groups these under IDS/IPS and content filtering as part of defence in depth.',
    webUiPath: 'Subscription Services → (service), and Firewall → Firewall Policies → (policy) → Security Services to enable it on that policy.',
    checkFirst:
      'Check whether the service is enabled on the specific policy carrying the traffic, not just globally. Also check Firewall → Blocked Sites, since IPS and Botnet Detection add temporary entries there that outlive the original event.',
  },
  'Initial Setup': {
    plainLanguage:
      'Initial setup is where interfaces get their roles. Trusted is your internal network, External faces the internet, and Optional is for anything you want separated, like guests or servers. Those roles drive the default policies and the spoofing checks.',
    networkPlus:
      'Network+ covers this as network segmentation and the screened subnet (DMZ) design.',
    webUiPath: 'Network → Interfaces, and System → Setup Wizard for a fresh device.',
    checkFirst:
      'Verify each interface has the right zone and the right subnet mask. An interface with the wrong role produces spoofing drops that look like an attack but are really a configuration error.',
  },
  'Logging & Monitoring': {
    plainLanguage:
      'Traffic Monitor is the live feed of what the Firebox is doing right now. Each line tells you the decision (Allow or Deny), the addresses and ports, and which policy made the call. Reading it well is most of troubleshooting.',
    networkPlus:
      'Network+ covers this as log review and syslog, part of the documentation and monitoring objectives.',
    webUiPath: 'System Status → Traffic Monitor, and System → Logging to send logs to a server.',
    checkFirst:
      'Turn on logging for the specific policy first — a policy with logging disabled produces no lines at all, which is easily mistaken for no traffic.',
  },
  'IP Addressing': {
    plainLanguage:
      'An IP address has a network part and a host part, and the subnet mask is what says where the split falls. Devices can talk directly only when they share the same network part; anything else has to go through a gateway.',
    networkPlus:
      'This is core Network+ subnetting: CIDR notation, usable host counts, and the reserved network and broadcast addresses.',
    webUiPath: 'Network → Interfaces, where each interface carries its address and mask.',
    checkFirst:
      'Work out the network and broadcast addresses for the subnet before anything else. A surprising share of "firewall problems" are two devices that were never on the same network to begin with.',
  },
  'Network Services': {
    plainLanguage:
      'The Firebox can hand out addresses with DHCP and forward name lookups with DNS. When a device has an address but still cannot reach anything by name, DNS is usually the missing piece.',
    networkPlus:
      'Network+ covers DHCP (including the DORA exchange) and DNS record types as core network services.',
    webUiPath: 'Network → Interfaces → (interface) → DHCP, and Network → DNS/WINS.',
    checkFirst:
      'Test by address first, then by name. If the address works and the name does not, the problem is DNS, not the firewall policy.',
  },
  'Switching & Wireless': {
    plainLanguage:
      'VLANs split one physical switch into several separate networks. Traffic between VLANs has to pass through something that routes — often the Firebox — which is exactly where policy gets applied.',
    networkPlus:
      'Network+ covers VLAN tagging (802.1Q), trunk versus access ports, and the wireless security standards.',
    webUiPath: 'Network → VLAN, and Network → Interfaces to attach a VLAN to a physical port.',
    checkFirst:
      'Confirm the port is tagged or untagged as intended on both the switch and the Firebox. A VLAN mismatch looks identical to a firewall block from the user\'s side.',
  },
  'Troubleshooting': {
    plainLanguage:
      'Work from the bottom up: does the device have an address, can it reach its gateway, does a route exist, does a policy allow it, and only then look at inspection. Jumping straight to the policy list is what makes simple faults take hours.',
    networkPlus:
      'This is the Network+ troubleshooting methodology — identify the problem, establish a theory, test it, and work the OSI layers in order.',
    webUiPath: 'System Status → Traffic Monitor, plus the diagnostic tools under System Status.',
    checkFirst:
      'Read the actual log line before changing anything. The disposition, the policy name, and the interface pair usually identify the layer at fault on their own.',
  },
  'Network Operations': {
    plainLanguage:
      'Operations covers the routine work that keeps a firewall healthy: backups before changes, firmware upgrades, and knowing how to roll back when an upgrade goes badly.',
    networkPlus:
      'Network+ covers this under change management, configuration backups, and business continuity.',
    webUiPath: 'System → Backup Image, and System → Upgrade OS.',
    checkFirst:
      'Take a backup image before any change. It is the difference between a five-minute rollback and a rebuild.',
  },
  'WatchGuard Cloud': {
    plainLanguage:
      'A Firebox can be managed locally through its own web interface, or from WatchGuard Cloud. The two modes do not expose an identical feature set, so a setting you remember from one may sit somewhere else — or not exist — in the other.',
    networkPlus:
      'Network+ frames this as centralised versus local management, and the trade-offs of cloud-hosted administration.',
    webUiPath: 'WatchGuard Cloud → Configure → Devices, versus the local Fireware Web UI on the device itself.',
    checkFirst:
      'Establish which management mode the device is in before following any guide. Instructions written for a locally-managed Firebox frequently do not apply to a cloud-managed one.',
  },
};

const FALLBACK: TopicGuide = {
  plainLanguage:
    'Re-read the question and identify exactly what is being asked before looking at the options. Most missed questions come from answering a slightly different question than the one on screen.',
  networkPlus:
    'Tie the scenario back to the underlying concept rather than the product screen — the concept is what transfers to the next device you touch.',
  webUiPath: 'Fireware Web UI, then the section matching this topic.',
  checkFirst: 'Confirm the observed behaviour on a real device or in the sandbox before accepting an explanation.',
};

/**
 * Builds the breakdown for a missed question. `chosen` is included so the
 * opening line can name the specific misconception rather than being
 * generic.
 */
export function explainLikeL1(question: Question, chosen: readonly string[]): L1Breakdown {
  const guide = GUIDES[question.topic] ?? FALLBACK;
  const picked = chosen.filter(Boolean);
  const correct = question.correctAnswers;

  const contrast = picked.length && question.type !== 'ordering'
    ? `You chose ${picked.map(a => `"${truncate(a)}"`).join(' and ')}. The answer is ${correct.map(a => `"${truncate(a)}"`).join(' then ')}.`
    : question.type === 'ordering'
      ? `The correct sequence is ${correct.join(' → ')}. In manual order the Firebox stops at the first policy that matches, so anything below a broader policy is never reached.`
      : `The answer is ${correct.map(a => `"${truncate(a)}"`).join(' and ')}.`;

  return {
    plainLanguage: `${contrast}\n\n${guide.plainLanguage}`,
    networkPlus: guide.networkPlus,
    webUiPath: guide.webUiPath,
    checkFirst: guide.checkFirst,
  };
}

function truncate(value: string, limit = 90) {
  return value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value;
}

export const l1TopicCoverage = () => Object.keys(GUIDES);
