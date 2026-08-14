import * as React from "react";
import { Terminal } from "lucide-react";
import { Packet } from "./types"; // We will create this

interface SyslogTerminalProps {
  inspectedPacket: Packet | null;
  setInspectedPacket: (val: Packet | null) => void;
  activeConsoleLog: string[];
  packetLookupMap: Map<string, Packet>;
}

export function SyslogTerminal({
  inspectedPacket,
  setInspectedPacket,
  activeConsoleLog,
  packetLookupMap
}: SyslogTerminalProps) {
  return (
    <>
      {/* Packet Inspection Detail Card */}
      {inspectedPacket && (
        <div className="bg-watchguard-lightgray/90 border-t border-watchguard-border p-4.5 space-y-2 relative">
          <button
            onClick={() => setInspectedPacket(null)}
            className="absolute top-2.5 right-3 text-xs text-gray-400 hover:text-white"
          >
            ✕ Close Inspect
          </button>
          <div className="flex items-center space-x-2.5">
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              inspectedPacket.status === "Allowed" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}>
              {inspectedPacket.status.toUpperCase()}
            </span>
            <span className="text-xs font-semibold text-white">
              Inspected Flow: {inspectedPacket.srcIP}:{inspectedPacket.srcPort} ➔ {inspectedPacket.dstIP}:{inspectedPacket.dstPort} ({inspectedPacket.protocol})
            </span>
          </div>
          <div className="text-xs text-gray-300 font-sans leading-relaxed">
            <p className="font-semibold text-watchguard-orange">Matched Policy: {inspectedPacket.matchedPolicy}</p>
            <p className="text-gray-400 mt-0.5">{inspectedPacket.reason}</p>
          </div>
        </div>
      )}

      {/* Real-time Syslog Terminal Box */}
      <div className="h-[155px] bg-watchguard-dark border-t border-watchguard-border p-4.5 font-mono text-[9px] text-gray-500 flex flex-col justify-between select-text">
        <div className="flex items-center justify-between border-b border-watchguard-border/60 pb-2 mb-2">
          <span className="flex items-center space-x-1.5 text-watchguard-orange font-bold">
            <Terminal className="w-3.5 h-3.5" />
            <span>FSM TRAFFIC MONITOR STREAM (CLICK A PACKET LINE TO INSPECT)</span>
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
                    const matched = packetLookupMap.get(`${srcIP}-${dstIP}`);
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
    </>
  );
}
