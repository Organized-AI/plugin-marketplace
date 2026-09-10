import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {captureState,storagePlan,verifyState,restoreCloudflare,exportCloudflare} from '../scripts/cloudflare-state.mjs';
import {init} from '../scripts/cli.mjs';
import {run,baseline} from '../scripts/engine.mjs';
const root=await fs.mkdtemp(join(tmpdir(),'skill-loop-cloudflare-test-'));
async function fixture(){const dir=join(root,crypto.randomUUID());const {config}=await init(dir,{rules:true});const r=await run(config);await baseline(config,r.id);await fs.mkdir(join(dir,'assets'));await fs.writeFile(join(dir,'assets/blob.bin'),Buffer.from([0,255,32,1]));const c=JSON.parse(await fs.readFile(config));c.package={root:'.'};await fs.writeFile(config,JSON.stringify(c));return {dir,config};}
test('D1 SQL round-trip reconstructs complete current package bytes and history without executing config',async()=>{const {dir,config}=await fixture();const state=await captureState(config),plan=storagePlan(state,{skillId:'workshop-demo'});const result=spawnSync('python3',['-c',`import json,sqlite3,sys\np=json.load(sys.stdin);db=sqlite3.connect(':memory:')\nfor q in p['setup']:db.execute(q)\nfor w in p['writes']:db.execute(w['sql'])\ndb.execute(p['commit']['sql']);db.execute(p['commit']['sql'])\nm=json.loads(db.execute(p['readManifest']['sql']).fetchone()[0]);db.row_factory=sqlite3.Row;rows=[dict(db.execute(q['sql']).fetchone()) for q in p['reads']]\nprint(json.dumps({'manifest':m,'chunks':rows}))`],{input:JSON.stringify(plan),encoding:'utf8'});assert.equal(result.status,0,result.stderr);const receipt=JSON.parse(result.stdout),restored=verifyState(receipt.manifest,receipt.chunks);assert.deepEqual(restored,state);assert.ok(state.files.some(f=>f.path==='state/baseline.json'));const path=join(root,crypto.randomUUID()+'.json');await fs.writeFile(path,result.stdout);const dest=join(root,crypto.randomUUID());await restoreCloudflare(path,dest);assert.deepEqual(await fs.readFile(join(dest,'package/assets/blob.bin')),await fs.readFile(join(dir,'assets/blob.bin')));assert.deepEqual(await fs.readFile(join(dest,'state/baseline.json')),await fs.readFile(join(dir,'.skill-loop/baseline.json')));assert.equal(JSON.parse(await fs.readFile(join(dest,'skill-loop.json'))).runner.command,undefined);await assert.rejects(()=>restoreCloudflare(path,dest));});
test('missing or corrupted cloud readbacks cannot be reported verified',async()=>{const {config}=await fixture();const plan=storagePlan(await captureState(config));const chunks=storagePlan(await captureState(config),{backend:'r2'}).writes.map((w,i)=>({ordinal:i,value:w.value}));assert.throws(()=>verifyState(plan.manifest,[]));chunks[0].value='A'+chunks[0].value.slice(1);assert.throws(()=>verifyState(plan.manifest,chunks));});
test('KV/R2 plans keep immutable names; helper does not claim remote save',async()=>{const {config}=await fixture();const state=await captureState(config);for(const backend of ['kv','r2']){const p=storagePlan(state,{backend});assert.equal(p.status,'prepared-not-saved');assert.ok(p.commit.key.endsWith('/manifest.json'));assert.deepEqual(verifyState(p.manifest,p.writes.map((w,i)=>({ordinal:i,value:w.value}))),state);}assert.equal((await exportCloudflare(config)).status,'prepared-not-saved');});
test.after(async()=>fs.rm(root,{recursive:true,force:true}));

test('D1 preserves identical checkpoints separately for distinct skill IDs',async()=>{const {config}=await fixture();const state=await captureState(config);const plans=['alpha','beta'].map(skillId=>storagePlan(state,{skillId}));const result=spawnSync('python3',['-c',`import json,sqlite3,sys
p=json.load(sys.stdin);db=sqlite3.connect(':memory:')
for plan in p:
 for q in plan['setup']:db.execute(q)
 for w in plan['writes']:db.execute(w['sql'])
 db.execute(plan['commit']['sql'])
print(json.dumps([json.loads(db.execute(plan['readManifest']['sql']).fetchone()[0])['skillId'] for plan in p]))`],{input:JSON.stringify(plans),encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),['alpha','beta']);});
test('D1 refuses a truncated transfer before committing its checkpoint',async()=>{const {config}=await fixture();const p=storagePlan(await captureState(config));p.writes[0].sql=p.writes[0].sql.replace(' AS value)'," || 'x' AS value)");const result=spawnSync('python3',['-c',`import json,sqlite3,sys
p=json.load(sys.stdin);d=sqlite3.connect(':memory:')
for q in p['setup']:d.execute(q)
for w in p['writes']:d.execute(w['sql'])
d.execute(p['commit']['sql'])
print(d.execute('select count(*) from skill_loop_checkpoints').fetchone()[0])`],{input:JSON.stringify(p),encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'0');});
test('new layout preserves old receipt reads without reusing old storage keys',async()=>{const {config}=await fixture();const state=await captureState(config),p=storagePlan(state,{skillId:'legacy'});const value=storagePlan(state,{backend:'r2'}).writes.map(w=>w.value).join('');assert.ok(value.length>3000&&value.length<=48000);const {createHash}=await import('node:crypto');const old={...p.manifest,version:1,chunks:[{ordinal:0,sha256:createHash('sha256').update(value).digest('hex')}]};assert.deepEqual(verifyState(old,[{ordinal:0,value}]),state);assert.ok(p.commit.sql.includes('v2:legacy:'));assert.ok(storagePlan(state,{backend:'r2'}).commit.key.startsWith('skill-loop/v2/'));});
test('accepted large incompressible export verifies beyond the old 3000-chunk limit',async()=>{const {config}=await fixture();const state=await captureState(config);const {randomBytes,createHash}=await import('node:crypto');const bytes=randomBytes(7_000_000);state.files.push({path:'package/large.bin',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,mode:420,data:bytes.toString('base64')});assert.throws(()=>storagePlan(state,{backend:'d1'}),/safe native-connector transfer/);const p=storagePlan(state,{backend:'r2'});assert.ok(p.writes.length>3000);assert.deepEqual(verifyState(p.manifest,p.writes.map((w,ordinal)=>({ordinal,value:w.value}))),state);});

test('segmented readback expansion stops at the manifest byte budget',()=>{const manifest={format:'skill-loop-cloudflare-checkpoint',version:1,bytes:1,rawBytes:1,chunks:[{ordinal:0,sha256:'invalid'}]};assert.throws(()=>verifyState(manifest,[{ordinal:0,segments:[{value:'A',repeat:48000}],length:48000,complete:1}]),/Invalid segment/);});
