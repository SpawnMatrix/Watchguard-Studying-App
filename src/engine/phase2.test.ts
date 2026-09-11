import { describe, expect, it } from 'vitest';
import { questionTemplates, generateQuestion } from './templates';
import { studyQuestions, filterQuestions } from './catalog';
import { gradeQuestion, validateQuestion } from './grading';
import { explainLikeL1 } from './eli1';
import { seededRandom } from './random';
import {
  emptySrsState, recordAnswer, topicWeight, weightedPick, dueCards,
  weakestTopics, parseSrsState, retainedCount, BOX_COUNT,
} from './srs';

const logTemplates = () => questionTemplates.filter(t => t.id >= 10101 && t.id < 10200);
const orderingTemplates = () => questionTemplates.filter(t => t.id >= 10201);

describe('log-analysis scenarios', () => {
  it('registers eight scenarios reachable through the normal generated pool', () => {
    expect(logTemplates()).toHaveLength(8);
    expect((filterQuestions({ content: 'generated' })).some(q => q.type === 'log')).toBe(true);
  });

  it('emits a simulated Traffic Monitor line and points at a Fireware menu', () => {
    for (const template of logTemplates()) {
      const q = generateQuestion({ templateId: template.id, seed: 31, version: 1 });
      expect(q.type).toBe('log');
      expect(q.logMessage).toMatch(/SIMULATED TRAFFIC MONITOR/);
      expect(q.logMessage).toMatch(/(Deny|ProxyDrop)/);
      // Every drop reason has to tell the learner where the fix lives.
      expect(q.explanation).toMatch(/Fireware Web UI/);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(gradeQuestion(q, q.correctAnswers)).toBe(true);
    }
  });

  it('varies the log per seed so the answer cannot be memorised by shape', () => {
    const a = generateQuestion({ templateId: 10101, seed: 777, version: 1 });
    const b = generateQuestion({ templateId: 10101, seed: 777, version: 1 });
    const c = generateQuestion({ templateId: 10101, seed: 778, version: 1 });
    expect(a.logMessage).toBe(b.logMessage);
    expect(a.logMessage).not.toBe(c.logMessage);
    expect(a.question).not.toBe(c.question);
  });
});

