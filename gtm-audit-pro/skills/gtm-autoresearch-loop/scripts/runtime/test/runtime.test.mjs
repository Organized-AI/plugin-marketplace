import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { audit, container, fingerprint, applyOperations, optimize } from '../audit.mjs';
import { capture, watch, runSnapshot, readJSON, acquireLock, loadConfig, command } from '../runner.mjs';

const seed=()=>({accountId:'1',containerId:'2',tag:[{tagId:'1',name:'Tag 1',type:'gaawe',firingTriggerId:['2147479553']}],trigger:[],variable:[],folder:[],builtInVariable:[]});
async function temp(t){const dir=await fs.mkdtemp(join(tmpdir(),'gtm-test-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}
test('reject partial exports; valid empty inventories are allowed',()=>{
 assert.throws(()=>container({tag:[]}),/Missing complete/);
 assert.equal(audit({...seed(),tag:[]}).findings.length,0);
});
test('built-in triggers are accepted; actual missing references are critical',()=>{
 const s=seed();assert.equal(audit(s).criticalCount,0);
 s.tag[0].firingTriggerId=['404'];s.tag[0].parameter=[{value:'{{Missing}}'}];
 assert.equal(audit(s).criticalCount,2);
});
test('GA4 event tags are not mislabeled Universal Analytics',()=>{
 assert.equal(audit(seed()).findings.some(f=>f.dimension==='legacy'),false);
 const s=seed();s.tag[0].type='ua';assert.equal(audit(s).findings.some(f=>f.dimension==='legacy'),true);
});
test('sequenced tags are not flagged as missing firing triggers',()=>{
 const s=seed();s.tag[0].setupTag=[{tagName:'Setup'}];s.tag.push({tagId:'2',name:'Setup',type:'html'});
 assert.equal(audit(s).findings.some(f=>f.id==='2'&&f.message.startsWith('No firing')),false);
});
test('sequence IDs are supported and built-in variables cannot be shadowed',()=>{
 const s=seed();s.tag[0].setupTag=[{tagName:'2'}];s.tag.push({tagId:'2',name:'Setup',type:'html'});
 assert.equal(audit(s).findings.some(f=>f.id==='2'&&f.message.startsWith('No firing')),false);
 assert.throws(()=>applyOperations(s,[{op:'rename',kind:'tag',id:'2',name:'New'}]),/sequenced/);
 s.builtInVariable=[{name:'Page URL',type:'PAGE_URL'}];s.variable=[{variableId:'1',name:'Unused',type:'c'}];
 assert.throws(()=>applyOperations(s,[{op:'rename',kind:'variable',id:'1',name:'Page URL'}]),/Built-in/);
});
test('fingerprints ignore entity order but detect semantic edits',()=>{
 const s=seed();s.folder=[{folderId:'1',name:'One'},{folderId:'2',name:'Two'}];const x=structuredClone(s);x.folder.reverse();
 assert.equal(fingerprint(s),fingerprint(x));x.tag[0].name='Changed';assert.notEqual(fingerprint(s),fingerprint(x));
});
test('mutations cannot remove tags, alter parameters or rename referenced variables',()=>{
 const s=seed();s.variable=[{variableId:'1',name:'Event',type:'c'}];s.tag[0].parameter=[{value:'{{Event}}'}];
 assert.throws(()=>applyOperations(s,[{op:'delete',kind:'tag',id:'1'}]),/Unsupported/);
 assert.throws(()=>applyOperations(s,[{op:'rename',kind:'variable',id:'1',name:'Other'}]),/referenced/);
 assert.throws(()=>applyOperations(s,[{op:'rename',kind:'__proto__',id:'1',name:'Other'}]),/Invalid/);
 assert.equal(s.tag[0].name,'Tag 1');
});
test('loop keeps improvement, rejects regression, bounds plateau',async()=>{
 const s=seed();let calls=0;
 const result=await optimize(s,async()=>++calls===1?[{op:'rename',kind:'tag',id:'1',name:'GA4 event'}]:[{op:'rename',kind:'tag',id:'1',name:'Tag 1'}]);
 assert.equal(result.candidate.tag[0].name,'GA4 event');assert.equal(calls,3);assert.equal(result.published,false);assert.equal(s.tag[0].name,'Tag 1');
});
test('adding empty folders cannot game score',async()=>{
 const result=await optimize(seed(),async()=>[{op:'addFolder',id:'99',name:'Analytics'}]);
 assert.equal(result.candidate.folder.length,0);
});
test('malformed mutation responses hit failure limit',async()=>{
 let calls=0;const result=await optimize(seed(),async()=>{calls++;return {bad:true};});
 assert.equal(calls,2);assert.equal(result.candidate.tag[0].name,'Tag 1');
});
test('GTM source paginates, only uses GET, never logs bearer token',async()=>{
 const urls=[];process.env.GTM_TEST_TOKEN='secret';
 const config={source:{type:'gtm',accountId:'1',containerId:'2',workspaceId:'3',tokenEnv:'GTM_TEST_TOKEN'}};
 const snap=await capture(config,{wait:async()=>{},fetchImpl:async(url,opts)=>{
  urls.push(String(url));assert.equal(opts.method,'GET');assert.equal(opts.headers.Authorization,'Bearer secret');
  const endpoint=url.pathname.split('/').at(-1);
  const key={tags:'tag',triggers:'trigger',variables:'variable',folders:'folder',built_in_variables:'builtInVariable',templates:'customTemplate'}[endpoint];
  return {ok:true,json:async()=>endpoint==='tags'&&!url.search?{tag:seed().tag,nextPageToken:'next'}:{[key]:[]}};
 }});
 delete process.env.GTM_TEST_TOKEN;assert.equal(snap.tag.length,1);assert.equal(urls.length,7);assert.match(urls[1],/pageToken=next/);
});
test('GTM failures are errors, not clean empty snapshots',async()=>{
 process.env.GTM_TEST_TOKEN='secret';
 await assert.rejects(capture({source:{type:'gtm',accountId:'1',containerId:'2',tokenEnv:'GTM_TEST_TOKEN'}},{fetchImpl:async()=>({ok:false,status:401})}),/401/);
 delete process.env.GTM_TEST_TOKEN;
});
test('watch coalesces changes, persists completion, and does not rerun after restart',async t=>{
 const dir=await temp(t),config={stateDir:dir,stablePolls:2,intervalSeconds:1,maxConsecutiveErrors:2};
 const a=seed(),b=seed();b.tag[0].name='Changed';let captures=0,runs=0;
 await watch(config,{captureSnapshot:async()=>++captures<=2?a:b,run:async()=>({folder:`run-${++runs}`}),emit:()=>{},wait:async()=>{},shouldStop:async()=>captures>=6});
 assert.equal(runs,2);const state=await readJSON(join(dir,'watch-state.json'));assert.equal(state.fingerprint,fingerprint(b));
 captures=0;await watch(config,{captureSnapshot:async()=>{captures++;return b;},run:async()=>{runs++;},emit:()=>{},wait:async()=>{},shouldStop:async()=>captures>=3});
 assert.equal(runs,2);
});
test('watch retries failures without recording successful fingerprint, releases lock',async t=>{
 const dir=await temp(t),config={stateDir:dir,stablePolls:1,intervalSeconds:1,maxConsecutiveErrors:2};let attempts=0;
 await assert.rejects(watch(config,{captureSnapshot:async()=>seed(),run:async()=>{attempts++;throw Error('failed');},emit:()=>{},wait:async()=>{}}),/repeated failures/);
 assert.equal(attempts,2);assert.equal(await readJSON(join(dir,'watch-state.json'),null),null);
 assert.equal((await readJSON(join(dir,'status.json'))).status,'failed');
 assert.match((await readJSON(join(dir,'status.json'))).message,/repeated failures/);
 const release=await acquireLock(config);await assert.rejects(acquireLock(config),/locked/);await release();
});
test('corrupt persisted state releases the target lock and reports failure',async t=>{
 const dir=await temp(t),config={stateDir:dir,stablePolls:1,intervalSeconds:1,maxConsecutiveErrors:2};
 await fs.writeFile(join(dir,'watch-state.json'),'bad json');
 await assert.rejects(watch(config,{emit:()=>{}}));
 assert.equal((await readJSON(join(dir,'status.json'))).status,'failed');
 const release=await acquireLock(config);await release();
});
test('audit saves reports and no candidate when optimization is disabled',async t=>{
 const dir=await temp(t);const r=await runSnapshot({stateDir:dir,optimize:false},seed());
 assert.match(await fs.readFile(join(r.folder,'audit.md'),'utf8'),/Not verified/);
 await assert.rejects(fs.stat(join(r.folder,'candidate.json')),{code:'ENOENT'});
});
test('source cannot watch its own output tree',async t=>{
 const dir=await temp(t),path=join(dir,'config.json');
 await fs.writeFile(path,JSON.stringify({source:{type:'file',path:'out/candidate.json'},outputDir:'out'}));
 await assert.rejects(loadConfig(path),/outside generated/);
});
test('command adapter passes stdin and fails on timeout',async()=>{
 assert.equal(await command([process.execPath,'-e','process.stdin.pipe(process.stdout)'],'hello'),'hello');
 await assert.rejects(command([process.execPath,'-e','setTimeout(()=>{},10000)'],'',{timeoutMs:20}),/timed out/);
});
