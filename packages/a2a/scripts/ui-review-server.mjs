/** Local-only UI fixture host. No credentials, backend, or production proxy.
 * Build first, then node packages/a2a/scripts/ui-review-server.mjs.
 * /app?fixture=populated|empty|paused|partial-error|thread-error|denied|signin|error|loading|no-agent
 * All records are synthetic; writes stay in this process and reset on navigation.
 */
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
const root=resolve(import.meta.dirname,'../dist/client');
const now=Date.now(), own='fixture-canon', peer='fixture-studio';
let requests=[], extra=[];
const baseMessages=[
 {id:'m1',threadId:'review',sequence:1,cursor:1,fromAgentId:peer,toAgentId:own,fromAgentName:'Studio',toAgentName:'Canon',authorKind:'agent',authorName:'Studio',kind:'request',text:'Review the launch checklist. Flag anything that needs an owner decision before publishing.\n\nFocus on the handoff, approval wording, and rollback plan. <img src=x onerror="window.fixtureXSS=true">',createdAt:now-3600000,state:'approval_required'},
 {id:'m2',threadId:'review',sequence:2,cursor:2,fromAgentId:own,toAgentId:peer,fromAgentName:'Canon',toAgentName:'Studio',authorKind:'owner',authorName:'Alex',kind:'conversation',text:'I will review the wording this afternoon. Please keep the release paused until we agree on the scope.',createdAt:now-1800000,state:'posted'},
 {id:'m3',threadId:'research',sequence:1,cursor:3,fromAgentId:peer,toAgentId:own,fromAgentName:'Studio',toAgentName:'Canon',authorKind:'agent',authorName:'Studio',kind:'request',text:'Compare the onboarding notes with the current setup guide. Return a short list of gaps and the evidence for each.',createdAt:now-900000,state:'pending'},
 {id:'m4',threadId:'summary',sequence:1,cursor:4,fromAgentId:own,toAgentId:peer,fromAgentName:'Canon',toAgentName:'Studio',authorKind:'agent',authorName:'Canon',kind:'request',text:'The accessibility review is complete. Keyboard navigation and narrow layouts are ready for owner review.',createdAt:now-300000,state:'completed'}
];
const agent={id:own,name:'Canon',paused:false,createdAt:now};
const participants=[{agentId:own,agentName:'Canon',ownerName:'Alex',paused:false,monitoringActive:true},{agentId:peer,agentName:'Studio',ownerName:'Sam',paused:false,monitoringActive:false}];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://127.0.0.1');
 let mode=url.searchParams.get('__fixture')??(req.headers.cookie??'').match(/fixture=([\w-]+)/)?.[1]??'populated';
 if(url.searchParams.has('fixture')){mode=url.searchParams.get('fixture');res.setHeader('Set-Cookie',`fixture=${mode}; Path=/; SameSite=Strict`);extra=[];requests=[];agent.paused=mode==='paused';}
 const json=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 if(url.pathname==='/__review/requests')return json(requests);
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/')){
 let body='';for await(const chunk of req)body+=chunk;
 requests.push({method:req.method,path:url.pathname,body:body?JSON.parse(body):null});
 const messages=mode==='empty'?[...extra]:[...baseMessages,...extra];
 if(url.pathname.endsWith('/me')){
 if(mode==='loading')return;
 if(['signin','denied','error'].includes(mode))return json({error:{code:mode==='denied'?'invite_required':'fixture_error',message:'Synthetic session recovery state.'}},mode==='signin'?401:mode==='denied'?403:503);
 return json({subject:'synthetic-alex',email:'alex@example.test',displayName:'Alex'});
 }
 if(url.pathname.endsWith('/status'))return json({version:'review',environment:'SYNTHETIC LOCAL FIXTURE',eventDelivery:'available',retention:{contentDays:30,auditDays:90,actionableDays:7}});
 if(url.pathname==='/api/v1/agents')return json({agents:mode==='no-agent'?[]:[{...agent,paused:mode==='paused'}]});
 if(url.pathname==='/api/v1/messages')return mode==='partial-error'?json({error:{message:'Synthetic message history failure'}},503):json({messages,hasMore:false,nextBefore:null});
 if(url.pathname==='/api/v1/owner-messages'&&req.method==='POST'){
 const p=JSON.parse(body);const m={...p,id:'synthetic-'+extra.length,threadId:p.threadId??'new-thread',cursor:5+extra.length,sequence:5+extra.length,createdAt:Date.now(),authorKind:'owner',authorName:'Alex',fromAgentName:'Canon',toAgentName:'Studio',state:p.kind==='request'?'pending':'posted'};extra.push(m);return json({message:m},201);
 }
 if(url.pathname.startsWith('/api/v1/conversations/'))return mode==='thread-error'?json({error:{message:'Synthetic thread failure'}},503):json({threadId:url.pathname.split('/').at(-1),participants,messages:messages.filter(m=>m.threadId===url.pathname.split('/').at(-1)),hasMore:false,nextBefore:null});
 if(url.pathname==='/api/v1/grants')return json({grants:[{id:'grant-fixture',agentId:own,senderAgentId:peer,revokedAt:null}]});
 if(url.pathname==='/api/v1/subscriptions')return json({subscriptions:[{id:'subscription-fixture',agentId:own,status:'active',createdAt:now,expiresAt:now+86400000}]});
 if(url.pathname==='/api/v1/deliveries')return json({deliveries:[{id:'delivery-fixture',messageId:'m1',subscriptionId:'subscription-fixture',state:'accepted',attempts:1,lastStatus:202,lastError:null,createdAt:now-3500000,acceptedAt:now-3490000}]});
 if(url.pathname==='/api/v1/context'||url.pathname==='/api/v1/owned-context')return json({resources:[],hasMore:false,nextAfter:null});
 return json({error:{code:'fixture_not_implemented',message:'This action is outside the local UI fixture.'}},400);
 }
 const baseline=url.pathname.startsWith('/baseline');const path=url.pathname.replace(/^\/baseline/,'');
 const relative=path==='/'?'index.html':path==='/app'?'app.html':path.slice(1);
 const dir=baseline?'/private/tmp/a2a-cook-baseline':root;const file=resolve(dir,relative);if(!file.startsWith(dir+'/'))return json({},403);
 let content=await readFile(file);if(baseline&&extname(file)==='.html')content=Buffer.from(content.toString().replaceAll('"/assets/','"/baseline/assets/'));
 const motion=url.searchParams.get('motion')??url.searchParams.get('__motion');
 if(extname(file)==='.html'){
  const fixtureScript=await readFile(resolve(import.meta.dirname,'ui-review-fixture.js'),'utf8');
  let html=content.toString();
  if(motion==='nojs')html=html.replace(/<script[^>]*>[\s\S]*?<\/script>/g,'');
  else{
   html=html.replace('<head>',`<head><script>${fixtureScript}</script>`);
   if(motion==='failed'||motion==='delayed')html=html.replace(/(src="[^" ]+\.js)(")/g,`$1?__motion=${motion}$2`);
  }
  content=Buffer.from(html);
 }
 if(extname(file)==='.js'&&(motion==='failed'||motion==='delayed')){
  if(/(?:gsap|index)-[^/]+\.js$/.test(file)){
   if(motion==='failed'){res.writeHead(503,{'Cache-Control':'no-store'});res.end('Synthetic optional GSAP failure');return;}
   await new Promise(resolve=>setTimeout(resolve,1800));
  }
  content=Buffer.from(content.toString().replace(/(["'])(\.\/[^"']+\.js)\1/g,`$1$2?__motion=${motion}$1`));
 }
 res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(content);
 }catch{res.writeHead(404);res.end('Local fixture resource unavailable');}
}).listen(8873,'127.0.0.1',()=>console.log('Synthetic UI only: http://127.0.0.1:8873/app?fixture=populated'));
