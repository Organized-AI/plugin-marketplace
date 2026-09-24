import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,dirname } from 'node:path';
import * as engine from '../scripts/engine.mjs';

async function fixture(t,{duplicate=false,failSelection=false,failTest=false,retry=false,secrets=false}={}) {
  const dir=await fs.mkdtemp(join(tmpdir(),'skill-loop-opt-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  await fs.writeFile(join(dir,'skill.md'),'bad skill');
  const suite=(id,input)=>({version:1,cases:[{id,input,checks:[{path:'/value',op:'equals',value:'yes'}]}]});
  const train={case:secrets?'train-secret':'train'},selection={case:duplicate?train.case:secrets?'selection-secret':'selection'},test={case:secrets?'test-secret':'test'};
  await Promise.all([fs.writeFile(join(dir,'train.json'),JSON.stringify(suite('train',train))),fs.writeFile(join(dir,'selection.json'),JSON.stringify(suite('selection',selection))),fs.writeFile(join(dir,'test.json'),JSON.stringify(suite('test',test)))]);
  await fs.writeFile(join(dir,'runner.mjs'),`let s='';for await(const c of process.stdin)s+=c;const r=JSON.parse(s);process.stdout.write(JSON.stringify({requestId:r.requestId,outputs:r.cases.map(c=>{let value=r.skill.includes('fixed')?'yes':'no';if(c.input.case==='selection'&&${failSelection})value='no';if(c.input.case==='test'&&${failTest})value='no';return{id:c.id,output:{value}}})}));`);
  const proposal=retry?`import{appendFileSync,existsSync}from'node:fs';let s='';for await(const c of process.stdin)s+=c;appendFileSync('.state/prompts.jsonl',s+'\\n');const n=existsSync('.state/count')?1:0;appendFileSync('.state/count','x');process.stdout.write(JSON.stringify({edits:[n?{op:'replace',old:'bad',new:'fixed'}:{op:'replace',old:'bad',new:'bad '}],evidence:'fixture'}));`:`import{writeFileSync}from'node:fs';let s='';for await(const c of process.stdin)s+=c;writeFileSync('.state/seen.json',s);process.stdout.write(JSON.stringify({edits:[{op:'replace',old:'bad',new:'fixed'}],evidence:'deterministic fixture'}));`;
  await fs.writeFile(join(dir,'proposer.mjs'),proposal);
  const config={version:1,skill:'skill.md',suite:'train.json',state:'.state',runner:{label:'fixture',command:[process.execPath,'runner.mjs']},proposerCommand:[process.execPath,'proposer.mjs'],optimization:{trainSuite:'train.json',selectionSuite:'selection.json',testSuite:'test.json'}};
  const path=join(dir,'skill-loop.json');await fs.writeFile(path,JSON.stringify(config));return {dir,path};
}
test('optimization gates train, selection, one-time final test, and approval evidence',async t=>{
  const {dir,path}=await fixture(t);const result=await engine.loop(path,{maxRounds:1});
  assert.equal(result.eligible,true);assert.ok(result.gates.testBaseline);assert.equal(result.validationScope,'train, selection, and one-time final test');
  await assert.rejects(engine.loop(path,{maxRounds:1}),/already exposed/);
  await engine.decide(path,result.proposalId,'approve');assert.equal(await fs.readFile(join(dir,'skill.md'),'utf8'),'fixed skill');
});
test('optimization rejects split ids and semantically identical split inputs',async t=>{
  const {path}=await fixture(t,{duplicate:true});await assert.rejects(engine.load(path),/reuse identical input/);
});
test('selection failure never exposes the final suite',async t=>{
 const {dir,path}=await fixture(t,{failSelection:true});const result=await engine.loop(path,{maxRounds:1});assert.equal(result.proposalId,undefined);await assert.rejects(fs.access(join(dir,'.state','test-exposures.json')));
});
test('failed final test is ineligible and persisted evidence tampering blocks approval',async t=>{
 const {dir,path}=await fixture(t,{failTest:true});const result=await engine.loop(path,{maxRounds:1});assert.equal(result.eligible,false);await assert.rejects(engine.decide(path,result.proposalId,'approve'),/did not pass/);
 const clean=await fixture(t);const accepted=await engine.loop(clean.path,{maxRounds:1});const exposure=JSON.parse(await fs.readFile(join(clean.dir,'.state','runs',accepted.gates.testCandidate+'.json')));exposure.passed=99;await fs.writeFile(join(clean.dir,'.state','runs',accepted.gates.testCandidate+'.json'),JSON.stringify(exposure));await assert.rejects(engine.decide(clean.path,accepted.proposalId,'approve'),/score evidence/);
});
test('holdout content identity survives id-only renames and proposer receives training only',async t=>{
 const {dir,path}=await fixture(t,{secrets:true});const result=await engine.loop(path,{maxRounds:1});const prompt=await fs.readFile(join(dir,'.state','seen.json'),'utf8');assert.match(prompt,/trainingFeedback/);assert.doesNotMatch(prompt,/selection-secret|test-secret/);
 const cfg=JSON.parse(await fs.readFile(path));const final=JSON.parse(await fs.readFile(join(dir,'test.json')));final.cases[0].id='renamed-test';await fs.writeFile(join(dir,'test.json'),JSON.stringify(final));await assert.rejects(engine.loop(path,{maxRounds:1}),/already exposed/);
 await engine.decide(path,result.proposalId,'reject');
});
test('automatic rejection feedback carries the previous bounded patch and manual stage refuses split mode',async t=>{
 const {dir,path}=await fixture(t,{retry:true});const result=await engine.loop(path,{maxRounds:2});assert.equal(result.eligible,true);const prompts=(await fs.readFile(join(dir,'.state','prompts.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);assert.equal(prompts.length,2);assert.equal(prompts[1].rejections[0].edits[0].op,'replace');await assert.rejects(engine.stage(path,join(dir,'skill.md'),'manual'),/Optimization mode requires loop/);
});
test('changing any holdout suite makes a pending optimization proposal stale',async t=>{
 const {dir,path}=await fixture(t);const result=await engine.loop(path,{maxRounds:1});const selection=JSON.parse(await fs.readFile(join(dir,'selection.json')));selection.cases[0].checks[0].value='changed';await fs.writeFile(join(dir,'selection.json'),JSON.stringify(selection));await assert.rejects(engine.decide(path,result.proposalId,'approve'),/stale|suite|conditions/i);
});
test('interrupted optimization approval re-verifies gates and recovers after skill replacement',async t=>{
 const {dir,path}=await fixture(t);const result=await engine.loop(path,{maxRounds:1}),c=await engine.load(path);
 const proposal=JSON.parse(await fs.readFile(join(c.state,'proposals',result.proposalId+'.json')));
 const transaction={proposal,result:JSON.parse(await fs.readFile(join(c.state,'runs',proposal.gates.testCandidate+'.json'))),baseline:JSON.parse(await fs.readFile(join(c.state,'runs',proposal.gates.testBaseline+'.json')))};let writes=0;
 await fs.writeFile(join(c.state,'approval-journal.json'),JSON.stringify(transaction));
 await assert.rejects(engine.finishApproval(c,transaction,async(file,data)=>{if(++writes===3)throw Error('interrupted');await fs.mkdir(dirname(file),{recursive:true});await fs.writeFile(file,typeof data==='string'?data:JSON.stringify(data));}),/interrupted/);
 assert.equal(await fs.readFile(join(dir,'skill.md'),'utf8'),'fixed skill');await engine.decide(path,result.proposalId,'approve');assert.equal((await fs.readFile(join(c.state,'baseline.json'),'utf8')).includes(proposal.gates.testCandidate),true);
});
