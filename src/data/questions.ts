export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string; // Left for backward compatibility/display
  correctAnswers: string[];
  isMultiSelect: boolean;
  correctAnswersCount: number; // For multi-select
  topic: "NAT" | "Mobile VPN" | "BOVPN" | "Routing" | "Policies" | "Proxies" | "Security Services" | "Initial Setup" | "Logging & Monitoring";
}

export const examQuestions: Question[] = [
  {
    id: 1,
    question: "Which of these is a default Class B subnet mask? (Select one.)",
    options: ["/8", "/12", "/16", "/24", "/28"],
    correctAnswer: "/16",
    correctAnswers: ["/16"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 2,
    question: "What is the purpose of the WatchGuard Authentication policy? (Select one.)",
    options: [
      "Allows management users to authenticate to Fireware Web UI",
      "Allows branch office VPN connections between two Fireboxes",
      "Allows user connections to the Firebox Authentication Portal",
      "Allows Mobile VPN users to authenticate to the Firebox"
    ],
    correctAnswer: "Allows user connections to the Firebox Authentication Portal",
    correctAnswers: ["Allows user connections to the Firebox Authentication Portal"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Policies"
  },
  {
    id: 3,
    question: "From the policies shown in the default configuration, can users in the Sales group connect from the trusted network to websites with HTTPS if only the default Outgoing policy is enabled? (Select one.)",
    options: [
      "No. The HTTPS-proxy policy only allows HTTPS traffic for the Accounting group.",
      "No. The Outgoing policy does not allow any traffic from the Sales group.",
      "Yes. The HTTP policy allows HTTP and HTTPS traffic for the Sales group.",
      "Yes. The Outgoing policy allows HTTPS traffic from the trusted network."
    ],
    correctAnswer: "Yes. The Outgoing policy allows HTTPS traffic from the trusted network.",
    correctAnswers: ["Yes. The Outgoing policy allows HTTPS traffic from the trusted network."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Policies"
  },
  {
    id: 4,
    question: "You can configure Dynamic NAT to route incoming connections from the Internet to two different FTP servers on the trusted network. (Select one.)",
    options: ["True", "False"],
    correctAnswer: "False",
    correctAnswers: ["False"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "NAT"
  },
  {
    id: 5,
    question: "What port and protocol is used by default for DNS query resolution? (Select one.)",
    options: ["UDP/67", "UDP/53", "TCP/20", "TCP/25"],
    correctAnswer: "UDP/53",
    correctAnswers: ["UDP/53"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 6,
    question: "What is the purpose of a Static NAT (SNAT) policy mapping public IP 203.0.113.80 to private IP 10.0.20.80 on port 80? (Select one.)",
    options: [
      "To allow clients on an external network to connect to a secure web server on a trusted or optional network using its private IP address",
      "To allow clients on your trusted network to connect to a secure web server on an external network using its private IP address",
      "To allow clients on an external network to connect to a secure web server on a trusted or optional network using the server's public IP address",
      "To allow clients on your trusted network to connect to a secure web server on a trusted or optional network using its public IP address"
    ],
    correctAnswer: "To allow clients on an external network to connect to a secure web server on a trusted or optional network using the server's public IP address",
    correctAnswers: ["To allow clients on an external network to connect to a secure web server on a trusted or optional network using the server's public IP address"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "NAT"
  },
  {
    id: 7,
    question: "While verifying a branch office VPN tunnel, you observe the log message: 'iked peer proposes phase two negotiation failed: Received proposal without PFS, Expecting PFS enabled'. Which setting should you modify? (Select one.)",
    options: [
      "BOVPN Gateway settings",
      "BOVPN Tunnel settings",
      "BOVPN over TLS settings",
      "IKEv2 Shared settings"
    ],
    correctAnswer: "BOVPN Tunnel settings",
    correctAnswers: ["BOVPN Tunnel settings"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "BOVPN"
  },
  {
    id: 8,
    question: "You want to route traffic from clients on the 192.168.10.0/24 subnet to a server at 10.0.20.80 behind a router with IP 192.168.10.5. Which static routes could you add? (Select TWO.)",
    options: [
      "Route to 10.0.20.0/24, Gateway 10.0.2.1",
      "Route to 10.0.20.80, Gateway 192.168.10.5",
      "Route to 192.168.10.5, Gateway 192.168.10.1",
      "Route to 10.0.20.0/24, Gateway 192.168.10.5"
    ],
    correctAnswer: "Route to 10.0.20.0/24, Gateway 192.168.10.5 | Route to 10.0.20.80, Gateway 192.168.10.5",
    correctAnswers: ["Route to 10.0.20.80, Gateway 192.168.10.5", "Route to 10.0.20.0/24, Gateway 192.168.10.5"],
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Routing"
  },
  {
    id: 9,
    question: "You can use the TCP-UDP proxy to control Web, FTP, and SIP traffic on ports other than standard 80, 21, and 5060. (Select one.)",
    options: ["True", "False"],
    correctAnswer: "True",
    correctAnswers: ["True"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Proxies"
  },
  {
    id: 10,
    question: "Which authentication servers can be used with any type of Mobile VPN? (Select TWO.)",
    options: ["Firebox-DB", "Active Directory", "RADIUS", "LDAP"],
    correctAnswer: "Firebox-DB | RADIUS",
    correctAnswers: ["Firebox-DB", "RADIUS"],
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Mobile VPN"
  },
  {
    id: 11,
    question: "When your device is in a default state, to which interface do you connect your management computer so you can use the Quick Setup Wizard? (Select one.)",
    options: ["Interface 0 (External)", "Console interface", "Interface 2 (Optional)", "Interface 1 (Trusted)"],
    correctAnswer: "Interface 1 (Trusted)",
    correctAnswers: ["Interface 1 (Trusted)"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 12,
    question: "In the default Firebox configuration file, which policies control management access to the device? (Select TWO.)",
    options: ["WatchGuard", "FTP", "Ping", "WatchGuard Web UI", "Outgoing"],
    correctAnswer: "WatchGuard | WatchGuard Web UI",
    correctAnswers: ["WatchGuard", "WatchGuard Web UI"],
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Policies"
  },
  {
    id: 13,
    question: "To use the Web Setup Wizard or Quick Setup Wizard to configure your Firebox, your computer must have an IP address on which subnet? (Select one.)",
    options: ["10.0.10.0/24", "10.0.1.0/24", "172.16.10.0/24", "192.168.1.0/24"],
    correctAnswer: "10.0.1.0/24",
    correctAnswers: ["10.0.1.0/24"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 14,
    question: "Which items are included in a Firebox backup image file (.fxi)? (Select FOUR.)",
    options: [
      "Configuration file",
      "Fireware OS image",
      "Log files",
      "Certificates",
      "Passwords",
      "Feature keys"
    ],
    correctAnswer: "Configuration file | Certificates | Passwords | Feature keys",
    correctAnswers: ["Configuration file", "Certificates", "Passwords", "Feature keys"],
    isMultiSelect: true,
    correctAnswersCount: 4,
    topic: "Initial Setup"
  },
  {
    id: 15,
    question: "The policies in a default Firebox configuration do not allow outgoing traffic from optional interfaces. (Select one.)",
    options: ["True", "False"],
    correctAnswer: "False",
    correctAnswers: ["False"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Policies"
  },
  {
    id: 16,
    question: "When you examine log messages in Traffic Monitor, you see network packets are denied with an 'Unhandled Internal Packet' message. What does this log message mean? (Select one.)",
    options: [
      "The packet is denied because the site is on the Blocked Sites list.",
      "The packet is denied because it matched an implicit drop rule in a configured proxy policy.",
      "The packet is denied because it does not match any configured firewall policies.",
      "The packet is denied because it matched a configured signature in the Intrusion Prevention Service."
    ],
    correctAnswer: "The packet is denied because it does not match any configured firewall policies.",
    correctAnswers: ["The packet is denied because it does not match any configured firewall policies."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Logging & Monitoring"
  },
  {
    id: 17,
    question: "Which of these actions adds a host to the temporary or permanent blocked sites list? (Select THREE.)",
    options: [
      "Enable the AUTO-block sites that attempt to connect option in a deny policy.",
      "Add the site to the Blocked Sites Exceptions list.",
      "On the Firebox System Manager > Blocked Sites tab, select Add.",
      "In Policy Manager, select Setup > Default Threat Protection > Blocked Sites and click Add.",
      "Create a WebBlocker action with Deny as the disposition."
    ],
    correctAnswer: "Enable the AUTO-block sites that attempt to connect option in a deny policy. | On the Firebox System Manager > Blocked Sites tab, select Add. | In Policy Manager, select Setup > Default Threat Protection > Blocked Sites and click Add.",
    correctAnswers: [
      "Enable the AUTO-block sites that attempt to connect option in a deny policy.",
      "On the Firebox System Manager > Blocked Sites tab, select Add.",
      "In Policy Manager, select Setup > Default Threat Protection > Blocked Sites and click Add."
    ],
    isMultiSelect: true,
    correctAnswersCount: 3,
    topic: "Security Services"
  },
  {
    id: 18,
    question: "Which of these threats can the Firebox prevent with the default packet handling settings? (Select FOUR.)",
    options: [
      "Access to inappropriate websites",
      "Denial of service attacks",
      "Flood attacks",
      "Malware in downloaded files",
      "Port scans",
      "IP spoofing"
    ],
    correctAnswer: "Denial of service attacks | Flood attacks | Port scans | IP spoofing",
    correctAnswers: ["Denial of service attacks", "Flood attacks", "Port scans", "IP spoofing"],
    isMultiSelect: true,
    correctAnswersCount: 4,
    topic: "Security Services"
  },
  {
    id: 19,
    question: "If you disable the default Outgoing policy, which policies must you add to allow trusted users to connect to commonly used websites? (Select THREE.)",
    options: [
      "HTTP port 80",
      "NAT policy",
      "FTP port 21",
      "HTTPS port 443",
      "DNS port 53"
    ],
    correctAnswer: "HTTP port 80 | HTTPS port 443 | DNS port 53",
    correctAnswers: ["HTTP port 80", "HTTPS port 443", "DNS port 53"],
    isMultiSelect: true,
    correctAnswersCount: 3,
    topic: "Policies"
  },
  {
    id: 20,
    question: "How is a proxy policy different from a packet filter policy? (Select TWO.)",
    options: [
      "Only a proxy policy examines information in the IP header.",
      "Only a proxy policy uses the IP source, destination, and port to control network traffic.",
      "Only a proxy policy can prevent specific threats without blocking the entire connection.",
      "Only a proxy works at the application, network, and transport layers to examine all connection data."
    ],
    correctAnswer: "Only a proxy policy can prevent specific threats without blocking the entire connection. | Only a proxy works at the application, network, and transport layers to examine all connection data.",
    correctAnswers: [
      "Only a proxy policy can prevent specific threats without blocking the entire connection.",
      "Only a proxy works at the application, network, and transport layers to examine all connection data."
    ],
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Proxies"
  },
  {
    id: 21,
    question: "For which of these third-party authentication methods must you specify a search base? (Select TWO.)",
    options: ["RADIUS", "Active Directory", "SecurID", "LDAP"],
    correctAnswer: "Active Directory | LDAP",
    correctAnswers: ["Active Directory", "LDAP"],
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Initial Setup"
  },
  {
    id: 22,
    question: "You need to create an HTTP-proxy policy to a specific domain for software updates (example.com). The update site has multiple subdomains and dynamic IP addresses on a CDN. Which of these is the best way to define the destination? (Select one.)",
    options: [
      "Configure a host name for update.example.com.",
      "Configure an FQDN for *.example.com.",
      "Add IP addresses that correspond to each software update server in the domain.",
      "Create an alias for all subdomains and known IP addresses for example.com."
    ],
    correctAnswer: "Configure an FQDN for *.example.com.",
    correctAnswers: ["Configure an FQDN for *.example.com."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Policies"
  },
  {
    id: 23,
    question: "Which takes precedence: a WebBlocker category match or a WebBlocker exception? (Select one.)",
    options: ["WebBlocker exception", "WebBlocker category match"],
    correctAnswer: "WebBlocker exception",
    correctAnswers: ["WebBlocker exception"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Security Services"
  },
  {
    id: 24,
    question: "Which of these options must you configure in an HTTPS-proxy policy to detect credit card numbers in HTTP traffic that is encrypted with SSL? (Select TWO.)",
    options: ["WebBlocker", "Gateway AntiVirus", "Application Control", "Content Inspection", "Data Loss Prevention"],
    correctAnswer: "Content Inspection | Data Loss Prevention",
    correctAnswers: ["Content Inspection", "Data Loss Prevention"],
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Proxies"
  },
  {
    id: 25,
    question: "Which ports and protocols must be allowed through external network firewalls to support Mobile VPN with IKEv2? (Select one.)",
    options: [
      "UDP Port 500 and UDP Port 4500",
      "TCP Port 443 only",
      "UDP Port 1194 only",
      "TCP Port 1723 and GRE Protocol 47"
    ],
    correctAnswer: "UDP Port 500 and UDP Port 4500",
    correctAnswers: ["UDP Port 500 and UDP Port 4500"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Mobile VPN"
  },
  {
    id: 26,
    question: "To block downloads of .exe executable files on trusted networks, which HTTP proxy action category must you configure? (Select one.)",
    options: [
      "HTTP Response > Body Content Types",
      "HTTP Request > Request Methods",
      "HTTP Response > Header Fields",
      "WebBlocker Category Filters"
    ],
    correctAnswer: "HTTP Response > Body Content Types",
    correctAnswers: ["HTTP Response > Body Content Types"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Proxies"
  },
  {
    id: 27,
    question: "A Branch Office VPN (BOVPN) negotiation encounters an issue in Phase 1. What are the most likely causes for this negotiation behavior? (Select TWO.)",
    options: [
      "Mismatched pre-shared keys",
      "Mismatched Tunnel route subnets",
      "Mismatched Phase 1 proposal encryption algorithms",
      "Mismatched Perfect Forward Secrecy (PFS) settings"
    ],
    correctAnswer: "Mismatched pre-shared keys | Mismatched Phase 1 proposal encryption algorithms",
    correctAnswers: ["Mismatched pre-shared keys", "Mismatched Phase 1 proposal encryption algorithms"],
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "BOVPN"
  },
  {
    id: 28,
    question: "When configuring Multi-WAN on a Firebox, which routing method routes traffic based on interface bandwidth utilization thresholds? (Select one.)",
    options: [
      "Spillover",
      "Round-Robin",
      "Interface Failover",
      "Routing Table Cost"
    ],
    correctAnswer: "Spillover",
    correctAnswers: ["Spillover"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Routing"
  },
  {
    id: 29,
    question: "Which verification protocol does a Firebox Link Monitor use by default to test link viability? (Select one.)",
    options: [
      "ICMP Ping or TCP Port probes",
      "Dynamic Routing RIP packets",
      "Syslog transmission handshakes",
      "BGP route advertisements"
    ],
    correctAnswer: "ICMP Ping or TCP Port probes",
    correctAnswers: ["ICMP Ping or TCP Port probes"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Routing"
  },
  {
    id: 30,
    question: "What is the default behavior of the Firebox HTTPS Proxy when it encounters an expired SSL certificate on an external server during HTTPS inspection? (Select one.)",
    options: [
      "It blocks the connection and returns a certificate warning page to the client",
      "It bypasses the scanner and allows the connection without warning",
      "It automatically repairs the signature and re-keys the stream",
      "It routes the connection through an isolated optional interface"
    ],
    correctAnswer: "It blocks the connection and returns a certificate warning page to the client",
    correctAnswers: ["It blocks the connection and returns a certificate warning page to the client"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Proxies"
  },
  {
    id: 31,
    question: "If a Firebox cannot connect to the cloud-hosted WebBlocker servers, what is the default response configuration? (Select one.)",
    options: [
      "Access is either blocked or allowed based on the WebBlocker server connection error action",
      "Access is always allowed to avoid disrupting client browsing",
      "Access is always blocked to ensure strict security bounds",
      "The Firebox crashes and triggers an active-passive cluster failover"
    ],
    correctAnswer: "Access is either blocked or allowed based on the WebBlocker server connection error action",
    correctAnswers: ["Access is either blocked or allowed based on the WebBlocker server connection error action"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Security Services"
  },
  {
    id: 32,
    question: "What is the default virtual IP address pool subnet configured automatically for Mobile VPN with SSL clients? (Select one.)",
    options: [
      "192.168.113.0/24",
      "10.0.1.0/24",
      "10.0.113.0/24",
      "172.16.1.0/24"
    ],
    correctAnswer: "192.168.113.0/24",
    correctAnswers: ["192.168.113.0/24"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Mobile VPN"
  },
  {
    id: 33,
    question: "Which WatchGuard management application allows you to edit and save a configuration file offline before applying it to a live Firebox? (Select one.)",
    options: [
      "Policy Manager",
      "Fireware Web UI",
      "WatchGuard Cloud Console",
      "Firebox System Manager (FSM)"
    ],
    correctAnswer: "Policy Manager",
    correctAnswers: ["Policy Manager"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 34,
    question: "The Intrusion Prevention Service (IPS) operates by scanning network packets for matching signatures of known security vulnerabilities. (Select one.)",
    options: [
      "True",
      "False"
    ],
    correctAnswer: "True",
    correctAnswers: ["True"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Security Services"
  },
  {
    id: 35,
    question: "Which of these subscription security services require Gateway AntiVirus signature scanner to be configured and active? (Select TWO.)",
    options: [
      "APT Blocker",
      "WebBlocker",
      "Intrusion Prevention Service (IPS)",
      "Data Loss Prevention (DLP)"
    ],
    correctAnswer: "APT Blocker | Data Loss Prevention (DLP)",
    correctAnswers: ["APT Blocker", "Data Loss Prevention (DLP)"],
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Security Services"
  },
  {
    id: 36,
    question: "When configuring a Branch Office VPN (BOVPN) failover, what mechanism does the Firebox use to dynamically switch gateways on ISP link failure? (Select one.)",
    options: [
      "Link Monitor status on Multi-WAN interfaces",
      "Dynamic Routing protocol convergence timer",
      "ICMP pings injected into the BOVPN tunnel",
      "Manual administrative intervention via Web UI"
    ],
    correctAnswer: "Link Monitor status on Multi-WAN interfaces",
    correctAnswers: ["Link Monitor status on Multi-WAN interfaces"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "BOVPN"
  },
  {
    id: 37,
    question: "Which standalone application in WatchGuard System Manager is used specifically to view real-time log messages and active traffic flows? (Select one.)",
    options: [
      "Firebox System Manager",
      "Policy Manager",
      "Log Server",
      "Report Server"
    ],
    correctAnswer: "Firebox System Manager",
    correctAnswers: ["Firebox System Manager"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Logging & Monitoring"
  },
  {
    id: 38,
    question: "If you configure a 1-to-1 NAT mapping on your External interface, does this configuration automatically create policies to allow inbound connections? (Select one.)",
    options: [
      "No, you must still explicitly create firewall policies allowing traffic to the private IP address",
      "Yes, the Firebox automatically creates inbound and outbound wide-open policies",
      "Yes, but only for ICMP Ping packets",
      "No, because 1-to-1 NAT can only be mapped to Trusted zones, not External zones"
    ],
    correctAnswer: "No, you must still explicitly create firewall policies allowing traffic to the private IP address",
    correctAnswers: ["No, you must still explicitly create firewall policies allowing traffic to the private IP address"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "NAT"
  },
  {
    id: 39,
    question: "To authenticate users against their Active Directory domain controller credentials, what information must be configured in the AD auth settings? (Select one.)",
    options: [
      "Search base, domain name, and server IP address",
      "Active Directory schema GUID and master key",
      "A RADIUS shared secret password",
      "LDAP administrative client root passwords only"
    ],
    correctAnswer: "Search base, domain name, and server IP address",
    correctAnswers: ["Search base, domain name, and server IP address"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 40,
    question: "On all multi-port locally-managed Fireboxes, what physical port interface ID maps to the default Trusted interface zone on startup? (Select one.)",
    options: [
      "Interface 1 (Eth1)",
      "Interface 0 (Eth0)",
      "Interface 2 (Eth2)",
      "Console Port"
    ],
    correctAnswer: "Interface 1 (Eth1)",
    correctAnswers: ["Interface 1 (Eth1)"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 41,
    question: "Which NAT type is bidirectional, mapping a single private IP address to a dedicated public IP address for both inbound and outbound traffic? (Select one.)",
    options: ["Dynamic NAT", "1-to-1 NAT", "Static NAT (SNAT)", "Policy-based NAT"],
    correctAnswer: "1-to-1 NAT",
    correctAnswers: ["1-to-1 NAT"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "NAT"
  },
  {
    id: 42,
    question: "What happens to a packet when multiple Multi-WAN interfaces are configured and one interface becomes unavailable during a Link Monitor check? (Select one.)",
    options: [
      "The Firebox drops all outgoing traffic to prevent data leakage.",
      "The Firebox dynamically routes traffic to the remaining active Multi-WAN interfaces.",
      "The Firebox triggers an administrative reboot.",
      "The dead interface remains in the routing table with a metric of 0."
    ],
    correctAnswer: "The Firebox dynamically routes traffic to the remaining active Multi-WAN interfaces.",
    correctAnswers: ["The Firebox dynamically routes traffic to the remaining active Multi-WAN interfaces."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Routing"
  },
  {
    id: 43,
    question: "You want to allow users to view a blocked website category, but require them to acknowledge a warning page before proceeding. Which WebBlocker action should you configure? (Select one.)",
    options: ["Allow", "Deny", "Warn", "Bypass"],
    correctAnswer: "Warn",
    correctAnswers: ["Warn"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Proxies"
  },
  {
    id: 44,
    question: "Which Firebox cluster configuration requires active-active load balancing switches to be deployed upstream and downstream of the cluster? (Select one.)",
    options: ["Active/Passive Cluster", "Active/Active Cluster", "Dynamic Routing Multi-Cluster", "Drop-In Clustering"],
    correctAnswer: "Active/Active Cluster",
    correctAnswers: ["Active/Active Cluster"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 45,
    question: "What is the primary security goal of WatchGuard DNSWatch? (Select one.)",
    options: [
      "To cache internal DNS queries for faster page loads",
      "To intercept and analyze DNS requests, blocking connections to known malicious domains",
      "To assign local DNS names to private IP addresses on the Trusted zone",
      "To synchronize DNS records with third-party domain registrars"
    ],
    correctAnswer: "To intercept and analyze DNS requests, blocking connections to known malicious domains",
    correctAnswers: ["To intercept and analyze DNS requests, blocking connections to known malicious domains"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Security Services"
  },
  {
    id: 46,
    question: "When configuring Mobile VPN with SSL, which of these is the default protocol and port used for VPN tunnels? (Select one.)",
    options: ["UDP port 500", "TCP port 443", "UDP port 1194", "TCP port 1723"],
    correctAnswer: "TCP port 443",
    correctAnswers: ["TCP port 443"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Mobile VPN"
  },
  {
    id: 47,
    question: "In a branch office VPN configuration, which of these is a Phase 1 proposal setting that must match on both Fireboxes? (Select one.)",
    options: [
      "Tunnel Route subnets",
      "PFS (Perfect Forward Secrecy) key group",
      "Gateway pre-shared key and Phase 1 negotiation mode",
      "Virtual IP pool subnet"
    ],
    correctAnswer: "Gateway pre-shared key and Phase 1 negotiation mode",
    correctAnswers: ["Gateway pre-shared key and Phase 1 negotiation mode"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "BOVPN"
  },
  {
    id: 48,
    question: "Which tool inside WatchGuard System Manager (WSM) allows you to run diagnostic checks like Ping, DNS lookup, TCP Dump, or Traceroute? (Select one.)",
    options: ["Policy Manager", "Firebox System Manager", "Log Server", "Report Server"],
    correctAnswer: "Firebox System Manager",
    correctAnswers: ["Firebox System Manager"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Logging & Monitoring"
  },
  {
    id: 49,
    question: "Which default WatchGuard Policy allows all traffic originating from a trusted or optional interface to connect to any external network? (Select one.)",
    options: ["WatchGuard Policy", "Any-Trusted Policy", "Outgoing Policy", "Default Route Policy"],
    correctAnswer: "Outgoing Policy",
    correctAnswers: ["Outgoing Policy"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Policies"
  },
  {
    id: 50,
    question: "To inspect outbound encrypted HTTPS traffic, which certificate must be installed in the Trusted Root Certification Authorities store of all client computers? (Select one.)",
    options: [
      "The External Interface Public Certificate",
      "The WebBlocker Cloud CA Certificate",
      "The Firebox Proxy Authority Certificate",
      "The Firebox Web UI Management Certificate"
    ],
    correctAnswer: "The Firebox Proxy Authority Certificate",
    correctAnswers: ["The Firebox Proxy Authority Certificate"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Proxies"
  },
  {
    id: 51,
    question: "What is the function of Dynamic NAT (DNAT)? (Select one.)",
    options: [
      "To map inbound connections to internal servers based on ports",
      "To change the source IP address of outbound packets from private IP addresses to a public IP address",
      "To map an internal subnet to an external zone bidirectionally",
      "To automatically update dynamic DNS records for the external interface"
    ],
    correctAnswer: "To change the source IP address of outbound packets from private IP addresses to a public IP address",
    correctAnswers: ["To change the source IP address of outbound packets from private IP addresses to a public IP address"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "NAT"
  },
  {
    id: 52,
    question: "Which Multi-WAN routing method distributes outbound traffic proportionally among active interfaces based on user-defined weights? (Select one.)",
    options: ["Round-Robin", "Spillover", "Interface Failover", "Routing Table Cost"],
    correctAnswer: "Round-Robin",
    correctAnswers: ["Round-Robin"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Routing"
  },
  {
    id: 53,
    question: "When multiple policies are configured in Policy Manager, how does the Firebox determine the order of policy precedence? (Select one.)",
    options: [
      "Alphabetical order of policy names",
      "Creation date order (oldest policy first)",
      "Sequential order from top to bottom (most specific to least specific)",
      "Port number order (lowest ports first)"
    ],
    correctAnswer: "Sequential order from top to bottom (most specific to least specific)",
    correctAnswers: ["Sequential order from top to bottom (most specific to least specific)"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Policies"
  },
  {
    id: 54,
    question: "Which of these proxies can be used to scan inbound and outbound email messages for virus signatures or spam content? (Select TWO.)",
    options: ["SMTP-proxy", "IMAP-proxy", "TCP-UDP-proxy", "HTTP-proxy"],
    correctAnswer: "SMTP-proxy | IMAP-proxy",
    correctAnswers: ["SMTP-proxy", "IMAP-proxy"],
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Proxies"
  },
  {
    id: 55,
    question: "Which WatchGuard security subscription service scans files using cloud-based sandboxing to identify zero-day malware? (Select one.)",
    options: ["Gateway AntiVirus", "IntelligentAV", "APT Blocker", "Application Control"],
    correctAnswer: "APT Blocker",
    correctAnswers: ["APT Blocker"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Security Services"
  },
  {
    id: 56,
    question: "You are configuring Mobile VPN with IKEv2. Which client authentication databases are supported? (Select THREE.)",
    options: ["Firebox-DB", "RADIUS", "Active Directory / LDAP", "SAML SSO", "SecurID"],
    correctAnswer: "Firebox-DB | RADIUS | Active Directory / LDAP",
    correctAnswers: ["Firebox-DB", "RADIUS", "Active Directory / LDAP"],
    isMultiSelect: true,
    correctAnswersCount: 3,
    topic: "Mobile VPN"
  },
  {
    id: 57,
    question: "What is the default IKE protocol version used for high-reliability, zero-touch VPN gateway configurations on modern Fireboxes? (Select one.)",
    options: ["IKEv1", "IKEv2", "IKEv3", "L2TP"],
    correctAnswer: "IKEv2",
    correctAnswers: ["IKEv2"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "BOVPN"
  },
  {
    id: 58,
    question: "You are searching for denied traffic from a specific client IP address in real-time. Which application in WatchGuard System Manager should you open? (Select one.)",
    options: ["FSM > Log Server", "FSM > Traffic Monitor", "FSM > Status Report", "FSM > Policy Checker"],
    correctAnswer: "FSM > Traffic Monitor",
    correctAnswers: ["FSM > Traffic Monitor"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Logging & Monitoring"
  },
  {
    id: 59,
    question: "You need to restore a configuration onto a brand new replacement Firebox of a different model. Can you use a Backup Image (.fxi) file? (Select one.)",
    options: [
      "Yes, Backup Images are model-independent.",
      "No, Backup Images can only be restored to the identical physical Firebox or identical model.",
      "Yes, but you must first decrypt the feature keys.",
      "No, replacement Fireboxes can only be configured from scratch using wizards."
    ],
    correctAnswer: "No, Backup Images can only be restored to the identical physical Firebox or identical model.",
    correctAnswers: ["No, Backup Images can only be restored to the identical physical Firebox or identical model."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 60,
    question: "Which configuration allows internal users to connect to a local mail server on the Trusted zone using its public IP address? (Select one.)",
    options: ["1-to-1 NAT", "Dynamic NAT Pool", "NAT Loopback", "Static NAT (SNAT)"],
    correctAnswer: "NAT Loopback",
    correctAnswers: ["NAT Loopback"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "NAT"
  },
  {
    id: 61,
    question: "What happens if you configure an HTTPS Proxy to allow connections with unrecognized SSL/TLS certificate authority signatures? (Select one.)",
    options: [
      "The Firebox blocks the connection and drops the packet.",
      "The Firebox intercepts and signs the connection using its Proxy Authority certificate, bypassing inspections.",
      "The client browser will receive a security alert because the Firebox signs it with a self-signed certificate.",
      "The Firebox bypasses content inspection and allows the client to establish a direct TLS tunnel."
    ],
    correctAnswer: "The client browser will receive a security alert because the Firebox signs it with a self-signed certificate.",
    correctAnswers: ["The client browser will receive a security alert because the Firebox signs it with a self-signed certificate."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Proxies"
  },
  {
    id: 62,
    question: "What occurs when you assign an interface to the 'Optional' zone during setup? (Select one.)",
    options: [
      "The interface is disabled and cannot pass any traffic.",
      "The interface can route traffic, but is not included in the default Outgoing policy by default.",
      "The interface is active and is included in the default Outgoing policy, but has no default inbound policies.",
      "The interface is reserved strictly for high-availability cluster synchronization."
    ],
    correctAnswer: "The interface is active and is included in the default Outgoing policy, but has no default inbound policies.",
    correctAnswers: ["The interface is active and is included in the default Outgoing policy, but has no default inbound policies."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Routing"
  },
  {
    id: 63,
    question: "Which subscription service assigns a reputational score to outbound connection destinations to optimize scanning latency? (Select one.)",
    options: ["DNSWatch", "Reputation Enabled Defense (RED)", "WebBlocker", "Application Control"],
    correctAnswer: "Reputation Enabled Defense (RED)",
    correctAnswers: ["Reputation Enabled Defense (RED)"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Security Services"
  },
  {
    id: 64,
    question: "If a Mobile VPN with SSL client cannot browse resources on the Trusted network, what is the most likely cause? (Select TWO.)",
    options: [
      "The virtual IP address pool overlaps with the client's local network subnet.",
      "The client computer does not have the administrative certificate installed.",
      "The SSL-VPN policy does not allow traffic from the SSL-VPN group to Any-Trusted.",
      "The Firebox is in Drop-In mode instead of Mixed Routing mode."
    ],
    correctAnswer: "The virtual IP address pool overlaps with the client's local network subnet. | The SSL-VPN policy does not allow traffic from the SSL-VPN group to Any-Trusted.",
    correctAnswers: ["The virtual IP address pool overlaps with the client's local network subnet.", "The SSL-VPN policy does not allow traffic from the SSL-VPN group to Any-Trusted."],
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Mobile VPN"
  },
  {
    id: 65,
    question: "What is the purpose of enabling 'Perfect Forward Secrecy' (PFS) in your BOVPN Tunnel configuration? (Select one.)",
    options: [
      "To speed up Phase 1 negotiations using static DH keys",
      "To ensure a new Diffie-Hellman key exchange is performed during Phase 2 SA rekeys",
      "To automatically rotate the gateway pre-shared key every 24 hours",
      "To encrypt the Gateway ID name in Phase 1 negotiations"
    ],
    correctAnswer: "To ensure a new Diffie-Hellman key exchange is performed during Phase 2 SA rekeys",
    correctAnswers: ["To ensure a new Diffie-Hellman key exchange is performed during Phase 2 SA rekeys"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "BOVPN"
  },
  {
    id: 66,
    question: "Where in the Fireware Web UI can you check the active routing table of your Firebox? (Select one.)",
    options: ["Dashboard > Front Panel", "System Status > Routes", "Firewall > Policies", "Subscription Services > Diagnostics"],
    correctAnswer: "System Status > Routes",
    correctAnswers: ["System Status > Routes"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Logging & Monitoring"
  },
  {
    id: 67,
    question: "To manage a Firebox that is in its factory-default state, you can connect your computer to Interface 1 and open a web browser to which URL? (Select one.)",
    options: ["http://10.0.1.1:4126", "https://10.0.1.1:8080", "https://10.0.1.1:4135", "http://10.0.1.1:80"],
    correctAnswer: "https://10.0.1.1:8080",
    correctAnswers: ["https://10.0.1.1:8080"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 68,
    question: "You want to allow the marketing group to use FTP, but block all other departments. Which policy configuration accomplishes this? (Select one.)",
    options: [
      "Add the FTP policy with Source 'Marketing-Group' and Destination 'Any-External', placed above the Outgoing policy.",
      "Add the FTP policy with Source 'Any-Trusted' and Destination 'Any-External', with an exception for Marketing.",
      "Disable the default Outgoing policy and create FTP policies for each group.",
      "Add a custom FTP-proxy action with WebBlocker filters."
    ],
    correctAnswer: "Add the FTP policy with Source 'Marketing-Group' and Destination 'Any-External', placed above the Outgoing policy.",
    correctAnswers: ["Add the FTP policy with Source 'Marketing-Group' and Destination 'Any-External', placed above the Outgoing policy."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Policies"
  },
  {
    id: 69,
    question: "You have a single public IP address on your External interface (203.0.113.80). You want to host a web server (port 80) and a mail server (port 25) on different private internal IPs. Which NAT method should you use? (Select one.)",
    options: ["1-to-1 NAT", "Dynamic NAT", "Static NAT (SNAT)", "Policy-based NAT"],
    correctAnswer: "Static NAT (SNAT)",
    correctAnswers: ["Static NAT (SNAT)"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "NAT"
  },
  {
    id: 70,
    question: "What is the default subnet of Interface 1 (Trusted) on a factory-default Firebox? (Select one.)",
    options: ["192.168.1.1/24", "10.0.1.1/24", "10.0.0.1/24", "172.16.1.1/24"],
    correctAnswer: "10.0.1.1/24",
    correctAnswers: ["10.0.1.1/24"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Routing"
  },
  {
    id: 71,
    question: "In the HTTP Proxy, under which setting can you block files with specific extensions (like .zip or .rar) from being downloaded? (Select one.)",
    options: ["HTTP Request > Request Methods", "HTTP Response > Body Content Types", "HTTP Response > Header Fields", "WebBlocker Exception Rules"],
    correctAnswer: "HTTP Response > Body Content Types",
    correctAnswers: ["HTTP Response > Body Content Types"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Proxies"
  },
  {
    id: 72,
    question: "Which WatchGuard security subscription uses machine learning to identify malware signatures without traditional daily definition updates? (Select one.)",
    options: ["Gateway AntiVirus", "IntelligentAV", "APT Blocker", "DNSWatch"],
    correctAnswer: "IntelligentAV",
    correctAnswers: ["IntelligentAV"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Security Services"
  },
  {
    id: 73,
    question: "Which Mobile VPN type is native to major modern operating systems (Windows, macOS, iOS) and does not require third-party software installation? (Select one.)",
    options: ["Mobile VPN with SSL", "Mobile VPN with IKEv2", "Mobile VPN with OpenVPN", "Mobile VPN with IPSec (Legacy)"],
    correctAnswer: "Mobile VPN with IKEv2",
    correctAnswers: ["Mobile VPN with IKEv2"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Mobile VPN"
  },
  {
    id: 74,
    question: "While reviewing logs, you observe 'proposes phase two negotiation failed: Mismatched SA life'. How would you adjust the configuration to resolve this? (Select one.)",
    options: [
      "Configure a new pre-shared key in the Gateway settings.",
      "Adjust the Phase 2 Tunnel expiration time or kilobytes settings to match the remote peer.",
      "Change the Phase 1 Diffie-Hellman group in Gateway settings.",
      "Enable Perfect Forward Secrecy (PFS) in Gateway settings."
    ],
    correctAnswer: "Adjust the Phase 2 Tunnel expiration time or kilobytes settings to match the remote peer.",
    correctAnswers: ["Adjust the Phase 2 Tunnel expiration time or kilobytes settings to match the remote peer."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "BOVPN"
  },
  {
    id: 75,
    question: "Which service in a WatchGuard Dimension deployment stores historical reporting data? (Select one.)",
    options: ["Dimension Log Collector", "Dimension Server database", "Log Agent", "Report Engine Daemon"],
    correctAnswer: "Dimension Server database",
    correctAnswers: ["Dimension Server database"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Logging & Monitoring"
  },
  {
    id: 76,
    question: "Which status indicator light on the physical front panel of a Firebox indicates active management or configuration synchronization? (Select one.)",
    options: ["Power", "Arm/Disarm", "WIFI / Status", "Mode"],
    correctAnswer: "Arm/Disarm",
    correctAnswers: ["Arm/Disarm"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 77,
    question: "Which policy takes precedence if you have a policy allowing HTTP traffic from 'Any-Trusted' to 'Any-External', and a policy denying HTTP traffic from client '10.0.1.25' to 'Any-External' placed above it? (Select one.)",
    options: [
      "The 'Any-Trusted' policy, because it allows traffic.",
      "The policy for '10.0.1.25', because it is placed higher in the sequence.",
      "Neither, the Firebox will alternate between allowing and denying.",
      "The Outgoing policy will override both policies."
    ],
    correctAnswer: "The policy for '10.0.1.25', because it is placed higher in the sequence.",
    correctAnswers: ["The policy for '10.0.1.25', because it is placed higher in the sequence."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Policies"
  },
  {
    id: 78,
    question: "When configuring 1-to-1 NAT, what happens to outbound traffic originating from the mapped private host? (Select one.)",
    options: [
      "The source IP is translated to the external interface primary IP.",
      "The source IP is translated to the corresponding public IP in the 1-to-1 NAT range.",
      "The source IP is not translated.",
      "The outbound traffic is blocked unless Dynamic NAT is disabled."
    ],
    correctAnswer: "The source IP is translated to the corresponding public IP in the 1-to-1 NAT range.",
    correctAnswers: ["The source IP is translated to the corresponding public IP in the 1-to-1 NAT range."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "NAT"
  },
  {
    id: 79,
    question: "What happens to outbound internet traffic if all WAN connections become unavailable in an SD-WAN configuration? (Select one.)",
    options: [
      "The traffic is automatically routed over the high-availability sync interface.",
      "The Firebox drops the traffic or routes it over backup dial-up resources if configured.",
      "The traffic loopbacks to the Trusted interface.",
      "The Firebox enters a safe bypass mode and acts as a standard unmanaged hub."
    ],
    correctAnswer: "The Firebox drops the traffic or routes it over backup dial-up resources if configured.",
    correctAnswers: ["The Firebox drops the traffic or routes it over backup dial-up resources if configured."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Routing"
  },
  {
    id: 80,
    question: "Which of these proxies can intercept and control remote administrative sessions using protocols like RDP, SSH, or Telnet? (Select one.)",
    options: ["HTTP-proxy", "TCP-UDP-proxy", "SIP-proxy", "DNS-proxy"],
    correctAnswer: "TCP-UDP-proxy",
    correctAnswers: ["TCP-UDP-proxy"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Proxies"
  },
  {
    id: 81,
    question: "You want to block access to specific online streaming applications (like YouTube or Netflix) regardless of their URL domain. Which service should you configure? (Select one.)",
    options: ["WebBlocker", "Application Control", "APT Blocker", "DNSWatch"],
    correctAnswer: "Application Control",
    correctAnswers: ["Application Control"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Security Services"
  },
  {
    id: 82,
    question: "What virtual IP address pool should you assign to Mobile VPN with SSL clients? (Select one.)",
    options: [
      "A subnet that is identical to your local Trusted network subnet",
      "A subnet that does not overlap with any internal Trusted, Optional, or remote subnets",
      "A public class-C subnet to allow external routing",
      "The same subnet as Interface 0 (External)"
    ],
    correctAnswer: "A subnet that does not overlap with any internal Trusted, Optional, or remote subnets",
    correctAnswers: ["A subnet that does not overlap with any internal Trusted, Optional, or remote subnets"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Mobile VPN"
  },
  {
    id: 83,
    question: "In a Policy-Based BOVPN, what controls which traffic is allowed to traverse the VPN tunnel? (Select one.)",
    options: [
      "The Virtual Interface static routing table",
      "The VPN Gateway ID names",
      "Firewall policies with the BOVPN tunnel configured as action/destination",
      "The Dynamic routing protocol"
    ],
    correctAnswer: "Firewall policies with the BOVPN tunnel configured as action/destination",
    correctAnswers: ["Firewall policies with the BOVPN tunnel configured as action/destination"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "BOVPN"
  },
  {
    id: 84,
    question: "Which file format is used when you export log files from Firebox System Manager Traffic Monitor for offline analysis? (Select one.)",
    options: [".xml", ".log", ".csv", ".txt"],
    correctAnswer: ".log",
    correctAnswers: [".log"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Logging & Monitoring"
  },
  {
    id: 85,
    question: "To activate subscription services (like WebBlocker, GAV, etc.) on your Firebox, what must you import onto the device? (Select one.)",
    options: ["A Certificate Revocation List (CRL)", "A Feature Key file", "A firmware signature patch", "A WSM licensing template"],
    correctAnswer: "A Feature Key file",
    correctAnswers: ["A Feature Key file"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 86,
    question: "Can a user-defined alias contain FQDNs, IP addresses, and other aliases? (Select one.)",
    options: ["Yes", "No"],
    correctAnswer: "Yes",
    correctAnswers: ["Yes"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Policies"
  },
  {
    id: 87,
    question: "You are configuring a Static NAT (SNAT) mapping. What are the valid destinations you can specify in the SNAT action? (Select TWO.)",
    options: ["A single private IP address", "A domain name alias", "A virtual loopback IP address", "An IP address range or server pool with load balancing"],
    correctAnswer: "A single private IP address | An IP address range or server pool with load balancing",
    correctAnswers: ["A single private IP address", "An IP address range or server pool with load balancing"],
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "NAT"
  },
  {
    id: 88,
    question: "Which WatchGuard feature tests the latency, jitter, and packet loss of an interface link to determine optimal path routing for specific applications? (Select one.)",
    options: ["Multi-WAN Spillover", "SD-WAN", "Dynamic Routing OSPF", "Policy-Based Routing (PBR)"],
    correctAnswer: "SD-WAN",
    correctAnswers: ["SD-WAN"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Routing"
  },
  {
    id: 89,
    question: "When configuring WebBlocker exceptions, which of these match types can you use to define exception patterns? (Select THREE.)",
    options: [
      "Exact URL match",
      "Pattern match (using wildcards like *)",
      "Regular Expression match",
      "FQDN record mapping",
      "IP subnet zone"
    ],
    correctAnswer: "Exact URL match | Pattern match (using wildcards like *) | Regular Expression match",
    correctAnswers: ["Exact URL match", "Pattern match (using wildcards like *)", "Regular Expression match"],
    isMultiSelect: true,
    correctAnswersCount: 3,
    topic: "Security Services"
  },
  {
    id: 90,
    question: "What is the action options available in Gateway AntiVirus when a virus is detected in a scanned file? (Select THREE.)",
    options: ["Allow", "Block", "Drop", "Clean", "Quarantine"],
    correctAnswer: "Allow | Block | Drop",
    correctAnswers: ["Allow", "Block", "Drop"],
    isMultiSelect: true,
    correctAnswersCount: 3,
    topic: "Security Services"
  },
  {
    id: 91,
    question: "Which Mobile VPN client uses an installer containing a configuration file with the extension '.ovpn'? (Select one.)",
    options: ["Mobile VPN with SSL", "Mobile VPN with IKEv2", "Mobile VPN with L2TP", "Mobile VPN with IPSec (Legacy)"],
    correctAnswer: "Mobile VPN with SSL",
    correctAnswers: ["Mobile VPN with SSL"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Mobile VPN"
  },
  {
    id: 92,
    question: "What is the difference between a Virtual Interface BOVPN and a Policy-Based BOVPN? (Select one.)",
    options: [
      "Virtual Interface BOVPN does not encrypt tunnel traffic.",
      "Virtual Interface BOVPN creates a virtual interface that allows you to use standard static or dynamic routing rules.",
      "Policy-Based BOVPN is only supported on wireless Fireboxes.",
      "Virtual Interface BOVPN does not support IKEv2."
    ],
    correctAnswer: "Virtual Interface BOVPN creates a virtual interface that allows you to use standard static or dynamic routing rules.",
    correctAnswers: ["Virtual Interface BOVPN creates a virtual interface that allows you to use standard static or dynamic routing rules."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "BOVPN"
  },
  {
    id: 93,
    question: "You want to investigate if a hardware interface might be dropping packets due to physical link issues. Where can you view physical link-state logs (such as 'Link down')? (Select one.)",
    options: ["Traffic Monitor", "FSM Status Report > Log Message Center", "FSM System Status > Interfaces", "WSM Dimension Reports"],
    correctAnswer: "Traffic Monitor",
    correctAnswers: ["Traffic Monitor"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Logging & Monitoring"
  },
  {
    id: 94,
    question: "What is the default IP address of the Trusted interface on startup? (Select one.)",
    options: ["192.168.1.1", "10.0.1.1", "10.0.0.1", "192.168.0.1"],
    correctAnswer: "10.0.1.1",
    correctAnswers: ["10.0.1.1"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 95,
    question: "What physical interfaces are automatically added to the default Outgoing policy destination group? (Select one.)",
    options: ["Any-Trusted", "Any-External", "Any-Optional", "Any-Trusted and Any-Optional"],
    correctAnswer: "Any-External",
    correctAnswers: ["Any-External"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Policies"
  },
  {
    id: 96,
    question: "What is NAT Loopback used for? (Select one.)",
    options: [
      "To test the external interface viability by pinging itself",
      "To allow internal users to connect to local servers using their public IP addresses",
      "To bridge a VPN tunnel back to the trusted interface",
      "To cycle outbound traffic through multiple external interfaces"
    ],
    correctAnswer: "To allow internal users to connect to local servers using their public IP addresses",
    correctAnswers: ["To allow internal users to connect to local servers using their public IP addresses"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "NAT"
  },
  {
    id: 97,
    question: "What protocol does Link Monitor use to test the connectivity of a gateway when TCP Port Probes are configured? (Select one.)",
    options: ["ICMP", "TCP Syn handshake", "UDP diagnostic packets", "HTTP Get requests"],
    correctAnswer: "TCP Syn handshake",
    correctAnswers: ["TCP Syn handshake"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Routing"
  },
  {
    id: 98,
    question: "You want to allow remote administrators to connect via SSH to an internal server on port 22, but prevent them from executing specific file-transfer commands over SSH. Can a standard TCP-UDP packet filter accomplish this? (Select one.)",
    options: [
      "Yes, packet filters can parse SSH sub-commands.",
      "No, you must use an SSH-proxy with command filters.",
      "Yes, by restricting the source IP address.",
      "No, because SSH traffic is encrypted and cannot be inspected at all by the Firebox."
    ],
    correctAnswer: "No, because SSH traffic is encrypted and cannot be inspected at all by the Firebox.",
    correctAnswers: ["No, because SSH traffic is encrypted and cannot be inspected at all by the Firebox."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Proxies"
  },
  {
    id: 99,
    question: "Which WatchGuard security subscription service protects users from downloading files containing malware based on metadata reputation checks, before the file is fully downloaded? (Select one.)",
    options: ["Gateway AntiVirus", "APT Blocker", "Reputation Enabled Defense (RED)", "IntelligentAV"],
    correctAnswer: "Reputation Enabled Defense (RED)",
    correctAnswers: ["Reputation Enabled Defense (RED)"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Security Services"
  },
  {
    id: 100,
    question: "In a Firebox high availability Active/Passive configuration, how are configurations synchronized between the master and backup devices? (Select one.)",
    options: [
      "Administrators must manually upload the configuration to both devices.",
      "The master automatically synchronizes its configuration and state over the dedicated HA interface.",
      "The backup device pulls the configuration periodically from WatchGuard Cloud.",
      "The devices synchronize over Interface 0 (External)."
    ],
    correctAnswer: "The master automatically synchronizes its configuration and state over the dedicated HA interface.",
    correctAnswers: ["The master automatically synchronizes its configuration and state over the dedicated HA interface."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 101,
    question: "Which of the following is true regarding BOVPN over TLS? (Select one.)",
    options: [
      "It uses UDP port 500 for key exchange.",
      "It provides a way to pass BOVPN traffic through environments that block IPsec.",
      "It requires a third-party client installed on all hosts.",
      "It is only supported on Cloud-Managed Fireboxes."
    ],
    correctAnswer: "It provides a way to pass BOVPN traffic through environments that block IPsec.",
    correctAnswers: ["It provides a way to pass BOVPN traffic through environments that block IPsec."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "BOVPN"
  },
  {
    id: 102,
    question: "If a user complains they cannot reach a specific public website but other sites work, and you see 'Denied' messages in Traffic Monitor related to WebBlocker, what should you do first to resolve this while maintaining security? (Select one.)",
    options: [
      "Disable the WebBlocker service entirely.",
      "Add a WebBlocker exception for the specific website URL.",
      "Create a packet filter policy to allow all outbound traffic.",
      "Change the WebBlocker action for all categories to 'Allow'."
    ],
    correctAnswer: "Add a WebBlocker exception for the specific website URL.",
    correctAnswers: ["Add a WebBlocker exception for the specific website URL."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Security Services"
  },
  {
    id: 103,
    question: "When configuring a firewall policy, what happens if you select 'Auto-Order' in Policy Manager? (Select one.)",
    options: [
      "Policies are arranged alphabetically by name.",
      "The Firebox sorts policies from most specific to least specific.",
      "Policies are executed in parallel.",
      "The default Outgoing policy is moved to the top."
    ],
    correctAnswer: "The Firebox sorts policies from most specific to least specific.",
    correctAnswers: ["The Firebox sorts policies from most specific to least specific."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Policies"
  },
  {
    id: 104,
    question: "Which Firebox feature allows you to monitor and block applications like BitTorrent or Skype? (Select one.)",
    options: [
      "WebBlocker",
      "Application Control",
      "Intrusion Prevention Service (IPS)",
      "Gateway AntiVirus"
    ],
    correctAnswer: "Application Control",
    correctAnswers: ["Application Control"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Security Services"
  },
  {
    id: 105,
    question: "In what scenario would you use a Drop-In network configuration? (Select one.)",
    options: [
      "When you have multiple public IP addresses and want to route them to different internal subnets.",
      "When you want the Firebox to act transparently without changing the IP addresses of the internal and external networks.",
      "When configuring a high-availability active/active cluster.",
      "When you need to use NAT for all outbound traffic."
    ],
    correctAnswer: "When you want the Firebox to act transparently without changing the IP addresses of the internal and external networks.",
    correctAnswers: ["When you want the Firebox to act transparently without changing the IP addresses of the internal and external networks."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  }
,
  {
    id: 106,
    question: "When configuring AuthPoint MFA, which of these are valid authentication methods for users logging into the Fireware Web UI? (Select TWO.)",
    options: ["Push notification", "SMS passcodes", "Hardware token (TOTP)", "Voice call verification"],
    correctAnswer: "Push notification | Hardware token (TOTP)",
    correctAnswers: ["Push notification", "Hardware token (TOTP)"],
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Security Services"
  },
  {
    id: 107,
    question: "WatchGuard ThreatSync correlates events from the Firebox and which other endpoint agent to detect and remediate threats? (Select one.)",
    options: ["AuthPoint Agent", "WatchGuard Endpoint Security (EPDR)", "DNSWatchGO Client", "WatchGuard Mobile VPN Client"],
    correctAnswer: "WatchGuard Endpoint Security (EPDR)",
    correctAnswers: ["WatchGuard Endpoint Security (EPDR)"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Security Services"
  },
  {
    id: 108,
    question: "You want to divide your network into logical broadcast domains to separate the Accounting department from the Sales department on the same physical switch. What fundamental networking concept must be applied? (Select one.)",
    options: ["VLANs (Virtual Local Area Networks)", "STP (Spanning Tree Protocol)", "LACP (Link Aggregation Control Protocol)", "NAT (Network Address Translation)"],
    correctAnswer: "VLANs (Virtual Local Area Networks)",
    correctAnswers: ["VLANs (Virtual Local Area Networks)"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 109,
    question: "Which layer of the OSI model does the Firebox's standard Packet Filter policy primarily operate on to inspect source/destination IPs and port numbers? (Select TWO.)",
    options: ["Layer 2 (Data Link)", "Layer 3 (Network)", "Layer 4 (Transport)", "Layer 7 (Application)"],
    correctAnswer: "Layer 3 (Network) | Layer 4 (Transport)",
    correctAnswers: ["Layer 3 (Network)", "Layer 4 (Transport)"],
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Policies"
  },
  {
    id: 110,
    question: "What subnet mask is represented by the CIDR notation /27? (Select one.)",
    options: ["255.255.255.192", "255.255.255.224", "255.255.255.240", "255.255.255.248"],
    correctAnswer: "255.255.255.224",
    correctAnswers: ["255.255.255.224"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Routing"
  },
  {
    id: 111,
    question: "When configuring a Firebox as a DHCP server, what must you do to ensure a specific printer always receives the same IP address 10.0.1.50? (Select one.)",
    options: ["Create a 1-to-1 NAT policy for the printer", "Create a static MAC-to-IP address reservation", "Set the IP address as the gateway IP", "Exclude 10.0.1.50 from the DHCP scope and configure nothing else"],
    correctAnswer: "Create a static MAC-to-IP address reservation",
    correctAnswers: ["Create a static MAC-to-IP address reservation"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 112,
    question: "Which common port is utilized by the RDP (Remote Desktop Protocol) service by default, which should be strictly secured or blocked from the external network? (Select one.)",
    options: ["TCP 22", "TCP 443", "TCP 3389", "UDP 500"],
    correctAnswer: "TCP 3389",
    correctAnswers: ["TCP 3389"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Policies"
  },
  {
    id: 113,
    question: "You want to deploy an SSL VPN. What must be true about the IP address pool you assign to the SSL VPN clients? (Select one.)",
    options: ["It must be in the exact same subnet as the Trusted interface.", "It must be a publicly routable IP address range.", "It must not overlap with any routed internal networks or remote VPN subnets.", "It must always use the 192.168.113.0/24 subnet regardless of your network topology."],
    correctAnswer: "It must not overlap with any routed internal networks or remote VPN subnets.",
    correctAnswers: ["It must not overlap with any routed internal networks or remote VPN subnets."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Mobile VPN"
  },
  {
    id: 114,
    question: "In a network topology utilizing OSPF (Open Shortest Path First), which routing metric does OSPF use to determine the best path? (Select one.)",
    options: ["Hop Count", "Cost (based on link bandwidth)", "Delay", "Reliability"],
    correctAnswer: "Cost (based on link bandwidth)",
    correctAnswers: ["Cost (based on link bandwidth)"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Routing"
  },
  {
    id: 115,
    question: "Which of the following describes the difference between an Access port and a Trunk port on a managed switch connected to a Firebox? (Select one.)",
    options: [
      "Access ports carry traffic for multiple VLANs using 802.1Q tags, Trunk ports carry traffic for one untagged VLAN.",
      "Access ports carry traffic for a single untagged VLAN, Trunk ports carry traffic for multiple tagged VLANs.",
      "Access ports provide power over ethernet (PoE), Trunk ports provide data only.",
      "Access ports connect to routers, Trunk ports connect to end-user workstations."
    ],
    correctAnswer: "Access ports carry traffic for a single untagged VLAN, Trunk ports carry traffic for multiple tagged VLANs.",
    correctAnswers: ["Access ports carry traffic for a single untagged VLAN, Trunk ports carry traffic for multiple tagged VLANs."],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 116,
    question: "You enable the Gateway AntiVirus (GAV) service on your HTTP-proxy. Under what circumstances might GAV bypass scanning a downloaded ZIP file? (Select TWO.)",
    options: [
      "The ZIP file is password-encrypted.",
      "The ZIP file exceeds the configured scan size limit.",
      "The ZIP file contains a recognized executable.",
      "The ZIP file was downloaded via FTP."
    ],
    correctAnswer: "The ZIP file is password-encrypted. | The ZIP file exceeds the configured scan size limit.",
    correctAnswers: ["The ZIP file is password-encrypted.", "The ZIP file exceeds the configured scan size limit."],
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Security Services"
  },
  {
    id: 117,
    question: "Which IEEE protocol provides port-based network access control (PNAC) and can be used to authenticate devices before granting them access to the LAN? (Select one.)",
    options: ["802.11ax", "802.1Q", "802.1X", "802.3ad"],
    correctAnswer: "802.1X",
    correctAnswers: ["802.1X"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Security Services"
  },
  {
    id: 118,
    question: "You are setting up WatchGuard AuthPoint. What component must you install on your local network to integrate AuthPoint with your on-premises Active Directory server? (Select one.)",
    options: ["AuthPoint Agent for Windows", "AuthPoint Gateway", "WatchGuard AD Helper", "Active Directory Federation Services (ADFS)"],
    correctAnswer: "AuthPoint Gateway",
    correctAnswers: ["AuthPoint Gateway"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 119,
    question: "When analyzing a subnet mask of 255.255.255.128 (/25), how many usable host IP addresses are available in the subnet? (Select one.)",
    options: ["128", "126", "256", "254"],
    correctAnswer: "126",
    correctAnswers: ["126"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Routing"
  },
  {
    id: 120,
    question: "Which of the following actions can ThreatSync automatically perform if an endpoint is compromised? (Select TWO.)",
    options: ["Isolate the device from the network", "Kill the malicious process on the endpoint", "Format the endpoint's hard drive", "Uninstall the operating system"],
    correctAnswer: "Isolate the device from the network | Kill the malicious process on the endpoint",
    correctAnswers: ["Isolate the device from the network", "Kill the malicious process on the endpoint"],
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Security Services"
  },
  {
    id: 121,
    question: "To prevent DNS cache poisoning and man-in-the-middle attacks on DNS queries, what security extension can be enabled? (Select one.)",
    options: ["DNSSEC", "DNSWatch", "DoH (DNS over HTTPS)", "DMARC"],
    correctAnswer: "DNSSEC",
    correctAnswers: ["DNSSEC"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Security Services"
  },
  {
    id: 122,
    question: "You want to combine multiple physical interfaces into a single logical interface to increase bandwidth and provide redundancy. What feature should you configure? (Select one.)",
    options: ["Multi-WAN", "Link Aggregation (LAG) / LACP", "Bridge Network", "Spanning Tree Protocol (STP)"],
    correctAnswer: "Link Aggregation (LAG) / LACP",
    correctAnswers: ["Link Aggregation (LAG) / LACP"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  }
  ,
  {
    id: 123,
    question: "Which of the following ports does HTTPS use by default? (Select one.)",
    options: ["TCP/80", "TCP/443", "TCP/22", "UDP/53"],
    correctAnswer: "TCP/443",
    correctAnswers: ["TCP/443"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Policies"
  },
  {
    id: 124,
    question: "What subnet mask corresponds to a CIDR prefix of /24? (Select one.)",
    options: ["255.0.0.0", "255.255.0.0", "255.255.255.0", "255.255.255.255"],
    correctAnswer: "255.255.255.0",
    correctAnswers: ["255.255.255.0"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Routing"
  },
  {
    id: 125,
    question: "Which protocol is primarily used to automatically assign IP addresses to devices on a network? (Select one.)",
    options: ["DNS", "DHCP", "ARP", "ICMP"],
    correctAnswer: "DHCP",
    correctAnswers: ["DHCP"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 126,
    question: "When managing a WatchGuard Firebox locally, what is the default URL to access the Fireware Web UI on the Trusted interface? (Select one.)",
    options: ["https://10.0.1.1:8080", "http://10.0.1.1:80", "https://10.0.1.1:4100", "https://192.168.1.1:8080"],
    correctAnswer: "https://10.0.1.1:8080",
    correctAnswers: ["https://10.0.1.1:8080"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 127,
    question: "In the locally managed Fireware Web UI, where can you perform built-in network troubleshooting tasks like Ping, Traceroute, and DNS Lookup? (Select one.)",
    options: ["Dashboard > FireWatch", "System > Backup", "System Status > Diagnostics", "Network > Interfaces"],
    correctAnswer: "System Status > Diagnostics",
    correctAnswers: ["System Status > Diagnostics"],
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Logging & Monitoring"
  }
];

// Helper checks for verifying answers programmatically
export function verifyAnswer(questionId: number, selected: string[]): { isCorrect: boolean; correctAnswers: string[] } {
  const q = examQuestions.find(x => x.id === questionId);
  if (!q) return { isCorrect: false, correctAnswers: [] };

  const correctList = q.correctAnswers;
  
  if (q.isMultiSelect) {
    const isAllCorrect = selected.length === correctList.length && 
      correctList.every(ans => selected.includes(ans));
    return { isCorrect: isAllCorrect, correctAnswers: correctList };
  } else {
    const isSingleCorrect = selected.length === 1 && correctList[0] === selected[0];
    return { isCorrect: isSingleCorrect, correctAnswers: correctList };
  }
}
