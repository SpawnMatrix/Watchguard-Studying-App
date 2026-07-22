import * as React from "react";
import { useEffect, useState } from "react";
import {
  Terminal,
  Shield,
  Cpu,
  Play,
  Plus,
  Trash2,
  Settings,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Packet {
  id: number;
  from: "trusted" | "dmz" | "external";
  to: "trusted" | "dmz" | "external";
  protocol: "TCP" | "UDP" | "ICMP" | "HTTPS";
  srcIP: string;
  dstIP: string;
  srcPort: number;
  dstPort: number;
  payload: string;
  status: "Allowed" | "Denied";
  matchedPolicy: string;
  timestamp: string;
  reason: string;
}

export default function NetworkSimulator() {
  // Firebox Policy Controller States
  const [outgoingEnabled, setOutgoingOutgoing] = useState(true);
  const [dnsPolicyEnabled, setDnsPolicyEnabled] = useState(true);
  const [httpProxyEnabled, setHttpProxyEnabled] = useState(true);
  const [httpsContentInspection, setHttpsContentInspection] = useState(false);
  const [certTrusted, setCertTrusted] = useState(false);

  // Threats List
  const [blockedSites, setBlockedSites] = useState<string[]>([
    "203.0.113.66",
    "198.51.100.99",
  ]);
  const [blockedPorts, setBlockedPorts] = useState<number[]>([23, 21]); // Block Telnet/FTP
  const [newSiteBlock, setNewSiteBlock] = useState("");
  const [newPortBlock, setNewPortBlock] = useState("");

  // Interactive Packet Injector Form States
  const [srcZone, setSrcZone] = useState<"trusted" | "dmz" | "external">(
    "trusted",
  );
  const [dstZone, setDstZone] = useState<"trusted" | "dmz" | "external">(
    "external",
  );
  const [customProtocol, setCustomProtocol] = useState<
    "TCP" | "UDP" | "ICMP" | "HTTPS"
  >("TCP");
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
    payload: string,
  ): Packet => {
    const timestamp = new Date()
      .toISOString()
      .replace("T", " ")
      .substring(11, 19);
    let status: "Allowed" | "Denied" = "Allowed";
    let matchedPolicy = "Default Outgoing Policy";
    let reason = "Allowed by outbound TCP-UDP packet filters.";

    // 1. DEFAULT THREAT PROTECTION (Precedes policies!)
    if (blockedSites.includes(srcIP) || blockedSites.includes(dstIP)) {
      status = "Denied";
      matchedPolicy = "Default Threat Protection: Blocked Sites";
      reason =
        "Dropped immediately because the IP matches an entry in the Blocked Sites list.";
    } else if (blockedPorts.includes(dstPort)) {
      status = "Denied";
      matchedPolicy = "Default Threat Protection: Blocked Ports";
      reason =
        "Dropped immediately because the destination port is in the Blocked Ports database.";
    }
    // 2. LAYER 3/4 UNHANDLED EXTERNAL PACKETS
    else if (from === "external" && to === "trusted") {
      status = "Denied";
      matchedPolicy = "Unhandled External Packet";
      reason =
        "Dropped by default deny. No inbound firewall rules allow incoming WAN connections to eth1.";
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
          reason =
            "DNS Policy is disabled, but falling back to Allowed by general Outgoing TCP-UDP policy.";
        } else {
          status = "Denied";
          matchedPolicy = "Unhandled Internal Packet";
          reason =
            "Dropped by default implicit deny. DNS policy and general Outgoing filters are both disabled.";
        }
      }
      // HTTP proxy checking
      else if (dstPort === 80) {
        if (httpProxyEnabled) {
          if (payload.toLowerCase().includes("eicar")) {
            status = "Denied";
            matchedPolicy = "HTTP-Proxy Action (GAV Gateway AV)";
            reason =
              "Dropped because Gateway AntiVirus signature scanner found infected payload: 'EICAR-Test-File'.";
          } else {
            status = "Allowed";
            matchedPolicy = "HTTP-Proxy Policy (WebBlocker Active)";
            reason =
              "Deep Packet Inspection allowed this HTTP session cleanly after categorizing content.";
          }
        } else if (outgoingEnabled) {
          status = "Allowed";
          matchedPolicy = "Default Outgoing Policy";
          reason =
            "HTTP Proxy is disabled, but falling back to Allowed by general Outgoing packet filters.";
        } else {
          status = "Denied";
          matchedPolicy = "Unhandled Internal Packet";
          reason =
            "Dropped by default implicit deny. HTTP policy and Outgoing rules are both disabled.";
        }
      }
      // HTTPS content inspection checking
      else if (dstPort === 443 || protocol === "HTTPS") {
        if (httpsContentInspection) {
          if (!certTrusted) {
            status = "Denied";
            matchedPolicy = "HTTPS-Proxy with Content Inspection";
            reason =
              "Dropped due to SSL warning. The user's computer does not trust the self-signed Proxy Authority Certificate on the Firebox.";
          } else if (payload.toLowerCase().includes("eicar")) {
            status = "Denied";
            matchedPolicy = "HTTPS-Proxy (Deep Content Inspection)";
            reason =
              "Decrypted and scanned HTTPS. GAV signature scanner detected 'EICAR' infected file inside the decrypted stream.";
          } else {
            status = "Allowed";
            matchedPolicy = "HTTPS-Proxy Policy (Decrypted & Inspected)";
            reason =
              "Decrypted and allowed cleanly. Security certificate verified via OCSP.";
          }
        } else if (outgoingEnabled) {
          status = "Allowed";
          matchedPolicy = "Default Outgoing Policy (Raw HTTPS)";
          reason =
            "HTTPS Proxy Content Inspection is disabled. Allowed outbound natively as raw encrypted traffic (no decryption scanning).";
        } else {
          status = "Denied";
          matchedPolicy = "Unhandled Internal Packet";
          reason =
            "Dropped by default implicit deny. Outbound HTTPS traffic is blocked when Outgoing policy is disabled.";
        }
      }
      // Other traffic
      else {
        if (outgoingEnabled) {
          status = "Allowed";
          matchedPolicy = "Default Outgoing Policy";
          reason =
            "Allowed outbound globally by the generic TCP-UDP Outgoing ruleset.";
        } else {
          status = "Denied";
          matchedPolicy = "Unhandled Internal Packet";
          reason =
            "Dropped by default implicit deny. The Outgoing policy has been disabled, blocking all unhandled TCP/UDP egress.";
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
      reason,
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
      customPayload,
    );

    // Trigger visual animation
    setAnimatingPacket({
      from: srcZone,
      to: dstZone,
      status: packet.status,
      protocol: packet.protocol,
    });

    // Add to history list
    setPackets((prev) => [packet, ...prev.slice(0, 10)]);

    // Construct Syslog string
    const isDeny = packet.status === "Denied";
    const logLine = `${packet.timestamp} ${isDeny ? "Deny" : "Allow"} ${packet.srcIP} ${packet.dstIP} ${packet.srcPort} ${packet.dstPort} ${packet.protocol} ${packet.from} -> ${packet.to} ${isDeny ? `(${packet.matchedPolicy})` : ""}`;
    setActiveConsoleLog((prev) => [logLine, ...prev.slice(0, 40)]);
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
      const zones: ("trusted" | "dmz" | "external")[] = [
        "trusted",
        "dmz",
        "external",
      ];
      const protocols: ("TCP" | "UDP" | "ICMP" | "HTTPS")[] = [
        "TCP",
        "UDP",
        "ICMP",
        "HTTPS",
      ];

      const from = zones[Math.floor(Math.random() * zones.length)];
      let to = zones[Math.floor(Math.random() * zones.length)];
      while (to === from) {
        to = zones[Math.floor(Math.random() * zones.length)];
      }

      const protocol = protocols[Math.floor(Math.random() * protocols.length)];

      // Determine IPs
      const srcIP =
        from === "trusted"
          ? `10.0.1.${Math.floor(Math.random() * 80) + 10}`
          : from === "dmz"
            ? `192.168.10.${Math.floor(Math.random() * 80) + 10}`
            : `203.0.113.${Math.floor(Math.random() * 200)}`;
      const dstIP =
        to === "trusted"
          ? "10.0.1.5"
          : to === "dmz"
            ? "192.168.10.5"
            : `8.8.8.${Math.floor(Math.random() * 8) + 1}`;

      const srcPort = Math.floor(Math.random() * 40000) + 1024;
      const dstPort =
        protocol === "HTTPS"
          ? 443
          : protocol === "UDP"
            ? 53
            : protocol === "ICMP"
              ? 0
              : 80;

      // Random payload
      let payload = "Automated data flow";
      if (protocol === "UDP" && dstPort === 53)
        payload = "DNS Query for watchguard.com";
      if (protocol === "HTTPS" && dstPort === 443) {
        payload =
          Math.random() > 0.5
            ? "Infected payload EICAR signature"
            : "Secure browser bank transaction";
      }

      const packet = processPacket(
        from,
        to,
        protocol,
        srcIP,
        dstIP,
        srcPort,
        dstPort,
        payload,
      );

      setPackets((prev) => [packet, ...prev.slice(0, 10)]);

      const isDeny = packet.status === "Denied";
      const logLine = `${packet.timestamp} ${isDeny ? "Deny" : "Allow"} ${packet.srcIP} ${packet.dstIP} ${packet.srcPort} ${packet.dstPort} ${packet.protocol} ${packet.from} -> ${packet.to} ${isDeny ? `(${packet.matchedPolicy})` : ""}`;
      setActiveConsoleLog((prev) => [logLine, ...prev.slice(0, 40)]);
    }, 4500);

    return () => clearInterval(interval);
  }, [
    autoGen,
    outgoingEnabled,
    dnsPolicyEnabled,
    httpProxyEnabled,
    httpsContentInspection,
    certTrusted,
    blockedSites,
    blockedPorts,
  ]);

  // Block handlers
  const handleAddSiteBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteBlock.trim()) return;
    setBlockedSites((prev) => [...prev, newSiteBlock.trim()]);
    setNewSiteBlock("");
  };

  const handleAddPortBlock = (e: React.FormEvent) => {
    e.preventDefault();
    const port = parseInt(newPortBlock, 10);
    if (isNaN(port)) return;
    setBlockedPorts((prev) => [...prev, port]);
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
              autoGen
                ? "bg-green-500/20 text-green-400 border border-green-500/40"
                : "bg-gray-700 text-gray-400 border border-gray-600"
            }`}
          >
            {autoGen ? "● AUTO GENERATOR ON" : "○ MANUAL ONLY"}
          </button>
        </div>
      </div>

      {/* Main Sandbox Interactive Split Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-b border-watchguard-border bg-watchguard-dark/10">
        {/* Left Hand side: Policy Configurator & Threat lists */}
        <div className="p-4.5 border-r border-watchguard-border space-y-4 bg-watchguard-dark/40 overflow-y-auto max-h-[420px] scrollbar-thin">
          <div className="space-y-1 pb-1 border-b border-watchguard-border/60">
            <h4 className="text-xs font-bold text-white flex items-center space-x-2 uppercase tracking-wide">
              <Settings className="w-3.5 h-3.5 text-watchguard-orange" />
              <span>Firebox Security Policy Controller</span>
            </h4>
            <p className="text-[10px] text-gray-500">
              Configure firewall rulesets in real-time to watch their immediate
              impact on routing flows.
            </p>
          </div>

          <div className="space-y-2.5">
            {/* Outgoing Policy */}
            <div className="flex items-center justify-between p-2 bg-watchguard-lightgray/30 border border-watchguard-border/40 rounded-lg">
              <div>
                <span className="text-xs font-semibold text-gray-200 block">
                  Default Outgoing Policy (TCP-UDP)
                </span>
                <span className="text-[9px] text-gray-500">
                  Allow outbound connections on any port by default.
                </span>
              </div>
              <input
                type="checkbox"
                checked={outgoingEnabled}
                onChange={(e) => setOutgoingOutgoing(e.target.checked)}
                className="w-4 h-4 text-watchguard-orange rounded accent-watchguard-orange cursor-pointer"
              />
            </div>

            {/* DNS Policy */}
            <div className="flex items-center justify-between p-2 bg-watchguard-lightgray/30 border border-watchguard-border/40 rounded-lg">
              <div>
                <span className="text-xs font-semibold text-gray-200 block">
                  DNS Policy (UDP/53)
                </span>
                <span className="text-[9px] text-gray-500 font-sans">
                  Explicit allow rule for outbound port 53 lookup.
                </span>
              </div>
              <input
                type="checkbox"
                checked={dnsPolicyEnabled}
                onChange={(e) => setDnsPolicyEnabled(e.target.checked)}
                className="w-4 h-4 text-watchguard-orange rounded accent-watchguard-orange cursor-pointer"
              />
            </div>

            {/* HTTP proxy Action */}
            <div className="flex items-center justify-between p-2 bg-watchguard-lightgray/30 border border-watchguard-border/40 rounded-lg">
              <div>
                <span className="text-xs font-semibold text-gray-200 block">
                  HTTP Proxy Action & GAV Scanner
                </span>
                <span className="text-[9px] text-gray-500">
                  Deep packet inspection. Scans files for virus signatures.
                </span>
              </div>
              <input
                type="checkbox"
                checked={httpProxyEnabled}
                onChange={(e) => setHttpProxyEnabled(e.target.checked)}
                className="w-4 h-4 text-watchguard-orange rounded accent-watchguard-orange cursor-pointer"
              />
            </div>

            {/* HTTPS Proxy Action with Content Inspection */}
            <div className="flex items-center justify-between p-2 bg-watchguard-lightgray/30 border border-watchguard-border/40 rounded-lg">
              <div>
                <span className="text-xs font-semibold text-gray-200 block">
                  HTTPS Content Decryption Inspection
                </span>
                <span className="text-[9px] text-gray-500">
                  Decrypts TLS sessions to verify inner payloads.
                </span>
              </div>
              <input
                type="checkbox"
                checked={httpsContentInspection}
                onChange={(e) => setHttpsContentInspection(e.target.checked)}
                className="w-4 h-4 text-watchguard-orange rounded accent-watchguard-orange cursor-pointer"
              />
            </div>

            {/* Trust Proxy Authority Certificate */}
            <div
              className={`flex items-center justify-between p-2 border rounded-lg transition-all ${
                httpsContentInspection
                  ? "bg-watchguard-orange/5 border-watchguard-orange/40"
                  : "bg-watchguard-lightgray/10 border-watchguard-border/20 opacity-40 pointer-events-none"
              }`}
            >
              <div>
                <span className="text-xs font-semibold text-watchguard-orange block">
                  Client Trusts Proxy Certificate?
                </span>
                <span className="text-[9px] text-gray-400">
                  Avoids SSL warning by trusting Firebox\'s self-signed CA.
                </span>
              </div>
              <input
                type="checkbox"
                checked={certTrusted}
                onChange={(e) => setCertTrusted(e.target.checked)}
                className="w-4 h-4 text-watchguard-orange rounded accent-watchguard-orange cursor-pointer"
              />
            </div>
          </div>

          {/* Threats (Blocked sites & Blocked ports) */}
          <div className="pt-2 border-t border-watchguard-border/60 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Blocked IP Sites List
              </span>
              <div className="space-y-1 max-h-[70px] overflow-y-auto bg-watchguard-dark/60 p-1.5 rounded border border-watchguard-border/40 scrollbar-thin">
                {blockedSites.map((site) => (
                  <div
                    key={site}
                    className="flex items-center justify-between text-[9px] text-red-400 font-mono"
                  >
                    <span>{site}</span>
                    <button
                      onClick={() =>
                        setBlockedSites((prev) =>
                          prev.filter((s) => s !== site),
                        )
                      }
                      className="hover:text-white"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
              <form
                onSubmit={handleAddSiteBlock}
                className="flex mt-1.5 items-center space-x-1"
              >
                <input
                  type="text"
                  value={newSiteBlock}
                  onChange={(e) => setNewSiteBlock(e.target.value)}
                  placeholder="Block IP..."
                  className="bg-watchguard-dark text-[9px] text-white border border-watchguard-border rounded px-1.5 py-0.5 w-full font-mono focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-watchguard-orange hover:bg-watchguard-orange/90 text-white rounded p-0.5"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </form>
            </div>

            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Blocked Port Numbers
              </span>
              <div className="space-y-1 max-h-[70px] overflow-y-auto bg-watchguard-dark/60 p-1.5 rounded border border-watchguard-border/40 scrollbar-thin">
                {blockedPorts.map((port) => (
                  <div
                    key={port}
                    className="flex items-center justify-between text-[9px] text-red-400 font-mono"
                  >
                    <span>Port {port}</span>
                    <button
                      onClick={() =>
                        setBlockedPorts((prev) =>
                          prev.filter((p) => p !== port),
                        )
                      }
                      className="hover:text-white"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
              <form
                onSubmit={handleAddPortBlock}
                className="flex mt-1.5 items-center space-x-1"
              >
                <input
                  type="text"
                  value={newPortBlock}
                  onChange={(e) => setNewPortBlock(e.target.value)}
                  placeholder="Block Port..."
                  className="bg-watchguard-dark text-[9px] text-white border border-watchguard-border rounded px-1.5 py-0.5 w-full font-mono focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-watchguard-orange hover:bg-watchguard-orange/90 text-white rounded p-0.5"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Hand side: Packet Injector Form */}
        <div className="p-4.5 flex flex-col justify-between bg-watchguard-lightgray/10">
          <form
            onSubmit={handleInjectPacket}
            className="space-y-3.5 h-full flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="space-y-0.5 border-b border-watchguard-border/60 pb-1">
                <h4 className="text-xs font-bold text-white flex items-center space-x-2 uppercase tracking-wide">
                  <Zap className="w-3.5 h-3.5 text-watchguard-orange" />
                  <span>Interactive Flow Injector</span>
                </h4>
                <p className="text-[10px] text-gray-500">
                  Inject custom payloads to audit exact interface routing and
                  GAV filters.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Source Zone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400">
                    Source Interface Zone
                  </label>
                  <select
                    value={srcZone}
                    onChange={(e) => setSrcZone(e.target.value as any)}
                    className="bg-watchguard-dark text-xs text-white border border-watchguard-border rounded px-2 py-1 w-full focus:outline-none"
                  >
                    <option value="trusted">ETH1 (Trusted)</option>
                    <option value="dmz">ETH2 (DMZ / Optional)</option>
                    <option value="external">ETH0 (External / WAN)</option>
                  </select>
                </div>

                {/* Dest Zone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400">
                    Destination Zone
                  </label>
                  <select
                    value={dstZone}
                    onChange={(e) => setDstZone(e.target.value as any)}
                    className="bg-watchguard-dark text-xs text-white border border-watchguard-border rounded px-2 py-1 w-full focus:outline-none"
                  >
                    <option value="external">ETH0 (External / WAN)</option>
                    <option value="trusted">ETH1 (Trusted)</option>
                    <option value="dmz">ETH2 (DMZ / Optional)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                {/* Protocol */}
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-gray-500 block">
                    Protocol
                  </label>
                  <select
                    value={customProtocol}
                    onChange={(e) => setCustomProtocol(e.target.value as any)}
                    className="bg-watchguard-dark text-xs text-white border border-watchguard-border rounded px-1 py-1 w-full focus:outline-none"
                  >
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                    <option value="ICMP">ICMP</option>
                    <option value="HTTPS">HTTPS</option>
                  </select>
                </div>

                {/* Port */}
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-gray-500 block">
                    Dest Port
                  </label>
                  <input
                    type="number"
                    value={customPort}
                    onChange={(e) =>
                      setCustomPort(parseInt(e.target.value, 10))
                    }
                    className="bg-watchguard-dark text-xs text-white border border-watchguard-border rounded px-2 py-1 w-full font-mono focus:outline-none"
                  />
                </div>

                {/* Src IP */}
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-gray-500 block">
                    Source IP
                  </label>
                  <input
                    type="text"
                    value={customSrcIP}
                    onChange={(e) => setCustomSrcIP(e.target.value)}
                    className="bg-watchguard-dark text-xs text-white border border-watchguard-border rounded px-1.5 py-1 w-full font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Payload Field with Quick Malicious Signatures */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-semibold text-gray-400">
                    Payload / Request description
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomPayload(
                        "Malicious payload with infected EICAR test signature",
                      )
                    }
                    className="text-[9px] text-watchguard-orange hover:underline font-mono"
                  >
                    ⚡ LOAD EICAR MALWARE
                  </button>
                </div>
                <input
                  type="text"
                  value={customPayload}
                  onChange={(e) => setCustomPayload(e.target.value)}
                  placeholder="Payload details..."
                  className="bg-watchguard-dark text-xs text-white border border-watchguard-border rounded px-2.5 py-1.5 w-full focus:outline-none font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-watchguard-orange hover:bg-watchguard-orange/90 text-white font-semibold text-xs py-2 rounded-lg transition-all flex items-center justify-center space-x-2 border border-watchguard-orange/40 shadow-lg shadow-watchguard-orange/5 cursor-pointer mt-3"
            >
              <Play className="w-3.5 h-3.5" />
              <span>INJECT TRAFFIC FLOW</span>
            </button>
          </form>
        </div>
      </div>

      {/* SVG Topology & Animation Panel */}
      <div className="flex-1 p-5 flex flex-col justify-center items-center bg-watchguard-dark/40 min-h-[220px] relative overflow-hidden">
        {/* Animated Flying Packet Dot Indicator */}
        <AnimatePresence>
          {animatingPacket && (
            <motion.div
              initial={{
                left:
                  animatingPacket.from === "trusted"
                    ? "75%"
                    : animatingPacket.from === "dmz"
                      ? "50%"
                      : "25%",
                top: animatingPacket.from === "dmz" ? "80%" : "40%",
                scale: 0.8,
                opacity: 1,
              }}
              animate={{
                left: "50%",
                top: "40%",
                scale: [1, 1.4, 1],
              }}
              exit={{
                left:
                  animatingPacket.status === "Allowed"
                    ? animatingPacket.to === "external"
                      ? "25%"
                      : animatingPacket.to === "dmz"
                        ? "50%"
                        : "75%"
                    : "50%", // Drops back or stays at firewall
                top:
                  animatingPacket.status === "Allowed"
                    ? animatingPacket.to === "dmz"
                      ? "80%"
                      : "40%"
                    : "40%",
                opacity: 0,
                scale: animatingPacket.status === "Allowed" ? 0.8 : 0,
              }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className={`absolute w-3.5 h-3.5 rounded-full z-30 flex items-center justify-center border text-[8px] font-mono font-bold text-white shadow-lg ${
                animatingPacket.status === "Allowed"
                  ? "bg-green-500 border-green-300 shadow-green-500/50"
                  : "bg-red-500 border-red-300 shadow-red-500/50"
              }`}
            >
              {animatingPacket.protocol[0]}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Topology Node Grid */}
        <div className="relative w-full max-w-lg grid grid-cols-3 gap-12 text-center items-center z-10">
          {/* External WAN Interface */}
          <div className="flex flex-col items-center space-y-2">
            <div
              className={`w-14 h-14 bg-watchguard-orange/10 border-2 rounded-xl flex items-center justify-center shadow-lg relative transition-all ${
                animatingPacket &&
                animatingPacket.to === "external" &&
                animatingPacket.status === "Allowed"
                  ? "border-green-400 bg-green-500/10 scale-105"
                  : "border-watchguard-orange"
              }`}
            >
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-mono font-bold text-watchguard-orange">
                ETH0
              </span>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white">External</div>
              <div className="text-[9px] font-mono text-gray-500">
                203.0.113.80/24
              </div>
            </div>
          </div>

          {/* Firewall (Central Security Engine) */}
          <div className="flex flex-col items-center space-y-2 relative">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl relative transition-all ${
                animatingPacket
                  ? animatingPacket.status === "Allowed"
                    ? "bg-green-600 scale-105 shadow-green-500/20"
                    : "bg-red-600 scale-105 shadow-red-500/20"
                  : "bg-watchguard-orange"
              }`}
            >
              <Shield className="w-8 h-8 text-white" />
              {/* Spinning security lock ring */}
              <div className="absolute inset-0 border-2 border-dashed border-white/40 rounded-2xl animate-spin"></div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-watchguard-orange uppercase tracking-wider">
                Fireware OS
              </div>
              <div className="text-[9px] font-mono text-gray-500">
                v12.9.2 Active
              </div>
            </div>
          </div>

          {/* Trusted Network Interface */}
          <div className="flex flex-col items-center space-y-2">
            <div
              className={`w-14 h-14 bg-watchguard-lightgray border-2 rounded-xl flex items-center justify-center shadow-lg relative transition-all ${
                animatingPacket && animatingPacket.from === "trusted"
                  ? "border-watchguard-orange bg-watchguard-orange/10 scale-105"
                  : "border-watchguard-border"
              }`}
            >
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full"></div>
              <span className="text-[10px] font-mono font-bold text-gray-400">
                ETH1
              </span>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white">Trusted</div>
              <div className="text-[9px] font-mono text-gray-500">
                10.0.1.1/24
              </div>
            </div>
          </div>
        </div>

        {/* Optional DMZ Interface Node (Eth2) */}
        <div className="flex flex-col items-center space-y-2 mt-5 z-10">
          <div
            className={`w-14 h-14 bg-watchguard-lightgray border-2 rounded-xl flex items-center justify-center shadow-lg relative transition-all ${
              animatingPacket && animatingPacket.from === "dmz"
                ? "border-watchguard-orange bg-watchguard-orange/10 scale-105"
                : "border-watchguard-border"
            }`}
          >
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full"></div>
            <span className="text-[10px] font-mono font-bold text-gray-400">
              ETH2
            </span>
          </div>
          <div className="space-y-0.5 text-center">
            <div className="text-xs font-semibold text-white">
              DMZ (Optional)
            </div>
            <div className="text-[9px] font-mono text-gray-500">
              192.168.10.1/24
            </div>
          </div>
        </div>
      </div>

      {/* Packet Inspection Detail Card */}
      {inspectedPacket && (
        <div className="bg-watchguard-lightgray/90 border-t border-watchguard-border p-4.5 space-y-2 relative">
          <button
            onClick={() => setInspectedPacket(null)}
            className="absolute top-2.5 right-3 text-xs text-gray-400 hover:text-white"
            aria-label="Close Inspect"
          >
            ✕ Close Inspect
          </button>
          <div className="flex items-center space-x-2.5">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                inspectedPacket.status === "Allowed"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {inspectedPacket.status.toUpperCase()}
            </span>
            <span className="text-xs font-semibold text-white">
              Inspected Flow: {inspectedPacket.srcIP}:{inspectedPacket.srcPort}{" "}
              ➔ {inspectedPacket.dstIP}:{inspectedPacket.dstPort} (
              {inspectedPacket.protocol})
            </span>
          </div>
          <div className="text-xs text-gray-300 font-sans leading-relaxed">
            <p className="font-semibold text-watchguard-orange">
              Matched Policy: {inspectedPacket.matchedPolicy}
            </p>
            <p className="text-gray-400 mt-0.5">{inspectedPacket.reason}</p>
          </div>
        </div>
      )}

      {/* Real-time Syslog Terminal Box */}
      <div className="h-[155px] bg-watchguard-dark border-t border-watchguard-border p-4.5 font-mono text-[9px] text-gray-500 flex flex-col justify-between select-text">
        <div className="flex items-center justify-between border-b border-watchguard-border/60 pb-2 mb-2">
          <span className="flex items-center space-x-1.5 text-watchguard-orange font-bold">
            <Terminal className="w-3.5 h-3.5" />
            <span>
              FSM TRAFFIC MONITOR STREAM (CLICK A PACKET LINE TO INSPECT)
            </span>
          </span>
          <span className="animate-pulse text-green-500 font-mono text-[8px] tracking-wide">
            LIVE SYSLOG FEED
          </span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
          {activeConsoleLog.length === 0 ? (
            <div className="text-center py-8 text-gray-600 italic">
              Awaiting network traffic simulation... Deploy custom flows above.
            </div>
          ) : (
            activeConsoleLog.map((log, idx) => {
              const isDeny = log.includes("Deny");
              return (
                <div
                  key={idx}
                  onClick={() => {
                    // Extract match values to find historical packet
                    const parts = log.split(" ");
                    const srcIP = parts[2];
                    const dstIP = parts[3];
                    const matched = packets.find(
                      (p) => p.srcIP === srcIP && p.dstIP === dstIP,
                    );
                    if (matched) setInspectedPacket(matched);
                  }}
                  className={`leading-normal break-all font-mono py-1 rounded px-1.5 transition-all cursor-pointer hover:bg-watchguard-lightgray/20 ${
                    isDeny
                      ? "text-red-400/90 bg-red-500/5 border-l-2 border-red-500 pl-1.5"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {log}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
