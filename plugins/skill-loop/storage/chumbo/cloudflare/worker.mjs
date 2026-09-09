export default {async fetch(request,env){
 const incoming=new URL(request.url);
 if(incoming.pathname!=='/mcp'&&!incoming.pathname.startsWith('/mcp/'))return new Response('Not found',{status:404});
 let upstream;try{upstream=new URL(env.MCP_UPSTREAM);}catch{return new Response('Configure MCP_UPSTREAM',{status:503});}
 const local=env.LOCAL_DEVELOPMENT==='true'&&['127.0.0.1','localhost'].includes(upstream.hostname);
 if(upstream.username||upstream.password||upstream.search||upstream.hash||(upstream.protocol!=='https:'&&!(local&&upstream.protocol==='http:')))return new Response('Invalid upstream configuration',{status:503});
 const suffix=incoming.pathname.slice(4),target=new URL(upstream.href.replace(/\/$/,'')+suffix+incoming.search),headers=new Headers(request.headers);headers.delete('host');headers.delete('cookie');
 // Preserve the caller's OAuth header and MCP metadata. No service-role key.
 try{const response=await fetch(target,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'manual'});const outgoing=new Headers(response.headers);outgoing.set('Cache-Control','no-store');return new Response(response.body,{status:response.status,headers:outgoing});}catch{return new Response('Chumbo upstream unavailable',{status:502});}
}};
