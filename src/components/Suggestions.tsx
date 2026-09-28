import React, { useCallback, useEffect, useState } from 'react';
import { Lightbulb, MessageSquare, Send, Trash2, EyeOff, UserRound, AlertTriangle } from 'lucide-react';
import { parseBold } from '../utils/textFormatting';
import { handleError } from '../utils/errorHandler';
import { readClaims, rememberClaim, forgetClaim, markClaimsSeen, type MineEntry } from '../engine/suggestionClaims';

interface Suggestion {
  id: number;
  body: string;
  displayName: string | null;
  status: 'pending' | 'declined' | 'open' | 'planned' | 'shipped';
  adminReply: string | null;
  createdAt: number;
  updatedAt: number;
}

const MAX_BODY = 1500;

const STATUS: Record<Suggestion['status'], { label: string; className: string }> = {
  pending: { label: 'Waiting for review', className: 'text-gray-300 bg-gray-500/10 border-gray-500/30' },
  declined: { label: 'Not planned', className: 'text-gray-400 bg-gray-500/10 border-gray-500/30' },
  open: { label: 'Under consideration', className: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
  planned: { label: 'Planned', className: 'text-watchguard-orange bg-watchguard-orange/10 border-watchguard-orange/30' },
  shipped: { label: 'Shipped', className: 'text-green-400 bg-green-500/10 border-green-500/30' },
};

/** The roadmap reads top-down, so the board is grouped rather than sorted. */
const BOARD_ORDER: Suggestion['status'][] = ['shipped', 'planned', 'open'];

async function request(path: string, body?: unknown) {
  const response = await fetch('/api/suggestions' + path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Study-Request': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.message || 'That did not work.'), { status: response.status });
  return data;
}

/** `showStatus` is off on the board, where the group heading already says it. */
interface CardProps { suggestion: Suggestion; showStatus?: boolean; children?: React.ReactNode }

const Card: React.FC<CardProps> = ({ suggestion, showStatus = true, children }) => {
  const status = STATUS[suggestion.status];
  return (
    <li className="bg-watchguard-gray border border-watchguard-border rounded-2xl p-4 space-y-3">
      <div className={`flex items-start gap-3 flex-wrap ${showStatus ? 'justify-between' : 'justify-end'}`}>
        {showStatus && (
          <span className={`text-[10px] font-mono font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${status.className}`}>
            {status.label}
          </span>
        )}
        <span className="text-[10px] font-mono text-gray-500 flex items-center gap-1.5">
          {suggestion.displayName
            ? <><UserRound className="w-3 h-3" aria-hidden="true" />{suggestion.displayName}</>
            : <><EyeOff className="w-3 h-3" aria-hidden="true" />Anonymous</>}
        </span>
      </div>
      <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{parseBold(suggestion.body)}</p>
      {suggestion.adminReply && (
        <div className="border-l-2 border-watchguard-orange/50 pl-3 space-y-1">
          <span className="text-[10px] font-mono text-watchguard-orange flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3" aria-hidden="true" />Reply
          </span>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{parseBold(suggestion.adminReply)}</p>
        </div>
      )}
      {children}
    </li>
  );
};

export default function Suggestions() {
  const [board, setBoard] = useState<Suggestion[]>([]);
  const [mine, setMine] = useState<(Suggestion & { claim: string })[]>([]);
  const [body, setBody] = useState('');
  const [showName, setShowName] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const claims = Object.keys(readClaims());
      const [published, own] = await Promise.all([
        request(''),
        claims.length === 0 ? Promise.resolve({ suggestions: [] }) : request('/mine', { claims }),
      ]);
      setBoard(published.suggestions ?? []);
      // Each post arrives with the claim that fetched it, so Withdraw acts on
      // the card it is attached to rather than on whichever came back first.
      const owned = (own.suggestions ?? []) as (Suggestion & { claim: string })[];
      setMine(owned);
      markClaimsSeen(owned.map(item => ({
        claim: item.claim, updatedAt: item.updatedAt, status: item.status, adminReply: item.adminReply,
      })) as MineEntry[]);
    } catch (err) {
      handleError('Failed to load the ideas board', err);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const report = (text: string, bad: boolean) => { setMessage(text); setIsError(bad); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); report('', false);
    try {
      const { claim } = await request('', { body, showName });
      rememberClaim(claim);
      setBody(''); setShowName(false);
      report('Sent. It appears on the board once it has been read.', false);
      await refresh();
    } catch (err: any) {
      report(err.status === 401 ? 'Sign in to post an idea.' : err.message || 'That did not send.', true);
    } finally { setBusy(false); }
  };

  const withdraw = async (claim: string) => {
    setBusy(true); report('', false);
    try {
      await request('/withdraw', { claim });
      forgetClaim(claim);
      report('Withdrawn.', false);
      await refresh();
    } catch (err: any) {
      report(err.message || 'That could not be withdrawn.', true);
    } finally { setBusy(false); }
  };

  const remaining = MAX_BODY - body.length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="w-5 h-5 text-watchguard-orange" />
          <h2 className="font-display font-semibold text-white text-xl tracking-tight">Ideas &amp; Feedback</h2>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">
          Ask for something, report something broken, or say what would help you study. Ideas appear
          on the board below once they have been read.
        </p>
      </header>

      <form onSubmit={submit} className="bg-watchguard-gray border border-watchguard-border rounded-2xl p-5 space-y-3">
        <label className="block space-y-2">
          <span className="text-xs font-bold text-gray-200 font-mono">Your idea</span>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value.slice(0, MAX_BODY))}
            rows={4}
            required
            minLength={10}
            placeholder="More BOVPN practice questions would help me…"
            className="w-full bg-watchguard-dark border border-watchguard-border text-sm text-white rounded-lg px-3 py-2.5 outline-none focus:border-watchguard-orange/50 transition-all resize-y"
          />
        </label>

        <p className="text-[11px] text-gray-400 font-sans leading-relaxed flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-watchguard-orange flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Please leave out anything personal &mdash; this is read by an administrator and, once
            published, by everyone. Posting anonymously means <strong className="text-gray-200">nothing</strong> is
            stored linking the idea to you, not even for us. Your browser keeps the only key to it,
            so clearing site data means you stop seeing replies.
          </span>
        </p>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input type="checkbox" checked={showName} onChange={e => setShowName(e.target.checked)} />
            Show my username on this
          </label>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-mono ${remaining < 100 ? 'text-watchguard-orange' : 'text-gray-500'}`}>
              {remaining}
            </span>
            <button
              type="submit"
              disabled={busy || body.trim().length < 10}
              className="bg-watchguard-orange hover:bg-watchguard-orange/95 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all border border-watchguard-orange/40 cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              Send
            </button>
          </div>
        </div>

        {message && (
          <p className={`text-[11px] font-mono ${isError ? 'text-red-400' : 'text-green-400'}`} role="status">{message}</p>
        )}
      </form>

      {mine.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-display font-semibold text-white">Yours</h3>
          <ul className="space-y-3 list-none p-0">
            {mine.map(item => (
              <Card key={item.id} suggestion={item}>
                <button
                  onClick={() => withdraw(item.claim)}
                  disabled={busy || !item.claim}
                  className="text-[10px] text-gray-400 hover:text-red-400 transition-colors font-mono underline bg-transparent border-0 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                  Withdraw
                </button>
              </Card>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-display font-semibold text-white">The board</h3>
        {board.length === 0
          ? <p className="text-sm text-gray-500">Nothing published yet. Yours could be first.</p>
          : BOARD_ORDER.filter(status => board.some(item => item.status === status)).map(status => (
            <div key={status} className="space-y-3">
              <h4 className="text-[11px] font-mono uppercase tracking-wide text-gray-500">{STATUS[status].label}</h4>
              <ul className="space-y-3 list-none p-0">
                {board.filter(item => item.status === status).map(item => (
                  <Card key={item.id} suggestion={item} showStatus={false} />
                ))}
              </ul>
            </div>
          ))}
      </section>
    </div>
  );
}
