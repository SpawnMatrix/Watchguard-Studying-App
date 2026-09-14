import { authoredQuestions } from './authoredQuestions';

export interface Flashcard {
  id: number;
  question: string;
  answer: string;
  category: 'Setup' | 'Policies' | 'VPN' | 'Diagnostics' | 'Routing' | 'Network+' | 'Cloud';
  keyConcept: string;
  examTip?: string;
  officialReference?: string;
}

/**
 * The twenty hand-written high-yield cards that open the Local Firebox deck.
 *
 * Checked against WatchGuard's Network Security Essentials for Locally-Managed Fireboxes Study Guide.
 * Earlier versions taught Firebox System Manager on port 4105, an "Enable NAT Loopback" checkbox that
 * does not exist, and Routing Table multi-WAN as plain route metrics; flashcards.test.ts pins the
 * corrections.
 */
export const HIGH_YIELD_FLASHCARDS: Flashcard[] = [
  {
    id: 1,
    category: 'Setup',
    question: 'What is the factory default IP address and subnet mask of Eth1 (Trusted) on a new or reset Firebox?',
    answer: 'IP address: 10.0.1.1\nSubnet mask: 255.255.255.0 (/24)\n\nEth1 is also enabled as a DHCP server, so a management computer set to DHCP gets an address on 10.0.1.0/24. Eth0 is External and a DHCP client, and Eth2 and higher are Optional interfaces at 10.0.x.1/24 with DHCP disabled.',
    keyConcept: 'Factory-default interfaces',
    examTip: 'Start the Web Setup Wizard at https://10.0.1.1:8080 from a computer on Eth1. The exceptions are the largest models: the Firebox M4800 uses Eth24 (10.0.24.1) and the M5600 and M5800 use Eth32 (10.0.32.1).',
    officialReference: 'Study Guide: Factory-Default Settings',
  },
  {
    id: 2,
    category: 'Setup',
    question: 'Which ports do administrators use to manage a locally-managed Firebox?',
    answer: 'Fireware Web UI: HTTPS on TCP 8080 by default (https://10.0.1.1:8080), allowed by the WatchGuard Web UI policy.\n\nWatchGuard System Manager, including Policy Manager and Firebox System Manager: TCP 4117.\nCommand line interface: SSH on TCP 4118, or the serial console.\nBoth are allowed by the WatchGuard policy.',
    keyConcept: 'Management ports',
    examTip: 'TCP 4100 is the Authentication Portal for network users, not an administration port. Never delete the WatchGuard or WatchGuard Web UI policies, or you lose management access.',
    officialReference: 'Study Guide: Management Policies',
  },
  {
    id: 3,
    category: 'Policies',
    question: 'How does the Firebox decide which policy applies when more than one could match?',
    answer: 'Only the highest-precedence matching policy applies.\n\nIn Auto-Order mode, the default, the Firebox sorts policies from most specific to most general by policy type, ports and protocols, source and destination, disposition and schedule. A single-host policy is evaluated before an Any-Trusted policy wherever it was added.\n\nIn Manual-Order mode, you set the order and the list position decides.',
    keyConcept: 'Policy precedence',
    examTip: 'When two policies are equally specific in Auto-Order mode, a proxy policy takes precedence over a packet filter. WatchGuard recommends Auto-Order until it cannot do what you need.',
    officialReference: 'Study Guide: Policy Precedence',
  },
  {
    id: 4,
    category: 'Policies',
    question: 'What is the main difference between a packet filter policy and a proxy policy?',
    answer: '• Packet filter: matches the source, destination, protocol and port in the packet headers, then allows or denies the whole connection. It does not see the content.\n• Proxy policy: also examines the application-layer content, checks that traffic follows the protocol, and can block one URL, file type or attachment while the rest of the session continues.',
    keyConcept: 'Packet filters vs. proxies',
    examTip: 'If a question asks how to inspect attachments, block file types or apply Gateway AntiVirus, IntelligentAV or DLP, the answer is a proxy policy: those services can only be enabled in a proxy action.',
    officialReference: 'Study Guide: Proxies and Proxy-Based Services',
  },
  {
    id: 5,
    category: 'Policies',
    question: 'How does HTTPS content inspection work, and what must be installed on clients to prevent browser warnings?',
    answer: 'The Firebox decrypts the HTTPS session, applies the HTTP proxy action and its services to the content, and re-encrypts it towards the client with a certificate signed by its Proxy Authority certificate.\n\nEvery client must trust the Firebox Proxy Authority CA certificate as a trusted root, or each inspected site shows a certificate warning.',
    keyConcept: 'HTTPS content inspection',
    examTip: 'Clients can download the certificate from the Certificate Portal at http://<Firebox IP address>:4126/certportal. Without inspection, WebBlocker still filters HTTPS by domain name.',
    officialReference: 'Study Guide: HTTPS-proxy Policies',
  },
  {
    id: 6,
    category: 'Routing',
    question: 'What is NAT loopback, and how do you make it work?',
    answer: 'NAT loopback lets users on the local network reach an internal server by its public IP address or domain name. The Firebox changes the public address to the private one, and the connection loops back inside instead of leaving for the Internet.\n\nConfigure it with an SNAT action that maps the public address to the private one, in a policy whose From list includes the local users, such as Any-Trusted and Any-Optional.',
    keyConcept: 'NAT loopback',
    examTip: 'There is no separate loopback switch to turn on. If loopback does not work, check that the policy using the SNAT action includes internal sources, not only Any-External.',
    officialReference: 'Study Guide: NAT Loopback',
  },
  {
    id: 7,
    category: 'Routing',
    question: 'Explain 1-to-1 NAT on a Firebox. Is it bi-directional?',
    answer: 'Yes. A 1-to-1 NAT rule builds a static, bidirectional relationship between real base (private) and NAT base (public) addresses, for a host, a range or a subnet.\n\nIf 10.0.2.11 maps to 203.0.113.11, traffic from 10.0.2.11 leaves as 203.0.113.11, and traffic to 203.0.113.11 reaches 10.0.2.11. A policy must still allow inbound traffic.',
    keyConcept: '1-to-1 NAT',
    examTip: 'Addresses used for 1-to-1 NAT cannot be used for other purposes such as VPNs. WatchGuard recommends SNAT on most networks, and SNAT is the only option with a single public IP address.',
    officialReference: 'Study Guide: 1-to-1 NAT',
  },
  {
    id: 8,
    category: 'VPN',
    question: 'What is the primary difference between BOVPN Phase 1 and Phase 2 negotiations?',
    answer: '• Phase 1 (gateway): the peers authenticate with a pre-shared key or certificate and negotiate the IKE security association - IKE version, encryption, authentication and Diffie-Hellman group.\n• Phase 2 (tunnel): the peers negotiate the IPSec security associations that carry data - the Phase 2 proposal, Perfect Forward Secrecy and lifetimes - for the traffic defined by the tunnel routes.',
    keyConcept: 'BOVPN Phase 1 vs. Phase 2',
    examTip: 'A mismatched pre-shared key or Phase 1 proposal fails in Phase 1. Mismatched PFS, lifetimes or tunnel routes fail in Phase 2, after Phase 1 has succeeded.',
    officialReference: 'Study Guide: VPN Negotiations',
  },
  {
    id: 9,
    category: 'VPN',
    question: 'Which Mobile VPN type does WatchGuard recommend in most cases, and why?',
    answer: 'Mobile VPN with IKEv2.\n\nIt is the most secure and fastest mobile VPN type, uses certificates for endpoint verification, supports MOBIKE so clients can change networks, and works with native clients on Windows, macOS and iOS. The Firebox offers a .bat script for Windows and a .mobileconfig profile for macOS and iOS.',
    keyConcept: 'Mobile VPN with IKEv2',
    examTip: 'IKEv2 needs UDP 500 and ESP, plus UDP 4500 for NAT traversal. Where the remote network blocks IPSec, use Mobile VPN with SSL, which uses TCP 443 by default.',
    officialReference: 'Study Guide: Mobile VPN with IKEv2',
  },
  {
    id: 10,
    category: 'Diagnostics',
    question: 'What does the Policy Checker diagnostic tool do in Firebox System Manager?',
    answer: 'Policy Checker takes a source IP address, destination IP address, protocol and port, and shows which policy in the configuration would handle that traffic and whether it would be allowed or denied - without sending any traffic.',
    keyConcept: 'Policy Checker',
    examTip: 'Use it when a new policy seems to have no effect: it shows at once whether a higher-precedence policy matches the traffic first. Then confirm real traffic in Traffic Monitor.',
    officialReference: 'Study Guide: Firebox System Manager',
  },
  {
    id: 11,
    category: 'Diagnostics',
    question: 'How long does an auto-blocked site stay on the Blocked Sites list by default?',
    answer: '20 minutes, set by Duration for Auto-Blocked Sites.\n\nThe duration is rolling: each time the Firebox blocks traffic from the site again, the expiration resets. Auto-blocked sites are blocked for connections from them, not to them. Sites you add permanently are blocked in both directions.',
    keyConcept: 'Auto-blocked sites',
    examTip: 'Sites are auto-blocked by proxy actions and services set to Block and by Default Packet Handling settings with the Block action, such as port and IP scans. Add servers that must never be blocked to the Blocked Sites Exceptions list.',
    officialReference: 'Study Guide: Blocked Sites',
  },
  {
    id: 12,
    category: 'Routing',
    question: 'Describe the four multi-WAN methods available on locally-managed Fireboxes.',
    answer: '1. Failover (default): all outgoing connections use the first active interface in the list.\n2. Round-robin: connections are distributed across the external interfaces by the weights you set.\n3. Routing Table: Equal-Cost Multi-Path (ECMP) routing distributes connections by source and destination IP address.\n4. Interface Overflow: each interface has a bandwidth limit, and connections move to the next interface in order as each limit is reached.',
    keyConcept: 'Multi-WAN methods',
    examTip: 'An SD-WAN action on a policy overrides the global multi-WAN method for that traffic. Multi-WAN does not affect inbound traffic or BOVPN traffic.',
    officialReference: 'Study Guide: Multi-WAN',
  },
  {
    id: 13,
    category: 'Routing',
    question: 'How does SD-WAN evaluate link quality to route outbound traffic?',
    answer: 'An SD-WAN action, applied to a policy, uses Link Monitor measurements of loss, latency and jitter. When the current interface exceeds the thresholds you set, the Firebox fails over new connections to another interface in the action.\n\nThe action can use the Failover or Round-robin SD-WAN method, and traffic in that policy ignores the global multi-WAN method.',
    keyConcept: 'SD-WAN metrics',
    examTip: 'SD-WAN depends on good Link Monitor targets: WatchGuard recommends at least two per external interface, farther upstream than the default gateway.',
    officialReference: 'Study Guide: SD-WAN',
  },
  {
    id: 14,
    category: 'Routing',
    question: 'Which dynamic routing protocols are supported on WatchGuard Fireboxes?',
    answer: '• RIP (v1 and v2): distance-vector, choosing routes by hop count.\n• OSPF: link-state, choosing the lowest total link cost.\n• BGP: path-vector, used between autonomous systems such as ISPs.',
    keyConcept: 'Dynamic routing protocols',
    examTip: 'Only a BOVPN virtual interface can take part in dynamic routing; a manual (policy-based) BOVPN supports neither dynamic routing nor static routes with metrics.',
    officialReference: 'Study Guide: Dynamic Routing',
  },
  {
    id: 15,
    category: 'VPN',
    question: 'What is the main advantage of a BOVPN virtual interface over a manual (policy-based) BOVPN?',
    answer: 'A BOVPN virtual interface adds a logical interface, and the Firebox uses its routing table to decide which traffic enters the tunnel. You add routes with a destination and metric on the VPN Routes tab.\n\nThat enables metric-based failover, dynamic routing and SD-WAN over the tunnel. A manual BOVPN instead lists explicit local and remote addresses as tunnel routes.',
    keyConcept: 'BOVPN virtual interface',
    examTip: 'If you configure a BOVPN virtual interface, the remote gateway must also use a virtual interface. Failover is not supported with third-party endpoints.',
    officialReference: 'Study Guide: BOVPN Virtual Interface Configuration',
  },
  {
    id: 16,
    category: 'Policies',
    question: 'Compare Gateway AntiVirus, IntelligentAV and APT Blocker.',
    answer: '• Gateway AntiVirus: matches files against signatures of known malware.\n• IntelligentAV: uses a machine-learning model on the Firebox to classify files without a signature.\n• APT Blocker: sends suspicious files to a cloud sandbox and analyses their behaviour, catching zero-day malware.',
    keyConcept: 'Layered malware protection',
    examTip: 'All three work through proxy actions. APT Blocker and DLP depend on Gateway AntiVirus scanning the content first, and nothing can scan HTTPS content unless content inspection is enabled.',
    officialReference: 'Study Guide: Security Services and Proxy Actions',
  },
  {
    id: 17,
    category: 'Policies',
    question: 'What is DNSWatch, and how does it protect DNS lookups?',
    answer: 'DNSWatch is a cloud-based security service. The Firebox adds two DNSWatch DNS servers to the top of its DNS server list and forwards outbound queries from protected networks to them.\n\nIf a domain is a known threat, DNSWatch resolves it to the DNSWatch Blackhole Server, and web requests are redirected to a customizable Deny page with interactive phishing training.',
    keyConcept: 'DNS-level threat protection',
    examTip: 'Because DNSWatch acts at the DNS lookup, it blocks connections to malicious domains whatever protocol or port would follow, and it needs no client certificate.',
    officialReference: 'Study Guide: DNSWatch',
  },
  {
    id: 18,
    category: 'Diagnostics',
    question: 'Which port does a Firebox use to send log messages to a WatchGuard Log Server or Dimension?',
    answer: 'TCP 4115.\n\nFor a third-party syslog server the Firebox uses syslog, on UDP 514 by default. A Firebox can send to several destinations at once, including WatchGuard Cloud.',
    keyConcept: 'Log server port',
    examTip: 'Traffic Monitor shows log messages live but keeps no history. Reports need logs retained by WatchGuard Cloud, Dimension or a log server, and logging enabled on the policies involved.',
    officialReference: 'Study Guide: Logging and Reporting',
  },
  {
    id: 19,
    category: 'Setup',
    question: 'How do Active/Passive and Active/Active FireCluster deployments differ?',
    answer: '• Active/passive: one member passes all traffic while the backup member stays synchronised, ready to take over.\n• Active/active: both members process traffic, adding throughput as well as redundancy. The cluster uses multicast MAC addresses.',
    keyConcept: 'FireCluster modes',
    examTip: 'Both members must be the same model and synchronise over dedicated cluster interfaces. For active/active, check that switches and routers support multicast MAC forwarding or static entries.',
    officialReference: 'About FireCluster',
  },
  {
    id: 20,
    category: 'Setup',
    question: 'What is the difference between a configuration file (.xml) and a backup image (.fxi)?',
    answer: '• Configuration file: all configuration settings, but not feature keys, users and passwords, certificates or firmware. It can be copied to other Fireboxes, even a different model.\n• Backup image: the configuration plus certificates, passwords, the feature key and other device-specific information. It restores only to the Firebox that created it, on the same Fireware version.',
    keyConcept: 'Configuration files vs. backup images',
    examTip: 'A backup image is saved automatically when you upgrade Fireware. Images stored on the Firebox do not include Fireware OS; an exported image is password-encrypted and can include it.',
    officialReference: 'Study Guide: Configuration Files and Backup Images',
  },
];

/** The full deck: the hand-written cards, then one card per authored question. */
export const FLASHCARDS: Flashcard[] = [
  ...HIGH_YIELD_FLASHCARDS,
  ...authoredQuestions.map(q => ({
    id: 20000 + q.id,
    question: q.question,
    answer: q.correctAnswers.join('; ') + '\n\n' + q.explanation,
    category: (q.track === 'network-plus' ? 'Network+' : q.track === 'cloud' ? 'Cloud' : q.topic === 'Initial Setup' ? 'Setup' : q.topic.includes('VPN') ? 'VPN' : q.topic === 'Routing' ? 'Routing' : (q.topic === 'Logging & Monitoring' || q.topic === 'Troubleshooting') ? 'Diagnostics' : 'Policies') as Flashcard['category'],
    keyConcept: q.topic,
    officialReference: q.sources?.map(s => [s.title, s.section].filter(Boolean).join(' · ')).join('; '),
  })),
];
