import React from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { RadialProgress } from './RadialProgress';
import { ActivityHeatmap } from './ActivityHeatmap';
import { Award, Flame, Zap } from 'lucide-react';

export const GlobalDashboard: React.FC = () => {
  const { currentStreak, longestStreak, totalXP, domainMastery, activityHistory } = useStudyStore();

  const comptiaDomains = domainMastery.filter(d => d.certification === 'CompTIA Net+');
  const watchguardDomains = domainMastery.filter(d => d.certification === 'WatchGuard NSE');

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Global Study Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Track your progress across CompTIA Network+ and WatchGuard NSE.</p>
        </div>

        {/* Quick Stats Header */}
        <div className="flex gap-4">
          <div className="bg-watchguard-dark/60 border border-watchguard-border rounded-xl p-4 flex items-center gap-3">
            <Flame className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Current Streak</p>
              <p className="text-xl font-bold text-white">{currentStreak} Days</p>
            </div>
          </div>
          <div className="bg-watchguard-dark/60 border border-watchguard-border rounded-xl p-4 flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Total XP</p>
              <p className="text-xl font-bold text-white">{totalXP.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-watchguard-dark/60 border border-watchguard-border rounded-xl p-4 flex items-center gap-3">
            <Award className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Longest Streak</p>
              <p className="text-xl font-bold text-white">{longestStreak} Days</p>
            </div>
          </div>
        </div>
      </header>

      {/* Activity Heatmap */}
      <section>
        <ActivityHeatmap data={activityHistory} days={120} />
      </section>

      {/* Mastery Sections */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* WatchGuard Mastery */}
        <div className="bg-watchguard-dark/60 border border-watchguard-border rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 border-b border-watchguard-border pb-2">WatchGuard NSE Mastery</h2>
          <div className="flex flex-wrap justify-center gap-8">
            {watchguardDomains.map(domain => (
              <RadialProgress
                key={domain.domainId}
                percentage={domain.masteryPercentage}
                label={domain.name}
                color="#FF8C00"
              />
            ))}
          </div>
        </div>

        {/* CompTIA Mastery */}
        <div className="bg-watchguard-dark/60 border border-watchguard-border rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 border-b border-watchguard-border pb-2">CompTIA Net+ Mastery</h2>
          <div className="flex flex-wrap justify-center gap-8">
            {comptiaDomains.map(domain => (
              <RadialProgress
                key={domain.domainId}
                percentage={domain.masteryPercentage}
                label={domain.name}
                color="#3B82F6"
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
