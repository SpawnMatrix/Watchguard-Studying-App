import { useState, useMemo, useEffect } from "react";
import { AlertCircle, ArrowRight, Trophy, RotateCcw, Filter, FileText, BrainCircuit } from "lucide-react";
import { examQuestions, Question } from "../data/questions";
import type { QuizHistoryItem } from "./QuizAnalyticsPanel";
import type { EvaluationData } from "./QuizEvaluation";
import StandardQuizzer from "./StandardQuizzer";
import TopologyQuizzer from "./TopologyQuizzer";
import LogSimulator from "./LogSimulator";
import QuizEvaluation from "./QuizEvaluation";
import QuizAnalyticsPanel from "./QuizAnalyticsPanel";
import { motion, AnimatePresence } from "motion/react";
import { handleError } from "../utils/errorHandler";

export type { QuizHistoryItem };

interface PracticeQuizProps {
  onScoreUpdated: (quizRecord: { score: string; topicWeaknesses: string[]; history: QuizHistoryItem[] }) => void;
}

export default function PracticeQuiz({ onScoreUpdated }: PracticeQuizProps) {
  // Modes: 'practice', 'mock-exam', 'weakness-review'
  const [quizMode, setQuizMode] = useState<"practice" | "mock-exam" | "weakness-review">("practice");
  const [selectedTopic, setSelectedTopic] = useState<string>("All");

  // Track the static mock exam pool to prevent reshuffling
  const [mockExamPool, setMockExamPool] = useState<Question[]>([]);

  const [weaknessDeck, setWeaknessDeck] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem("weakness_deck");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const updateWeaknessDeck = (questionId: number, isCorrect: boolean) => {
    setWeaknessDeck(prev => {
      const newDeck = { ...prev };
      if (isCorrect) {
        if (newDeck[questionId] !== undefined) {
           newDeck[questionId] += 1;
           if (newDeck[questionId] >= 3) {
              delete newDeck[questionId]; // Streak of 3 reached
           }
        }
      } else {
         newDeck[questionId] = 0; // Reset streak
      }
      localStorage.setItem("weakness_deck", JSON.stringify(newDeck));
      return newDeck;
    });
  };

  const filteredQuestions = useMemo(() => {
    if (quizMode === "weakness-review") {
       const weakIds = Object.keys(weaknessDeck).map(Number);
       const qs = examQuestions.filter(q => weakIds.includes(q.id));
       return qs;
    }
    if (quizMode === "mock-exam") {
       return mockExamPool;
    }
    if (selectedTopic !== "All") {
       return examQuestions.filter(q => q.topic === selectedTopic);
    }
    return examQuestions;
  }, [quizMode, selectedTopic, mockExamPool, weaknessDeck]);

  const availableTopics = useMemo(() => {
    return ["All", ...Array.from(new Set(examQuestions.map(q => q.topic)))];
  }, []);

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  const [seenQuestionIds, setSeenQuestionIds] = useState<number[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>([]);
  const [correctCount, setCorrectCount] = useState(0);

  // Initialize first question on mode change or topic filter change
  useEffect(() => {
     if (quizMode === "mock-exam") {
        const pool = examQuestions.slice().sort(() => 0.5 - Math.random()).slice(0, 50);
        setMockExamPool(pool);
        setCurrentQuestion(pool[0]);
        setSeenQuestionIds([pool[0].id]);
     } else if (quizMode === "weakness-review") {
        const weakIds = Object.keys(weaknessDeck).map(Number);
        const qs = examQuestions.filter(q => weakIds.includes(q.id));
        if (qs.length > 0) {
           const firstQ = qs[Math.floor(Math.random() * qs.length)];
           setCurrentQuestion(firstQ);
           setSeenQuestionIds([firstQ.id]);
        } else {
           setCurrentQuestion(null); // Explicitly show empty state
        }
     } else {
        let pool = examQuestions;
        if (selectedTopic !== "All") pool = examQuestions.filter(q => q.topic === selectedTopic);
        if (pool.length > 0) {
           const firstQ = pool[Math.floor(Math.random() * pool.length)];
           setCurrentQuestion(firstQ);
           setSeenQuestionIds([firstQ.id]);
        }
     }

     // CRITICAL: Reset submission state whenever modes or topics change!
     setSelectedOptions([]);
     setIsSubmitted(false);
     setEvaluation(null);
     setErrorMsg(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizMode, selectedTopic]);

  const handleOptionToggle = (option: string) => {
    if (isSubmitted || !currentQuestion) return;
    if (currentQuestion.isMultiSelect) {
      if (selectedOptions.includes(option)) {
        setSelectedOptions(prev => prev.filter(x => x !== option));
      } else {
        if (selectedOptions.length < currentQuestion.correctAnswersCount) {
          setSelectedOptions(prev => [...prev, option]);
        } else {
          setSelectedOptions(prev => [...prev.slice(1), option]);
        }
      }
    } else {
      setSelectedOptions([option]);
    }
  };

  const handleSubmit = async () => {
    if (selectedOptions.length === 0 || !currentQuestion) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const qCorrect = currentQuestion.correctAnswers || [currentQuestion.correctAnswer];
      const isCorrect = currentQuestion.isMultiSelect
        ? selectedOptions.length === qCorrect.length && qCorrect.every(ans => selectedOptions.includes(ans))
        : qCorrect.includes(selectedOptions[0]);

      updateWeaknessDeck(currentQuestion.id, isCorrect);

      let evalData: EvaluationData;

      if (currentQuestion.explanation) {
         evalData = {
           isCorrect,
           detailedExplanation: currentQuestion.explanation,
           weaknessCategory: currentQuestion.topic
         }
      } else {
          // Join multi-select responses for backend parser
          const joinedResponse = currentQuestion.isMultiSelect ? selectedOptions.join(" | ") : selectedOptions[0];

          const customApiKey = localStorage.getItem("gemini_api_key") || undefined;
          const headers: HeadersInit = { "Content-Type": "application/json" };
          if (customApiKey) headers["X-Gemini-API-Key"] = customApiKey;

          const res = await fetch("/api/quiz/evaluate", {
            method: "POST",
            headers,
            body: JSON.stringify({
              questionId: currentQuestion.id,
              question: currentQuestion.question,
              options: currentQuestion.options,
              selectedAnswer: joinedResponse,
              selectedOptions,
              correctAnswer: currentQuestion.correctAnswer
            })
          });

          if (!res.ok) throw new Error("Evaluation failed");
          evalData = await res.json();
      }

      setEvaluation(evalData);
      setIsSubmitted(true);

      if (evalData.isCorrect) {
        setCorrectCount(prev => prev + 1);
      }

      const updatedHistoryItem: QuizHistoryItem = {
        questionId: currentQuestion.id,
        selectedAnswers: selectedOptions,
        explanation: evalData.detailedExplanation,
        topic: currentQuestion.topic,
        isCorrect: evalData.isCorrect
      };

      const nextHistory = [...quizHistory, updatedHistoryItem];
      setQuizHistory(nextHistory);

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
      handleError("Evaluation error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    setSelectedOptions([]);
    setIsSubmitted(false);
    setEvaluation(null);
    setErrorMsg(null);

    const unseen = filteredQuestions.filter(q => !seenQuestionIds.includes(q.id));
    let nextQ: Question | null = null;

    if (unseen.length === 0) {
      if (quizMode === "mock-exam") {
        alert(`Mock Exam Complete! Your score: ${Math.round((correctCount / quizHistory.length) * 100)}%`);
        handleReset();
        return;
      }
      if (quizMode === "weakness-review") {
         if (filteredQuestions.length === 0) {
             setCurrentQuestion(null);
             return;
         }
      }
      if (filteredQuestions.length > 0) {
         const nextRandom = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
         nextQ = nextRandom;
         setSeenQuestionIds([nextRandom.id]);
      }
    } else {
      nextQ = unseen[Math.floor(Math.random() * unseen.length)];
      setSeenQuestionIds(prev => [...prev, nextQ.id]);
    }

    setCurrentQuestion(nextQ);
  };

  const handleReset = () => {
    if (quizMode === "mock-exam") {
        const pool = examQuestions.slice().sort(() => 0.5 - Math.random()).slice(0, 50);
        setMockExamPool(pool);
        setCurrentQuestion(pool[0]);
        setSeenQuestionIds([pool[0].id]);
    } else if (quizMode === "weakness-review") {
        const weakIds = Object.keys(weaknessDeck).map(Number);
        const qs = examQuestions.filter(q => weakIds.includes(q.id));
        if (qs.length > 0) {
           const firstQ = qs[Math.floor(Math.random() * qs.length)];
           setCurrentQuestion(firstQ);
           setSeenQuestionIds([firstQ.id]);
        } else {
           setCurrentQuestion(null); // Explicitly show empty state
        }
    } else {
        let pool = examQuestions;
        if (selectedTopic !== "All") pool = examQuestions.filter(q => q.topic === selectedTopic);
        if (pool.length > 0) {
           const firstQ = pool[Math.floor(Math.random() * pool.length)];
           setCurrentQuestion(firstQ);
           setSeenQuestionIds([firstQ.id]);
        }
    }

    setSelectedOptions([]);
    setIsSubmitted(false);
    setEvaluation(null);
    setErrorMsg(null);
    setQuizHistory([]);
    setCorrectCount(0);
    onScoreUpdated({ score: "0%", topicWeaknesses: [], history: [] });
  };

  return (
    <div className="flex flex-col-reverse lg:grid lg:grid-cols-3 gap-6 h-full font-sans">
      <div className="lg:col-span-2 flex flex-col bg-watchguard-gray border border-watchguard-border rounded-xl overflow-hidden shadow-2xl h-full ">
        <div className="flex items-center justify-between px-6 py-4 bg-watchguard-lightgray border-b border-watchguard-border flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-watchguard-orange" />
            <h2 className="font-display font-semibold text-white">NSE Essentials Quiz</h2>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            {quizMode === "practice" && (
               <div className="flex items-center space-x-2 border border-watchguard-border rounded bg-watchguard-dark px-2 py-1">
                 <Filter className="w-3.5 h-3.5 text-gray-400" />
                 <select
                   value={selectedTopic}
                   onChange={(e) => setSelectedTopic(e.target.value)}
                   className="bg-transparent text-gray-300 outline-none cursor-pointer"
                 >
                   {availableTopics.map(topic => (
                     <option key={topic} value={topic}>{topic}</option>
                   ))}
                 </select>
               </div>
            )}

            <div className="flex items-center space-x-2 border border-watchguard-border rounded bg-watchguard-dark px-2 py-1">
               <FileText className="w-3.5 h-3.5 text-gray-400" />
               <select
                 value={quizMode}
                 onChange={(e) => setQuizMode(e.target.value as any)}
                 className="bg-transparent text-watchguard-orange outline-none cursor-pointer font-bold"
               >
                 <option value="practice">Practice Mode</option>
                 <option value="mock-exam">Mock Exam</option>
                 <option value="weakness-review">Review Weak Points</option>
               </select>
            </div>

            {quizMode === "weakness-review" && (
               <div className="flex items-center space-x-2 text-watchguard-orange" title="Questions requiring 3 correct streaks">
                 <BrainCircuit className="w-4 h-4" />
                 <span className="font-bold">{Object.keys(weaknessDeck).length} left</span>
               </div>
            )}
          </div>
        </div>

        <div className="px-6 py-2 bg-watchguard-dark border-b border-watchguard-border flex items-center justify-between">
           <div className="flex items-center space-x-3 text-xs font-mono">
              <span className="text-gray-400">
                {currentQuestion ? `Question ${quizHistory.length + 1} ${quizMode === "mock-exam" ? `of 50` : ""}` : "Deck Complete"}
              </span>
              {currentQuestion && (
                <span className="px-2.5 py-1 bg-watchguard-gray rounded text-watchguard-orange border border-watchguard-border">
                  {currentQuestion.topic}
                </span>
              )}
              
              {quizMode === "weakness-review" && currentQuestion && weaknessDeck[currentQuestion.id] !== undefined && (
                <span className="px-2.5 py-1 bg-watchguard-orange/20 text-watchguard-orange border border-watchguard-orange/50 rounded flex items-center space-x-1">
                  <span>Streak: {weaknessDeck[currentQuestion.id]}/3</span>
                </span>
              )}
           </div>
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {!currentQuestion && quizMode === "weakness-review" && (
             <div className="flex flex-col items-center justify-center h-full text-gray-400">
               <Trophy className="w-12 h-12 mb-4 text-green-500/50" />
               <h3 className="text-xl font-bold text-white mb-2">Review Complete!</h3>
               <p>You have mastered all the questions in your weakness deck.</p>
             </div>
          )}

          {currentQuestion && (!currentQuestion.type || currentQuestion.type === "standard") && (
            <StandardQuizzer
               question={currentQuestion}
               selectedOptions={selectedOptions}
               isSubmitted={isSubmitted}
               isLoading={isLoading}
               onOptionToggle={handleOptionToggle}
            />
          )}

          {currentQuestion && currentQuestion.type === "topology" && (
            <TopologyQuizzer
               question={currentQuestion}
               selectedOptions={selectedOptions}
               isSubmitted={isSubmitted}
               isLoading={isLoading}
               onOptionToggle={handleOptionToggle}
            />
          )}

          {currentQuestion && currentQuestion.type === "log" && (
             <LogSimulator
               question={currentQuestion}
               selectedOptions={selectedOptions}
               isSubmitted={isSubmitted}
               isLoading={isLoading}
               onOptionToggle={handleOptionToggle}
             />
          )}

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

          <AnimatePresence>
            {isSubmitted && evaluation && (
              <QuizEvaluation evaluation={evaluation} />
            )}
          </AnimatePresence>
        </div>

        <div className="px-6 py-4 bg-watchguard-lightgray border-t border-watchguard-border flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 text-xs font-mono text-gray-400 hover:text-white transition-all bg-watchguard-dark border border-watchguard-border px-3 py-2 rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Exam Statistics</span>
          </button>

          {!isSubmitted && currentQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={selectedOptions.length === 0 || isLoading}
              className="flex items-center space-x-2 bg-watchguard-orange hover:bg-watchguard-orange/95 disabled:bg-watchguard-dark disabled:text-gray-500 disabled:border-watchguard-border px-4 py-2.5 rounded-lg text-white font-semibold transition-all border border-watchguard-orange/40 cursor-pointer"
            >
              <span>{isLoading ? "Analyzing..." : "Submit Response"}</span>
            </button>
          ) : currentQuestion ? (
            <button
              onClick={handleNext}
              className="flex items-center space-x-2 bg-watchguard-orange hover:bg-watchguard-orange/95 px-4 py-2.5 rounded-lg text-white font-semibold transition-all border border-watchguard-orange/40 cursor-pointer"
            >
              <span>{quizMode === "mock-exam" && quizHistory.length >= 50 ? "Finish Exam" : "Next Exam Question"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      <QuizAnalyticsPanel
        quizHistory={quizHistory}
        correctCount={correctCount}
        totalQuestions={quizMode === "mock-exam" ? 50 : filteredQuestions.length}
      />
    </div>
  );
}
