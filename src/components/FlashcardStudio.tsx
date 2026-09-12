import { useLearningTrack } from '../engine/LearningTrack';
import { authoredQuestions } from '../data/authoredQuestions';
import { writeStudyValue } from "../account/storage";
import React, { useState, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import FlashcardStudioStats from "./FlashcardStudioStats";
import FlashcardStudioSidebar from "./FlashcardStudioSidebar";
import FlashcardStudioCard from "./FlashcardStudioCard";
import FlashcardStudioControls from "./FlashcardStudioControls";
import FlashcardStudioResources from "./FlashcardStudioResources";

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  category: "Setup" | "Policies" | "VPN" | "Diagnostics" | "Routing" | "Network+" | "Cloud";
  keyConcept: string;
  examTip?: string;
  officialReference?: string;
}

const HIGH_YIELD_FLASHCARDS: Flashcard[] = [
  {
    id: 1,
    category: "Setup",
    question: "What is the factory default IP address and subnet mask of Eth1 (Trusted) on a new or reset Firebox?",
    answer: "IP: 10.0.1.1\nSubnet Mask: 255.255.255.0 (/24)\n\nAdditionally, DHCP Server is enabled on Eth1 by default, distributing IP addresses in the 10.0.1.2 - 10.0.1.254 range to connected clients.",
    keyConcept: "Eth1 Default Configuration",
    examTip: "Eth1 is always Trusted by default. Eth0 is always External by default, configured as a DHCP client.",
    officialReference: "WatchGuard Fireware Quick Start Guide"
  },
  {
    id: 2,
    category: "Setup",
    question: "Which port does the Firebox Web UI run on by default for administrator logins?",
    answer: "HTTPS Port 8080 (e.g., https://10.0.1.1:8080)\n\nNote that the Firebox System Manager (FSM) software connects over port 4105. WatchGuard System Manager uses port 4118 for Gateway commands.",
    keyConcept: "Management Ports",
    examTip: "Make sure you include the 'https://' prefix and ':8080' port suffix in your browser, or the connection will time out.",
    officialReference: "Connect to Fireware Web UI"
  },
  {
    id: 3,
    category: "Policies",
    question: "Describe the order in which the Firebox processes security policies. How does precedence work?",
    answer: "The Firebox processes policies sequentially from top to bottom. Specific rules (such as policy matching a single host IP) should be placed higher in the list than general rules (such as Any-Trusted to Any-External).\n\nIf Auto-Order is enabled, the Firebox automatically places specific filters above general ones.",
    keyConcept: "Policy Precedence & Order",
    examTip: "Auto-Order is the recommended default. Manual ordering allows you to drag policies up or down to bypass default precedence.",
    officialReference: "About Policy Precedence"
  },
  {
    id: 4,
    category: "Policies",
    question: "What is the main difference between a packet filter policy and a proxy policy?",
    answer: "• Packet Filter: Operates at Layers 3/4 (IP & Port). Simply checks the source, destination, and port, then allows or blocks. Very fast but doesn't scan contents.\n• Proxy: Operates at Layer 7 (Application). Intercepts connection, terminates handshake, parses actual payload, enforces protocol standards, and can inspect bodies.",
    keyConcept: "Packet Filters vs. Proxies",
    examTip: "Exam questions often ask which policy type to use to inspect attachments or block MIME types. The answer is always a Proxy policy.",
    officialReference: "About Proxies and Application Layer Gateways"
  },
  {
    id: 5,
    category: "Policies",
    question: "How does HTTPS Content Inspection work, and what must be installed on clients to prevent browser warnings?",
    answer: "HTTPS Content Inspection decrypts HTTPS traffic, scans the underlying HTTP headers/payload with HTTP proxy actions (WebBlocker, GAV, APT), and re-encrypts the data using the Firebox's Proxy Authority Certificate.\n\nTo prevent TLS/SSL certificate warnings, the Firebox Proxy Authority CA Certificate must be imported into the trusted root authority store of each client device.",
    keyConcept: "HTTPS Deep Packet Inspection (DPI)",
    examTip: "Clients can download the certificate directly from the certificate portal at http://<Firebox-IP>:4126/certportal",
    officialReference: "HTTPS Proxy: Content Inspection"
  },
  {
    id: 6,
    category: "Routing",
    question: "What is NAT Loopback (also known as hairpin NAT) and when is it required?",
    answer: "NAT Loopback allows a trusted internal network client to access a public-facing server (e.g., an internal web server mapped with Static NAT) using its public IP address or public domain name instead of its private IP.",
    keyConcept: "NAT Loopback Mechanism",
    examTip: "Ensure 'Enable NAT Loopback' is checked in the Static NAT (SNAT) policy action settings.",
    officialReference: "About NAT Loopback"
  },
  {
    id: 7,
    category: "Routing",
    question: "Explain 1-to-1 NAT on a Firebox. Is it bi-directional?",
    answer: "Yes, 1-to-1 NAT is bi-directional. It maps a range of internal private IP addresses to a corresponding range of public external IP addresses.\n\nTraffic outbound from private IP 10.0.1.50 is NATed to public IP 203.0.113.50, and inbound traffic to 203.0.113.50 is automatically routed to 10.0.1.50.",
    keyConcept: "1-to-1 NAT Bi-directional Mapping",
    examTip: "1-to-1 NAT does not consume ports. It maps entire IP addresses.",
    officialReference: "About 1-to-1 NAT"
  },
  {
    id: 8,
    category: "VPN",
    question: "What is the primary difference between BOVPN Phase 1 and Phase 2 negotiations?",
    answer: "• Phase 1 (Gateway): Authenticates the remote peers, establishes a secure encryption algorithm (IKEv1/IKEv2), and negotiates secure session keys. Crucial settings: Pre-shared key and Gateway ID.\n• Phase 2 (Tunnel): Defines the actual traffic that is allowed to pass through the tunnel, specifying matching subnet route ranges (Local and Remote) and IPsec security associations (ESP/PFS).",
    keyConcept: "BOVPN Phase 1 vs. Phase 2",
    examTip: "Mismatched Pre-shared keys fail in Phase 1. Mismatched Subnet definitions fail in Phase 2.",
    officialReference: "BOVPN Gateway and Tunnel Configurations"
  },
  {
    id: 9,
    category: "VPN",
    question: "Which Mobile VPN type is recommended for seamless integration, zero-touch deployment, and native OS support?",
    answer: "Mobile VPN with IKEv2.\n\nIt is highly secure, fast, and supported natively by Windows, macOS, and iOS without third-party client software. WatchGuard provides a single configuration script (.bat or .mobileconfig) to automatically configure clients.",
    keyConcept: "Mobile VPN with IKEv2",
    examTip: "If users need access behind highly restrictive firewalls that block standard IKEv2 UDP ports (500/4500), fallback to Mobile VPN with SSL (which uses TCP port 443).",
    officialReference: "About Mobile VPN with IKEv2"
  },
  {
    id: 10,
    category: "Diagnostics",
    question: "What does the Policy Checker diagnostic tool do in Firebox System Manager?",
    answer: "Policy Checker simulates a packet matching specific criteria (Source IP, Destination IP, Port, and Protocol) and determines which active policy in the configuration list handles that packet (Allow, Deny, or Drop).",
    keyConcept: "Policy Checker Utility",
    examTip: "Use Policy Checker if a technician reports that a specific server cannot receive traffic despite an open policy. It immediately highlights if a higher policy is dropping the traffic first.",
    officialReference: "FSM Policy Checker"
  },
  {
    id: 11,
    category: "Diagnostics",
    question: "How long does an IP address remain in the temporary 'Blocked Sites' list by default when triggered by intrusion prevention (IPS)?",
    answer: "20 minutes.\n\nThis default duration can be customized in the Global Blocked Sites parameters. Administrators can also permanently block sites by manually adding them to the Permanent Blocked Sites list.",
    keyConcept: "Temporary Blocked Sites",
    examTip: "A temporary block is dynamic and self-clearing, reducing administrative overhead while blocking automated brute-force attempts.",
    officialReference: "About Blocked Sites"
  },
  {
    id: 12,
    category: "Routing",
    question: "Describe the four Multi-WAN routing modes available on locally-managed Fireboxes.",
    answer: "1. Routing Table: Routes based on default gateways and static routes.\n2. Round Robin: Distributes connections across active WAN interfaces based on weights.\n3. Failover: Directs all traffic to a primary WAN, falling back to a backup WAN if it fails.\n4. Interface Overflow: Routes traffic to a primary WAN until a bandwidth threshold is hit, then overflows to the next WAN.",
    keyConcept: "Multi-WAN Modes",
    examTip: "SD-WAN policies are used to route application-specific traffic based on performance metrics (latency, jitter, packet loss), overriding default Multi-WAN modes.",
    officialReference: "About Multi-WAN Methods"
  },
  {
    id: 13,
    category: "Routing",
    question: "How does SD-WAN evaluate active link quality to dynamically route outbound traffic?",
    answer: "SD-WAN uses Link Monitors to measure real-time link statistics including: latency, jitter, and packet loss.\n\nBy comparing these active measurements against configured thresholds, the Firebox can dynamically route voice, video, or critical database traffic to the best performing interface, overriding standard Multi-WAN rules.",
    keyConcept: "SD-WAN Quality Metrics",
    examTip: "VoIP traffic usually has strict jitter (< 20ms) and latency (< 150ms) requirements. SD-WAN is the exact tool to enforce these levels.",
    officialReference: "Configure SD-WAN Actions"
  },
  {
    id: 14,
    category: "Routing",
    question: "Which dynamic routing protocols are supported natively on WatchGuard Fireboxes?",
    answer: "• OSPF: Link-state interior routing protocol, highly popular for mid-to-large business networks.\n• BGP v4: Path-vector exterior gateway protocol, ideal for multihomed connections with multiple ISPs.\n• RIP v1/v2: Legacy interior distance-vector routing protocol based on hop counts.",
    keyConcept: "Dynamic Routing Protocols",
    examTip: "To enable dynamic routing, you must write a Zebra configuration routing script directly in the Firebox configuration.",
    officialReference: "About Dynamic Routing"
  },
  {
    id: 15,
    category: "VPN",
    question: "What is a major administrative advantage of Virtual Interface BOVPN over Policy-Based BOVPN?",
    answer: "A Virtual Interface BOVPN creates a logical virtual interface (bvpn1) that behaves like a physical port.\n\nThis allows administrators to configure standard static routes, run dynamic routing protocols (OSPF), or include the tunnel in SD-WAN actions. Policy-Based BOVPN requires hardcoded local-and-remote network selectors for every rule, which is difficult to scale.",
    keyConcept: "Virtual Interface BOVPN Flexibility",
    examTip: "For modern redundant branch office networks with automated failovers, Virtual Interface BOVPN is the standard recommendation.",
    officialReference: "About Virtual Interface BOVPN"
  },
  {
    id: 16,
    category: "Policies",
    question: "Compare Gateway AntiVirus (GAV) and APT Blocker in threat scanning.",
    answer: "• Gateway AntiVirus: Uses a local engine with signature databases to detect known files on-the-fly as they stream through proxies (HTTP, FTP, SMTP).\n• APT Blocker: Scans for unknown malware and zero-day threats. It calculates file hashes and uploads unrecognized executables/documents to a cloud-based sandbox for behavioral analysis.",
    keyConcept: "Layered Malware Protection",
    examTip: "Signature-based blocks are fast but only catch known threats. Sandbox analyses (APT Blocker) catch brand new zero-day threats but take a few minutes.",
    officialReference: "WatchGuard APT Blocker Overview"
  },
  {
    id: 17,
    category: "Policies",
    question: "What is DNSWatch, and how does it secure client internet lookups?",
    answer: "DNSWatch is a subscription service that intercepts DNS queries and forwards them to WatchGuard's secure cloud DNS servers.\n\nIt compares requested domains against known malicious feeds. If a threat is found, it redirects the client to a safe educational block page rather than resolving the malicious IP.",
    keyConcept: "DNS-Level Threat Interception",
    examTip: "DNSWatch operates globally for the network and doesn't require importing local certificates like HTTPS Content Inspection does.",
    officialReference: "About DNSWatch"
  },
  {
    id: 18,
    category: "Diagnostics",
    question: "Which port does a Firebox use to forward security logs to a centralized WatchGuard Log Server or Dimension database?",
    answer: "TCP Port 4115.\n\nThis proprietary communication channel is secure and encrypted. For standard Syslog to third-party collectors, the Firebox uses standard UDP/TCP Port 514.",
    keyConcept: "Centralized Log Server Port",
    examTip: "Make sure that port 4115 is allowed outbound on any perimeter devices between the Firebox and your logging target.",
    officialReference: "Configure Logging on the Firebox"
  },
  {
    id: 19,
    category: "Setup",
    question: "How do Active/Passive and Active/Active FireCluster deployments differ in interface load balancing?",
    answer: "• Active/Passive: The master Firebox processes all traffic while the backup synchronizes states. Only one device is active at any time.\n• Active/Active: Both Fireboxes process traffic simultaneously. The cluster distributes eligible connections between members and uses multicast MAC addresses. Plan switch compatibility and remember that not all traffic can be load balanced.",
    keyConcept: "FireCluster Cluster Modes",
    examTip: "Check switch support for multicast MAC forwarding and static MAC entries where required by the FireCluster deployment guide.",
    officialReference: "About FireCluster"
  },
  {
    id: 20,
    category: "Setup",
    question: "Explain the difference between saving a backup XML configuration and an FXI Flash Backup Image.",
    answer: "XML configuration files support offline Policy Manager editing and supported migrations after checking interfaces and version compatibility. An FXI backup is device-specific and includes configuration, certificates, feature keys, and passphrases. Fireware OS inclusion depends on the backup method and version; ordinary backups from 12.2.1 onward do not necessarily include the OS.",
    keyConcept: "XML Configs vs. FXI Images",
    examTip: "Use XML configuration files for migrations between different hardware models, and device-specific FXI images for recovery according to the documented restore procedure.",
    officialReference: "Backup and Restore Firebox Configuration"
  }
];

