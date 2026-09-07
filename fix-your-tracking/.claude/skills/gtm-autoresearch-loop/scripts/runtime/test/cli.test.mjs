import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { command, loadConfig, readJSON } from '../runner.mjs';
const cli=fileURLToPath(new URL('../cli.mjs',import.meta.url));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<80;i++){if(await fn())return;await sleep(100);}throw Error('Timed out waiting for background state');}
async function setup(t){
 const dir=await fs.mkdtemp(join(tmpdir(),'gtm-cli-'));
 const configPath=join(dir,'config.json'),sourcePath=join(dir,'container.json');
 const snapshot={tag:[{tagId:'1',name:'Tag 1',type:'gaawe',firingTriggerId:['2147479553']}],trigger:[],variable:[],folder:[],builtInVariable:[]};
 await fs.writeFile(sourcePath,JSON.stringify(snapshot));
 await fs.writeFile(configPath,JSON.stringify({source:{type:'file',path:'container.json'},outputDir:'out',stablePolls:1,intervalSeconds:1,maxConsecutiveErrors:2}));
 t.after(async()=>{
  const config=await loadConfig(configPath);const lock=await readJSON(join(config.stateDir,'lock.json'),null);
  if(lock){await fs.writeFile(join(config.stateDir,'stop'),'stop');await until(async()=>!await readJSON(join(config.stateDir,'lock.json'),null));}
  await fs.rm(dir,{recursive:true,force:true});
 });
 return {dir,configPath,sourcePath,snapshot};
}
test('CLI background start/change/restart/stop with real child process',async t=>{
 const {configPath,sourcePath,snapshot}=await setup(t);
 const call=action=>command([process.execPath,cli,action,configPath]);
 const config=await loadConfig(configPath),statePath=join(config.stateDir,'watch-state.json');
 const started=JSON.parse(await call('start'));assert.equal(started.started,true);
 await until(async()=>!!await readJSON(statePath,null));
 const first=await readJSON(statePath);assert.equal(JSON.parse(await call('status')).running,true);
 await assert.rejects(call('start'),/exit code/);
 snapshot.tag[0].name='Changed externally';await fs.writeFile(sourcePath,JSON.stringify(snapshot));
 await until(async()=>{const s=await readJSON(statePath,null);return s?.fingerprint!==first.fingerprint;});
 const second=await readJSON(statePath);assert.notEqual(second.folder,first.folder);
 await call('stop');await until(async()=>!await readJSON(join(config.stateDir,'lock.json'),null));
 assert.equal(JSON.parse(await call('status')).running,false);
 await call('start');await sleep(1500);
 assert.equal((await readJSON(statePath)).folder,second.folder);
 await call('stop');await until(async()=>!await readJSON(join(config.stateDir,'lock.json'),null));
});
test('CLI model adapter saves a candidate and never changes source',async t=>{
 const {configPath,sourcePath,snapshot}=await setup(t);
 const config=await readJSON(configPath);
 config.mutationCommand=[process.execPath,'-e',`let s='';process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>{const x=JSON.parse(s);process.stdout.write(JSON.stringify({operations:x.round===1?[{op:'rename',kind:'tag',id:'1',name:'GA4 event'}]:[]}));});`];
 await fs.writeFile(configPath,JSON.stringify(config));
 const result=JSON.parse(await command([process.execPath,cli,'loop',configPath]));
 const candidate=await readJSON(join(result.folder,'candidate.json'));
 assert.equal(candidate.containerVersion.tag[0].name,'GA4 event');
 assert.deepEqual(await readJSON(sourcePath),snapshot);
});
