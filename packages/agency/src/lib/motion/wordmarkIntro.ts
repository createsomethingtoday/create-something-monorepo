import { get } from 'svelte/store';
import { filmNavigationOpen, filmOverlayOpen, reducedFilmMotion } from './filmPlayback';

let introConsumed = false;

/** An original masked-logo entrance, docking to the real responsive nav asset. */
export function startWordmarkIntro(root: HTMLElement) {
  const abort = new AbortController();
  let done = false;
  let overlay: HTMLDivElement | undefined;
  let logoFrame: HTMLElement | null = null;
  let originalOpacity = '';
  let timeline: { kill: () => void } | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let preferenceReady = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(deadline);
    timeline?.kill();
    overlay?.remove();
    if (logoFrame) logoFrame.style.opacity = originalOpacity;
    abort.abort();
    unsubscribers.forEach(unsubscribe => unsubscribe());
  };
  const unsubscribers: (() => void)[] = [];
  let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    const saved = sessionStorage.getItem('agency-reduced-motion');
    if (saved === 'true' || saved === 'false') reduced = saved === 'true';
  } catch { /* The system preference remains available. */ }
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const initialHomepage = !navigation || new URL(navigation.name, location.href).pathname === location.pathname;
  const eligible = !introConsumed && initialHomepage && !reduced && !location.hash && scrollY < 30 && !document.hidden && !get(filmNavigationOpen) && !get(filmOverlayOpen);
  introConsumed = true;
  if (!eligible) return { destroy: finish };

  const image = document.querySelector<HTMLImageElement>('.nav-fixed .nav-logo-asset');
  logoFrame = image?.closest<HTMLElement>('.nav-logo-asset-frame') ?? null;
  if (!image || !logoFrame) return { destroy: finish };
  const target = image.getBoundingClientRect();
  if (!target.width || !target.height) return { destroy: finish };
  originalOpacity = logoFrame.style.opacity;
  const width = Math.min(innerWidth * (innerWidth <= 640 ? .42 : .78), innerWidth <= 640 ? 180 : 960);
  const height = width * target.height / target.width;
  const left = (innerWidth - width) / 2;
  const top = (innerHeight - height) / 2;
  overlay = document.createElement('div');
  overlay.className = 'story-curtain wordmark-intro';
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, { position: 'fixed', inset: '0', zIndex: '2000', pointerEvents: 'none', display: 'block', opacity: '1', visibility: 'visible', background: 'transparent', overflow: 'hidden' });
  // Explicitly re-enabling motion overrides an OS reduced-motion default.
  overlay.style.setProperty('display', 'block', 'important');
  const cover = document.createElement('div');
  Object.assign(cover.style, { position: 'absolute', inset: '0', background: '#101112', transformOrigin: 'center top' });
  const flying = document.createElement('div');
  flying.dataset.wordmarkFlight = ''; flying.dataset.agencyWordmark = '';
  Object.assign(flying.style, { position: 'absolute', left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`, transformOrigin: 'left top' });
  const pieces: HTMLImageElement[] = [];
  const count = innerWidth <= 640 ? 2 : 8;
  for (let i = 0; i < count; i++) {
    const mask = document.createElement('div');
    Object.assign(mask.style, { position: 'absolute', left: `${i * 100 / count}%`, top: '0', width: `${100 / count + .03}%`, height: '100%', overflow: 'hidden' });
    const piece = document.createElement('img');
    piece.src = image.currentSrc || image.src;
    piece.alt = '';
    Object.assign(piece.style, { position: 'absolute', left: `${-i * width / count}px`, top: '0', width: `${width}px`, maxWidth: 'none', height: `${height}px`, filter: 'brightness(0) invert(1)', transform: 'translateY(110%)' });
    mask.appendChild(piece); flying.appendChild(mask); pieces.push(piece);
  }
  overlay.appendChild(cover); overlay.appendChild(flying); root.appendChild(overlay);
  logoFrame.style.opacity = '0';
  deadline = setTimeout(finish, 1700);
  window.addEventListener('keydown', finish, { signal: abort.signal });
  window.addEventListener('pointerdown', finish, { signal: abort.signal });
  window.addEventListener('resize', finish, { signal: abort.signal });
  window.addEventListener('hashchange', finish, { signal: abort.signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); }, { signal: abort.signal });
  // Layout initializes its motion store after child mount. The first store value
  // is provisional; subsequent preference changes cancel the active intro.
  unsubscribers.push(reducedFilmMotion.subscribe(value => { if (preferenceReady && value) finish(); }));
  unsubscribers.push(filmNavigationOpen.subscribe(value => { if (value) finish(); }));
  unsubscribers.push(filmOverlayOpen.subscribe(value => { if (value) finish(); }));
  queueMicrotask(() => { preferenceReady = true; if (get(reducedFilmMotion) && reduced) finish(); });
  void import('gsap').then(({ gsap }) => {
    if (done) return;
    timeline = gsap.timeline({ onComplete: finish })
      .fromTo(pieces, { yPercent: 110, y: 0 }, { yPercent: 0, duration: .40, stagger: .035, ease: 'power3.out' })
      .to(flying, { x: target.left - left, y: target.top - top, scale: target.width / width, duration: .62, ease: 'power3.inOut' }, .62)
      .to(cover, { yPercent: -100, duration: .62, ease: 'power3.inOut' }, .66);
  }).catch(finish);
  return { destroy: finish };
}
