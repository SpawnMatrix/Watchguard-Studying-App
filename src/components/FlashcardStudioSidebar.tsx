import React from 'react';
import { Search } from 'lucide-react';

interface FlashcardStudioSidebarProps {
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredCardsLength: number;
  currentIndex: number;
}

export default function FlashcardStudioSidebar({
  categories,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  filteredCardsLength,
  currentIndex
}: FlashcardStudioSidebarProps) {
  return (
    <div className="w-full md:w-64 space-y-4 flex-shrink-0">
      <div>
        <h3 className="text-xs font-bold text-gray-200 font-mono uppercase tracking-wider mb-2">Category Filter</h3>
        <div className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-left text-xs px-3.5 py-2 rounded-lg transition-all font-mono whitespace-nowrap cursor-pointer flex-shrink-0 ${
                selectedCategory === cat
                  ? "bg-watchguard-orange text-white border border-watchguard-orange/30 shadow"
                  : "text-gray-400 hover:text-white hover:bg-watchguard-lightgray"
              }`}
            >
              {cat === "All" ? "All Syllabuses" : `${cat} Domain`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-gray-200 font-mono uppercase tracking-wider mb-2">Keyword Search</h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Search definitions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-watchguard-dark border border-watchguard-border text-xs text-white rounded-lg pl-8 pr-3 py-2 outline-none focus:border-watchguard-orange/50 transition-all font-mono"
          />
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {filteredCardsLength > 0 && (
        <div className="bg-watchguard-dark/40 border border-watchguard-border/60 p-3 rounded-lg space-y-1">
          <span className="text-[10px] font-mono text-gray-500 block">Syllabus Index</span>
          <p className="text-[11px] text-gray-300 font-sans">
            Showing {currentIndex + 1} of {filteredCardsLength} matching flashcards.
          </p>
        </div>
      )}
    </div>
  );
}
