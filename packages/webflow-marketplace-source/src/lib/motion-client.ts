import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {ScrollToPlugin} from 'gsap/ScrollToPlugin';

// GSAP motion layer. The home page gets a load sequence and scroll reveals; every
// page gets small, quick microinteractions on the shopping surfaces. Vendor cards
// and grids already animate opacity in CSS (tmcard-enter, tmgrid-fade-in), so the
// card reveals here move transforms only and never fight those keyframes.
// Reduced motion: nothing below runs, and the pre-paint class is removed.

gsap.registerPlugin(ScrollTrigger,ScrollToPlugin);

const PRESS='.rd-btn,.rd-chip,.rd-mcat,.rd-search-submit,.rd-search-clear,.rd-share-search,.rd-search-filter-toggle,.rd-search-compare,.rd-brief-chips button,.rd-active-filters a,.rd-clear-all,.tmfilter-pill,.tmfilter-trigger,.rd-control-trigger,.rd-mobile-tabs button,.rd-pill-arrow';
const CARD='.tmcard-wrapper';
const ENTER='.rd-brief-chips button,.rd-active-filters a,.rd-comparison-tray,.rd-suggest';
const below=(el:Element)=>el.getBoundingClientRect().top>innerHeight*.92;
// Search cards carry overlay badges outside the vendor card, so they move as one article.
const lift=(card:HTMLElement)=>card.closest<HTMLElement>('.rd-search-card')||card;
const ARROW_TEXT='→';
const PILLS='.tmfilter-subcategory-scroll';
const PEEK='rd-pills-peeked';
const CHEVRON='<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function heroLoad(){
 const hero=document.querySelector<HTMLElement>('.rd-hero');
 if(!hero){document.documentElement.classList.remove('rd-motion');return}
 // The headline, search and copy paint with the server HTML; only the shots wait for the
 // script, so the hero's largest paint is never held back by the load sequence.
 const shots=gsap.utils.toArray<HTMLElement>('.rd-hero-card',hero);
 gsap.set('.rd-hero-shots',{autoAlpha:1});
 document.documentElement.classList.remove('rd-motion');
 gsap.from(shots,{yPercent:20,autoAlpha:0,rotate:i=>[-4,0,4][i]??0,transformOrigin:'50% 100%',duration:.8,stagger:{each:.06,from:'center'},ease:'expo.out',clearProps:'transform,opacity,visibility'});
 // The shots drift up as the hero scrolls away.
 gsap.to('.rd-hero-shots',{y:-72,ease:'none',scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:.6}});
}

function homeReveals(){
 const home=document.querySelector('.rd-home');
 if(!home)return;
 const batch=(selector:string,from:gsap.TweenVars,each=.08)=>{
  const els=gsap.utils.toArray<HTMLElement>(selector,home).filter(below);
  if(!els.length)return;
  gsap.set(els,from);
  ScrollTrigger.batch(els,{start:'top 90%',once:true,onEnter:batched=>gsap.to(batched,{y:0,autoAlpha:1,duration:.9,stagger:each,ease:'power3.out',overwrite:true})});
 };
 batch('.rd-head',{y:28,autoAlpha:0});
 batch('.rd-cat-tile,.rd-cat-all',{y:40,autoAlpha:0},.07);
 batch('.rd-mcat',{y:16,autoAlpha:0},.03);
 batch('.rd-creator',{y:32,autoAlpha:0},.09);
 batch('.rd-free-lead',{y:16,autoAlpha:0});
 // Category stacks open like a fanned hand of cards as each tile arrives.
 gsap.utils.toArray<HTMLElement>('.rd-cstack',home).filter(below).forEach(stack=>{
  gsap.fromTo(stack,{'--fan':0},{'--fan':1,duration:1.1,ease:'back.out(1.6)',scrollTrigger:{trigger:stack,start:'top 88%',once:true}});
 });
 const mcp=home.querySelector<HTMLElement>('.rd-mcp');
 if(mcp&&below(mcp))gsap.fromTo(mcp,{clipPath:'inset(0% 6% round 16px)',autoAlpha:.4},{clipPath:'inset(0% 0% round 8px)',autoAlpha:1,duration:1.1,ease:'power3.out',clearProps:'clipPath',scrollTrigger:{trigger:mcp,start:'top 85%',once:true}});
}

