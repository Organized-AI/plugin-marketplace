import { promises as fs } from 'node:fs';
import { resolve,join } from 'node:path';
import { atomic } from './shared/io.mjs';
export async function initHumanizer(folder) {
 folder=resolve(folder);await fs.mkdir(folder,{recursive:true});
 if((await fs.readdir(folder)).length)throw Error('Choose an empty directory for setup');
 const skill=await fs.readFile(new URL('../examples/humanizer/SKILL.md',import.meta.url),'utf8');
 await atomic(join(folder,'skill.md'),skill);
 const cases=[
  {id:'workshop-invite',text:'It is important to note that Jordaaan will lead Brain Gainz on Thursday at 11 a.m. Central — a pivotal moment for anyone seeking to delve into reusable skills. Bring one draft.',facts:['Jordaaan','Brain Gainz','Thursday','11 a.m.','Central'],avoid:['—','–','delve','pivotal moment']},
  {id:'project-update',text:'Due to the fact that the team reviewed 12 drafts, the report is ready. Maya will share it on Friday – showcasing our unwavering commitment to clear communication.',facts:['12','Maya','Friday'],avoid:['—','–','unwavering commitment']}
 ];
 const suite={version:1,source:{title:'Humanizer 2.9.1 and supplied source paragraphs',reference:'Humanizer: preserve information, never invent facts, §14 punctuation; no author voice sample supplied',version:'2.9.1-workshop-1'},coverage:'Literal fact anchors and selected unwanted phrases across two paragraphs. A match does not prove semantic preservation; tone, all claims, hallucinations and other Humanizer rules need human review. No authorship detection.',cases:cases.map(c=>({id:c.id,input:{text:c.text,request:'Apply the supplied Humanizer skill to this paragraph in a plain, neutral voice. No author writing sample is supplied. Preserve the source facts. Return only JSON with a text field containing the final rewrite.'},checks:[...c.facts.map(value=>({path:'/text',op:'contains',value})),...c.avoid.map(value=>({path:'/text',op:'notContains',value}))]}))};
 await atomic(join(folder,'suite.json'),suite);
 const config=join(folder,'skill-loop.json');
 await atomic(config,{version:1,skill:'skill.md',suite:'suite.json',state:'.skill-loop',runner:{label:'Humanizer in current assistant; record model before first prepare'}});
 return {config,mode:'live Humanizer evaluation; no results yet',next:'Record the current assistant/model in runner.label, prepare CONFIG, follow the returned skill and cases, ingest the actual outputs, save a reviewed baseline, and report CONFIG. Do not run the offline demo instead. If all checks pass, retain the skill; do not manufacture a revision.'};
}
