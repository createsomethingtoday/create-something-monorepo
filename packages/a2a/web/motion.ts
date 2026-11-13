/** Optional progressive enhancement. Native actions, focus and scrolling never wait for GSAP. */
type Engine = (typeof import('gsap'))['gsap'];
let engine: Engine | undefined;
let started = false;
let suspended = false;
const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
const seen = new Set<string>();
const active = new Set<gsap.core.Tween>();
const touched = new Map<HTMLElement,Set<gsap.core.Tween>>();
const controls = 'button,a[href],summary,select,input,textarea';
const nested = '#thread-list,#conversation,.context-content';
let rail: HTMLElement;
let frame = 0;
let observer: IntersectionObserver | undefined;
let pressed: HTMLElement | null = null;
const visible = (element: HTMLElement) => !!element.getClientRects().length && !element.closest('[hidden]');
const moving = () => !!engine && !preference.matches && !suspended && !document.hidden;

function tween(element: HTMLElement, vars: gsap.TweenVars, clear = '') {
  if (!engine) return;
  const animations=touched.get(element)??new Set<gsap.core.Tween>();
  touched.set(element,animations);
  const finish=()=>{active.delete(animation);animations.delete(animation);if(!animations.size)touched.delete(element);};
  const animation = engine.to(element, {...vars, overwrite: 'auto', onComplete: () => {
    finish();
    if (clear) engine?.set(element, {clearProps: clear});
  }, onInterrupt: finish});
  animations.add(animation);touched.set(element,animations);active.add(animation);
}
function settle() {
  const elements=[...touched.keys()];
  active.forEach(animation => animation.kill()); active.clear();
  elements.forEach(element => engine?.set(element, {clearProps:'transform,opacity,boxShadow'})); touched.clear();
}
/** Call only for a meaningful reveal, never for input or background re-renders. */
export function motionEnter(element: HTMLElement, key?: string) {
  if (!visible(element)) return;
  if (key && seen.has(key)) return;
  if (key) seen.add(key);
  if (!moving()) return;
  engine!.killTweensOf(element);
  engine!.set(element, {y:6});
  tween(element, {y:0, duration:.24, ease:'power2.out'}, 'transform');
}
function progress() {
  frame = 0;
  if (suspended) return;
  const height = document.documentElement.scrollHeight - window.innerHeight;
  const value = height > 0 ? Math.min(1, Math.max(0, window.scrollY / height)) : 0;
  rail.hidden = height <= 1;
  if (engine) {
    if (moving()) tween(rail, {scaleX:value,duration:.1,ease:'none'});
    else engine.set(rail,{scaleX:value});
  } else rail.style.transform = `scaleX(${value})`;
}
function scheduleProgress() { if (!frame && !suspended) frame = requestAnimationFrame(progress); }
function scroll(event: Event) {
  if (event.target instanceof HTMLElement && event.target.matches(nested)) {
    const element = event.target, remaining = element.scrollHeight - element.clientHeight;
    element.dataset.scrollEdge = remaining <= 1 ? 'none' : element.scrollTop <= 1 ? 'start' : element.scrollTop >= remaining - 1 ? 'end' : 'middle';
    const value = remaining > 0 ? Math.min(1, Math.max(0, element.scrollTop / remaining)) : 0;
    if (engine && moving()) tween(element, {'--nested-progress':value,duration:.1,ease:'none'});
    else element.style.setProperty('--nested-progress', String(value));
  } else scheduleProgress();
}
function feedback(event: Event) {
  const element = event.target instanceof Element ? event.target.closest<HTMLElement>(controls) : null;
  if (!element || element.matches(':disabled,[aria-disabled=true]') || !moving()) return;
  // A border inset preserves text geometry and native outline on all control types.
  tween(element, {boxShadow:'inset 0 0 0 1px currentColor',duration:.08,ease:'power1.out'});
}
function release(event: Event) {
  const element = event.target instanceof Element ? event.target.closest<HTMLElement>(controls) : null;
  if (!element || !moving()) return;
  tween(element, {boxShadow:'inset 0 0 0 0px currentColor',duration:.18,ease:'power2.out'},'boxShadow');
}
export function startMotion() {
  if (started) return; started = true;
  const began = performance.now(), initialScroll = window.scrollY;
  rail = document.createElement('div');rail.className='motion-progress';rail.setAttribute('aria-hidden','true');document.body.append(rail);
  document.addEventListener('pointerdown',event=>{pressed=event.target instanceof Element?event.target.closest<HTMLElement>(controls):null;feedback(event);},true);
  document.addEventListener('focusin',feedback,true);
  const releasePress=(event:Event)=>{
    if(pressed&&moving())tween(pressed,{boxShadow:'inset 0 0 0 0px currentColor',duration:.18,ease:'power2.out'},'boxShadow');
    pressed=null;release(event);
  };
  document.addEventListener('pointerup',releasePress,true);
  document.addEventListener('pointercancel',releasePress,true);
  window.addEventListener('blur',()=>{pressed=null;settle();});
  document.addEventListener('focusout',release,true);
  document.addEventListener('click',event => {
    const element=event.target instanceof Element?event.target.closest<HTMLElement>(controls):null;
    if(!element||element.matches(':disabled,[aria-disabled=true]')||!moving())return;
    engine!.set(element,{boxShadow:'inset 0 0 0 1px currentColor'});release(event);
  },true);
  document.addEventListener('toggle',event => {
    if (event.target instanceof HTMLDetailsElement && event.target.open) {
      Array.from(event.target.children).filter((child):child is HTMLElement => child instanceof HTMLElement && child.tagName!=='SUMMARY').forEach(child=>motionEnter(child));
    }
    scheduleProgress();
  },true);
  document.addEventListener('scroll',scroll,{capture:true,passive:true});
  window.addEventListener('resize',scheduleProgress,{passive:true});
  preference.addEventListener('change',()=>{settle();progress();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){settle();cancelAnimationFrame(frame);frame=0;}else scheduleProgress();});
  window.addEventListener('pagehide',()=>{suspended=true;settle();cancelAnimationFrame(frame);frame=0;observer?.disconnect();});
  window.addEventListener('pageshow',()=>{suspended=false;observeSections();scheduleProgress();});
  function observeSections() {
    observer?.disconnect();
    if(!('IntersectionObserver' in window))return;
    observer = new IntersectionObserver(entries=>entries.forEach(entry=>{
      if (!entry.isIntersecting) return;
      const element=entry.target as HTMLElement;
      motionEnter(element,`section:${element.id}`);observer?.unobserve(element);
    }),{threshold:.12});
    document.querySelectorAll<HTMLElement>('.process-section,.connect-section,.privacy-section').forEach(element=>{
      const rect=element.getBoundingClientRect();
      // Already read or visible content stays still if the chunk arrives late.
      if(rect.top<window.innerHeight)seen.add(`section:${element.id}`);else if(!seen.has(`section:${element.id}`))observer!.observe(element);
    });
  }
  observeSections();progress();
  void import('gsap').then(({gsap})=>{
    engine=gsap;
    if(suspended || document.hidden)return;
    document.documentElement.dataset.motion='ready';
    if(performance.now()-began<450 && window.scrollY===initialScroll){
      document.querySelectorAll<HTMLElement>('.hero-copy,.handoff-figure,.session-screen:not([hidden]),#console:not([hidden]) .console-heading').forEach(element=>motionEnter(element,'load:'+element.className));
    }
    progress();
  }).catch(()=>{document.documentElement.dataset.motion='unavailable';});
}
