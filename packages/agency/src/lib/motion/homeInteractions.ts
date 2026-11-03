/** DOM-only enhancement; page code owns selection and accessible state. */
export function enhanceHomeInteractions(root: HTMLElement): { destroy: () => void } {
  const view = root.ownerDocument.defaultView;
  let disposed = false;
  const noop = { destroy() {} };
  if (!view?.matchMedia) return noop;
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
  const hover = view.matchMedia('(hover: hover) and (pointer: fine)');
  const abort = new AbortController();
  const active = new Map<HTMLElement, gsap.core.Tween>();
  let runtime: typeof import('gsap').gsap | undefined;
  let ease: string | gsap.EaseFunction | undefined;
  // No static import: loading failures keep every native control usable.
  void Promise.all([import('gsap'), import('gsap/CustomEase')]).then(([{ gsap }, { CustomEase }]) => {
    if (disposed) return;
    gsap.registerPlugin(CustomEase);
    const curve = view.getComputedStyle(root).getPropertyValue('--ease-performance-standard').trim();
    const values = /^cubic-bezier\(([^)]+)\)$/.exec(curve)?.[1];
    ease = values ? CustomEase.create('agency-feedback', values) : 'power2.out';
    runtime = gsap;
  }).catch(() => {});
  const duration = (element: HTMLElement, token: string) => {
    const value = view.getComputedStyle(element).getPropertyValue(token).trim();
    const seconds = parseFloat(value) / (value.endsWith('ms') ? 1000 : 1);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  };
  const settle = (element: HTMLElement) => {
    active.get(element)?.revert();
    active.delete(element);
  };
  const settleAll = () => { for (const element of active.keys()) settle(element); };
  for (const arrow of root.querySelectorAll<HTMLElement>('[data-motion-arrow]')) {
    const control = arrow.closest<HTMLElement>('a, button');
    if (!control) continue;
    let tween: gsap.core.Tween | undefined;
    const enter = (event: PointerEvent) => {
      if (!runtime || !hover.matches || reduced.matches || event.pointerType === 'touch') return;
      if (view.getComputedStyle(arrow).transform !== 'none' && !tween) return;
      if (!tween) {
        const seconds = duration(arrow, '--duration-performance-micro');
        if (!seconds) return;
        tween = runtime.to(arrow, { x: 3, y: -3, duration: seconds, ease, paused: true });
        active.set(arrow, tween);
      }
      tween.play();
    };
    const leave = () => { tween?.reverse(); };
    const reset = () => { settle(arrow); tween = undefined; };
    control.addEventListener('pointerenter', enter, { signal: abort.signal });
    control.addEventListener('pointerleave', leave, { signal: abort.signal });
    control.addEventListener('pointercancel', reset, { signal: abort.signal });
    // Keyboard feedback uses the control's immediate native focus ring.
    control.addEventListener('focusin', reset, { signal: abort.signal });
    const preference = () => { if (reduced.matches || !hover.matches) reset(); };
    reduced.addEventListener('change', preference, { signal: abort.signal });
    hover.addEventListener('change', preference, { signal: abort.signal });
  }
  reduced.addEventListener('change', () => { if (reduced.matches) settleAll(); }, { signal: abort.signal });
  return {
    destroy() { disposed = true; abort.abort(); settleAll(); }
  };
}
