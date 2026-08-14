import { Question } from "../data/questions";
import { HelpCircle } from "lucide-react";

interface TopologyQuizzerProps {
  question: Question;
  selectedOptions: string[];
  isSubmitted: boolean;
  isLoading: boolean;
  onOptionToggle: (option: string) => void;
}

export default function TopologyQuizzer({ question, selectedOptions, isSubmitted, isLoading, onOptionToggle }: TopologyQuizzerProps) {
  return (
    <div className="flex flex-col space-y-4">
      {/* Question body */}
      <div className="p-5 bg-watchguard-dark/60 rounded-xl border border-watchguard-border relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-watchguard-orange"></div>
        <div className="flex items-start space-x-3.5">
          <HelpCircle className="w-5 h-5 text-watchguard-orange flex-shrink-0 mt-0.5" />
          <p className="text-gray-100 font-medium text-sm sm:text-base leading-relaxed">
            {question.question}
          </p>
        </div>
        {question.isMultiSelect && (
          <p className="text-xs text-watchguard-orange font-mono mt-3 pl-8">
            ★ MULTI-SELECT: Choose exactly {question.correctAnswersCount} correct options.
          </p>
        )}
      </div>

      {/* Topology Image with Hotspots */}
      {question.topologyImage && (
        <div className="relative w-full overflow-hidden rounded-xl border border-watchguard-border bg-watchguard-dark p-2 flex flex-col items-center">
          <div className="relative w-full max-w-2xl bg-watchguard-lightgray rounded flex items-center justify-center p-4 min-h-[300px]">
            <span className="text-gray-500 font-mono text-sm border border-dashed border-gray-600 p-8">
              [Topology Diagram: {question.topologyImage}]
            </span>
            {question.hotspots && question.hotspots.length > 0 && (
               <div className="absolute inset-0 pointer-events-none">
                 {question.hotspots.map((spot, idx) => (
                    <button
                      key={idx}
                      disabled={isSubmitted || isLoading}
                      onClick={() => onOptionToggle(spot.label)}
                      className={`absolute pointer-events-auto border-2 rounded transition-colors ${
                         selectedOptions.includes(spot.label)
                           ? "border-watchguard-orange bg-watchguard-orange/20"
                           : "border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20"
                      } ${
                         isSubmitted && (question.correctAnswers || [question.correctAnswer]).includes(spot.label)
                           ? "border-green-500 bg-green-500/20"
                           : ""
                      } ${
                         isSubmitted && selectedOptions.includes(spot.label) && !(question.correctAnswers || [question.correctAnswer]).includes(spot.label)
                           ? "border-red-500 bg-red-500/20"
                           : ""
                      }`}
                      style={{
                        left: `${spot.x}%`,
                        top: `${spot.y}%`,
                        width: `${spot.width}%`,
                        height: `${spot.height}%`
                      }}
                      title={spot.label}
                    />
                 ))}
               </div>
            )}
          </div>
          {question.hotspots && (
             <p className="text-xs text-gray-500 mt-2 font-mono">
                Interactive Diagram: Click on the highlighted areas above to select your answer.
             </p>
          )}
        </div>
      )}

      {/* Fallback Options Grid (if no hotspots are provided) */}
      {(!question.hotspots || question.hotspots.length === 0) && (
        <div className="space-y-3 pl-0 sm:pl-4">
          {question.options.map((opt, idx) => {
            const isSelected = selectedOptions.includes(opt);
            const optLetter = String.fromCharCode(65 + idx);

            let optionStyle = "bg-watchguard-dark/40 border-watchguard-border hover:border-watchguard-orange/40 hover:bg-watchguard-lightgray/50 text-gray-300";
            if (isSelected) {
              optionStyle = "bg-watchguard-orange/15 border-watchguard-orange text-watchguard-orange shadow-lg shadow-watchguard-orange/5";
            }
            if (isSubmitted) {
              const qCorrect = question.correctAnswers || [question.correctAnswer];
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
                onClick={() => onOptionToggle(opt)}
                className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all text-xs sm:text-sm flex items-start space-x-3 cursor-pointer ${optionStyle}`}
              >
                <span className="font-mono font-bold text-gray-400 border border-watchguard-border/50 px-2 py-0.5 rounded text-xs mt-0.5 bg-watchguard-dark">
                  {optLetter}
                </span>
                <span className="flex-1 mt-0.5 leading-relaxed">{opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
