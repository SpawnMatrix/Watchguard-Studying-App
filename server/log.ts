/**
 * Server logging.
 *
 * The portal deliberately keeps no record of who used it or what they typed.
 * That promise is only as good as the weakest log line, and the weakest log
 * line is an error object: `console.error("Chat API failed:", error)` prints
 * whatever the thrown value carries. An upstream HTTP client can attach the
 * request it sent, a parser can quote the text it choked on, and a stack
 * frame can capture a closure variable — none of which is visible at the
 * call site.
 *
 * So nothing here ever formats a value it did not construct. An error is
 * reduced to two facts that are useful for operations and cannot carry
 * content: what kind of error it was, and the status or system code it
 * arrived with. Both are filtered through a strict character allow-list,
 * because a constructor name and an error code are also strings an attacker
 * can influence in principle.
 *
 * Messages are dropped on purpose. If a failure cannot be diagnosed from the
 * class and code, reproduce it — do not widen this file.
 */

/** Which part of the app is reporting. A fixed set, never derived from input. */
export type LogScope =
  | 'startup'
  | 'security'
  | 'chat'
  | 'quiz'
  | 'lab'
  | 'analysis'
  // The upstream model call for each feature, kept distinct from the route
  // that wraps it so a log line still says which layer gave way.
  | 'ai-chat'
  | 'ai-quiz'
  | 'ai-lab'
  | 'ai-analysis'
  | 'retention';

const SAFE_NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const SAFE_CODE = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;

/**
 * Reduces any thrown value to `Class` or `Class(code)`.
 *
 * Only the constructor name and a recognisable error code survive; anything
 * unrecognised becomes `unknown`, which is deliberately unhelpful rather than
 * quietly revealing.
 */
export function errorShape(error: unknown): string {
  if (error === null || error === undefined) return 'unknown';

  const name = typeof error === 'object'
    ? (error as object).constructor?.name ?? 'Object'
    : typeof error;
  const safeName = SAFE_NAME.test(name) ? name : 'unknown';

  const detail = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  const status = [detail.status, detail.statusCode].find(value => Number.isInteger(value));
  if (typeof status === 'number' && status >= 100 && status <= 599) return `${safeName}(${status})`;

  // System codes such as ECONNREFUSED say more about a failure than any
  // message does, and are drawn from a fixed vocabulary.
  if (typeof detail.code === 'string' && SAFE_CODE.test(detail.code)) return `${safeName}(${detail.code})`;
  if (Number.isInteger(detail.code)) return `${safeName}(${detail.code})`;

  return safeName;
}

/**
 * Records that a request failed, and nothing about the request.
 *
 * There is no request identifier, path, address or account here by design:
 * anything that lets two log lines be tied to the same person is the trail
 * this app exists without.
 */
export function logServerError(scope: LogScope, error: unknown): void {
  console.error(`[${scope}] failed: ${errorShape(error)}`);
}

/**
 * Operator-facing notice on stdout.
 *
 * Callers pass deployment facts — a port, a configuration variable name —
 * never anything derived from a request. `server/logging.test.ts` fails the
 * build if a call site reaches for a request body, an address or a username.
 */
export function logServerNotice(scope: LogScope, message: string): void {
  console.log(`[${scope}] ${message}`);
}

/** As `logServerNotice`, for a misconfiguration an operator needs to act on. */
export function logServerWarning(scope: LogScope, message: string): void {
  console.warn(`[${scope}] ${message}`);
}
