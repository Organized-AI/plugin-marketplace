import {createSupabaseMcp} from 'chumbo';
import {registerCapabilities} from './capabilities.ts';
export function createApp(projectUrl:string,publicUrl?:string){return createSupabaseMcp({
 server:{name:'Skill Loop · Organized AI',version:'0.1.0'},
 resourceUrl:new URL(publicUrl??`${projectUrl}/functions/v1/skill-loop`),
 auth:{mode:'oauth',strategy:'supabase-user',scopes:['openid','email']},
 // Every signed-in owner may read/write their own archive. These are internal
 // app permissions, not independently negotiated OAuth read-only grants.
 access:{resolveScopes:()=>['history:read','history:write','review:decide']},
 register:registerCapabilities,
});}
export function withCors(app:{fetch:(request:Request)=>Promise<Response>}){return async(request:Request)=>{
 const allowed=request.headers.get('origin')==='https://claude.ai';
 const cors:Record<string,string>=allowed?{'Access-Control-Allow-Origin':'https://claude.ai','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'accept,authorization,content-type,mcp-protocol-version,mcp-session-id,last-event-id,mcp-method,mcp-name','Access-Control-Expose-Headers':'mcp-session-id,www-authenticate','Vary':'Origin'}:{};
 if(request.method==='OPTIONS')return new Response(null,{status:allowed?204:403,headers:cors});
 const response=await app.fetch(request),headers=new Headers(response.headers);for(const [k,v]of Object.entries(cors))headers.set(k,v);headers.set('Cache-Control','no-store');return new Response(response.body,{status:response.status,headers});
};}
if(import.meta.main){const url=Deno.env.get('SUPABASE_URL');if(!url)throw Error('SUPABASE_URL required');Deno.serve(withCors(createApp(url,Deno.env.get('MCP_PUBLIC_URL'))));}
