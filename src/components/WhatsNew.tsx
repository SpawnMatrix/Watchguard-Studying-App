import { useEffect } from 'react';
import { Sparkles, Wrench, Bug, History } from 'lucide-react';
import { changelog, INTERNAL_ONLY, releaseDate, type ChangeKind } from '../data/changelog';
import { parseBold } from '../utils/textFormatting';
import { markChangelogSeen } from '../engine/changelogSeen';

const KIND: Record<ChangeKind, { label: string; icon: typeof Sparkles; className: string }> = {
  new: { label: 'New', icon: Sparkles, className: 'text-green-400 bg-green-500/10 border-green-500/30' },
  improved: { label: 'Better', icon: Wrench, className: 'text-watchguard-orange bg-watchguard-orange/10 border-watchguard-orange/30' },
  fixed: { label: 'Fixed', icon: Bug, className: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(releaseDate(iso));

/**
 * The learner-facing release history.
 *
 * Opening it is what marks it read, so the badge in the navigation clears
 * without a button to press. That mark is per-device on purpose: it is a
 * convenience, not study progress, and syncing it would put another per-person
 * field on the server for no benefit. See docs/privacy.md.
 */
export default function WhatsNew() {
  useEffect(() => { markChangelogSeen(); }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2.5">
          <History className="w-5 h-5 text-watchguard-orange" />
          <h2 className="font-display font-semibold text-white text-xl tracking-tight">What&rsquo;s New</h2>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">
          Everything that has changed in the study portal, newest first. Your progress is never
          affected by an update.
        </p>
      </header>

      <ol className="space-y-4 list-none p-0">
        {changelog.map(entry => (
          <li
            key={entry.version}
            className="bg-watchguard-gray border border-watchguard-border rounded-2xl p-5 space-y-3.5 shadow-lg"
          >
            <div className="flex items-baseline justify-between gap-3 flex-wrap border-b border-watchguard-border pb-3">
              <h3 className="font-display font-semibold text-white text-base leading-snug">
                {entry.headline}
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-mono flex-shrink-0">
                <span className="text-watchguard-orange bg-watchguard-orange/10 px-2 py-0.5 rounded border border-watchguard-orange/20">
                  {entry.version}
                </span>
                <time dateTime={entry.date} className="text-gray-500">{formatDate(entry.date)}</time>
              </div>
            </div>

            <ul className="space-y-2.5 list-none p-0">
              {entry.changes.map((change, index) => {
                const kind = KIND[change.kind];
                const Icon = kind.icon;
                return (
                  <li key={index} className="flex items-start gap-2.5">
                    <span
                      className={`flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5 ${kind.className}`}
                    >
                      <Icon className="w-3 h-3" aria-hidden="true" />
                      {kind.label}
                    </span>
                    <span className="text-sm text-gray-300 leading-relaxed">{parseBold(change.text)}</span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>

      {Object.keys(INTERNAL_ONLY).length > 0 && (
        <details className="bg-watchguard-gray border border-watchguard-border rounded-2xl p-5">
          <summary className="text-xs font-mono text-gray-400 cursor-pointer hover:text-gray-200 transition-colors">
            Releases with nothing to see ({Object.keys(INTERNAL_ONLY).length})
          </summary>
          <ul className="mt-3 space-y-1.5 list-none p-0">
            {Object.entries(INTERNAL_ONLY).reverse().map(([version, reason]) => (
              <li key={version} className="text-[11px] font-mono text-gray-500 flex gap-2">
                <span className="text-gray-400 flex-shrink-0">{version}</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
