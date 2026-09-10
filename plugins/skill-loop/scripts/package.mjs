// Package assessment is independent of any assistant or GTM-specific rules.
import { promises as fs } from 'node:fs';
import { resolve, dirname, basename, relative, join, extname, sep, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { hash, command } from './shared/io.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
const within=(root,p)=>p===root||p.startsWith(root+sep);
const ignored=new Set(['.git','node_modules','.venv','venv','__pycache__','.skill-loop']);
const support=new Set(['references','reference','resources','scripts','commands','hooks','assets','.claude-plugin','.codex-plugin','package.json','package-lock.json','requirements.txt','pyproject.toml']);
const secret=n=>/^\.env(?:\.|$)/i.test(n)||/^(credentials|secrets|tokens)(?:\.|$)/i.test(n)||/\.(pem|key)$/i.test(n);
function kind(path,entry){if(path===entry)return 'instructions';if(/(^|\/)hooks?(\/|\.)/.test(path))return 'hook';if(/(^|\/)commands\//.test(path))return 'command';if(/\.(m?[cj]s|py|sh|bash|ps1)$/i.test(path))return 'script';if(/(package(?:-lock)?\.json|requirements.*\.txt|pyproject\.toml|.*lock)$/.test(path))return 'dependency';if(/\.(md|markdown|txt)$/i.test(path))return 'reference';return 'resource';}
export async function packageSnapshot(config,{entryText}={}) {
 const skill=await fs.realpath(resolve(config.skill)),entryDir=dirname(skill);
 if(config.package?.mode==='single-file')return {version:1,mode:'single-file',root:entryDir,entry:basename(skill),hash:hash(entryText??await fs.readFile(skill,'utf8')),files:[],issues:[],exclusions:[],coverage:'Explicit single-file mode; associated components are not assessed'};
 let root=config.package?.root?resolve(config.base??entryDir,config.package.root):entryDir;
 if(!config.package?.root&&/^skill\.(md|markdown|txt)$/i.test(basename(skill))) {
  let dir=entryDir;
  for(let i=0;i<4;i++) {
   if(await fs.stat(join(dir,'.claude-plugin/plugin.json')).then(()=>true,()=>false)||await fs.stat(join(dir,'.codex-plugin/plugin.json')).then(()=>true,()=>false)){root=dir;break;}
   if(await fs.stat(join(dir,'.git')).then(()=>true,()=>false))break;
   const parent=dirname(dir);if(parent===dir)break;dir=parent;
  }
 }
 root=await fs.realpath(root);
 if(!within(root,await fs.realpath(skill)))throw Error('Skill entrypoint must be inside the package root');
 const entry=relative(root,skill).split(sep).join('/'),files=[],issues=[],exclusions=[],seen=new Set();let bytes=0;
 const whole=!!config.package?.root||/^skill\.(md|markdown|txt)$/i.test(basename(skill));
 const excluded=await Promise.all([config.suite,config.state,config.configFile,...(config.package?.exclude??[]).map(p=>resolve(root,p))].filter(Boolean).map(async p=>fs.realpath(resolve(p)).catch(()=>resolve(p))));
 async function add(path,force=false,depth=0){
  if(seen.has(path))return;seen.add(path);
  const rel=relative(root,path).split(sep).join('/');
  if(!within(root,path)){issues.push({path:rel,status:'blocked',reason:'Reference leaves the selected package root'});return;}
  if(excluded.some(p=>within(p,path))||ignored.has(basename(path))||secret(basename(path))){exclusions.push({path:rel,reason:'Evaluation state, excluded path, dependency cache, or sensitive filename'});return;}
  const st=await fs.lstat(path).catch(e=>{if(e.code==='ENOENT'){issues.push({path:rel,status:'blocked',reason:'Referenced file is missing'});return null;}throw e;});if(!st)return;
  if(st.isSymbolicLink()){issues.push({path:rel,status:'blocked',reason:'Symlink must be resolved into a reviewed package copy'});return;}
  if(st.isDirectory()&&rel.split('/').filter(Boolean).length>25){issues.push({path:rel,status:'blocked',reason:'Directory nesting exceeds assessment depth limit; partial inventory retained'});return;}
  if(st.isDirectory()){for(const n of (await fs.readdir(path)).sort()){if(whole||depth>0||force||support.has(n)||resolve(path,n)===skill)await add(join(path,n),force,depth+1);else exclusions.push({path:relative(root,join(path,n)),reason:'Outside the custom-entry support-directory scan; use package.root to include all root files'});}return;}
  if(!st.isFile())return;
  if(files.length>=2000||st.size>20_000_000||(bytes+=st.size)>50_000_000)throw Error('Package exceeds assessment limits; select a narrower package root');
  const buf=path===skill&&entryText!==undefined?Buffer.from(entryText):await fs.readFile(path);
  const isText=!buf.includes(0)&&['.md','.markdown','.txt','.json','.yaml','.yml','.toml','.js','.mjs','.cjs','.py','.sh','.bash','.ps1','.html','.css','.csv'].includes(extname(path).toLowerCase());
  const content=isText&&buf.length<=200_000?buf.toString('utf8'):undefined;
  files.push({path:rel,kind:kind(rel,entry),sha256:digest(buf),bytes:buf.length,mode:st.mode&0o777,...(content===undefined?{}:{content})});
  if(content!==undefined&&/\.(md|markdown|txt)$/i.test(path)) {
   const refs=[...content.matchAll(/\]\(([^\s)]+)(?:\s+[^)]*)?\)/g)].map(m=>m[1]);
   for(const m of content.matchAll(/`((?:\.\.?\/|references?\/|resources\/|scripts\/|assets\/|commands\/|hooks\/)[^`\s]+\.[a-z0-9]+)`/gi))refs.push(m[1]);
   for(let ref of refs){if(/^[a-z][a-z\d+.-]*:/i.test(ref)||ref.startsWith('#'))continue;ref=ref.split('#')[0];if(!ref||/[<>{}*]/.test(ref))continue;await add(resolve(dirname(path),ref),true,depth+1);}
  }
 }
 await add(root);
 if(!files.some(f=>f.path===entry))throw Error('Package exclusions removed the skill entrypoint');
 files.sort((a,b)=>a.path.localeCompare(b.path));
 const manifest=files.map(({path,sha256,mode})=>({path,sha256,mode}));
 return {version:1,mode:'package',root,entry,hash:hash(manifest),files,issues,exclusions,coverage:(whole?'Complete selected-root inventory':'Custom entrypoint plus conventional support directories; other root files are listed as exclusions')+'; bounded local reference discovery and explicit configured execution checks. Inventory is not proof of execution or complete semantic dependency discovery.'};
}
export function packageContext(pkg) {
 let used=0;
 return {...pkg,root:undefined,files:pkg.files.map(f=>{const content=f.content;if(content===undefined||used+Buffer.byteLength(content)>1_000_000)return {...f,content:undefined,contextStatus:'not-supplied',reason:content===undefined?'Binary, unsupported text format, or oversized file; metadata inventoried':'Text context budget exceeded; load on demand',omissionType:content===undefined?'file-content-unavailable':'text-budget',requiresContentReview:['instructions','reference','script','command','hook','dependency'].includes(f.kind)};used+=Buffer.byteLength(content);return {...f,contextStatus:'supplied'};})};
}
async function executeSnapshotTest(pkg,test) {
 const copy=await fs.mkdtemp(join(tmpdir(),'skill-loop-component-'));
 try {
  for(const f of pkg.files) {
   const original=resolve(pkg.root,f.path),dest=resolve(copy,f.path);
   if(!within(copy,dest)||!within(pkg.root,original))throw Error('Invalid snapshot path');
   const st=await fs.lstat(original);if(!st.isFile()||!within(pkg.root,await fs.realpath(original)))throw Error('Package path changed before execution');
   const bytes=f.path===pkg.entry&&f.content!==undefined?Buffer.from(f.content):await fs.readFile(original);
   if(digest(bytes)!==f.sha256)throw Error('Package bytes changed before execution');
   await fs.mkdir(dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);await fs.chmod(dest,f.mode);
  }
  const argv=await Promise.all(test.command.map(async arg=>{
   if(isAbsolute(arg)) {const canonical=await fs.realpath(arg).catch(()=>arg);if(within(pkg.root,canonical))return join(copy,relative(pkg.root,canonical));}
   if(arg.includes(pkg.root))throw Error('Embedded source-package path cannot be safely mapped to the test snapshot');
   return arg;
  }));
  return await command(argv,'',{cwd:join(copy,relative(pkg.root,await fs.realpath(resolve(pkg.root,test.cwd??'.')))),timeoutMs:test.timeoutMs??30000});
 }finally{await fs.rm(copy,{recursive:true,force:true});}
}
export async function assessPackage(config,pkg,{execute=false}={}) {
 const tests=config.package?.tests??[],results=[];
 if(!Array.isArray(tests))throw Error('package.tests must be an array');
 const ids=new Set();
 for(const t of tests){
  if(!t||typeof t.id!=='string'||ids.has(t.id)||typeof t.component!=='string'||!['script','command','hook','tool'].includes(t.kind))throw Error('Package tests need unique ids, component paths, and a supported kind');ids.add(t.id);
  const component=pkg.files.find(f=>f.path===t.component);
  if(!component&&t.kind!=='tool')throw Error('Package test targets an unknown component');
  if(!execute){results.push({id:t.id,component:t.component,kind:t.kind,status:'untested',reason:'Execution check configured but not run'});continue;}
  if(t.kind!=='script') {results.push({id:t.id,component:t.component,kind:t.kind,status:'unsupported',reason:'This runner has no verified host event/tool adapter; script execution cannot certify this integration'});continue;}
  if(!Array.isArray(t.command)||!t.command.length||t.command.some(v=>typeof v!=='string')||!Array.isArray(t.stdoutContains)||!t.stdoutContains.length||t.stdoutContains.some(v=>typeof v!=='string'))throw Error('Script tests need an explicitly configured command array and nonempty stdoutContains assertions');
  const cwd=resolve(pkg.root,t.cwd??'.');if(!within(pkg.root,cwd)||!within(pkg.root,await fs.realpath(cwd)))throw Error('Test cwd must remain inside package root');
  if(t.timeoutMs!==undefined&&(!Number.isInteger(t.timeoutMs)||t.timeoutMs<1||t.timeoutMs>120000))throw Error('Script test timeout must be 1–120000 ms');
  try {const out=await executeSnapshotTest(pkg,t);const checks=t.stdoutContains.map(expected=>({expected,passed:out.includes(expected)}));results.push({id:t.id,component:t.component,kind:t.kind,status:checks.every(c=>c.passed)?'passed':'failed',checks,stdout:out.slice(0,20000),exitCode:0,runtime:process.version,executionScope:'copied package snapshot; process is not OS-sandboxed'});}
  catch(e){results.push({id:t.id,component:t.component,kind:t.kind,status:'failed',reason:e.message,runtime:process.version,executionScope:'copied package snapshot; process is not OS-sandboxed'});}
 }
 const components=pkg.files.map(f=>{const matched=results.filter(t=>t.component===f.path);return {path:f.path,kind:f.kind,sha256:f.sha256,status:matched.length?(matched.some(t=>t.status==='failed')?'failed':matched.every(t=>t.status==='passed')?'passed':matched.some(t=>t.status==='unsupported')?'unsupported':'untested'):'untested',reason:matched.length?'See configured component tests':f.kind==='instructions'?'Behavioral checks are reported separately':'Inventoried; no component execution or reference-specific test recorded'};});
 return {version:1,packageHash:pkg.hash,mode:pkg.mode,coverage:pkg.coverage,components,issues:pkg.issues,exclusions:pkg.exclusions,tests:results,fullyVerified:false,summary:{total:components.length,tested:components.filter(c=>['passed','failed'].includes(c.status)).length,untested:components.filter(c=>c.status==='untested').length,unsupported:components.filter(c=>c.status==='unsupported').length,blocked:pkg.issues.length},note:'No universal package certification. Supporting prose and required host integrations still need their own acceptance evidence.'};
}
