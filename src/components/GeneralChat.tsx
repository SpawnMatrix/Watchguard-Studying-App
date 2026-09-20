import { useLearningTrack, learningTrackLabels } from '../engine/LearningTrack';
import { authoredQuestions } from '../data/authoredQuestions';
import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Sparkles, Search, Compass, BookOpen, User, Bot, AlertTriangle, ExternalLink, HelpCircle, Layers, CheckCircle, ChevronDown, ChevronUp, Link } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AIChatMode from "./AIChatMode";
import QADeskMode from "./QADeskMode";
import { handleError } from "../utils/errorHandler";
import { LOCAL_QA_DATABASE } from "../data/qaDesk";

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
  const {track}=useLearningTrack();
  const trackQA=useMemo(()=>track==='local'?LOCAL_QA_DATABASE:authoredQuestions.filter(q=>q.track===track).map(q=>({id:q.id,question:q.question,answer:q.correctAnswers.join('; ')+'\n\n'+q.explanation,category:q.topic,keywords:[q.topic,q.objective||''],refLink:q.sources?.find(s=>s.url)?.url})),[track]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      sender: "bot",
      text: "Hello! I am your AI study tutor for Network Security Essentials. I can help you study policy configuration, routing, NAT structures, and VPN configurations for locally-managed Fireboxes. \n\nWhat are you currently reviewing? Ask me anything, or pick one of the quick study paths below!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Dynamic state loaded from backend
  const [mode, setMode] = useState<"ai" | "qa">("qa"); // Default to QA (Local Syllabus Reference Desk) as requested!
  const [isAIFeaturesEnabledState, setIsAIFeaturesEnabledState] = useState(false);
  const [globalAIEnabled, setGlobalAIEnabled] = useState(false);

  const categories = ["All", ...new Set<string>(trackQA.map(q=>q.category))];

  const suggestedPrompts = [
    "What are the factory default interface settings?",
    "Explain policy precedence and Auto-Order mode",
    "How does NAT Loopback work on a Firebox?",
    "How do I set up Content Inspection in HTTPS-proxy?"
  ];

  // Fetch AI and Global states on mount
  useEffect(() => {
    const customKey = localStorage.getItem("watchguard_custom_gemini_api_key") || "";
    fetch("/api/features", {
      headers: { "X-Gemini-API-Key": customKey }
    })
      .then(res => res.json())
      .then(data => {
        setIsAIFeaturesEnabledState(data.enableAIFeatures);
        setGlobalAIEnabled(data.globalAIEnabled);
        // If AI is globally enabled or has a custom key, allow them to use AI. Otherwise, keep them in QA.
        if (data.enableAIFeatures) {
          setMode("ai");
        } else {
          setMode("qa");
        }
      })
      .catch(err => handleError("Failed to query initial feature status", err));
  }, []);

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
        "Content-Type": "application/json",
        // Marks this as a request from the study app itself; the server
        // refuses tutor calls without it. See server/security.ts.
        "X-Study-Request": "1"
      };
      if (customKey) {
        headers["X-Gemini-API-Key"] = customKey;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: `Learning track: ${learningTrackLabels[track]}.\n${text}`,
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
      handleError("Chat error", error);
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        sender: "bot",
        text: `⚠️ **System Connection Error**: Unable to contact local tutor daemon.\n\n*Error details:* ${error?.message || String(error)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-watchguard-gray border border-watchguard-border rounded-xl overflow-hidden shadow-2xl ">
      {/* Mentor Dual-Mode Navigation Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-6 py-4 bg-watchguard-lightgray border-b border-watchguard-border gap-3">
        {/* Tutor Identity */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-watchguard-orange/15 rounded-lg border border-watchguard-orange/40 flex-shrink-0">
            <Bot className="w-5 h-5 text-watchguard-orange" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-white tracking-tight">
              WatchGuard Study Companion
            </h2>
            <div className="flex items-center space-x-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isAIFeaturesEnabledState ? "bg-green-500" : "bg-gray-500"}`}></span>
              <span className="text-[10px] font-mono text-gray-400">
                {isAIFeaturesEnabledState ? "AI tutor available" : "Study notes · AI tutor off"}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Mode Switch Toggles */}
        <div className="flex items-center bg-watchguard-dark/80 p-0.5 rounded-lg border border-watchguard-border self-start sm:self-center font-mono">
          <button
            onClick={() => setMode("qa")}
            className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
              mode === "qa"
                ? "bg-watchguard-orange text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Study notes
          </button>
          <button
            onClick={() => {
              if (!isAIFeaturesEnabledState) {
                alert("The AI tutor is turned off. An administrator can turn it on, or you can add your own Gemini API key in Progress & Admin, under Accounts & tutor settings.");
              }
              setMode("ai");
            }}
            className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center space-x-1 ${
              mode === "ai"
                ? "bg-watchguard-orange text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Interactive AI Tutor</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Mode Arena Stage */}
      {mode === "ai" ? (
        <AIChatMode
          messages={messages}
          isLoading={isLoading}
          inputValue={inputValue}
          setInputValue={setInputValue}
          handleSend={handleSend}
          scrollRef={scrollRef}
          suggestedPrompts={suggestedPrompts}
        />
      ) : (
        <QADeskMode
          key={track}
          qaDatabase={trackQA}
          categories={categories}
        />
      )}
    </div>
  );
}
