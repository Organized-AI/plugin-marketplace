import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {overview,renderOverview} from '../scripts/overview.mjs';

test('overview scans user packages, preserves input, and refuses to overwrite output',async()=>{
 const root=await fs.mkdtemp(join(tmpdir(),'overview-test-'));
 try {
  const skill=join(root,'skills','actual-skill');await fs.mkdir(skill,{recursive:true});
  const source='---\nname: actual-skill\n---\nSummarize the supplied text. Preserve quantities.\n';
  await fs.writeFile(join(skill,'SKILL.md'),source);
  const result=await overview(join(root,'qa'),[join(root,'skills')]);
  const data=JSON.parse(await fs.readFile(result.inventory,'utf8'));
  assert.equal(result.skills,1);assert.equal(result.behavioralTestsRun,0);
  assert.equal(data.skills[0].name,'actual-skill');assert.equal(data.skills[0].effectiveness,'untested');
  assert.equal(await fs.readFile(join(skill,'SKILL.md'),'utf8'),source);
  const html=await fs.readFile(result.report,'utf8');assert.ok(html.includes('actual-skill'));assert.ok(!html.includes('Humanizer'));
  await assert.rejects(overview(join(root,'qa'),[skill]),/empty output/);
  assert.equal(await fs.readFile(result.report,'utf8'),html);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('overview embeds arbitrary names and findings without executable markup and roundtrips evidence',async()=>{
 const malicious='</script><script>globalThis.pwned=true</script>';
 const data={scope:[malicious],skills:[{name:malicious,path:malicious,packageHash:'hash',reason:malicious,packageAssessment:{issues:[{path:malicious,reason:malicious}],components:[]}}],unavailable:[],coverage:malicious};
 const html=await renderOverview(data);
 assert.ok(!html.includes(malicious));
 const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,2);
 assert.deepEqual(JSON.parse(scripts[0][1]),data);new vm.Script(scripts[1][1]);
});
test('no accessible skills produces recovery guidance rather than fake examples',async()=>{
 const root=await fs.mkdtemp(join(tmpdir(),'overview-empty-'));
 try{const result=await overview(join(root,'qa'),[join(root,'missing')]);assert.equal(result.skills,0);const html=await fs.readFile(result.report,'utf8');assert.ok(html.includes('No readable skills found'));assert.ok(!html.includes('Humanizer'));}finally{await fs.rm(root,{recursive:true,force:true});}
});
