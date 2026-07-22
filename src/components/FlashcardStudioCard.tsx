import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  category: string;
  keyConcept: string;
  examTip?: string;
  officialReference?: string;
}

interface FlashcardStudioCardProps {
  activeCard: Flashcard;
  isFlipped: boolean;
  setIsFlipped: (flipped: boolean) => void;
}

export default function FlashcardStudioCard({
  activeCard,
  isFlipped,
  setIsFlipped
}: FlashcardStudioCardProps) {
  return (
    <div
      id={`flashcard-${activeCard.id}`}
      onClick={() => setIsFlipped(!isFlipped)}
      className="w-full min-h-[260px] bg-watchguard-gray border border-watchguard-border rounded-xl p-6 shadow-2xl relative cursor-pointer select-none overflow-hidden hover:border-watchguard-orange/40 transition-all flex flex-col justify-between"
      style={{
        perspective: "1000px"
      }}
    >
      {/* Decorative background grids */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e1e1e_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none"></div>

      <AnimatePresence mode="wait">
        {!isFlipped ? (
          <motion.div
            key="front"
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -90 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col justify-between h-full"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-gray-500 font-semibold uppercase">Question Card</span>
                <span className="text-xs text-watchguard-orange font-mono font-medium">#{activeCard.id}</span>
              </div>

              <h2 className="text-lg font-display font-medium text-white tracking-tight leading-relaxed select-text cursor-text" onClick={(e) => e.stopPropagation()}>
                {activeCard.question}
              </h2>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs text-gray-400 border-t border-watchguard-border/40 pt-4 font-mono">
              <span className="flex items-center space-x-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-watchguard-orange animate-spin-slow" />
                <span>Click card to reveal answer</span>
              </span>
              <span className="text-gray-500 text-[10px]">Key: {activeCard.keyConcept}</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="back"
            initial={{ opacity: 0, rotateY: -90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: 90 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col justify-between h-full"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Syllabus Verification</span>
                </span>
                <span className="text-xs text-watchguard-orange font-mono font-medium">#{activeCard.id}</span>
              </div>

              <div className="text-sm text-gray-200 leading-relaxed font-sans whitespace-pre-wrap select-text cursor-text" onClick={(e) => e.stopPropagation()}>
                {activeCard.answer}
              </div>

              {activeCard.examTip && (
                <div className="bg-watchguard-orange/5 border border-watchguard-orange/20 rounded-lg p-3 space-y-1 select-text cursor-text" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] font-mono font-bold text-watchguard-orange uppercase tracking-wide block">🔥 HIGHER-YIELD EXAM TIP</span>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">
                    {activeCard.examTip}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between text-xs text-gray-400 border-t border-watchguard-border/40 pt-4 font-mono">
              <span className="text-[10px] text-gray-500">Ref: {activeCard.officialReference}</span>
              <span className="text-watchguard-orange text-[10px] flex items-center space-x-1">
                <span>Click to flip back</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
