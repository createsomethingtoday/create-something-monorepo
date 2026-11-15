import {BOOKING_URL} from './booking';
/** Portable counterpart of the export's service-type, budget and Calendly scripts. */
export function initServices(){
 const expander=document.querySelector<HTMLElement>('#faq-show-hide');
 if(expander){expander.tabIndex=0;expander.setAttribute('role','button');expander.setAttribute('aria-expanded','false');const toggle=()=>{const expanded=expander.getAttribute('aria-expanded')!=='true';expander.setAttribute('aria-expanded',String(expanded));document.querySelectorAll('[data-hide-initially="true"]').forEach(item=>item.classList.toggle('u-hidden',!expanded));expander.textContent=expanded?'– Show fewer FAQs':'+ Show all FAQs'};expander.addEventListener('click',toggle);expander.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle()}})}
 const help=document.querySelector<HTMLDialogElement>('dialog[data-source-help]');
 if(help){document.querySelectorAll<HTMLElement>('[fs-modal-element="open"]').forEach(button=>{button.tabIndex=0;button.setAttribute('role','button');button.addEventListener('click',()=>help.showModal());button.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();help.showModal()}})});help.querySelectorAll<HTMLElement>('[fs-modal-element^="close"]').forEach(button=>{button.addEventListener('click',()=>help.close());button.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();help.close()}})})}
 const params=new URLSearchParams(location.search);
 // Preserve only the export's supported context across steps.
 const context=new URLSearchParams();
 for(const key of ['utm_content','templateName','templateLink','userFullName','userEmail']){
  const value=params.get(key);if(value)context.set(key,value.slice(0,2000));
 }
 const step=(name:string)=>`/templates/services/${name}?${context}`;
 const hire=document.querySelector<HTMLAnchorElement>('#hire-cta');if(hire)hire.href=step('budget');
 const guidance=document.querySelector<HTMLElement>('#guidance-cta');
 const warning=document.querySelector<HTMLElement>('#guidance-warning');
 if(guidance&&warning){
  guidance.tabIndex=0;guidance.setAttribute('role','button');guidance.setAttribute('aria-expanded','false');
  warning.style.display='none';
  const toggle=()=>{const expanded=guidance.getAttribute('aria-expanded')!=='true';guidance.setAttribute('aria-expanded',String(expanded));warning.style.display=expanded?'block':'none'};
  guidance.addEventListener('click',toggle);guidance.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle()}});
 }
 const next=document.querySelector<HTMLAnchorElement>('#budget-continue');
 const back=document.querySelector<HTMLAnchorElement>('#budget-back');if(back)back.href=step('service-type');
 const radios=document.querySelectorAll<HTMLInputElement>('input[name="budget"]');
 const budgets:Record<string,string>={'0-200':'Under $200 USD','200-500':'$200 – $500 USD','500-1000':'$500 – $1,000 USD','1000-2000':'$1,000 – $2,000 USD','over-2000':'Over $2,000 USD'};
 const choose=(value:string)=>{
  if(!next||!budgets[value])return;
  context.set('budget',value);next.href=step('schedule');next.classList.remove('cc-disabled');next.classList.add('cc-enabled');next.setAttribute('aria-disabled','false');
  document.querySelector('#budget-warning-message')?.classList.toggle('u-hidden',value!=='0-200');
  const url=new URL(location.href);url.searchParams.set('budget',value);history.replaceState(null,'',url);
 };
 radios.forEach(radio=>{radio.addEventListener('change',()=>choose(radio.value));if(radio.value===params.get('budget')){radio.checked=true;choose(radio.value)}});
 next?.addEventListener('click',event=>{if(next.getAttribute('aria-disabled')==='true')event.preventDefault()});
 const embed=document.querySelector<HTMLElement>('[data-source-booking]');
 if(!embed)return;
 const notice=document.createElement('p');notice.setAttribute('role','status');notice.textContent='Loading available booking times…';embed.append(notice);
 const url=new URL(BOOKING_URL);
 url.searchParams.set('embed_domain',location.hostname);url.searchParams.set('embed_type','Inline');
 for(const [source,target] of [['userFullName','name'],['userEmail','email'],['utm_content','utm_content']]){const value=context.get(source);if(value)url.searchParams.set(target,value)}
 const budget=params.get('budget');if(budget&&budgets[budget])url.searchParams.set('a3',budgets[budget]);
 const name=context.get('templateName'),link=context.get('templateLink');if(name&&link)url.searchParams.set('a4',`${name} (${link})`);
 const frame=document.createElement('iframe');frame.title='Book a Webflow template services consultation';frame.src=url.href;frame.style.cssText='width:100%;height:850px;border:0';frame.addEventListener('load',()=>{notice.textContent='Calendar loaded. Choose an available consultation time.'});void fetch('/templates-api/booking-status',{signal:AbortSignal.timeout(15000)}).then(async response=>{if(!response.ok)throw new Error('Booking check failed');const status=await response.json();if(status.available!==true){notice.textContent='Booking is temporarily unavailable. Please try again later.';return;}embed.append(frame)}).catch(()=>{notice.textContent='The booking calendar could not be checked. Please try again later.'});
 const retry=document.createElement('button');retry.type='button';retry.textContent='Reload calendar';retry.addEventListener('click',()=>{notice.textContent='Reloading available booking times…';location.reload()});embed.append(retry);
 window.addEventListener('message',event=>{
  if(event.origin!=='https://calendly.com'||event.source!==frame.contentWindow)return;
  if(event.data?.event==='calendly.event_scheduled')notice.textContent='Calendly confirmed your booking. Check your email for the details.';
 });
}
