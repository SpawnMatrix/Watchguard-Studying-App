import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportData {
  readinessScore: string;
  strengths: string[];
  criticalVulnerabilities: string[];
  recommendedLabs: string[];
  summary: string;
  isDemo?: boolean;
}

interface ReportVisualizationProps {
  report: ReportData | null;
}

export default function ReportVisualization({ report }: ReportVisualizationProps) {
  return (
    <AnimatePresence>
      {report && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-watchguard-gray border-2 border-watchguard-orange/50 rounded-2xl p-8 shadow-3xl relative overflow-hidden transition-all hover:border-watchguard-orange"
        >
          {/* Glowing background ring */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-watchguard-orange/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center justify-between border-b border-watchguard-border pb-4 mb-5 flex-wrap gap-3">
            <div>
              <h3 className="font-display font-bold text-white flex items-center space-x-2 text-sm sm:text-base">
                <span className="w-2.5 h-2.5 bg-watchguard-orange rounded-full animate-ping"></span>
                <span>WATCHGUARD NSE READINESS AUDIT REPORT</span>
              </h3>
              <p className="text-[10px] font-mono text-gray-500 mt-0.5">Syllabus compliance audit • Fireware OS v12.9.2+</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wide">Readiness Score</span>
                <div className="text-xl font-display font-bold text-watchguard-orange">{report.readinessScore}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths & Vulnerabilities */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-green-400 font-mono tracking-wide uppercase mb-2">Verified Conceptual Strengths</h4>
                <ul className="space-y-1.5 text-xs text-gray-300">
                  {report.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span className="leading-relaxed font-sans">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-bold text-red-400 font-mono tracking-wide uppercase mb-2">Namespace Vulnerabilities</h4>
                <ul className="space-y-1.5 text-xs text-gray-300">
                  {report.criticalVulnerabilities.map((v, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-red-500 mt-0.5">■</span>
                      <span className="leading-relaxed font-sans">{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recommended Labs & Summary */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-watchguard-orange font-mono tracking-wide uppercase mb-2">Recommended Study Remediation Labs</h4>
                <div className="flex flex-wrap gap-2">
                  {report.recommendedLabs.map((lab, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono font-medium bg-watchguard-orange/10 text-watchguard-orange px-2.5 py-1.5 rounded-lg border border-watchguard-orange/30"
                    >
                      {lab}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 font-mono tracking-wide uppercase mb-2">Auditor Summary & Outlook</h4>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                  {report.summary}
                </p>
              </div>
            </div>
          </div>

          {report.isDemo && (
            <div className="mt-6 pt-3 border-t border-watchguard-border flex items-center space-x-2 text-[10px] font-mono text-gray-500">
              <AlertTriangle className="w-3.5 h-3.5 text-watchguard-orange" />
              <span>Simulated Audit Analysis Powered by Local Ruleset daemon</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
