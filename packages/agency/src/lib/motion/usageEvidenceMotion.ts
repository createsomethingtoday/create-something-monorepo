/** GSAP enhances selection only. CSS and native controls own settled states. */
export function usageEvidenceMotion(
  root: HTMLElement,
  initial: string,
  loadModules: () => Promise<[typeof import('gsap'), typeof import('gsap/CustomEase')]> = () => Promise.all([import('gsap'), import('gsap/CustomEase')])
) {
  const view = root.ownerDocument.defaultView;
  const ledger = root.querySelector<HTMLElement>('[data-usage-ledger]');
  const marker = root.querySelector<HTMLElement>('[data-usage-marker]');
  const panel = root.querySelector<HTMLElement>('[data-usage-inspector-body]');
  const preference = view?.matchMedia?.('(prefers-reduced-motion: reduce)');
  let selected = initial;
  let disposed = false;
  let loading = false;
  let generation = 0;
  let deadline: number | undefined;
  let context: gsap.Context | undefined;
  let runtime: typeof import('gsap').gsap | undefined;
  let ease: string | gsap.EaseFunction = 'power2.out';
  const settle = () => {
    generation += 1;
    if (deadline !== undefined) view?.clearTimeout(deadline);
    deadline = undefined;
    context?.revert();
    context = undefined;
    root.removeAttribute('data-usage-animating');
  };
  const position = () => {
    const button = Array.from(root.querySelectorAll<HTMLElement>('[data-usage-metric]')).find(element => element.dataset.usageMetric === selected);
    if (!ledger || !button) return null;
    const top = button.getBoundingClientRect().top - ledger.getBoundingClientRect().top;
    const height = button.getBoundingClientRect().height;
    root.style.setProperty('--usage-marker-y', `${top}px`);
    root.style.setProperty('--usage-marker-height', `${height}px`);
    return { top, height };
  };
  const load = () => {
    if (disposed || loading || runtime || !preference || preference.matches || !view) return;
    loading = true;
    void loadModules().then(([{ gsap }, { CustomEase }]) => {
      if (disposed) return;
      gsap.registerPlugin(CustomEase);
      const curve = view.getComputedStyle(root).getPropertyValue('--ease-performance-standard').trim();
      const values = /^cubic-bezier\(([^)]+)\)$/.exec(curve)?.[1];
      ease = values ? CustomEase.create('', values) : 'power2.out';
      runtime = gsap;
      position();
      if (!preference?.matches) root.setAttribute('data-usage-motion-ready', '');
    }).catch(() => { /* Every control and definition works without the motion module. */ }).finally(() => { loading = false; });
  };
  const preferenceChanged = () => {
    settle(); position();
    root.toggleAttribute('data-usage-motion-ready', Boolean(runtime && !preference?.matches));
    load();
  };
  const resize = () => { settle(); position(); };
  const observer = view && typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(resize) : undefined;
  if (ledger) observer?.observe(ledger);
  preference?.addEventListener('change', preferenceChanged);
  view?.addEventListener('beforeprint', settle);
  view?.addEventListener('resize', resize);
  position(); load();
  return {
    update(next: string) {
      if (next === selected || disposed) return;
      const from = marker && ledger ? { top: marker.getBoundingClientRect().top - ledger.getBoundingClientRect().top, height: marker.getBoundingClientRect().height } : null;
      settle(); selected = next;
      const target = position();
      if (!runtime || !view || preference?.matches || !marker || !panel || !target || !from) return;
      const value = view.getComputedStyle(root).getPropertyValue('--duration-performance-standard').trim();
      const duration = parseFloat(value) / (value.endsWith('ms') ? 1000 : 1);
      if (!Number.isFinite(duration) || duration <= 0) return;
      const current = generation;
      root.setAttribute('data-usage-animating', 'selection');
      try {
        context = runtime.context(() => {
          const timeline = runtime!.timeline({ onComplete: () => { if (generation === current) settle(); } });
          timeline.fromTo(marker, { y: from.top, height: from.height }, { y: target.top, height: target.height, duration, ease }, 0);
          timeline.fromTo(panel, { y: 8, opacity: .55 }, { y: 0, opacity: 1, duration, ease }, 0);
        }, root);
        deadline = view.setTimeout(() => { if (generation === current) settle(); }, duration * 1000 + 150);
      } catch { settle(); }
    },
    destroy() {
      disposed = true; settle(); observer?.disconnect();
      preference?.removeEventListener('change', preferenceChanged);
      view?.removeEventListener('beforeprint', settle);
      view?.removeEventListener('resize', resize);
      root.removeAttribute('data-usage-motion-ready');
      root.style.removeProperty('--usage-marker-y');
      root.style.removeProperty('--usage-marker-height');
    }
  };
}