// Cards below the fold rise into place as they scroll in.
function revealCards(cards:HTMLElement[]){
 if(!cards.length)return;
 cards=cards.map(lift);
 gsap.set(cards,{y:36,scale:.985,transformOrigin:'50% 100%'});
 ScrollTrigger.batch(cards,{start:'top 95%',once:true,onEnter:batched=>gsap.to(batched,{y:0,scale:1,duration:.8,stagger:.06,ease:'power3.out',overwrite:'auto'})});
}

function arrowOf(link:Element){
 return [...link.querySelectorAll<HTMLElement>('[aria-hidden="true"]')].find(span=>span.textContent?.trim()===ARROW_TEXT);
}

function microinteractions(){
 const pressed=new Set<HTMLElement>();
 const release=()=>{pressed.forEach(el=>gsap.to(el,{scale:1,duration:.45,ease:'back.out(3)',overwrite:'auto'}));pressed.clear()};
 const onDown=(e:PointerEvent)=>{
  const target=e.target as Element;
  const card=target.closest<HTMLElement>(CARD);
  const el=target.closest<HTMLElement>(PRESS)||(card&&lift(card));
  if(!el||(el as HTMLButtonElement).disabled)return;
  pressed.add(el);
  gsap.to(el,{scale:el===card||el.matches('.rd-search-card')?.985:.95,duration:.12,ease:'power2.out',overwrite:'auto'});
 };
 // Hover: cards lift, link arrows nudge forward. pointerover/out bubble, so one listener covers islands that mount later.
 const hover=(e:PointerEvent,on:boolean)=>{
  if(e.pointerType==='touch')return;
  const target=e.target as Element,related=e.relatedTarget as Node|null;
  const card=target.closest<HTMLElement>(CARD);
  if(card&&!(related&&card.contains(related)))gsap.to(lift(card),{y:on?-6:0,duration:on?.4:.5,ease:on?'power3.out':'power2.out',overwrite:'auto'});
  const link=target.closest('a');
  const arrow=link&&!(related&&link.contains(related))?arrowOf(link):undefined;
  if(arrow&&getComputedStyle(arrow).display==='inline')arrow.style.display='inline-block';
  if(arrow)gsap.to(arrow,{x:on?4:0,duration:on?.3:.4,ease:on?'power2.out':'back.out(2)',overwrite:'auto'});
 };
 const onOver=(e:PointerEvent)=>hover(e,true),onOut=(e:PointerEvent)=>hover(e,false);
 // <details> panels (why this template, about these templates) open with a short unfold.
 const onToggle=(e:Event)=>{
  const details=e.target as HTMLDetailsElement;
  if(!(details instanceof HTMLDetailsElement)||!details.open)return;
  const body=[...details.children].filter(child=>child.tagName!=='SUMMARY');
  gsap.from(body,{height:0,autoAlpha:0,y:-4,duration:.35,ease:'power2.out',clearProps:'height,opacity,visibility,transform'});
 };
 document.addEventListener('pointerdown',onDown);
 ['pointerup','pointercancel','dragstart'].forEach(type=>document.addEventListener(type,release));
 document.addEventListener('pointerover',onOver);
 document.addEventListener('pointerout',onOut);
 document.addEventListener('toggle',onToggle,true);

 // Live UI: chips, the comparison tray and typeahead pop in; result counts settle when they change;
 // cards that islands insert after load rise in.
 const pop=(el:HTMLElement)=>gsap.from(el,{scale:el.matches('.rd-comparison-tray,.rd-suggest')?.98:.85,y:el.matches('.rd-suggest')?-4:0,autoAlpha:0,duration:.3,ease:'back.out(2)',clearProps:'transform,opacity,visibility'});
 let added:HTMLElement[]=[],frame=0;
 const flush=()=>{
  frame=0;
  const cards=new Set<HTMLElement>();
  for(const node of added){
   if(!node.isConnected)continue;
   if(node.matches(ENTER))pop(node);
   node.querySelectorAll<HTMLElement>(ENTER).forEach(pop);
   (node.matches(CARD)?[node]:[...node.querySelectorAll<HTMLElement>(CARD)]).forEach(card=>cards.add(card));
  }
  added=[];
  const list=[...cards];
  revealCards(list.filter(below));
  // In-view inserts (search results, hydrated grids) already fade in through vendor CSS; add a short rise.
  const inView=list.filter(card=>!below(card)&&!card.closest('.tmgrid-item'));
  if(inView.length)gsap.from(inView.map(lift),{y:14,duration:.6,stagger:.04,ease:'power3.out'});
 };
 const observer=new MutationObserver(records=>{
  for(const record of records){
   const changed=record.target instanceof Element?record.target:record.target.parentElement;
   const count=changed?.closest<HTMLElement>('.rd-result-count');
   if(count){
    gsap.fromTo(count,{y:6,autoAlpha:.35},{y:0,autoAlpha:1,duration:.4,ease:'power3.out',overwrite:true});
   }
   record.addedNodes.forEach(node=>{if(node instanceof HTMLElement)added.push(node)});
  }
  if(added.length&&!frame)frame=requestAnimationFrame(flush);
 });
 observer.observe(document.body,{childList:true,subtree:true,characterData:true});

 return()=>{
  observer.disconnect();cancelAnimationFrame(frame);
  document.removeEventListener('pointerdown',onDown);
  ['pointerup','pointercancel','dragstart'].forEach(type=>document.removeEventListener(type,release));
  document.removeEventListener('pointerover',onOver);
  document.removeEventListener('pointerout',onOut);
  document.removeEventListener('toggle',onToggle,true);
 };
}

