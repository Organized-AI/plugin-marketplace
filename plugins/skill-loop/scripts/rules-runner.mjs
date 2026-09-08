import { isDeepStrictEqual } from 'node:util';
// Declarative execution: no model, dynamic code evaluation, or shell execution.
export function evaluate(policy,input) {
  if(policy.version!==1||!Array.isArray(policy.rules)||!Object.hasOwn(policy,'defaultOutput'))throw Error('Rules need version 1, rules and defaultOutput');
  const allowed=['equals','exists','gt','gte','lt','lte'];
  for(const rule of policy.rules) {
    if(!Array.isArray(rule.when)||!rule.when.length||!Object.hasOwn(rule,'output'))throw Error('Each rule needs conditions and output');
    for(const c of rule.when)if(typeof c.path!=='string'||(c.path!==''&&!c.path.startsWith('/'))||!allowed.includes(c.op)||(c.op!=='exists'&&!Object.hasOwn(c,'value')))throw Error('Invalid rule condition');
  }
  const read=path=>{
    let value=input;
    for(const key of path===''?[]:path.slice(1).split('/').map(s=>s.replaceAll('~1','/').replaceAll('~0','~'))) {
      if(!value||typeof value!=='object'||!Object.hasOwn(value,key))return undefined;value=value[key];
    }
    return value;
  };
  const matches=c=>{
    const v=read(c.path);
    if(c.op==='exists')return v!==undefined;
    if(c.op==='equals')return isDeepStrictEqual(v,c.value);
    if(!Number.isFinite(v)||!Number.isFinite(c.value))return false;
    return c.op==='gt'?v>c.value:c.op==='gte'?v>=c.value:c.op==='lt'?v<c.value:v<=c.value;
  };
  const matched=policy.rules.find(rule=>rule.when.every(matches));
  return structuredClone(matched?matched.output:policy.defaultOutput);
}
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let text='';for await(const chunk of process.stdin)text+=chunk;const request=JSON.parse(text),policy=JSON.parse(request.skill);
  process.stdout.write(JSON.stringify({requestId:request.requestId,outputs:request.cases.map(c=>({id:c.id,output:evaluate(policy,c.input)}))}));
}
