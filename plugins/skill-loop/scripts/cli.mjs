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
  await atomic(join(folder,'skill.md'),'Check the event count. Exactly one event is PASS; otherwise FAIL. Return JSON with verdict.\n');
  await atomic(join(folder,'suite.json'),{version:1,source:{title:'Workshop consent policy',reference:'Local fictional exercise',version:'1'},coverage:'Two event-count cases; no live tracking, security or business-outcome validation',cases:[{id:'granted',input:{consent:'granted',events:1},checks:[{path:'/verdict',op:'equals',value:'PASS'}]},{id:'denied',input:{consent:'denied',events:0},checks:[{path:'/verdict',op:'equals',value:'PASS'}]}]});
  const runner=demo?{label:'deterministic-demo-not-an-AI-model',command:[process.execPath,join(here,'../examples/demo-runner.mjs')]}:{label:'my-assistant'};
  const config={version:1,skill:'skill.md',suite:'suite.json',state:'.skill-loop',runner};
  if(demo)config.proposerCommand=[process.execPath,join(here,'../examples/demo-proposer.mjs')];
  if(rules) {
    config.skill='skill.json';config.runner={label:'declarative-rules-no-model',command:[process.execPath,join(here,'rules-runner.mjs')]};delete config.proposerCommand;
    await fs.rm(join(folder,'skill.md'));
    await atomic(join(folder,'skill.json'),{version:1,rules:[{when:[{path:'/consent',op:'equals',value:'granted'},{path:'/events',op:'equals',value:1}],output:{verdict:'PASS'}}],defaultOutput:{verdict:'FAIL'}});
  }
  const path=join(folder,'skill-loop.json');await atomic(path,config);return {config:path,mode:rules?'declarative rules, no model':demo?'offline demonstration':'assistant prepare/ingest',next:demo?'run, baseline, loop, report, review':'prepare, ask your assistant to run the returned cases, ingest, baseline'};
}
export async function main(args) {
  const [action,file,...rest]=args;
  if(action==='demo') {
    const setup=await init(file??'skill-loop-demo',{rules:true});
    const first=await engine.run(setup.config);await engine.baseline(setup.config,first.id);
    const folder=dirname(setup.config),policy=await readJSON(join(folder,'skill.json'));
    policy.rules.push({when:[{path:'/consent',op:'equals',value:'denied'},{path:'/events',op:'equals',value:0}],output:{verdict:'PASS'}});
    const candidate=join(folder,'candidate.json');await atomic(candidate,policy);
    const proposal=await engine.stage(setup.config,candidate,'Prepared workshop policy correction: denied consent requires zero events. Deterministic rules example, not an AI benchmark.');
    return {mode:'rules-only demonstration',baseline:first.score,candidate:proposal.comparison.status,proposal:proposal.id,activeSkillChanged:false,...await report(setup.config)};
  }
  if(action==='inventory')return inventory(file?[file,...rest]:undefined);
  if(action==='check-all')return checkAll(file);
  if(action==='init')return init(file??'skill-loop-workspace',{demo:rest.includes('--demo'),rules:rest.includes('--rules')});
  if(action==='connect')return {mcpServers:{'skill-loop':{command:process.execPath,args:[join(here,'mcp.mjs')]}}};
  if(action==='doctor')return {node:process.version,required:'Node.js 22+',engine:'ready',integration:'CLI and MCP transport available; individual host installation must be tested'};
  if(!file)throw Error('Usage: node cli.mjs init DIR [--demo] | doctor | connect | run|prepare|ingest|baseline|stage|approve|reject|loop|watch|report|status CONFIG [arguments]');
  if(['run','prepare','status','loop','versions'].includes(action))return engine[action](resolve(file));
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
