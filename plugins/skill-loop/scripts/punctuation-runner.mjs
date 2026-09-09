import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
// Deterministic punctuation exercise derived from Humanizer §14, not its full skill.
export function punctuate(policy,input) {
  if(policy.version!==1 || typeof policy.replaceEmDashes!=='boolean' || typeof policy.replaceEnDashes!=='boolean')throw Error('Punctuation rules require version 1 and boolean dash options');
  if(typeof input?.text!=='string')throw Error('Input needs text');
  let text=input.text;
  if(policy.replaceEmDashes)text=text.replace(/\s*—\s*/g,', ');
  if(policy.replaceEnDashes)text=text.replace(/\s*–\s*/g,', ');
  return {text};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 let text='';for await(const chunk of process.stdin)text+=chunk;
 const request=JSON.parse(text),policy=JSON.parse(request.skill);
 process.stdout.write(JSON.stringify({requestId:request.requestId,outputs:request.cases.map(c=>({id:c.id,output:punctuate(policy,c.input)}))}));
}
