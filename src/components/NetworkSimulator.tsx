import * as React from "react";
import { useEffect, useState } from "react";
import { Cpu } from "lucide-react";
import { PolicyController, FlowInjector, TopologyPanel, SyslogTerminal, Packet } from "./network-simulator";

export default function NetworkSimulator() {
  // Firebox Policy Controller States
  const [outgoingEnabled, setOutgoingOutgoing] = useState(true);
  const [dnsPolicyEnabled, setDnsPolicyEnabled] = useState(true);
  const [httpProxyEnabled, setHttpProxyEnabled] = useState(true);
  const [httpsContentInspection, setHttpsContentInspection] = useState(false);
  const [certTrusted, setCertTrusted] = useState(false);
  
  // Threats List
  const [blockedSites, setBlockedSites] = useState<string[]>(["203.0.113.66", "198.51.100.99"]);
  const [blockedPorts, setBlockedPorts] = useState<number[]>([23, 21]); // Block Telnet/FTP
  const [newSiteBlock, setNewSiteBlock] = useState("");
  const [newPortBlock, setNewPortBlock] = useState("");

  // Interactive Packet Injector Form States
  const [srcZone, setSrcZone] = useState<"trusted" | "dmz" | "external">("trusted");
  const [dstZone, setDstZone] = useState<"trusted" | "dmz" | "external">("external");
  const [customProtocol, setCustomProtocol] = useState<"TCP" | "UDP" | "ICMP" | "HTTPS">("TCP");
  const [customPort, setCustomPort] = useState(80);
  const [customSrcIP, setCustomSrcIP] = useState("10.0.1.25");
  const [customDstIP, setCustomDstIP] = useState("8.8.8.8");
  const [customPayload, setCustomPayload] = useState("HTTP Web Browse request");

  // Simulated packets list (historical logs)
  const [packets, setPackets] = useState<Packet[]>([]);
  const [activeConsoleLog, setActiveConsoleLog] = useState<string[]>([]);
  const [inspectedPacket, setInspectedPacket] = useState<Packet | null>(null);

  // Animation visual trigger states
  const [animatingPacket, setAnimatingPacket] = useState<{
    from: string;
    to: string;
    status: "Allowed" | "Denied";
    protocol: string;
  } | null>(null);

  // Auto-generator toggle
  const [autoGen, setAutoGen] = useState(true);

  // Update pre-populated values when zones change
  useEffect(() => {
    if (srcZone === "trusted") {
      setCustomSrcIP("10.0.1.25");
    } else if (srcZone === "dmz") {
      setCustomSrcIP("192.168.10.5");
    } else {
      setCustomSrcIP("203.0.113.80");
    }
  }, [srcZone]);

  useEffect(() => {
    if (dstZone === "trusted") {
      setCustomDstIP("10.0.1.100");
    } else if (dstZone === "dmz") {
      setCustomDstIP("192.168.10.15");
    } else {
      setCustomDstIP("8.8.8.8");
    }
  }, [dstZone]);

  // Handle port defaults based on protocol selection
  useEffect(() => {
    if (customProtocol === "HTTPS") {
      setCustomPort(443);
      setCustomPayload("Secure Browser Exchange (TLS)");
    } else if (customProtocol === "UDP") {
      setCustomPort(53);
      setCustomPayload("DNS query resolution");
    } else if (customProtocol === "ICMP") {
      setCustomPort(0);
      setCustomPayload("Ping ICMP echo request");
    } else {
      setCustomPort(80);
      setCustomPayload("Standard HTTP Web request");
    }
  }, [customProtocol]);

  // Core Firebox Packet Processing Engine
  const processPacket = (
    from: "trusted" | "dmz" | "external",
    to: "trusted" | "dmz" | "external",
    protocol: "TCP" | "UDP" | "ICMP" | "HTTPS",
    srcIP: string,
    dstIP: string,
    srcPort: number,
    dstPort: number,
    payload: string
  ): Packet => {
    const timestamp = new Date().toISOString().replace("T", " ").substring(11, 19);
    let status: "Allowed" | "Denied" = "Allowed";
    let matchedPolicy = "Default Outgoing Policy";
    let reason = "Allowed by outbound TCP-UDP packet filters.";

    // 1. DEFAULT THREAT PROTECTION (Precedes policies!)
    if (blockedSites.includes(srcIP) || blockedSites.includes(dstIP)) {
      status = "Denied";
      matchedPolicy = "Default Threat Protection: Blocked Sites";
      reason = "Dropped immediately because the IP matches an entry in the Blocked Sites list.";
    } else if (blockedPorts.includes(dstPort)) {
      status = "Denied";
      matchedPolicy = "Default Threat Protection: Blocked Ports";
      reason = "Dropped immediately because the destination port is in the Blocked Ports database.";
    }
    // 2. LAYER 3/4 UNHANDLED EXTERNAL PACKETS
    else if (from === "external" && to === "trusted") {
      status = "Denied";
      matchedPolicy = "Unhandled External Packet";
      reason = "Dropped by default deny. No inbound firewall rules allow incoming WAN connections to eth1.";
    }
    // 3. POLICY SPECIFIC CHECKS
    else if (from === "trusted" || from === "dmz") {
      // DNS port checking
      if (dstPort === 53 || protocol === "UDP") {
        if (dnsPolicyEnabled) {
          status = "Allowed";
          matchedPolicy = "DNS Packet Filter Policy";
          reason = "Allowed by explicit outbound UDP/53 DNS policy.";
        } else if (outgoingEnabled) {
          status = "Allowed";
          matchedPolicy = "Default Outgoing Policy";
          reason = "DNS Policy is disabled, but falling back to Allowed by general Outgoing TCP-UDP policy.";
        } else {
          status = "Denied";
          matchedPolicy = "Unhandled Internal Packet";
          reason = "Dropped by default implicit deny. DNS policy and general Outgoing filters are both disabled.";
        }
      }
      // HTTP proxy checking
      else if (dstPort === 80) {
        if (httpProxyEnabled) {
          if (payload.toLowerCase().includes("eicar")) {
            status = "Denied";
            matchedPolicy = "HTTP-Proxy Action (GAV Gateway AV)";
            reason = "Dropped because Gateway AntiVirus signature scanner found infected payload: 'EICAR-Test-File'.";
          } else {
            status = "Allowed";
            matchedPolicy = "HTTP-Proxy Policy (WebBlocker Active)";
            reason = "Deep Packet Inspection allowed this HTTP session cleanly after categorizing content.";
          }
        } else if (outgoingEnabled) {
          status = "Allowed";
          matchedPolicy = "Default Outgoing Policy";
          reason = "HTTP Proxy is disabled, but falling back to Allowed by general Outgoing packet filters.";
        } else {
          status = "Denied";
          matchedPolicy = "Unhandled Internal Packet";
          reason = "Dropped by default implicit deny. HTTP policy and Outgoing rules are both disabled.";
        }
      }
      // HTTPS content inspection checking
      else if (dstPort === 443 || protocol === "HTTPS") {
        if (httpsContentInspection) {
          if (!certTrusted) {
            status = "Denied";
            matchedPolicy = "HTTPS-Proxy with Content Inspection";
            reason = "Dropped due to SSL warning. The user's computer does not trust the self-signed Proxy Authority Certificate on the Firebox.";
          } else if (payload.toLowerCase().includes("eicar")) {
            status = "Denied";
            matchedPolicy = "HTTPS-Proxy (Deep Content Inspection)";
            reason = "Decrypted and scanned HTTPS. GAV signature scanner detected 'EICAR' infected file inside the decrypted stream.";
          } else {
            status = "Allowed";
            matchedPolicy = "HTTPS-Proxy Policy (Decrypted & Inspected)";
            reason = "Decrypted and allowed cleanly. Security certificate verified via OCSP.";
          }
        } else if (outgoingEnabled) {
          status = "Allowed";
          matchedPolicy = "Default Outgoing Policy (Raw HTTPS)";
          reason = "HTTPS Proxy Content Inspection is disabled. Allowed outbound natively as raw encrypted traffic (no decryption scanning).";
        } else {
          status = "Denied";
          matchedPolicy = "Unhandled Internal Packet";
          reason = "Dropped by default implicit deny. Outbound HTTPS traffic is blocked when Outgoing policy is disabled.";
        }
      }
      // Other traffic
      else {
        if (outgoingEnabled) {
          status = "Allowed";
          matchedPolicy = "Default Outgoing Policy";
          reason = "Allowed outbound globally by the generic TCP-UDP Outgoing ruleset.";
        } else {
          status = "Denied";
          matchedPolicy = "Unhandled Internal Packet";
          reason = "Dropped by default implicit deny. The Outgoing policy has been disabled, blocking all unhandled TCP/UDP egress.";
        }
      }
    }

    return {
      id: Date.now(),
      from,
      to,
      protocol,
      srcIP,
      dstIP,
      srcPort,
      dstPort,
      payload,
      status,
      matchedPolicy,
      timestamp,
      reason
    };
  };

  // Inject Packet Handler
  const handleInjectPacket = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const srcPort = Math.floor(Math.random() * 40000) + 1024;
    const packet = processPacket(
      srcZone,
      dstZone,
      customProtocol,
      customSrcIP,
      customDstIP,
      srcPort,
      customPort,
      customPayload
    );

    // Trigger visual animation
    setAnimatingPacket({
      from: srcZone,
      to: dstZone,
      status: packet.status,
      protocol: packet.protocol
    });

    // Add to history list
    setPackets(prev => [packet, ...prev.slice(0, 10)]);

    // Construct Syslog string
    const isDeny = packet.status === "Denied";
    const logLine = `${packet.timestamp} ${isDeny ? "Deny" : "Allow"} ${packet.srcIP} ${packet.dstIP} ${packet.srcPort} ${packet.dstPort} ${packet.protocol} ${packet.from} -> ${packet.to} ${isDeny ? `(${packet.matchedPolicy})` : ""}`;
    setActiveConsoleLog(prev => [logLine, ...prev.slice(0, 40)]);
    setInspectedPacket(packet);

    // Clear animation after 1.5 seconds
    setTimeout(() => {
      setAnimatingPacket(null);
    }, 1500);
  };

  // Automated background packet flow generator
  useEffect(() => {
    if (!autoGen) return;

    const interval = setInterval(() => {
      const zones: ("trusted" | "dmz" | "external")[] = ["trusted", "dmz", "external"];
      const protocols: ("TCP" | "UDP" | "ICMP" | "HTTPS")[] = ["TCP", "UDP", "ICMP", "HTTPS"];
      
      const from = zones[Math.floor(Math.random() * zones.length)];
      let to = zones[Math.floor(Math.random() * zones.length)];
      while (to === from) {
        to = zones[Math.floor(Math.random() * zones.length)];
      }

      const protocol = protocols[Math.floor(Math.random() * protocols.length)];
      
      // Determine IPs
      const srcIP = from === "trusted" ? `10.0.1.${Math.floor(Math.random() * 80) + 10}` : from === "dmz" ? `192.168.10.${Math.floor(Math.random() * 80) + 10}` : `203.0.113.${Math.floor(Math.random() * 200)}`;
      const dstIP = to === "trusted" ? "10.0.1.5" : to === "dmz" ? "192.168.10.5" : `8.8.8.${Math.floor(Math.random() * 8) + 1}`;
      
      const srcPort = Math.floor(Math.random() * 40000) + 1024;
      const dstPort = protocol === "HTTPS" ? 443 : protocol === "UDP" ? 53 : protocol === "ICMP" ? 0 : 80;

      // Random payload
      let payload = "Automated data flow";
      if (protocol === "UDP" && dstPort === 53) payload = "DNS Query for watchguard.com";
      if (protocol === "HTTPS" && dstPort === 443) {
        payload = Math.random() > 0.5 ? "Infected payload EICAR signature" : "Secure browser bank transaction";
      }

      const packet = processPacket(from, to, protocol, srcIP, dstIP, srcPort, dstPort, payload);

      setPackets(prev => [packet, ...prev.slice(0, 10)]);

      const isDeny = packet.status === "Denied";
      const logLine = `${packet.timestamp} ${isDeny ? "Deny" : "Allow"} ${packet.srcIP} ${packet.dstIP} ${packet.srcPort} ${packet.dstPort} ${packet.protocol} ${packet.from} -> ${packet.to} ${isDeny ? `(${packet.matchedPolicy})` : ""}`;
      setActiveConsoleLog(prev => [logLine, ...prev.slice(0, 40)]);
    }, 4500);

    return () => clearInterval(interval);
  }, [autoGen, outgoingEnabled, dnsPolicyEnabled, httpProxyEnabled, httpsContentInspection, certTrusted, blockedSites, blockedPorts]);

  // Block handlers
  const handleAddSiteBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteBlock.trim()) return;
    setBlockedSites(prev => [...prev, newSiteBlock.trim()]);
    setNewSiteBlock("");
  };

  const handleAddPortBlock = (e: React.FormEvent) => {
    e.preventDefault();
    const port = parseInt(newPortBlock, 10);
    if (isNaN(port)) return;
    setBlockedPorts(prev => [...prev, port]);
    setNewPortBlock("");
  };

  return (
    <div className="flex flex-col bg-watchguard-gray border border-watchguard-border rounded-xl overflow-hidden shadow-2xl h-full font-sans select-none">
      
      {/* Simulation Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-watchguard-lightgray border-b border-watchguard-border text-xs font-semibold text-white">
        <span className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-watchguard-orange animate-spin" />
          <span>FSM Live Firewall & Interface Visualizer</span>
        </span>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono text-gray-400 bg-watchguard-dark px-2.5 py-1 rounded border border-watchguard-border/60">
            M270 Enterprise Sandbox
          </span>
          <button 
            onClick={() => setAutoGen(!autoGen)}
            className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded transition-all ${
              autoGen ? "bg-green-500/20 text-green-400 border border-green-500/40" : "bg-gray-700 text-gray-400 border border-gray-600"
            }`}
          >
            {autoGen ? "● AUTO GENERATOR ON" : "○ MANUAL ONLY"}
          </button>
        </div>
      </div>

      {/* Main Sandbox Interactive Split Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-b border-watchguard-border bg-watchguard-dark/10">
        <PolicyController
          outgoingEnabled={outgoingEnabled}
          setOutgoingOutgoing={setOutgoingOutgoing}
          dnsPolicyEnabled={dnsPolicyEnabled}
          setDnsPolicyEnabled={setDnsPolicyEnabled}
          httpProxyEnabled={httpProxyEnabled}
          setHttpProxyEnabled={setHttpProxyEnabled}
          httpsContentInspection={httpsContentInspection}
          setHttpsContentInspection={setHttpsContentInspection}
          certTrusted={certTrusted}
          setCertTrusted={setCertTrusted}
          blockedSites={blockedSites}
          setBlockedSites={setBlockedSites}
          blockedPorts={blockedPorts}
          setBlockedPorts={setBlockedPorts}
          newSiteBlock={newSiteBlock}
          setNewSiteBlock={setNewSiteBlock}
          newPortBlock={newPortBlock}
          setNewPortBlock={setNewPortBlock}
          handleAddSiteBlock={handleAddSiteBlock}
          handleAddPortBlock={handleAddPortBlock}
        />
        
        <FlowInjector
          srcZone={srcZone}
          setSrcZone={setSrcZone}
          dstZone={dstZone}
          setDstZone={setDstZone}
          customProtocol={customProtocol}
          setCustomProtocol={setCustomProtocol}
          customPort={customPort}
          setCustomPort={setCustomPort}
          customSrcIP={customSrcIP}
          setCustomSrcIP={setCustomSrcIP}
          customDstIP={customDstIP}
          setCustomDstIP={setCustomDstIP}
          customPayload={customPayload}
          setCustomPayload={setCustomPayload}
          handleInjectPacket={handleInjectPacket}
        />
      </div>

      <TopologyPanel animatingPacket={animatingPacket} />

      <SyslogTerminal
        inspectedPacket={inspectedPacket}
        setInspectedPacket={setInspectedPacket}
        activeConsoleLog={activeConsoleLog}
        packets={packets}
      />
    </div>
  );
}