// Category pill rows scroll sideways. Edge fades and arrow buttons show which side has more;
// an arrow pages the row so the clipped pill lands first, the active pill is brought into view,
// and the first overflowing row of a session peeks once to show that it moves.
// Fades and arrows also run under reduced motion, only without the tweens.
function pillRow(scroll:HTMLElement,motion:boolean){
 const track=scroll.querySelector<HTMLElement>('.tmfilter-subcategory-track');
 if(!track)return;
 scroll.dataset.rdPills='';
 const pad=()=>parseFloat(getComputedStyle(track).scrollPaddingLeft)||0;
 const max=()=>track.scrollWidth-track.clientWidth;
 const sync=()=>{
  scroll.toggleAttribute('data-more-start',track.scrollLeft>2);
  scroll.toggleAttribute('data-more-end',track.scrollLeft<max()-2);
 };
 // Slide offsets inside the track's scroll area; these are the scroll-snap points.
 const slides=()=>{
  const left=track.getBoundingClientRect().left-track.scrollLeft;
  return [...track.children].map(el=>{const r=el.getBoundingClientRect();return {x:r.left-left,end:r.right-left,el}});
 };
 // Scroll snap fights scripted scrolling, so it is off while a tween runs.
 const settle=()=>{track.style.scrollSnapType=''};
 const glide=(x:number,duration=.6)=>{
  x=gsap.utils.clamp(0,max(),x);
  if(!motion){track.scrollTo({left:x});return}
  track.style.scrollSnapType='none';
  gsap.to(track,{scrollTo:{x,autoKill:true},duration,ease:'power3.inOut',overwrite:true,onComplete:settle,onInterrupt:settle});
 };
 const page=(dir:number)=>{
  const left=track.scrollLeft,right=left+track.clientWidth-pad();
  const points=slides();
  const next=dir>0
   ?points.find(s=>s.end>right+1)?.x
   :points.find(s=>s.x>=left-track.clientWidth*.8&&s.x<left-1)?.x;
  glide((next??left+dir*track.clientWidth*.75)-pad());
 };
 const reveal=(animate:boolean)=>{
  const active=track.querySelector('[aria-current="page"]')?.closest<HTMLElement>('.tmfilter-subcategory-slide');
  const slide=active&&slides().find(s=>s.el===active);
  if(!slide||(slide.x>=track.scrollLeft+pad()&&slide.end<=track.scrollLeft+track.clientWidth-pad()))return;
  if(animate)glide(slide.x-pad());else track.scrollLeft=slide.x-pad();
 };
 const arrows=[-1,1].map(dir=>{
  const button=document.createElement('button');
  button.type='button';button.className='rd-pill-arrow';button.dataset.dir=dir<0?'start':'end';
  // Pills stay in the tab order and scroll into view on focus; the arrows are a pointer shortcut.
  button.tabIndex=-1;button.setAttribute('aria-hidden','true');
  button.innerHTML=CHEVRON;
  button.addEventListener('click',()=>page(dir));
  scroll.append(button);
  return button;
 });
 let frame=0;
 const onScroll=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;sync()})};
 track.addEventListener('scroll',onScroll,{passive:true});
 // Pills also change width when the web font loads, so each slide is observed too.
 const resize=new ResizeObserver(sync);
 const measure=()=>{resize.observe(track);[...track.children].forEach(el=>resize.observe(el))};
 measure();
 // Pills load after the row mounts, and a pill click can move aria-current without a page load.
 const changes=new MutationObserver(records=>{
  measure();sync();
  if(records.some(r=>r.type==='attributes'))reveal(true);
 });
 changes.observe(track,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-current']});
 reveal(false);
 sync();

 let peek:gsap.core.Timeline|undefined,seen:IntersectionObserver|undefined;
 const peeked=()=>{try{return !!sessionStorage.getItem(PEEK)}catch{return true}};
 if(motion&&!peeked()&&track.scrollLeft===0&&max()>2){
  seen=new IntersectionObserver(([entry])=>{
   if(!entry.isIntersecting)return;
   seen?.disconnect();
   try{sessionStorage.setItem(PEEK,'1')}catch{}
   track.style.scrollSnapType='none';
   peek=gsap.timeline({delay:.5,onComplete:settle,onInterrupt:settle})
    .to(track,{scrollTo:{x:Math.min(72,max()),autoKill:true},duration:.55,ease:'power2.inOut'})
    .to(arrows[1],{x:4,duration:.18,ease:'power1.out',yoyo:true,repeat:3},'<.15')
    .to(track,{scrollTo:{x:0,autoKill:true},duration:.7,ease:'power3.out'},'>-.1');
  },{threshold:1});
  seen.observe(track);
 }
 // A user scroll or press ends the peek at once.
 const stop=()=>{if(peek?.isActive()){peek.kill();settle()}};
 track.addEventListener('pointerdown',stop);
 track.addEventListener('wheel',stop,{passive:true});

 return()=>{
  peek?.kill();seen?.disconnect();resize.disconnect();changes.disconnect();cancelAnimationFrame(frame);
  gsap.killTweensOf(track);settle();
  track.removeEventListener('scroll',onScroll);
  track.removeEventListener('pointerdown',stop);
  track.removeEventListener('wheel',stop);
  arrows.forEach(button=>button.remove());
  scroll.removeAttribute('data-rd-pills');scroll.removeAttribute('data-more-start');scroll.removeAttribute('data-more-end');
 };
}

