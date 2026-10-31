// Offline actual app/DOM/CSS temporal checks. No native/provider calls or real profiles.
import {createRequire} from 'node:module';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,relative} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(new URL('../../../packages/agency/package.json',import.meta.url))('@playwright/test');
const web=resolve(new URL('../web/',import.meta.url).pathname);
const out=resolve(process.env.GIGI_CHAT_EVIDENCE || '/private/tmp/cre-2308-ui');mkdirSync(out,{recursive:true});
const baseline=process.env.BASELINE==='1';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const metrics=[];
try{
 const page=await browser.newPage({viewport:{width:880,height:620},reducedMotion:'reduce',recordVideo:{dir:out,size:{width:880,height:620}}});
 await page.addInitScript(()=>{globalThis.__TAURI__={core:{invoke:async()=>{throw Error('Denied: synthetic profile only');}}};});
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin!=='http://gigi.test')return route.abort();
  const path=resolve(web,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(web+'/')||!existsSync(path))return route.fulfill({status:404,body:''});
  let body=readFileSync(path);
  if(baseline)try{body=execFileSync('git',['show','origin/main:'+relative(resolve(web,'../../..'),path)]);}catch{}
  if(path.endsWith('/app.mjs')){
   body=Buffer.from(body.toString().slice(0,body.toString().lastIndexOf('load().catch'))+`
   globalThis.chatFixture=(theme='studio',prefs={})=>{
    state.workspace={id:'synthetic-chat-0219',name:'Rehearsal workspace'};state.currency='USD';state.currencyKnown=true;state.page='overview';state.overview={counts:{},events:{items:[],count:0},tasks:{items:[],count:0},finances:{items:[],count:0}};
    preferences={...defaults,theme,...prefs};applyPreferences(preferences);
    root.querySelector('.chat-panel')?.remove();
    chat=new ChatController({},'synthetic-chat-0219',renderChat,()=>{},()=>0,()=>{});Object.defineProperty(chat,'preferences',{get:()=>preferences});
    chat.visible=true;chat.status={available:true,authenticated:true};chat.sessions=Array.from({length:15},(_,i)=>({sessionId:'s'+i,title:'Synthetic rehearsal '+i,state:'idle'}));chat.draft='Keep this draft';
    chat.current={sessionId:'s0',state:'running',messages:[{id:'u',role:'user',text:'Review the rehearsal sources'},{id:'a',role:'assistant',text:'# Rehearsal plan\\n\\n**Recorded sources:** the *local* schedule.\\n\\n- Review the venue\\n- Confirm the crew\\n\\n> Current records only; details still need review.\\n\\n| Work | Status |\\n| --- | --- |\\n| Stage plan | Ready |\\n| Call time | Needs review |\\n\\n'+Array.from({length:16},(_,i)=>'Paragraph '+i+': Synthetic rehearsal details for a readable response.').join('\\n\\n')}],recordLinks:[{entity:'tasks',id:'synthetic-task',title:'Synthetic rehearsal checklist'}],approvals:[]};render();
   };
   globalThis.chatAppend=text=>{chat.current.messages[1].text+=text;renderChat();};
   globalThis.chatSetState=state=>{chat.current.state=state;renderChat();};
   globalThis.chatFullRender=render;
   globalThis.chatClearDraft=()=>{chat.draft='';renderChat();};
   `);
  }
  await route.fulfill({body,contentType:path.endsWith('.mjs')?'text/javascript':path.endsWith('.css')?'text/css':'text/html'});
 });
 await page.goto('http://gigi.test');await page.waitForFunction(()=>globalThis.chatFixture);await page.evaluate(()=>chatFixture());
 await page.screenshot({path:resolve(out,baseline?'baseline-880.png':'initial-880.png')});
 // This assertion demonstrates the old drawer replacement against source 0.2.18.
 await page.locator('#chat-message').focus();await page.locator('#chat-message').evaluate(e=>{globalThis.retainedComposer=e;e.setSelectionRange(4,8);});
 await page.evaluate(()=>chatAppend('\n\nA newly observed response delta.'));
 assert.equal(await page.evaluate(()=>retainedComposer===document.querySelector('#chat-message')),true,'streaming must retain mounted composer');
 assert.equal(await page.locator('#chat-message').inputValue(),'Keep this draft');
 assert.equal(await page.locator('#chat-message').evaluate(e=>e.selectionStart),4);
 for(const width of [880,1280])for(const theme of ['studio','paper','midnight'])for(const chatWidth of ['standard','wide']){
  await page.setViewportSize({width,height:width===880?620:840});await page.evaluate(({theme,chatWidth})=>chatFixture(theme,{chatWidth,chatTextSize:'larger'}),{theme,chatWidth});
  const rects=await page.evaluate(()=>{
   const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom};};return{intro:rect('.chat-intro'),transcript:rect('.chat-transcript'),composer:rect('.chat-composer'),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.ok(rects.transcript.h>=150,`${theme}/${width}: transcript needs usable space ${JSON.stringify(rects)}`);assert.ok(rects.intro.b<=rects.transcript.y+1);assert.ok(rects.transcript.b<=rects.composer.y+1);assert.equal(rects.overflow,false);
  metrics.push({width,theme,chatWidth,...rects});
  await page.screenshot({path:resolve(out,`${theme}-${width}-${chatWidth}.png`)});
 }
 await page.setViewportSize({width:880,height:620});await page.evaluate(()=>chatFixture('paper'));
 await page.locator('.chat-history>summary').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.chat-history').evaluate(e=>e.open),true);await page.locator('.chat-sessions').evaluate(e=>e.scrollTop=90);await page.evaluate(()=>chatAppend('\nMore observed text.'));
 assert.equal(await page.locator('.chat-history').evaluate(e=>e.open),true);assert.equal(await page.locator('.chat-sessions').evaluate(e=>e.scrollTop),90);
 await page.locator('.chat-history>summary').click();await page.locator('.chat-view-options>summary').click();
 await page.locator('#chat-chatWidth').selectOption('wide');assert.equal(await page.evaluate(()=>document.documentElement.dataset.chatWidth),'wide');
 await page.locator('#chat-chatTextSize').selectOption('larger');await page.locator('#chat-chatDensity').selectOption('compact');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('gigi:preferences:v1:synthetic-chat-0219')).chatDensity),'compact');
 await page.locator('.chat-view-options>summary').click();
 await page.locator('.chat-transcript').evaluate(e=>e.scrollTop=0);const top=await page.locator('.chat-transcript').evaluate(e=>e.scrollTop);
 await page.evaluate(()=>chatAppend('\n\nNew provider output while reading earlier messages.'));
 assert.equal(await page.locator('.chat-transcript').evaluate(e=>e.scrollTop),top);assert.equal(await page.locator('[data-chat-latest]').isVisible(),true);
 await page.evaluate(()=>chatFullRender());assert.equal(await page.locator('[data-chat-latest]').isVisible(),true,'completion workspace refresh retains latest affordance');
 await page.evaluate(()=>chatAppend(''));assert.equal(await page.locator('[data-chat-latest]').isVisible(),true,'latest affordance survives unchanged polls');
 await page.locator('[data-chat-latest]').click();assert.equal(await page.locator('[data-chat-latest]').isVisible(),false);
 assert.equal(await page.locator('#chat-message').evaluate(e=>e===document.activeElement),true);
 await page.keyboard.press('Tab');assert.equal(await page.locator('[data-chat-stop]').evaluate(e=>e===document.activeElement),true,'composer reaches stop with Tab');
 await page.locator('.chat-transcript').evaluate(e=>e.scrollTop=0);
 await page.evaluate(()=>{const text=document.querySelector('.chat-answer strong').firstChild;const range=document.createRange();range.selectNodeContents(text);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);});
 const selected=await page.evaluate(()=>getSelection().toString());await page.evaluate(()=>chatAppend('\nSelection must remain available.'));assert.equal(await page.evaluate(()=>getSelection().toString()),selected);
 await page.evaluate(()=>chatSetState('idle'));
 await page.evaluate(()=>getSelection().removeAllRanges());await page.locator('#chat-message').focus();
 await page.waitForFunction(()=>document.querySelector('.from-agent .chat-answer')?.textContent.includes('Selection must remain available.'));
 assert.equal(await page.locator('#chat-message').inputValue(),'Keep this draft','terminal selection reconciliation preserves draft');
 assert.equal(await page.locator('#chat-message').evaluate(e=>e===document.activeElement),true,'terminal selection reconciliation preserves focus');
 await page.locator('#chat-message').focus();await page.evaluate(()=>chatClearDraft());assert.equal(await page.locator('#chat-message').inputValue(),'');
 // macOS WebKit can retain textarea focus when a starting point is clicked.
 await page.evaluate(()=>{chatSetState('idle');chatClearDraft();});
 const suggestion=page.locator('[data-chat-prompt]').first();const prompt=await suggestion.getAttribute('data-chat-prompt');
 await page.locator('#chat-message').focus();await suggestion.evaluate(button=>button.click());
 assert.equal(await page.locator('#chat-message').inputValue(),prompt,'selected starting point must reach the already-mounted focused composer');
 assert.equal(await page.locator('#chat-message').evaluate(e=>e===document.activeElement),true);
 // Streaming may arrive between composition input events; preserve the DOM edit.
 await page.locator('#chat-message').evaluate(e=>{e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));e.value='Synthetic uncommitted composition';});
 await page.evaluate(()=>chatAppend(' Observed text during composition.'));
 assert.equal(await page.locator('#chat-message').inputValue(),'Synthetic uncommitted composition','ordinary snapshots must not replace in-progress composition');
 await page.locator('#chat-message').evaluate(e=>{e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));e.dispatchEvent(new InputEvent('input',{bubbles:true}));});
 await page.evaluate(()=>{chatAppend(' Composition committed.');chatClearDraft();});
 await page.locator('#chat-message').evaluate(e=>{e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));e.value='Composition from an empty draft';});
 await page.evaluate(()=>chatAppend(' Another observed delta.'));
 assert.equal(await page.locator('#chat-message').inputValue(),'Composition from an empty draft','unchanged empty model must not erase unreported composition input');
 await page.locator('#chat-message').evaluate(e=>{e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));e.dispatchEvent(new InputEvent('input',{bubbles:true}));});

 // Observe temporal changes with normal motion; no token replay/entrance restarts.
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>chatFixture('midnight'));await page.locator('.chat-transcript').evaluate(e=>e.scrollTop=e.scrollHeight);
 for(let i=0;i<5;i++){await page.evaluate(i=>chatAppend(' Observed delta '+i+'.'),i);await page.waitForTimeout(280);assert.equal(await page.locator('.chat-panel').evaluate(e=>e.getAnimations().length),0);}
 for(const state of ['approval','idle','failed','interrupted','running']){await page.evaluate(state=>chatSetState(state),state);await page.waitForTimeout(180);await page.screenshot({path:resolve(out,`state-${state}.png`)});}
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>chatSetState('interrupted'));await page.waitForTimeout(50);assert.equal(await page.locator('.chat-panel').evaluate(e=>e.getAnimations({subtree:true}).length),0);
 assert.equal(await page.locator('.chat-transcript [aria-live], .chat-transcript[aria-live]').count(),0);
 writeFileSync(resolve(out,'metrics.json'),JSON.stringify(metrics,null,2));
 await page.close();console.log(JSON.stringify({passed:true,matrices:metrics.length,out,scope:'offline actual app DOM/CSS with synthetic snapshots; no native/provider acceptance'}));
}finally{await browser.close();}
