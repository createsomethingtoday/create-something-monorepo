/** Mounted-only motion. SSR is always the readable final state. */
export function createInkMotion() {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Set<Animation>();
  function settle() {
    for (const animation of [...active]) {
      try {
        animation.finish();
      } catch {
        animation.cancel();
      }
    }
  }
  function preferenceChanged() {
    if (preference.matches) settle();
  }
  function visibilityChanged() {
    if (document.hidden) settle();
  }
  preference.addEventListener('change', preferenceChanged);
  document.addEventListener('visibilitychange', visibilityChanged);
  window.addEventListener('pagehide', settle);
  return {
    animate(node: Element, frames: Keyframe[], options: KeyframeAnimationOptions) {
      if (preference.matches || document.hidden || !node.animate) return undefined;
      const animation = node.animate(frames, options);
      active.add(animation);
      const remove = () => active.delete(animation);
      animation.addEventListener('finish', remove, { once: true });
      animation.addEventListener('cancel', remove, { once: true });
      return animation;
    },
    settle,
    destroy() {
      for (const animation of active) animation.cancel();
      active.clear();
      preference.removeEventListener('change', preferenceChanged);
      document.removeEventListener('visibilitychange', visibilityChanged);
      window.removeEventListener('pagehide', settle);
    }
  };
}

export function inkReveal(node: HTMLElement, delay = 0) {
  const motion = createInkMotion();
  let animation: Animation | undefined;
  const observer =
    typeof IntersectionObserver === 'undefined'
      ? undefined
      : new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            observer?.unobserve(node);
            if (node.contains(document.activeElement)) return;
            animation = motion.animate(
              node,
              [
                { opacity: 0.65, transform: 'translateY(10px)' },
                { opacity: 1, transform: 'translateY(0)' }
              ],
              { duration: 520, delay, easing: 'cubic-bezier(.22,.72,.25,1)' }
            );
          },
          { threshold: 0.12, rootMargin: '0px 0px -24px 0px' }
        );
  observer?.observe(node);
  const focus = () => animation?.finish();
  node.addEventListener('focusin', focus);
  return {
    destroy() {
      observer?.disconnect();
      node.removeEventListener('focusin', focus);
      motion.destroy();
    }
  };
}

/** Feedback changes the output, never remounts or moves the input. */
export function inkFeedback(node: HTMLElement, value: string) {
  const motion = createInkMotion();
  let previous = value;
  let animation: Animation | undefined;
  return {
    update(next: string) {
      if (next === previous) return;
      previous = next;
      animation?.cancel();
      animation = motion.animate(node, [{ opacity: 0.55 }, { opacity: 1 }], { duration: 180 });
    },
    destroy() {
      motion.destroy();
    }
  };
}
