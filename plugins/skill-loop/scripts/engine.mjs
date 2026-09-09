import { packageSnapshot, packageContext, assessPackage } from './package.mjs';
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
  config.state=resolve(base,config.state??'.skill-loop');config.base=base;config.configFile=resolve(file);
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
async function snapshot(config, candidate) {
  const skill=typeof candidate==='object'?candidate.text:await fs.readFile(candidate?resolve(candidate):config.skill,'utf8');
  if(!skill.trim())throw Error('Skill must not be empty');
  const suite=validateSuite(await readJSON(config.suite));
  const pkg=await packageSnapshot(config,{entryText:skill});
  return {skill,suite,sourceEntryHash:hash(await fs.readFile(config.skill,'utf8')),skillHash:hash(skill),packageHash:pkg.hash,package:pkg,conditions:hash({suite,runner:config.runner,scorer:2,packageAssessment:1,packageMode:pkg.mode,packageTests:config.package?.tests??[],packageExclusions:config.package?.exclude??[]})};
}
function requestFor(snap) {
  return {requestId:randomUUID(),skill:snap.skill,package:packageContext(snap.package),cases:snap.suite.cases.map(({id,input})=>({id,input})),
    responseFormat:{requestId:'copy the requestId',outputs:[{id:'case id',output:'JSON result of following the skill on this case'}]}};
}
async function saveRun(config,snap,response,request,kind) {
  if(response.requestId!==request.requestId)throw Error('Response requestId does not match this test');
  const id=randomUUID();
  const packageAssessment=await assessPackage(config,snap.package,{execute:true});
  const fresh=await packageSnapshot(config,{entryText:snap.skill});
  if(fresh.hash!==snap.packageHash||hash(await fs.readFile(config.skill,'utf8'))!==snap.sourceEntryHash)throw Error('Package changed during evaluation or component checks; prepare and test a fresh snapshot');
  const run={id,createdAt:new Date().toISOString(),kind,runner:config.runner.label,engineVersion:'0.1.0',skillPath:config.skill,qaSource:snap.suite.source??null,coverage:snap.suite.coverage??'Only the supplied cases and checks; broader task quality is unverified',conditions:snap.conditions,skillHash:snap.skillHash,packageHash:snap.packageHash,packageAssessment,...score(snap.suite,response)};
  const baseline=await readJSON(join(config.state,'baseline.json'),null);run.comparison=compare(baseline,run);
  await atomic(join(config.state,'runs',id+'.json'),{...run,request,response,skill:snap.skill,suite:snap.suite,package:snap.package});
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
    if(now.packageHash!==pending.packageHash||now.skillHash!==pending.skillHash||now.conditions!==pending.conditions)throw Error('Inputs changed; prepare a fresh request');
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
    if(r.packageHash!==now.packageHash||r.skillHash!==now.skillHash||r.conditions!==now.conditions)throw Error('Baseline must match current skill and test conditions');
    await atomic(join(c.state,'baseline.json'),r);return {baseline:id,score:r.score};
  });
}
export async function stage(file,candidate,evidence) {
  if(typeof evidence!=='string'||!evidence.trim())throw Error('Research evidence and rationale required');
  const c=await load(file);return mutate(c,async()=>{
    const before=await snapshot(c),base=await readJSON(join(c.state,'baseline.json'),null);
    if(!base||base.packageHash!==before.packageHash||base.skillHash!==before.skillHash||base.conditions!==before.conditions)throw Error('Save a baseline for the current skill and conditions first');
    const snap=await snapshot(c,candidate),result=await execute(c,snap);
    const proposal={id:randomUUID(),createdAt:new Date().toISOString(),status:'pending',beforeHash:before.skillHash,beforePackageHash:before.packageHash,candidatePackageHash:result.packageHash,before:before.skill,candidate:snap.skill,conditions:snap.conditions,baselineId:base.id,runId:result.id,evidence,eligible:result.comparison.status==='improved'};
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
      if(now.packageHash!==p.beforePackageHash||now.skillHash!==p.beforeHash||now.conditions!==p.conditions||base?.id!==p.baselineId)throw Error('Proposal is stale; retest against the current baseline');
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
    if(!base||base.packageHash!==before.packageHash||base.skillHash!==before.skillHash||base.conditions!==before.conditions)throw Error('Save a baseline for the current skill and conditions first');
    const result=await iterate({text:before.skill,evidence:'Current skill'}, {
      evaluate:async candidate=>execute(c,await snapshot(c,candidate)),
      propose:async({candidate,report,round})=>JSON.parse(await command(c.proposerCommand,JSON.stringify({skill:candidate.text,feedback:report.checks,round,responseFormat:{text:'complete revised skill',evidence:'source and rationale'}}),{cwd:c.base,timeoutMs:c.timeoutMs})),
      apply:(_candidate,change)=>{
        if(typeof change.text!=='string'||!change.text.trim()||change.text.length>100000||typeof change.evidence!=='string'||!change.evidence.trim())throw Error('Proposal needs bounded skill text and research evidence');return change;
      },
      accept:(a,b)=>compare(a,b).status==='improved'
    },options);
    if(compare(base,result.report).status==='improved') {
      const p={id:randomUUID(),createdAt:new Date().toISOString(),status:'pending',beforeHash:before.skillHash,beforePackageHash:before.packageHash,candidatePackageHash:result.report.packageHash,before:before.skill,candidate:result.candidate.text,conditions:before.conditions,baselineId:base.id,runId:result.report.id,evidence:result.candidate.evidence,eligible:true};
      await atomic(join(c.state,'proposals',p.id+'.json'),p);result.proposalId=p.id;
    }
    await atomic(join(c.state,'last-loop.json'),result);return result;
  });
}

