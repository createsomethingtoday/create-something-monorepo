import { InboxService, DomainError } from './domain';
import { authenticate, authRoute, limitAdmission, requireScope } from './auth';
import { ADMIN_SCOPE, READ_SCOPE, VERSION, WRITE_SCOPE, type RuntimeEnv } from './env';
import { HttpError, json, readJson, sameOrigin, stringField } from './http';
import { cancelSubscription, deliver, fanoutEvent, publishOutbox, recoverDelivery, replayDelivery, type DeliveryJob } from './delivery';
import { mcpRoute } from './mcp';

const securityHeaders={
  'x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','x-frame-options':'DENY',
  'permissions-policy':'camera=(), microphone=(), geolocation=()',
  'strict-transport-security':'max-age=31536000; includeSubDomains',
  'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://id.createsomething.space"
};
function decorate(response:Response,env:RuntimeEnv,request:Request):Response{
  const headers=new Headers(response.headers);for(const [key,value]of Object.entries(securityHeaders))headers.set(key,value);
  headers.set('x-a2a-revision',env.BUILD_REVISION);
  const origin=request.headers.get('origin');
  if(origin&&[env.BASE_URL,'https://chatgpt.com'].includes(origin)){
    headers.set('access-control-allow-origin',origin);headers.set('vary','Origin');
    headers.set('access-control-allow-methods','GET, POST, OPTIONS');headers.set('access-control-allow-headers','Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID');
    headers.set('access-control-expose-headers','WWW-Authenticate');
  }
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
async function route(request:Request,env:RuntimeEnv):Promise<Response>{
  const url=new URL(request.url);const path=url.pathname;
  if(path==='/health')return json({service:'a2a',version:VERSION,revision:env.BUILD_REVISION,environment:env.ENVIRONMENT});
  if(path==='/.well-known/oauth-protected-resource'||path==='/.well-known/oauth-protected-resource/mcp')return json({resource:env.AUTH_RESOURCE,authorization_servers:[env.IDENTITY_ISSUER],scopes_supported:[READ_SCOPE,WRITE_SCOPE],bearer_methods_supported:['header'],resource_name:'CREATE SOMETHING A2A inbox'});
  if(path==='/api/v1/config')return json({issuer:env.IDENTITY_ISSUER,resource:env.AUTH_RESOURCE,clientId:env.AUTH_CLIENT_ID,cliRedirectUri:'http://127.0.0.1:42678/callback'});
  if(path==='/api/v1/status')return json({version:VERSION,environment:env.ENVIRONMENT,eventDelivery:env.CALLBACK_SENDER_TOKEN?'available':'not_configured',retention:{contentDays:30,auditDays:90,actionableDays:7}});
  if(path.startsWith('/auth/'))return await authRoute(request,env)??new Response('Not found',{status:404});
  if(path==='/mcp'){
    if(request.method==='OPTIONS')return new Response(null,{status:204});
    if(request.method==='POST'&&!request.headers.has('authorization'))sameOrigin(request,env.BASE_URL);
    const principal=await authenticate(request,env);
    await limitAdmission(env,`mcp:${principal.subject}`,120,60000);
    return mcpRoute(request,env,principal);
  }
  if(path.startsWith('/api/v1/')){
    const p=await authenticate(request,env);requireScope(p,READ_SCOPE);
    const write=!['GET','HEAD'].includes(request.method);
    if(write){requireScope(p,WRITE_SCOPE);if(!request.headers.has('authorization'))sameOrigin(request,env.BASE_URL);await limitAdmission(env,`write:${p.subject}`,120,60000);}
    const service=new InboxService(env.DB);
    if(path==='/api/v1/me'&&request.method==='GET')return json({subject:p.subject,email:p.email});
    if(path==='/api/v1/agents'){
      if(request.method==='GET')return json({agents:await service.listAgents(p)});
      if(request.method==='POST'){requireScope(p,ADMIN_SCOPE);return json({agent:await service.registerAgent(p,stringField(await readJson(request),'name',80))},201);}
    }
    const agentMatch=path.match(/^\/api\/v1\/agents\/([^/]+)$/);
    if(agentMatch&&request.method==='PATCH'){requireScope(p,ADMIN_SCOPE);const body=await readJson(request);if(typeof body.paused!=='boolean')throw new HttpError('invalid_request',400,'Paused must be true or false.');return json({agent:await service.setAgentPaused(p,agentMatch[1],body.paused)});}
    if(agentMatch&&request.method==='DELETE'){
      requireScope(p,ADMIN_SCOPE);await service.requireOwnedAgent(p,agentMatch[1]);const now=Date.now();
      await env.DB.batch([
        env.DB.prepare('UPDATE agents SET deleted_at=?,paused=1 WHERE id=? AND owner_subject=?').bind(now,agentMatch[1],p.subject),
        env.DB.prepare('UPDATE messages SET text=NULL,content_deleted_at=?,claim_token=NULL,claimed_until=NULL,state=CASE WHEN state=\'claimed\' THEN \'rejected\' ELSE state END WHERE from_agent_id=? OR to_agent_id=?').bind(now,agentMatch[1],agentMatch[1]),
        env.DB.prepare("UPDATE subscriptions SET status='revoked',secret_ciphertext='',previous_secret_ciphertext=NULL,previous_secret_until=NULL,verified_at=0 WHERE agent_id=? AND owner_subject=?").bind(agentMatch[1],p.subject)
      ]);return json({deleted:true});
    }
    if(path==='/api/v1/grants'){
      requireScope(p,ADMIN_SCOPE);
      if(request.method==='GET')return json({grants:await service.listGrants(p,url.searchParams.get('agentId')??'')});
      if(request.method==='POST'){const body=await readJson(request);return json({grant:await service.grantSender(p,stringField(body,'agentId'),stringField(body,'senderAgentId'))},201);}
    }
    const grantMatch=path.match(/^\/api\/v1\/grants\/([^/]+)$/);if(grantMatch&&request.method==='DELETE'){requireScope(p,ADMIN_SCOPE);return json({grant:await service.revokeGrant(p,grantMatch[1])});}
    if(path==='/api/v1/messages'){
      if(request.method==='GET'){const after=url.searchParams.get('after');if(after!==null&&!/^\d{1,16}$/.test(after))throw new HttpError('invalid_cursor',400,'Invalid inbox cursor.');return json({messages:await service.listMessages(p,url.searchParams.get('agentId')??'',after===null?undefined:Number(after),url.searchParams.get('includeSent')==='true')});}
      if(request.method==='POST'){
        const body=await readJson(request);const result=await service.sendMessage(p,{fromAgentId:stringField(body,'fromAgentId'),toAgentId:stringField(body,'toAgentId'),text:stringField(body,'text',16384),idempotencyKey:stringField(body,'idempotencyKey',128),...(body.threadId===undefined?{}:{threadId:stringField(body,'threadId')})});
        // If queue publication fails, the durable event remains pending for reconciliation.
        await publishOutbox(env).catch(()=>console.warn(JSON.stringify({event:'outbox_publication_deferred',eventId:result.eventId})));
        return json(result,result.duplicate?200:201);
      }
    }
    const messageMatch=path.match(/^\/api\/v1\/messages\/([^/]+)(?:\/(claim|finish))?$/);
    if(messageMatch){
      if(!messageMatch[2]&&request.method==='GET')return json({message:await service.readMessage(p,messageMatch[1])});
      if(messageMatch[2]==='claim'&&request.method==='POST')return json({message:await service.claimMessage(p,messageMatch[1])});
      if(messageMatch[2]==='finish'&&request.method==='POST'){const body=await readJson(request);if(!['completed','rejected','approval_required'].includes(String(body.state)))throw new HttpError('invalid_state',400,'Select a valid processing outcome.');return json({message:await service.finishMessage(p,messageMatch[1],{claimToken:stringField(body,'claimToken'),state:body.state as 'completed'|'rejected'|'approval_required'})});}
    }
    if(path==='/api/v1/subscriptions'&&request.method==='GET'){
      const id=url.searchParams.get('agentId')??'';await service.requireOwnedAgent(p,id);
      const rows=await env.DB.prepare('SELECT id,agent_id AS agentId,status,created_at AS createdAt,expires_at AS expiresAt FROM subscriptions WHERE agent_id=? AND owner_subject=? ORDER BY created_at DESC').bind(id,p.subject).all();return json({subscriptions:rows.results});
    }
    const subMatch=path.match(/^\/api\/v1\/subscriptions\/([^/]+)$/);if(subMatch&&request.method==='DELETE'){requireScope(p,ADMIN_SCOPE);await cancelSubscription(env,p,subMatch[1]);return json({cancelled:true});}
    if(path==='/api/v1/deliveries'&&request.method==='GET'){
      const id=url.searchParams.get('agentId')??'';await service.requireOwnedAgent(p,id);
      const rows=await env.DB.prepare(`SELECT d.id,e.message_id AS messageId,d.subscription_id AS subscriptionId,d.state,d.attempts,d.last_status AS lastStatus,d.last_error AS lastError,d.created_at AS createdAt,d.accepted_at AS acceptedAt FROM deliveries d JOIN outbox_events e ON e.id=d.event_id JOIN subscriptions s ON s.id=d.subscription_id WHERE e.recipient_agent_id=? AND s.owner_subject=? ORDER BY d.created_at DESC LIMIT 100`).bind(id,p.subject).all();return json({deliveries:rows.results});
    }
    const replayMatch=path.match(/^\/api\/v1\/deliveries\/([^/]+)\/replay$/);if(replayMatch&&request.method==='POST'){requireScope(p,ADMIN_SCOPE);return json(await replayDelivery(env,p,replayMatch[1]));}
    return json({error:{code:'not_found',message:'This operation is unavailable.'}},404);
  }
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response(null,{status:405,headers:{allow:'GET, HEAD'}});
  // Assets resolves /app to app.html and owns its canonical URL redirect.
  // Rewriting back to app.html would redirect /app to itself indefinitely.
  const response=await env.ASSETS.fetch(new Request(url,request));
  const headers=new Headers(response.headers);
  if(path.startsWith('/app'))headers.set('cache-control','private, no-store');
  return new Response(response.body,{status:response.status,headers});
}
async function retention(env:RuntimeEnv){
  const now=Date.now();const cutoff=now-90*86400000;await new InboxService(env.DB).pruneRetention();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM deliveries WHERE event_id IN(SELECT e.id FROM outbox_events e JOIN messages m ON m.id=e.message_id WHERE m.created_at<?)').bind(cutoff),
    env.DB.prepare('DELETE FROM outbox_events WHERE message_id IN(SELECT id FROM messages WHERE created_at<?)').bind(cutoff),
    env.DB.prepare('DELETE FROM idempotency WHERE created_at<?').bind(cutoff),
    env.DB.prepare('DELETE FROM messages WHERE created_at<?').bind(cutoff),
    env.DB.prepare('DELETE FROM threads WHERE expires_at<? AND NOT EXISTS(SELECT 1 FROM messages WHERE thread_id=threads.id)').bind(cutoff),
    env.DB.prepare('DELETE FROM subscriptions WHERE expires_at<? AND NOT EXISTS(SELECT 1 FROM deliveries WHERE subscription_id=subscriptions.id)').bind(cutoff),
    env.DB.prepare('DELETE FROM auth_sessions WHERE expires_at<?').bind(now),
    env.DB.prepare('DELETE FROM oauth_states WHERE expires_at<?').bind(now),
    env.DB.prepare('DELETE FROM admission_buckets WHERE expires_at<?').bind(now)
  ]);
}
export default {
  async fetch(request:Request,env:RuntimeEnv):Promise<Response>{
    try{return decorate(await route(request,env),env,request);}catch(error){
      const known=error instanceof HttpError||error instanceof DomainError;const status=known?error.status:503;const code=known?error.code:'service_unavailable';
      if(status>=500)console.error(JSON.stringify({event:'request_failed',code,path:new URL(request.url).pathname}));
      const headers:Record<string,string>={};if(status===401)headers['www-authenticate']=`Bearer resource_metadata="${env.BASE_URL}/.well-known/oauth-protected-resource/mcp", scope="${READ_SCOPE} ${WRITE_SCOPE}"`;
      if(status===429||status===503)headers['retry-after']='60';
      return decorate(json({error:{code,message:known&&status<500?error.message:'This operation is temporarily unavailable.'}},status,headers),env,request);
    }
  },
  async queue(batch:MessageBatch<DeliveryJob>,env:RuntimeEnv):Promise<void>{
    for(const message of batch.messages){
      try{
        if('eventId'in message.body&&typeof message.body.eventId==='string')await fanoutEvent(env,message.body.eventId);
        else if('deliveryId'in message.body&&typeof message.body.deliveryId==='string')await deliver(env,message.body.deliveryId);
        else{console.error(JSON.stringify({event:'invalid_delivery_job'}));message.ack();continue;}
        message.ack();
      }catch{console.error(JSON.stringify({event:'delivery_job_deferred'}));message.retry({delaySeconds:30});}
    }
  },
  async scheduled(_controller:ScheduledController,env:RuntimeEnv):Promise<void>{await recoverDelivery(env);await retention(env);}
} satisfies ExportedHandler<RuntimeEnv,DeliveryJob>;
