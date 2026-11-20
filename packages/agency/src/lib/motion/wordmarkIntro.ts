import { get } from 'svelte/store';
import horizontalLogo from '../../../static/brand/create-something-horizontal-black.svg?raw';
import compactLogo from '../../../static/brand/create-something-mark-black.svg?raw';
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
  Object.assign(cover.style, { position: 'absolute', inset: '0', background: 'rgb(var(--agency-nav-surface-rgb,8,8,8))', transformOrigin: 'center top' });
  const flying = document.createElement('div');
  flying.dataset.wordmarkFlight = ''; flying.dataset.agencyWordmark = '';
  Object.assign(flying.style, { position: 'absolute', left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`, transformOrigin: 'left top' });
  const logoFilter = getComputedStyle(image).filter;
  // currentSrc can still contain the desktop fallback during hydration.
  const responsiveSource = [...(image.closest('picture')?.querySelectorAll('source') ?? [])]
    .find(source => !source.media || matchMedia(source.media).matches);
  const compact = /create-something-mark-/.test(responsiveSource?.srcset || image.src);
  const source = new DOMParser().parseFromString(compact ? compactLogo : horizontalLogo, 'image/svg+xml');
  const svg = document.importNode(source.documentElement, true) as unknown as SVGSVGElement;
  svg.setAttribute('aria-hidden', 'true');
  svg.removeAttribute('role');
  svg.removeAttribute('aria-labelledby');
  Object.assign(svg.style, { width: '100%', height: '100%', maxWidth: 'none', display: 'block', filter: logoFilter });
  flying.appendChild(svg);
  overlay.appendChild(cover); overlay.appendChild(flying); root.appendChild(overlay);

  deadline = setTimeout(finish, 1700);

  // Keep the original outlined glyphs and their spacing. Each real shape rises
  // inside its own mask; only the enclosing lockup moves during the dock.
  const pieces: SVGGraphicsElement[] = [];
  try {
    const namespace = 'http://www.w3.org/2000/svg';
    let definitions = svg.querySelector('defs');
    if (!definitions) { definitions = document.createElementNS(namespace, 'defs'); svg.insertBefore(definitions, svg.firstChild); }
    const mark = svg.querySelector<SVGGraphicsElement>(':scope > g');
    const letters = [...svg.querySelectorAll<SVGGraphicsElement>('g[fill="currentColor"] > use')];
    const targets = compact
      ? [...svg.querySelectorAll<SVGGraphicsElement>('#cs-mark-v3 > path, #cs-mark-v3 > circle')]
      : [...(mark ? [mark] : []), ...letters];
    targets.forEach((target, index) => {
      const bounds = target.getBBox();
      if (!bounds.width || !bounds.height) return; // The exported space stays a space.
      const parent = target.parentElement as unknown as SVGGraphicsElement;
      const transform = parent.getCTM()!.inverse().multiply(target.getCTM()!);
      const padding = target.tagName.toLowerCase() === 'use' ? .6 : 6;
      const corners = [
        [bounds.x - padding, bounds.y - padding],
        [bounds.x + bounds.width + padding, bounds.y - padding],
        [bounds.x - padding, bounds.y + bounds.height + padding],
        [bounds.x + bounds.width + padding, bounds.y + bounds.height + padding]
      ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(transform));
      const x = Math.min(...corners.map(point => point.x));
      const y = Math.min(...corners.map(point => point.y));
      const pieceWidth = Math.max(...corners.map(point => point.x)) - x;
      const pieceHeight = Math.max(...corners.map(point => point.y)) - y;
      const clip = document.createElementNS(namespace, 'clipPath');
      const clipId = `agency-wordmark-reveal-${index}`;
      clip.id = clipId; clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
      const rect = document.createElementNS(namespace, 'rect');
      for (const [name, value] of Object.entries({ x, y, width: pieceWidth, height: pieceHeight })) rect.setAttribute(name, String(value));
      clip.appendChild(rect); definitions!.appendChild(clip);
      const mask = document.createElementNS(namespace, 'g');
      mask.setAttribute('clip-path', `url(#${clipId})`);
      const motion = document.createElementNS(namespace, 'g');
      motion.dataset.wordmarkPiece = String(index);
      if (target.tagName.toLowerCase() === 'use') motion.dataset.wordmarkGlyph = target.getAttribute('x') ?? String(index);
      motion.dataset.wordmarkRise = String(pieceHeight * 1.15);
      motion.setAttribute('transform', `translate(0 ${pieceHeight * 1.15})`);
      parent.insertBefore(mask, target); mask.appendChild(motion); motion.appendChild(target);
      pieces.push(motion);
    });
  } catch {
    // Unsupported SVG geometry must never strand a cover or stop page setup.
    finish();
    return { destroy: finish };
  }
  logoFrame.style.opacity = '0';
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
      .fromTo(pieces, { y: (index: number) => Number(pieces[index].dataset.wordmarkRise) }, { y: 0, duration: .32, stagger: .018, ease: 'power3.out' })
      .to(flying, { x: target.left - left, y: target.top - top, scale: target.width / width, duration: .62, ease: 'power3.inOut' }, .62)
      .to(cover, { yPercent: -100, duration: .62, ease: 'power3.inOut' }, .66);
  }).catch(finish);
  return { destroy: finish };
}
