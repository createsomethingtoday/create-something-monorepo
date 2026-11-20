import { gsap } from './vendor/gsap.mjs';

/** Presentation only: saved quest receipts remain the source of truth. */
export class QuestMotion {
  constructor({ engine = gsap, media = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') } = {}) {
    this.engine = engine;
    this.media = media;
    this.previous = null;
    this.previousWin = '';
    this.pending = null;
    this.cleanup = null;
  }

  beforeRender() { this.cleanup?.(); this.cleanup = null; }
  leave() { this.beforeRender(); this.previous = null; this.previousWin = ''; this.pending = null; }
  replay(host) { this.mount(host, { replay: true }); }

  mount(host, { replay = false } = {}) {
    this.beforeRender();
    const root = host?.querySelector?.('.quest');
    if (!root?.dataset || root.getAttribute?.('aria-busy') === 'true') return;
    const phase = Number(root.dataset.questPhase);
    if (!Number.isInteger(phase) || phase < 0 || phase > 3) return;
    const previous = this.previous;
    const win = root.dataset.questWin || '';
    const newWin = !!win && win !== this.previousWin;
    const key = `${phase}|${win}`;
    this.previousWin = win;
    this.previous = phase;
    root.dataset.questAnimation = 'static';
    if (!replay && previous === phase && !newWin && this.pending !== key) return;
    let preference;
    try { preference = this.media(); } catch { return; }
    if (!preference || preference.matches) { this.pending = null; return; }

    let context;
    const stop = () => {
      context?.revert();
      context = null;
      root.dataset.questAnimation = 'static';
      preference.removeEventListener?.('change', onPreference);
    };
    const onPreference = event => { if (event.matches) { this.pending = null; stop(); } };
    this.cleanup = stop;
    try {
      context = this.engine.context(() => {
        this.pending = key;
        root.dataset.questAnimation = 'playing';
        const timeline = this.engine.timeline({ defaults: { duration: .3, ease: 'power2.out' }, onComplete: () => { if (this.pending === key) this.pending = null; root.dataset.questAnimation = 'settled'; } });
        const part = name => root.querySelector(`[data-quest-part="${name}"]`);
        const enter = (target, from, at = 0, duration = .3) => {
          if (target) timeline.fromTo(target, from, { x: 0, y: 0, rotation: 0, opacity: 1, duration }, at);
        };
        const marker = root.querySelector('.quest-wayfinder');
        const width = root.querySelector('.quest-map')?.getBoundingClientRect?.().width;
        if (marker && width && previous !== null && previous !== phase && !replay) {
          timeline.fromTo(marker, { x: (previous - phase) * width / 4 }, { x: 0, duration: .36 }, 0);
        }
        enter(part('helper'), { x: -6, y: 3, opacity: .45 }, 0, .24);
        if (phase === 0) {
          enter(part('home'), { y: 8, opacity: .2 }, 0);
          enter(part('identity'), { y: 10, opacity: .2 }, .14);
        } else if (phase === 1) {
          enter(part('gig'), { x: 46, y: -12, rotation: -7, opacity: .2 }, .08, .38);
        } else if (phase === 2) {
          if (root.dataset.questMotion === 'gig') {
            enter(part('gig'), { y: -52, rotation: -9, opacity: .45 }, 0, .42);
          }
          enter(part('person'), { x: 22, opacity: .2 }, .16);
        } else if (root.dataset.questRouteReady === 'true') {
          enter(part('person'), { y: 6, opacity: .4 }, 0, .24);
          const route = part('route');
          if (route) timeline.fromTo(route, { strokeDasharray: 100, strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: .44, ease: 'power1.inOut' }, .12);
        } else {
          enter(part('gig'), { y: 7, opacity: .4 }, .06);
        }
      }, root);
      preference.addEventListener?.('change', onPreference);
    } catch {
      // Motion support never determines whether a form or saved record is usable.
      this.pending = null; stop();
    }
  }
}
