import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { errorShape } from './log';

/**
 * The promise in docs/privacy.md is that no log line can be tied to a person.
 * That is a property of every call site, not of any one of them, so it is
 * checked by reading the source rather than by exercising the handlers: a
 * `console.error(..., req.body)` added to a new route next month would pass
 * every behavioural test in this repo and still break the promise.
 */

const root = path.join(__dirname, '..');
const readRaw = (file: string) => readFileSync(path.join(root, file), 'utf8');
/** Source with comments and literal text removed; see `codeOnly` below. */
const read = (file: string) => codeOnly(readRaw(file));

/** Every server-side source file, excluding the tests that scan them. */
const SERVER_FILES = [
  'server.ts',
  // aiService runs only on the server, and formats upstream failures.
  'src/services/aiService.ts',
  ...readdirSync(path.join(root, 'server'))
    .filter(name => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map(name => `server/${name}`),
];

/** The one file allowed to reach the console, because it is what sanitises. */
const LOGGER = 'server/log.ts';

/**
 * Identifiers that carry, or could carry, something about a person. Matched
 * against the source text of a logging call, so a constant such as
 * `ADMIN_PASSWORD` is not mistaken for a value.
 */
const FORBIDDEN: [RegExp, string][] = [
  [/\breq\b/, 'the request object'],
  [/\bres\b/, 'the response object'],
  [/\busername\b/i, 'a username'],
  [/\bprompt\b/i, 'a tutor prompt'],
  [/\bhistory\b/i, 'conversation or quiz history'],
  [/\bsnapshot\b/i, 'a study snapshot'],
  [/\bpin\b/i, 'a PIN'],
  [/\brecovery\w*\b/i, 'a recovery code'],
  [/\btoken\b/i, 'a session token'],
  [/\bcookie\b/i, 'a cookie'],
  [/\bquestion\b/i, 'question content'],
  [/\bselected\w*\b/i, 'a submitted answer'],
  [/\btechnicianIssue\b/i, 'a learner-written lab issue'],
  [/\bsessionHistory\b/i, 'performance history'],
  [/\bapi_?key\b/i, 'an API key'],
  [/\.message\b/, 'an error message, which can quote an upstream request'],
  [/\.stack\b/, 'a stack trace'],
  [/\bips?\b/i, 'an address'],
  [/\baddress\b/i, 'an address'],
];

/**
 * Strips comments and the bodies of string literals, keeping the `${...}`
 * expressions inside template literals.
 *
 * What a log line *says* is the author's business; what it *interpolates* is
 * this test's. Without this step the scan trips over the security warning that
 * explains, in prose, that a client can choose its own address — and worse,
 * a maintainer who learned to phrase warnings around the word list would be
 * working against the check instead of with it.
 */
export function codeOnly(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const pair = source.slice(i, i + 2);
    if (pair === '//') { while (i < source.length && source[i] !== '\n') i += 1; continue; }
    if (pair === '/*') { const end = source.indexOf('*/', i); i = end < 0 ? source.length : end + 2; continue; }
    const ch = source[i];
    if (ch === "'" || ch === '"') {
      i += 1;
      while (i < source.length && source[i] !== ch) i += source[i] === '\\' ? 2 : 1;
      i += 1; out += ' '; continue;
    }
    if (ch === '`') {
      i += 1;
      while (i < source.length && source[i] !== '`') {
        if (source[i] === '\\') { i += 2; continue; }
        if (source.slice(i, i + 2) !== '${') { i += 1; continue; }
        i += 2;
        for (let depth = 1; i < source.length && depth > 0; i += 1) {
          if (source[i] === '{') depth += 1;
          else if (source[i] === '}') depth -= 1;
          if (depth > 0) out += source[i];
        }
      }
      i += 1; out += ' '; continue;
    }
    out += ch; i += 1;
  }
  return out;
}

/**
 * The argument text of every call to `name(` in `source`.
 *
 * Parenthesis counting is good enough here: no logging call in this repo puts
 * a parenthesis inside a string literal, and a stray one would only make the
 * captured text longer, never shorter, so the scan cannot miss a leak by it.
 */
function callArguments(source: string, name: string): string[] {
  const calls: string[] = [];
  const identifier = /[A-Za-z0-9_$.]/;
  let from = 0;
  for (;;) {
    const found = source.indexOf(name + '(', from);
    if (found < 0) break;
    from = found + name.length + 1;
    // Skip a longer identifier that merely ends with this name.
    if (found > 0 && identifier.test(source[found - 1])) continue;
    let depth = 1;
    let index = from;
    while (index < source.length && depth > 0) {
      if (source[index] === '(') depth += 1;
      else if (source[index] === ')') depth -= 1;
      index += 1;
    }
    calls.push(source.slice(from, index - 1));
  }
  return calls;
}