export async function finishApproval(c,{proposal:p,result,baseline:base},write=atomic) {
  const now=await snapshot(c),currentBase=await readJSON(join(c.state,'baseline.json'),null);
  const expected=await snapshot(c,{text:p.candidate});
  if(expected.packageHash!==result.packageHash)throw Error('Associated package files changed; retest or restore the complete package before choosing this version');
  if(![p.beforePackageHash,result.packageHash].includes(now.packageHash))throw Error('Package changed since this proposal was prepared');
  const targetBaseline=p.versionChoice&&result.conditions!==now.conditions?null:result;
  if(now.conditions!==p.conditions||![p.beforeHash,hash(p.candidate)].includes(now.skillHash)||![base?.id,targetBaseline?.id].includes(currentBase?.id))throw Error('Approval recovery conflicts with external edits');
  if(result.skillHash!==hash(p.candidate)||(!p.versionChoice&&compare(base,result).status!=='improved'))throw Error('Approval recovery evidence is invalid');
  await write(join(c.state,'backups',p.id+'.md'),p.before);
  await write(c.skill,p.candidate);
  await write(join(c.state,'baseline.json'),targetBaseline);
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
export async function versions(file) {
  const c=await load(file),now=await snapshot(c);
  const files=await fs.readdir(join(c.state,'runs')).catch(e=>{if(e.code==='ENOENT')return [];throw e;});
  const rows=await Promise.all(files.filter(x=>x.endsWith('.json')).map(x=>readJSON(join(c.state,'runs',x))));
  const unique=new Map();
  for(const r of rows.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)))unique.set(r.packageHash??r.skillHash,r);
  return {activeHash:now.skillHash,activePackageHash:now.packageHash,versions:[...unique.values()].map(r=>({version:r.packageHash??r.skillHash,entryHash:r.skillHash,runId:r.id,createdAt:r.createdAt,active:r.skillHash===now.skillHash&&r.packageHash===now.packageHash,packageHash:r.packageHash,score:r.score,passed:r.passed,total:r.total,qa:r.conditions===now.conditions?'tested under current conditions':'historical test; conditions differ'}))};
}
export async function selectVersion(file,version) {
  if(!/^[a-f0-9]{64}$/.test(version))throw Error('Use a full version hash from versions');
  const c=await load(file);return mutate(c,async()=>{
    const now=await snapshot(c),history=await versions(file);
    const exact=history.versions.find(v=>v.version===version),legacy=history.versions.filter(v=>v.entryHash===version);
    if(!exact&&legacy.length>1)throw Error('Entry hash matches multiple package versions; use the package version hash');
    const entry=exact??legacy[0];
    if(!entry)throw Error('Unknown saved version');
    const result=await readJSON(join(c.state,'runs',entry.runId+'.json'));
    if(hash(result.skill)!==result.skillHash)throw Error('Saved version content does not match its fingerprint');
    if(now.packageHash===result.packageHash)return {status:'already-active',version};
    const restored=await snapshot(c,{text:result.skill});
    if(restored.packageHash!==result.packageHash)throw Error('Associated files differ from this saved package; full-package restoration requires a separately reviewed package export');
    const base=await readJSON(join(c.state,'baseline.json'),null);
    const p={id:randomUUID(),createdAt:new Date().toISOString(),status:'pending',versionChoice:true,beforeHash:now.skillHash,beforePackageHash:now.packageHash,candidatePackageHash:result.packageHash,before:now.skill,candidate:result.skill,conditions:now.conditions,baselineId:base?.id??null,runId:result.id,eligible:false,evidence:'Explicit user version preference; this selection does not claim a QA improvement.'};
    await atomic(join(c.state,'proposals',p.id+'.json'),p);
    const transaction={proposal:p,result,baseline:base};await atomic(join(c.state,'approval-journal.json'),transaction);
    const decision=await finishApproval(c,transaction);return {...decision,version,qa:entry.qa,score:entry.score,preferenceOverride:true};
  });
}

export async function assess(file,{execute=false}={}) {const c=await load(file);return mutate(c,async()=>{const pkg=await packageSnapshot(c);const assessment=await assessPackage(c,pkg,{execute});if((await packageSnapshot(c)).hash!==pkg.hash)throw Error('Package changed during assessment; retest');await atomic(join(c.state,'package-assessment.json'),assessment);return assessment;});}
