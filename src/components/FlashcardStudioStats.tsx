import React from 'react';
import { useLearningTrack, learningTrackLabels } from '../engine/LearningTrack';
import { Award, Layers, Lightbulb } from 'lucide-react';

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
  const {track}=useLearningTrack();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      {/* Progress Card: the reset lives here, next to the count it clears. */}
      <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 flex items-center space-x-4">
        <div className="p-3 bg-watchguard-orange/15 rounded-xl border border-watchguard-orange/30">
          <Award className="w-6 h-6 text-watchguard-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">Cards mastered</span>
            <span className="text-sm font-semibold text-white font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full bg-watchguard-dark h-2 rounded-full mt-2 overflow-hidden border border-watchguard-border">
            <div
              className="bg-watchguard-orange h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between gap-3 mt-1.5 flex-wrap">
            <p className="text-[11px] text-gray-400 font-sans leading-normal">
              {masteredCount} of {totalCount} cards on this track.
            </p>
            {masteredCount > 0 && (
              <button
                type="button"
                onClick={handleResetProgress}
                className="flashcard-reset"
              >
                Clear mastered
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Deck */}
      <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 flex items-center space-x-4">
        <div className="p-3 bg-watchguard-orange/15 rounded-xl border border-watchguard-orange/30">
          <Layers className="w-6 h-6 text-watchguard-orange" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold block mb-1">Deck</span>
          <span className="text-xs text-gray-300 block">{learningTrackLabels[track]}</span>
          <span className="text-[11px] text-gray-400 block">{totalCount} cards · change the track in the header</span>
        </div>
      </div>

      {/* How to use the cards */}
      <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 flex items-center space-x-4">
        <div className="p-3 bg-watchguard-orange/15 rounded-xl border border-watchguard-orange/30">
          <Lightbulb className="w-6 h-6 text-watchguard-orange" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold block mb-1">How to study a card</span>
          <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
            Answer it in your own words before you reveal it, then mark it mastered only if you were right. Use the arrow keys to move through the deck.
          </p>
        </div>
      </div>
    </div>
  );
}
