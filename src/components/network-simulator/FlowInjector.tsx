import * as React from "react";
import { Zap, Play } from "lucide-react";

interface FlowInjectorProps {
  srcZone: "trusted" | "dmz" | "external";
  setSrcZone: (val: "trusted" | "dmz" | "external") => void;
  dstZone: "trusted" | "dmz" | "external";
  setDstZone: (val: "trusted" | "dmz" | "external") => void;
  customProtocol: "TCP" | "UDP" | "ICMP" | "HTTPS";
  setCustomProtocol: (val: "TCP" | "UDP" | "ICMP" | "HTTPS") => void;
  customPort: number;
  setCustomPort: (val: number) => void;
  customSrcIP: string;
  setCustomSrcIP: (val: string) => void;
  customDstIP: string;
  setCustomDstIP: (val: string) => void;
  customPayload: string;
  setCustomPayload: (val: string) => void;
  handleInjectPacket: (e?: React.FormEvent) => void;
}

export function FlowInjector({
  srcZone,
  setSrcZone,
  dstZone,
  setDstZone,
  customProtocol,
  setCustomProtocol,
  customPort,
  setCustomPort,
  customSrcIP,
  setCustomSrcIP,
  customDstIP,
  setCustomDstIP,
  customPayload,
  setCustomPayload,
  handleInjectPacket
}: FlowInjectorProps) {
  return (
    <div className="p-4.5 flex flex-col justify-between bg-watchguard-lightgray/10 h-full">
      <form onSubmit={handleInjectPacket} className="space-y-3.5 h-full flex flex-col justify-between">
        <div className="space-y-3">
          <div className="space-y-0.5 border-b border-watchguard-border/60 pb-1">
            <h4 className="text-xs font-bold text-white flex items-center space-x-2 uppercase tracking-wide">
              <Zap className="w-3.5 h-3.5 text-watchguard-orange" />
              <span>Interactive Flow Injector</span>
            </h4>
            <p className="text-[10px] text-gray-500">Send a simulated flow through the policies shown. No network traffic leaves your browser.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Source Zone */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-400">Source Interface Zone</label>
              <select
                aria-label="Source Interface Zone"
                value={srcZone}
                onChange={e => setSrcZone(e.target.value as "trusted" | "dmz" | "external")}
                className="bg-watchguard-dark text-xs text-white border border-watchguard-border rounded px-2 py-1 w-full focus:outline-none"
              >
                <option value="trusted">ETH1 (Trusted)</option>
                <option value="dmz">ETH2 (DMZ / Optional)</option>
                <option value="external">ETH0 (External / WAN)</option>
              </select>
            </div>

            {/* Dest Zone */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-400">Destination Zone</label>
              <select
                aria-label="Destination Zone"
                value={dstZone}
                onChange={e => setDstZone(e.target.value as "trusted" | "dmz" | "external")}
                className="bg-watchguard-dark text-xs text-white border border-watchguard-border rounded px-2 py-1 w-full focus:outline-none"
              >
                <option value="external">ETH0 (External / WAN)</option>
                <option value="trusted">ETH1 (Trusted)</option>
                <option value="dmz">ETH2 (DMZ / Optional)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Protocol */}
            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-gray-500 block">Protocol</label>
              <select
                aria-label="Protocol"
                value={customProtocol}
                onChange={e => setCustomProtocol(e.target.value as "TCP" | "UDP" | "ICMP" | "HTTPS")}
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
              <label className="text-[9px] font-semibold text-gray-500 block">Dest Port</label>
              <input
                type="number" min={1} max={65535} disabled={customProtocol==='ICMP'}
                aria-label="Destination port"
                value={customPort}
                onChange={e => setCustomPort(parseInt(e.target.value, 10))}
                className="bg-watchguard-dark text-xs text-white border border-watchguard-border rounded px-2 py-1 w-full font-mono focus:outline-none"
              />
            </div>

            {/* Src IP */}
            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-gray-500 block">Source IP</label>
              <input
                type="text"
                aria-label="Source IP"
                value={customSrcIP}
                onChange={e => setCustomSrcIP(e.target.value)}
                className="bg-watchguard-dark text-xs text-white border border-watchguard-border rounded px-1.5 py-1 w-full font-mono focus:outline-none"
              />
            </div>
          </div>

          <label className="block text-xs text-gray-400">Destination IP<input aria-label="Destination IP" value={customDstIP} onChange={e=>setCustomDstIP(e.target.value)} className="w-full mt-1 bg-watchguard-dark text-white border border-watchguard-border rounded px-3 py-2 font-mono"/></label>
          {/* Payload Field with Quick Malicious Signatures */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-semibold text-gray-400">Payload / Request description</label>
              <button
                type="button"
                onClick={() => setCustomPayload("EICAR test marker")}
                className="text-[9px] text-watchguard-orange hover:underline font-mono"
              >
                Load harmless EICAR marker
              </button>
            </div>
            <input
              type="text"
              value={customPayload}
              onChange={e => setCustomPayload(e.target.value)}
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
          <span>Run test flow</span>
        </button>
      </form>
    </div>
  );
}
