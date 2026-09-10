import {captureState,storagePlan,verifyState,schema} from './cloudflare-state.mjs';
import {atomic} from './shared/io.mjs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const sha=s=>createHash('sha256').update(s).digest('hex');
export async function backupPlan(config,skillId){
 const p=storagePlan(await captureState(config),{backend:'r2',skillId});
 if(p.manifest.bytes>1_000_000||Buffer.byteLength(JSON.stringify(p.manifest))>90_000)throw Error('Direct D1 backup exceeds supported size; use a file-store adapter. Nothing saved.');
 return {manifest:p.manifest,chunks:p.writes.map((x,i)=>({ordinal:i,value:x.value,sha256:p.manifest.chunks[i].sha256}))};
}
export function apiQuery({accountId,databaseId,token}){
 if(!/^[a-f0-9]{32}$/.test(accountId??'')||! /^[a-f0-9-]{36}$/.test(databaseId??'')||!token)throw Error('Configure CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN in the execution host. Never paste credentials into HTML or chat.');
 return async(sql,params=[])=>{
 const res=await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({sql,params}),signal:AbortSignal.timeout(30000)});
 if(!res.ok)throw Error(`Cloudflare request failed (${res.status}); no verified backup`);
 const data=await res.json();if(!data.success||!data.result?.[0]?.success)throw Error('Cloudflare query unsuccessful; no verified backup');return data.result[0].results;
 };
}
export async function saveBackup(plan,query){
 verifyState(plan.manifest,plan.chunks);
 const m=plan.manifest,key='v2:'+m.skillId+':'+m.id;
 for(const sql of schema)await query(sql);
 for(const c of plan.chunks){
 await query('INSERT OR IGNORE INTO skill_loop_checkpoint_chunks(checkpoint_id,ordinal,sha256,value) VALUES (?,?,?,?)',[key,c.ordinal,c.sha256,c.value]);
 const rows=await query('SELECT ordinal,sha256,value FROM skill_loop_checkpoint_chunks WHERE checkpoint_id=? AND ordinal=?',[key,c.ordinal]);
 if(rows.length!==1||rows[0].value!==c.value||sha(rows[0].value)!==c.sha256)throw Error('Chunk readback mismatch; checkpoint not committed. Existing data preserved.');
 }
 await query('INSERT OR IGNORE INTO skill_loop_checkpoints(id,skill_id,created_at,manifest,chunks) VALUES (?,?,?,?,?)',[key,m.skillId,m.createdAt,JSON.stringify(m),plan.chunks.length]);
 return readBackup(key,query,m.id);
}
export async function readBackup(key,query,expectedId){
 if(typeof key!=='string'||!/^v2:[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}:[a-f0-9]{64}$/.test(key))throw Error('Invalid checkpoint identity');
 const rows=await query('SELECT manifest FROM skill_loop_checkpoints WHERE id=?',[key]);if(rows.length!==1)throw Error('Checkpoint not found');
 const manifest=JSON.parse(rows[0].manifest);if(key!=='v2:'+manifest.skillId+':'+manifest.id||(expectedId&&manifest.id!==expectedId))throw Error('Checkpoint identity mismatch');
 const chunks=await query('SELECT ordinal,sha256,value FROM skill_loop_checkpoint_chunks WHERE checkpoint_id=? ORDER BY ordinal',[key]);
 verifyState(manifest,chunks);return {manifest,chunks};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
 const [action,input,output,skillId='my-skill']=process.argv.slice(2);if(!['save','read'].includes(action)||!input||!output)throw Error('Usage: node cloudflare-backup.mjs save CONFIG RECEIPT SKILL_ID | read CHECKPOINT_KEY RECEIPT');
 const query=apiQuery({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,databaseId:process.env.CLOUDFLARE_D1_DATABASE_ID,token:process.env.CLOUDFLARE_API_TOKEN});
 const receipt=action==='save'?await saveBackup(await backupPlan(input,skillId),query):await readBackup(input,query);
 await atomic(output,receipt);console.log(JSON.stringify({verified:true,checkpoint:'v2:'+receipt.manifest.skillId+':'+receipt.manifest.id,files:receipt.manifest.files,receipt:output,coverage:receipt.manifest.coverage,excluded:receipt.manifest.excluded}));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
