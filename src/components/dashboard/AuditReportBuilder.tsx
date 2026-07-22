import React from 'react';
import { FileText, ChevronRight } from 'lucide-react';

interface AuditReportBuilderProps {
  historyLength: number;
  isLoading: boolean;
  onGenerateReport: () => void;
}

export default function AuditReportBuilder({ historyLength, isLoading, onGenerateReport }: AuditReportBuilderProps) {
  return (
    <div className="bg-watchguard-gray border border-watchguard-border rounded-2xl p-6 shadow-2xl space-y-5 flex flex-col justify-between transition-transform hover:-translate-y-1 hover:shadow-watchguard-orange/10">
      <div className="space-y-2.5">
        <div className="flex items-center space-x-2 border-b border-watchguard-border pb-3">
          <FileText className="w-4 h-4 text-watchguard-orange" />
          <h3 className="font-display font-semibold text-white">Generate Executive Performance Audit</h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed font-sans">
          Compile your training progress logs into a structured audit report using the Gemini Deep reasoning engine. This report maps conceptual vulnerabilities back to WatchGuard Lab exercises to establish a customized engineering remediation study plan.
        </p>
      </div>

      <button
        onClick={onGenerateReport}
        disabled={historyLength === 0 || isLoading}
        className="w-full mt-4 bg-watchguard-orange hover:bg-watchguard-orange/95 disabled:bg-watchguard-dark disabled:text-gray-500 disabled:border-watchguard-border text-white text-xs font-semibold py-3 rounded-lg flex items-center justify-center space-x-2 border border-watchguard-orange/40 transition-all cursor-pointer"
      >
        <span>{isLoading ? "Running Deep Audit Analysis..." : "Compile & Run Audit Analysis"}</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
