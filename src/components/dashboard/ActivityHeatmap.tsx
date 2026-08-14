import React from 'react';
import { ActivityDay } from '../../store/useStudyStore';

interface ActivityHeatmapProps {
  data: ActivityDay[];
  days?: number; // How many days to show (e.g., 90 for ~3 months)
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data, days = 90 }) => {
  // Generate the last `days` dates
  const today = new Date();
  const dateMap = new Map<string, number>();

  data.forEach(d => dateMap.set(d.date, d.count));

  const heatmapDays = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateString = d.toISOString().split('T')[0];
    const count = dateMap.get(dateString) || 0;
    heatmapDays.push({ date: dateString, count });
  }

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-800 border-gray-700';
    if (count < 5) return 'bg-watchguard-orange/30 border-watchguard-orange/20';
    if (count < 15) return 'bg-watchguard-orange/60 border-watchguard-orange/50';
    return 'bg-watchguard-orange border-watchguard-orange/80';
  };

  return (
    <div className="bg-watchguard-dark/60 border border-watchguard-border rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">Study Activity Streak</h3>
      <div className="flex flex-wrap gap-1.5">
        {heatmapDays.map((day, idx) => (
          <div
            key={idx}
            className={`w-3.5 h-3.5 rounded-sm border ${getColor(day.count)}`}
            title={`${day.date}: ${day.count} activities`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
        <span>Less</span>
        <div className="w-3.5 h-3.5 rounded-sm bg-gray-800 border-gray-700"></div>
        <div className="w-3.5 h-3.5 rounded-sm bg-watchguard-orange/30 border-watchguard-orange/20"></div>
        <div className="w-3.5 h-3.5 rounded-sm bg-watchguard-orange/60 border-watchguard-orange/50"></div>
        <div className="w-3.5 h-3.5 rounded-sm bg-watchguard-orange border-watchguard-orange/80"></div>
        <span>More</span>
      </div>
    </div>
  );
};
