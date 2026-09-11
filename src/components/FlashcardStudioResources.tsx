import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';

export default function FlashcardStudioResources() {
  return (
    <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex items-center space-x-2 border-b border-watchguard-border pb-3">
        <BookOpen className="w-4 h-4 text-watchguard-orange" />
        <h3 className="font-display font-semibold text-white">Study Reference Catalog</h3>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed font-sans">
        Pair practice questions with the official study guide, hands-on labs, and documentation for your Fireware release.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-watchguard-dark/40 border border-watchguard-border rounded-xl p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-watchguard-orange uppercase tracking-wider font-bold">Official Help Center</span>
            <h4 className="text-xs font-semibold text-white">WatchGuard Fireware Help Docs</h4>
            <p className="text-[11px] text-gray-400 leading-normal font-sans">
              Comprehensive configuration manuals covering proxies, Mobile VPNs, Multi-WAN failovers, and Policy Manager rules.
            </p>
          </div>
          <a
            href="https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/overview/firebox_overview.html"
            target="_blank"
            rel="referrer noopener"
            className="inline-flex items-center space-x-1.5 text-[10px] text-watchguard-orange hover:underline font-mono"
          >
            <span>Explore Official Manuals</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="bg-watchguard-dark/40 border border-watchguard-border rounded-xl p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-watchguard-orange uppercase tracking-wider font-bold">Video Tutorials</span>
            <h4 className="text-xs font-semibold text-white">WatchGuard Video Training Academy</h4>
            <p className="text-[11px] text-gray-400 leading-normal font-sans">
              Visual step-by-step videos and walkthroughs on setting up SNAT, certificate trust imports, and branch office tunnels.
            </p>
          </div>
          <a
            href="https://www.watchguard.com/wgrd-training/learning-paths"
            target="_blank"
            rel="referrer noopener"
            className="inline-flex items-center space-x-1.5 text-[10px] text-watchguard-orange hover:underline font-mono"
          >
            <span>Watch Video Academy</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="bg-watchguard-dark/40 border border-watchguard-border rounded-xl p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-watchguard-orange uppercase tracking-wider font-bold">Quizlet Study Sets</span>
            <h4 className="text-xs font-semibold text-white">High-Yield Exam Prep Sets</h4>
            <p className="text-[11px] text-gray-400 leading-normal font-sans">
              Browse community study sets and check their answers against the official documentation.
            </p>
          </div>
          <a
            href="https://quizlet.com/search?query=watchguard-certified-network-security&type=all"
            target="_blank"
            rel="referrer noopener"
            className="inline-flex items-center space-x-1.5 text-[10px] text-watchguard-orange hover:underline font-mono"
          >
            <span>Search Quizlet Prep Sets</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
