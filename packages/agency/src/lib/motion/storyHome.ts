import { derived } from 'svelte/store';
import { startWordmarkIntro } from './wordmarkIntro';
import { reducedFilmMotion, filmOverlayOpen, filmNavigationOpen } from './filmPlayback';


/** Native-scroll enhancement; the authored static state is the complete story. */
export function enhanceStoryHome(root: HTMLElement) {
  let disposed = false;
  let cleanup = () => {};
  let resizeTimer: ReturnType<typeof setTimeout>;
  const abort = new AbortController();
  const intro = startWordmarkIntro(root);
  void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([animation, plugin]) => {
    if (disposed) return;
    const gsap = animation.gsap;
    const ScrollTrigger = plugin.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);
    let context: ReturnType<typeof gsap.context> | undefined;
    let reduced = true;
    const install = () => {
      context?.revert();
      context = undefined;
      if (reduced || disposed) return;
    const mobile = matchMedia('(max-width: 600px)').matches;
    const viewportHeight = () => innerHeight;
    // Start at the object's visible entrance. A bounded viewport fraction keeps
    // completion on-screen even when its containing chapter is much taller.
    const range = (selector: string, enter = 0.80, travel = 0.34, maximum = 280) => ({
      trigger: selector,
      
      start: () => 'top ' + Math.round(viewportHeight() * enter) + 'px',
      end: () => '+=' + Math.round(Math.min(maximum, viewportHeight() * travel)),
      scrub: true,
      invalidateOnRefresh: true
    });
    context = gsap.context(() => {
      // Every scene follows hold -> connect -> resolve; scroll remains native.
      // The hero gets a readable hold before yielding modestly to the shared frame.
      const hero = gsap.timeline({ scrollTrigger: {
        trigger: '.hero-copy', 
        start: 'top top+=125', end: '+=220', scrub: true, invalidateOnRefresh: true
      }});
      hero.to({}, { duration:0.22 })
        .fromTo('.hero-copy h1', { scale:1 }, { scale:mobile ? 0.94 : 0.88, y:8, duration:0.50, ease:'none' })
        .to({}, { duration:0.28 });

      // One conceptual request crosses the connection and reaches the team.
      const delivery = gsap.timeline({ scrollTrigger:range('.handoff-result',0.82,0.40,300) });
      delivery.to({}, { duration:0.18 })
        .fromTo('.flow-route path', { strokeDasharray:1, strokeDashoffset:1 }, { strokeDashoffset:0, duration:0.30, ease:'none' },0.18)
        .fromTo('.request-note', { x:() => -Math.max(0,(root.querySelector<HTMLElement>('.request-route')?.clientWidth ?? 80)-80) }, { x:0, duration:0.48, ease:'none' },0.18)
        .fromTo('.arrival', { opacity:0, y:5 }, { opacity:1, y:0, duration:0.14, ease:'none' },0.68)
        .to({}, { duration:0.18 });

      // Proof is held intact after the aperture resolves; never zoom the UI itself.
      const proof = gsap.timeline({ scrollTrigger:range('.proof-window',0.86,0.32,250) });
      proof.to({}, { duration:0.15 })
        .fromTo('.proof-window', { clipPath:mobile ? 'inset(0% 3% 0% 3%)' : 'inset(4% 10% 4% 10%)' }, { clipPath:'inset(0% 0% 0% 0%)', duration:0.55, ease:'none' })
        .to({}, { duration:0.30 });

      // Two lines resolve to the same left edge; the guide opens without a zoom.
      const handoff = gsap.timeline({ scrollTrigger:range('.handoff-heading',0.80,0.28,210) });
      handoff.to({}, { duration:0.20 })
        .fromTo('.handoff-heading span:last-child', { x:mobile ? 9 : 42 }, { x:0, duration:0.50, ease:'none' })
        .to({}, { duration:0.30 });
      const guide = gsap.timeline({ scrollTrigger:range('.handoff-image',0.85,0.32,250) });
      guide.to({}, { duration:0.18 })
        .fromTo('.handoff-image', { clipPath:'inset(0% 4% 0% 4%)' }, { clipPath:'inset(0% 0% 0% 0%)', duration:0.52, ease:'none' })
        .to({}, { duration:0.30 });

      // The decision is steady and fully readable; only its alignment resolves.
      gsap.timeline({ scrollTrigger:range('.closing-title',0.80,0.23,170) })
        .to({}, { duration:0.20 })
        .fromTo('.closing-title', { y:10 }, { y:0, duration:0.50, ease:'none' })
        .to({}, { duration:0.30 });
      gsap.to('.page-progress', { scaleX:1, ease:'none', scrollTrigger:{
         start:0,
        end:() => Math.max(1,document.documentElement.scrollHeight-innerHeight), scrub:true
      }});
    }, root);

    };
    const blocked = derived([reducedFilmMotion, filmOverlayOpen, filmNavigationOpen], values => values.some(Boolean));
    const unsubscribe = blocked.subscribe(value => { reduced = value; if (value) intro.destroy(); install(); });
    const refresh = () => { if (!disposed) ScrollTrigger.refresh(); };
    root.addEventListener('toggle', refresh, { capture: true, signal: abort.signal });
    root.addEventListener('load', refresh, { capture: true, signal: abort.signal });
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(install, 160); }, { signal: abort.signal });
    void document.fonts.ready.then(refresh);
    cleanup = () => { unsubscribe(); context?.revert(); };
  }).catch(() => { /* Complete static content remains readable if enhancement is unavailable. */ });
  return { destroy() { disposed = true; intro.destroy(); clearTimeout(resizeTimer); abort.abort(); cleanup(); } };
}
