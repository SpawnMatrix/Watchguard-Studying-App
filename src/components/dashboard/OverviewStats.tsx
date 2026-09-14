import { watchguardLabs } from '../../data/labs';
import React from 'react';
import { Award, CheckCircle2, BookOpen } from 'lucide-react';

import { type QuizHistoryItem } from "../QuizAnalyticsPanel";

interface OverviewStatsProps {
  score: string;
  completedLabs: string[];
  history: QuizHistoryItem[];
}

export default function OverviewStats({ score, completedLabs, history }: OverviewStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
      {/* Exam Readiness Score */}
      <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 shadow-xl flex items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Quiz accuracy</span>
          <div className="text-3xl font-display font-bold text-watchguard-orange">{score}</div>
        </div>
        <div className="p-3 bg-watchguard-orange/10 rounded-full">
          <Award className="w-6 h-6 text-watchguard-orange" />
        </div>
      </div>

      {/* Labs Completed */}
      <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 shadow-xl flex items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Labs completed</span>
          <div className="text-3xl font-display font-bold text-white">{completedLabs.length} / {watchguardLabs.length}</div>
        </div>
        <div className="p-3 bg-green-500/10 rounded-full">
          <CheckCircle2 className="w-6 h-6 text-green-400" />
        </div>
      </div>

      {/* Total Exam Questions Answered */}
      <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 shadow-xl flex items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Questions answered</span>
          <div className="text-3xl font-display font-bold text-white">{history.length}</div>
          <span className="text-xs text-gray-400 block">{history.filter((h) => h.isCorrect).length} answered correctly</span>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-full">
          <BookOpen className="w-6 h-6 text-blue-400" />
        </div>
      </div>
    </div>
  );
}
