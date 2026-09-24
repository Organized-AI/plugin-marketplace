import { packageSnapshot, packageContext, assessPackage } from './package.mjs';
import { iterate } from './shared/core.mjs';
import { applySkillPatch } from './patches.mjs';
import { triageRepair } from './triage.mjs';
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
  if(config.optimization!==undefined) {
    const o=config.optimization;
    if(!o||typeof o!=='object'||Array.isArray(o))throw Error('optimization must be an object');
    for(const key of ['trainSuite','selectionSuite','testSuite'])if(typeof o[key]!=='string'||!o[key])throw Error(`optimization.${key} path required`);
    for(const key of ['triageCommand'])if(o[key]!==undefined&&(!Array.isArray(o[key])||!o[key].length||o[key].some(x=>typeof x!=='string')))throw Error(`Invalid optimization.${key}`);
    o.trainSuite=resolve(base,o.trainSuite);o.selectionSuite=resolve(base,o.selectionSuite);o.testSuite=resolve(base,o.testSuite);
    if([o.trainSuite,o.selectionSuite,o.testSuite].some(p=>p===config.state||p.startsWith(config.state+'/')))throw Error('Optimization suites must be outside the state directory');
    if(new Set([o.trainSuite,o.selectionSuite,o.testSuite]).size!==3)throw Error('Optimization split paths must be distinct');
    o.patchMaxEdits??=4;o.patchMaxChangedChars??=8000;
    if(!Number.isInteger(o.patchMaxEdits)||o.patchMaxEdits<1||o.patchMaxEdits>4)throw Error('optimization.patchMaxEdits must be 1–4');
    if(!Number.isInteger(o.patchMaxChangedChars)||o.patchMaxChangedChars<1||o.patchMaxChangedChars>8000)throw Error('optimization.patchMaxChangedChars must be 1–8000');
    const suites=await Promise.all([o.trainSuite,o.selectionSuite,o.testSuite].map(async path=>validateSuite(await readJSON(path))));
    validateOptimizationSuites(suites);
  }
  return config;
}
export {validateSuite,score,compare} from './scoring.mjs';
import {validateSuite,score,compare} from './scoring.mjs';
async function snapshot(config, candidate,{suitePath=config.suite,conditions,split='legacy'}={}) {
  const skill=typeof candidate==='object'?candidate.text:await fs.readFile(candidate?resolve(candidate):config.skill,'utf8');
  if(!skill.trim())throw Error('Skill must not be empty');
  const suite=validateSuite(await readJSON(suitePath));
  const pkg=await packageSnapshot(config,{entryText:skill});
  return {skill,suite,suitePath,split,sourceEntryHash:hash(await fs.readFile(config.skill,'utf8')),skillHash:hash(skill),packageHash:pkg.hash,package:pkg,conditions:conditions??hash({suite,runner:config.runner,scorer:2,packageAssessment:1,packageMode:pkg.mode,packageTests:config.package?.tests??[],packageExclusions:config.package?.exclude??[]})};
}
function inputKey(input) { return hash(canonical(input)); }
function validateOptimizationSuites(suites) {
  const ids=new Set(),inputs=new Map();
  for(const [index,suite] of suites.entries())for(const row of suite.cases) {
    if(ids.has(row.id))throw Error(`Optimization case id ${row.id} appears in more than one split`);
    ids.add(row.id);const key=inputKey(row.input);
    if(inputs.has(key))throw Error(`Optimization suites reuse identical input in ${inputs.get(key)} and split ${index}`);
    inputs.set(key,index);
  }
}
async function optimizationSnapshot(config,candidate,split) {
  const o=config.optimization;if(!o)throw Error('Optimization configuration required');
  const paths={train:o.trainSuite,selection:o.selectionSuite,test:o.testSuite};
  const suites=Object.fromEntries(await Promise.all(Object.entries(paths).map(async([key,path])=>[key,validateSuite(await readJSON(path))])));
  validateOptimizationSuites(Object.values(suites));
  const conditions=hash({optimization:{train:suites.train,selection:suites.selection,test:suites.test,patchMaxEdits:o.patchMaxEdits,patchMaxChangedChars:o.patchMaxChangedChars,triageCommand:o.triageCommand??null},proposerCommand:config.proposerCommand,runner:config.runner,timeoutMs:config.timeoutMs,scorer:2,packageAssessment:1,package:config.package??{}});
  return snapshot(config,candidate,{suitePath:paths[split],conditions,split});
}
function requestFor(snap) {
  return {requestId:randomUUID(),skill:snap.skill,package:packageContext(snap.package),cases:snap.suite.cases.map(({id,input})=>({id,input})),
    responseFormat:{requestId:'copy the requestId',outputs:[{id:'case id',output:'JSON result of following the skill on this case'}]}};
}
async function saveRun(config,snap,response,request,kind) {
  if(response.requestId!==request.requestId)throw Error('Response requestId does not match this test');
  const id=randomUUID();
  const packageAssessment=await assessPackage(config,snap.package,{execute:true});
  const fresh=await packageSnapshot(config,{entryText:snap.skill}),freshSuite=validateSuite(await readJSON(snap.suitePath));
  if(fresh.hash!==snap.packageHash||hash(freshSuite)!==hash(snap.suite)||hash(await fs.readFile(config.skill,'utf8'))!==snap.sourceEntryHash)throw Error('Package, suite, or entry changed during evaluation; prepare and test a fresh snapshot');
  const run={id,createdAt:new Date().toISOString(),kind,split:snap.split,runner:config.runner.label,engineVersion:'0.1.0',skillPath:config.skill,qaSource:snap.suite.source??null,coverage:snap.suite.coverage??'Only the supplied cases and checks; broader task quality is unverified',conditions:snap.conditions,suiteHash:hash(snap.suite),skillHash:snap.skillHash,packageHash:snap.packageHash,packageAssessment,...score(snap.suite,response)};
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
    if(c.optimization)throw Error('Optimization mode requires loop so selection and final-test gates cannot be bypassed');
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
      if(p.optimization) {
        if(!p.eligible)throw Error('Optimization proposal did not pass every selection and final-test gate');
        const gates=await verifyOptimizationProposal(c,p);
        const transaction={proposal:p,result:gates.test.after,baseline:gates.test.before,gates};
        await atomic(join(c.state,'approval-journal.json'),transaction);
        return finishApproval(c,transaction);
      }
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
    if(c.optimization)return optimizationLoop(c,options);
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
    result.validationScope='training-fixtures-only';
    await atomic(join(c.state,'last-loop.json'),result);return result;
  });
}

