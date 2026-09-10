// Optional Claude Code adapter. Uses the host's existing login; does not install or configure it.
import { command } from './shared/io.mjs';
let text='';for await(const chunk of process.stdin)text+=chunk;
const request=JSON.parse(text);
const prompt='Evaluate each case by following the supplied skill. Return only a JSON object containing requestId and outputs, each with id and output. Do not use tools.\n'+JSON.stringify(request);
const raw=await command(['claude','-p','--tools','','--disable-slash-commands','--output-format','json'],prompt,{timeoutMs:110000});
const parsed=JSON.parse(raw);const envelope=Array.isArray(parsed)?parsed.findLast(row=>row.type==='result'):parsed;
if(!envelope)throw Error('Claude returned no result envelope');if(envelope.is_error)throw Error('Claude reported an unsuccessful run');
const result=typeof envelope.result==='string'?JSON.parse(envelope.result):envelope;
process.stdout.write(JSON.stringify(result));
