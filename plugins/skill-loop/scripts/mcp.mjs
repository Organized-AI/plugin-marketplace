#!/usr/bin/env node
// Minimal MCP stdio transport: newline-delimited JSON-RPC, no network listener.
import { createInterface } from 'node:readline';
import * as e from './engine.mjs';
import { init } from './cli.mjs';
import { inventory,checkAll } from './inventory.mjs';
import { report } from './report.mjs';
const field={type:'string'};
const specs=[
 ['skill_loop_inventory','Discover skills under explicit roots; mark effectiveness untested until enrolled.',{roots:{type:'array',items:field}},[]],
 ['skill_loop_check_all','Run the configured evaluations in a skill registry; preserve untested and error states.',{registry:field},['registry']],
 ['skill_loop_versions','List saved skill versions, active selection and current or historical QA status.',{config:field},['config']],
 ['skill_loop_select_version','Activate a specific saved version only after the user chooses it. May override a better QA result; label the preference.',{config:field,version:field},['config','version']],
 ['skill_loop_init','Create a test workspace in an empty directory.',{directory:field,demo:{type:'boolean'},rules:{type:'boolean'}},['directory']],
 ['skill_loop_prepare','Get skill and test inputs without the private scoring checks.',{config:field},['config']],
 ['skill_loop_ingest','Score assistant outputs for a prepared request.',{config:field,response:{type:'object'}},['config','response']],
 ['skill_loop_replay','Rescore historical saved outputs without a model call; does not measure new drift.',{config:field,runId:field},['config','runId']],
 ['skill_loop_run','Run the explicitly configured trusted command and score its output.',{config:field},['config']],
 ['skill_loop_baseline','Set a completed current run as the comparison baseline.',{config:field,runId:field},['config','runId']],
 ['skill_loop_stage','Test a candidate skill and stage it without applying it.',{config:field,candidate:field,evidence:field},['config','candidate','evidence']],
 ['skill_loop_loop','Run bounded candidate iterations using the configured trusted proposer; stage only.',{config:field},['config']],
 ['skill_loop_decide','Approve or reject a proposal. Approval writes the skill and requires explicit user approval of that proposal.',{config:field,proposalId:field,decision:{type:'string',enum:['approve','reject']}},['config','proposalId','decision']],
 ['skill_loop_status','Read the latest run and baseline.',{config:field},['config']],
 ['skill_loop_report','Write a local HTML report with test evidence and candidate comparison.',{config:field},['config']]
];
const handlers={skill_loop_versions:a=>e.versions(a.config),skill_loop_select_version:a=>e.selectVersion(a.config,a.version),skill_loop_inventory:a=>inventory(a.roots),skill_loop_check_all:a=>checkAll(a.registry),skill_loop_replay:a=>e.replay(a.config,a.runId),skill_loop_init:a=>init(a.directory,{demo:a.demo??false,rules:a.rules??false}),skill_loop_prepare:a=>e.prepare(a.config),skill_loop_ingest:a=>e.ingest(a.config,a.response),skill_loop_run:a=>e.run(a.config),skill_loop_baseline:a=>e.baseline(a.config,a.runId),skill_loop_stage:a=>e.stage(a.config,a.candidate,a.evidence),skill_loop_loop:a=>e.loop(a.config),skill_loop_decide:a=>e.decide(a.config,a.proposalId,a.decision),skill_loop_status:a=>e.status(a.config),skill_loop_report:a=>report(a.config)};
const send=o=>process.stdout.write(JSON.stringify(o)+'\n');
for await(const line of createInterface({input:process.stdin,crlfDelay:Infinity})) {
  let request;
  try {if(line.length>5_000_000)throw Error('Message too large');request=JSON.parse(line);}
  catch {send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid JSON message'}});continue;}
  if(!Object.hasOwn(request,'id'))continue;
  let result;
  try {
    if(request.method==='initialize')result={protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'organized-ai-skill-loop',version:'0.1.0'}};
    else if(request.method==='ping')result={};
    else if(request.method==='tools/list')result={tools:specs.map(([name,description,properties,required])=>({name,description,inputSchema:{type:'object',properties,required,additionalProperties:false}}))};
    else if(request.method==='tools/call') {
      const {name,arguments:a={}}=request.params??{};
      if(!Object.hasOwn(handlers,name))throw Error('Unknown tool');
      const spec=specs.find(s=>s[0]===name);
      if(!a||typeof a!=='object'||spec[3].some(k=>!Object.hasOwn(a,k)))throw Error('Missing tool arguments');
      const output=await handlers[name](a);result={content:[{type:'text',text:JSON.stringify(output)}]};
    }else {send({jsonrpc:'2.0',id:request.id,error:{code:-32601,message:'Method not found'}});continue;}
  }catch(err){result={isError:true,content:[{type:'text',text:err.message}]};}
  send({jsonrpc:'2.0',id:request.id,result});
}
