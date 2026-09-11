/** Only study data is synchronized. API keys, PINs and browser identity are excluded. */
export const STUDY_KEYS = ['watchguard-study-progress-v1','weakness_deck','watchguard_mastered_flashcards','watchguard-quiz-session-v2','watchguard-study-profile-name-v1','watchguard-srs-v1'] as const;
export type StudyKey = typeof STUDY_KEYS[number];
export type StudySnapshot = Partial<Record<StudyKey,string>>;
const object=(v:any)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const strings=(v:any)=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const history=(v:any)=>Array.isArray(v)&&v.every(h=>object(h)&&Number.isSafeInteger(h.questionId)&&strings(h.selectedAnswers)&&typeof h.isCorrect==='boolean'&&typeof h.topic==='string'&&typeof h.explanation==='string');
export function validStudyValue(key:string,value:string):boolean {
  try {
    if(key==='watchguard-study-profile-name-v1')return value.length<=32;
    const v=JSON.parse(value);
    if(key==='weakness_deck')return object(v)&&Object.entries(v).every(([id,streak])=>/^\d+$/.test(id)&&Number.isInteger(streak)&&Number(streak)>=0&&Number(streak)<3);
    if(key==='watchguard_mastered_flashcards')return Array.isArray(v)&&v.every(id=>Number.isSafeInteger(id)&&id>=0);
    // Spaced repetition state. Validated structurally here; srs.ts re-parses
    // defensively on read, so a partially valid payload degrades rather than throws.
    if(key==='watchguard-srs-v1')return object(v)&&object(v.cards)&&object(v.topics)&&
      Object.entries(v.cards).every(([id,card]:any)=>/^\d+$/.test(id)&&object(card)&&Number.isInteger(card.box)&&card.box>=1&&card.box<=5&&Number.isFinite(card.due))&&
      Object.entries(v.topics).every(([topic,stat]:any)=>typeof topic==='string'&&topic.length<=64&&object(stat)&&Number.isInteger(stat.seen)&&stat.seen>=0&&Number.isInteger(stat.correct)&&stat.correct>=0&&stat.correct<=stat.seen);
    if(key==='watchguard-study-progress-v1')return object(v)&&strings(v.completedLabs)&&object(v.quizStats)&&typeof v.quizStats.score==='string'&&strings(v.quizStats.topicWeaknesses)&&history(v.quizStats.history);
    if(key==='watchguard-quiz-session-v2')return object(v)&&['practice','mock-exam','weakness-review'].includes(v.mode)&&object(v.filters)&&['local','cloud','network-plus','all'].includes(v.filters.track)&&typeof v.filters.topic==='string'&&['mixed','authored','generated'].includes(v.filters.content)&&Array.isArray(v.queue)&&v.queue.every(question)&&
      (v.current===null||question(v.current))&&Number.isSafeInteger(v.index)&&v.index>=0&&strings(v.selected)&&history(v.history)&&Array.isArray(v.seen)&&v.seen.every(Number.isSafeInteger)&&Number.isSafeInteger(v.examStart)&&v.examStart>=0&&v.examStart<=v.history.length&&typeof v.complete==='boolean'&&
      (v.evaluation===null||(object(v.evaluation)&&typeof v.evaluation.isCorrect==='boolean'&&typeof v.evaluation.detailedExplanation==='string'));
    return false;
  }catch{return false;}
}
function question(q:any):boolean {return object(q)&&Number.isSafeInteger(q.id)&&typeof q.question==='string'&&typeof q.topic==='string'&&strings(q.options)&&q.options.length>=2&&strings(q.correctAnswers)&&q.correctAnswers.length>0&&q.correctAnswers.every((a:string)=>q.options.includes(a))&&typeof q.isMultiSelect==='boolean'&&q.correctAnswersCount===q.correctAnswers.length;}
export function validateSnapshot(input: unknown): StudySnapshot {
  if (!object(input)) throw new Error('Invalid progress');
  const result: StudySnapshot={};
  for (const [key,value] of Object.entries(input!)) {
    if (!STUDY_KEYS.includes(key as StudyKey) || typeof value!=='string' || value.length>1_500_000 || !validStudyValue(key,value)) throw new Error('Invalid progress field');
    result[key as StudyKey]=value;
  }
  if (JSON.stringify(result).length>2_000_000) throw new Error('Progress is too large');
  return result;
}