function requiredPassed(run) { return run.passed===run.total&&!(run.packageAssessment?.tests??[]).some(t=>t.status!=='passed')&&!(run.packageAssessment?.issues??[]).length; }
function briefEdit(edit) { const out={op:edit?.op};for(const key of ['anchor','old','new','text'])if(typeof edit?.[key]==='string')out[key]=edit[key].slice(0,300);return out; }
async function readRun(c,id) { if(!/^[a-f0-9-]{36}$/.test(id??''))throw Error('Invalid gate run reference');return readJSON(join(c.state,'runs',id+'.json')); }
function canonical(value) { if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));return value; }
function testIdentity(suite) { return hash(suite.cases.map(({input,checks})=>JSON.stringify(canonical({input,checks}))).sort()); }
async function exposures(c) { return await readJSON(join(c.state,'test-exposures.json'),[]); }
async function gateEvidence(c,gates) { return hash(await Promise.all(Object.values(gates).map(id=>readRun(c,id)))); }
async function verifyOptimizationProposal(c,p,{allowCandidate=false}={}) {
  if(!p.optimization||!p.gates)throw Error('Missing optimization gate evidence');
  const current=await optimizationSnapshot(c,undefined,'train');
  if(!(allowCandidate?[p.beforeHash,hash(p.candidate)]:[p.beforeHash]).includes(current.skillHash)||current.conditions!==p.conditions)throw Error('Proposal is stale; retest against the current optimization conditions');
  const beforePackage=(await packageSnapshot(c,{entryText:p.before})).hash,candidatePackage=(await packageSnapshot(c,{entryText:p.candidate})).hash;
  if(beforePackage!==p.beforePackageHash||candidatePackage!==p.candidatePackageHash)throw Error('Optimization package evidence no longer matches current package files');
  const expected={train:[p.gates.trainBaseline,p.gates.trainCandidate],selection:[p.gates.selectionBaseline,p.gates.selectionCandidate],test:[p.gates.testBaseline,p.gates.testCandidate]};
  const runs={};
  for(const [split,ids] of Object.entries(expected)) {
    const [before,after]=await Promise.all(ids.map(id=>readRun(c,id)));
    for(const run of [before,after]) {
      if(run.split!==split||run.conditions!==p.conditions||run.suiteHash!==hash(run.suite)||hash(run.skill)!==run.skillHash||run.packageHash!==p.candidatePackageHash&&run.packageHash!==p.beforePackageHash)throw Error('Optimization gate evidence is corrupted or conditions changed');
      const rescored=score(run.suite,run.response);
      if(rescored.passed!==run.passed||rescored.total!==run.total||rescored.score!==run.score||JSON.stringify(rescored.checks)!==JSON.stringify(run.checks))throw Error('Optimization gate score evidence is corrupted');
      const active=await optimizationSnapshot(c,undefined,split);
      if(hash(active.suite)!==run.suiteHash)throw Error('Optimization split suite changed since evaluation');
    }
    if(before.skillHash!==p.beforeHash||after.skillHash!==hash(p.candidate)||before.packageHash!==p.beforePackageHash||after.packageHash!==p.candidatePackageHash)throw Error('Optimization gate hashes do not match the proposal');
    runs[split]={before,after};
  }
  if(compare(runs.selection.before,runs.selection.after).status!=='improved')throw Error('Selection gate no longer proves a strict improvement without regressions');
  if(compare(runs.test.before,runs.test.after).lostChecks.length||!requiredPassed(runs.test.after))throw Error('Final test gate has lost or failed required checks');
  const exposure=(await exposures(c)).find(row=>row.proposalId===p.id);
  const evidenceHash=await gateEvidence(c,p.gates);
  if(!exposure||exposure.conditions!==p.conditions||exposure.testSuiteHash!==runs.test.before.suiteHash||exposure.testIdentity!==testIdentity(runs.test.before.suite)||exposure.evidenceHash!==evidenceHash||p.gateEvidenceHash!==evidenceHash)throw Error('Final test exposure record is missing or invalid');
  return runs;
}
async function optimizationLoop(c,options) {
  if(!c.proposerCommand)throw Error('Configure a trusted proposerCommand for automatic revision');
  const initial=await optimizationSnapshot(c,undefined,'train');
  const testNow=await optimizationSnapshot(c,undefined,'test'),testFingerprint=testIdentity(testNow.suite);
  const testInputs=testNow.suite.cases.map(row=>inputKey(row.input));
  if((await exposures(c)).some(row=>row.testIdentity===testFingerprint||(row.testInputs??[]).some(key=>testInputs.includes(key))))throw Error('Final test suite was already exposed; configure a fresh untouched testSuite before another optimization loop');
  const trainBaseline=await execute(c,initial);
  const triage=await triageRepair(c,trainBaseline);
  if(triage.route==='stop') { const result={baseline:trainBaseline,report:trainBaseline,candidate:{text:initial.skill,evidence:'No training repair proposed'},rounds:[],published:false,triage,validationScope:'train-only; selection and final test were not run'};await atomic(join(c.state,'last-loop.json'),result);return result; }
  const rejected=[];let selectionBaseline,selectionCandidate,lastChange,currentRound=0,firstEvaluation=true;
  const remember=(reason,delta=null)=>{rejected.push({round:currentRound,reason,scoreDelta:delta,edits:(Array.isArray(lastChange?.edits)?lastChange.edits:[]).slice(0,4).map(briefEdit)});if(rejected.length>5)rejected.shift();};
  const evaluateSplit=async(candidate,split)=>{
    const snap=await optimizationSnapshot(c,candidate,split);
    if(snap.conditions!==initial.conditions||snap.sourceEntryHash!==initial.sourceEntryHash)throw Error('Optimization inputs changed during evaluation');
    const result=await execute(c,snap);
    const fresh=await optimizationSnapshot(c,candidate,split);
    if(fresh.conditions!==initial.conditions||fresh.packageHash!==snap.packageHash)throw Error('Optimization inputs changed during evaluation');
    return result;
  };
  const iteration=await iterate({text:initial.skill,evidence:'Current skill'}, {
    evaluate:async candidate=>{const result=firstEvaluation?trainBaseline:await evaluateSplit(candidate,'train');firstEvaluation=false;return {...result,candidateText:candidate.text};},
    propose:async({candidate,report,round})=>{
      currentRound=round;lastChange=null;
      const feedback=report.checks;
      const prompt={skill:candidate.text,trainingFeedback:feedback,round,rejections:rejected.slice(-5),patchLimits:{maxEdits:c.optimization.patchMaxEdits,maxChangedChars:c.optimization.patchMaxChangedChars},responseFormat:{edits:'array of patch operations: append {op,text}; insert_after {op,anchor,text}; replace {op,old,new}; delete {op,old}',evidence:'source and rationale'}};
      return JSON.parse(await command(c.proposerCommand,JSON.stringify(prompt),{cwd:c.base,timeoutMs:c.timeoutMs}));
    },
    apply:(candidate,change)=>{
      lastChange=change;
      try {
      if(!change||typeof change!=='object'||Array.isArray(change)||Object.keys(change).some(key=>!['edits','evidence'].includes(key))||!Array.isArray(change.edits)||typeof change.evidence!=='string'||!change.evidence.trim()||change.evidence.length>8000)throw Error('Automatic proposals require bounded edits and research evidence');
      const applied=applySkillPatch(candidate.text,change.edits,{maxEdits:c.optimization.patchMaxEdits,maxChangedChars:c.optimization.patchMaxChangedChars,maxSkillChars:100000});
      lastChange=change;
      return {text:applied.text,evidence:change.evidence,patchReport:applied.report};
      } catch(error) {remember(error.message);throw error;}
    },
    accept:async(a,b)=>{
      if(compare(a,b).status!=='improved') { remember('training candidate did not improve without regressions',b.score-a.score);return false; }
      selectionBaseline??=await evaluateSplit(undefined,'selection');
      const selected=await evaluateSplit({text:b.candidateText},'selection');
      const selectionBefore=selectionCandidate??selectionBaseline;
      if(compare(selectionBefore,selected).status!=='improved') { remember('selection candidate did not strictly improve without regressions',selected.score-selectionBefore.score);return false; }
      selectionCandidate=selected;return true;
    }
  },options);

  const trainCandidate=iteration.report;
  if(trainCandidate.skillHash===trainBaseline.skillHash) { const result={...iteration,triage,rejections:rejected,validationScope:selectionBaseline?'training plus selection; no candidate reached final test':'train-only; no candidate reached holdout gates'};await atomic(join(c.state,'last-loop.json'),result);return result; }
  if(!selectionBaseline||!selectionCandidate) { const result={...iteration,triage,rejections:rejected,validationScope:'training plus selection; no candidate reached holdout gates'};await atomic(join(c.state,'last-loop.json'),result);return result; }
  const id=randomUUID();
  const exposure={proposalId:id,createdAt:new Date().toISOString(),status:'reserved',conditions:initial.conditions,testSuiteHash:testNow.suiteHash??hash(testNow.suite),testIdentity:testFingerprint,testInputs};
  const history=await exposures(c);history.push(exposure);await atomic(join(c.state,'test-exposures.json'),history);
  const testBaseline=await evaluateSplit(undefined,'test');
  const testCandidate=await evaluateSplit(iteration.candidate,'test');
  const gates={trainBaseline:trainBaseline.id,trainCandidate:trainCandidate.id,selectionBaseline:selectionBaseline.id,selectionCandidate:selectionCandidate.id,testBaseline:testBaseline.id,testCandidate:testCandidate.id};
  const evidenceHash=await gateEvidence(c,gates);
  exposure.status='completed';exposure.testSuiteHash=testBaseline.suiteHash;exposure.gates=gates;exposure.evidenceHash=evidenceHash;await atomic(join(c.state,'test-exposures.json'),history);
  const eligible=!compare(testBaseline,testCandidate).lostChecks.length&&requiredPassed(testCandidate);
  const p={id,createdAt:new Date().toISOString(),status:'pending',optimization:true,beforeHash:initial.skillHash,beforePackageHash:initial.packageHash,candidatePackageHash:trainCandidate.packageHash,before:initial.skill,candidate:iteration.candidate.text,conditions:initial.conditions,baselineId:null,runId:trainCandidate.id,gates,gateEvidenceHash:evidenceHash,evidence:iteration.candidate.evidence,eligible};
  await atomic(join(c.state,'proposals',p.id+'.json'),p);
  const result={...iteration,triage,gates,rejections:rejected,proposalId:p.id,eligible,validationScope:'train, selection, and one-time final test'};await atomic(join(c.state,'last-loop.json'),result);return result;
}

