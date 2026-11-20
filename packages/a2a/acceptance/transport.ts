// Only bundled by acceptance/build.mjs. No network, email, or callbacks permitted.
import { AsyncLocalStorage } from 'node:async_hooks';
import identity from '../../identity-worker/src/index';
export const context=new AsyncLocalStorage<{identityEnv:any;temporary?:boolean;lose?:boolean}>();
export async function labFetch(input:RequestInfo|URL,init?:RequestInit):Promise<Response>{
 const state=context.getStore();if(!state)throw new Error('Lab request context required');
 const request=new Request(input,init),url=new URL(request.url);
 if(url.origin!==state.identityEnv.OAUTH_ISSUER||!['/oauth/token','/oauth/userinfo'].includes(url.pathname))throw new Error('External effects disabled');
 if(state.temporary&&url.pathname==='/oauth/token'){state.temporary=false;return new Response('{}',{status:503,headers:{'retry-after':'1'}});}
 const response=await identity.fetch(request,state.identityEnv);
 if(state.lose&&url.pathname==='/oauth/token'){state.lose=false;throw new Error('Injected lost response after commit');}
 return response;
}
