import { watchguardLabs } from '../../data/labs';
import { Target, Layers, CheckCheck } from 'lucide-react';
import type { QuizHistoryItem } from '../QuizAnalyticsPanel';

interface OverviewStatsProps { score: string; completedLabs: string[]; history: QuizHistoryItem[] }

export default function OverviewStats({ score, completedLabs, history }: OverviewStatsProps) {
  return <div className="overview-stats">
    <div className="overview-stat"><div><span>Quiz accuracy</span><strong>{score}</strong><small>Across your practice answers</small></div><span className="stat-icon tone-orange"><Target size={21}/></span></div>
    <div className="overview-stat"><div><span>Labs completed</span><strong>{completedLabs.length} <em>/ {watchguardLabs.length}</em></strong><small>Build skills through practice</small></div><span className="stat-icon tone-green"><Layers size={21}/></span></div>
    <div className="overview-stat"><div><span>Questions answered</span><strong>{history.length}</strong><small>{history.filter(h => h.isCorrect).length} answered correctly</small></div><span className="stat-icon tone-blue"><CheckCheck size={21}/></span></div>
  </div>;
}
