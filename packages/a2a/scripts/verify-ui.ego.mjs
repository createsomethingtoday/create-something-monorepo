/**
 * Local rendered regression check. Run after building and starting Wrangler :8796:
 *   ego-browser nodejs < packages/a2a/scripts/verify-ui.ego.mjs
 * Browser-only fixtures never reach real API writes or the product build.
 * Evidence: /private/tmp/cre-2380-ui. Visual review remains required.
 */
const fs = await import('node:fs/promises');
const assert = (await import('node:assert/strict')).default;
const base = 'http://127.0.0.1:8796';
const output = '/private/tmp/cre-2380-ui';
await fs.mkdir(output, {recursive:true});
const task = await taskSpace('CRE-2380 A2A UI qualification');
const page = task.page('p1');
function installUIFixture() {
 const mode=new URL(location.href).searchParams.get('fixture');if(!mode)return;
 const realFetch=window.fetch.bind(window),now=Date.now();
 const own='agent_8bdf0739-4b51-45cb-9fac-790c1f32ccff',peer='agent_22dd214c-c886-4df4-90ad-b4a393d71c6c';
 const data={requests:[],agents:mode==='no-agent'?[]:[{id:own,name:'Canon research and delivery agent',paused:mode==='paused',createdAt:now}],messages:mode==='empty'?[]:[{id:'message_1',threadId:'thread_1',cursor:1,sequence:1,fromAgentId:peer,toAgentId:own,text:'Please review the proposal. <img src=x onerror="window.fixtureXSS=true">\nRequire owner approval before publishing.',createdAt:now-5000,state:'approval_required'},{id:'message_2',threadId:'thread_1',cursor:2,sequence:2,fromAgentId:own,toAgentId:peer,text:'Review complete. The owner needs to approve the final scope.',createdAt:now,state:'completed'}],grants:[{id:'grant_1',agentId:own,senderAgentId:peer,revokedAt:null}],subscriptions:[{id:'subscription_1',agentId:own,status:'active',createdAt:now,expiresAt:now+86400000}],deliveries:[{id:'delivery_1',messageId:'message_1',subscriptionId:'subscription_1',state:'accepted',attempts:1,lastStatus:202,lastError:null,createdAt:now-5000,acceptedAt:now-4000},{id:'delivery_2',messageId:'message_3',subscriptionId:'subscription_1',state:'failed',attempts:5,lastStatus:503,lastError:'callback_unavailable',createdAt:now-2000,acceptedAt:null}]};
 window.__a2aFixture=data;
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
 window.fetch=async(input,options={})=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href);if(!url.pathname.startsWith('/api/v1/'))return realFetch(input,options);
  const path=url.pathname,method=options.method??'GET';data.requests.push({path,method,body:options.body});
  if(mode==='loading'&&path.endsWith('/me'))return new Promise(()=>{});
  if(path.endsWith('/me')){
   if(mode==='denied')return json({error:{code:'invite_required',message:'This account needs a pilot invitation.'}},403);
   if(mode==='error')return json({error:{code:'service_unavailable',message:'Identity is temporarily unavailable.'}},503);
   return json({subject:'fixture-owner',email:'fixture.owner@example.test'});
  }
  if(mode==='partial-error'&&path.endsWith('/messages'))return json({error:{code:'service_unavailable',message:'Message history is temporarily unavailable.'}},503);
  if(path.endsWith('/status'))return json({version:'0.1.0',environment:'OFFLINE UI FIXTURE',eventDelivery:'available',retention:{contentDays:30,auditDays:90,actionableDays:7}});
  if(path==='/api/v1/agents'&&method==='POST'){const body=JSON.parse(options.body);data.agents=[{id:own,name:body.name,paused:false,createdAt:now}];return json({agent:data.agents[0]},201);}
  if(path==='/api/v1/agents')return json({agents:data.agents});
  if(path.startsWith('/api/v1/agents/')&&method==='PATCH'){data.agents[0].paused=JSON.parse(options.body).paused;return json({agent:data.agents[0]});}
  if(path==='/api/v1/messages'&&method==='POST'){const body=JSON.parse(options.body);data.messages.push({id:'fixture-reply',threadId:body.threadId??'thread_new',cursor:3,sequence:3,...body,createdAt:now+1000,state:'stored'});return json({message:data.messages.at(-1)},201);}
  if(path==='/api/v1/messages')return json({messages:data.messages});
  if(path==='/api/v1/grants'&&method==='POST'){const body=JSON.parse(options.body);data.grants.push({id:'fixture-grant',...body,revokedAt:null});return json({grant:data.grants.at(-1)},201);}
  if(path==='/api/v1/grants')return json({grants:data.grants});
  if(path.startsWith('/api/v1/grants/')&&method==='DELETE'){data.grants.find(g=>g.id===path.split('/').at(-1)).revokedAt=now;return json({revoked:true});}
  if(path==='/api/v1/subscriptions')return json({subscriptions:data.subscriptions});
  if(path.startsWith('/api/v1/subscriptions/')&&method==='DELETE'){data.subscriptions[0].status='revoked';return json({cancelled:true});}
  if(path==='/api/v1/deliveries')return json({deliveries:data.deliveries});
  if(path.endsWith('/replay')){data.deliveries[1].state='pending';return json({replayed:true});}
  return json({error:{message:'Unmocked fixture request'}},501);
 };
}

