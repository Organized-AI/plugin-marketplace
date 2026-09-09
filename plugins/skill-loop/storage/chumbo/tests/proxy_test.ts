import proxy from '../cloudflare/worker.mjs';
const assert=(v:unknown)=>{if(!v)throw Error('Proxy assertion failed')};
Deno.test('Wrangler proxy preserves MCP and OAuth discovery paths without shared credentials',async()=>{
 const old=globalThis.fetch;let seen:any;
 globalThis.fetch=async(input:any,init:any)=>{seen={url:String(input),init};return new Response('ok',{headers:{'www-authenticate':'Bearer resource_metadata="https://connector.example/mcp/metadata"'}});};
 try{const req=new Request('https://connector.example/mcp/.well-known/oauth-protected-resource?x=1',{headers:{Authorization:'Bearer fixture-user-token',Cookie:'private-browser-cookie','mcp-protocol-version':'2025-06-18'}});const res=await proxy.fetch(req,{MCP_UPSTREAM:'https://project.supabase.co/functions/v1/skill-loop'});assert(res.status===200);assert(seen.url==='https://project.supabase.co/functions/v1/skill-loop/.well-known/oauth-protected-resource?x=1');assert(seen.init.headers.get('Authorization')==='Bearer fixture-user-token');assert(!seen.init.headers.has('Cookie'));assert(res.headers.get('Cache-Control')==='no-store');assert((await proxy.fetch(req,{MCP_UPSTREAM:'http://127.0.0.1:57421/functions/v1/skill-loop'})).status===503);assert((await proxy.fetch(req,{MCP_UPSTREAM:'http://127.0.0.1:57421/functions/v1/skill-loop',LOCAL_DEVELOPMENT:'true'})).status===200);}finally{globalThis.fetch=old;}
});
