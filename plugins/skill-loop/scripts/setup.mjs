import {promises as fs} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {overview} from './overview.mjs';
import {apiQuery} from './cloudflare-backup.mjs';
import {atomic,readJSON} from './shared/io.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const sha=x=>createHash('sha256').update(x).digest('hex');
export async function createSetup(folder,assistant,roots,productFile=join(here,'../setup/product.json')) {
 const product=await readJSON(productFile);
 if(product.version!==1||!product.assistants?.includes(assistant)||!product.brand?.name)throw Error('Choose a supported assistant and a valid product configuration');
 if(!Array.isArray(roots)||!roots.length)throw Error('Provide the skill folders this assistant can read');
 folder=resolve(folder);await fs.mkdir(folder,{recursive:true});
 if((await fs.readdir(folder)).length)throw Error('Choose a new setup directory. Existing profiles are resumed, never overwritten.');
 const profile={version:1,id:randomUUID(),assistant,roots:roots.map(p=>resolve(p)),product,productHash:sha(JSON.stringify(product)),createdAt:new Date().toISOString(),checks:{}};
 const file=join(folder,'setup.json');await fs.writeFile(file,JSON.stringify(profile,null,2)+'\n',{flag:'wx',mode:0o600});
 return setupStatus(file);
}
async function load(file){const p=await readJSON(file);if(p.version!==1||!p.id||!Array.isArray(p.roots)||p.productHash!==sha(JSON.stringify(p.product)))throw Error('Invalid or changed setup profile; create a reviewed replacement profile');return p;}
export async function setupStatus(file){
 const p=await load(file), initial=p.checks.initial;
 let reportExists=false; if(initial?.report)try{await fs.access(initial.report);reportExists=true;}catch{}
 return {profile:resolve(file),assistant:p.assistant,productVersion:p.product.version,
  steps:[{id:'assistant',label:'Choose your assistant',status:'selected',detail:'Selection does not verify assistant authentication'},
   {id:'skills',label:'Check your skills',status:reportExists&&initial.skills>0?'verified':'needs-check',detail:initial??'No check has run'},
   {id:'history',label:'Connect optional history',status:p.checks.storage?'previously-verified':'not-connected',detail:p.checks.storage??'Use your own Cloudflare account; local QA is available without storage'},
   {id:'cloud',label:'Enable cloud execution',status:'not-implemented',detail:'Cloudflare Sandbox deployment and OAuth onboarding are a separate implementation milestone'}],
  readyForLocalOverview:reportExists&&initial.skills>0,cloudReady:false,
  next:reportExists&&initial.skills>0?'Run setup-check again to refresh your skills; connect history when wanted':'Run setup-check to inspect these sources and create your first HTML report'};
}
export async function checkSetup(file){
 const p=await load(file);
 const result=await overview(join(dirname(resolve(file)),'runs',randomUUID()),p.roots);
 p.checks.initial={...result,checkedAt:new Date().toISOString()};await atomic(file,p);return setupStatus(file);
}
// This probe is explicit and synthetic. A read-only identity check is insufficient.
export async function probeStorage(query,profileId){
 const id='setup:'+profileId+':'+randomUUID(),value=JSON.stringify({kind:'skill-loop-setup-probe',nonce:randomUUID()}),digest=sha(value);
 await query('CREATE TABLE IF NOT EXISTS skill_loop_setup_probes (id TEXT PRIMARY KEY, value TEXT NOT NULL, sha256 TEXT NOT NULL)');
 try {
  await query('INSERT INTO skill_loop_setup_probes(id,value,sha256) VALUES (?,?,?)',[id,value,digest]);
  const rows=await query('SELECT value,sha256 FROM skill_loop_setup_probes WHERE id=?',[id]);
  if(rows.length!==1||rows[0].value!==value||rows[0].sha256!==digest||sha(rows[0].value)!==digest)throw Error('Storage readback mismatch; setup not verified');
 }finally{await query('DELETE FROM skill_loop_setup_probes WHERE id=?',[id]);}
 return {verifiedAt:new Date().toISOString(),test:'synthetic D1 write/read/hash/delete',sha256:digest};
}
export async function connectSetup(file,{env=process.env,queryFactory=apiQuery}={}){
 const p=await load(file);
 const accountId=env.CLOUDFLARE_ACCOUNT_ID,databaseId=env.CLOUDFLARE_D1_DATABASE_ID;
 // Invalidate prior success before checking a replacement or expired connection.
 delete p.checks.storage;await atomic(file,p);
 const query=queryFactory({accountId,databaseId,token:env.CLOUDFLARE_API_TOKEN});
 const receipt=await probeStorage(query,p.id);
 p.checks.storage={...receipt,accountId,databaseId,backend:'cloudflare-d1',transport:'direct-adapter'};
 await atomic(file,p);return setupStatus(file);
}