const report=[];
const measure = async(label) => {
 const result=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
  overflow:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1}).map(e=>e.tagName+'.'+e.className).slice(0,15),
  shortButtons:[...document.querySelectorAll('button')].filter(e=>{let r=e.getBoundingClientRect();return r.height>0&&r.height<44}).map(e=>e.textContent.trim()),xss:window.fixtureXSS??false}));
 assert.equal(result.scrollWidth,result.width,label+' horizontal overflow');assert.deepEqual(result.overflow,[],label+' element overflow');assert.deepEqual(result.shortButtons,[],label+' button target');assert.equal(result.xss,false,label+' untrusted HTML');report.push({label,...result});
};
try {
 // Real built Worker regression: /app must render, without canonical redirect loop.
 const response=await fetch(base+'/app');assert.equal(response.status,200,'GET /app');assert.match(await response.text(),/Your inbox/);
 await page.goto(base+'/app');await page.waitForSelector('#session-signin',{state:'visible'});
 await page.screenshot({path:output+'/console-signedout.png',fullPage:true});
 await page.cdp('Page.addScriptToEvaluateOnNewDocument',{source:'('+installUIFixture.toString()+')()'});
 for(const width of [320,390,768,1024,1025,1440]) {
  await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  await page.goto(base+'/');await page.waitForFunction(()=>document.fonts.status==='loaded');await measure('landing-'+width);
  await page.screenshot({path:output+'/landing-'+width+'.png',fullPage:true});
  await page.goto(base+'/app?fixture=populated');await page.waitForSelector('#console',{state:'visible'});await page.click('.thread-button');
  for(const pane of ['inbox','connect','access']){await page.click('[data-pane="'+pane+'"]');await measure(pane+'-'+width);}
  await page.click('[data-pane="inbox"]');await page.screenshot({path:output+'/console-populated-'+width+'.png',fullPage:true});
 }
 for(const mode of ['loading','denied','error','empty','no-agent','partial-error','paused']) {
  await page.goto(base+'/app?fixture='+mode);
  await page.waitForSelector(['loading','denied','error'].includes(mode)?'#session-'+mode:'#console',{state:'visible'});
  if(mode==='denied')assert.equal(await page.evaluate(()=>{const button=document.querySelector('#logout');return !button.hidden&&button.getBoundingClientRect().height>=44;}),true,'denied owners can sign out to switch accounts');
  await page.screenshot({path:output+'/console-'+mode+'.png',fullPage:true});await measure('state-'+mode);
 }
 await page.goto(base+'/app?fixture=populated');await page.waitForSelector('#console',{state:'visible'});
 await page.click('.thread-button');await page.click('.reply-button');await page.fill('#message-text','Bounded fixture reply.');await page.click('#compose-form button[type=submit]');
 await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Message stored'));
 assert.equal(await page.evaluate(()=>document.querySelectorAll('.message-record').length),3,'sent reply remains in conversation');
 const send=await page.evaluate(()=>JSON.parse(window.__a2aFixture.requests.find(r=>r.path==='/api/v1/messages'&&r.method==='POST').body));assert.equal(send.threadId,'thread_1');assert.ok(send.idempotencyKey);
 await page.click('[data-pane="access"]');assert.equal(await page.evaluate(()=>document.activeElement.id),'access-title');
 await page.click('#toggle-pause');await page.click('#cancel-pause');assert.equal(await page.evaluate(()=>document.activeElement.id),'toggle-pause');
 await page.click('#toggle-pause');await page.click('#confirm-pause');await page.waitForFunction(()=>document.querySelector('#pause-title').textContent.includes('is paused'));
 await page.goto(base+'/');await page.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await page.click('loc=href:/#connect');assert.equal(await page.evaluate(()=>location.hash),'#connect');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
 await page.goto(base+'/');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent.trim()),'Skip to content');
 await page.cdp('Emulation.setScriptExecutionDisabled',{value:true});await page.reload();
 assert.equal(await page.evaluate(()=>document.querySelectorAll('main section').length),4);await page.screenshot({path:output+'/landing-nojs.png',fullPage:true});
 await page.goto(base+'/app');assert.equal(await page.evaluate(()=>document.querySelector('#session-loading').hidden),true);
 await page.screenshot({path:output+'/console-nojs.png',fullPage:true});
 await page.cdp('Emulation.setScriptExecutionDisabled',{value:false});await page.cdp('Emulation.setEmulatedMedia',{features:[]});
 await fs.writeFile(output+'/report.json',JSON.stringify({source:'built local Wrangler; console data is offline browser fixture',report},null,2));
 console.log({passed:true,checks:report.length,evidence:output});
} catch(error) { console.error("UI check failed; browser left open for inspection."); throw error; }
await task.finish({keep:[]});
