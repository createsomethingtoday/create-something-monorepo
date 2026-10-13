import { writable } from 'svelte/store';

// Static SSR first. One user/system preference governs every moving surface.
export const motionEnabled = writable(false);

export function reveal(node: HTMLElement) {
  let observer: IntersectionObserver | undefined;
  let animation: Animation | undefined;
  let seen = false;
  const unsubscribe = motionEnabled.subscribe((enabled) => {
    observer?.disconnect();
    animation?.cancel();
    if (!enabled || seen) return;
    observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        seen = true;
        observer?.disconnect();
        animation = node.animate(
          [
            { opacity: 0.35, transform: 'translateY(24px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ],
          { duration: 700, easing: 'cubic-bezier(0.4,0,0.2,1)' }
        );
      },
      { threshold: 0.08 }
    );
    observer.observe(node);
  });
  return {
    destroy() {
      unsubscribe();
      observer?.disconnect();
      animation?.cancel();
    }
  };
}

// A bounded pointer response: no scroll listener or perpetual JS animation loop.
export function materialMotion(node: HTMLElement) {
  let enabled = false;
  let visible = false;
  let frame = 0;
  const update = () => (node.dataset.active = String(enabled && visible && !document.hidden));
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  });
  observer.observe(node);
  const unsubscribe = motionEnabled.subscribe((value) => {
    enabled = value;
    update();
    if (!value) reset();
  });
  function reset() {
    cancelAnimationFrame(frame);
    node.style.setProperty('--tilt-x', '0deg');
    node.style.setProperty('--tilt-y', '0deg');
  }
  function pointer(event: PointerEvent) {
    if (!enabled || event.pointerType !== 'mouse' || !visible) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const box = node.getBoundingClientRect();
      node.style.setProperty(
        '--tilt-x',
        `${((event.clientY - box.top) / box.height - 0.5) * -8}deg`
      );
      node.style.setProperty(
        '--tilt-y',
        `${((event.clientX - box.left) / box.width - 0.5) * 10}deg`
      );
    });
  }
  node.addEventListener('pointermove', pointer);
  node.addEventListener('pointerleave', reset);
  document.addEventListener('visibilitychange', update);
  return {
    destroy() {
      unsubscribe();
      observer.disconnect();
      cancelAnimationFrame(frame);
      node.removeEventListener('pointermove', pointer);
      node.removeEventListener('pointerleave', reset);
      document.removeEventListener('visibilitychange', update);
    }
  };
}

// A finite image entrance that settles immediately when motion is disabled.
export function imageEntry(node: HTMLElement) {
  let animation: Animation | undefined;
  let started = false;
  const unsubscribe = motionEnabled.subscribe((enabled) => {
    if (!enabled) {
      animation?.cancel();
      return;
    }
    if (started) return;
    started = true;
    animation = node.animate(
      [
        { opacity: 0, transform: 'translateY(16px) scale(1.025)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ],
      { duration: 650, easing: 'cubic-bezier(0.22,1,0.36,1)' }
    );
  });
  return {
    destroy() {
      unsubscribe();
      animation?.cancel();
    }
  };
}
