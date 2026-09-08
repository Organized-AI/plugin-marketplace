import { iterate } from './shared/core.mjs';
import { promises as fs } from 'node:fs';
import { resolve, dirname, join, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import { atomic, readJSON, hash, command, locked } from './shared/io.mjs';

export async function load(file) {
  const config=await readJSON(file),base=dirname(resolve(file));
  if(config.version!==1)throw Error('Config version must be 1');
  for(const key of ['skill','suite'])if(typeof config[key]!=='string'||!config[key])throw Error(`${key} path required`);
  if(typeof config.runner?.label!=='string'||!config.runner.label.trim())throw Error('runner.label required');
  config.skill=resolve(base,config.skill);config.suite=resolve(base,config.suite);
  config.state=resolve(base,config.state??'.skill-loop');config.base=base;
  if([config.skill,config.suite].some(p=>p===config.state||p.startsWith(config.state+'/')))throw Error('Inputs must be outside the state directory');
  config.timeoutMs??=120000;
  if(!Number.isInteger(config.timeoutMs)||config.timeoutMs<1||config.timeoutMs>600000)throw Error('timeoutMs must be between 1 and 600000');
  if(config.runner.command && (!Array.isArray(config.runner.command)||!config.runner.command.length||config.runner.command.some(x=>typeof x!=='string')))throw Error('Invalid runner command');
  return config;
}
export function validateSuite(suite) {
  if(suite.version!==1||!Array.isArray(suite.cases)||!suite.cases.length)throw Error('Suite requires version 1 and nonempty cases');
  const ids=new Set();
  for(const c of suite.cases) {
    if(typeof c.id!=='string'||!c.id||ids.has(c.id)||!Object.hasOwn(c,'input'))throw Error('Cases require unique ids and input');ids.add(c.id);
    if(!Array.isArray(c.checks)||!c.checks.length)throw Error('Every case needs checks');
    for(const check of c.checks) {
      if(typeof check.path!=='string'||(check.path!==''&&!check.path.startsWith('/'))||!['equals','contains','exists'].includes(check.op))throw Error('Invalid check path or operation');
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
    const passed=check.op==='exists'?actual!==undefined:check.op==='equals'?equal(actual,check.value):
      typeof actual==='string'&&typeof check.value==='string'?actual.includes(check.value):Array.isArray(actual)&&actual.some(v=>equal(v,check.value));
    return {caseId:c.id,index,path:check.path,op:check.op,expected:check.value,actual:actual??null,passed:!!passed};
  }));
  const passed=checks.filter(c=>c.passed).length;
  return {passed,total:checks.length,score:100*passed/checks.length,checks};
}
export function compare(baseline,run) {
  if(!baseline)return {status:'no-baseline',lostChecks:[],drift:{kind:'effectiveness',detected:null,reason:'Save a baseline first'}};
  if(baseline.conditions!==run.conditions)return {status:'incomparable',lostChecks:[],drift:{kind:'conditions',detected:true,reason:'Test suite, scorer or runner settings changed; effectiveness cannot be compared'}};
  const lostChecks=run.checks.filter((c,i)=>baseline.checks[i]?.passed&&!c.passed).map(c=>`${c.caseId}:${c.index}`);
  return {status:lostChecks.length?'regression':run.passed>baseline.passed?'improved':'unchanged',delta:run.score-baseline.score,lostChecks,drift:{kind:'effectiveness',detected:lostChecks.length>0,reason:lostChecks.length?'Previously passing checks now fail':'No previously passing check was lost'}};
}
async function snapshot(config, candidate) {
  const skill=await fs.readFile(candidate?resolve(candidate):config.skill,'utf8');
  if(!skill.trim())throw Error('Skill must not be empty');
  const suite=validateSuite(await readJSON(config.suite));
  return {skill,suite,skillHash:hash(skill),conditions:hash({suite,runner:config.runner,scorer:1})};
}
function requestFor(snap) {
  return {requestId:randomUUID(),skill:snap.skill,cases:snap.suite.cases.map(({id,input})=>({id,input})),
    responseFormat:{requestId:'copy the requestId',outputs:[{id:'case id',output:'JSON result of following the skill on this case'}]}};
}
async function saveRun(config,snap,response,request,kind) {
  if(response.requestId!==request.requestId)throw Error('Response requestId does not match this test');
  const id=randomUUID();
  const run={id,createdAt:new Date().toISOString(),kind,runner:config.runner.label,engineVersion:'0.1.0',skillPath:config.skill,qaSource:snap.suite.source??null,coverage:snap.suite.coverage??'Only the supplied cases and checks; broader task quality is unverified',conditions:snap.conditions,skillHash:snap.skillHash,...score(snap.suite,response)};
  const baseline=await readJSON(join(config.state,'baseline.json'),null);run.comparison=compare(baseline,run);
  await atomic(join(config.state,'runs',id+'.json'),{...run,request,response,skill:snap.skill,suite:snap.suite});
  await atomic(join(config.state,'latest.json'),run);
  return run;
}
export async function prepare(file) {
  const c=await load(file);return mutate(c,async()=>{
    const snap=await snapshot(c),request=requestFor(snap);
    await atomic(join(c.state,'pending',request.requestId+'.json'),{...snap,request});
    return request;
  });
}
export async function ingest(file,response) {
  const c=await load(file);return mutate(c,async()=>{
    if(!/^[a-f0-9-]{36}$/.test(response.requestId??''))throw Error('Invalid request id');
    const path=join(c.state,'pending',response.requestId+'.json');const pending=await readJSON(path),now=await snapshot(c);
    if(now.skillHash!==pending.skillHash||now.conditions!==pending.conditions)throw Error('Inputs changed; prepare a fresh request');
    const run=await saveRun(c,pending,response,pending.request,'imported-agent');await fs.unlink(path);return run;
  });
}
async function execute(c,snap) {
  if(!c.runner.command)throw Error('No runner command: use prepare and ingest with your assistant, or configure a trusted runner');
  const request=requestFor(snap);const output=await command(c.runner.command,JSON.stringify(request),{cwd:c.base,timeoutMs:c.timeoutMs});
  let response=JSON.parse(output);if(typeof response.result==='string')response=JSON.parse(response.result);
  return saveRun(c,snap,response,request,'command');
}
export async function run(file) {const c=await load(file);return mutate(c,async()=>execute(c,await snapshot(c)));}
export async function baseline(file,id) {
  const c=await load(file);return mutate(c,async()=>{
    if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid run id');
    const r=await readJSON(join(c.state,'runs',id+'.json')),now=await snapshot(c);
    if(r.skillHash!==now.skillHash||r.conditions!==now.conditions)throw Error('Baseline must match current skill and test conditions');
    await atomic(join(c.state,'baseline.json'),r);return {baseline:id,score:r.score};
  });
}
export async function stage(file,candidate,evidence) {
  if(typeof evidence!=='string'||!evidence.trim())throw Error('Research evidence and rationale required');
  const c=await load(file);return mutate(c,async()=>{
    const before=await snapshot(c),base=await readJSON(join(c.state,'baseline.json'),null);
    if(!base||base.skillHash!==before.skillHash||base.conditions!==before.conditions)throw Error('Save a baseline for the current skill and conditions first');
    const snap=await snapshot(c,candidate),result=await execute(c,snap);
    const proposal={id:randomUUID(),createdAt:new Date().toISOString(),status:'pending',beforeHash:before.skillHash,before:before.skill,candidate:snap.skill,conditions:snap.conditions,baselineId:base.id,runId:result.id,evidence,eligible:result.comparison.status==='improved'};
    await atomic(join(c.state,'proposals',proposal.id+'.json'),proposal);return {...proposal,comparison:result.comparison};
  });
}
export async function decide(file,id,action) {
  if(!['approve','reject'].includes(action)||!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid proposal decision');
  const c=await load(file);return locked(c.state,async()=>{
    const path=join(c.state,'proposals',id+'.json'),p=await readJSON(path);
    const journal=await readJSON(join(c.state,'approval-journal.json'),null);
    if(journal) {
      if(action!=='approve'||journal.proposal.id!==id)throw Error('Recover the interrupted approval first');
      return finishApproval(c,journal);
    }
    if(p.status!=='pending')throw Error('Proposal already decided');
    if(action==='approve') {
      const now=await snapshot(c),base=await readJSON(join(c.state,'baseline.json'),null),result=await readJSON(join(c.state,'runs',p.runId+'.json'));
      if(now.skillHash!==p.beforeHash||now.conditions!==p.conditions||base?.id!==p.baselineId)throw Error('Proposal is stale; retest against the current baseline');
      if(result.skillHash!==hash(p.candidate)||compare(base,result).status!=='improved')throw Error('Candidate must improve without losing a previously passing check');
      const transaction={proposal:p,result,baseline:base};
      await atomic(join(c.state,'approval-journal.json'),transaction);
      return finishApproval(c,transaction);
    }
    p.status=action==='approve'?'approved':'rejected';p.decidedAt=new Date().toISOString();await atomic(path,p);return {id,status:p.status};
  });
}
export async function status(file) {
  const c=await load(file);
  return {runner:c.runner.label,automatic:!!c.runner.command,state:c.state,interruptedApproval:await readJSON(join(c.state,'approval-journal.json'),null),latest:await readJSON(join(c.state,'latest.json'),null),baseline:await readJSON(join(c.state,'baseline.json'),null)};
}
export async function watch(file,{intervalSeconds=60,maxRuns=10,emit=()=>{},signal}={}) {
  if(!Number.isInteger(intervalSeconds)||intervalSeconds<1||!Number.isInteger(maxRuns)||maxRuns<1||maxRuns>1000)throw Error('Use interval >= 1 and maxRuns 1–1000');
  let errors=0;
  for(let i=0;i<maxRuns&&!signal?.aborted;i++) {
    try {const r=await run(file);emit(r);errors=0;}catch(e){emit({error:e.message});if(++errors>=3)throw Error('Stopped after three consecutive failures');}
    if(i+1<maxRuns&&!signal?.aborted)await new Promise(resolve=>{
      const stop=()=>{clearTimeout(timer);signal?.removeEventListener('abort',stop);resolve();};
      const timer=setTimeout(stop,intervalSeconds*1000);signal?.addEventListener('abort',stop,{once:true});
    });
  }
}
export async function loop(file,options={}) {
  const c=await load(file);return mutate(c,async()=>{
    if(!c.proposerCommand)throw Error('Configure a trusted proposerCommand for automatic revision; stage accepts a manually researched candidate');
    const before=await snapshot(c),base=await readJSON(join(c.state,'baseline.json'),null);
    if(!base||base.skillHash!==before.skillHash||base.conditions!==before.conditions)throw Error('Save a baseline for the current skill and conditions first');
    const result=await iterate({text:before.skill,evidence:'Current skill'}, {
      evaluate:async candidate=>execute(c,{...before,skill:candidate.text,skillHash:hash(candidate.text)}),
      propose:async({candidate,report,round})=>JSON.parse(await command(c.proposerCommand,JSON.stringify({skill:candidate.text,feedback:report.checks,round,responseFormat:{text:'complete revised skill',evidence:'source and rationale'}}),{cwd:c.base,timeoutMs:c.timeoutMs})),
      apply:(_candidate,change)=>{
        if(typeof change.text!=='string'||!change.text.trim()||change.text.length>100000||typeof change.evidence!=='string'||!change.evidence.trim())throw Error('Proposal needs bounded skill text and research evidence');return change;
      },
      accept:(a,b)=>compare(a,b).status==='improved'
    },options);
    if(compare(base,result.report).status==='improved') {
      const p={id:randomUUID(),createdAt:new Date().toISOString(),status:'pending',beforeHash:before.skillHash,before:before.skill,candidate:result.candidate.text,conditions:before.conditions,baselineId:base.id,runId:result.report.id,evidence:result.candidate.evidence,eligible:true};
      await atomic(join(c.state,'proposals',p.id+'.json'),p);result.proposalId=p.id;
    }
    await atomic(join(c.state,'last-loop.json'),result);return result;
  });
}

export async function finishApproval(c,{proposal:p,result,baseline:base},write=atomic) {
  const now=await snapshot(c),currentBase=await readJSON(join(c.state,'baseline.json'),null);
  if(now.conditions!==p.conditions||![p.beforeHash,hash(p.candidate)].includes(now.skillHash)||![base.id,result.id].includes(currentBase?.id))throw Error('Approval recovery conflicts with external edits');
  if(result.skillHash!==hash(p.candidate)||compare(base,result).status!=='improved')throw Error('Approval recovery evidence is invalid');
  await write(join(c.state,'backups',p.id+'.md'),p.before);
  await write(c.skill,p.candidate);
  await write(join(c.state,'baseline.json'),result);
  p.status='approved';p.decidedAt=new Date().toISOString();
  await write(join(c.state,'proposals',p.id+'.json'),p);
  await fs.rm(join(c.state,'approval-journal.json'),{force:true});
  return {id:p.id,status:p.status};
}

async function mutate(c,fn) {
  return locked(c.state,async()=>{
    if(await readJSON(join(c.state,'approval-journal.json'),null))throw Error('An approval was interrupted; repeat approve for that proposal before making other changes');
    return fn();
  });
}

export async function replay(file,id) {
  if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid run id');
  const c=await load(file),r=await readJSON(join(c.state,'runs',id+'.json'));
  if(!r.suite)throw Error('This older run did not store its suite; make a new run first');
  const result=score(r.suite,r.response);
  return {sourceRun:id,kind:'historical-replay',newModelRun:false,...result,matchesRecorded:JSON.stringify(result.checks)===JSON.stringify(r.checks)};
}
