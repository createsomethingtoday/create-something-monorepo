import { gsap } from 'gsap';

// Native wheel/touch scrolling is untouched. Only app navigation owns a tween.
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrolls = new WeakMap<HTMLElement, gsap.core.Tween>();
export function stopScroll(element: HTMLElement) {
  scrolls.get(element)?.kill();
  scrolls.delete(element);
}
export function moveScroll(element: HTMLElement, top: number, immediate = false) {
  stopScroll(element);
  const tween = gsap.to(element, {
    scrollTop: Math.max(0, Math.min(top, element.scrollHeight - element.clientHeight)),
    duration: immediate || reducedMotion() ? 0 : 0.24,
    ease: 'power2.out',
    overwrite: 'auto',
    onComplete: () => scrolls.delete(element)
  });
  if (tween.duration() > 0 && tween.progress() < 1) scrolls.set(element, tween);
  return () => stopScroll(element);
}

// Scoped to the private document, including Astryx's portal. The library keeps
// semantics and tokens; GSAP is the sole animation clock. Inline values here are
// motion only. Completed tweens are removed, never retained in a lifetime context.
export function installWorkspaceMotion(root: HTMLElement) {
  const active = new Set<gsap.core.Tween>();
  const controls = 'button, a, [role="button"], [contenteditable="true"]';
  const track = (create: (done: () => void) => gsap.core.Tween) => {
    let tween: gsap.core.Tween | undefined;
    const done = () => {
      if (tween) active.delete(tween);
    };
    tween = create(done);
    if (tween.duration() > 0 && tween.progress() < 1) active.add(tween);
  };
  const prepare = (node: HTMLElement) => {
    gsap.set([node, ...node.querySelectorAll('*')], {
      transition: 'none',
      animation: 'none',
      scrollBehavior: 'auto'
    });
  };
  const enterDialog = (dialog: HTMLElement) =>
    track((done) =>
      gsap.fromTo(
        dialog,
        { opacity: reducedMotion() ? 1 : 0 },
        {
          opacity: 1,
          duration: reducedMotion() ? 0 : 0.18,
          overwrite: true,
          clearProps: 'opacity',
          onComplete: done,
          onInterrupt: done
        }
      )
    );
  prepare(root);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes)
        if (node instanceof HTMLElement) {
          prepare(node);
          if (node.matches('dialog[open]')) enterDialog(node);
        }
      // Release removed nodes immediately, even during rapid pane switches.
      for (const node of record.removedNodes)
        if (node instanceof HTMLElement) {
          for (const tween of active)
            if (
              tween
                .targets()
                .some(
                  (target) => target === node || (target instanceof Node && node.contains(target))
                )
            )
              tween.kill();
        }
      if (
        record.type === 'attributes' &&
        record.target instanceof HTMLDialogElement &&
        record.target.open
      )
        enterDialog(record.target);
    }
  });
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['open']
  });
  const target = (event: Event) =>
    event.target instanceof Element ? event.target.closest<HTMLElement>(controls) : null;
  const disabled = (node: HTMLElement) => node.matches(':disabled,[aria-disabled="true"]');
  const feedback = (event: Event) => {
    const node = target(event);
    if (!node || disabled(node) || !root.contains(node)) return;
    track((done) =>
      gsap.fromTo(
        node,
        { opacity: reducedMotion() ? 1 : 0.84 },
        {
          opacity: 1,
          duration: reducedMotion() ? 0 : 0.14,
          overwrite: true,
          clearProps: 'opacity',
          onComplete: done,
          onInterrupt: done
        }
      )
    );
  };
  const hover = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    const node = target(event);
    if (
      !node ||
      disabled(node) ||
      (event.relatedTarget instanceof Node && node.contains(event.relatedTarget))
    )
      return;
    const icon = node.querySelector('svg');
    if (icon)
      track((done) =>
        gsap.to(icon, {
          y: event.type === 'pointerover' && !reducedMotion() ? -1 : 0,
          duration: reducedMotion() ? 0 : 0.1,
          overwrite: true,
          onComplete: done,
          onInterrupt: done
        })
      );
  };
  const cancelScroll = (event: Event) => {
    if (
      event instanceof KeyboardEvent &&
      !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)
    )
      return;
    let node = event.target instanceof Element ? event.target : null;
    while (node && root.contains(node)) {
      if (node instanceof HTMLElement) stopScroll(node);
      node = node.parentElement;
    }
  };
  const settle = () => {
    root
      .querySelectorAll<HTMLElement>('.npg-thread,.npg-evidence,.npg-inline-results')
      .forEach(stopScroll);
    gsap.getTweensOf([root, ...root.querySelectorAll('*')]).forEach((tween) => tween.progress(1));
  };
  root.addEventListener('click', feedback, true);
  root.addEventListener('focusin', feedback);
  root.addEventListener('pointerover', hover);
  root.addEventListener('pointerout', hover);
  root.addEventListener('wheel', cancelScroll, { passive: true });
  root.addEventListener('touchstart', cancelScroll, { passive: true });
  root.addEventListener('keydown', cancelScroll);
  document.addEventListener('visibilitychange', settle);
  window.addEventListener('resize', settle);
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', settle);
  return () => {
    observer.disconnect();
    root.removeEventListener('click', feedback, true);
    root.removeEventListener('focusin', feedback);
    root.removeEventListener('pointerover', hover);
    root.removeEventListener('pointerout', hover);
    root.removeEventListener('wheel', cancelScroll);
    root.removeEventListener('touchstart', cancelScroll);
    root.removeEventListener('keydown', cancelScroll);
    document.removeEventListener('visibilitychange', settle);
    window.removeEventListener('resize', settle);
    media.removeEventListener('change', settle);
    [...active].forEach((tween) => tween.kill());
    root
      .querySelectorAll<HTMLElement>('.npg-thread,.npg-evidence,.npg-inline-results')
      .forEach(stopScroll);
    gsap.set([root, ...root.querySelectorAll('*')], {
      clearProps: 'transition,animation,scrollBehavior'
    });
  };
}
export { gsap };
