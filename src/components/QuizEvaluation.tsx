import { motion } from "motion/react";
import { CheckCircle2, XCircle } from "lucide-react";

export interface EvaluationData {
  isCorrect: boolean;
  detailedExplanation: string;
  weaknessCategory: string;
}

interface QuizEvaluationProps {
  evaluation: EvaluationData;
}

export default function QuizEvaluation({ evaluation }: QuizEvaluationProps) {
  return (
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
  );
}
