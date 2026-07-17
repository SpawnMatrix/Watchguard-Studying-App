export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  isMultiSelect: boolean;
  correctAnswersCount: number; // for multi-select
  topic: "NAT" | "Mobile VPN" | "BOVPN" | "Routing" | "Policies" | "Proxies" | "Security Services" | "Initial Setup" | "Logging & Monitoring";
}

export const examQuestions: Question[] = [
  {
    id: 1,
    question: "Which of these is a default Class B subnet mask? (Select one.)",
    options: ["/8", "/12", "/16", "/24", "/28"],
    correctAnswer: "/16",
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
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Policies"
  },
  {
    id: 4,
    question: "You can configure Dynamic NAT to route incoming connections from the Internet to two different FTP servers on the trusted network. (Select one.)",
    options: ["True", "False"],
    correctAnswer: "False",
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "NAT"
  },
  {
    id: 5,
    question: "What port and protocol is used by default for DNS query resolution? (Select one.)",
    options: ["UDP/67", "UDP/53", "TCP/20", "TCP/25"],
    correctAnswer: "UDP/53",
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
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "NAT"
  },
  {
    id: 7,
    question: "While troubleshooting a branch office VPN tunnel, you see the log message: 'iked (203.0.113.50<->203.0.113.20) Peer proposes phase two negotiation failed: Received proposal without PFS, Expecting PFS enabled'. Which setting should you modify? (Select one.)",
    options: [
      "BOVPN Gateway settings",
      "BOVPN Tunnel settings",
      "BOVPN over TLS settings",
      "IKEv2 Shared settings"
    ],
    correctAnswer: "BOVPN Tunnel settings",
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
    correctAnswer: "Route to 10.0.20.0/24, Gateway 192.168.10.5", // We will handle double-checking answers programmatically
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Routing"
  },
  {
    id: 9,
    question: "You can use the TCP-UDP proxy to control Web, FTP, and SIP traffic on ports other than standard 80, 21, and 5060. (Select one.)",
    options: ["True", "False"],
    correctAnswer: "True",
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Proxies"
  },
  {
    id: 10,
    question: "Which authentication servers can be used with any type of Mobile VPN? (Select TWO.)",
    options: ["Firebox-DB", "Active Directory", "RADIUS", "LDAP"],
    correctAnswer: "Firebox-DB", // Multi-select correct handles Firebox-DB and RADIUS
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Mobile VPN"
  },
  {
    id: 11,
    question: "When your device is in a default state, to which interface do you connect your management computer so you can use the Quick Setup Wizard? (Select one.)",
    options: ["Interface 0 (External)", "Console interface", "Interface 2 (Optional)", "Interface 1 (Trusted)"],
    correctAnswer: "Interface 1 (Trusted)",
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Initial Setup"
  },
  {
    id: 12,
    question: "In the default Firebox configuration file, which policies control management access to the device? (Select TWO.)",
    options: ["WatchGuard", "FTP", "Ping", "WatchGuard Web UI", "Outgoing"],
    correctAnswer: "WatchGuard",
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Policies"
  },
  {
    id: 13,
    question: "To use the Web Setup Wizard or Quick Setup Wizard to configure your Firebox, your computer must have an IP address on which subnet? (Select one.)",
    options: ["10.0.10.0/24", "10.0.1.0/24", "172.16.10.0/24", "192.168.1.0/24"],
    correctAnswer: "10.0.1.0/24",
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
    correctAnswer: "Configuration file",
    isMultiSelect: true,
    correctAnswersCount: 4,
    topic: "Initial Setup"
  },
  {
    id: 15,
    question: "The policies in a default Firebox configuration do not allow outgoing traffic from optional interfaces. (Select one.)",
    options: ["True", "False"],
    correctAnswer: "False",
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
    correctAnswer: "Enable the AUTO-block sites that attempt to connect option in a deny policy.",
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
    correctAnswer: "Denial of service attacks",
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
    correctAnswer: "HTTP port 80",
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
    correctAnswer: "Only a proxy policy can prevent specific threats without blocking the entire connection.",
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Proxies"
  },
  {
    id: 21,
    question: "For which of these third-party authentication methods must you specify a search base? (Select TWO.)",
    options: ["RADIUS", "Active Directory", "SecurID", "LDAP"],
    correctAnswer: "Active Directory",
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
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Policies"
  },
  {
    id: 23,
    question: "Which takes precedence: a WebBlocker category match or a WebBlocker exception? (Select one.)",
    options: ["WebBlocker exception", "WebBlocker category match"],
    correctAnswer: "WebBlocker exception",
    isMultiSelect: false,
    correctAnswersCount: 1,
    topic: "Security Services"
  },
  {
    id: 24,
    question: "Which of these options must you configure in an HTTPS-proxy policy to detect credit card numbers in HTTP traffic that is encrypted with SSL? (Select TWO.)",
    options: ["WebBlocker", "Gateway AntiVirus", "Application Control", "Content Inspection", "Data Loss Prevention"],
    correctAnswer: "Content Inspection",
    isMultiSelect: true,
    correctAnswersCount: 2,
    topic: "Proxies"
  }
];

// Helper checks for double correct answers (e.g., verifying multi-select answers)
export function verifyAnswer(questionId: number, selected: string[]): { isCorrect: boolean; correctAnswers: string[] } {
  const q = examQuestions.find(x => qIdMatches(x, questionId));
  if (!q) return { isCorrect: false, correctAnswers: [] };

  // Hardcoded multiple answers map
  const answersMap: Record<number, string[]> = {
    8: ["Route to 10.0.20.0/24, Gateway 192.168.10.5", "Route to 10.0.20.80, Gateway 192.168.10.5"],
    10: ["Firebox-DB", "RADIUS"],
    12: ["WatchGuard", "WatchGuard Web UI"],
    14: ["Configuration file", "Certificates", "Passwords", "Feature keys"],
    17: [
      "Enable the AUTO-block sites that attempt to connect option in a deny policy.",
      "On the Firebox System Manager > Blocked Sites tab, select Add.",
      "In Policy Manager, select Setup > Default Threat Protection > Blocked Sites and click Add."
    ],
    18: ["Denial of service attacks", "Flood attacks", "Port scans", "IP spoofing"],
    19: ["HTTP port 80", "HTTPS port 443", "DNS port 53"],
    20: [
      "Only a proxy policy can prevent specific threats without blocking the entire connection.",
      "Only a proxy works at the application, network, and transport layers to examine all connection data."
    ],
    21: ["Active Directory", "LDAP"],
    24: ["Content Inspection", "Data Loss Prevention"]
  };

  const correctList = answersMap[q.id] || [q.correctAnswer];
  
  if (q.isMultiSelect) {
    const isAllCorrect = selected.length === correctList.length && 
      selected.every(ans => correctList.some(msg => matchesString(msg, ans)));
    return { isCorrect: isAllCorrect, correctAnswers: correctList };
  } else {
    const isSingleCorrect = selected.length === 1 && matchesString(correctList[0], selected[0]);
    return { isCorrect: isSingleCorrect, correctAnswers: correctList };
  }
}

function qIdMatches(q: any, id: number) {
  return q.id === id;
}

function matchesString(correct: any, selected: any) {
  if (typeof correct === 'function') {
    return correct(selected);
  }
  return correct === selected;
}
