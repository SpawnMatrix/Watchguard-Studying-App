import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { activatesOnEnter, isChosenQuizOption, isTypingTarget, quizShortcut, tabFromHash } from './shortcuts';

const ctx = (key: string, extra: Partial<Parameters<typeof quizShortcut>[0]> = {}) =>
  quizShortcut({ key, optionCount: 4, hasSelection: false, submitted: false, ...extra });

describe('quiz keyboard shortcuts', () => {
  it('chooses options by number or by the letter shown beside them', () => {
    expect(ctx('1')).toEqual({ kind: 'select', index: 0 });
    expect(ctx('4')).toEqual({ kind: 'select', index: 3 });
    expect(ctx('b')).toEqual({ kind: 'select', index: 1 });
    expect(ctx('D')).toEqual({ kind: 'select', index: 3 });
  });

  it('ignores keys past the last option', () => {
    expect(ctx('5')).toBeNull();
    expect(ctx('e')).toBeNull();
    expect(ctx('0')).toBeNull();
  });

  it('checks the answer with Enter only once something is chosen, then moves on', () => {
    expect(ctx('Enter')).toBeNull();
    expect(ctx('Enter', { hasSelection: true })).toEqual({ kind: 'submit' });
    expect(ctx('Enter', { hasSelection: true, submitted: true })).toEqual({ kind: 'next' });
  });

  it('does not change the answer after it has been checked', () => {
    expect(ctx('2', { submitted: true })).toBeNull();
  });

  it('leaves browser shortcuts and non-standard question types alone', () => {
    expect(ctx('r', { ctrlOrMeta: true })).toBeNull();
    expect(ctx('a', { altKey: true })).toBeNull();
    expect(ctx('a', { optionCount: 0 })).toBeNull();
    expect(ctx('Enter', { optionCount: 0, hasSelection: true })).toEqual({ kind: 'submit' });
  });

  it('never fires while typing in a form control', () => {
    expect(isTypingTarget({ tagName: 'INPUT' } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: 'select' } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV' } as unknown as EventTarget)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });

  it('lets a focused button handle its own Enter, so an answer is never checked twice', () => {
    expect(activatesOnEnter({ tagName: 'BUTTON' } as unknown as EventTarget)).toBe(true);
    expect(activatesOnEnter({ tagName: 'DIV', getAttribute: () => 'button' } as unknown as EventTarget)).toBe(true);
    expect(activatesOnEnter({ tagName: 'BODY', getAttribute: () => null } as unknown as EventTarget)).toBe(false);
  });

  it('checks the answer on Enter when focus is still on the option just chosen', () => {
    const option = (attrs: Record<string, string>) => ({ tagName: 'BUTTON', getAttribute: (name: string) => attrs[name] ?? null }) as unknown as EventTarget;
    expect(isChosenQuizOption(option({ 'data-quiz-option': '', 'aria-pressed': 'true' }))).toBe(true);
    expect(isChosenQuizOption(option({ 'data-quiz-option': '', 'aria-pressed': 'false' }))).toBe(false);
    expect(isChosenQuizOption(option({ 'aria-pressed': 'true' }))).toBe(false);
    expect(isChosenQuizOption(null)).toBe(false);
  });
});

describe('sections in the URL', () => {
  const tabs = ['home', 'quiz', 'labs'] as const;

  it('reads a known section from the hash', () => {
    expect(tabFromHash('#labs', tabs)).toBe('labs');
    expect(tabFromHash('quiz', tabs)).toBe('quiz');
  });

  it('ignores anchors that are not sections, such as the skip link', () => {
    expect(tabFromHash('#study-content', tabs)).toBeNull();
    expect(tabFromHash('', tabs)).toBeNull();
    expect(tabFromHash('#%E2%9C%93', tabs)).toBeNull();
  });
});

describe('wiring', () => {
  const read = (file: string) => readFileSync(path.join(__dirname, '..', file), 'utf8');

  it('uses the shortcuts in the quiz and the arrow keys in flashcards', () => {
    expect(read('components/PracticeQuiz.tsx')).toMatch(/quizShortcut\(/);
    expect(read('components/FlashcardStudio.tsx')).toMatch(/ArrowRight/);
  });

  it('keeps the current section in the URL and loads heavy sections on demand', () => {
    const app = read('App.tsx');
    expect(app).toMatch(/tabFromHash\(/);
    expect(app).toMatch(/lazy\(\(\) => loadSection\(\(\) => import\(".\/components\/LabWalkthrough"\)\)\)/);
  });
});
