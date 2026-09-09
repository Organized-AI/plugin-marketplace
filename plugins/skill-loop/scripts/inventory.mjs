import { promises as fs } from 'node:fs';
import { resolve,join,dirname } from 'node:path';
import { homedir } from 'node:os';
import { hash,readJSON } from './shared/io.mjs';
import { packageSnapshot, assessPackage } from './package.mjs';
import { run } from './engine.mjs';
export const defaultRoots=()=>[join(homedir(),'.codex/skills'),join(homedir(),'.claude/skills'),join(homedir(),'.agents/skills'),join(homedir(),'.hermes/skills'),resolve('.agents/skills'),resolve('.claude/skills')];
export async function inventory(roots=defaultRoots()) {
  const skills=[],unavailable=[],seen=new Set();let visited=0;
  async function walk(path,depth=0){
    if(depth>12){unavailable.push({path,reason:'Depth limit reached'});return;}
    let real;try{real=await fs.realpath(path);}catch(e){if(e.code!=='ENOENT')unavailable.push({path,reason:e.code});return;}
    if(seen.has(real))return;seen.add(real);
    if(++visited>10000)throw Error('Inventory exceeds directory limit; choose narrower roots');
    let entries;try{entries=await fs.readdir(real,{withFileTypes:true});}catch(e){unavailable.push({path,reason:e.code});return;}
    if(entries.some(e=>e.name==='SKILL.md'&&e.isFile())) {
      try {
        const text=await fs.readFile(join(real,'SKILL.md'),'utf8');
        const pkg=await packageSnapshot({skill:join(real,'SKILL.md'),base:real});
        const assessment=await assessPackage({},pkg);
        skills.push({packageHash:pkg.hash,packageAssessment:assessment,name:text.match(/^name:\s*(.+)$/m)?.[1]?.trim()??real.split('/').at(-1),path:join(real,'SKILL.md'),contentHash:hash(text),effectiveness:'untested',reason:'No task-specific evaluation has been associated with this inventory entry'});
      }catch(e){unavailable.push({path:join(real,'SKILL.md'),reason:e.code});}
    }
    for(const entry of entries)if((entry.isDirectory()||entry.isSymbolicLink())&&!['node_modules','.git','.venv','__pycache__'].includes(entry.name))await walk(join(real,entry.name),depth+1);
  }
  for(const root of roots)await walk(resolve(root));
  return {scope:roots.map(p=>resolve(p)),skills:skills.sort((a,b)=>a.path.localeCompare(b.path)),unavailable,coverage:'Only listed roots were scanned. Add plugin caches or client-specific roots explicitly; discovery does not establish effectiveness.'};
}
export async function checkAll(registryFile) {
  const registry=await readJSON(registryFile),base=dirname(resolve(registryFile));
  if(registry.version!==1||!Array.isArray(registry.entries)||!registry.entries.length)throw Error('Registry needs version 1 and entries');
  const results=[];
  for(const entry of registry.entries) {
    if(typeof entry.skill!=='string'||!entry.skill)throw Error('Each registry entry needs a skill path');
    if(!entry.config){results.push({skill:entry.skill,status:'untested'});continue;}
    try {
      const config=resolve(base,entry.config),configured=await readJSON(config);
      if(await fs.realpath(resolve(dirname(config),configured.skill))!==await fs.realpath(resolve(base,entry.skill)))throw Error('Registry skill does not match config target');
      const result=await run(config);results.push({skill:entry.skill,status:result.comparison.status,run:result.id,score:result.score,drift:result.comparison.drift,packageAssessment:result.packageAssessment});
    }catch(e){results.push({skill:entry.skill,status:'error',error:e.message});}
  }
  return {results,summary:{total:results.length,untested:results.filter(r=>r.status==='untested').length,errors:results.filter(r=>r.status==='error').length,effectivenessDrift:results.filter(r=>r.status==='regression').length}};
}
