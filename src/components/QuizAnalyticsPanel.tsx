import { Award, BarChart } from "lucide-react";

export interface QuizHistoryItem {
  questionId: number;
  selectedAnswers: string[];
  isCorrect: boolean;
  explanation: string;
  topic: string;
}

interface QuizAnalyticsPanelProps {
  quizHistory: QuizHistoryItem[];
  correctCount: number;
  totalQuestions: number;
}

export default function QuizAnalyticsPanel({ quizHistory, correctCount, totalQuestions }: QuizAnalyticsPanelProps) {
  // Weakness metrics breakdown
  const topicStats = quizHistory.reduce((acc, curr) => {
    if (!acc[curr.topic]) {
      acc[curr.topic] = { total: 0, correct: 0 };
    }
    acc[curr.topic].total += 1;
    if (curr.isCorrect) acc[curr.topic].correct += 1;
    return acc;
  }, {} as Record<string, { total: number; correct: number }>);

  return (
    <div className="space-y-6">
      {/* Scorecard Widget */}
      <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 shadow-xl space-y-4 ">
        <div className="flex items-center justify-between border-b border-watchguard-border pb-3">
          <h3 className="font-display font-semibold text-white flex items-center space-x-2">
            <Award className="w-4 h-4 text-watchguard-orange" />
            <span>Training Analytics</span>
          </h3>
          <span className="text-[10px] font-mono text-watchguard-orange uppercase tracking-wider">Exam Goal: 75%</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-watchguard-dark rounded-lg border border-watchguard-border text-center">
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wide">Accuracy</div>
            <div className="text-2xl font-display font-bold text-watchguard-orange mt-1">
              {quizHistory.length > 0 ? `${Math.round((correctCount / quizHistory.length) * 100)}%` : "0%"}
            </div>
          </div>
          <div className="p-3 bg-watchguard-dark rounded-lg border border-watchguard-border text-center">
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wide">Completed</div>
            <div className="text-2xl font-display font-bold text-white mt-1">
              {quizHistory.length} / {totalQuestions}
            </div>
          </div>
        </div>
      </div>

      {/* Topic weaknesses breakdown */}
      <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-watchguard-border pb-3">
          <h3 className="font-display font-semibold text-white flex items-center space-x-2">
            <BarChart className="w-4 h-4 text-watchguard-orange" />
            <span>Zonal Performance</span>
          </h3>
          <span className="text-[10px] font-mono text-gray-500">Correct / Attempt</span>
        </div>

        {quizHistory.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500">
            Complete quiz questions to view your certified topic metrics.
          </div>
        ) : (
          <div className="space-y-3.5">
            {Object.entries(topicStats).map(([topic, statsVal]) => {
              const stats = statsVal as { total: number; correct: number };
              const percentage = Math.round((stats.correct / stats.total) * 100);
              const isFailing = percentage < 75;
              return (
                <div key={topic} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-300 font-medium">{topic}</span>
                    <span className={`font-mono font-bold ${isFailing ? "text-red-400" : "text-green-400"}`}>
                      {stats.correct}/{stats.total} ({percentage}%)
                    </span>
                  </div>
                  {/* Bar visualization */}
                  <div className="w-full bg-watchguard-dark h-1.5 rounded-full overflow-hidden border border-watchguard-border/30">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isFailing ? "bg-red-500" : "bg-green-500"}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
