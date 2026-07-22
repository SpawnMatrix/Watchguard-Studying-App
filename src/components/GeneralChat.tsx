import { useState, useRef, useEffect } from "react";
import { Sparkles, Bot } from "lucide-react";
import { Message, QAItem } from "../types/chat";
import AIChatMode from "./AIChatMode";
import QADeskMode from "./QADeskMode";

const LOCAL_QA_DATABASE: QAItem[] = [
  {
    id: 1,
    category: "Setup",
    question: "What are the default interface settings on a factory-reset Firebox?",
    answer: "• **Interface 0 (Eth0)**: External zone, configured as a DHCP Client to receive a public IP address from your ISP automatically.\n• **Interface 1 (Eth1)**: Trusted zone, configured with static IP **10.0.1.1** and subnet mask **255.255.255.0 (/24)**. DHCP Server is enabled on Eth1 by default, distributing IP addresses from 10.0.1.2 through 10.0.1.254.\n• **Interface 2 (Eth2)**: Optional zone, which acts as a DMZ or secondary perimeter by default with no initial static IP configured until set by an administrator.",
    keywords: ["factory", "default", "interface", "eth1", "eth0", "10.0.1.1", "trusted", "external", "dhcp"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/initial_setup/factory_default_settings_c.html"
  },
  {
    id: 2,
    category: "Setup",
    question: "What ports are used to manage a locally-managed Firebox?",
    answer: "• **Web UI (HTTPS)**: Port **8080** (e.g., `https://10.0.1.1:8080`). This is the primary portal for web-based configurations.\n• **Firebox System Manager (FSM)**: Port **4105**. This proprietary thick client provides real-time Traffic Monitor, Policy Checker, and TCP Dump.\n• **WatchGuard System Manager (WSM)**: Port **4118** is used for secure communications and policy saves between WSM / Policy Manager and the Firebox.",
    keywords: ["management", "port", "8080", "4105", "4118", "webui", "fsm", "wsm", "system manager"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/initial_setup/connect_to_webui_c.html"
  },
  {
    id: 3,
    category: "Policies",
    question: "Explain Policy Precedence and how 'Auto-Order' mode processes rules.",
    answer: "The Firebox processes security policies sequentially from **top to bottom** (first match wins). \n\n• **Specific rules** (such as single-host IP filters or specific port mappings) must always be placed **above general rules** (such as Any-Trusted to Any-External) in the policy list.\n• In **Auto-Order Mode**, the Firebox automatically organizes rules so that specific policies (smaller IP subnets or specific ports) are evaluated before general policies (Any-Trusted).\n• Custom rules can be manually dragged to override Auto-Order, but caution is advised to avoid shadow-blocking traffic.",
    keywords: ["precedence", "order", "auto-order", "policy", "sequence", "rules", "evaluation"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/policies/policy_precedence_about_c.html"
  },
  {
    id: 4,
    category: "Policies",
    question: "What is the difference between Packet Filters and Proxy Policies?",
    answer: "• **Packet Filters**: Operate at Layer 3 (Network) and Layer 4 (Transport). They inspect only IP headers, port numbers, and protocol codes. They are extremely fast but completely blind to the actual content/data passing through.\n• **Proxies (Application Layer Gateways)**: Operate at Layer 7 (Application). They intercept the connection, terminate the TCP handshake, reconstruct and parse the payload, enforce strict RFC protocol standards, and can inspect MIME types, block malicious patterns, or scan files.",
    keywords: ["packet filter", "proxy", "layer 7", "layer 3", "difference", "alg", "application"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/proxies/proxy_about_c.html"
  },
  {
    id: 5,
    category: "Policies",
    question: "How does HTTPS Content Inspection work and how is certificate trust established?",
    answer: "HTTPS Content Inspection is deep packet inspection (DPI) for encrypted traffic. \n\n1. The Firebox intercepts the HTTPS request from a client device.\n2. It decrypts the SSL/TLS session, scans the underlying HTTP traffic with configured HTTP Proxy actions (WebBlocker, GAV, APT Blocker), and then re-encrypts the stream.\n3. To re-encrypt, the Firebox signs the traffic on-the-fly using its **Proxy Authority Certificate**.\n4. **Establishing Trust**: To avoid browser warning alerts, you must import this certificate into each client device's **Trusted Root Certification Authorities** store. Clients can download this certificate directly from `http://<firebox-ip>:4126/certportal`.",
    keywords: ["https", "inspection", "dpi", "content inspection", "certificate", "root ca", "proxy authority", "certportal", "4126"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/proxies/https/https_proxy_contentinspect_about_c.html"
  },
  {
    id: 6,
    category: "Routing",
    question: "What is NAT Loopback and when should I use it?",
    answer: "NAT Loopback (also called Hairpin NAT) allows internal clients on Trusted or Optional interfaces to connect to a public-facing server (e.g., an internal web server mapped via Static NAT) using its **public IP address or public domain name** rather than its internal private IP.\n\nWithout NAT Loopback, internal requests to the public IP would be dropped because the Firebox external interface doesn't route packets that originate from and terminate in the same internal subnets.",
    keywords: ["nat loopback", "hairpin", "snat", "static nat", "loopback", "internal server"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/nat/nat_loopback_c.html"
  },
  {
    id: 7,
    category: "Routing",
    question: "What is 1-to-1 NAT and is it bi-directional?",
    answer: "Yes, **1-to-1 NAT** is a fully bi-directional network address translation mapping. \n\nIt maps a single public IP address (or range of public IPs) to a single internal private IP address (or matching range of private IPs). Outbound traffic from the internal host is translated to the mapped public IP, and inbound traffic directed to the public IP is automatically routed to the internal private IP, bypassing default dynamic outbound NAT.",
    keywords: ["1-to-1 nat", "bidirectional", "mapping", "range", "public ip", "private ip"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/nat/nat_1to1_about_c.html"
  },
  {
    id: 8,
    category: "VPN",
    question: "What is the difference between BOVPN Phase 1 and Phase 2?",
    answer: "• **Phase 1 (Gateway)**: Negotiates the primary security handshake between the two physical Firebox endpoints. It authenticates peers using a **Pre-Shared Key** or certificate, selects Phase 1 encryption/hashing (AES/SHA), and defines **Gateway IDs**. If Phase 1 fails, the tunnel cannot start.\n• **Phase 2 (Tunnel)**: Negotiates the specific secure tunnel parameters for routing traffic between subnets. It defines matching **local and remote network ranges** (tunnel routes) and IPSec protocols (ESP/AH) with Perfect Forward Secrecy (PFS) settings.",
    keywords: ["bovpn", "phase 1", "phase 2", "gateway", "tunnel", "proposal", "pre-shared key"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/bovpn/manual/bovpn_manual_about_c.html"
  },
  {
    id: 9,
    category: "Diagnostics",
    question: "How long is an IP address blocked by default on the Blocked Sites list, and how does it work?",
    answer: "When default threat protection or IPS detects an attack, the offending source IP address is dynamically added to the **Temporary Blocked Sites** list.\n\n• **Default Duration**: **20 minutes**.\n• This duration is fully customizable by administrators under Global settings. \n• Administrators can also manually add IPs permanently under the **Permanent Blocked Sites** tab in Policy Manager.",
    keywords: ["blocked sites", "blocked", "temporary", "20 minutes", "ips", "attack", "threat protection"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/intrusionprevention/blocked_sites_about_c.html"
  },
  {
    id: 10,
    category: "Diagnostics",
    question: "What does the Policy Checker tool do in Firebox System Manager?",
    answer: "The **Policy Checker** is a diagnostic utility that allows you to simulate a packet by entering: \n- Source IP address / Interface\n- Destination IP address\n- Destination Port\n- Protocol (TCP, UDP, etc.)\n\nThe tool immediately returns **which specific security policy** in the active Firebox configuration matches that traffic pattern, indicating whether the packet would be Allowed, Denied, or Dropped. This is invaluable for troubleshooting shadow policies.",
    keywords: ["policy checker", "simulator", "traffic", "matching", "fsm", "diagnostic", "troubleshoot"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/fsm/diagnostic_tasks_policy_check_fsm_c.html"
  },
  {
    id: 11,
    category: "Routing",
    question: "Which dynamic routing protocols does Fireware support?",
    answer: "WatchGuard Fireware supports three primary industry-standard dynamic routing protocols, as well as multicast routing:\n\n• **OSPF (Open Shortest Path First)**: A link-state protocol ideal for medium-to-large internal network routing. Configured using dynamic routing scripts in Policy Manager.\n• **BGP v4 (Border Gateway Protocol)**: A path-vector protocol used for external routing and multihoming with Internet Service Providers.\n• **RIP v1/v2 (Routing Information Protocol)**: A legacy distance-vector protocol using hop counts.\n\nTo enable dynamic routing, you write a standard Zebra configuration syntax file under Network > Dynamic Routing.",
    keywords: ["dynamic routing", "ospf", "bgp", "rip", "zebra", "routing protocol", "multicast"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/routing/dynamic_routing_about_c.html"
  },
  {
    id: 12,
    category: "Routing",
    question: "What are the four Multi-WAN configuration modes on a Firebox?",
    answer: "If you have multiple external interfaces configured, you can select from four Multi-WAN modes:\n\n• **Routing Table**: The Firebox routes connections based on standard metrics and static route definitions in its local routing table.\n• **Round-Robin**: Distributes outbound connections across active WAN links based on relative interface weights.\n• **Failover**: Routes all outbound traffic through the primary WAN interface. Traffic automatically switches to the backup interface only if the primary link monitor fails.\n• **Interface Overflow**: Sends traffic through the primary interface until it reaches a user-defined bandwidth threshold, then overflows new connections onto the next interface.",
    keywords: ["multi-wan", "round robin", "failover", "overflow", "routing table", "isp", "redundancy"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/multi-wan/multi_wan_methods_c.html"
  },
  {
    id: 13,
    category: "Routing",
    question: "How does SD-WAN differ from Multi-WAN, and how does it measure link quality?",
    answer: "• **Multi-WAN** is a global setting that determines general connection routing across all WAN interfaces.\n• **SD-WAN** is a granular policy-based routing override. It tests specific interfaces for performance-based parameters such as **latency**, **jitter**, and **packet loss**.\n\nIf an active link drops below your specified thresholds, SD-WAN dynamically reroutes high-priority traffic (like VoIP or video calls) over a healthy interface. SD-WAN relies on **Link Monitors** configured to ping trusted public targets (like Google DNS or Cloudflare) to continuously gauge packet metrics.",
    keywords: ["sd-wan", "latency", "jitter", "packet loss", "link monitor", "voip", "metrics"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/sd-wan/sd-wan_about_c.html"
  },
  {
    id: 14,
    category: "VPN",
    question: "What are the key technical and port differences between Mobile VPN types?",
    answer: "WatchGuard supports four distinct client-to-site VPN types with different network characteristics:\n\n• **Mobile VPN with IKEv2**: Fast, stable, supports native OS clients (Windows/Mac/iOS). Relies on **UDP ports 500 and 4500**.\n• **Mobile VPN with SSL**: Best for bypassing restrictive firewalls because it wraps traffic in standard SSL/TLS tunnels. Relies on **TCP port 443** (default fallback is 443, highly customizable).\n• **Mobile VPN with L2TP**: Native OS support, encapsulated in IPSec. Uses **UDP ports 500, 4500, and 1701**.\n• **Mobile VPN with IPSec (Legacy)**: Proprietary WatchGuard IPSec client. Uses **UDP ports 500 and 4500, and IP protocol 50 (ESP)**.",
    keywords: ["mobile vpn", "ikev2", "ssl", "l2tp", "ipsec", "ports", "443", "4500", "500"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/mvpn/mvpn_comparison_c.html"
  },
  {
    id: 15,
    category: "VPN",
    question: "What is the structural difference between Virtual Interface BOVPN and Policy-Based BOVPN?",
    answer: "• **Policy-Based BOVPN**: Binds secure communication strictly to static policies. Traffic is defined by explicit local/remote IP pairs matching the gateway selectors. Perfect Forward Secrecy (PFS) is applied directly on the policy action.\n• **Virtual Interface BOVPN**: Creates a logical virtual tunnel interface (e.g., `bvpn1`). Because it behaves like a standard physical interface, you can route traffic over it using static routes, dynamic routing (OSPF), or SD-WAN. This is much more flexible and is the modern standard for hub-and-spoke mesh topologies.",
    keywords: ["virtual interface", "bovpn", "policy-based", "bvpn", "static route", "tunnel", "mesh"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/bovpn/manual/bovpn_virtual_interface_about_c.html"
  },
  {
    id: 16,
    category: "Policies",
    question: "What actions can you configure for WebBlocker categories, and how can they be overridden?",
    answer: "WebBlocker allows you to filter web requests using a cloud-hosted URL database. For each category (e.g., Gambling, Hacking), you can assign one of four actions:\n\n• **Allow**: Permit the connection.\n• **Deny**: Block the request and display a standard custom blocked page.\n• **Drop**: Silently close the TCP connection with no response to the browser.\n• **Warn**: Display a splash warning page, but allow the user to click 'Continue' to access the site.\n\n• **Override Password**: You can configure a master override password, which allows authorized users to temporarily bypass blocked pages by entering the administrative credentials on the screen.",
    keywords: ["webblocker", "deny", "drop", "warn", "override", "password", "categories"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/services/wb/webblocker_about_c.html"
  },
  {
    id: 17,
    category: "Policies",
    question: "How do Gateway AntiVirus, IntelligentAV, and APT Blocker compare?",
    answer: "These security subscriptions represent layered defense mechanics for malware scanning on a Firebox:\n\n• **Gateway AntiVirus (GAV)**: Relies on traditional signature matching. Scans files traversing HTTP, FTP, SMTP proxies on-the-fly against a local cache of known virus definitions.\n• **IntelligentAV (IAV)**: Uses a local, machine-learning-based artificial intelligence engine to identify new and zero-day files without relying on strict signature releases.\n• **APT Blocker**: Advanced Persistent Threat blocker. For files matching high-risk signatures or unknown binaries, it uploads the file to a secure cloud-hosted **Next-Gen Sandbox**, executing the code in simulated virtual environments to analyze runtime behavior.",
    keywords: ["gateway antivirus", "gav", "intelligentav", "apt blocker", "sandbox", "malware", "signature"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/services/apt/apt_blocker_about_c.html"
  },
  {
    id: 18,
    category: "Policies",
    question: "What is DNSWatch, and how is it different from DNS-Proxy?",
    answer: "• **DNS-Proxy**: An application layer gateway policy that inspects outgoing DNS traffic (port 53). It verifies that DNS packets strictly follow RFC standards, intercepts malicious domain lookups, and can rewrite responses to block dangerous IPs locally.\n• **DNSWatch**: A cloud-managed subscription service. When enabled, the Firebox intercepts outbound DNS queries and forwards them to WatchGuard's secure DNSWatch servers. These servers check domains against a real-time feed of phishing and malicious domains, automatically redirecting users to a safe educational site if a threat is matched.",
    keywords: ["dnswatch", "dns-proxy", "dns", "phishing", "domain lookup", "rfc", "dns redirection"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/services/dnswatch/dnswatch_about_c.html"
  },
  {
    id: 19,
    category: "Diagnostics",
    question: "What is Threat Detection and Response (TDR), and what role do Host Sensors play?",
    answer: "Threat Detection and Response (TDR) is a security platform that correlates security events from your Firebox with local data collected from end-user devices.\n\n• **Host Sensors**: Lightweight agents installed on workstations and servers on your network. They track internal registry adjustments, local process launches, and binary behaviors.\n• **Correlator**: The TDR cloud service analyzes network logs alongside host reports, scoring events. If an endpoint is infected with ransomware, TDR can automatically direct the Host Sensor to quarantine the process, block the IP, or roll back encrypted files.",
    keywords: ["tdr", "threat detection", "host sensor", "correlator", "endpoint", "quarantine"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/services/tdr/tdr_about_c.html"
  },
  {
    id: 20,
    category: "Diagnostics",
    question: "How do Firebox Logging, Syslog, and Dimension servers integrate?",
    answer: "The Firebox generates real-time logs that can be offloaded for historical reporting and compliance. Outbound logging options include:\n\n• **WatchGuard Log Server / Dimension**: A dedicated, secure database server. The Firebox forwards logs using encrypted proprietary streams on **TCP Port 4115**.\n• **Syslog**: Standard RFC 5424 protocol. The Firebox can mirror traffic monitors to an external Syslog receiver over standard UDP/TCP Port 514.\n\n• **FSM Traffic Monitor**: Shows real-time lines running on the Firebox. These are volatile; long-term analytical graphing, user dashboards, and historical searching require a centralized WatchGuard Dimension or Cloud instance.",
    keywords: ["logging", "dimension", "syslog", "log server", "traffic monitor", "4115", "514"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/logging/logs_dimension_about_c.html"
  },
  {
    id: 21,
    category: "Setup",
    question: "What is the difference between Active/Passive and Active/Active FireCluster High Availability?",
    answer: "FireCluster allows you to group two physical Fireboxes of the same exact model into a high-availability cluster:\n\n• **Active/Passive**: One master device handles 100% of the active traffic. The second backup device stays synchronized over dedicated HA links. If the master fails, the passive device inherits virtual MACs instantly with zero dropped sessions.\n• **Active/Active**: Both devices actively inspect traffic simultaneously. The master device receives external packets and load-balances them to the backup device using multicast. This increases total processing throughput, but requires a switch that correctly handles static multicast ARP tables.",
    keywords: ["firecluster", "active passive", "active active", "high availability", "multicast", "failover", "cluster"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/firecluster/firecluster_about_c.html"
  },
  {
    id: 22,
    category: "Setup",
    question: "What is a Feature Key, and how do you activate subscription services on a Firebox?",
    answer: "A **Feature Key** is a signed text file that defines the licensed features, node limits, and security subscription expiration dates for a specific Firebox serial number.\n\n• On startup, you must activate your Firebox on the WatchGuard portal to generate this key.\n• To import, you paste the text directly into the Firebox Web UI or Policy Manager.\n• If a security subscription (like GAV or WebBlocker) expires, the Firebox will block or bypass scans based on your 'Error Action' rules, and won't download updated threat signatures until a renewed Feature Key is imported.",
    keywords: ["feature key", "serial number", "activation", "license", "expiration", "renew"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/initial_setup/feature_key_import_c.html"
  },
  {
    id: 23,
    category: "Setup",
    question: "How do backups on a Firebox work, and what is the difference between FXI and XML files?",
    answer: "Firebox recovery and backup configurations are handled in two different formats:\n\n• **XML Configuration File**: Saves only the network, policy, and routing configurations. It is model-independent, meaning you can export an XML file from an older model (like a T35) and import it onto a newer model (like a T40) to migrate policies.\n• **FXI Flash Backup Image**: An exact bit-by-bit recovery snapshot of the entire Firebox, including the operating system (Fireware OS version), active feature keys, local certificates, and configuration. These are strictly model-specific and can only be restored on the exact same hardware model.",
    keywords: ["backup", "fxi", "xml", "restore", "migration", "flash image", "recovery"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/initial_setup/backup_and_restore_c.html"
  },
  {
    id: 24,
    category: "Setup",
    question: "Which authentication servers can a Firebox integrate with for security policies and VPNs?",
    answer: "To enforce user-specific policies or VPN logins, the Firebox can validate credentials against several authentication engines:\n\n• **Firebox-DB**: A local database stored on the Firebox itself. Ideal for small environments.\n• **RADIUS**: Integrates with external enterprise servers. Uses UDP ports 1812 (authentication) and 1813 (accounting).\n• **Active Directory / LDAP**: Connects to Windows Domain Controllers to validate domain user groups directly.\n• **SAML (Security Assertion Markup Language)**: Used to integrate with Single Sign-On (SSO) providers like Okta, Azure AD, or Duo for multi-factor security.",
    keywords: ["authentication", "radius", "active directory", "ldap", "firebox-db", "saml", "sso"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/authentication/auth_servers_about_c.html"
  },
  {
    id: 25,
    category: "Diagnostics",
    question: "What core diagnostic tools are available in Firebox System Manager (FSM) Diagnostic Tasks?",
    answer: "If you encounter network packet issues, the **FSM Diagnostic Tasks** utility provides four main terminal-equivalent programs running directly on the Firebox CPU:\n\n• **Ping**: Tests ICMP echo response to verify Layer 3 connectivity to local or internet nodes.\n• **Traceroute**: Maps each router hop to trace the path packets take through the WAN interface.\n• **DNS Lookup**: Queries local or external DNS servers to test resolving fully qualified domain names.\n• **TCP Dump**: Captures physical interface packets. You can filter by host, port, or protocol, and export the file in **PCAP format** to open and analyze in Wireshark.",
    keywords: ["diagnostic tasks", "ping", "traceroute", "dns lookup", "tcp dump", "pcap", "wireshark"],
    refLink: "https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/fsm/diagnostic_tasks_fsm_c.html"
  }
];

export default function GeneralChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      sender: "bot",
      text: "Hello! I am your WatchGuard Certified Network Security Essentials tutor. I am a Level 3 Systems Engineer here to help you study policy configuration, routing, NAT structures, and VPN configurations for locally-managed Fireboxes. \n\nWhat are you currently reviewing? Ask me anything, or pick one of the quick study paths below!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Dynamic state loaded from backend
  const [mode, setMode] = useState<"ai" | "qa">("qa"); // Default to QA (Local Syllabus Reference Desk) as requested!
  const [isAIFeaturesEnabledState, setIsAIFeaturesEnabledState] = useState(false);
  const [globalAIEnabled, setGlobalAIEnabled] = useState(false);

  const categories = ["All", "Setup", "Policies", "Routing", "VPN", "Diagnostics"];

  const suggestedPrompts = [
    "What are the factory default interface settings?",
    "Explain policy precedence and Auto-Order mode",
    "How does NAT Loopback work on a Firebox?",
    "How do I set up Content Inspection in HTTPS-proxy?"
  ];

  // Fetch AI and Global states on mount
  useEffect(() => {
    const customKey = localStorage.getItem("watchguard_custom_gemini_api_key") || "";
    fetch("/api/features", {
      headers: { "X-Gemini-API-Key": customKey }
    })
      .then(res => res.json())
      .then(data => {
        setIsAIFeaturesEnabledState(data.enableAIFeatures);
        setGlobalAIEnabled(data.globalAIEnabled);
        // If AI is globally enabled or has a custom key, allow them to use AI. Otherwise, keep them in QA.
        if (data.enableAIFeatures) {
          setMode("ai");
        } else {
          setMode("qa");
        }
      })
      .catch(err => errorHandler.error("Failed to query initial feature status", err));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const customKey = localStorage.getItem("watchguard_custom_gemini_api_key") || "";
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (customKey) {
        headers["X-Gemini-API-Key"] = customKey;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: text,
          history: messages.slice(-10) // Send recent context
        })
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with training API.");
      }

      const data = await response.json();
      
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: data.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        requiresExternalLookup: data.requiresExternalLookup,
        suggestedSearchTerms: data.suggestedSearchTerms,
        isDemo: data.isDemoMode
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error: any) {
      errorHandler.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        sender: "bot",
        text: `⚠️ **System Connection Error**: Unable to contact local tutor daemon.\n\n*Error details:* ${error.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-watchguard-gray border border-watchguard-border rounded-xl overflow-hidden shadow-2xl ">
      {/* Mentor Dual-Mode Navigation Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-6 py-4 bg-watchguard-lightgray border-b border-watchguard-border gap-3">
        {/* Tutor Identity */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-watchguard-orange/15 rounded-lg border border-watchguard-orange/40 flex-shrink-0">
            <Bot className="w-5 h-5 text-watchguard-orange" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-white tracking-tight">
              WatchGuard Certified Study Companion
            </h2>
            <div className="flex items-center space-x-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isAIFeaturesEnabledState ? "bg-green-500 animate-ping" : "bg-gray-500"}`}></span>
              <span className="text-[10px] font-mono text-gray-400">
                {isAIFeaturesEnabledState ? "AI Tutor Mode Authorized" : "Syllabus Reference mode"}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Mode Switch Toggles */}
        <div className="flex items-center bg-watchguard-dark/80 p-0.5 rounded-lg border border-watchguard-border self-start sm:self-center font-mono">
          <button
            onClick={() => setMode("qa")}
            className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
              mode === "qa"
                ? "bg-watchguard-orange text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Syllabus Q&A Desk
          </button>
          <button
            onClick={() => {
              if (!isAIFeaturesEnabledState) {
                alert("AI features are currently toggled offline by the administrator or require your own override key in the Admin Panel.");
              }
              setMode("ai");
            }}
            className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center space-x-1 ${
              mode === "ai"
                ? "bg-watchguard-orange text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Interactive AI Tutor</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Mode Arena Stage */}
      {mode === "ai" ? (
        <AIChatMode
          messages={messages}
          isLoading={isLoading}
          inputValue={inputValue}
          setInputValue={setInputValue}
          handleSend={handleSend}
          scrollRef={scrollRef}
          suggestedPrompts={suggestedPrompts}
        />
      ) : (
        <QADeskMode
          qaDatabase={LOCAL_QA_DATABASE}
          categories={categories}
        />
      )}
    </div>
  );
}
