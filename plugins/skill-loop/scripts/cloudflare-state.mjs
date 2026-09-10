// Prepare exact storage operations for the user's existing Cloudflare connector.
// No credentials, network calls, or cloud-account provisioning happen here.
import {promises as fs} from 'node:fs';
import {join,resolve,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {load} from './engine.mjs';
import {packageSnapshot} from './package.mjs';
import {locked,atomic,readJSON} from './shared/io.mjs';
import {canonical} from './history.mjs';
const digest=data=>createHash('sha256').update(data).digest('hex');
const safe=p=>typeof p==='string'&&p.length>0&&!p.includes('\\')&&!p.includes(':')&&!p.includes('\0')&&!p.startsWith('/')&&!p.split('/').some(x=>['','..','.'].includes(x));
const limit=50_000_000,chunkSize=3_000;
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
export const schema=[
 'CREATE TABLE IF NOT EXISTS skill_loop_checkpoints (id TEXT PRIMARY KEY, skill_id TEXT NOT NULL, created_at TEXT NOT NULL, manifest TEXT NOT NULL, chunks INTEGER NOT NULL);',
 'CREATE TABLE IF NOT EXISTS skill_loop_checkpoint_chunks (checkpoint_id TEXT NOT NULL, ordinal INTEGER NOT NULL, sha256 TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(checkpoint_id, ordinal));'
];
export async function captureState(file,{reviewFile}={}){
 const c=await load(file);return locked(c.state,async()=>{
 const pkg=await packageSnapshot(c),files=[],excluded=[...pkg.exclusions,...pkg.issues];let total=0;
 async function add(path,name,expected){if(!safe(name))throw Error('Unsafe archive path');const st=await fs.lstat(path);if(!st.isFile())throw Error('Only regular files can be archived');const b=await fs.readFile(path);if(expected&&digest(b)!==expected)throw Error('Package changed while preparing storage');total+=b.length;if(total>limit||files.length>=5000)throw Error('State exceeds 50 MB or 5000 files');files.push({path:name,sha256:digest(b),bytes:b.length,mode:st.mode&0o777,data:b.toString('base64')});}
 if(pkg.mode==='single-file')await add(c.skill,'package/'+pkg.entry);else for(const f of pkg.files)await add(join(pkg.root,f.path),'package/'+f.path,f.sha256);
 await add(c.suite,'suite.json');
 async function walk(path,prefix){for(const entry of await fs.readdir(path,{withFileTypes:true})){if(entry.name==='lock.json'||entry.name.startsWith('cloudflare-')||entry.name==='history-upload.json'||entry.name==='history-export.json')continue;const p=join(path,entry.name),r=prefix+entry.name;if(entry.isSymbolicLink()){excluded.push({path:r,reason:'Symlink is not a stored regular file'});continue;}if(entry.isDirectory())await walk(p,r+'/');else if(entry.isFile())await add(p,r);}}
 await walk(c.state,'state/');if(reviewFile)await add(resolve(reviewFile),'review-decisions.json');
 const fresh=await packageSnapshot(c);if(fresh.hash!==pkg.hash)throw Error('Package changed during storage export');
 const original=await readJSON(file);
 const portableConfig={version:1,skill:'package/'+pkg.entry,suite:'suite.json',state:'state',runner:{label:c.runner.label},package:{root:'package'},checkpointRestored:true};
 const state={format:'skill-loop-cloudflare-state',version:1,entry:pkg.entry,packageHash:pkg.hash,packageMode:pkg.mode,files,config:portableConfig,connectionReview:{runnerCommandRemoved:!!original.runner?.command,componentTestsRemoved:(original.package?.tests??[]).length,historyConnectionRemoved:!!original.history},excluded,coverage:'Selected package bytes including binaries, suite and saved local state. No environment credentials, installed dependency caches or external linked files. Only current package bytes are guaranteed; older runs may lack full historical binaries. Browser-only decisions must first be exported. Scores remain historical evidence; restore runs no code.'};
 return state;
 });
}
export function storagePlan(state,{backend='d1',skillId='my-skill'}={}){
 if(!['d1','kv','r2'].includes(backend)||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(skillId))throw Error('Choose d1, kv or r2 and a stable skill ID');
 const raw=Buffer.from(canonical(state));if(raw.length>100_000_000)throw Error('State JSON too large');
 const compressed=gzipSync(raw),encoded=compressed.toString('base64'),id=digest(compressed);const chunks=[];for(let i=0;i<encoded.length;i+=chunkSize){const value=encoded.slice(i,i+chunkSize);chunks.push({ordinal:chunks.length,value,sha256:digest(value)});}
 if(chunks.length>30000)throw Error('Checkpoint has too many storage chunks');
 const manifest={format:'skill-loop-cloudflare-checkpoint',version:2,id,skillId,createdAt:new Date().toISOString(),encoding:'gzip-base64',bytes:compressed.length,rawBytes:raw.length,contentHash:digest(raw),chunks:chunks.map(({ordinal,sha256})=>({ordinal,sha256})),files:state.files.length,excluded:state.excluded,coverage:state.coverage};
 if(backend==='d1'&&Buffer.byteLength(JSON.stringify(manifest),'utf8')>2400)throw Error('D1 checkpoint manifest exceeds the safe native-connector transfer size. Use a file-capable storage adapter for this package; nothing was saved.');
 const namespace='skill-loop/v2/'+skillId+'/'+id;const checkpointKey='v2:'+skillId+':'+id;
 const writes=backend==='d1'?chunks.map(c=>({sql:`INSERT OR IGNORE INTO skill_loop_checkpoint_chunks(checkpoint_id,ordinal,sha256,value) SELECT ${quote(checkpointKey)},${c.ordinal},${quote(c.sha256)},value FROM (SELECT ${quote(c.value)} AS value) WHERE length(value)=${c.value.length};`})):chunks.map(c=>({key:namespace+'/chunk-'+String(c.ordinal).padStart(6,'0'),value:c.value}));
 const commit=backend==='d1'?{sql:`INSERT OR IGNORE INTO skill_loop_checkpoints(id,skill_id,created_at,manifest,chunks) SELECT ${quote(checkpointKey)},${quote(skillId)},${quote(manifest.createdAt)},${quote(JSON.stringify(manifest))},${chunks.length} WHERE (SELECT COUNT(*) FROM skill_loop_checkpoint_chunks WHERE checkpoint_id=${quote(checkpointKey)})=${chunks.length};`}:{key:namespace+'/manifest.json',value:JSON.stringify(manifest)};
 const reads=backend==='d1'?chunks.map(c=>({sql:`SELECT ordinal,sha256,value FROM skill_loop_checkpoint_chunks WHERE checkpoint_id=${quote(checkpointKey)} AND ordinal=${c.ordinal};`})):writes.map(x=>({key:x.key}));
 return {version:1,backend,manifest,setup:backend==='d1'?schema:[],writes,commit,reads,readManifest:backend==='d1'?{sql:`SELECT manifest FROM skill_loop_checkpoints WHERE id=${quote(checkpointKey)};`}:{key:commit.key},list:backend==='d1'?{sql:`SELECT id,skill_id,created_at,chunks FROM skill_loop_checkpoints WHERE skill_id=${quote(skillId)} ORDER BY created_at DESC;`}:{prefix:'skill-loop/v2/'+skillId+'/'},status:'prepared-not-saved',verification:'Read back the manifest and EVERY chunk through the same connector, then run cloudflare-verify. Only then report saved. KV may require delayed readback; do not overwrite mutable latest-state keys. R2 requires object write/read, not only bucket management.'};
}
export function verifyState(manifest,returnedChunks){
 if(manifest?.format!=='skill-loop-cloudflare-checkpoint'||![1,2].includes(manifest.version)||!Array.isArray(manifest.chunks)||manifest.chunks.length>30000||!Number.isInteger(manifest.rawBytes)||manifest.rawBytes<1||manifest.rawBytes>100_000_000||!Number.isInteger(manifest.bytes)||manifest.bytes<1||manifest.bytes>100_000_000||!Array.isArray(returnedChunks)||returnedChunks.length!==manifest.chunks.length)throw Error('Incomplete or invalid checkpoint manifest');
 const chunks=[...returnedChunks].sort((a,b)=>a.ordinal-b.ordinal);
 let encoded='';for(let i=0;i<chunks.length;i++){const c=chunks[i],m=manifest.chunks[i];if(c.ordinal!==i||m.ordinal!==i||typeof c.value!=='string'||c.value.length>(manifest.version===1?48000:chunkSize)||digest(c.value)!==m.sha256)throw Error('Cloud storage readback mismatch');if(encoded.length+c.value.length>Math.ceil(manifest.bytes/3)*4)throw Error('Encoded checkpoint exceeds manifest size');encoded+=c.value;}
 const data=Buffer.from(encoded,'base64');if(data.toString('base64')!==encoded||data.length!==manifest.bytes||digest(data)!==manifest.id)throw Error('Checkpoint identity mismatch');
 const raw=gunzipSync(data,{maxOutputLength:100_000_000});if(raw.length!==manifest.rawBytes||digest(raw)!==manifest.contentHash)throw Error('Decompressed state identity mismatch');
 const state=JSON.parse(raw);if(state.format!=='skill-loop-cloudflare-state'||state.version!==1||!Array.isArray(state.files)||state.files.length>5000||!safe(state.entry))throw Error('Unsupported stored state');
 const paths=new Set();let total=0;for(const f of state.files){if(!safe(f.path)||paths.has(f.path.toLowerCase())||typeof f.data!=='string')throw Error('Invalid stored file path');paths.add(f.path.toLowerCase());const b=Buffer.from(f.data,'base64');total+=b.length;if(total>limit||b.toString('base64')!==f.data||digest(b)!==f.sha256||b.length!==f.bytes||!Number.isInteger(f.mode)||f.mode<0||f.mode>0o777)throw Error('Stored file integrity mismatch');}
 if(!paths.has(('package/'+state.entry).toLowerCase())||!paths.has('suite.json'))throw Error('Required input missing');
 return state;
}
export async function exportCloudflare(file,options={}){const state=await captureState(file,options),plan=storagePlan(state,options),c=await load(file),path=join(c.state,'cloudflare-plan.json');await atomic(path,plan);return {path,backend:plan.backend,id:plan.manifest.id,chunks:plan.manifest.chunks.length,files:state.files.length,excluded:state.excluded,status:plan.status};}
export async function verifyCloudflare(receipt){const {manifest,chunks}=await readJSON(receipt);const state=verifyState(manifest,chunks);return {verified:true,id:manifest.id,files:state.files.length,note:'Supplied readback matches the checkpoint. The assistant must have fetched these values from the selected Cloudflare account; local values alone do not prove remote persistence.'};}
export async function restoreCloudflare(receipt,directory){const {manifest,chunks}=await readJSON(receipt),state=verifyState(manifest,chunks),dest=resolve(directory);if(await fs.lstat(dest).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;}))throw Error('Choose a new restore directory');await fs.mkdir(dirname(dest),{recursive:true});const stage=await fs.mkdtemp(join(dirname(dest),'.skill-loop-restore-'));try{for(const f of state.files){const p=join(stage,f.path);await fs.mkdir(dirname(p),{recursive:true});await fs.writeFile(p,Buffer.from(f.data,'base64'),{mode:f.mode});}
 // Stored config is data, not executable authority. Rebuild a non-executing local config.
 const config={version:1,skill:'package/'+state.entry,suite:'suite.json',state:'state',runner:{label:'Restored Skill Loop · reconnect and retest'},package:state.packageMode==='single-file'?{mode:'single-file'}:{root:'package'}};
 await atomic(join(stage,'skill-loop.json'),config);await fs.rename(stage,dest);return {workspace:dest,config:join(dest,'skill-loop.json'),files:state.files.length,executed:false,note:'Historical files restored into a new workspace. Reconnect the runner and review component checks before new testing; no active installed skill was replaced.'};}catch(e){await fs.rm(stage,{recursive:true,force:true});throw e;}}
