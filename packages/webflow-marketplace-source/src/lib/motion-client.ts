import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {SplitText} from 'gsap/SplitText';

// GSAP motion layer. The home page gets a load sequence and scroll reveals; every
// page gets small, quick microinteractions on the shopping surfaces. Vendor cards
// and grids already animate opacity in CSS (tmcard-enter, tmgrid-fade-in), so the
// card reveals here move transforms only and never fight those keyframes.
// Reduced motion: nothing below runs, and the pre-paint class is removed.

gsap.registerPlugin(ScrollTrigger,SplitText);

const PRESS='.rd-btn,.rd-chip,.rd-mcat,.rd-search-submit,.rd-search-clear,.rd-share-search,.rd-search-filter-toggle,.rd-search-compare,.rd-brief-chips button,.rd-active-filters a,.rd-clear-all,.tmfilter-pill,.tmfilter-trigger,.rd-control-trigger,.rd-mobile-tabs button';
const CARD='.tmcard-wrapper';
const ENTER='.rd-brief-chips button,.rd-active-filters a,.rd-comparison-tray,.rd-suggest';
const below=(el:Element)=>el.getBoundingClientRect().top>innerHeight*.92;
// Search cards carry overlay badges outside the vendor card, so they move as one article.
const lift=(card:HTMLElement)=>card.closest<HTMLElement>('.rd-search-card')||card;
const ARROW_TEXT='→';

function heroLoad(){
 const hero=document.querySelector<HTMLElement>('.rd-hero');
 if(!hero){document.documentElement.classList.remove('rd-motion');return}
 const h1=hero.querySelector<HTMLElement>('h1');
 const shots=gsap.utils.toArray<HTMLElement>('.rd-hero-card',hero);
 const rest=gsap.utils.toArray<HTMLElement>(':scope>:not(h1):not(.rd-hero-shots)',hero);
 const split=h1?SplitText.create(h1,{type:'lines,words',mask:'lines'}):null;
 const tl=gsap.timeline({defaults:{ease:'power4.out'},onComplete(){split?.revert();document.documentElement.classList.remove('rd-motion')}});
 tl.set(hero.children,{autoAlpha:1})
  .from(rest[0],{y:12,autoAlpha:0,duration:.6})
  .from(split?split.words:[],{yPercent:110,duration:1,stagger:.045},'<.05')
  .from(rest.slice(1),{y:18,autoAlpha:0,duration:.8,stagger:.07},'-=.7')
  .from(shots,{yPercent:28,autoAlpha:0,rotate:i=>[-5,0,5][i]??0,transformOrigin:'50% 100%',duration:1.3,stagger:{each:.09,from:'center'},ease:'expo.out',clearProps:'transform,opacity,visibility'},'-=.75');
 const count=hero.querySelector<HTMLElement>('[data-rd-count]');
 if(count){const total=Number(count.dataset.rdCount)||0,n={v:0};tl.to(n,{v:total,duration:1.4,ease:'power2.out',onUpdate(){count.textContent=Math.round(n.v).toLocaleString('en-US')}},'<.2')}
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

export function initMotion(){
 document.documentElement.dataset.motion='on';
 const mm=gsap.matchMedia();
 mm.add('(prefers-reduced-motion: no-preference)',()=>{
  const start=()=>{
   heroLoad();
   homeReveals();
   revealCards(gsap.utils.toArray<HTMLElement>(CARD).filter(below));
  };
  // Split lines only after the web font has loaded, so line breaks are final.
  if(document.querySelector('.rd-hero h1'))Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1200))]).then(start);else start();
  return microinteractions();
 });
 mm.add('(prefers-reduced-motion: reduce)',()=>{document.documentElement.classList.remove('rd-motion')});
}
