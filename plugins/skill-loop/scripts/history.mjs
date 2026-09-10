// Optional remote archive. Local evidence remains authoritative; sync is explicit.
import {promises as fs} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {readJSON,hash,atomic,locked} from './shared/io.mjs';
const key=s=>typeof s==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(s);
export async function historyConfig(file,{connect=true}={}){
 const config=await readJSON(file),h=config.history;
 if(!h||!key(h.project)||!key(h.skillId))throw Error('Configure history.project and history.skillId with stable names');
 if(!['summary','evidence'].includes(h.mode??'summary'))throw Error('History mode must be summary or evidence');
 if(!connect)return {...h,mode:h.mode??'summary',state:resolve(dirname(resolve(file)),config.state??'.skill-loop')};
 const endpoint=new URL(h.endpoint);
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)throw Error('History endpoint must be a credential-free HTTPS URL');
 if(!['summary','evidence'].includes(h.mode??'summary'))throw Error('History mode must be summary or evidence');
 const token=process.env[h.tokenEnv??'SKILL_LOOP_HISTORY_TOKEN'];
 if(!token||token.length<32)throw Error('Set a Supabase user access token in the configured environment variable, or use the signed-in Chumbo connector. Never put a token in an HTML artifact');
 return {...h,mode:h.mode??'summary',endpoint:endpoint.href.replace(/\/$/,''),token,state:resolve(dirname(resolve(file)),config.state??'.skill-loop')};
}
export function summarize(kind,r){
 if(kind==='run'||kind==='baseline')return {id:r.id,createdAt:r.createdAt,kind:r.kind,runner:r.runner,conditions:r.conditions,skillHash:r.skillHash,packageHash:r.packageHash,passed:r.passed,total:r.total,score:r.score,comparison:r.comparison?{status:r.comparison.status,delta:r.comparison.delta,lostChecks:r.comparison.lostChecks}:null,components:r.packageAssessment?{counts:r.packageAssessment.summary,fullyVerified:r.packageAssessment.fullyVerified}:null};
 if(kind==='proposal')return {id:r.id,status:r.status,createdAt:r.createdAt,decidedAt:r.decidedAt,runId:r.runId,baselineId:r.baselineId,beforeHash:r.beforeHash,beforePackageHash:r.beforePackageHash,candidatePackageHash:r.candidatePackageHash,eligible:r.eligible};
 if(kind==='review')return {version:r.version,evidenceIdentity:hash(r.evidenceKey??''),decisions:Object.fromEntries(Object.entries(r.decisions??{}).map(([id,v])=>[id,{status:v.status,updatedAt:v.updatedAt}]))};
 return {version:r.version,packageHash:r.packageHash,counts:r.summary,fullyVerified:r.fullyVerified};
}
export function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
export function historyRecord(h,kind,source){
 const payload=h.mode==='evidence'?source:summarize(kind,source);
 const document=JSON.parse(JSON.stringify({version:1,project:h.project,skillId:h.skillId,kind,occurredAt:source.decidedAt??source.createdAt??null,mode:h.mode,payload}));
 return {id:hash(canonical(document)),document};
}
async function rpc(h,message,session){
 let res;try{res=await fetch(h.endpoint,{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+h.token,'Content-Type':'application/json',Accept:'application/json, text/event-stream',...(session?{'mcp-session-id':session}:{})},body:JSON.stringify(message),signal:AbortSignal.timeout(15000)});}catch{throw Error('History connection failed; local evidence is retained. Check endpoint and retry.');}
 if(!res.ok)throw Error(`History request failed (${res.status}); local evidence is retained`);
 if(!Object.hasOwn(message,'id'))return {};
 const raw=await res.text();if(raw.length>2_000_000)throw Error('History response is too large');
 let answer;if(res.headers.get('content-type')?.includes('text/event-stream')){const items=raw.split('\n').filter(x=>x.startsWith('data:')).map(x=>JSON.parse(x.slice(5)));answer=items.find(x=>x.id===message.id);}else answer=JSON.parse(raw);
 if(!answer||answer.id!==message.id||answer.error)throw Error('MCP history request failed');
 return {result:answer.result,session:res.headers.get('mcp-session-id')??session};
}
export async function historyTool(h,name,args){
 const init=await rpc(h,{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'Skill Loop',version:'0.1.0'}}});
 await rpc(h,{jsonrpc:'2.0',method:'notifications/initialized'},init.session);
 const {result}=await rpc(h,{jsonrpc:'2.0',id:2,method:'tools/call',params:{name,arguments:args}},init.session);
 if(result?.isError)throw Error('Chumbo history operation failed; check signed-in access and refresh the record');
 if(result?.structuredContent)return result.structuredContent;
 const text=result?.content?.find(x=>x.type==='text')?.text;if(!text)throw Error('History tool returned no structured result');return JSON.parse(text);
}
async function recordsFor(h,{reviewFile}={}){
  const records=[];
  for(const [folder,kind] of [['runs','run'],['proposals','proposal']]){
   const names=await fs.readdir(join(h.state,folder)).catch(e=>{if(e.code==='ENOENT')return [];throw e;});
   for(const name of names.sort())if(/^[a-f0-9-]{36}\.json$/.test(name))records.push(historyRecord(h,kind,await readJSON(join(h.state,folder,name))));
  }
  for(const [name,kind] of [['baseline.json','baseline'],['package-assessment.json','assessment']]){const r=await readJSON(join(h.state,name),null);if(r)records.push(historyRecord(h,kind,r));}
  if(reviewFile){const r=await readJSON(reviewFile);if(r.version!==1||typeof r.evidenceKey!=='string'||!r.decisions||typeof r.decisions!=='object'||Array.isArray(r.decisions))throw Error('Invalid exported review decisions');for(const v of Object.values(r.decisions)){if(!v||!['accepted','dismissed'].includes(v.status)||typeof v.note!=='string'||(v.status==='dismissed'&&!v.note.trim())||typeof v.finding!=='string'||typeof v.updatedAt!=='string')throw Error('Invalid review decision');}records.push(historyRecord(h,'review',r));}
  return records;
}
export async function exportHistory(file,{reviewFile}={}){const h=await historyConfig(file,{connect:false});return locked(h.state,async()=>{const records=await recordsFor(h,{reviewFile});const path=join(h.state,'history-upload.json');await atomic(path,{version:1,records});return {path,records:records.length,mode:h.mode,note:'Upload these records with the signed-in Chumbo connector. No credentials included.'};});}
export async function syncHistory(file,{reviewFile}={}){
 const h=await historyConfig(file);
 return locked(h.state,async()=>{
  const records=await recordsFor(h,{reviewFile});let saved=0;
  for(const record of records){if(Buffer.byteLength(JSON.stringify(record))>700000)throw Error('Evidence exceeds the archive limit; choose summary mode or keep full evidence locally');const answer=await historyTool(h,'save_history_record',record);if(answer.id!==record.id||answer.saved!==true)throw Error('History acknowledgement does not match the saved record');saved++;}
  const result={saved,mode:h.mode,project:h.project,skillId:h.skillId,syncedAt:new Date().toISOString(),note:'Archive snapshots only; no skills or QA scores were changed'};
  await atomic(join(h.state,'history-sync.json'),result);return result;
 });
}
export async function readHistory(file){
 const h=await historyConfig(file),events=[];let after=0;
 for(let page=0;page<1000;page++){
  const r=await historyTool(h,'list_skill_history',{project:h.project,skillId:h.skillId,after});
  if(!Array.isArray(r.events))throw Error('Invalid history response');
  for(const row of r.events){const {record:event,qa,findings}=await historyTool(h,'get_history_record',{id:row.record_hash});if(event.document?.project!==h.project||event.document?.skillId!==h.skillId||event.id!==hash(canonical(event.document))||!Number.isSafeInteger(event.sequence)||event.sequence<=after)throw Error('History identity or sequence mismatch');after=event.sequence;events.push({...event,qa,findings});}
  if(r.next===null)return {project:h.project,skillId:h.skillId,events};
  if(!r.events.length||r.next!==after)throw Error('Invalid history cursor');
 }
 throw Error('History exceeds 20,000 records; export from the database');
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function displayedScore(event){const p=event.document.payload;if(event.qa?.status==='rescored-from-supplied-evidence')return `${event.qa.passed}/${event.qa.total} recomputed checks · ${event.qa.score.toFixed(1)}%`;if(event.qa?.status==='invalid-evidence')return 'Invalid evidence · no verified score';return Number.isFinite(p.score)?`${p.passed}/${p.total} client-reported checks · ${p.score.toFixed(1)}%`:p.status??'Recorded snapshot';}
export async function historyReport(file){
 const history=await readHistory(file),h=await historyConfig(file);
 const rows=history.events.map(e=>{const d=e.document,p=d.payload;return `<article data-date="${esc((d.occurredAt??e.savedAt).slice(0,10))}"><small>${esc(d.kind)} · ${esc(d.mode)} · saved ${esc(e.savedAt)}</small><h2>${esc(d.occurredAt??'Date not recorded')}</h2><p>${esc(displayedScore(e))}</p><p>Package: ${esc(p.packageHash??p.candidatePackageHash??'not recorded')}</p><details><summary>Inspect saved evidence</summary><pre>${esc(JSON.stringify(p,null,2))}</pre></details></article>`;}).join('');
 const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Skill Loop history · Jordaaan</title><style>body{background:#141310;color:#f3f0e8;font:16px system-ui;max-width:1050px;margin:auto;padding:32px}h1,h2,.brand{font-family:monospace}.brand,small{color:#c9a962}article{border:1px solid #51452d;padding:20px;margin:18px 0;border-radius:12px}input{color:inherit;background:#24221e;border:1px solid #c9a962;padding:8px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}label{display:inline-block;margin:8px}</style><div class="brand">skill-loop · ORGANIZED AI · JORDAAAN</div><h1>${esc(history.skillId)} · saved history</h1><p>${history.events.length} archived snapshots. This HTML is a downloaded view, not a live database connection. Summary mode omits source text and actual outputs. Scores across different test conditions are not comparable; no new drift is inferred here.</p><label>From <input id="from" type="date"></label><label>Through <input id="to" type="date"></label><main>${rows||'<p>No synced history yet.</p>'}</main><script>for(const input of document.querySelectorAll('input'))input.oninput=()=>{for(const row of document.querySelectorAll('article'))row.hidden=!!((document.getElementById('from').value&&row.dataset.date<document.getElementById('from').value)||(document.getElementById('to').value&&row.dataset.date>document.getElementById('to').value));};</script></html>`;
 const path=join(h.state,'history.html');await atomic(path,html);await atomic(join(h.state,'history-export.json'),history);return {html:path,events:history.events.length,export:join(h.state,'history-export.json')};
}
