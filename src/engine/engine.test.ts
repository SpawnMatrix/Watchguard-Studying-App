import { describe, expect, it } from 'vitest';
import { examQuestions } from '../data/questions';
import { authoredQuestions } from '../data/authoredQuestions';
import { generateQuestion, questionTemplates } from './templates';
import { createExam, filterQuestions, studyQuestions } from './catalog';
import { gradeQuestion, validateQuestion } from './grading';
import { contains, ipv4ToNumber, numberToIPv4, smallestLanPrefix, subnet } from './network';

describe('content and backward compatibility', () => {
  it('preserves historical identifiers and adds at least 260 original questions', () => {
    const legacyIds=[...Array.from({length:127},(_,i)=>i+1),...Array.from({length:8},(_,i)=>i+201),...Array.from({length:10},(_,i)=>i+301)];
    expect(examQuestions.filter(q=>legacyIds.includes(q.id))).toHaveLength(145);
    expect(authoredQuestions.length).toBeGreaterThanOrEqual(260);
    expect(examQuestions.length).toBeGreaterThanOrEqual(400);
    expect(new Set(studyQuestions.map(q=>q.id)).size).toBe(studyQuestions.length);
    expect(new Set(authoredQuestions.map(q=>q.question)).size).toBe(authoredQuestions.length);
    for (const q of authoredQuestions) {
      validateQuestion(q);
      expect(q.explanation?.length).toBeGreaterThan(40);
      expect(q.sources?.length).toBeGreaterThan(0);
    }
  });
  it('grades exact sets and rejects duplicates, extras, missing and unknown choices', () => {
    const q=examQuestions.find(q=>q.id===10)!;
    expect(gradeQuestion(q,['RADIUS','Firebox-DB'])).toBe(true);
    for (const answers of [[],['RADIUS'],['RADIUS','RADIUS'],['RADIUS','Firebox-DB','LDAP'],['RADIUS','bogus']]) expect(gradeQuestion(q,answers)).toBe(false);
  });
});

describe('deterministic scenario generation', () => {
  it('validates 62,000 variants with reproducible answers and nonempty explanations', () => {
    expect(questionTemplates).toHaveLength(62);
    for (const template of questionTemplates) {
      const questions=new Set<string>();
      for (let seed=0;seed<1000;seed++) {
        const variant={templateId:template.id,seed,version:1};
        const q=generateQuestion(variant);
        validateQuestion(q);
        expect(gradeQuestion(q,q.correctAnswers)).toBe(true);
        expect(gradeQuestion(q,[q.options.find(a=>!q.correctAnswers.includes(a))!])).toBe(false);
        if (seed<3) expect(generateQuestion(variant)).toEqual(q);
        questions.add(q.question);
      }
      expect(questions.size,template.title).toBeGreaterThan(1);
    }
  });
  it('rejects invalid descriptors rather than falling back to another question', () => {
    for (const v of [{templateId:10001,seed:-1,version:1},{templateId:10001,seed:0,version:2},{templateId:99,seed:0,version:1},{templateId:10001,seed:2**32,version:1}]) expect(()=>generateQuestion(v)).toThrow();
  });
  it('builds a stable 50-question exam, including from a small generated pool', () => {
    const pool=filterQuestions({content:'generated',track:'network-plus'});
    const exam=createExam(pool,4321);
    expect(exam).toHaveLength(50);
    expect(createExam(pool,4321)).toEqual(exam);
    expect(new Set(exam.map(q=>JSON.stringify(q.variant))).size).toBe(50);
    expect(exam.every(q=>q.track==='network-plus')).toBe(true);
    expect(createExam([],0)).toEqual([]);
    const authored=createExam(filterQuestions({content:'authored'}),1);
    expect(new Set(authored.map(q=>q.id)).size).toBe(authored.length);
  });
});

describe('network arithmetic independently checked with BigInt masks', () => {
  it('matches a separate bit-mask oracle across prefix boundaries', () => {
    for(let prefix=0;prefix<=32;prefix++) for(const addr of ['0.0.0.0','10.73.91.249','172.31.255.255','192.168.130.64','255.255.255.255']) {
      const value=addr.split('.').reduce((n,p)=>(n<<8n)+BigInt(p),0n);
      const mask=(0xffffffffn<<BigInt(32-prefix))&0xffffffffn;
      const n=subnet(addr,prefix);
      expect(n.network).toBe(Number(value&mask));
      expect(n.broadcast).toBe(Number((value&mask)|(~mask&0xffffffffn)));
      expect(numberToIPv4(ipv4ToNumber(addr))).toBe(addr);
    }
    expect(contains('10.0.0.0/24','10.0.1.0')).toBe(false);
    expect(contains('10.0.0.0/24','10.0.0.255')).toBe(true);
    expect(smallestLanPrefix(62)).toBe(26);
    expect(smallestLanPrefix(63)).toBe(25);
  });
});
