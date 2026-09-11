import { watchguardLabs } from '../../data/labs';
import React from 'react';
import { Award, CheckCircle2, BookOpen } from 'lucide-react';

import { type QuizHistoryItem } from "../QuizAnalyticsPanel";

// interface QuizHistoryItem {
//   questionId: number;
//   selectedAnswers: string[];
//   isCorrect: boolean;
//   explanation: string;
//   topic: string;
// }

interface OverviewStatsProps {
  score: string;
  completedLabs: string[];
  history: QuizHistoryItem[];
}

export default function OverviewStats({ score, completedLabs, history }: OverviewStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
      {/* Exam Readiness Score */}
      <div className="bg-watchguard-gray border border-watchguard-border rounded-2xl p-6 shadow-2xl flex items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-watchguard-orange/10">
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Quiz accuracy</span>
          <div className="text-3xl font-display font-bold text-watchguard-orange">{score}</div>
        </div>
        <div className="p-3 bg-watchguard-orange/10 rounded-full">
          <Award className="w-6 h-6 text-watchguard-orange" />
        </div>
      </div>

      {/* Labs Completed */}
      <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 shadow-xl flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Completed Core Labs</span>
          <div className="text-3xl font-display font-bold text-white">{completedLabs.length} / {watchguardLabs.length}</div>
        </div>
        <div className="p-3 bg-green-500/10 rounded-full">
          <CheckCircle2 className="w-6 h-6 text-green-400" />
        </div>
      </div>

      {/* Total Exam Questions Answered */}
      <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 shadow-xl flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Quiz attempts</span>
          <div className="text-3xl font-display font-bold text-white">
            {history.filter((h) => h.isCorrect).length} / {history.length} Correct
          </div>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-full">
          <BookOpen className="w-6 h-6 text-blue-400" />
        </div>
      </div>
    </div>
  );
}
