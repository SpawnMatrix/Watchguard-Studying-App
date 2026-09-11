import { useState, useMemo } from "react";
import { HelpCircle, Search, AlertTriangle, ChevronUp, ChevronDown, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { QAItem } from "../types/chat";
import { parseBold } from "../utils/textFormatting";

interface QADeskModeProps {
  qaDatabase: QAItem[];
  categories: string[];
}

export default function QADeskMode({ qaDatabase, categories }: QADeskModeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [expandedQAId, setExpandedQAId] = useState<number | null>(null);

  // Filter local database Q&As
  const filteredQA = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return qaDatabase.filter(item => {
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!query) return true;
      const matchesSearch = item.question.toLowerCase().includes(query) ||
                            item.answer.toLowerCase().includes(query) ||
                            item.keywords.some(k => k.toLowerCase().includes(query));
      return matchesSearch;
    });
  }, [qaDatabase, selectedCategory, searchQuery]);

  return (
    <div className="flex-1 flex flex-col bg-watchguard-dark/30 p-6 space-y-6 overflow-y-auto">
      {/* Header Info */}
      <div className="space-y-1.5">
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-4 h-4 text-watchguard-orange" />
          <h3 className="font-display font-semibold text-white">Local Q&A Reference Desk</h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed font-sans">
          Search configuration notes for locally managed Fireboxes. Practice Quiz and Flashcards include the expanded scenario bank. Check the linked documentation for your Fireware version.
        </p>
      </div>

      {/* Filter Bar and Search Box */}
      <div className="flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center justify-between">
        {/* Category selection */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1.5 lg:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3.5 py-1.5 rounded-lg transition-all font-mono whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? "bg-watchguard-orange text-white border border-watchguard-orange/30 shadow"
                  : "text-gray-400 hover:text-white hover:bg-watchguard-lightgray"
              }`}
            >
              {cat === "All" ? "All Domains" : cat}
            </button>
          ))}
        </div>

        {/* Keyword Search */}
        <div className="relative w-full lg:w-80">
          <input
            type="text"
            placeholder="Search local syllabus questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-watchguard-dark border border-watchguard-border text-xs text-white rounded-lg pl-8 pr-3 py-2.5 outline-none focus:border-watchguard-orange/50 transition-all font-mono placeholder:text-gray-500"
          />
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Local Q&A Item Grid / Accordion */}
      <div className="space-y-3">
        {filteredQA.length === 0 ? (
          <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-8 text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-watchguard-orange mx-auto" />
            <p className="text-sm text-gray-400 font-mono">No matching syllabus Q&A items found.</p>
            <button
              onClick={() => { setSelectedCategory("All"); setSearchQuery(""); }}
              className="text-xs text-watchguard-orange underline font-mono cursor-pointer bg-transparent border-0"
            >
              Clear all active filters
            </button>
          </div>
        ) : (
          filteredQA.map((item) => {
            const isExpanded = expandedQAId === item.id;
            return (
              <div
                key={item.id}
                className="bg-watchguard-gray/60 border border-watchguard-border rounded-xl transition-all hover:bg-watchguard-gray overflow-hidden"
              >
                {/* Header trigger */}
                <button
                  onClick={() => setExpandedQAId(isExpanded ? null : item.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer bg-transparent border-0 select-none"
                >
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-mono bg-watchguard-orange/15 border border-watchguard-orange/30 text-watchguard-orange px-2 py-0.5 rounded uppercase font-bold tracking-wide">
                        {item.category}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">Syllabus Item #{item.id}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-white tracking-tight leading-snug">
                      {item.question}
                    </h4>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {/* Expandable answer */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="border-t border-watchguard-border/40 bg-watchguard-dark/15 overflow-hidden"
                    >
                      <div className="p-5 space-y-4 text-xs sm:text-sm">
                        {/* Answer text */}
                        <div className="text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                          {item.answer.split("\n").map((line, idx) => {
                            if (line.startsWith("• ") || line.startsWith("- ")) {
                              return (
                                <div key={idx} className="pl-4 my-1 flex items-start space-x-2">
                                  <span className="text-watchguard-orange mt-1.5 text-[6px]">■</span>
                                  <span>{parseBold(line.substring(2))}</span>
                                </div>
                              );
                            }
                            return <p key={idx} className="my-1.5">{parseBold(line)}</p>;
                          })}
                        </div>

                        {/* Keywords and links */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-watchguard-border/30 pt-3.5 gap-2 text-[11px]">
                          {/* Keywords */}
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-gray-500 font-mono text-[10px]">Keywords:</span>
                            {item.keywords.slice(0, 4).map((word, wIdx) => (
                              <span key={wIdx} className="bg-watchguard-dark/60 px-1.5 py-0.5 border border-watchguard-border/40 rounded text-gray-400 font-mono text-[10px]">
                                {word}
                              </span>
                            ))}
                          </div>

                          {/* Manual Reference link */}
                          {item.refLink && (
                            <a
                              href={item.refLink}
                              target="_blank"
                              rel="referrer noopener"
                              className="inline-flex items-center space-x-1 text-watchguard-orange hover:underline font-mono"
                            >
                              <span>Official WatchGuard Handbook</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Quick reference guide info card */}
      <div className="bg-watchguard-orange/5 border border-watchguard-orange/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-watchguard-orange uppercase tracking-wider font-bold">Online Resource Center</span>
          <p className="text-xs text-gray-300 font-sans leading-normal">
            Want to expand your knowledge with official WatchGuard videos, guides, and Quizlet study sheets? Open the <strong>Flashcard Studio</strong> tab to find active links and resources!
          </p>
        </div>
        <div className="flex-shrink-0 self-start sm:self-center">
          <div className="text-[10px] bg-watchguard-orange/15 text-watchguard-orange border border-watchguard-orange/30 rounded px-2.5 py-1 font-mono font-bold uppercase">
            Offline Verified
          </div>
        </div>
      </div>
    </div>
  );
}