// Islands render pill rows after load. A row in server HTML waits until its island hydrates,
// so the added arrows never break React's hydration match.
function pillRows(motion:boolean){
 const rows=new Map<HTMLElement,()=>void>();
 const scan=()=>{
  rows.forEach((off,scroll)=>{if(!scroll.isConnected){off();rows.delete(scroll)}});
  document.querySelectorAll<HTMLElement>(PILLS).forEach(scroll=>{
   if(rows.has(scroll)||scroll.closest('astro-island[ssr]'))return;
   const off=pillRow(scroll,motion);
   if(off)rows.set(scroll,off);
  });
 };
 let frame=0;
 const observer=new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;scan()})});
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['ssr']});
 scan();
 return()=>{observer.disconnect();cancelAnimationFrame(frame);rows.forEach(off=>off());rows.clear()};
}

export function initMotion(){
 document.documentElement.dataset.motion='on';
 const mm=gsap.matchMedia();
 mm.add('(prefers-reduced-motion: no-preference)',()=>{
  const start=()=>{
   heroLoad();
   homeReveals();
   revealCards(gsap.utils.toArray<HTMLElement>(CARD).filter(below));
  };
  start();
  const off=[microinteractions(),pillRows(true)];
  return()=>off.forEach(fn=>fn());
 });
 mm.add('(prefers-reduced-motion: reduce)',()=>{document.documentElement.classList.remove('rd-motion');return pillRows(false)});
}
