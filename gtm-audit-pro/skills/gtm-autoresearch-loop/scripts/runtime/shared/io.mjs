// Adapted from GTM Autoresearch runner.mjs, codex/reuse-gtm-autoresearch.
import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export async function atomic(path, data) {
  await fs.mkdir(dirname(path), {recursive:true, mode:0o700});
  const tmp = `${path}.${randomUUID()}.tmp`;
  const mode=await fs.stat(path).then(s=>s.mode&0o777,e=>{if(e.code==='ENOENT')return 0o600;throw e;});
  try { await fs.writeFile(tmp, typeof data === 'string' ? data : JSON.stringify(data,null,2)+'\n', {mode}); await fs.chmod(tmp,mode); await fs.rename(tmp,path); }
  finally { await fs.rm(tmp,{force:true}); }
}
export async function readJSON(path, fallback) {
  try { return JSON.parse(await fs.readFile(path,'utf8')); }
  catch(e) { if(e.code==='ENOENT' && fallback!==undefined)return fallback; throw e; }
}
export function command(argv, input='', {timeoutMs=120000,cwd,env=process.env}={}) {
  if(!Array.isArray(argv)||!argv.length||argv.some(a=>typeof a!=='string'))throw Error('Runner command must be an argv array');
  return new Promise((resolve,reject)=>{
    const child=spawn(argv[0],argv.slice(1),{cwd,env,shell:false,stdio:['pipe','pipe','pipe'],detached:process.platform!=='win32'});
    let output='',bytes=0,done=false;
    const kill=()=>{try{process.platform==='win32'?child.kill('SIGKILL'):process.kill(-child.pid,'SIGKILL');}catch{}};
    const finish=error=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(output.trim());};
    const timer=setTimeout(()=>{kill();finish(Error('Runner timed out'));},timeoutMs);
    child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>5_000_000){kill();finish(Error('Runner output exceeds 5 MB'));}else output+=chunk;});
    child.stderr.on('data',()=>{});
    child.stdin.on('error',()=>{});
    child.on('error',()=>finish(Error('Runner could not start; check its executable')));
    child.on('close',code=>finish(code===0?null:Error(`Runner failed with exit code ${code}`)));
    child.stdin.end(input);
  });
}
export async function locked(folder, fn) {
  await fs.mkdir(folder,{recursive:true,mode:0o700});
  const path=folder+'/lock.json';
  const handle=await fs.open(path,'wx',0o600).catch(e=>{if(e.code==='EEXIST')throw Error('Workspace busy; inspect lock.json before recovering a stopped process');throw e;});
  await handle.writeFile(JSON.stringify({pid:process.pid}));await handle.close();
  try{return await fn();}finally{await fs.unlink(path);}
}
