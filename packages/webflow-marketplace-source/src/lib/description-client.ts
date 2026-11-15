import {analyticsAllowed} from '../components/Consent';
const collapsed=750;
/** Production parity: long detail descriptions collapse to 750px behind Show more / Show less. */
export function initDescription(){
 const wrapper=document.querySelector<HTMLElement>('.long-description'),text=document.getElementById('longDescription'),overlay=document.getElementById('longDescriptionOverlay'),button=document.querySelector<HTMLButtonElement>('#showMoreDescription'),control=button?.parentElement;
 if(!wrapper||!text||!overlay||!button||!control)return;
 let expanded=false;
 const track=(event:string)=>{if(analyticsAllowed())(window as {wf_analytics?:{track?:(name:string,data:Record<string,unknown>)=>void}}).wf_analytics?.track?.(event,{template:button.dataset.templateName||''})};
 const render=()=>{
  // Images and fonts can change the height after load; re-measure while collapsed.
  const long=text.scrollHeight>collapsed;
  wrapper.style.maxHeight=long&&!expanded?collapsed+'px':'';
  wrapper.style.overflow=long&&!expanded?'hidden':'';
  overlay.style.display=long&&!expanded?'block':'none';
  control.style.display=long?'flex':'none';
  button.textContent=expanded?'Show less':'Show more';
  button.setAttribute('aria-expanded',String(expanded));
 };
 button.addEventListener('click',()=>{
  expanded=!expanded;render();
  track(expanded?'Template Detail Page - Full Description Expanded':'Template Detail Page - Full Description Collapsed');
  if(!expanded)document.getElementById('templateDetails')?.scrollIntoView({behavior:'smooth'});
 });
 new ResizeObserver(render).observe(text);
 render();
}