HIGH_YIELD_FLASHCARDS.push(...authoredQuestions.map(q=>({
  id:20000+q.id, question:q.question, answer:q.correctAnswers.join('; ')+"\n\n"+q.explanation,
  category:(q.track==='network-plus'?'Network+':q.track==='cloud'?'Cloud':q.topic==='Initial Setup'?'Setup':q.topic.includes('VPN')?'VPN':q.topic==='Routing'?'Routing':(q.topic==='Logging & Monitoring'||q.topic==='Troubleshooting')?'Diagnostics':'Policies') as Flashcard['category'],
  keyConcept:q.topic, officialReference:q.sources?.map(s=>[s.title,s.section].filter(Boolean).join(' · ')).join('; ')
})));

export default function FlashcardStudio() {
  const {track}=useLearningTrack();
  const trackCards=useMemo(()=>HIGH_YIELD_FLASHCARDS.filter(c=>track==='network-plus'?c.category==='Network+':track==='cloud'?c.category==='Cloud':c.category!=='Network+'&&c.category!=='Cloud'),[track]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Track study progress locally in state
  const [masteredIds, setMasteredIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("watchguard_mastered_flashcards");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const categories = ["All", ...new Set<string>(trackCards.map(c=>c.category))];
  React.useEffect(()=>{setSelectedCategory("All");setCurrentIndex(0);setIsFlipped(false);},[track]);

  // Filter cards based on category and search query
  const filteredCards = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    return trackCards.filter(card => {
      const matchesCategory = selectedCategory === "All" || card.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!lowerQuery) return true;

      return card.question.toLowerCase().includes(lowerQuery) ||
             card.answer.toLowerCase().includes(lowerQuery) ||
             card.keyConcept.toLowerCase().includes(lowerQuery);
    });
  }, [selectedCategory, searchQuery, trackCards]);

  // Adjust index if out of bounds of current filtered list
  React.useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [selectedCategory, searchQuery, trackCards]);

  const activeCard = filteredCards[currentIndex] || null;

  const handleNext = () => {
    if (filteredCards.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
    }, 150);
  };

  const handlePrev = () => {
    if (filteredCards.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
    }, 150);
  };

  const handleToggleMastered = (id: number) => {
    setMasteredIds((prev) => {
      const updated = prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id];
      writeStudyValue("watchguard_mastered_flashcards", JSON.stringify(updated));
      return updated;
    });
  };

  const handleResetProgress = () => {
    if (window.confirm("Are you sure you want to reset your mastered flashcards status?")) {
      setMasteredIds([]);
      writeStudyValue("watchguard_mastered_flashcards", null);
    }
  };

  const masteredCount = useMemo(() => {
    return trackCards.filter(c => masteredIds.includes(c.id)).length;
  }, [masteredIds,trackCards]);

  const progressPercent = Math.round((masteredCount / trackCards.length) * 100);

  return (
    <div className="space-y-6">
      
      <FlashcardStudioStats
        progressPercent={progressPercent}
        masteredCount={masteredCount}
        totalCount={trackCards.length}
        handleResetProgress={handleResetProgress}
      />

      {/* Main Flashcard Interface Arena */}
      <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-6 shadow-2xl flex flex-col md:flex-row gap-6">
        
        <FlashcardStudioSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredCardsLength={filteredCards.length}
          currentIndex={currentIndex}
        />

        {/* Right Side: Flashcard Display Stage */}
        <div className="flex-1 flex flex-col items-center justify-between min-h-[400px] bg-watchguard-dark/20 rounded-xl border border-watchguard-border/60 p-6 space-y-6">
          
          <div className="w-full text-center">
            {activeCard && (
              <span className="text-[9px] font-mono bg-watchguard-orange/10 border border-watchguard-orange/30 text-watchguard-orange px-2.5 py-1 rounded uppercase tracking-widest font-bold">
                {activeCard.category} Topic • Core Exam Syllabus
              </span>
            )}
          </div>

          <div className="w-full max-w-xl flex-1 flex items-center justify-center">
            {filteredCards.length === 0 ? (
              <div className="text-center space-y-3 py-12">
                <AlertCircle className="w-10 h-10 text-gray-500 mx-auto" />
                <p className="text-sm text-gray-400 font-mono">No matching high-yield flashcards found.</p>
                <button 
                  onClick={() => { setSelectedCategory("All"); setSearchQuery(""); }}
                  className="text-xs bg-watchguard-orange/10 border border-watchguard-orange/30 text-watchguard-orange hover:bg-watchguard-orange/20 px-3 py-1.5 rounded transition-all font-mono cursor-pointer"
                >
                  Reset Study Filter
                </button>
              </div>
            ) : (
              activeCard && (
                <FlashcardStudioCard
                  activeCard={activeCard}
                  isFlipped={isFlipped}
                  setIsFlipped={setIsFlipped}
                />
              )
            )}
          </div>

          {activeCard && (
            <FlashcardStudioControls
              activeCardId={activeCard.id}
              masteredIds={masteredIds}
              handleToggleMastered={handleToggleMastered}
              handlePrev={handlePrev}
              handleNext={handleNext}
              currentIndex={currentIndex}
              filteredCardsLength={filteredCards.length}
            />
          )}

        </div>
      </div>

      <FlashcardStudioResources />

    </div>
  );
}
