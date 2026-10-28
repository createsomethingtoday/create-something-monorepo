// Isolated synthetic webview capture. No database, account, provider or native app access.
// Usage: node capture.mjs BEFORE_WEB AFTER_WEB OUTPUT [CHROME_EXECUTABLE]
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
const [before,after,out,chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']=process.argv.slice(2);
if(!before||!after||!out)throw Error('Provide baseline web directory, candidate web directory and output directory');
await mkdir(out,{recursive:true});
function fixture(){
 const day='2026-10-24';
 const records={
  profile:[{id:'p',title:'Synthetic artist',fields:{Currency:'USD'}}],
  gigs:[{id:'g1',title:'Autumn listening session — synthetic',status:'confirmed',date:day}],
  tasks:[{id:'t1',title:'Review autumn mix — synthetic',status:'ready_for_review',date:'2026-10-22'},{id:'t2',title:'Prepare show notes — synthetic',status:'in_progress',date:'2026-10-23'},{id:'t3',title:'Choose rehearsal takes — synthetic',status:'on_hold',date:null}],
  finances:[{id:'f1',title:'Session fee — synthetic',status:'Invoiced',date:day,moneyCents:45000},{id:'f2',title:'Rehearsal space — synthetic',status:'Expected',date:'2026-10-22',moneyCents:9000}],
  contacts:[{id:'c1',title:'Avery Example — synthetic'},{id:'c2',title:'Robin Example — synthetic'}]
 };
 const music=[{id:'m1',title:'Autumn sketch — synthetic',filename:'autumn-sketch.wav',kind:'audio',artist:'Fixture artist',project:'Autumn sessions',version:'Mix 03',bytes:16000000,availability:'available'}, {id:'m2',title:'Session project — synthetic',filename:'session.project',kind:'project',project:'Autumn sessions',bytes:240000,availability:'available'}, {id:'m3',title:'Earlier bounce — synthetic',filename:'earlier.wav',kind:'audio',project:'Autumn sessions',bytes:14000000,availability:'missing'}];
 globalThis.fixtureCalls=[];
 globalThis.fixtureOutcome='approval';
 globalThis.fixtureChatStatus={available:true,authenticated:true};
 const session=()=>({sessionId:'fixture-session',state:globalThis.fixtureOutcome==='approval'?'approval':globalThis.fixtureOutcome==='unknown'?'interrupted':'idle',messages:[{role:'user',text:'Update the synthetic task status.'}],approvals:globalThis.fixtureOutcome==='approval'?[{id:'fixture-approval',title:'Approve gigi_records_save',detail:JSON.stringify({entity:'tasks',id:'t1',title:'Review autumn mix — synthetic',fields:{Status:'Completed'},expectedRecord:{title:'Review autumn mix — synthetic',fields:{Status:'ready_for_review'},source:{kind:'manual'}}})}]:[],decisionReceipt:globalThis.fixtureOutcome==='approval'?null:{outcome:globalThis.fixtureOutcome,approvalId:'fixture-approval'},recordLinks:[{entity:'tasks',id:'t1',title:'Review autumn mix — synthetic'}]});
 globalThis.__TAURI__={core:{invoke:async(command,{operation,input})=>{
  globalThis.fixtureCalls.push({operation,input});
  if(command!=='dispatch')throw Error('Fixture denies non-dispatch calls');
  if(operation==='workspace.get')return {id:'fixture-workspace',name:'Synthetic design review'};
  if(operation==='workspace.overview')return {counts:{gigs:1,tasks:3,finances:2,contacts:2},gigs:{items:records.gigs,count:1},tasks:{items:records.tasks,count:3},finances:{items:records.finances.map((r,i)=>({...r,fields:{Direction:i?'Expense':'Income'}})),count:2}};
  if(operation==='records.list'){let items=records[input.entity]||[];if(input.query)items=items.filter(r=>r.title.toLowerCase().includes(input.query.toLowerCase()));return {items,count:items.length,nextCursor:null};}
  if(operation==='records.get'){const r=(records[input.entity]||[]).find(r=>r.id===input.id);return {...r,entity:input.entity,workspaceId:'fixture-workspace',fields:r?.fields||{Status:r?.status||'',...(r?.date?{Date:r.date}:{})},source:{kind:'manual'},relations:[]};}
  if(operation==='schema.describe')return {fields:{Name:'Text',Status:'Text'},relationFields:[]};
  if(operation==='music.list')return {items:music,total:music.length,offset:0,hasMore:false};
  if(operation==='agent.chat.status')return globalThis.fixtureChatStatus;
  if(operation==='agent.chat.list')return {sessions:[{sessionId:'fixture-session',title:'Synthetic task review',state:'approval'}]};
  if(operation==='agent.chat.read'||operation==='agent.chat.poll')return session();
  if(operation==='agent.chat.approve'){globalThis.fixtureOutcome=input.decision==='reject'?'rejected':'verified';return session();}
  if(operation==='agent.status')return {prepared:false};
  if(operation==='diagnostics.status')return {enabled:false,eventCount:0};
  if(operation==='connections.status')return {provider:input.provider,state:'disconnected'};
  throw Error('Fixture denies operation: '+operation);
 }}};
}
const injection=`<script>(${fixture.toString()})();</script>`;
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'); const [variant,...parts]=url.pathname.slice(1).split('/');
 if(!['before','after'].includes(variant))throw Error('Unknown variant');
 const root=resolve(variant==='before'?before:after), path=resolve(root,parts.join('/')||'index.html');
 if(!path.startsWith(root+'/'))throw Error('Invalid path');
 let data=await readFile(path);if(path.endsWith('index.html'))data=data.toString().replace('<script type="module"',injection+'<script type="module"');
 res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream');res.end(data);
 }catch(e){res.statusCode=404;res.end(String(e));}});
