import React from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

interface FlashcardStudioControlsProps {
  activeCardId: number;
  masteredIds: number[];
  handleToggleMastered: (id: number) => void;
  handlePrev: () => void;
  handleNext: () => void;
  currentIndex: number;
  filteredCardsLength: number;
}

export default function FlashcardStudioControls({
  activeCardId,
  masteredIds,
  handleToggleMastered,
  handlePrev,
  handleNext,
  currentIndex,
  filteredCardsLength
}: FlashcardStudioControlsProps) {
  const isMastered = masteredIds.includes(activeCardId);

  return (
    <div className="w-full max-w-xl flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-watchguard-border/40">

      {/* Mastery toggle */}
      <button
        type="button"
        onClick={() => handleToggleMastered(activeCardId)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-mono tracking-wide border cursor-pointer select-none transition-all ${
          isMastered
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15"
            : "bg-watchguard-lightgray text-gray-400 border-watchguard-border hover:bg-watchguard-lightgray/80 hover:text-white"
        }`}
      >
        <CheckCircle2 className={`w-4 h-4 ${isMastered ? "text-emerald-400" : "text-gray-500"}`} />
        <span>{isMastered ? "Mastered Topic ✓" : "Mark as Mastered"}</span>
      </button>

      {/* Slider Arrows */}
      <div className="flex items-center space-x-3.5">
        <button
          type="button"
          onClick={handlePrev}
          className="p-2.5 bg-watchguard-lightgray hover:bg-watchguard-lightgray/80 text-gray-300 hover:text-white rounded-lg border border-watchguard-border hover:border-watchguard-orange/40 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-400 font-mono">
          {currentIndex + 1} / {filteredCardsLength}
        </span>
        <button
          type="button"
          onClick={handleNext}
          className="p-2.5 bg-watchguard-lightgray hover:bg-watchguard-lightgray/80 text-gray-300 hover:text-white rounded-lg border border-watchguard-border hover:border-watchguard-orange/40 transition-all cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
