// Deterministic demonstration adapter, not an AI model or a benchmark.
let input='';for await(const chunk of process.stdin)input+=chunk;
const request=JSON.parse(input);
process.stdout.write(JSON.stringify({requestId:request.requestId,outputs:request.cases.map(c=>({id:c.id,output:{verdict:request.skill.includes('consent is denied')&&c.input.consent==='denied'?'PASS':c.input.events===1?'PASS':'FAIL'}}))}));