await new Promise((r,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',r);});
const profile=await mkdtemp(join(tmpdir(),'gigi-polish-headless-'));
const proc=spawn(chrome,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let ws;
const checks=[];
try{
 const endpoint=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Chrome startup timed out')),15000);proc.stderr.on('data',chunk=>{text+=chunk;const m=text.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1]);}});proc.on('error',reject);});
 const port=new URL(endpoint).port; const targets=await fetch(`http://127.0.0.1:${port}/json`).then(r=>r.json());
 ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
 let id=0; const pending=new Map();const errors=[];
 ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
 await call('Runtime.enable');await call('Page.enable');
 const evaluate=async(expression)=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const settle=()=>evaluate('new Promise(r=>setTimeout(r,220))');
 const click=async(selector)=>{await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw Error('Missing '+${JSON.stringify(selector)});el.click();})()`);await settle();};
 const shot=async(name)=>{const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(out,name+'.png'),Buffer.from(data,'base64'));};
 const open=async(variant,width=880)=>{await call('Emulation.setDeviceMetricsOverride',{width,height:620,deviceScaleFactor:1,mobile:false});await call('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/${variant}/index.html`});await new Promise(r=>setTimeout(r,400));};
 for(const variant of ['before','after']){
  await open(variant);await shot(`${variant}-today-compact`);
  if(variant==='after')checks.push({name:'Today summary and first card visible at 880x620',pass:await evaluate(`(()=>{const s=document.querySelector('.today-summary').getBoundingClientRect(),c=document.querySelector('.today-card').getBoundingClientRect();return s.bottom<620&&c.bottom<620})()`)});
  await open(variant,1440);await shot(`${variant}-today-expanded`);
  await open(variant);await click('[data-page="contacts"]');await shot(`${variant}-people`);
  await click('[data-page="tasks"]');await shot(`${variant}-tasks`);
  await click('[data-page="finances"]');await shot(`${variant}-money`);
  await click('[data-page="music"]');await shot(`${variant}-music-populated`);
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await shot(`${variant}-music-expanded`);
  await call('Emulation.setDeviceMetricsOverride',{width:880,height:620,deviceScaleFactor:1,mobile:false});
  await click('[data-page="settings"]');await shot(`${variant}-settings`);
  if(variant==='after'){
   await evaluate(`document.querySelector('#agent-setup').scrollIntoView()`);await shot('after-external-agent-collapsed');
   await evaluate(`window.scrollTo(0,0);fixtureChatStatus={available:true,authenticated:false}`);await click('[data-setup-chat-refresh]');await shot('after-chat-sign-in');
   await evaluate(`fixtureChatStatus={available:false,authenticated:false}`);await click('[data-setup-chat-refresh]');await shot('after-chat-unavailable');
  }
  await evaluate(`fixtureChatStatus={available:true,authenticated:true}`);
  if(variant==='after')await click('[data-setup-chat-refresh]');
  await click('.reference-ask');await click('[data-chat-session]');
  await evaluate(`document.querySelector('.chat-approval').scrollIntoView({block:'start'})`);await shot(`${variant}-approval`);
  if(variant==='after')checks.push({name:'Compact chat leaves at least 180px for review',pass:await evaluate(`document.querySelector('.chat-transcript').clientHeight>=180`)});
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await shot(`${variant}-approval-expanded`);
  await call('Emulation.setDeviceMetricsOverride',{width:880,height:620,deviceScaleFactor:1,mobile:false});
  await evaluate(`document.querySelector('[data-chat-decision="approve"]').scrollIntoView({block:'center'})`);await shot(`${variant}-approval-actions`);
  checks.push({name:variant+' approval has before/after and decision controls',pass:await evaluate(`!!document.querySelector('[data-chat-decision="approve"]')&&document.querySelector('.chat-approval').innerText.includes('Before')`)});
  await click('[data-chat-decision="approve"]');await evaluate(`document.querySelector('.chat-status').scrollIntoView({block:'center'})`);await shot(`${variant}-receipt-verified`);
  await evaluate(`fixtureOutcome='unknown'`);await click('[data-chat-session]');await evaluate(`document.querySelector('.chat-transcript .chat-status').scrollIntoView({block:'start'})`);await shot(`${variant}-receipt-unknown`);
  checks.push({name:variant+' unknown receipt blocks sending',pass:await evaluate(`document.querySelector('#chat-form button[type="submit"]').disabled&&document.querySelector('.chat-transcript').innerText.includes('cannot yet confirm')`)});
  for(const outcome of ['failed','rejected']){await evaluate(`fixtureOutcome='${outcome}'`);await click('[data-chat-refresh]');await evaluate(`document.querySelector('.chat-transcript .chat-status').scrollIntoView({block:'center'})`);await shot(`${variant}-receipt-${outcome}`);if(outcome==='failed')await evaluate(`fixtureOutcome='unknown'`);if(outcome==='failed')await click('[data-chat-session]');}
 }
 // Keyboard scope and dirty-draft navigation use actual app handlers with only fixture reads.
 await open('after');
 await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'f',metaKey:true,bubbles:true,cancelable:true}))`);await settle();
 checks.push({name:'Command-F on Today does not navigate to People',pass:await evaluate(`document.querySelector('h1').innerText==='Today'`)});
 await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'f',metaKey:true,shiftKey:true,bubbles:true,cancelable:true}))`);await settle();
 checks.push({name:'Command-Shift-F opens People and focuses search',pass:await evaluate(`document.activeElement.id==='contact-search'`)});
 await click('[data-new="contacts"]');
 await evaluate(`(()=>{const el=document.querySelector('#record-form input[name="title"]');el.value='Unsaved synthetic record';el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'f',metaKey:true,shiftKey:true,bubbles:true,cancelable:true}))`);await settle();
 checks.push({name:'People shortcut retains unsaved-change guard',pass:await evaluate(`!!document.querySelector('[data-keep-editing]')`)});
 await shot('after-unsaved-keyboard');await click('[data-keep-editing]');
 checks.push({name:'Keep editing preserves typed text',pass:await evaluate(`document.querySelector('#record-form input[name="title"]').value==='Unsaved synthetic record'`)});
 checks.push({name:'No uncaught UI exceptions',pass:errors.length===0,errors});
 await writeFile(join(out,'checks.json'),JSON.stringify(checks,null,2));
 console.log(JSON.stringify(checks,null,2));
 if(checks.some(c=>!c.pass))process.exitCode=1;
}finally{ws?.close();proc.kill('SIGTERM');server.close();await new Promise(r=>setTimeout(r,300));await rm(profile,{recursive:true,force:true}).catch(()=>{});}
