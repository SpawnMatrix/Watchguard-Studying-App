/**
 * Input ceilings for the unauthenticated tutor endpoints.
 *
 * /api/chat, /api/quiz/evaluate and /api/lab/diagnostic are open by design and forward what they
 * are given to a metered upstream. The 1mb body limit alone still allowed a single request to
 * carry roughly a megabyte of prompt, so cost and latency were bounded only by the rate limiter.
 * A study question and its context fit comfortably inside these.
 *
 * These are also a privacy boundary, not only a cost one: whatever passes here is what leaves for
 * Google. The ceilings are set roughly four times the largest real content in the repo — the
 * longest lab instruction is 255 characters, the longest question 327 — so they bound an abuser
 * without ever being reachable by a learner.
 */
export const MAX_PROMPT_CHARS = 4000;
export const MAX_HISTORY_TURNS = 20;
export const MAX_HISTORY_CHARS = 12000;

export const MAX_LAB_NAME_CHARS = 200;
export const MAX_STEP_TITLE_CHARS = 200;
export const MAX_STEP_INSTRUCTION_CHARS = 1200;
export const MAX_ISSUE_CHARS = 1500;

export const MAX_QUESTION_CHARS = 2000;
export const MAX_OPTIONS = 16;
export const MAX_OPTION_CHARS = 600;
export const MAX_ANSWER_CHARS = 2000;

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

/** A required field of at most `limit` characters, or a message naming it. */
function text(value: unknown, label: string, limit: number): string | null {
  if (typeof value !== 'string' || !value.trim()) return `Include the ${label}.`;
  return value.length > limit ? `Keep the ${label} under ${limit} characters.` : null;
}

/**
 * Ceilings for /api/lab/diagnostic, which had none at all.
 *
 * Three of its four fields are the app's own lab content, echoed back by the client so the model
 * can see the step being attempted. The client is not a trustworthy source for them, so the sizes
 * are checked here even though nothing but a learner's own `issue` is genuinely free text.
 */
export function labDiagnosticProblem(
  labName: unknown, stepTitle: unknown, stepInstruction: unknown, issue: unknown,
): string | null {
  return text(labName, 'lab name', MAX_LAB_NAME_CHARS)
    ?? text(stepTitle, 'step title', MAX_STEP_TITLE_CHARS)
    ?? text(stepInstruction, 'step instruction', MAX_STEP_INSTRUCTION_CHARS)
    ?? (typeof issue !== 'string' || !issue.trim() ? 'Describe what went wrong before asking.'
      : issue.length > MAX_ISSUE_CHARS ? `Keep the description under ${MAX_ISSUE_CHARS} characters.` : null);
}

/**
 * Ceilings for the /api/quiz/evaluate path that forwards a question upstream.
 *
 * That path only runs for a question the server cannot find in its own catalogue, which no
 * ordinary client produces. Until now it accepted a megabyte of arbitrary text and sent it to the
 * model, which is the whole of the tutor endpoint's abuse surface in one branch.
 */
export function quizEvaluationProblem(
  question: unknown, options: unknown, selectedAnswer: unknown, correctAnswer: unknown,
): string | null {
  const problem = text(question, 'question', MAX_QUESTION_CHARS);
  if (problem) return problem;
  if (options !== undefined && options !== null) {
    if (!Array.isArray(options)) return 'Answer options must be a list.';
    if (options.length > MAX_OPTIONS) return `Send at most ${MAX_OPTIONS} answer options.`;
    for (const option of options) {
      if (typeof option !== 'string') return 'Answer options must be a list.';
      if (option.length > MAX_OPTION_CHARS) return `Keep each option under ${MAX_OPTION_CHARS} characters.`;
    }
  }
  for (const [value, label] of [[selectedAnswer, 'selected answer'], [correctAnswer, 'correct answer']] as const) {
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string') return `The ${label} must be text.`;
    if (value.length > MAX_ANSWER_CHARS) return `Keep the ${label} under ${MAX_ANSWER_CHARS} characters.`;
  }
  return null;
}
