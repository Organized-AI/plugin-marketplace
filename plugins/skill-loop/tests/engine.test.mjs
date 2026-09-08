import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as e from '../scripts/engine.mjs';
import { init } from '../scripts/cli.mjs';
import { readJSON,atomic,command } from '../scripts/shared/io.mjs';
import { iterate } from '../scripts/shared/core.mjs';
import { report } from '../scripts/report.mjs';
async function fixture(t){const dir=await fs.mkdtemp(join(tmpdir(),'skill-loop-test-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return {...await init(dir,{demo:true}),dir};}
test('real subprocess demo improves, stages, approves and reports',async t=>{
 const {config,dir}=await fixture(t);const first=await e.run(config);assert.equal(first.score,50);await e.baseline(config,first.id);
 const result=await e.loop(config);assert.equal(result.report.score,100);assert.ok(result.proposalId);assert.equal(result.published,false);
 assert.match(await fs.readFile(join(dir,'skill.md'),'utf8'),/otherwise FAIL/);
 await e.decide(config,result.proposalId,'approve');assert.match(await fs.readFile(join(dir,'skill.md'),'utf8'),/consent is denied/);
 assert.equal((await e.run(config)).comparison.status,'unchanged');const out=await report(config);assert.match(await fs.readFile(out.report,'utf8'),/Jordaaan/);
 await assert.rejects(e.decide(config,result.proposalId,'approve'),/already decided/);
});
test('checks withheld, strict imports, stale request and duplicate response blocked',async t=>{
 const {config,dir}=await fixture(t);const request=await e.prepare(config);assert.equal(request.cases[0].checks,undefined);
 await assert.rejects(e.ingest(config,{requestId:request.requestId,outputs:[]}),/exactly match/);
 const response={requestId:request.requestId,outputs:request.cases.map(c=>({id:c.id,output:{verdict:'PASS'}}))};
 await e.ingest(config,response);await assert.rejects(e.ingest(config,response));
 const next=await e.prepare(config);await fs.appendFile(join(dir,'skill.md'),'changed');await assert.rejects(e.ingest(config,{...response,requestId:next.requestId}),/Inputs changed/);
});
test('suite change makes comparison incomparable and refuses old baseline',async t=>{
 const {config,dir}=await fixture(t);const r=await e.run(config);await e.baseline(config,r.id);
 const suite=await readJSON(join(dir,'suite.json'));suite.cases[0].checks[0].value='FAIL';await atomic(join(dir,'suite.json'),suite);
 assert.equal((await e.run(config)).comparison.status,'incomparable');await assert.rejects(e.baseline(config,r.id),/current skill/);
});
test('a higher total cannot conceal loss of a previously passing check',()=>{
 const before={conditions:'a',score:50,passed:1,checks:[{passed:true},{passed:false},{passed:false}]};
 const after={conditions:'a',score:70,passed:2,checks:[{passed:false,caseId:'A',index:0},{passed:true},{passed:true}]};
 assert.equal(e.compare(before,after).status,'regression');
});
test('stale proposal refuses to overwrite an edited skill',async t=>{
 const {config,dir}=await fixture(t);await e.baseline(config,(await e.run(config)).id);const result=await e.loop(config);
 await fs.appendFile(join(dir,'skill.md'),' user edit');await assert.rejects(e.decide(config,result.proposalId,'approve'),/stale/);
 assert.match(await fs.readFile(join(dir,'skill.md'),'utf8'),/user edit/);
});
test('rejected proposal preserves skill',async t=>{
 const {config,dir}=await fixture(t);const original=await fs.readFile(join(dir,'skill.md'),'utf8');await e.baseline(config,(await e.run(config)).id);const result=await e.loop(config);
 await e.decide(config,result.proposalId,'reject');assert.equal(await fs.readFile(join(dir,'skill.md'),'utf8'),original);
});
test('strict output ids, object equality, zero checks and inherited paths',()=>{
 const s={version:1,cases:[{id:'a',input:{},checks:[{path:'',op:'equals',value:{a:1,b:2}}]}]};
 assert.equal(e.score(s,{outputs:[{id:'a',output:{b:2,a:1}}]}).passed,1);
 assert.throws(()=>e.score(s,{outputs:[{id:'a',output:1},{id:'a',output:1}]}));
 assert.throws(()=>e.validateSuite({version:1,cases:[{id:'a',input:{},checks:[]}]}));
 const p={version:1,cases:[{id:'a',input:{},checks:[{path:'/constructor',op:'exists'}]}]};assert.equal(e.score(p,{outputs:[{id:'a',output:{}}]}).passed,0);
});
test('bounded shared iteration stops on plateau and errors',async()=>{
 let calls=0;const adapter={evaluate:async x=>({score:x}),propose:async()=>{calls++;return 0;},apply:async(x)=>x,accept:()=>false};
 assert.equal((await iterate(1,adapter)).rounds.length,2);assert.equal(calls,2);
 adapter.propose=async()=>{throw Error('unavailable');};assert.equal((await iterate(1,adapter)).rounds.length,2);
 await assert.rejects(iterate(1,adapter,{maxRounds:Infinity}));
});
test('timeout, malformed JSON and subprocess failure do not save a scored run',async t=>{
 const {config}=await fixture(t);const c=await readJSON(config);c.timeoutMs=30;c.runner.command=[process.execPath,'-e','setTimeout(()=>{},10000)'];await atomic(config,c);
 await assert.rejects(e.run(config),/timed out/);assert.equal((await e.status(config)).latest,null);
 c.runner.command=[process.execPath,'-e','console.log("not-json")'];c.timeoutMs=1000;await atomic(config,c);await assert.rejects(e.run(config));assert.equal((await e.status(config)).latest,null);
 await assert.rejects(command([process.execPath,'-e','process.exit(2)']),/exit code 2/);
});
test('watch honors bounds and stops after repeated failure',async t=>{
 const {config}=await fixture(t);let count=0;await e.watch(config,{intervalSeconds:1,maxRuns:1,emit:()=>count++});assert.equal(count,1);
 await assert.rejects(e.watch(config,{maxRuns:0}));
});
test('MCP initialize, discovery, prepare and ingest via actual stdio',async t=>{
 const {config}=await fixture(t);
 const messages=[{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'test',version:'1'}}},{jsonrpc:'2.0',method:'notifications/initialized'},{jsonrpc:'2.0',id:2,method:'tools/list'},{jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'skill_loop_prepare',arguments:{config}}}];
 const result=spawnSync(process.execPath,[new URL('../scripts/mcp.mjs',import.meta.url).pathname],{input:messages.map(x=>JSON.stringify(x)).join('\n')+'\n',encoding:'utf8'});
 assert.equal(result.status,0);const rows=result.stdout.trim().split('\n').map(JSON.parse);assert.equal(rows.length,3);assert.equal(rows[0].result.protocolVersion,'2024-11-05');assert.ok(rows[1].result.tools.some(t=>t.name==='skill_loop_stage'));assert.ok(JSON.parse(rows[2].result.content[0].text).requestId);
});
test('shared command honors credential-filtered environment',async()=>{
 process.env.SKILL_LOOP_TEST_SECRET='not-a-real-secret';
 try{assert.equal(await command([process.execPath,'-e','process.stdout.write(process.env.SKILL_LOOP_TEST_SECRET ?? "filtered")'],'',{env:{}}),'filtered');}
 finally{delete process.env.SKILL_LOOP_TEST_SECRET;}
});
test('interrupted approval recovers on repeated explicit approval',async t=>{
 const {config,dir}=await fixture(t);await e.baseline(config,(await e.run(config)).id);const result=await e.loop(config);const c=await e.load(config);
 const proposal=await readJSON(join(c.state,'proposals',result.proposalId+'.json'));const transaction={proposal,result:await readJSON(join(c.state,'runs',proposal.runId+'.json')),baseline:await readJSON(join(c.state,'baseline.json'))};
 await atomic(join(c.state,'approval-journal.json'),transaction);let writes=0;
 await assert.rejects(e.finishApproval(c,transaction,async(path,data)=>{if(++writes===3)throw Error('simulated disk interruption');return atomic(path,data);}),/simulated/);
 assert.match(await fs.readFile(join(dir,'skill.md'),'utf8'),/consent is denied/);
 await e.decide(config,proposal.id,'approve');assert.equal((await e.status(config)).baseline.id,transaction.result.id);assert.equal((await e.status(config)).interruptedApproval,null);
});
test('declarative policy runs without a model and saved outputs replay exactly',async t=>{
 const dir=await fs.mkdtemp(join(tmpdir(),'skill-loop-rules-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const {config}=await init(dir,{rules:true});
 const r=await e.run(config);assert.equal(r.score,50);assert.equal((await e.replay(config,r.id)).matchesRecorded,true);assert.equal((await e.replay(config,r.id)).newModelRun,false);
 await e.baseline(config,r.id);const policy=await readJSON(join(dir,'skill.json'));policy.rules.push({when:[{path:'/consent',op:'equals',value:'denied'},{path:'/events',op:'equals',value:0}],output:{verdict:'PASS'}});
 await atomic(join(dir,'candidate.json'),policy);const p=await e.stage(config,join(dir,'candidate.json'),'Written consent rule: denied means zero events');assert.equal(p.eligible,true);assert.equal(p.comparison.status,'improved');
});
test('inventory distinguishes discovery from effectiveness and registry verifies skill identity',async t=>{
 const {inventory,checkAll}=await import('../scripts/inventory.mjs');const {dir,config}=await fixture(t);const root=join(dir,'skills');await fs.mkdir(join(root,'one'),{recursive:true});await fs.writeFile(join(root,'one','SKILL.md'),'---\nname: one\ndescription: test\n---\nRun test');
 const list=await inventory([root]);assert.equal(list.skills.length,1);assert.equal(list.skills[0].effectiveness,'untested');
 const registry=join(dir,'registry.json');await atomic(registry,{version:1,entries:[{skill:'skill.md',config},{skill:'skills/one/SKILL.md'},{skill:'skills/one/SKILL.md',config}]});
 const results=await checkAll(registry);assert.equal(results.summary.untested,1);assert.equal(results.summary.errors,1);assert.equal(results.results[0].status,'no-baseline');
});
test('user can select a saved version without presenting it as a QA improvement',async t=>{
 const {config}=await fixture(t);const old=await e.run(config);await e.baseline(config,old.id);const improved=await e.loop(config);await e.decide(config,improved.proposalId,'approve');
 assert.notEqual((await e.versions(config)).activeHash,old.skillHash);const selected=await e.selectVersion(config,old.skillHash);assert.equal(selected.preferenceOverride,true);assert.equal(selected.score,50);assert.equal((await e.versions(config)).activeHash,old.skillHash);
 await assert.rejects(e.selectVersion(config,'a'.repeat(64)),/Unknown/);
});
