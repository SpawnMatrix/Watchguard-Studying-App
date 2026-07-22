import { useState, useRef, useEffect, RefObject } from "react";
import { Send, Search, Compass, User, Bot, AlertTriangle, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Message } from "../types/chat";
import { parseBold } from "../utils/textFormatting";

interface AIChatModeProps {
  messages: Message[];
  isLoading: boolean;
  inputValue: string;
  setInputValue: (val: string) => void;
  handleSend: (text: string) => void;
  scrollRef: RefObject<HTMLDivElement>;
  suggestedPrompts: string[];
}

export default function AIChatMode({
  messages,
  isLoading,
  inputValue,
  setInputValue,
  handleSend,
  scrollRef,
  suggestedPrompts
}: AIChatModeProps) {
  return (
    <div className="flex flex-col flex-1 min-h-[450px]">
      {/* Messages Window */}
      <div
        ref={scrollRef as any}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-watchguard-dark/40"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex space-x-3 max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse space-x-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${
                  msg.sender === "user"
                    ? "bg-watchguard-lightgray border-watchguard-border text-white"
                    : "bg-watchguard-orange/10 border-watchguard-orange/30 text-watchguard-orange"
                }`}>
                  {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Body */}
                <div className="space-y-3">
                  <div className={`px-4 py-3.5 rounded-xl border text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-watchguard-orange text-white border-watchguard-orange/50 shadow-lg shadow-watchguard-orange/5"
                      : "bg-watchguard-lightgray text-gray-200 border-watchguard-border"
                  }`}>
                    {/* Render Markdown Text */}
                    <div className="whitespace-pre-wrap select-text font-sans">
                      {msg.text.split("\n").map((line, idx) => {
                        if (line.startsWith("* ") || line.startsWith("- ")) {
                          return <div key={idx} className="pl-4 my-1 flex items-start space-x-2">
                            <span className="text-watchguard-orange mt-1.5 text-[8px]">■</span>
                            <span>{parseBold(line.substring(2))}</span>
                          </div>;
                        }
                        if (/^\d+\s*\.\s/.test(line)) {
                          const numMatch = line.match(/^\d+/);
                          const num = numMatch ? numMatch[0] : "1";
                          return <div key={idx} className="pl-4 my-1 flex items-start space-x-2">
                            <span className="text-watchguard-orange font-mono font-medium">{num}.</span>
                            <span>{parseBold(line.substring(num.length + 2))}</span>
                          </div>;
                        }
                        return <p key={idx} className="my-1.5">{parseBold(line)}</p>;
                      })}
                    </div>

                    {msg.isDemo && (
                      <div className="mt-3 pt-2 border-t border-watchguard-border flex items-center space-x-2 text-[10px] font-mono text-gray-400">
                        <AlertTriangle className="w-3.5 h-3.5 text-watchguard-orange" />
                        <span>Demo Offline Mode • Fallback Answers Loaded</span>
                      </div>
                    )}
                  </div>

                  {/* External Lookup Module */}
                  {msg.sender === "bot" && msg.requiresExternalLookup && msg.suggestedSearchTerms && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 bg-watchguard-orange/5 border border-watchguard-orange/20 rounded-xl space-y-2.5 max-w-lg"
                    >
                      <div className="flex items-center space-x-2 text-xs font-semibold text-watchguard-orange">
                        <Search className="w-3.5 h-3.5" />
                        <span>RECOMMENDED EXTERNAL LOOKUP</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-normal">
                        This query involves dynamic or obscure configuration rules. For verified specifications, search the official WatchGuard documentation:
                      </p>
                      <a
                        href={`https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/overview/firebox_overview.html?q=${encodeURIComponent(msg.suggestedSearchTerms)}`}
                        target="_blank"
                        rel="referrer noopener"
                        className="inline-flex items-center space-x-2 px-3 py-1.5 bg-watchguard-orange/10 hover:bg-watchguard-orange/20 text-watchguard-orange text-xs font-mono font-medium rounded border border-watchguard-orange/30 transition-all"
                      >
                        <span>Search Guide: "{msg.suggestedSearchTerms}"</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex space-x-3 max-w-[85%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-watchguard-orange/10 border border-watchguard-orange/20 text-watchguard-orange flex items-center justify-center">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="px-4 py-3 bg-watchguard-lightgray text-gray-400 border border-watchguard-border rounded-xl text-sm flex items-center space-x-2">
                <span className="animate-pulse-soft font-mono text-xs">Formulating click-by-click topology mapping...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Prompts Shelf */}
      {messages.length === 1 && (
        <div className="px-6 py-4 bg-watchguard-dark/20 border-t border-watchguard-border space-y-2">
          <p className="text-xs font-semibold text-gray-400 flex items-center space-x-1.5">
            <Compass className="w-3.5 h-3.5 text-watchguard-orange" />
            <span>Select a Certification Study Path</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suggestedPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                className="text-left px-3.5 py-2.5 bg-watchguard-lightgray hover:bg-watchguard-lightgray/80 text-gray-300 hover:text-white text-xs rounded-lg border border-watchguard-border hover:border-watchguard-orange/40 transition-all font-sans select-none cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Tray */}
      <div className="p-4 bg-watchguard-lightgray border-t border-watchguard-border flex items-center space-x-2.5">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend(inputValue)}
          placeholder="Ask a technical path query or exam topic (e.g., policy precedence)..."
          className="flex-1 bg-watchguard-dark text-white border border-watchguard-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-watchguard-orange transition-all font-sans placeholder:text-gray-500"
        />
        <button
          onClick={() => handleSend(inputValue)}
          disabled={!inputValue.trim() || isLoading}
          className="p-2.5 bg-watchguard-orange hover:bg-watchguard-orange/95 disabled:bg-watchguard-lightgray disabled:border-watchguard-border text-white rounded-lg transition-all shadow-lg hover:shadow-watchguard-orange/10 flex items-center justify-center border border-watchguard-orange/40 disabled:text-gray-500 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
