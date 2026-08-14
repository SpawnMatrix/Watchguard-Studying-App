import { useState } from "react";
import { Question } from "../data/questions";
import { HelpCircle, Terminal } from "lucide-react";

interface LogSimulatorProps {
  question: Question;
  selectedOptions: string[];
  isSubmitted: boolean;
  isLoading: boolean;
  onOptionToggle: (option: string) => void;
}

export default function LogSimulator({ question, selectedOptions, isSubmitted, isLoading, onOptionToggle }: LogSimulatorProps) {
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

      {/* Log Terminal Window */}
      {question.logMessage && (
        <div className="bg-black/90 border border-gray-700 rounded-lg p-4 font-mono text-xs sm:text-sm shadow-inner relative overflow-hidden">
          <div className="flex items-center space-x-2 text-gray-500 mb-2 pb-2 border-b border-gray-800">
            <Terminal className="w-4 h-4" />
            <span>Traffic Monitor - Raw Logs</span>
          </div>
          <div className="text-green-400 break-words leading-relaxed whitespace-pre-wrap">
            {question.logMessage}
          </div>
        </div>
      )}

      {/* Options Grid */}
      <div className="space-y-3 pl-0 sm:pl-4">
        {question.options.map((opt, idx) => {
          const isSelected = selectedOptions.includes(opt);
          const optLetter = String.fromCharCode(65 + idx);

          let optionStyle = "bg-watchguard-dark/40 border-watchguard-border hover:border-watchguard-orange/40 hover:bg-watchguard-lightgray/50 text-gray-300";
          if (isSelected) {
            optionStyle = "bg-watchguard-orange/15 border-watchguard-orange text-watchguard-orange shadow-lg shadow-watchguard-orange/5";
          }
          if (isSubmitted) {
            // If this option is correct, highlight green
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
    </div>
  );
}
