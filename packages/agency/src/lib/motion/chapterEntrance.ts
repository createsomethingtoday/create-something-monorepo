import { derived } from 'svelte/store';
import { reducedFilmMotion, filmNavigationOpen, filmOverlayOpen } from './filmPlayback';

type Runtime = Pick<typeof import('gsap').gsap, 'context' | 'fromTo'>;

/** A decisive two-line entrance; the server-rendered heading is always complete. */
export function enhanceChapterEntrances(
  root: HTMLElement,
  load: () => Promise<Runtime> = async () => (await import('gsap')).gsap
) {
  const document = root.ownerDocument;
  const view = document.defaultView!;
  const abort = new AbortController();
  const headings = Array.from(root.querySelectorAll<HTMLElement>('[data-chapter-entrance]'));
  const entries = new Map<HTMLElement, { settle: () => void; play: () => void }>();
  let disposed = false;
  let blocked = true;
  let observer: IntersectionObserver | undefined;
  const settleAll = () => entries.forEach(entry => entry.settle());
  const unsubscribe = derived(
    [reducedFilmMotion, filmNavigationOpen, filmOverlayOpen], values => values.some(Boolean)
  ).subscribe(value => { blocked = value; if (value) settleAll(); });

  const hash = () => { if (view.location.hash) settleAll(); };
  view.addEventListener('hashchange', hash, { signal: abort.signal });
  view.addEventListener('beforeprint', settleAll, { signal: abort.signal });
  // Percentage transforms follow the authored line boxes across resizes;
  // there is no resize rebuild that could restart copy already being read.
  document.addEventListener('visibilitychange', () => { if (document.hidden) settleAll(); }, { signal: abort.signal });
  root.addEventListener('focusin', event => {
    for (const [heading, entry] of entries) {
      if (heading.closest('section')?.contains(event.target as Node)) entry.settle();
    }
  }, { signal: abort.signal });

  void Promise.all([load(), document.fonts.ready]).then(([gsap]) => {
    if (disposed || blocked || view.location.hash || document.hidden) return;
    observer = new view.IntersectionObserver(records => {
      for (const record of records) {
        if (!record.isIntersecting) continue;
        const entry = entries.get(record.target as HTMLElement);
        if (blocked || record.boundingClientRect.top < 0) entry?.settle();
        else entry?.play();
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });

    for (const heading of headings) {
      // Slow imports and restored scroll positions must never hide visible copy.
      if (heading.getBoundingClientRect().top <= view.innerHeight) continue;
      const lines = heading.querySelectorAll<HTMLElement>('[data-chapter-line]');
      if (!lines.length) continue;
      const token = view.getComputedStyle(heading).getPropertyValue('--duration-performance-complex').trim();
      const duration = token.endsWith('ms') ? parseFloat(token) / 1000 : parseFloat(token);
      const seconds = Number.isFinite(duration) ? duration : .5;
      let done = false;
      let started = false;
      let deadline: ReturnType<typeof setTimeout> | undefined;
      let tween: ReturnType<Runtime['fromTo']> | undefined;
      let context: ReturnType<Runtime['context']> | undefined;
      const settle = () => {
        if (done) return;
        done = true;
        clearTimeout(deadline);
        observer?.unobserve(heading);
        tween?.kill();
        context?.revert();
        heading.dataset.chapterEntranceState = 'settled';
      };
      entries.set(heading, {
        settle,
        play() {
          if (done || started) return;
          started = true;
          heading.dataset.chapterEntranceState = 'revealing';
          // A stopped ticker must not leave a masked heading indefinitely.
          deadline = setTimeout(settle, (seconds + .09 * (lines.length - 1)) * 1000 + 150);
          tween?.play();
        }
      });
      context = gsap.context(() => {
        tween = gsap.fromTo(lines, { yPercent: 105 }, {
          yPercent: 0, duration: seconds, stagger: .09, ease: 'power2.out',
          paused: true, onComplete: settle
        });
      }, heading);
      heading.dataset.chapterEntranceState = 'armed';
      observer.observe(heading);
    }
  }).catch(settleAll);

  return { destroy() {
    disposed = true;
    unsubscribe();
    abort.abort();
    settleAll();
    observer?.disconnect();
    headings.forEach(heading => { delete heading.dataset.chapterEntranceState; });
  } };
}