const HELPERS = ['logServerError', 'logServerNotice', 'logServerWarning'];

describe('server logging cannot describe a person', () => {
  it('keeps every console call behind the sanitiser', () => {
    for (const file of SERVER_FILES) {
      if (file === LOGGER) continue;
      expect(read(file), `${file} calls the console directly; log through server/log.ts`)
        .not.toMatch(/\bconsole\s*\./);
    }
  });

  it('never passes a request, an address or a username to a log call', () => {
    for (const file of SERVER_FILES) {
      const source = read(file);
      for (const helper of HELPERS) {
        for (const args of callArguments(source, helper)) {
          for (const [pattern, description] of FORBIDDEN) {
            expect(pattern.test(args), `${file}: ${helper}(${args.trim().slice(0, 90)}) logs ${description}`)
              .toBe(false);
          }
        }
      }
    }
  });

  it('formats nothing in the sanitiser that the sanitiser did not build', () => {
    const source = read(LOGGER);
    const outputs = ['console.error', 'console.warn', 'console.log']
      .flatMap(fn => callArguments(source, fn));
    expect(outputs.length).toBe(3);
    for (const args of outputs) {
      // Only the scope, a caller-supplied constant, and errorShape() may appear.
      expect(args.replace(/\$\{(scope|message|errorShape\(error\))\}/g, ''), `log.ts interpolates ${args}`)
        .not.toMatch(/\$\{/);
    }
  });

  it('would catch a leak rather than passing vacuously', () => {
    expect(callArguments("logServerError('chat', error);", 'logServerError')).toEqual(["'chat', error"]);
    for (const leak of ["'chat', req.ip", "'chat', err.message", "'auth', `sign-in failed for ${username}`"]) {
      expect(FORBIDDEN.some(([pattern]) => pattern.test(leak)), leak).toBe(true);
    }
    // A scan that finds no call sites asserts nothing at all.
    const found = SERVER_FILES.flatMap(file => HELPERS.flatMap(helper => callArguments(read(file), helper)));
    expect(found.length).toBeGreaterThan(8);
  });

  it('reads code and not prose, so a warning may still describe what it warns about', () => {
    // A comment naming a value is not a leak; interpolating it is.
    expect(codeOnly('// beware of req.ip here\nlogServerNotice(alpha);')).not.toMatch(/beware/);
    expect(codeOnly("logServerWarning('security', 'a client can choose its own address');"))
      .not.toMatch(/address/);
    expect(codeOnly('logServerNotice(`port ${bravo}`);')).toMatch(/bravo/);
    expect(codeOnly('logServerNotice(`port ${bravo}`);')).not.toMatch(/port/);
    // Stripping must not swallow the call itself, or the scan sees nothing.
    expect(callArguments(codeOnly("logServerError('chat', charlie); /* trailing */"), 'logServerError'))
      .toEqual([' , charlie']);
  });
});

describe('errorShape', () => {
  it('reports the class and a status or system code, and nothing else', () => {
    expect(errorShape(new TypeError('fetch failed: POST https://x {"prompt":"secret"}'))).toBe('TypeError');
    expect(errorShape(Object.assign(new Error('API key not valid'), { status: 400 }))).toBe('Error(400)');
    expect(errorShape(Object.assign(new Error('nope'), { statusCode: 503 }))).toBe('Error(503)');
    expect(errorShape(Object.assign(new Error('down'), { code: 'ECONNREFUSED' }))).toBe('Error(ECONNREFUSED)');
  });

  it('refuses a class name or code that has been shaped to smuggle a value', () => {
    class Weird extends Error {}
    Object.defineProperty(Weird, 'name', { value: 'user pin 482951' });
    expect(errorShape(new Weird('x'))).toBe('unknown');
    expect(errorShape(Object.assign(new Error('x'), { code: 'pilot_one used 482951' }))).toBe('Error');
    expect(errorShape(Object.assign(new Error('x'), { status: 9999 }))).toBe('Error');
  });

  it('survives values that are not errors at all', () => {
    expect(errorShape(null)).toBe('unknown');
    expect(errorShape(undefined)).toBe('unknown');
    expect(errorShape('pilot_one/482951')).toBe('string');
    expect(errorShape(Object.create(null))).toBe('Object');
  });
});