export async function finishApproval(c,{proposal:p,result,baseline:base},write=atomic) {
  if(p.optimization) {
    if(!p.eligible)throw Error('Optimization proposal did not pass every selection and final-test gate');
    const gates=await verifyOptimizationProposal(c,p,{allowCandidate:true});
    result=gates.test.after;base=gates.test.before;
  }
  const now=p.optimization?await optimizationSnapshot(c,undefined,'train'):await snapshot(c),currentBase=await readJSON(join(c.state,'baseline.json'),null);
  const expected=p.optimization?await optimizationSnapshot(c,{text:p.candidate},'train'):await snapshot(c,{text:p.candidate});
  if(expected.packageHash!==result.packageHash)throw Error('Associated package files changed; retest or restore the complete package before choosing this version');
  if(![p.beforePackageHash,result.packageHash].includes(now.packageHash))throw Error('Package changed since this proposal was prepared');
  const targetBaseline=p.versionChoice&&result.conditions!==now.conditions?null:result;
  if(now.conditions!==p.conditions||![p.beforeHash,hash(p.candidate)].includes(now.skillHash)||(!p.optimization&&![base?.id,targetBaseline?.id].includes(currentBase?.id)))throw Error('Approval recovery conflicts with external edits');
  if(result.skillHash!==hash(p.candidate)||(!p.versionChoice&&!p.optimization&&compare(base,result).status!=='improved'))throw Error('Approval recovery evidence is invalid');
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
