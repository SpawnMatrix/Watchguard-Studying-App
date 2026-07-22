import * as React from "react";
import { Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TopologyPanelProps {
  animatingPacket: {
    from: string;
    to: string;
    status: "Allowed" | "Denied";
    protocol: string;
  } | null;
}

export function TopologyPanel({ animatingPacket }: TopologyPanelProps) {
  return (
    <div className="flex-1 p-5 flex flex-col justify-center items-center bg-watchguard-dark/40 min-h-[220px] relative overflow-hidden">

      {/* Animated Flying Packet Dot Indicator */}
      <AnimatePresence>
        {animatingPacket && (
          <motion.div
            initial={{
              left: animatingPacket.from === "trusted" ? "75%" : animatingPacket.from === "dmz" ? "50%" : "25%",
              top: animatingPacket.from === "dmz" ? "80%" : "40%",
              scale: 0.8,
              opacity: 1
            }}
            animate={{
              left: "50%",
              top: "40%",
              scale: [1, 1.4, 1],
            }}
            exit={{
              left: animatingPacket.status === "Allowed"
                ? (animatingPacket.to === "external" ? "25%" : animatingPacket.to === "dmz" ? "50%" : "75%")
                : "50%", // Drops back or stays at firewall
              top: animatingPacket.status === "Allowed"
                ? (animatingPacket.to === "dmz" ? "80%" : "40%")
                : "40%",
              opacity: 0,
              scale: animatingPacket.status === "Allowed" ? 0.8 : 0
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
          <div className={`w-14 h-14 bg-watchguard-orange/10 border-2 rounded-xl flex items-center justify-center shadow-lg relative transition-all ${
            animatingPacket && animatingPacket.to === "external" && animatingPacket.status === "Allowed"
              ? "border-green-400 bg-green-500/10 scale-105"
              : "border-watchguard-orange"
          }`}>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-mono font-bold text-watchguard-orange">ETH0</span>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-white">External</div>
            <div className="text-[9px] font-mono text-gray-500">203.0.113.80/24</div>
          </div>
        </div>

        {/* Firewall (Central Security Engine) */}
        <div className="flex flex-col items-center space-y-2 relative">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl relative transition-all ${
            animatingPacket
              ? (animatingPacket.status === "Allowed" ? "bg-green-600 scale-105 shadow-green-500/20" : "bg-red-600 scale-105 shadow-red-500/20")
              : "bg-watchguard-orange"
          }`}>
            <Shield className="w-8 h-8 text-white" />
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
          <div className={`w-14 h-14 bg-watchguard-lightgray border-2 rounded-xl flex items-center justify-center shadow-lg relative transition-all ${
            animatingPacket && animatingPacket.from === "trusted"
              ? "border-watchguard-orange bg-watchguard-orange/10 scale-105"
              : "border-watchguard-border"
          }`}>
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
      <div className="flex flex-col items-center space-y-2 mt-5 z-10">
        <div className={`w-14 h-14 bg-watchguard-lightgray border-2 rounded-xl flex items-center justify-center shadow-lg relative transition-all ${
          animatingPacket && animatingPacket.from === "dmz"
            ? "border-watchguard-orange bg-watchguard-orange/10 scale-105"
            : "border-watchguard-border"
        }`}>
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full"></div>
          <span className="text-[10px] font-mono font-bold text-gray-400">ETH2</span>
        </div>
        <div className="space-y-0.5 text-center">
          <div className="text-xs font-semibold text-white">DMZ (Optional)</div>
          <div className="text-[9px] font-mono text-gray-500">192.168.10.1/24</div>
        </div>
      </div>
    </div>
  );
}
