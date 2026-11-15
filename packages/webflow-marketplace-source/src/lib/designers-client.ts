/** Filter the creator directory by name; letter groups with no match hide. A–Z jumps are handled
 * here because webflow.js smooth-scrolls same-page anchors without honoring scroll-margin. */
export function initDesignerDirectory(){
 const find=document.querySelector<HTMLElement>('.rd-dir-find');
 const input=find?.querySelector<HTMLInputElement>('input');
 if(!find||!input)return;
 const fold=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
 const items=[...document.querySelectorAll<HTMLElement>('.rd-dir-list li')].map(li=>({li,name:fold(li.textContent||'')}));
 const groups=[...document.querySelectorAll<HTMLElement>('.rd-dir-group')];
 const status=document.querySelector<HTMLElement>('[data-rd-dir-status]');
 const empty=document.querySelector<HTMLElement>('[data-rd-dir-empty]');
 find.hidden=false;
 document.querySelector('.rd-az')?.addEventListener('click',event=>{
  const link=(event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
  const target=link&&document.getElementById(link.hash.slice(1));
  if(!target)return;
  event.preventDefault();event.stopPropagation();
  if(target.hidden){input.value='';input.dispatchEvent(new Event('input'));}
  target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  history.replaceState(null,'',link.hash);
 });
 input.addEventListener('input',()=>{
  const q=fold(input.value.trim());let shown=0;
  for(const {li,name} of items){li.hidden=!!q&&!name.includes(q);if(!li.hidden)shown++;}
  for(const group of groups)group.hidden=!group.querySelector('li:not([hidden])');
  if(empty)empty.hidden=shown>0;
  if(status)status.textContent=q?`${shown} ${shown===1?'creator matches':'creators match'}`:'';
 });
}
