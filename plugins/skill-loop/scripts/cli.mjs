#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { resolve,join,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as engine from './engine.mjs';
import { inventory,checkAll } from './inventory.mjs';
import { atomic,readJSON } from './shared/io.mjs';
import { report } from './report.mjs';
const here=dirname(fileURLToPath(import.meta.url));
export async function init(folder,{demo=false,rules=false}={}) {
  folder=resolve(folder);await fs.mkdir(folder,{recursive:true});
  // A dedicated empty directory avoids overwriting a user's skill or config.
  if((await fs.readdir(folder)).length)throw Error('Choose an empty directory for setup');
  await atomic(join(folder,'skill.md'),'Humanizer punctuation practice: replace em dashes with commas, removing adjacent spaces. Return JSON with text. Teaching adaptation, not the full Humanizer skill.\n');
  await atomic(join(folder,'suite.json'),{version:1,source:{title:'Humanizer 2.9.1 · punctuation rule',reference:'examples/humanizer/SKILL.md §14; no author voice sample supplied',version:'2.9.1'},coverage:'Two punctuation cases in a teaching adaptation; not a live run of the full Humanizer skill or a measure of writing quality',cases:[{id:'em-dashes',input:{text:'Brain Gainz — with Jordaaan — starts Thursday.'},checks:[{path:'/text',op:'equals',value:'Brain Gainz, with Jordaaan, starts Thursday.'}]},{id:'en-dashes',input:{text:'Brain Gainz – with Jordaaan – starts Thursday.'},checks:[{path:'/text',op:'equals',value:'Brain Gainz, with Jordaaan, starts Thursday.'}]}]});
  const runner=demo?{label:'deterministic-demo-not-an-AI-model',command:[process.execPath,join(here,'../examples/demo-runner.mjs')]}:{label:'my-assistant'};
  const config={version:1,skill:'skill.md',suite:'suite.json',state:'.skill-loop',runner};
  if(demo)config.proposerCommand=[process.execPath,join(here,'../examples/demo-proposer.mjs')];
  if(rules) {
    config.skill='skill.json';config.runner={label:'humanizer-punctuation-adaptation-no-model',command:[process.execPath,join(here,'punctuation-runner.mjs')]};delete config.proposerCommand;
    await fs.rm(join(folder,'skill.md'));
    await atomic(join(folder,'skill.json'),{version:1,replaceEmDashes:true,replaceEnDashes:false});
  }
  const path=join(folder,'skill-loop.json');await atomic(path,config);return {config:path,mode:rules?'declarative rules, no model':demo?'offline demonstration':'assistant prepare/ingest',next:demo?'run, baseline, loop, report, review':'prepare, ask your assistant to run the returned cases, ingest, baseline'};
}
export async function main(args) {
  const [action,file,...rest]=args;
  if(action==='humanizer-init') {
    const {initHumanizer}=await import('./humanizer-demo.mjs');return initHumanizer(file??'humanizer-workshop');
  }
  if(action==='demo') {
    const setup=await init(file??'skill-loop-demo',{rules:true});
    const first=await engine.run(setup.config);await engine.baseline(setup.config,first.id);
    const folder=dirname(setup.config),policy=await readJSON(join(folder,'skill.json'));
    policy.replaceEnDashes=true;
    const candidate=join(folder,'candidate.json');await atomic(candidate,policy);
    const proposal=await engine.stage(setup.config,candidate,'Prepared correction to the Humanizer punctuation teaching adaptation: handle en dashes as well as em dashes. The installed Humanizer already states both rules; this is not a measured defect in it.');
    return {mode:'rules-only demonstration',baseline:first.score,candidate:proposal.comparison.status,proposal:proposal.id,activeSkillChanged:false,...await report(setup.config)};
  }
  if(action==='inventory')return inventory(file?[file,...rest]:undefined);
  if(action==='check-all')return checkAll(file);
  if(action==='init')return init(file??'skill-loop-workspace',{demo:rest.includes('--demo'),rules:rest.includes('--rules')});
  if(action==='connect')return {mcpServers:{'skill-loop':{command:process.execPath,args:[join(here,'mcp.mjs')]}}};
  if(action==='doctor')return {node:process.version,required:'Node.js 22+',engine:'ready',integration:'CLI and MCP transport available; individual host installation must be tested'};
  if(!file)throw Error('Usage: node cli.mjs init DIR [--demo] | doctor | connect | run|prepare|ingest|baseline|stage|approve|reject|loop|watch|report|status CONFIG [arguments]');
  if(['run','prepare','status','loop','versions'].includes(action))return engine[action](resolve(file));
  if(action==='assess')return engine.assess(file,{execute:rest.includes('--execute')});
  if(action==='ingest')return engine.ingest(file,await readJSON(rest[0]));
  if(action==='select-version')return engine.selectVersion(file,rest[0]);
  if(action==='replay')return engine.replay(file,rest[0]);
  if(action==='baseline')return engine.baseline(file,rest[0]);
  if(action==='stage')return engine.stage(file,resolve(rest[0]),rest.slice(1).join(' '));
  if(action==='approve'||action==='reject')return engine.decide(file,rest[0],action);
  if(action==='report')return report(file);
  if(action==='watch') {
    const controller=new AbortController();process.once('SIGINT',()=>controller.abort());process.once('SIGTERM',()=>controller.abort());
    await engine.watch(file,{intervalSeconds:Number(rest[0]??60),maxRuns:Number(rest[1]??10),signal:controller.signal,emit:r=>process.stdout.write(JSON.stringify(r)+'\n')});return {status:'stopped'};
  }
  throw Error('Unknown command');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).then(r=>process.stdout.write(JSON.stringify(r,null,2)+'\n')).catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1;});
