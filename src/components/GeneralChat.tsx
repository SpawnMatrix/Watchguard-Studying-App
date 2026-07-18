import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Search, Compass, BookOpen, User, Bot, AlertTriangle, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  requiresExternalLookup?: boolean;
  suggestedSearchTerms?: string;
  isDemo?: boolean;
}

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

  const suggestedPrompts = [
    "What are the factory default interface settings?",
    "Explain policy precedence and Auto-Order mode",
    "How does NAT Loopback work on a Firebox?",
    "How do I set up Content Inspection in HTTPS-proxy?"
  ];

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
      console.error("Chat error:", error);
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
    <div className="flex flex-col h-full bg-watchguard-gray border border-watchguard-border rounded-xl overflow-hidden shadow-2xl">
      {/* Mentor Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-watchguard-lightgray border-b border-watchguard-border">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-watchguard-orange/15 rounded-lg border border-watchguard-orange/40">
            <Bot className="w-5 h-5 text-watchguard-orange animate-pulse-soft" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-white tracking-tight">AI Certification Mentor</h2>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
              <span className="text-[10px] font-mono text-gray-400">Level 3 Systems Engineer Mode</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-gray-400 bg-watchguard-dark px-3 py-1.5 rounded border border-watchguard-border">
          <BookOpen className="w-3.5 h-3.5 text-watchguard-orange" />
          <span>Fireware v12.9.2+ Syllabus</span>
        </div>
      </div>

      {/* Messages Window */}
      <div 
        ref={scrollRef}
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
                    {/* Render Markdown Text (Simulated parsing for code, tables, bold text) */}
                    <div className="whitespace-pre-wrap select-text font-sans">
                      {msg.text.split("\n").map((line, idx) => {
                        // Simple list renderer
                        if (line.startsWith("* ") || line.startsWith("- ")) {
                          return <div key={idx} className="pl-4 my-1 flex items-start space-x-2">
                            <span className="text-watchguard-orange mt-1.5 text-[8px]">■</span>
                            <span>{parseBold(line.substring(2))}</span>
                          </div>;
                        }
                        // Step number renderer
                        if (/^\d+\.\s/.test(line)) {
                          const num = line.match(/^\d+/)![0];
                          return <div key={idx} className="pl-4 my-1 flex items-start space-x-2">
                            <span className="text-watchguard-orange font-mono font-medium">{num}.</span>
                            <span>{parseBold(line.substring(num.length + 2))}</span>
                          </div>;
                        }
                        // Path highlighter custom tag
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
                        This query involves dynamic or obscure cloud integrations. For verified live specifications, search the WatchGuard Wiki:
                      </p>
                      <a 
                        href={`https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/overview/firebox_overview.html?q=${encodeURIComponent(msg.suggestedSearchTerms)}`}
                        target="_blank" 
                        rel="referrer noopener"
                        className="inline-flex items-center space-x-2 px-3 py-1.5 bg-watchguard-orange/10 hover:bg-watchguard-orange/20 text-watchguard-orange text-xs font-mono font-medium rounded border border-watchguard-orange/30 transition-all"
                      >
                        <span>Search: "{msg.suggestedSearchTerms}"</span>
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
                <span className="animate-pulse-soft">Formulating click-by-click topology mapping...</span>
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
                className="text-left px-3.5 py-2.5 bg-watchguard-lightgray hover:bg-watchguard-lightgray/80 text-gray-300 hover:text-white text-xs rounded-lg border border-watchguard-border hover:border-watchguard-orange/40 transition-all font-sans select-none"
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
          className="p-2.5 bg-watchguard-orange hover:bg-watchguard-orange/95 disabled:bg-watchguard-lightgray disabled:border-watchguard-border text-white rounded-lg transition-all shadow-lg hover:shadow-watchguard-orange/10 flex items-center justify-center border border-watchguard-orange/40 disabled:text-gray-500"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Simple Helper to parse bold text e.g. **text** and `code` patterns
function parseBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="px-1.5 py-0.5 bg-watchguard-dark border border-watchguard-border rounded text-xs text-watchguard-orange font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}
