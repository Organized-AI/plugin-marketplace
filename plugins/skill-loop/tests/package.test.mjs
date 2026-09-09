import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { packageSnapshot,packageContext,assessPackage } from '../scripts/package.mjs';
import { prepare,ingest,load,assess,baseline,run,stage,decide,versions,selectVersion,compare } from '../scripts/engine.mjs';
import { report } from '../scripts/report.mjs';
async function fixture(t){
 const root=await fs.mkdtemp(join(tmpdir(),'package-qa-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const pkg=join(root,'plugin');await fs.mkdir(join(pkg,'skills/example'),{recursive:true});await fs.mkdir(join(pkg,'.claude-plugin'));await fs.mkdir(join(pkg,'references'));await fs.mkdir(join(pkg,'scripts'));await fs.mkdir(join(pkg,'hooks'));await fs.mkdir(join(pkg,'commands'));
 await fs.writeFile(join(pkg,'.claude-plugin/plugin.json'),'{}');await fs.writeFile(join(pkg,'skills/example/SKILL.md'),'Read [rules](../../references/rules.md). Follow the rules.');await fs.writeFile(join(pkg,'references/rules.md'),'Return the fact from this reference: cobalt.');await fs.writeFile(join(pkg,'scripts/check.mjs'),"console.log('CHECK OK')");await fs.writeFile(join(pkg,'hooks/hooks.json'),'{}');await fs.writeFile(join(pkg,'commands/review.md'),'Review the package.');
 const cfg=join(root,'skill-loop.json');await fs.writeFile(join(root,'suite.json'),JSON.stringify({version:1,cases:[{id:'reference',input:{question:'What is the fact?'},checks:[{path:'/text',op:'equals',value:'cobalt'}]}]}));
 await fs.writeFile(cfg,JSON.stringify({version:1,skill:'plugin/skills/example/SKILL.md',suite:'suite.json',state:'.skill-loop',runner:{label:'test evaluator'}}));
 return {root,pkg,cfg};
}
const answer=r=>({requestId:r.requestId,outputs:[{id:'reference',output:{text:'cobalt'}}]});
test('default package discovers plugin-level files, supplies references and does not leak QA suite',async t=>{
 const f=await fixture(t);const req=await prepare(f.cfg);
 assert.equal(req.package.mode,'package');assert.equal(req.package.files.length,6);
 assert(req.package.files.find(x=>x.path==='references/rules.md').content.includes('cobalt'));
 assert(req.package.files.some(x=>x.kind==='hook'));assert(req.package.files.some(x=>x.kind==='command'));
 assert(!JSON.stringify(req).includes('"checks"'));assert(!req.package.files.some(x=>x.path.includes('suite.json')));
 const r=await ingest(f.cfg,answer(req));assert.equal(r.passed,1);assert.equal(r.packageAssessment.summary.untested,6);assert.equal(r.packageAssessment.fullyVerified,false);
});
test('reference-only changes reject pending imports and leave historical report stale',async t=>{
 const f=await fixture(t);const req=await prepare(f.cfg);const first=await ingest(f.cfg,answer(req));await baseline(f.cfg,first.id);
 const pending=await prepare(f.cfg);await fs.writeFile(join(f.pkg,'references/rules.md'),'Changed rule');
 await assert.rejects(ingest(f.cfg,answer(pending)),/Inputs changed/);await assert.rejects(baseline(f.cfg,first.id),/Baseline must match/);
 const html=await fs.readFile((await report(f.cfg)).report,'utf8');assert(html.includes('Package changed since this evidence'));
});
test('package hashes cover additions, deletions and executable bytes; state is excluded',async t=>{
 const f=await fixture(t);const c=await load(f.cfg);const a=await packageSnapshot(c);await fs.writeFile(join(f.pkg,'scripts/check.mjs'),"console.log('OTHER')");const b=await packageSnapshot(c);assert.notEqual(a.hash,b.hash);
 await fs.writeFile(join(f.pkg,'extra.md'),'Additional reference');const d=await packageSnapshot(c);assert.notEqual(b.hash,d.hash);await fs.unlink(join(f.pkg,'extra.md'));assert.equal((await packageSnapshot(c)).hash,b.hash);
 await fs.mkdir(join(f.pkg,'.skill-loop'));await fs.writeFile(join(f.pkg,'.skill-loop','private.json'),'SECRET CHECKS');assert.equal((await packageSnapshot(c)).hash,b.hash);
});
test('missing and escaped references and symlinks are visible blocked issues',async t=>{
 const f=await fixture(t);await fs.appendFile(join(f.pkg,'skills/example/SKILL.md'),' [missing](../../references/missing.md) [escape](../../../outside.md)');await fs.symlink('/etc/hosts',join(f.pkg,'references/linked.md'));
 const p=await packageSnapshot(await load(f.cfg));assert(p.issues.some(x=>x.reason.includes('missing')));assert(p.issues.some(x=>x.reason.includes('leaves')));assert(p.issues.some(x=>x.reason.includes('Symlink')));assert(!p.files.some(x=>x.path.includes('outside')));
});
test('explicit script checks really execute and host hooks stay unsupported',async t=>{
 const f=await fixture(t);const c=JSON.parse(await fs.readFile(f.cfg));c.package={tests:[{id:'script',kind:'script',component:'scripts/check.mjs',command:[process.execPath,'scripts/check.mjs'],stdoutContains:['CHECK OK']},{id:'hook',kind:'hook',component:'hooks/hooks.json'}]};await fs.writeFile(f.cfg,JSON.stringify(c));
 const r=await assess(f.cfg,{execute:true});assert.equal(r.tests[0].status,'passed');assert.equal(r.tests[1].status,'unsupported');assert.equal(r.fullyVerified,false);
 await fs.writeFile(join(f.pkg,'scripts/check.mjs'),'process.exit(7)');const fail=await assess(f.cfg,{execute:true});assert.equal(fail.tests[0].status,'failed');assert.match(fail.tests[0].reason,/exit code 7/);
});
test('no discovered script executes without an explicit check',async t=>{
 const f=await fixture(t);await fs.writeFile(join(f.pkg,'scripts/check.mjs'),"throw Error('MUST NOT RUN')");const req=await prepare(f.cfg);const r=await ingest(f.cfg,answer(req));assert.equal(r.packageAssessment.tests.length,0);assert.equal(r.packageAssessment.components.find(x=>x.kind==='script').status,'untested');
});
test('component execution runs in a working copy and cannot mutate the installed entrypoint',async t=>{
 const f=await fixture(t);const c=JSON.parse(await fs.readFile(f.cfg));c.package={tests:[{id:'mutation',kind:'script',component:'scripts/check.mjs',command:[process.execPath,'-e',"require('fs').writeFileSync('skills/example/SKILL.md','changed');console.log('OK')"],stdoutContains:['OK']}]};await fs.writeFile(f.cfg,JSON.stringify(c));const req=await prepare(f.cfg);await ingest(f.cfg,answer(req));assert.match(await fs.readFile(join(f.pkg,'skills/example/SKILL.md'),'utf8'),/Follow the rules/);
});
test('sensitive filenames and configured suite inside a package are excluded from context',async t=>{
 const f=await fixture(t);await fs.writeFile(join(f.pkg,'.env'),'PRIVATE');await fs.copyFile(join(f.root,'suite.json'),join(f.pkg,'qa.json'));const c=JSON.parse(await fs.readFile(f.cfg));c.suite='plugin/qa.json';await fs.writeFile(f.cfg,JSON.stringify(c));const req=await prepare(f.cfg);assert(!req.package.files.some(x=>['.env','qa.json'].includes(x.path)));assert(!JSON.stringify(req.package.files).includes('PRIVATE'));
});

test('package-only histories stay distinct and rejected restore does not poison the journal',async t=>{
 const f=await fixture(t);const a=await prepare(f.cfg);const first=await ingest(f.cfg,answer(a));
 await fs.writeFile(join(f.pkg,'references/rules.md'),'Updated supporting file');const b=await prepare(f.cfg);await ingest(f.cfg,answer(b));
 const history=await versions(f.cfg);assert.equal(history.versions.length,2);
 await assert.rejects(selectVersion(f.cfg,first.packageHash),/Associated files differ/);
 await prepare(f.cfg);await assert.rejects(fs.stat(join(f.root,'.skill-loop/approval-journal.json')),/ENOENT/);
});
test('atomic source replacement preserves permissions that contribute to package identity',async t=>{
 const {atomic}=await import('../scripts/shared/io.mjs');const f=await fixture(t);const path=join(f.pkg,'skills/example/SKILL.md');await fs.chmod(path,0o664);await atomic(path,'replacement');assert.equal((await fs.stat(path)).mode&0o777,0o664);
});
test('configured component regression blocks otherwise improved behavioral score',()=>{
 const base={conditions:'same',passed:1,score:50,checks:[{caseId:'a',index:0,passed:true},{caseId:'b',index:0,passed:false}],packageAssessment:{tests:[{id:'script',status:'passed'}],issues:[]}};
 const next={...base,passed:2,score:100,checks:base.checks.map(c=>({...c,passed:true})),packageAssessment:{tests:[{id:'script',status:'failed'}],issues:[]}};
 assert.equal(compare(base,next).status,'regression');assert.deepEqual(compare(base,next).lostChecks,['component:script']);
 const blocked={...base,packageAssessment:{tests:[{id:'script',status:'untested'}],issues:[]}};assert.equal(compare(blocked,next).status,'needs-component-verification');
});
test('custom entry scan discloses root files outside its bounded support scope',async t=>{
 const f=await fixture(t);const custom=join(f.root,'skill.md');await fs.writeFile(custom,'a custom skill');await fs.writeFile(join(f.root,'helper.py'),'print(1)');
 const p=await packageSnapshot({skill:custom,base:f.root});assert.match(p.coverage,/Custom entrypoint/);assert(p.exclusions.some(x=>x.path==='helper.py'));
});

test('component checks execute candidate entry bytes rather than the original entry',async t=>{
 const f=await fixture(t);await fs.writeFile(join(f.pkg,'scripts/check.mjs'),"import fs from 'node:fs';if(fs.readFileSync('skills/example/SKILL.md','utf8').includes('INVALID'))process.exit(9);console.log('OK')");
 const config=await load(f.cfg);config.package={tests:[{id:'candidate',kind:'script',component:'scripts/check.mjs',command:[process.execPath,'scripts/check.mjs'],stdoutContains:['OK']}]};
 const original=await packageSnapshot(config);assert.equal((await assessPackage(config,original,{execute:true})).tests[0].status,'passed');
 const candidate=await packageSnapshot(config,{entryText:'INVALID candidate'});assert.equal((await assessPackage(config,candidate,{execute:true})).tests[0].status,'failed');assert(!String(await fs.readFile(join(f.pkg,'skills/example/SKILL.md'))).includes('INVALID'));
 config.package.tests[0].cwd=await fs.realpath(f.pkg);assert.equal((await assessPackage(config,candidate,{execute:true})).tests[0].status,'failed');
});
