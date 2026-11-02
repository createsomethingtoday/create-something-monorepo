/**
 * Progressive scroll entrances for authored HTML or a Svelte action root.
 * Content is always visible at rest, including SSR and missing browser APIs.
 * Mark independent groups with data-scroll-entrance; never nest targets.
 */
export function scrollEntrance(root: HTMLElement): { destroy: () => void } {
  const noop = { destroy() {} };
  const view = root.ownerDocument.defaultView;
  if (!view || !view.IntersectionObserver || !view.matchMedia || view.location.hash) return noop;
  const preference = view.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches) return noop;

  const pending = new Set<HTMLElement>();
  const active = new Map<HTMLElement, { revert: () => void }>();
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
  const onIntersection = (entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      const element = entry.target as HTMLElement;
      if (destroyed || !entry.isIntersecting || !pending.has(element)) continue;
      pending.delete(element);
      observer.unobserve(element);
      // Focus, hash navigation and rapid jumps must never wait for an entrance.
      if (!runtime || preference.matches || element.contains(root.ownerDocument.activeElement) || entry.boundingClientRect.top < 0) continue;
      const style = view.getComputedStyle(element);
      const value = style.getPropertyValue('--duration-performance-slow').trim();
      const duration = parseFloat(value) * (value.endsWith('ms') ? 0.001 : 1);
      if (!Number.isFinite(duration) || duration <= 0 || style.transform !== 'none') continue;
      const pause = style.getPropertyValue('--duration-performance-instant').trim();
      const parsedPause = parseFloat(pause) * (pause.endsWith('ms') ? 0.001 : 1);
      const delay = Number.isFinite(parsedPause) && parsedPause >= 0 ? parsedPause : 0;
      const easing = style.getPropertyValue('--ease-performance-standard').trim() || 'ease-in-out';
      const authoredStyle = element.getAttribute('style');
      try {
        const { gsap, CustomEase } = runtime;
        const animation = gsap.fromTo(
          element,
          { opacity: 0.4, y: 16 },
          {
            opacity: 1, y: 0, duration, delay,
            ease: easing.startsWith('cubic-bezier(')
              ? CustomEase.create('', easing.slice(13, -1))
              : easing === 'linear' ? 'none' : 'power2.inOut',
            onComplete: () => {
              // Restore authored inline styles, including transform ownership.
              animation.revert();
              active.delete(element);
            }
          }
        );
        active.set(element, animation);
      } catch {
        // Even partial initialization must fail open to the authored state.
        if (authoredStyle === null) element.removeAttribute('style');
        else element.setAttribute('style', authoredStyle);
      }
    }
  };
  // Loading-time visibility uses the full viewport; a delayed runtime must
  // remember even a brief view before the reader returns above the group.
  observer = new view.IntersectionObserver(onIntersection, { threshold: 0 });

  for (const element of root.querySelectorAll<HTMLElement>('[data-scroll-entrance]')) {
    // Do not animate the initial viewport, restored scroll position, or nested groups.
    if (element.parentElement?.closest('[data-scroll-entrance]')) continue;
    if (element.getBoundingClientRect().top < view.innerHeight) continue;
    pending.add(element);
    // Record what the reader sees even while the animation chunk is loading.
    observer.observe(element);
  }

  const focus = (event: FocusEvent) => {
    const target = event.target as Node | null;
    for (const element of [...pending, ...active.keys()]) if (target && element.contains(target)) settle(element);
  };
  const settleAll = () => {
    for (const element of [...pending, ...active.keys()]) settle(element);
  };
  const changePreference = () => { if (preference.matches) settleAll(); };
  // A hash may identify an empty anchor preceding the actual proof group.
  const hashNavigation = () => { if (view.location.hash) settleAll(); };
  root.addEventListener('focusin', focus);
  view.addEventListener('hashchange', hashNavigation);
  preference.addEventListener('change', changePreference);
  // Load only on the client. Slow or failed imports never hide content; targets
  // reached while loading remain at rest, as do focused or hash-linked groups.
  void loadRuntime().then(loaded => {
    if (destroyed || preference.matches || view.location.hash) return;
    onIntersection(observer.takeRecords());
    observer.disconnect();
    runtime = loaded;
    // Let a group enter the reading area before the short pause and reveal.
    const inset = Math.round(Math.min(120, Math.max(64, view.innerHeight * 0.12)));
    observer = new view.IntersectionObserver(onIntersection, { threshold: 0, rootMargin: `0px 0px -${inset}px 0px` });
    for (const element of pending) {
      if (element.getBoundingClientRect().top < view.innerHeight) settle(element);
      else observer.observe(element);
    }
  }).catch(() => { settleAll(); });
  return { destroy() {
    if (destroyed) return;
    destroyed = true;
    settleAll();
    observer.disconnect();
    root.removeEventListener('focusin', focus);
    view.removeEventListener('hashchange', hashNavigation);
    preference.removeEventListener('change', changePreference);
  } };
}
