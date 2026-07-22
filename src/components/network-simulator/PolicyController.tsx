import * as React from "react";
import { Settings, Trash2, Plus } from "lucide-react";

interface PolicyControllerProps {
  outgoingEnabled: boolean;
  setOutgoingOutgoing: (val: boolean) => void;
  dnsPolicyEnabled: boolean;
  setDnsPolicyEnabled: (val: boolean) => void;
  httpProxyEnabled: boolean;
  setHttpProxyEnabled: (val: boolean) => void;
  httpsContentInspection: boolean;
  setHttpsContentInspection: (val: boolean) => void;
  certTrusted: boolean;
  setCertTrusted: (val: boolean) => void;
  blockedSites: string[];
  setBlockedSites: React.Dispatch<React.SetStateAction<string[]>>;
  blockedPorts: number[];
  setBlockedPorts: React.Dispatch<React.SetStateAction<number[]>>;
  newSiteBlock: string;
  setNewSiteBlock: (val: string) => void;
  newPortBlock: string;
  setNewPortBlock: (val: string) => void;
  handleAddSiteBlock: (e: React.FormEvent) => void;
  handleAddPortBlock: (e: React.FormEvent) => void;
}

export function PolicyController({
  outgoingEnabled,
  setOutgoingOutgoing,
  dnsPolicyEnabled,
  setDnsPolicyEnabled,
  httpProxyEnabled,
  setHttpProxyEnabled,
  httpsContentInspection,
  setHttpsContentInspection,
  certTrusted,
  setCertTrusted,
  blockedSites,
  setBlockedSites,
  blockedPorts,
  setBlockedPorts,
  newSiteBlock,
  setNewSiteBlock,
  newPortBlock,
  setNewPortBlock,
  handleAddSiteBlock,
  handleAddPortBlock
}: PolicyControllerProps) {
  return (
    <div className="p-4.5 border-r border-watchguard-border space-y-4 bg-watchguard-dark/40 overflow-y-auto max-h-[420px] scrollbar-thin">
      <div className="space-y-1 pb-1 border-b border-watchguard-border/60">
        <h4 className="text-xs font-bold text-white flex items-center space-x-2 uppercase tracking-wide">
          <Settings className="w-3.5 h-3.5 text-watchguard-orange" />
          <span>Firebox Security Policy Controller</span>
        </h4>
        <p className="text-[10px] text-gray-500">Configure firewall rulesets in real-time to watch their immediate impact on routing flows.</p>
      </div>

      <div className="space-y-2.5">
        {/* Outgoing Policy */}
        <div className="flex items-center justify-between p-2 bg-watchguard-lightgray/30 border border-watchguard-border/40 rounded-lg">
          <div>
            <span className="text-xs font-semibold text-gray-200 block">Default Outgoing Policy (TCP-UDP)</span>
            <span className="text-[9px] text-gray-500">Allow outbound connections on any port by default.</span>
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
            <span className="text-xs font-semibold text-gray-200 block">DNS Policy (UDP/53)</span>
            <span className="text-[9px] text-gray-500 font-sans">Explicit allow rule for outbound port 53 lookup.</span>
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
            <span className="text-xs font-semibold text-gray-200 block">HTTP Proxy Action & GAV Scanner</span>
            <span className="text-[9px] text-gray-500">Deep packet inspection. Scans files for virus signatures.</span>
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
            <span className="text-xs font-semibold text-gray-200 block">HTTPS Content Decryption Inspection</span>
            <span className="text-[9px] text-gray-500">Decrypts TLS sessions to verify inner payloads.</span>
          </div>
          <input
            type="checkbox"
            checked={httpsContentInspection}
            onChange={(e) => setHttpsContentInspection(e.target.checked)}
            className="w-4 h-4 text-watchguard-orange rounded accent-watchguard-orange cursor-pointer"
          />
        </div>

        {/* Trust Proxy Authority Certificate */}
        <div className={`flex items-center justify-between p-2 border rounded-lg transition-all ${
          httpsContentInspection ? "bg-watchguard-orange/5 border-watchguard-orange/40" : "bg-watchguard-lightgray/10 border-watchguard-border/20 opacity-40 pointer-events-none"
        }`}>
          <div>
            <span className="text-xs font-semibold text-watchguard-orange block">Client Trusts Proxy Certificate?</span>
            <span className="text-[9px] text-gray-400">Avoids SSL warning by trusting Firebox\'s self-signed CA.</span>
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
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Blocked IP Sites List</span>
          <div className="space-y-1 max-h-[70px] overflow-y-auto bg-watchguard-dark/60 p-1.5 rounded border border-watchguard-border/40 scrollbar-thin">
            {blockedSites.map(site => (
              <div key={site} className="flex items-center justify-between text-[9px] text-red-400 font-mono">
                <span>{site}</span>
                <button onClick={() => setBlockedSites(prev => prev.filter(s => s !== site))} className="hover:text-white">
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddSiteBlock} className="flex mt-1.5 items-center space-x-1">
            <input
              type="text"
              value={newSiteBlock}
              onChange={e => setNewSiteBlock(e.target.value)}
              placeholder="Block IP..."
              className="bg-watchguard-dark text-[9px] text-white border border-watchguard-border rounded px-1.5 py-0.5 w-full font-mono focus:outline-none"
            />
            <button type="submit" className="bg-watchguard-orange hover:bg-watchguard-orange/90 text-white rounded p-0.5">
              <Plus className="w-2.5 h-2.5" />
            </button>
          </form>
        </div>

        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Blocked Port Numbers</span>
          <div className="space-y-1 max-h-[70px] overflow-y-auto bg-watchguard-dark/60 p-1.5 rounded border border-watchguard-border/40 scrollbar-thin">
            {blockedPorts.map(port => (
              <div key={port} className="flex items-center justify-between text-[9px] text-red-400 font-mono">
                <span>Port {port}</span>
                <button onClick={() => setBlockedPorts(prev => prev.filter(p => p !== port))} className="hover:text-white">
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddPortBlock} className="flex mt-1.5 items-center space-x-1">
            <input
              type="text"
              value={newPortBlock}
              onChange={e => setNewPortBlock(e.target.value)}
              placeholder="Block Port..."
              className="bg-watchguard-dark text-[9px] text-white border border-watchguard-border rounded px-1.5 py-0.5 w-full font-mono focus:outline-none"
            />
            <button type="submit" className="bg-watchguard-orange hover:bg-watchguard-orange/90 text-white rounded p-0.5">
              <Plus className="w-2.5 h-2.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
