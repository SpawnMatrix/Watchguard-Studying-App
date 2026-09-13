/**
 * Input ceilings for the unauthenticated tutor endpoints.
 *
 * /api/chat and /api/quiz/evaluate are open by design and forward what they are given to a
 * metered upstream. The 1mb body limit alone still allowed a single request to carry roughly a
 * megabyte of prompt, so cost and latency were bounded only by the rate limiter. A study question
 * and its context fit comfortably inside these.
 */
export const MAX_PROMPT_CHARS = 4000;
export const MAX_HISTORY_TURNS = 20;
export const MAX_HISTORY_CHARS = 12000;

/** Returns a message to show the user, or null when the input is acceptable. */
export function tutorInputProblem(prompt: unknown, history: unknown): string | null {
  if (typeof prompt !== 'string' || !prompt.trim()) return 'Ask a question before sending.';
  if (prompt.length > MAX_PROMPT_CHARS) return `Keep the question under ${MAX_PROMPT_CHARS} characters.`;
  if (history === undefined || history === null) return null;
  if (!Array.isArray(history)) return 'Conversation history must be a list.';
  if (history.length > MAX_HISTORY_TURNS) return 'Start a new conversation; this one is too long.';
  let total = 0;
  for (const turn of history) {
    const text = (turn as { text?: unknown } | null)?.text;
    if (text !== undefined && typeof text !== 'string') return 'Conversation history is malformed.';
    total += typeof text === 'string' ? text.length : 0;
    if (total > MAX_HISTORY_CHARS) return 'Start a new conversation; this one is too long.';
  }
  return null;
}
