import { createWaypointGuide } from './waypointGuide';
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
  const heading = root.querySelector<HTMLElement>('.handoff-heading');
  const headingMarkup = heading?.innerHTML;
  if (heading) {
    heading.setAttribute('aria-label', Array.from(heading.children).map(line => line.textContent).filter(Boolean).join(' '));
    heading.querySelectorAll('span').forEach(line => {
      const words = (line.textContent ?? '').split(' ');
      line.setAttribute('aria-hidden', 'true');
      line.replaceChildren(...words.flatMap((word, index) => {
        const mask = document.createElement('span');
        mask.className = 'handoff-word-mask';
        const inner = document.createElement('span');
        inner.className = 'handoff-word';
        inner.textContent = word;
        mask.appendChild(inner);
        return index ? [document.createTextNode(' '), mask] : [mask];
      }));
    });
  }
  const tour = root.querySelector<HTMLElement>('.handoff-tour');
  const scenes = Array.from(root.querySelectorAll<HTMLElement>('[data-tour-scene]'));
  const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-tour-step]'));
  let activeScene = 0;
  let moveGuide = (_index: number) => {};
  let headingPlayed = false;
  const selectScene = (index: number) => {
    // Native scroll must never hide the control a keyboard reader is using.
    if (scenes.some(scene => scene.contains(document.activeElement)) && index !== activeScene) return;
    activeScene = index;
    moveGuide(index);
    root.querySelectorAll<HTMLElement>('[data-waypoint]').forEach((link, i) => {
      if (i === index) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    scenes.forEach((scene, i) => scene.classList.toggle('is-active', i === index));
    steps.forEach((step, i) => {
      step.classList.toggle('is-active', i === index);
      step.querySelector('a')?.setAttribute('aria-current', i === index ? 'step' : 'false');
    });
  };
  const updateTour = () => {
    const target = innerHeight * .48;
    let nearest = 0;
    let distance = Infinity;
    steps.forEach((step, i) => {
      const rect = step.getBoundingClientRect();
      const next = Math.abs(rect.top + rect.height / 2 - target);
      if (next < distance) { nearest = i; distance = next; }
    });
    selectScene(nearest);
  };
  selectScene(0);
  tour?.classList.add('tour-enhanced');
  window.addEventListener('scroll', updateTour, { passive: true, signal: abort.signal });
  window.addEventListener('resize', updateTour, { passive: true, signal: abort.signal });
  tour?.addEventListener('focusout', () => requestAnimationFrame(updateTour), { signal: abort.signal });
  root.querySelectorAll<HTMLAnchorElement>('[data-waypoint]').forEach(link => {
    link.addEventListener('click', event => {
      // Keep this local story navigation out of the site's route transition.
      // The authored href remains usable before enhancement and without JS.
      const index = Number(link.dataset.waypoint);
      const step = steps[index];
      if (!step) return;
      event.preventDefault();
      step.tabIndex = -1;
      step.focus({ preventScroll: true });
      selectScene(index);
      step.scrollIntoView({ block: 'center', behavior: 'instant' });
    }, { signal: abort.signal });
  });
  root.querySelectorAll<HTMLAnchorElement>('[data-tour-select]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const index = Number(link.dataset.tourSelect);
      selectScene(index);
      scenes[index]?.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true });
      const details = scenes[index]?.querySelector<HTMLDetailsElement>('details');
      if (details) details.open = true;
      if (matchMedia('(max-width: 900px), (max-height: 650px)').matches) scenes[index]?.scrollIntoView({ block: 'center', behavior: 'instant' });
    }, { signal: abort.signal });
  });
  updateTour();
  void Promise.all([import('gsap'), import('gsap/ScrollTrigger'), import('gsap/MotionPathPlugin')]).then(([animation, plugin, motion]) => {
    if (disposed) return;
    const gsap = animation.gsap;
    const ScrollTrigger = plugin.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger, motion.MotionPathPlugin);
    const guide = root.querySelector<HTMLElement>('.waypoint-guide');
    // Animate a normalized point, not the image's pixel transform. CSS owns
    // responsive positioning, including resize while motion is disabled.
    const point = { x: 10, y: 78 };
    const renderGuide = () => {
      if (!guide) return;
      guide.style.left = `${point.x}%`;
      guide.style.top = `${point.y}%`;
    };
    const pathTween = gsap.to(point, { paused: true, duration: 1, ease: 'none', lazy: false, onUpdate: renderGuide, motionPath: {
      path: [{ x: 10, y: 78 }, { x: 30, y: 56 }, { x: 50, y: 78 }, { x: 70, y: 100 }, { x: 90, y: 78 }],
      fromCurrent: false, curviness: 1, autoRotate: false
    } });
    const transport = createWaypointGuide(progress => {
      // Semantic stops are exact and synchronous, including reduced motion.
      // MotionPath interpolates only the travel between those fixed anchors.
      if (progress === 0 || progress === .5 || progress === 1) {
        point.x = 10 + 80 * progress;
        point.y = 78;
      } else pathTween.progress(progress);
      renderGuide();
    }, (from, to, update) => {
      const cursor = { progress: from };
      const tween = gsap.to(cursor, { progress: to, duration: .65, ease: 'power2.inOut', onUpdate: () => update(cursor.progress) });
      return () => tween.kill();
    });
    moveGuide = index => transport.select(index);
    transport.select(activeScene);
    transport.refresh();
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

      // Original masked word stagger: the complete heading remains its accessible name.
      const heading = root.querySelector<HTMLElement>('.handoff-heading');
      if (heading && !headingPlayed) {
        const words = heading.querySelectorAll<HTMLElement>('.handoff-word');
        gsap.fromTo(words, { yPercent:65, rotationX:-18, opacity:0, filter:'blur(3px)' }, {
          yPercent:0, rotationX:0, opacity:1, filter:'blur(0px)', duration:.65,
          stagger:.07, ease:'power2.out', onStart: () => { headingPlayed = true; },
          scrollTrigger:{ trigger:heading, start:'top 88%', toggleActions:'play none none none' }
        });
      }

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
    const unsubscribe = blocked.subscribe(value => { reduced = value; transport.block(value); if (value) intro.destroy(); install(); });
    const refresh = () => { if (!disposed) ScrollTrigger.refresh(); };
    root.addEventListener('toggle', refresh, { capture: true, signal: abort.signal });
    root.addEventListener('load', refresh, { capture: true, signal: abort.signal });
    window.addEventListener('resize', () => { transport.refresh(); clearTimeout(resizeTimer); resizeTimer = setTimeout(install, 160); }, { signal: abort.signal });
    void document.fonts.ready.then(refresh);
    if (guide) guide.dataset.waypointReady = 'true';
    cleanup = () => { unsubscribe(); transport.destroy(); pathTween.kill(); guide?.style.removeProperty('left'); guide?.style.removeProperty('top'); if (guide) delete guide.dataset.waypointReady; context?.revert(); moveGuide = () => {}; };
  }).catch(() => { /* Complete static content remains readable if enhancement is unavailable. */ });
  return { destroy() { disposed = true; intro.destroy(); clearTimeout(resizeTimer); abort.abort(); cleanup(); tour?.classList.remove('tour-enhanced'); if (heading && headingMarkup) { heading.innerHTML = headingMarkup; heading.removeAttribute('aria-label'); } } };
}
