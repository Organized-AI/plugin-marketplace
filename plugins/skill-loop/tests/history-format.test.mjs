import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {exportHistory,summarize,displayedScore} from '../scripts/history.mjs';
import {spawnSync} from 'node:child_process';
test('credential-free summary export preserves coverage and labels rescored evidence',async()=>{
 const root=await fs.mkdtemp(join(tmpdir(),'skill-loop-export-'));
 try{const state=join(root,'.state');await fs.mkdir(join(state,'runs'),{recursive:true});const config=join(root,'config.json');await fs.writeFile(config,JSON.stringify({state:'.state',history:{project:'workshop',skillId:'skill'}}));const r={id:'11111111-1111-4111-8111-111111111111',createdAt:'2026-09-09T00:00:00Z',score:100,passed:2,total:2,skill:'PRIVATE SOURCE',response:{text:'PRIVATE OUTPUT'},packageAssessment:{summary:{total:13,untested:13},fullyVerified:false}};await fs.writeFile(join(state,'runs',r.id+'.json'),JSON.stringify(r));const result=await exportHistory(config);const content=await fs.readFile(result.path,'utf8');assert.ok(!content.includes('PRIVATE'));assert.equal(JSON.parse(content).records[0].document.payload.components.counts.total,13);assert.equal(summarize('assessment',{summary:{total:3}}).counts.total,3);assert.match(displayedScore({document:{payload:r},qa:{status:'rescored-from-supplied-evidence',passed:0,total:2,score:0}}),/0\/2 recomputed/);assert.match(displayedScore({document:{payload:r},qa:{status:'invalid-evidence'}}),/no verified score/);}finally{await fs.rm(root,{recursive:true,force:true});}
});
test('Chat packager excludes external symlinks and developer caches',async()=>{
 const root=await fs.mkdtemp(join(tmpdir(),'skill-loop-package-'));
 try{await fs.mkdir(join(root,'scripts'));await fs.mkdir(join(root,'chat'));await fs.mkdir(join(root,'storage','.cache'),{recursive:true});await fs.mkdir(join(root,'storage','.wrangler'),{recursive:true});await fs.writeFile(join(root,'chat','SKILL.md'),'Fixture');await fs.writeFile(join(root,'outside.txt'),'NOT FOR PACKAGE');await fs.symlink(join(root,'outside.txt'),join(root,'scripts','linked.json'));await fs.writeFile(join(root,'storage','.cache','secret.json'),'{}');await fs.writeFile(join(root,'storage','.wrangler','state.json'),'{}');await fs.copyFile(new URL('../scripts/package-chat.py',import.meta.url),join(root,'scripts','package-chat.py'));const zip=join(root,'result.zip');let r=spawnSync('python3',[join(root,'scripts','package-chat.py'),zip],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);r=spawnSync('python3',['-c','import zipfile,sys; print(zipfile.ZipFile(sys.argv[1]).namelist())',zip],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.ok(!r.stdout.includes('linked.json'));assert.ok(!r.stdout.includes('.cache'));assert.ok(!r.stdout.includes('.wrangler'));}finally{await fs.rm(root,{recursive:true,force:true});}
});
