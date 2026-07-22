import { errorHandler } from "../utils/errorHandler";
import { useState } from "react";
import { CheckCircle2, XCircle, ArrowRight, Award, Trophy, Bookmark, BarChart, RotateCcw, AlertCircle, HelpCircle } from "lucide-react";
import { examQuestions, Question } from "../data/questions";
import { motion, AnimatePresence } from "motion/react";

interface QuizHistoryItem {
  questionId: number;
  selectedAnswers: string[];
  isCorrect: boolean;
  explanation: string;
  topic: string;
}

interface PracticeQuizProps {
  onScoreUpdated: (quizRecord: { score: string; topicWeaknesses: string[]; history: QuizHistoryItem[] }) => void;
}

export default function PracticeQuiz({ onScoreUpdated }: PracticeQuizProps) {
  // Start with a random question from the pool of 100+ questions
  const [currentQuestion, setCurrentQuestion] = useState<Question>(() => {
    return examQuestions[Math.floor(Math.random() * examQuestions.length)];
  });
  const [seenQuestionIds, setSeenQuestionIds] = useState<number[]>(() => [currentQuestion.id]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [evaluation, setEvaluation] = useState<{ isCorrect: boolean; detailedExplanation: string; weaknessCategory: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Tracked Session Analytics
  const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>([]);
  const [correctCount, setCorrectCount] = useState(0);

  const handleOptionToggle = (option: string) => {
    if (isSubmitted) return;
    if (currentQuestion.isMultiSelect) {
      if (selectedOptions.includes(option)) {
        setSelectedOptions(prev => prev.filter(x => x !== option));
      } else {
        if (selectedOptions.length < currentQuestion.correctAnswersCount) {
          setSelectedOptions(prev => [...prev, option]);
        } else {
          // Replace oldest if overlimit
          setSelectedOptions(prev => [...prev.slice(1), option]);
        }
      }
    } else {
      setSelectedOptions([option]);
    }
  };

  const handleSubmit = async () => {
    if (selectedOptions.length === 0 || isSubmitted) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const customKey = localStorage.getItem("watchguard_custom_gemini_api_key") || "";
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (customKey) {
        headers["X-Gemini-API-Key"] = customKey;
      }

      const response = await fetch("/api/quiz/evaluate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          questionId: currentQuestion.id,
          question: currentQuestion.question,
          options: currentQuestion.options,
          selectedAnswer: currentQuestion.isMultiSelect ? selectedOptions.join(", ") : selectedOptions[0],
          selectedOptions: selectedOptions,
          correctAnswer: currentQuestion.correctAnswer
        })
      });

      if (!response.ok) {
        throw new Error("Evaluation connection failure.");
      }

      const evalData = await response.json();
      setEvaluation(evalData);
      setIsSubmitted(true);

      if (evalData.isCorrect) {
        setCorrectCount(prev => prev + 1);
      }

      const updatedHistoryItem: QuizHistoryItem = {
        questionId: currentQuestion.id,
        selectedAnswers: selectedOptions,
        isCorrect: evalData.isCorrect,
        explanation: evalData.detailedExplanation,
        topic: currentQuestion.topic
      };

      const nextHistory = [...quizHistory, updatedHistoryItem];
      setQuizHistory(nextHistory);

      // Trigger callback back to administrator tab
      const finalScore = `${Math.round(((correctCount + (evalData.isCorrect ? 1 : 0)) / nextHistory.length) * 100)}%`;
      const uniqueWeaknesses = Array.from(new Set(
        nextHistory.filter(h => !h.isCorrect).map(h => h.topic)
      ));
      onScoreUpdated({
        score: finalScore,
        topicWeaknesses: uniqueWeaknesses,
        history: nextHistory
      });

    } catch (error) {
      errorHandler.error("Evaluation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    setSelectedOptions([]);
    setIsSubmitted(false);
    setEvaluation(null);
    setErrorMsg(null);

    // 1. Find all unseen questions
    const unseen = examQuestions.filter(q => !seenQuestionIds.includes(q.id));
    let nextQ: Question;

    if (unseen.length === 0) {
      // If all 100 questions are seen, we reset the seen pool to allow a new lap
      const nextRandom = examQuestions[Math.floor(Math.random() * examQuestions.length)];
      nextQ = nextRandom;
      setSeenQuestionIds([nextRandom.id]);
    } else {
      // Adaptive Algorithm:
      // Check performance on different topics from quizHistory to pick next topic to focus on
      const topicMetrics: Record<string, { total: number; correct: number }> = {};
      quizHistory.forEach(h => {
        if (!topicMetrics[h.topic]) {
          topicMetrics[h.topic] = { total: 0, correct: 0 };
        }
        topicMetrics[h.topic].total += 1;
        if (h.isCorrect) topicMetrics[h.topic].correct += 1;
      });

      // Filter to topics with accuracy below 75%
      const weakTopics = Object.entries(topicMetrics)
        .map(([topic, stats]) => ({
          topic,
          accuracy: stats.correct / stats.total,
          total: stats.total
        }))
        .filter(item => item.accuracy < 0.75)
        .sort((a, b) => a.accuracy - b.accuracy) // lowest accuracy first
        .map(item => item.topic);

      let found = false;
      // Try to find an unseen question from weak topics
      for (const topic of weakTopics) {
        const candidates = unseen.filter(q => q.topic === topic);
        if (candidates.length > 0) {
          nextQ = candidates[Math.floor(Math.random() * candidates.length)];
          setSeenQuestionIds(prev => [...prev, nextQ.id]);
          found = true;
          break;
        }
      }

      // If no weak-topic unseen questions exist, pick any random unseen question
      if (!found) {
        nextQ = unseen[Math.floor(Math.random() * unseen.length)];
        setSeenQuestionIds(prev => [...prev, nextQ.id]);
      }
    }

    setCurrentQuestion(nextQ!);
  };

  const handleReset = () => {
    const firstQ = examQuestions[Math.floor(Math.random() * examQuestions.length)];
    setCurrentQuestion(firstQ);
    setSeenQuestionIds([firstQ.id]);
    setSelectedOptions([]);
    setIsSubmitted(false);
    setEvaluation(null);
    setErrorMsg(null);
    setQuizHistory([]);
    setCorrectCount(0);
    onScoreUpdated({ score: "0%", topicWeaknesses: [], history: [] });
  };

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
    <div className="flex flex-col-reverse lg:grid lg:grid-cols-3 gap-6 h-full font-sans">
      {/* Active Examination Frame */}
      <div className="lg:col-span-2 flex flex-col bg-watchguard-gray border border-watchguard-border rounded-xl overflow-hidden shadow-2xl h-full ">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-watchguard-lightgray border-b border-watchguard-border flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-watchguard-orange" />
            <h2 className="font-display font-semibold text-white">NSE Essentials Quiz</h2>
          </div>
          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="text-gray-400">Question {quizHistory.length + 1} (Adaptive Mode)</span>
            <span className="px-2.5 py-1 bg-watchguard-dark rounded text-watchguard-orange border border-watchguard-border">
              {currentQuestion.topic}
            </span>
          </div>
        </div>

        {/* Question body */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Question text card */}
          <div className="p-5 bg-watchguard-dark/60 rounded-xl border border-watchguard-border relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-watchguard-orange"></div>
            <div className="flex items-start space-x-3.5">
              <HelpCircle className="w-5 h-5 text-watchguard-orange flex-shrink-0 mt-0.5" />
              <p className="text-gray-100 font-medium text-sm sm:text-base leading-relaxed">
                {currentQuestion.question}
              </p>
            </div>
            {currentQuestion.isMultiSelect && (
              <p className="text-xs text-watchguard-orange font-mono mt-3 pl-8">
                ★ MULTI-SELECT: Choose exactly {currentQuestion.correctAnswersCount} correct options.
              </p>
            )}
          </div>

          {/* Options Grid */}
          <div className="space-y-3 pl-0 sm:pl-4">
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = selectedOptions.includes(opt);
              const optLetter = String.fromCharCode(65 + idx);
              
              let optionStyle = "bg-watchguard-dark/40 border-watchguard-border hover:border-watchguard-orange/40 hover:bg-watchguard-lightgray/50 text-gray-300";
              if (isSelected) {
                optionStyle = "bg-watchguard-orange/15 border-watchguard-orange text-watchguard-orange shadow-lg shadow-watchguard-orange/5";
              }
              if (isSubmitted) {
                // If this option is correct, highlight green
                const qCorrect = currentQuestion.correctAnswers || [currentQuestion.correctAnswer];
                const isThisCorrect = qCorrect.includes(opt);
                
                if (isThisCorrect) {
                  optionStyle = "bg-green-500/10 border-green-500 text-green-400";
                } else if (isSelected) {
                  optionStyle = "bg-red-500/10 border-red-500 text-red-400";
                } else {
                  optionStyle = "bg-watchguard-dark/20 border-watchguard-border/40 text-gray-500 opacity-60";
                }
              }

              return (
                <button
                  key={idx}
                  disabled={isSubmitted || isLoading}
                  onClick={() => handleOptionToggle(opt)}
                  className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all text-xs sm:text-sm flex items-start space-x-3 ${optionStyle}`}
                >
                  <span className="font-mono font-bold text-gray-400 border border-watchguard-border/50 px-2 py-0.5 rounded text-xs mt-0.5 bg-watchguard-dark">
                    {optLetter}
                  </span>
                  <span className="flex-1 mt-0.5 leading-relaxed">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start space-x-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-red-200 text-sm leading-relaxed">
                  <p className="font-semibold text-red-400 mb-1">Evaluation Error</p>
                  <p>{errorMsg}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Detailed evaluation and architecture explanation */}
          <AnimatePresence>
            {isSubmitted && evaluation && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="p-5 bg-watchguard-lightgray/60 border border-watchguard-border rounded-xl space-y-3"
              >
                <div className="flex items-center space-x-2.5">
                  {evaluation.isCorrect ? (
                    <div className="flex items-center space-x-2 text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-display font-semibold text-sm">CORRECT RESPONSE</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-red-400">
                      <XCircle className="w-5 h-5" />
                      <span className="font-display font-semibold text-sm">INCORRECT RESPONSE</span>
                    </div>
                  )}
                  <span className="text-xs text-gray-400">| Category: {evaluation.weaknessCategory}</span>
                </div>
                <div className="text-gray-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {evaluation.detailedExplanation.split("\n").map((line, idx) => (
                    <p key={idx} className="my-1">{line}</p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Tray */}
        <div className="px-6 py-4 bg-watchguard-lightgray border-t border-watchguard-border flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 text-xs font-mono text-gray-400 hover:text-white transition-all bg-watchguard-dark border border-watchguard-border px-3 py-2 rounded-lg"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Exam Statistics</span>
          </button>

          {!isSubmitted ? (
            <button
              onClick={handleSubmit}
              disabled={selectedOptions.length === 0 || isLoading}
              className="flex items-center space-x-2 bg-watchguard-orange hover:bg-watchguard-orange/95 disabled:bg-watchguard-dark disabled:text-gray-500 disabled:border-watchguard-border px-4 py-2.5 rounded-lg text-white font-semibold transition-all border border-watchguard-orange/40"
            >
              <span>{isLoading ? "Analyzing..." : "Submit Response"}</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center space-x-2 bg-watchguard-orange hover:bg-watchguard-orange/95 px-4 py-2.5 rounded-lg text-white font-semibold transition-all border border-watchguard-orange/40"
            >
              <span>Next Exam Question</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Weakness Analysis Panel */}
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
                {quizHistory.length} / {examQuestions.length}
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
    </div>
  );
}
