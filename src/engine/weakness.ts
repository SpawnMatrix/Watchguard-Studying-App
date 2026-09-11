export function advanceWeakness(deck:Record<number,number>,id:number,correct:boolean):Record<number,number> {
  const next={...deck};
  if(!correct)next[id]=0;
  else if(next[id]!==undefined){next[id]++;if(next[id]>=3)delete next[id];}
  return next;
}
