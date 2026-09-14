import React from 'react';
import { FileText, ChevronRight } from 'lucide-react';

interface AuditReportBuilderProps {
  historyLength: number;
  isLoading: boolean;
  onGenerateReport: () => void;
}

export default function AuditReportBuilder({ historyLength, isLoading, onGenerateReport }: AuditReportBuilderProps) {
  return (
    <div className="bg-watchguard-gray border border-watchguard-border rounded-2xl p-6 shadow-2xl space-y-5 flex flex-col justify-between">
      <div className="space-y-2.5">
        <div className="flex items-center space-x-2 border-b border-watchguard-border pb-3">
          <FileText className="w-4 h-4 text-watchguard-orange" />
          <h3 className="font-display font-semibold text-white">Study report</h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed font-sans">
          Turn your quiz results and completed labs into a short report: what you are strong in, what to review and which labs to do next. It works without an AI key, and tutor feedback adds suggestions when it is configured.
        </p>
      </div>

      <button
        onClick={onGenerateReport}
        disabled={historyLength === 0 || isLoading}
        className="w-full mt-4 bg-watchguard-orange hover:bg-watchguard-orange/95 disabled:bg-watchguard-dark disabled:text-gray-500 disabled:border-watchguard-border text-white text-xs font-semibold py-3 rounded-lg flex items-center justify-center space-x-2 border border-watchguard-orange/40 transition-all cursor-pointer"
      >
        <span>{isLoading ? "Building your report…" : historyLength === 0 ? "Answer a question to build a report" : "Build my study report"}</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
