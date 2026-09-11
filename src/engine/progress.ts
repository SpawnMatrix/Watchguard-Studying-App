import { watchguardLabs } from '../data/labs';

/** A practice report describes observed work; it never invents exam readiness. */
export function buildStudyReport(input:any={}) {
  const history=Array.isArray(input?.history)?input.history.filter((h:any)=>typeof h?.isCorrect==='boolean'&&typeof h.topic==='string'):null;
  const attempts=history?history.length:Math.max(0,Number(input?.totalQuizAttempts)||0);
  const correct=history?history.filter((h:any)=>h.isCorrect).length:Math.min(attempts,Math.max(0,Number(input?.correctQuizAnswers)||0));
  const topics=new Map<string,{correct:number;total:number}>();
  for(const h of history??[]){const stat=topics.get(h.topic)??{correct:0,total:0};stat.total++;if(h.isCorrect)stat.correct++;topics.set(h.topic,stat);}
  const weaknesses=history?[...topics].filter(([,s])=>s.correct<s.total).map(([topic])=>topic):(Array.isArray(input?.topicWeaknesses)?input.topicWeaknesses.filter((v:any)=>typeof v==='string'):[]);
  const strengths=[...topics].filter(([,s])=>s.total>=3&&s.correct/s.total>=.85).map(([topic,s])=>`${topic}: ${s.correct}/${s.total} correct`);
  const labTopics:Record<string,number[]>= {'Initial Setup':[1],'Policies':[11,14],'NAT':[6],'Routing':[6,8],'BOVPN':[15],'Mobile VPN':[13],'Proxies':[11],'Security Services':[11,13],'Switching & Wireless':[12],'Troubleshooting':[1,6],'Logging & Monitoring':[8]};
  const ids=new Set(weaknesses.flatMap((topic:string)=>labTopics[topic]??[]));
  return {
    readinessScore:attempts?`${Math.round(correct/attempts*100)}%`:'0%',
    strengths:strengths.length?strengths:['Answer at least three questions in a topic to begin identifying consistent strengths.'],
    criticalVulnerabilities:weaknesses.length?weaknesses.map((topic:string)=>`Review ${topic}`):['No missed topics in the submitted practice history. Expand topic coverage before judging readiness.'],
    recommendedLabs:watchguardLabs.filter(lab=>ids.has(lab.id)).map(lab=>lab.name),
    summary:`Observed quiz accuracy: ${correct} of ${attempts} answers correct. ${topics.size} topics sampled. This is a practice result, not an official exam score or pass prediction. Review missed concepts, practice fresh scenarios, and verify skills in the lab.`,
  };
}
