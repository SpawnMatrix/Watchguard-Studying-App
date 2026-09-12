import type { QuizHistoryItem } from '../components/QuizAnalyticsPanel';

export function homeMetrics(history: QuizHistoryItem[], now=new Date()) {
  const topics=new Map<string,{total:number;correct:number}>();
  for(const h of history){const t=topics.get(h.topic)||{total:0,correct:0};t.total++;t.correct+=Number(h.isCorrect);topics.set(h.topic,t);}
  const dayKey=(d:Date)=>`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const days=Array.from({length:7},(_,i)=>{const date=new Date(now);date.setDate(date.getDate()-6+i);return {key:dayKey(date),label:date.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}),count:0};});
  const active=new Set<string>();
  for(const h of history){if(!h.answeredAt)continue;const d=new Date(h.answeredAt);if(!Number.isFinite(d.getTime())||d>now)continue;const key=dayKey(d);active.add(key);const day=days.find(v=>v.key===key);if(day)day.count++;}
  const cursor=new Date(now);if(!active.has(dayKey(cursor)))cursor.setDate(cursor.getDate()-1);
  let streak=0;while(active.has(dayKey(cursor))){streak++;cursor.setDate(cursor.getDate()-1);}
  const recent=history.slice(-10),previous=history.slice(-20,-10);
  const accuracy=(items:QuizHistoryItem[])=>items.length?Math.round(items.filter(h=>h.isCorrect).length/items.length*100):null;
  return {days,streak,accuracy:accuracy(history),recent:accuracy(recent),previous:accuracy(previous),recentCount:recent.length,previousCount:previous.length,topics:[...topics].map(([topic,s])=>({topic,...s,percent:Math.round(s.correct/s.total*100)})).sort((a,b)=>a.percent-b.percent)};
}
