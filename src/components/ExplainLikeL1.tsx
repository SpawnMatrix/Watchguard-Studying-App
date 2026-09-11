import { useState } from 'react';
import { GraduationCap, ChevronDown, Compass, BookOpen, Wrench } from 'lucide-react';
import type { Question } from '../data/questions';
import { explainLikeL1 } from '../engine/eli1';

interface ExplainLikeL1Props {
  question: Question;
  selectedAnswers: string[];
}

/**
 * Shown only after a missed answer.
 *
 * Open by default: a learner who just got something wrong is exactly the
 * person who should not have to find and click a disclosure to get the
 * explanation. It stays collapsible for anyone who does not want it.
 */
export default function ExplainLikeL1({ question, selectedAnswers }: ExplainLikeL1Props) {
  const [open, setOpen] = useState(true);
  const breakdown = explainLikeL1(question, selectedAnswers);

  return (
    <section className="mt-4 rounded-xl border border-watchguard-orange/30 bg-watchguard-orange/[0.06] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-transparent border-0 cursor-pointer text-left"
      >
        <span className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-watchguard-orange flex-shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-watchguard-orange font-mono">
            Explain like I'm an L1
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-watchguard-orange transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3.5">
          <p className="text-[13px] text-gray-200 leading-relaxed whitespace-pre-wrap">
            {breakdown.plainLanguage}
          </p>

          <div className="grid gap-2.5 sm:grid-cols-3">
            <Panel icon={<BookOpen className="w-3.5 h-3.5" />} title="The Network+ concept">
              {breakdown.networkPlus}
            </Panel>
            <Panel icon={<Compass className="w-3.5 h-3.5" />} title="Where it lives in Fireware">
              {breakdown.webUiPath}
            </Panel>
            <Panel icon={<Wrench className="w-3.5 h-3.5" />} title="Check this first">
              {breakdown.checkFirst}
            </Panel>
          </div>

          <p className="text-[10px] text-gray-500 font-mono">
            Menu paths follow the Fireware 12.x study baseline. Confirm against the version running on your device.
          </p>
        </div>
      )}
    </section>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-watchguard-border bg-watchguard-dark/60 p-3">
      <h4 className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-bold text-watchguard-orange/90 font-mono mb-1.5">
        {icon}
        {title}
      </h4>
      <p className="text-[11.5px] text-gray-300 leading-relaxed">{children}</p>
    </div>
  );
}
