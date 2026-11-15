const ORIGIN='https://webflow-template-agent.createsomething.workers.dev';
const LIMIT=64*1024;
const json=(error,status)=>new Response(JSON.stringify({error}),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
/** Same-origin preview adapter. The worker still verifies Turnstile and signed sessions. */
export async function proxyDiscoveryAgent(request,action,{secret,disabled=false,expectedOrigin,fetcher=fetch}={}){
 if(disabled)return json('Live chat is disabled in development.',503);
 if(!['session','chat'].includes(action))return json('Not found',404);
 if(request.method!=='POST')return json('Method not allowed',405);
 const origin=request.headers.get('origin');
 if(!origin||origin!==(expectedOrigin||new URL(request.url).origin))return json('Invalid request origin',403);
 if(!secret)return json('Finder is not configured for this preview yet.',503);
 if(Number(request.headers.get('content-length'))>LIMIT)return json('Request too large',413);
 const reader=request.body?.getReader();const chunks=[];let size=0;
 if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>LIMIT){await reader.cancel();return json('Request too large',413)}chunks.push(value)}}
 const body=new Uint8Array(size);let offset=0;for(const c of chunks){body.set(c,offset);offset+=c.length}
 const headers={'Content-Type':'application/json','Origin':origin,'X-Template-Agent-Proxy':secret};
 const auth=request.headers.get('authorization');if(auth)headers.Authorization=auth;
 // Webflow's edge overwrites this header; never forward a browser-named agent IP/header.
 const ip=request.headers.get('x-wf-clientip');if(ip)headers['X-Template-Agent-Client-IP']=ip;
 try{const upstream=await fetcher(`${ORIGIN}/api/templates/agent/${action}`,{method:'POST',headers,body,signal:request.signal,redirect:'manual'});
  const output={'Content-Type':upstream.headers.get('content-type')||'application/json','Cache-Control':'no-store'};
  const retry=upstream.headers.get('retry-after');if(retry)output['Retry-After']=retry;
  return new Response(upstream.body,{status:upstream.status,headers:output});
 }catch{return json('Finder is temporarily unavailable. Your brief is kept.',503)}
}