describe('policy ordering', () => {
  it('grades on sequence rather than membership', () => {
    expect(orderingTemplates().length).toBeGreaterThanOrEqual(4);
    for (const template of orderingTemplates()) {
      const q = generateQuestion({ templateId: template.id, seed: 5, version: 1 });
      expect(q.type).toBe('ordering');
      expect(q.correctAnswers).toHaveLength(5);
      expect(Object.keys(q.orderingDetails ?? {})).toHaveLength(5);
      expect(gradeQuestion(q, q.correctAnswers)).toBe(true);

      // The same five policies in the wrong order must be wrong. A set
      // comparison would pass this and teach the opposite of the lesson.
      const swapped = [...q.correctAnswers];
      [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
      expect(gradeQuestion(q, swapped)).toBe(false);
      expect(gradeQuestion(q, [...q.correctAnswers].reverse())).toBe(false);
    }
  });

  it('leaves ordinary multi-select questions order-insensitive', () => {
    const multi = studyQuestions.find(q => q.isMultiSelect && q.type !== 'ordering' && q.correctAnswers.length > 1);
    expect(multi).toBeDefined();
    expect(gradeQuestion(multi!, [...multi!.correctAnswers].reverse())).toBe(true);
  });

  it('validates under every template and seed it ships with', () => {
    for (const template of [...logTemplates(), ...orderingTemplates()]) {
      for (const seed of [0, 1, 7, 99, 4242, 987654]) {
        validateQuestion(generateQuestion({ templateId: template.id, seed, version: 1 }));
      }
    }
  });
});

describe('spaced repetition', () => {
  it('promotes one box on a hit and resets to box 1 on a miss', () => {
    const now = Date.now();
    let state = emptySrsState();
    state = recordAnswer(state, 10101, 'Policies', true, now);
    expect(state.cards['10101'].box).toBe(2);
    for (let i = 0; i < 3; i++) state = recordAnswer(state, 10101, 'Policies', true, now);
    expect(state.cards['10101'].box).toBe(BOX_COUNT);
    expect(retainedCount(state)).toBe(1);

    state = recordAnswer(state, 10101, 'Policies', false, now);
    expect(state.cards['10101'].box).toBe(1);
    expect(state.cards['10101'].lapses).toBe(1);
    expect(state.topics['Policies'].streak).toBe(1);
    expect(dueCards(state, now)).toEqual([10101]);
  });

  it('weights weak topics up and mastered topics down, leaving unseen at baseline', () => {
    let weak = emptySrsState(), strong = emptySrsState();
    for (let i = 0; i < 10; i++) weak = recordAnswer(weak, 100 + i, 'BOVPN', false);
    for (let i = 0; i < 10; i++) strong = recordAnswer(strong, 200 + i, 'NAT', true);
    expect(topicWeight(weak.topics['BOVPN'])).toBeGreaterThan(2);
    expect(topicWeight(strong.topics['NAT'])).toBeLessThanOrEqual(1);
    expect(topicWeight(undefined)).toBe(1);
  });

  it('does not over-react to a single unlucky answer', () => {
    const one = recordAnswer(emptySrsState(), 1, 'NAT', false);
    const many = Array.from({ length: 10 }).reduce<ReturnType<typeof emptySrsState>>(
      (state, _, i) => recordAnswer(state, 10 + i, 'Routing', false), emptySrsState());
    expect(topicWeight(one.topics['NAT'])).toBeLessThan(topicWeight(many.topics['Routing']));
  });

  it('actually biases selection toward the weak topic without erasing the rest', () => {
    let state = emptySrsState();
    for (let i = 0; i < 12; i++) state = recordAnswer(state, 300 + i, 'BOVPN', false);
    for (let i = 0; i < 12; i++) state = recordAnswer(state, 400 + i, 'NAT', true);
    const pool = [
      ...Array.from({ length: 20 }, (_, i) => ({ id: 500 + i, topic: 'BOVPN' })),
      ...Array.from({ length: 20 }, (_, i) => ({ id: 600 + i, topic: 'NAT' })),
    ];
    const rng = seededRandom(12345);
    let bovpn = 0;
    for (let i = 0; i < 2000; i++) if (weightedPick(rng, pool, state)!.topic === 'BOVPN') bovpn++;
    expect(bovpn).toBeGreaterThan(1200);
    expect(bovpn).toBeLessThan(1950);
  });

  it('ranks weakest topics for the dashboard', () => {
    let state = emptySrsState();
    for (let i = 0; i < 6; i++) state = recordAnswer(state, 700 + i, 'BOVPN', false);
    for (let i = 0; i < 6; i++) state = recordAnswer(state, 800 + i, 'NAT', true);
    expect(weakestTopics(state)[0].topic).toBe('BOVPN');
  });

  it('parses stored state defensively rather than trusting it', () => {
    expect(parseSrsState(null).cards).toEqual({});
    expect(parseSrsState({ cards: { abc: { box: 1, due: 0 } } }).cards).toEqual({});
    expect(parseSrsState({ cards: { '1': { box: 99, due: 0 } } }).cards).toEqual({});
    const parsed = parseSrsState({
      cards: { '1': { box: 2, due: 5, lapses: 1, reviews: 3, lastSeen: 9 } },
      topics: { NAT: { seen: 2, correct: 9, streak: 0, lastSeen: 1 } },
    });
    expect(parsed.cards['1'].box).toBe(2);
    // correct can never exceed seen, however the payload arrived.
    expect(parsed.topics['NAT'].correct).toBe(2);
  });
});

describe('explain like I am an L1', () => {
  it('covers every topic in the bank with a menu path and a Network+ concept', () => {
    const topics = [...new Set(studyQuestions.map(q => q.topic))];
    for (const topic of topics) {
      const question = studyQuestions.find(q => q.topic === topic)!;
      const breakdown = explainLikeL1(question, [question.options[0]]);
      expect(breakdown.plainLanguage.length, topic).toBeGreaterThan(80);
      expect(breakdown.networkPlus.length, topic).toBeGreaterThan(30);
      expect(breakdown.webUiPath, topic).toMatch(/→|Fireware|WatchGuard Cloud/);
      expect(breakdown.checkFirst.length, topic).toBeGreaterThan(30);
    }
  });

  it('names the sequence for an ordering question instead of a single option', () => {
    const q = generateQuestion({ templateId: 10201, seed: 3, version: 1 });
    const breakdown = explainLikeL1(q, []);
    expect(breakdown.plainLanguage).toMatch(/→/);
    expect(breakdown.plainLanguage).toMatch(/first policy that matches/);
  });

  it('quotes back what the learner actually chose', () => {
    const question = studyQuestions.find(q => !q.isMultiSelect && q.type !== 'ordering')!;
    const wrong = question.options.find(o => !question.correctAnswers.includes(o))!;
    expect(explainLikeL1(question, [wrong]).plainLanguage).toContain(wrong.slice(0, 40));
  });
});
