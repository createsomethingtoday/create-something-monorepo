/** Published submission app owns validation, uploads, Turnstile and delivery. */
export function initSubmission(){
 const frame=document.querySelector<HTMLIFrameElement>('iframe[data-source-submission]');if(!frame)return;
 const origin=new URL(frame.src).origin;
 if(!['https://webflow-template-form.webflow.io','https://webflow-library-submission-form.webflow.io'].includes(origin))return;
 const send=(data:unknown)=>frame.contentWindow?.postMessage(data,origin);
 frame.addEventListener('load',()=>{
  const params:Record<string,string>={};const query=new URLSearchParams(location.search);
  for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']){const value=query.get(key);if(value)params[key]=value}
  send({type:'ts-submission:utm',params});
 });
 window.addEventListener('message',event=>{
  if(event.origin!==origin||event.source!==frame.contentWindow||!event.data)return;
  if(event.data.type==='ts-submission:resize'&&Number.isFinite(event.data.height))frame.style.height=`${Math.max(400,Math.min(30000,event.data.height))}px`;
  if(event.data.type==='ts-submission:scroll-to'&&Number.isFinite(event.data.offsetTop))window.scrollTo({top:Math.max(0,frame.getBoundingClientRect().top+scrollY+event.data.offsetTop-24),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 });
 // Parent navigation moves the existing form state machine without leaving the app.
 document.querySelectorAll<HTMLAnchorElement>('a[href*="section=join-today"],a[href*="section=submit-today"]').forEach(link=>link.addEventListener('click',event=>{
  const destination=new URL(link.href);const section=destination.searchParams.get('section');
  if(section!=='join-today'&&section!=='submit-today')return;
  event.preventDefault();send({type:'ts-submission:navigate',section});frame.scrollIntoView({behavior:'smooth',block:'start'});
 }));
}
