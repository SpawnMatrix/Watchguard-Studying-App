import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface WeaknessTrackerProps {
  topicWeaknesses: string[];
}

export default function WeaknessTracker({ topicWeaknesses }: WeaknessTrackerProps) {
  return (
    <div className="bg-watchguard-gray border border-watchguard-border rounded-2xl p-6 shadow-2xl space-y-5 transition-transform hover:-translate-y-1 hover:shadow-watchguard-orange/10">
      <div className="flex items-center space-x-2 border-b border-watchguard-border pb-3">
        <ShieldAlert className="w-4 h-4 text-watchguard-orange" />
        <h3 className="font-display font-semibold text-white">Critical Weakness Tracker</h3>
      </div>

      {topicWeaknesses.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-xs">
          Technician study records show zero active concept vulnerabilities. Complete practicing quiz questions to trigger tracking checks.
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 leading-relaxed font-sans">
            Our active exam tracking indicates weaknesses in the following certified namespaces. Click recommended labs to resolve the vulnerabilities:
          </p>
          <div className="space-y-2">
            {topicWeaknesses.map((weakness, idx) => (
              <div key={idx} className="p-3 bg-watchguard-dark border border-watchguard-border rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                  <span className="text-xs font-medium text-gray-200">{weakness} Vulnerability</span>
                </div>
                <span className="text-[9px] font-mono font-medium text-watchguard-orange uppercase tracking-wider bg-watchguard-orange/10 px-2 py-0.5 rounded border border-watchguard-orange/20">
                  Remediation Mandatory
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
