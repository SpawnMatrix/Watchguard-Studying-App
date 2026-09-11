import React from 'react';
import { Award, Layers, BookOpen } from 'lucide-react';

interface FlashcardStudioStatsProps {
  progressPercent: number;
  masteredCount: number;
  totalCount: number;
  handleResetProgress: () => void;
}

export default function FlashcardStudioStats({
  progressPercent,
  masteredCount,
  totalCount,
  handleResetProgress
}: FlashcardStudioStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      {/* Progress Card */}
      <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 flex items-center space-x-4">
        <div className="p-3 bg-watchguard-orange/15 rounded-xl border border-watchguard-orange/30">
          <Award className="w-6 h-6 text-watchguard-orange" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">Exam Mastery Goal</span>
            <span className="text-sm font-semibold text-white font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full bg-watchguard-dark h-2 rounded-full mt-2 overflow-hidden border border-watchguard-border">
            <div
              className="bg-watchguard-orange h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5 font-sans leading-normal">
            {masteredCount} of {totalCount} study cards marked as mastered.
          </p>
        </div>
      </div>

      {/* Categories Overview */}
      <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 flex items-center space-x-4">
        <div className="p-3 bg-watchguard-orange/15 rounded-xl border border-watchguard-orange/30">
          <Layers className="w-6 h-6 text-watchguard-orange" />
        </div>
        <div>
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold block mb-1">Learning tracks</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className="text-[9px] bg-watchguard-dark/80 px-1.5 py-0.5 rounded text-gray-300 font-mono">Setup</span>
            <span className="text-[9px] bg-watchguard-dark/80 px-1.5 py-0.5 rounded text-gray-300 font-mono">Policies</span>
            <span className="text-[9px] bg-watchguard-dark/80 px-1.5 py-0.5 rounded text-gray-300 font-mono">Routing</span>
            <span className="text-[9px] bg-watchguard-dark/80 px-1.5 py-0.5 rounded text-gray-300 font-mono">VPN</span>
            <span className="text-[9px] bg-watchguard-dark/80 px-1.5 py-0.5 rounded text-gray-300 font-mono">Diagnostics</span>
          </div>
        </div>
      </div>

      {/* Help Portal link */}
      <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 flex items-center space-x-4">
        <div className="p-3 bg-watchguard-orange/15 rounded-xl border border-watchguard-orange/30">
          <BookOpen className="w-6 h-6 text-watchguard-orange" />
        </div>
        <div>
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold block mb-1">Study Guide Links</span>
          <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
            Local Firebox, Network+, and Cloud concepts. Reveal the answer, explain it in your own words, then mark the card mastered.
          </p>
          <button
            onClick={handleResetProgress}
            className="text-[10px] text-red-400 hover:text-red-300 underline font-mono bg-transparent border-0 mt-1 px-0 cursor-pointer block"
          >
            Reset All Progress
          </button>
        </div>
      </div>
    </div>
  );
}
