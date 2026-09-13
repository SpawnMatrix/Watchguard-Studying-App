import { describe, expect, it } from 'vitest';
import { tutorInputProblem } from './tutorInput';

/**
 * /api/chat is unauthenticated by design and forwards what it is given to a metered upstream.
 * Before these bounds the only ceiling was the 1mb body limit, so one request could carry roughly
 * a megabyte of prompt and the rate limiter was the sole cost control.
 */
describe('tutor input bounds', () => {
  it('accepts an ordinary study question, with and without history', () => {
    expect(tutorInputProblem('What does the Outgoing policy allow by default?', undefined)).toBeNull();
    expect(tutorInputProblem('Explain NAT loopback.', null)).toBeNull();
    expect(tutorInputProblem('Explain NAT loopback.', [{ text: 'earlier question' }, { text: 'earlier answer' }])).toBeNull();
    // A turn carrying no text at all is not malformed, just empty.
    expect(tutorInputProblem('Explain NAT loopback.', [{}])).toBeNull();
  });

  it('rejects an empty or non-string prompt rather than forwarding it', () => {
    for (const prompt of ['', '   ', undefined, null, 42, {}, []]) {
      expect(tutorInputProblem(prompt, undefined), String(prompt)).not.toBeNull();
    }
  });

  it('caps the prompt so one request cannot carry a megabyte of text', () => {
    expect(tutorInputProblem('a'.repeat(4000), undefined)).toBeNull();
    expect(tutorInputProblem('a'.repeat(4001), undefined)).toMatch(/4000 characters/);
  });

  it('caps conversation history by turn count and by total size', () => {
    const turn = { text: 'a'.repeat(100) };
    expect(tutorInputProblem('ok', Array.from({ length: 20 }, () => turn))).toBeNull();
    expect(tutorInputProblem('ok', Array.from({ length: 21 }, () => turn))).toMatch(/too long/);
    // Few turns, but far too much text in them.
    expect(tutorInputProblem('ok', [{ text: 'a'.repeat(12001) }])).toMatch(/too long/);
  });

  it('rejects malformed history instead of letting it through to the upstream', () => {
    expect(tutorInputProblem('ok', 'not a list')).toMatch(/list/);
    expect(tutorInputProblem('ok', [{ text: 12345 }])).toMatch(/malformed/);
    expect(tutorInputProblem('ok', [null])).toBeNull();
  });
});
