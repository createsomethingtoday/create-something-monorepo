// Test host only. This file is injected by ui-review-server.mjs, never built/shipped.
const reviewParams=new URL(location.href).searchParams;
const originalFetch=window.fetch.bind(window);
let releaseConversation;
const conversationGate=new Promise(resolve=>{releaseConversation=resolve;});
window.__reviewReleaseConversation=()=>releaseConversation();
window.fetch=(input,options)=>{
 if(typeof input==='string'&&input.startsWith('/api/')){
  const url=new URL(input,location.origin);
  url.searchParams.set('__fixture',reviewParams.get('fixture')||'populated');
  if(reviewParams.get('conversation')==='held'&&url.pathname.startsWith('/api/v1/conversations/')){
   return conversationGate.then(()=>originalFetch(url,options));
  }
  return originalFetch(url,options);
 }
 return originalFetch(input,options);
};
// Real browser regression: a late thread response must not interrupt an open draft.
// Reload /app?fixture=populated&conversation=held before each reply/new case.
window.__reviewComposerFocusRegression=async(mode='reply')=>{
 if(reviewParams.get('conversation')!=='held')throw new Error('Use conversation=held for this regression');
 const waitFor=async(check)=>{const deadline=performance.now()+4000;while(!check()){if(performance.now()>deadline)throw new Error('Composer regression timed out');await new Promise(resolve=>setTimeout(resolve,20));}};
 await waitFor(()=>document.querySelector('[data-thread-id="review"]'));
 document.querySelector('[data-thread-id="review"]').click();
 document.querySelector(mode==='new'?'#new-message':'.reply-button').click();
 const input=document.querySelector('#message-text'),text=`Keep this ${mode} draft while the thread loads`;
 input.focus();input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));input.setSelectionRange(5,9);
 const before={focus:document.activeElement.id,parent:input.closest('form').parentElement.id,selection:[input.selectionStart,input.selectionEnd]};
 window.__reviewReleaseConversation();
 await waitFor(()=>document.querySelector('.conversation-heading h3')?.textContent==='Canon + Studio');
 const after={focus:document.activeElement.id,parent:input.closest('form').parentElement.id,selection:[input.selectionStart,input.selectionEnd],text:input.value};
 return {mode,before,after,pass:document.activeElement===input&&input.value===text&&input.selectionStart===5&&input.selectionEnd===9};
};
// Deterministic JS preference test when browser-tool OS emulation is unavailable.
// This is explicitly a fixture, not proof that the OS preference was changed.
if(['reduced','preference'].includes(reviewParams.get('motion'))){
 const nativeMatchMedia=window.matchMedia.bind(window), lists=[];
 let reduced=reviewParams.get('motion')==='reduced';
 window.matchMedia=(query)=>{
  if(!query.includes('prefers-reduced-motion'))return nativeMatchMedia(query);
  const result=new EventTarget();
  Object.defineProperties(result,{media:{value:query},matches:{get:()=>query.includes('no-preference')?!reduced:reduced}});
  result.addListener=(listener)=>result.addEventListener('change',listener);
  result.removeListener=(listener)=>result.removeEventListener('change',listener);
  lists.push(result);return result;
 };
 const style=document.createElement('style');document.head.append(style);
 const applyStyle=()=>style.textContent=reduced?'html{scroll-behavior:auto!important}*,*::before,*::after{transition:none!important;animation:none!important}':'';
 window.__reviewReducedMotion=(value)=>{reduced=value;applyStyle();for(const list of lists){const event=new Event('change');Object.defineProperties(event,{matches:{value:list.matches},media:{value:list.media}});list.dispatchEvent(event);list.onchange?.(event);}};
 applyStyle();
}
window.__reviewMetrics={longTasks:[],layoutShifts:[],frames:[]};
try{new PerformanceObserver(list=>{for(const e of list.getEntries())window.__reviewMetrics.longTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});}catch{}
try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__reviewMetrics.layoutShifts.push({start:e.startTime,value:e.value});}).observe({type:'layout-shift',buffered:true});}catch{}
window.__reviewSample=(selector,duration=800)=>{
 const samples=[],start=performance.now();
 window.__reviewMetrics.frames=samples;
 return new Promise(resolve=>{const frame=()=>{const node=document.querySelector(selector),s=node&&getComputedStyle(node);samples.push({t:Math.round(performance.now()-start),transform:s?.transform,opacity:s?.opacity,visibility:s?.visibility,display:s?.display,scroll:scrollY});if(performance.now()-start<duration)requestAnimationFrame(frame);else resolve(samples);};requestAnimationFrame(frame);});
};
// Sample initial entry before the external browser driver can miss its short duration.
window.__reviewLoad=[];
document.addEventListener('DOMContentLoaded',()=>{
 const began=performance.now();
 const sample=()=>{
  const nodes=[...document.querySelectorAll('.hero-copy,.handoff-figure,#console,.session-screen')].filter(node=>node.getClientRects().length);
  window.__reviewLoad.push({t:Math.round(performance.now()-began),nodes:nodes.map(node=>({key:node.id||node.className,transform:getComputedStyle(node).transform,opacity:getComputedStyle(node).opacity}))});
  if(performance.now()-began<800)requestAnimationFrame(sample);
 };
 requestAnimationFrame(sample);
});
