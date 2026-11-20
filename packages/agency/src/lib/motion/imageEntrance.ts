/** A single image-only entrance. Authored content is visible until safely enhanced. */
export function enhanceImageEntrance(
  image: HTMLImageElement,
  options: { mode: 'scroll' | 'hero' } = { mode: 'scroll' }
): { destroy: () => void } {
  const noop = { destroy() {} };
  const document = image.ownerDocument;
  const ownerView = document.defaultView;
  if (!ownerView) return noop;
  const view = ownerView;
  if (!view.matchMedia || !view.IntersectionObserver || typeof image.animate !== 'function'
    || typeof view.CSS?.supports !== 'function' || !view.CSS.supports('clip-path', 'inset(0)') || view.location.hash) return noop;
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) return noop;
  const initial = image.getBoundingClientRect();
  if (options.mode === 'scroll' && initial.top < view.innerHeight) return noop;
  const style = view.getComputedStyle(image);
  if (style.clipPath && style.clipPath !== 'none') return noop;
  const token = style.getPropertyValue('--duration-performance-complex').trim();
  const duration = parseFloat(token) * (token.endsWith('ms') ? 1 : 1000);
  const easing = style.getPropertyValue('--ease-performance-decelerate').trim()
    || style.getPropertyValue('--ease-performance-standard').trim();
  if (!Number.isFinite(duration) || duration <= 0 || !easing) return noop;

  const region = image.closest('figure') ?? image;
  if (document.activeElement && region.contains(document.activeElement)) return noop;
  let done = false;
  let destroyed = false;
  let ready = false;
  let decoding = false;
  let started = false;
  let animation: Animation | undefined;
  let deadline: number | undefined;
  const clean = () => {
    observer.disconnect();
    image.removeEventListener('load', decode);
    image.removeEventListener('error', settle);
    document.removeEventListener('focusin', focus);
    view.removeEventListener('hashchange', hash);
    view.removeEventListener('beforeprint', settle);
    reduced.removeEventListener('change', preference);
    if (deadline !== undefined) view.clearTimeout(deadline);
    const active = animation;
    animation = undefined;
    if (active) {
      active.onfinish = null;
      active.oncancel = null;
      active.cancel();
    }
  };
  function settle() {
    if (done) return;
    done = true;
    clean();
    if (!destroyed) image.setAttribute('data-image-entrance-state', 'settled');
  }
  const play = () => {
    if (done || started || !animation) return;
    started = true;
    image.setAttribute('data-image-entrance-state', 'revealing');
    animation.play();
    // End even if an animation ticker stops delivering completion callbacks.
    deadline = view.setTimeout(settle, duration + 100);
  };
  const create = () => {
    try {
      animation = image.animate([
        { clipPath: options.mode === 'hero' ? 'inset(0 3% 0 3%)' : 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0 0 0)' }
      ], { duration, easing, fill: 'both' });
      animation.pause();
      animation.currentTime = 0;
      animation.onfinish = settle;
      animation.oncancel = settle;
      image.setAttribute('data-image-entrance-state', 'armed');
      return true;
    } catch {
      settle();
      return false;
    }
  };
  const observer = new view.IntersectionObserver(entries => {
    for (const entry of entries) {
      if (done || !entry.isIntersecting) continue;
      if (entry.boundingClientRect.top < 0 || reduced.matches || view.location.hash) { settle(); continue; }
      if (!ready) {
        // A fully visible image must never turn into a hidden image after loading.
        if (options.mode === 'scroll') settle();
        continue;
      }
      if (!animation && !create()) continue;
      play();
    }
  }, { threshold: 0 });
  async function decode() {
    if (done || decoding || !image.complete || image.naturalWidth === 0) return;
    decoding = true;
    try {
      if (typeof image.decode === 'function') await image.decode();
      if (done) return;
      ready = true;
      const rect = image.getBoundingClientRect();
      if (reduced.matches || view.location.hash || rect.bottom <= 0) { settle(); return; }
      if (options.mode === 'scroll') {
        if (rect.top < view.innerHeight) { settle(); return; }
        create();
      } else if (rect.top < view.innerHeight && create()) {
        play();
      }
    } catch {
      settle();
    }
  }
  const focus = (event: FocusEvent) => { if (event.target && region.contains(event.target as Node)) settle(); };
  const hash = () => { if (view.location.hash) settle(); };
  const preference = () => { if (reduced.matches) settle(); };
  image.addEventListener('load', decode);
  image.addEventListener('error', settle);
  document.addEventListener('focusin', focus);
  view.addEventListener('hashchange', hash);
  view.addEventListener('beforeprint', settle);
  reduced.addEventListener('change', preference);
  // Observe the unmasked frame so clip-path cannot affect entry detection.
  observer.observe(region);
  void decode();
  return { destroy() {
    if (destroyed) return;
    destroyed = true;
    if (!done) { done = true; clean(); }
    image.removeAttribute('data-image-entrance-state');
  } };
}
