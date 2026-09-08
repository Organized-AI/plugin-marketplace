// Shared mechanics; adapters own evaluation, permissible changes and acceptance.
export async function iterate(input, adapter, {maxRounds=5,maxFailures=2,plateauRounds=2}={}) {
  for(const n of [maxRounds,maxFailures,plateauRounds])if(!Number.isInteger(n)||n<1||n>30)throw Error('Loop bounds must be integers from 1 to 30');
  let best=structuredClone(input),report=await adapter.evaluate(best),failures=0,plateau=0;
  const baseline=structuredClone(report),rounds=[];
  for(let round=1;round<=maxRounds;round++) {
    try {
      const change=await adapter.propose({candidate:structuredClone(best),report:structuredClone(report),round});
      const candidate=await adapter.apply(structuredClone(best),change),next=await adapter.evaluate(candidate);
      const accepted=await adapter.accept(report,next);
      rounds.push({round,accepted:!!accepted,score:next.score,change});
      if(accepted){best=candidate;report=next;plateau=0;}else plateau++;
      if(plateau>=plateauRounds)break;
    }catch(error){rounds.push({round,accepted:false,error:error.message});if(++failures>=maxFailures)break;}
  }
  return {baseline,report,candidate:best,rounds,published:false};
}
export function dominates(before,after) {
  if(!Number.isFinite(before.score)||!Number.isFinite(after.score)||after.score<=before.score)return false;
  const keys=Object.keys(before.dimensions);
  return keys.length===Object.keys(after.dimensions).length&&keys.every(k=>Object.hasOwn(after.dimensions,k)&&Number.isFinite(after.dimensions[k])&&after.dimensions[k]>=before.dimensions[k]);
}
