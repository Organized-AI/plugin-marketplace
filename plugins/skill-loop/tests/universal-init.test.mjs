import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {init} from '../scripts/cli.mjs';
test('plain init does not select a bundled example or create a workspace',async t=>{
 const dir=await fs.mkdtemp(join(tmpdir(),'skill-loop-own-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const dest=join(dir,'qa');await assert.rejects(init(dest),/existing skill and QA suite/);await assert.rejects(fs.access(dest));
});
test('terminal uses supplied package and suite through prepare, ingest and report',async t=>{
 const dir=await fs.mkdtemp(join(tmpdir(),'skill-loop-own-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const pkg=join(dir,'package');await fs.mkdir(pkg);const skill=join(pkg,'SKILL.md');const content='Return JSON with the input label unchanged. Read reference.md for the output key.';await fs.writeFile(skill,content);await fs.writeFile(join(pkg,'reference.md'),'The output key is label.');
 const suite=join(dir,'suite.json');await fs.writeFile(suite,JSON.stringify({version:1,source:{title:'Test package contract'},cases:[{id:'label',input:{label:'fixture'},checks:[{path:'/label',op:'equals',value:'fixture'}]}]}));
 function cli(...args){const r=spawnSync(process.execPath,[new URL('../scripts/cli.mjs',import.meta.url).pathname,...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);}
 const setup=cli('init',join(dir,'qa'),'--skill',skill,'--suite',suite);const request=cli('prepare',setup.config);assert.equal(request.skill,content);assert(!request.skill.includes('Humanizer'));const response=join(dir,'response.json');await fs.writeFile(response,JSON.stringify({requestId:request.requestId,outputs:[{id:'label',output:{label:'fixture'}}]}));
 const run=cli('ingest',setup.config,response);assert.equal(run.score,100);const result=cli('report',setup.config);assert.match(await fs.readFile(result.report,'utf8'),/Jordaaan/);assert.equal(await fs.readFile(skill,'utf8'),content);
});
