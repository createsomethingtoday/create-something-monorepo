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
  const active = new Map<HTMLElement, Animation>();
  const settle = (element: HTMLElement) => {
    pending.delete(element);
    observer.unobserve(element);
    active.get(element)?.cancel();
    active.delete(element);
  };
  const observer = new view.IntersectionObserver(entries => {
    for (const entry of entries) {
      const element = entry.target as HTMLElement;
      if (!entry.isIntersecting || !pending.has(element)) continue;
      pending.delete(element);
      observer.unobserve(element);
      // Focus, hash navigation and rapid jumps must never wait for an entrance.
      if (preference.matches || element.contains(root.ownerDocument.activeElement) || entry.boundingClientRect.top < 0) continue;
      const style = view.getComputedStyle(element);
      const value = style.getPropertyValue('--duration-performance-complex').trim();
      const duration = parseFloat(value) * (value.endsWith('ms') ? 1 : 1000);
      if (!Number.isFinite(duration) || duration <= 0 || style.transform !== 'none') continue;
      const easing = style.getPropertyValue('--ease-performance-decelerate').trim() || 'ease-out';
      try {
        const animation = element.animate(
          [{ opacity: 0.25, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration, easing }
        );
        active.set(element, animation);
        void animation.finished.then(() => {
          if (active.get(element) === animation) active.delete(element);
        }).catch(() => {});
      } catch { /* Unsupported animation APIs leave the content visible. */ }
    }
  }, { threshold: 0, rootMargin: '0px 0px -32px 0px' });

  for (const element of root.querySelectorAll<HTMLElement>('[data-scroll-entrance]')) {
    // Do not animate the initial viewport, restored scroll position, or nested groups.
    if (element.parentElement?.closest('[data-scroll-entrance]') || typeof element.animate !== 'function') continue;
    if (element.getBoundingClientRect().top < view.innerHeight) continue;
    pending.add(element);
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
  return { destroy() {
    settleAll();
    observer.disconnect();
    root.removeEventListener('focusin', focus);
    view.removeEventListener('hashchange', hashNavigation);
    preference.removeEventListener('change', changePreference);
  } };
}
