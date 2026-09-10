// Shared deterministic scoring for local and connected QA. No I/O or model calls.
export function validateSuite(suite) {
  if(suite.version!==1||!Array.isArray(suite.cases)||!suite.cases.length)throw Error('Suite requires version 1 and nonempty cases');
  const ids=new Set();
  for(const c of suite.cases) {
    if(typeof c.id!=='string'||!c.id||ids.has(c.id)||!Object.hasOwn(c,'input'))throw Error('Cases require unique ids and input');ids.add(c.id);
    if(!Array.isArray(c.checks)||!c.checks.length)throw Error('Every case needs checks');
    for(const check of c.checks) {
      if(typeof check.path!=='string'||(check.path!==''&&!check.path.startsWith('/'))||!['equals','contains','notContains','exists'].includes(check.op))throw Error('Invalid check path or operation');
      if(check.op!=='exists'&&!Object.hasOwn(check,'value'))throw Error('Check value required');
    }
  }
  return suite;
}
function pointer(value,path) {
  for(const part of path===''?[]:path.slice(1).split('/').map(p=>p.replaceAll('~1','/').replaceAll('~0','~'))) {
    if(value===null||typeof value!=='object'||!Object.hasOwn(value,part))return undefined;
    value=value[part];
  }
  return value;
}
function equal(a,b) {
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]));
}
export function score(suite, response) {
  validateSuite(suite);
  if(!Array.isArray(response.outputs))throw Error('Response must contain outputs array');
  const outputs=new Map();
  for(const row of response.outputs) {
    if(typeof row.id!=='string'||outputs.has(row.id)||!Object.hasOwn(row,'output'))throw Error('Output ids must be unique and include output');
    outputs.set(row.id,row.output);
  }
  if(outputs.size!==suite.cases.length||suite.cases.some(c=>!outputs.has(c.id)))throw Error('Response case ids must exactly match the suite');
  const checks=suite.cases.flatMap(c=>c.checks.map((check,index)=>{
    const actual=pointer(outputs.get(c.id),check.path);
    const validContainer=(typeof actual==='string'&&typeof check.value==='string')||Array.isArray(actual);
    const contains=typeof actual==='string'&&typeof check.value==='string'?actual.includes(check.value):Array.isArray(actual)&&actual.some(v=>equal(v,check.value));
    const passed=check.op==='notContains'?validContainer&&!contains:check.op==='exists'?actual!==undefined:check.op==='equals'?equal(actual,check.value):
      contains;
    return {caseId:c.id,index,path:check.path,op:check.op,expected:check.value,actual:actual??null,passed:!!passed};
  }));
  const passed=checks.filter(c=>c.passed).length;
  return {passed,total:checks.length,score:100*passed/checks.length,checks};
}
export function compare(baseline,run) {
  if(!baseline)return {status:'no-baseline',lostChecks:[],drift:{kind:'effectiveness',detected:null,reason:'Save a baseline first'}};
  if(baseline.conditions!==run.conditions)return {status:'incomparable',lostChecks:[],drift:{kind:'conditions',detected:true,reason:'Test suite, scorer or runner settings changed; effectiveness cannot be compared'}};
  const componentTests=run.packageAssessment?.tests??[],previousTests=baseline.packageAssessment?.tests??[];
  const lostComponents=previousTests.filter(t=>t.status==='passed'&&componentTests.find(x=>x.id===t.id)?.status!=='passed').map(t=>'component:'+t.id);
  const componentsBlocked=componentTests.some(t=>t.status!=='passed')||(run.packageAssessment?.issues?.length??0)>0;
  const componentsImproved=componentTests.some(t=>t.status==='passed'&&previousTests.find(x=>x.id===t.id)?.status!=='passed');
  const lostChecks=run.checks.filter((c,i)=>baseline.checks[i]?.passed&&!c.passed).map(c=>`${c.caseId}:${c.index}`).concat(lostComponents);
  return {status:lostChecks.length?'regression':componentsBlocked?'needs-component-verification':run.passed>baseline.passed||componentsImproved?'improved':'unchanged',delta:run.score-baseline.score,lostChecks,drift:{kind:'effectiveness',detected:lostChecks.length>0,reason:lostChecks.length?'Previously passing checks now fail':'No previously passing check was lost'}};
}
