/** Short chapter transitions. CSS owns every complete state, including load failure. */
export function workpieceMotion(root: SVGSVGElement, initial: number) {
  const view = root.ownerDocument.defaultView;
  let previous = initial;
  let disposed = false;
  let context: gsap.Context | undefined;
  let deadline: number | undefined;
  let runtime: typeof import('gsap').gsap | undefined;
  let ease: string | gsap.EaseFunction = 'power2.out';
  const allowed = view?.matchMedia('(min-width: 1000px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)');
  const targets = ['connect', 'build', 'check', 'guide'].map(name => root.querySelector<SVGGElement>(`[data-workpiece-${name}]`)!);
  const visible = (stage: number, index: number) => stage >= (index < 2 ? 1 : 2) ? 1 : 0;
  const settle = () => {
    if (deadline !== undefined) view?.clearTimeout(deadline);
    deadline = undefined;
    context?.revert();
    context = undefined;
    root.removeAttribute('data-workpiece-animating');
  };
  const load = () => {
    if (!allowed?.matches || !root.closest('.desktop-story-visual') || runtime || disposed) return;
    void Promise.all([import('gsap'), import('gsap/CustomEase')]).then(([{ gsap }, { CustomEase }]) => {
      if (disposed) return;
      gsap.registerPlugin(CustomEase);
      const curve = view!.getComputedStyle(root).getPropertyValue('--ease-performance-standard').trim();
      const values = /^cubic-bezier\(([^)]+)\)$/.exec(curve)?.[1];
      ease = values ? CustomEase.create('', values) : 'power2.out';
      runtime = gsap;
    }).catch(() => { /* The CSS state is already complete. */ });
  };
  const preference = () => { settle(); load(); };
  allowed?.addEventListener('change', preference);
  view?.addEventListener('beforeprint', settle);
  load();
  return {
    update(stage: number) {
      if (stage === previous) return;
      const from = previous;
      previous = stage;
      // Snapshot an interrupted transition before reverting its temporary styles.
      const starts = targets.map((target, index) => context ? Number(view!.getComputedStyle(target).opacity) : visible(from, index));
      settle();
      if (!runtime || !allowed?.matches || !root.closest('.desktop-story-visual') || targets.some(target => !target)) return;
      const value = view!.getComputedStyle(root).getPropertyValue('--duration-performance-standard').trim();
      const duration = parseFloat(value) / (value.endsWith('ms') ? 1000 : 1);
      if (!Number.isFinite(duration) || duration <= 0) return;
      root.setAttribute('data-workpiece-animating', '');
      try {
        context = runtime.context(() => {
          const timeline = runtime!.timeline({ onComplete: settle });
          targets.forEach((target, index) => {
            timeline.fromTo(target, { opacity: starts[index] }, { opacity: visible(stage, index), duration, ease }, 0);
          });
          if (from === 0 && stage > 0) {
            timeline.fromTo(root.querySelector('[data-workpiece-line]'), { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration, ease }, 0);
          }
          if (from < 2 && stage === 2) {
            timeline.fromTo(root.querySelectorAll('.check'), { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration, ease }, 0);
            timeline.fromTo(targets[3], { y: 6 }, { y: 0, duration, ease }, 0);
          }
        }, root);
        // CSS settles the chapter even if animation frames stop arriving.
        deadline = view!.setTimeout(settle, duration * 1000 + 100);
      } catch { settle(); }
    },
    destroy() {
      disposed = true;
      allowed?.removeEventListener('change', preference);
      view?.removeEventListener('beforeprint', settle);
      settle();
    }
  };
}
