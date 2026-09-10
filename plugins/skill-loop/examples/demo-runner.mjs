// Fixed teaching adapter, not an AI model or full Humanizer evaluation.
import { punctuate } from '../scripts/punctuation-runner.mjs';
let input='';for await(const chunk of process.stdin)input+=chunk;
const request=JSON.parse(input),policy={version:1,replaceEmDashes:true,replaceEnDashes:request.skill.includes('and en dashes')};
process.stdout.write(JSON.stringify({requestId:request.requestId,outputs:request.cases.map(c=>({id:c.id,output:punctuate(policy,c.input)}))}));
