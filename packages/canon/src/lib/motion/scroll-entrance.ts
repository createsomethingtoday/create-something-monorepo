/**
 * Progressive scroll entrances for authored HTML or a Svelte action root.
 * SSR, loading and fallback content stays visible. Unseen offscreen groups are
 * prepared only after GSAP loads; never nest data-scroll-entrance targets.
 */
export function scrollEntrance(root: HTMLElement): { destroy: () => void } {
  const noop = { destroy() {} };
  const view = root.ownerDocument.defaultView;
  if (!view || !view.IntersectionObserver || !view.matchMedia || view.location.hash) return noop;
  const preference = view.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches) return noop;

  const pending = new Set<HTMLElement>();
  const active = new Map<HTMLElement, { play: () => void; revert: () => void }>();
  let destroyed = false;
  let runtime: Awaited<ReturnType<typeof loadRuntime>> | undefined;
  const loadRuntime = async () => {
    const [{ gsap }, { CustomEase }] = await Promise.all([import('gsap'), import('gsap/CustomEase')]);
    gsap.registerPlugin(CustomEase);
    return { gsap, CustomEase };
  };
  let observer: IntersectionObserver;
  const settle = (element: HTMLElement) => {
    pending.delete(element);
    observer.unobserve(element);
    active.get(element)?.revert();
    active.delete(element);
  };
  const prepare = (element: HTMLElement) => {
    if (!runtime) return;
    const style = view.getComputedStyle(element);
    const value = style.getPropertyValue('--duration-performance-slow').trim();
    const duration = parseFloat(value) * (value.endsWith('ms') ? 0.001 : 1);
    if (!Number.isFinite(duration) || duration <= 0 || style.transform !== 'none') return;
    const pause = style.getPropertyValue('--duration-performance-instant').trim();
    const parsedPause = parseFloat(pause) * (pause.endsWith('ms') ? 0.001 : 1);
    const delay = Number.isFinite(parsedPause) && parsedPause >= 0 ? parsedPause : 0;
    const easing = style.getPropertyValue('--ease-performance-standard').trim() || 'ease-in-out';
    const authoredStyle = element.getAttribute('style');
    try {
      const { gsap, CustomEase } = runtime;
      const animation = gsap.fromTo(element, { opacity: 0, y: 16 }, {
        opacity: 1, y: 0, duration, delay, paused: true, immediateRender: true,
        ease: easing.startsWith('cubic-bezier(')
          ? CustomEase.create('', easing.slice(13, -1))
          : easing === 'linear' ? 'none' : 'power2.inOut',
        onComplete: () => settle(element)
      });
      let deadline: number | undefined;
      let started = false;
      return {
        play() {
          if (started) return;
          started = true;
          // Bound a reveal in real time even when GSAP's ticker is throttled.
          // The extra 100ms lets normal frame scheduling finish naturally.
          deadline = view.setTimeout(() => settle(element), (duration + delay) * 1000 + 100);
          animation.restart(true);
        },
        revert() {
          if (deadline !== undefined) view.clearTimeout(deadline);
          animation.revert();
        }
      };
    } catch {
      if (authoredStyle === null) element.removeAttribute('style');
      else element.setAttribute('style', authoredStyle);
    }
  };
  const onIntersection = (entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      const element = entry.target as HTMLElement;
      if (destroyed || !entry.isIntersecting || !pending.has(element)) continue;
      // A group seen during loading, a jump, or keyboard navigation stays at rest.
      if (!runtime || preference.matches || element.contains(root.ownerDocument.activeElement) || entry.boundingClientRect.top < 0) {
        settle(element);
        continue;
      }
      pending.delete(element);
      observer.unobserve(element);
      active.get(element)?.play();
    }
  };
  observer = new view.IntersectionObserver(onIntersection, { threshold: 0 });
  for (const element of root.querySelectorAll<HTMLElement>('[data-scroll-entrance]')) {
    if (element.parentElement?.closest('[data-scroll-entrance]')) continue;
    if (element.getBoundingClientRect().top < view.innerHeight) continue;
    pending.add(element);
    observer.observe(element);
  }

  const focus = (event: FocusEvent) => {
    const target = event.target as Node | null;
    for (const element of new Set([...pending, ...active.keys()])) if (target && element.contains(target)) settle(element);
  };
  const settleAll = () => {
    for (const element of new Set([...pending, ...active.keys()])) settle(element);
  };
  const changePreference = () => { if (preference.matches) settleAll(); };
  const hashNavigation = () => { if (view.location.hash) settleAll(); };
  root.addEventListener('focusin', focus);
  view.addEventListener('hashchange', hashNavigation);
  view.addEventListener('beforeprint', settleAll);
  preference.addEventListener('change', changePreference);
  void loadRuntime().then(loaded => {
    if (destroyed || preference.matches || view.location.hash) return;
    onIntersection(observer.takeRecords());
    observer.disconnect();
    runtime = loaded;
    const inset = Math.round(Math.min(120, Math.max(64, view.innerHeight * 0.12)));
    observer = new view.IntersectionObserver(onIntersection, { threshold: 0, rootMargin: `0px 0px -${inset}px 0px` });
    for (const element of [...pending]) {
      if (element.getBoundingClientRect().top < view.innerHeight) { settle(element); continue; }
      const animation = prepare(element);
      if (!animation) { settle(element); continue; }
      active.set(element, animation);
      observer.observe(element);
    }
  }).catch(() => { settleAll(); });
  return { destroy() {
    if (destroyed) return;
    destroyed = true;
    settleAll();
    observer.disconnect();
    root.removeEventListener('focusin', focus);
    view.removeEventListener('hashchange', hashNavigation);
    view.removeEventListener('beforeprint', settleAll);
    preference.removeEventListener('change', changePreference);
  } };
}
