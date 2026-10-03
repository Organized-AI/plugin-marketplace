#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { loadConfig, capture, runSnapshot, acquireLock, watch, readJSON } from './runner.mjs';

const [action,configPath]=process.argv.slice(2);
if(action==='render'){
  // Re-render audit.html and hyperframes/index.html for an existing run folder.
  try{
    if(!configPath)throw Error('Usage: node cli.mjs render RUN_FOLDER');
    const { htmlReport, hyperframes } = await import('./report-html.mjs');
    const { atomic } = await import('./runner.mjs');
    const run=resolve(configPath),report=await readJSON(join(run,'audit.json')),snapshot=await readJSON(join(run,'snapshot.json'),{});
    await atomic(join(run,'audit.html'),htmlReport(report,snapshot));await atomic(join(run,'hyperframes','index.html'),hyperframes(report,snapshot));
    process.stdout.write(JSON.stringify({html:join(run,'audit.html'),hyperframes:join(run,'hyperframes','index.html')})+'\n');
  }catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
  process.exit();
}
if(action==='atlas'){
  // Container Atlas with Audit and GTM auto tabs:
  // node cli.mjs atlas OUT.html web.json [server.json] [--compiled gtm.js] [--observed scan.json,...] [--attribution attr.json,...] [--title T] [--fragment]
  try{
    const args=process.argv.slice(3),files=[],opt={};
    for(let i=0;i<args.length;i++){if(args[i].startsWith('--')){const k=args[i].slice(2);opt[k]=k==='fragment'?true:args[++i];}else files.push(args[i]);}
    const [out,...exports]=files;
    if(!out||!exports.length)throw Error('Usage: node cli.mjs atlas OUT.html web.json [server.json] [--compiled gtm.js] [--observed a.json,b.json] [--attribution c.json] [--title TITLE] [--fragment]');
    const { audit } = await import('./audit.mjs'), { atlas } = await import('./atlas.mjs'), { atomic } = await import('./runner.mjs');
    const list=v=>v?String(v).split(',').filter(Boolean):[];
    const items=await Promise.all(exports.map(async f=>{const snapshot=await readJSON(resolve(f));return{snapshot,report:audit(snapshot)};}));
    const live={compiled:opt.compiled?await fs.readFile(resolve(opt.compiled),'utf8'):null,observed:await Promise.all(list(opt.observed).map(f=>readJSON(resolve(f)))),attribution:await Promise.all(list(opt.attribution).map(f=>readJSON(resolve(f))))};
    await atomic(resolve(out),atlas(items,{title:opt.title,fragment:!!opt.fragment,live}));
    process.stdout.write(JSON.stringify({atlas:resolve(out),containers:items.length,live:!!(live.compiled||live.observed.length),published:false})+'\n');
  }catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
  process.exit();
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
  if(!['audit','loop','watch','start','status','stop','unlock'].includes(action)||!configPath)throw Error('Usage: node cli.mjs audit|loop|watch|start|status|stop|unlock CONFIG.json');
  const config=await loadConfig(resolve(configPath));
  const lockPath=join(config.stateDir,'lock.json'),stopPath=join(config.stateDir,'stop');
  const alive=pid=>{try{process.kill(pid,0);return true;}catch(e){return e.code==='EPERM';}};
  if(action==='status'){
    const lock=await readJSON(lockPath,null),status=await readJSON(join(config.stateDir,'status.json'),{});
    process.stdout.write(JSON.stringify({...status,lock,running:!!lock&&alive(lock.pid),stateDir:config.stateDir})+'\n');
  }else if(action==='unlock'){
    const lock=await readJSON(lockPath,null);
    if(lock&&alive(lock.pid))throw Error('Recorded process is still alive; refusing unlock');
    if(lock)await fs.unlink(lockPath);
    process.stdout.write('Stale lock removed\n');
  }else if(action==='stop'){
    const lock=await readJSON(lockPath,null);
    if(!lock||!alive(lock.pid))throw Error('No live watcher found; inspect status/unlock if needed');
    await fs.writeFile(stopPath,'stop\n',{mode:0o600});
    process.stdout.write('Stop requested; current capture/round finishes before exit. Check status.\n');
  }else if(action==='start'){
    if(await readJSON(lockPath,null))throw Error('Target already locked; inspect status');
    await fs.mkdir(config.stateDir,{recursive:true,mode:0o700});
    const log=await fs.open(join(config.stateDir,'watch.log'),'a',0o600);
    const child=spawn(process.execPath,[fileURLToPath(import.meta.url),'watch',resolve(configPath)],{detached:true,stdio:['ignore',log.fd,log.fd]});
    child.unref();await log.close();
    let ready=false;
    for(let i=0;i<50;i++){
      await sleep(100);
      const lock=await readJSON(lockPath,null);
      if(lock?.pid===child.pid){ready=true;break;}
      if(!alive(child.pid))break;
    }
    if(!ready)throw Error('Watcher did not acquire target lock; inspect watch.log');
    process.stdout.write(JSON.stringify({started:true,pid:child.pid,stateDir:config.stateDir,firstAuditPending:true})+'\n');
  }else if(action==='watch'){
    let stopping=false;
    process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
    const shouldStop=async()=>stopping||await fs.stat(stopPath).then(()=>true,()=>false);
    await watch(config,{shouldStop,onStarted:()=>fs.rm(stopPath,{force:true}),wait:async ms=>{for(let elapsed=0;elapsed<ms&&!await shouldStop();elapsed+=250)await sleep(Math.min(250,ms-elapsed));}});
  }else{
    config.optimize=action==='loop';
    if(config.optimize&&!config.mutationCommand)throw Error('loop requires mutationCommand');
    const release=await acquireLock(config);
    try{const result=await runSnapshot(config,await capture(config));process.stdout.write(JSON.stringify({folder:result.folder,score:result.report.score,published:false})+'\n');}finally{await release();}
  }
}catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
