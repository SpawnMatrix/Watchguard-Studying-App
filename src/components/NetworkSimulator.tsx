import { useEffect, useState } from "react";
import { Terminal, Shield, Cpu, RefreshCw, Layers, CheckCircle } from "lucide-react";
import { motion } from "motion/react";

interface Packet {
  id: number;
  from: "trusted" | "dmz" | "external";
  to: "trusted" | "dmz" | "external";
  protocol: "TCP" | "UDP" | "ICMP" | "HTTPS";
  status: "Allowed" | "Denied";
}

export default function NetworkSimulator() {
  const [packets, setPackets] = useState<Packet[]>([
    { id: 1, from: "trusted", to: "external", protocol: "HTTPS", status: "Allowed" },
    { id: 2, from: "external", to: "dmz", protocol: "TCP", status: "Denied" }
  ]);
  const [activeConsoleLog, setActiveConsoleLog] = useState<string[]>([
    "FSM Console initialized. Monitoring interfaces...",
    "Interface eth0 (External) link status Up. IP: DHCP Client",
    "Interface eth1 (Trusted) link status Up. IP: 10.0.1.1/24",
    "Interface eth2 (Optional) link status Up. IP: 192.168.10.1/24"
  ]);

  // Dynamic packet generator
  useEffect(() => {
    const protocols: Packet["protocol"][] = ["TCP", "UDP", "ICMP", "HTTPS"];
    const locations: Packet["from"][] = ["trusted", "dmz", "external"];
    
    const interval = setInterval(() => {
      const from = locations[Math.floor(Math.random() * locations.length)];
      let to = locations[Math.floor(Math.random() * locations.length)];
      while (to === from) {
        to = locations[Math.floor(Math.random() * locations.length)];
      }
      const protocol = protocols[Math.floor(Math.random() * protocols.length)];
      
      // Default rule: outgoing from trusted is allowed, incoming to trusted is denied unless loopback/policy
      const status = (from === "trusted" || (from === "dmz" && to === "external")) ? "Allowed" : "Denied";

      const newPacket: Packet = {
        id: Date.now(),
        from,
        to,
        protocol,
        status
      };

      setPackets(prev => [newPacket, ...prev.slice(0, 5)]);

      // Construct a professional Syslog line
      const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
      const srcIP = from === "trusted" ? `10.0.1.${Math.floor(Math.random() * 80) + 10}` : from === "dmz" ? `192.168.10.${Math.floor(Math.random() * 80) + 10}` : `203.0.113.${Math.floor(Math.random() * 200)}`;
      const dstIP = to === "trusted" ? "10.0.1.5" : to === "dmz" ? "192.168.10.5" : `8.8.8.${Math.floor(Math.random() * 8) + 1}`;
      const srcPort = Math.floor(Math.random() * 40000) + 1024;
      const dstPort = protocol === "HTTPS" ? 443 : protocol === "UDP" ? 53 : 80;
      
      const logLine = `${timestamp} ${status === "Allowed" ? "Allow" : "Deny"} ${srcIP} ${dstIP} ${srcPort} ${dstPort} ${protocol} ${from} -> ${to} ${status === "Denied" ? "(Unhandled Internal Packet-00)" : ""}`;

      setActiveConsoleLog(prev => [logLine, ...prev.slice(0, 30)]);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col bg-watchguard-gray border border-watchguard-border rounded-xl overflow-hidden shadow-2xl h-full font-sans select-none">
      {/* Simulation Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-watchguard-lightgray border-b border-watchguard-border text-xs font-semibold text-white">
        <span className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-watchguard-orange animate-spin" />
          <span>Real-time Interface & Packet Visualizer</span>
        </span>
        <span className="text-[10px] font-mono text-gray-500 bg-watchguard-dark px-2 py-0.5 rounded border border-watchguard-border/60">
          Firebox M270 Model Sandbox
        </span>
      </div>

      {/* SVG Topology Stage */}
      <div className="flex-1 p-6 flex flex-col justify-center items-center bg-watchguard-dark/30 min-h-[220px] relative overflow-hidden">
        
        {/* SVG connection lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <line x1="15%" y1="50%" x2="50%" y2="50%" stroke="rgba(255,102,0,0.15)" strokeWidth="2" strokeDasharray="5,5" />
          <line x1="85%" y1="50%" x2="50%" y2="50%" stroke="rgba(255,102,0,0.15)" strokeWidth="2" strokeDasharray="5,5" />
          <line x1="50%" y1="15%" x2="50%" y2="50%" stroke="rgba(255,102,0,0.15)" strokeWidth="2" strokeDasharray="5,5" />
        </svg>

        {/* Dynamic Topology Node Grid */}
        <div className="relative w-full max-w-lg grid grid-cols-3 gap-12 text-center items-center z-10">
          
          {/* External WAN Interface */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-14 h-14 bg-watchguard-orange/10 border-2 border-watchguard-orange rounded-xl flex items-center justify-center shadow-lg relative group">
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full"></div>
              <span className="text-[10px] font-mono font-bold text-watchguard-orange">ETH0</span>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white">External</div>
              <div className="text-[9px] font-mono text-gray-500">203.0.113.80/24</div>
            </div>
          </div>

          {/* Firewall (Central Security Engine) */}
          <div className="flex flex-col items-center space-y-2 relative">
            <div className="w-16 h-16 bg-watchguard-orange text-white rounded-2xl flex items-center justify-center shadow-2xl relative">
              <Shield className="w-8 h-8" />
              {/* Spinning security lock ring */}
              <div className="absolute inset-0 border-2 border-dashed border-white/40 rounded-2xl animate-spin"></div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-watchguard-orange uppercase tracking-wider">Fireware OS</div>
              <div className="text-[9px] font-mono text-gray-500">v12.9.2 Active</div>
            </div>
          </div>

          {/* Trusted Network Interface */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-14 h-14 bg-watchguard-lightgray border-2 border-watchguard-border rounded-xl flex items-center justify-center shadow-lg relative">
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full"></div>
              <span className="text-[10px] font-mono font-bold text-gray-400">ETH1</span>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white">Trusted</div>
              <div className="text-[9px] font-mono text-gray-500">10.0.1.1/24</div>
            </div>
          </div>
        </div>

        {/* Optional DMZ Interface Node (Eth2) */}
        <div className="flex flex-col items-center space-y-2 mt-6 z-10">
          <div className="w-14 h-14 bg-watchguard-lightgray border-2 border-watchguard-border rounded-xl flex items-center justify-center shadow-lg relative">
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full"></div>
            <span className="text-[10px] font-mono font-bold text-gray-400">ETH2</span>
          </div>
          <div className="space-y-0.5 text-center">
            <div className="text-xs font-semibold text-white">DMZ (Optional)</div>
            <div className="text-[9px] font-mono text-gray-500">192.168.10.1/24</div>
          </div>
        </div>
      </div>

      {/* Real-time Syslog Terminal Box */}
      <div className="h-[150px] bg-watchguard-dark border-t border-watchguard-border p-4.5 font-mono text-[9px] text-gray-500 flex flex-col justify-between select-text">
        <div className="flex items-center justify-between border-b border-watchguard-border/60 pb-2 mb-2">
          <span className="flex items-center space-x-1.5 text-watchguard-orange">
            <Terminal className="w-3.5 h-3.5" />
            <span>FSM TRAFFIC MONITOR STREAM</span>
          </span>
          <span className="text-[8px] bg-watchguard-orange/15 text-watchguard-orange px-1.5 py-0.5 rounded tracking-wide border border-watchguard-orange/20 uppercase">
            Auto-Refreshed
          </span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin">
          {activeConsoleLog.map((log, idx) => {
            const isDeny = log.includes("Deny");
            return (
              <div key={idx} className={`leading-normal break-all font-mono py-0.5 rounded px-1 transition-all ${isDeny ? "text-red-400/90 bg-red-500/5 border-l-2 border-red-500 pl-1.5" : "text-gray-400"}`}>
                {log}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
