import {createSupabaseMcpForTesting} from 'npm:chumbo@0.11.0/testing';
import {registerCapabilities} from '../supabase/functions/skill-loop/capabilities.ts';
import {digest,validateRecord} from '../supabase/functions/skill-loop/archive.ts';
import {createApp,withCors} from '../supabase/functions/skill-loop/index.ts';
import {historyTool,historyRecord,displayedScore,summarize} from '../../../scripts/history.mjs';
const assert=(v:unknown,msg='Assertion failed')=>{if(!v)throw Error(msg)};
Deno.env.set('SUPABASE_URL','https://fixture.supabase.co');
Deno.env.set('SUPABASE_ANON_KEY','test-only-publishable-placeholder');
Deno.test('Summary privacy, canonical identity and explicit evidence mode',async()=>{
 const document={version:1,project:'workshop',skillId:'humanizer',kind:'run',occurredAt:null,mode:'summary',payload:{skill:'private'}};
 let rejected=false;try{await validateRecord({id:await digest(document),document})}catch{rejected=true}assert(rejected,'Summary accepted source text');
 const full={...document,mode:'evidence'};await validateRecord({id:await digest(full),document:full});
 const record=historyRecord({project:'workshop',skillId:'humanizer',mode:'summary'},'run',{id:'first',createdAt:'2026-09-09T00:00:00Z',score:50,passed:1,total:2,skill:'secret',response:{text:'secret'}});
 await validateRecord(record);assert(!JSON.stringify(record).includes('secret'));
});
Deno.test('Real Chumbo transport: owner clients, idempotent archive, rescoring and resource discovery',async()=>{
 const rows:any[]=[];
 function client(owner:string){return {from(table:string){let filters:any[]=[],insert:any=null,one=false,limit=100;
 const q:any={insert(v:any){insert=v;return q},select(){return q},eq(k:string,v:unknown){filters.push((r:any)=>r[k]===v);return q},gt(k:string,v:number){filters.push((r:any)=>r[k]>v);return q},order(){return q},limit(v:number){limit=v;return q},maybeSingle(){one=true;return q},then(resolve:any){if(table==='skill_loop_history'&&insert){const duplicate=rows.some(r=>r.owner_id===owner&&r.record_hash===insert.record_hash);if(!duplicate)rows.push({...insert,owner_id:owner,sequence:rows.length+1,saved_at:new Date().toISOString()});return Promise.resolve({data:null,error:duplicate?{code:'23505'}:null}).then(resolve);}const data=table==='skill_loop_history'?rows.filter(r=>r.owner_id===owner&&filters.every(fn=>fn(r))).slice(0,limit):[];return Promise.resolve({data:one?(data[0]??null):data,error:null}).then(resolve);}};return q;}};}
 const app=createSupabaseMcpForTesting({server:{name:'Skill Loop test',version:'0.1.0'},resourceUrl:new URL('https://fixture.supabase.co/functions/v1/skill-loop'),auth:{mode:'oauth',scopes:['openid','email']},access:{resolveScopes:()=>['history:read','history:write','review:decide']},register:registerCapabilities},{verifyToken:async(token:string)=>{if(!['alice','bob'].includes(token))throw Error('Rejected');return {token,userClaims:{id:token,role:'authenticated'},jwtClaims:{sub:token,exp:Date.now()/1000+3600}}},createClient:(token:any)=>client(token) as any,createAdminClient:()=>{throw Error('No admin client permitted')},fetch:async()=>Response.json({issuer:'https://fixture.supabase.co/auth/v1',authorization_endpoint:'https://fixture.supabase.co/auth/v1/oauth/authorize',token_endpoint:'https://fixture.supabase.co/auth/v1/oauth/token',registration_endpoint:'https://fixture.supabase.co/auth/v1/oauth/register'}),randomUUID:()=>crypto.randomUUID()});
 const original=globalThis.fetch;globalThis.fetch=(input:any,init:any)=>app.fetch(new Request(input,init));
 try{
  const h={endpoint:'https://fixture.supabase.co/functions/v1/skill-loop',token:'alice'};
  const record=historyRecord({project:'workshop',skillId:'humanizer',mode:'evidence'},'run',{id:'test-run',createdAt:'2026-09-09T00:00:00Z',score:100,suite:{version:1,cases:[{id:'a',input:'x',checks:[{path:'/text',op:'equals',value:'expected'}]}]},response:{outputs:[{id:'a',output:{text:'wrong'}}]}});
  assert((await historyTool(h,'save_history_record',record)).saved);assert((await historyTool(h,'save_history_record',record)).saved);assert(rows.length===1);
  const list=await historyTool(h,'list_skill_history',{project:'workshop',skillId:'humanizer',after:0});assert(list.events.length===1);
  const detail=await historyTool(h,'get_history_record',{id:record.id});assert(detail.qa.score===0,'Server trusted the supplied score');assert(displayedScore({...detail.record,qa:detail.qa}).includes('0.0%'),'Export trusted claimed score');assert(summarize('assessment',{summary:{total:13,untested:13}}).counts.total===13,'Component counts lost');
  const foreign=await historyTool({...h,token:'bob'},'list_skill_history',{project:'workshop',skillId:'humanizer',after:0});assert(foreign.events.length===0);
  let denied=false;try{await historyTool({...h,token:'bob'},'get_history_record',{id:record.id})}catch{denied=true}assert(denied);
 }finally{globalThis.fetch=original;await app.close();}
});
Deno.test('Unauthenticated requests are challenged; CORS is restricted',async()=>{
 const app=createApp('https://fixture.supabase.co'),handler=withCors(app);
 try{const body=JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list',params:{}});const response=await handler(new Request('https://fixture.supabase.co/functions/v1/skill-loop',{method:'POST',headers:{'content-type':'application/json'},body}));assert(response.status===401);assert(response.headers.get('www-authenticate')?.includes('resource_metadata='));assert((await handler(new Request('https://fixture.supabase.co/functions/v1/skill-loop',{method:'OPTIONS',headers:{Origin:'https://evil.example'}}))).status===403);assert((await handler(new Request('https://fixture.supabase.co/functions/v1/skill-loop',{method:'OPTIONS',headers:{Origin:'https://claude.ai'}}))).status===204);}finally{await app.close();}
});
