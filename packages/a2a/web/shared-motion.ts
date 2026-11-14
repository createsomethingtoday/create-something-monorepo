/** Progressive enhancement only. Native controls and readable content never await GSAP. */
export function startSharedMotion() {
  let disposed = false;
  let mounted = false;
  let generation = 0;
  let dispose = () => {};
  const suspend = () => {
    generation++;
    dispose();
    dispose = () => {};
    mounted = false;
    document.documentElement.dataset.sharedMotion = 'suspended';
  };
  const resume = (event: PageTransitionEvent) => {
    if (event.persisted) mount();
  };
  const stop = () => {
    disposed = true;
    suspend();
    window.removeEventListener('pagehide', suspend);
    window.removeEventListener('pageshow', resume);
  };
  const mount = () => {
    if (disposed || mounted) return;
    mounted = true;
    const run = ++generation;
    void import('gsap')
      .then(({ gsap }) => {
        if (disposed || run !== generation) return;
        const media = gsap.matchMedia();
        dispose = () => media.revert();
        let failed = false;
        media.add('(prefers-reduced-motion: no-preference)', (context) => {
          const events = new AbortController();
          const { signal } = events;
          const style = getComputedStyle(document.documentElement);
          const micro =
            parseFloat(style.getPropertyValue('--duration-performance-micro')) / 1000 || 0.2;
          const standard =
            parseFloat(style.getPropertyValue('--duration-performance-standard')) / 1000 || 0.3;
          // Event effects are transient. A long-lived GSAP context otherwise retains
          // every completed tween and its former DOM target until the page unloads.
          const active = new Map<gsap.core.Tween, Element>();
          const transformed = new Set<Element>();
          const hovering = new WeakSet<Element>();
          const pending = new Set<Element>();
          let observer: IntersectionObserver | undefined;
          let changes: MutationObserver | undefined;
          const cleanup = () => {
            events.abort();
            observer?.disconnect();
            changes?.disconnect();
            pending.clear();
            for (const animation of active.keys()) animation.kill();
            active.clear();
            context.ignore(() => {
              for (const target of transformed) gsap.set(target, { clearProps: 'transform' });
            });
            transformed.clear();
            document.querySelectorAll<HTMLElement>('.shared-tabs').forEach((tabs) => {
              tabs.style.removeProperty('--tab-left');
              tabs.style.removeProperty('--tab-width');
            });
          };
          try {
            const tween = (target: Element, vars: gsap.TweenVars, from?: gsap.TweenVars) => {
              if (!target.isConnected || signal.aborted) return;
              const transforms = 'x' in vars || 'y' in vars;
              if (transforms) transformed.add(target);
              context.ignore(() => {
                let animation: gsap.core.Tween;
                const finished = () => {
                  active.delete(animation);
                  // Transform components share one CSS property. One completed axis must
                  // not clear another live axis or the persistent pointer preview.
                  if (
                    transforms &&
                    !hovering.has(target) &&
                    ![...active.values()].includes(target)
                  ) {
                    context.ignore(() => gsap.set(target, { clearProps: 'transform' }));
                    transformed.delete(target);
                  }
                };
                const options: gsap.TweenVars = {
                  duration: micro,
                  ease: 'power2.out',
                  overwrite: 'auto' as const,
                  ...vars,
                  onComplete: finished,
                  onInterrupt: () => active.delete(animation)
                };
                if (options.clearProps === 'transform') delete options.clearProps;
                animation = from ? gsap.fromTo(target, from, options) : gsap.to(target, options);
                active.set(animation, target);
              });
            };
            const control = (event: Event) =>
              event.target instanceof Element
                ? event.target.closest<HTMLElement>('button:not(:disabled),summary')
                : null;
            document.addEventListener(
              'pointerover',
              (event) => {
                const target = control(event);
                if (
                  !target ||
                  (event.relatedTarget instanceof Node && target.contains(event.relatedTarget))
                )
                  return;
                if (target.matches('.inbox-option,.account-nav button')) {
                  hovering.add(target);
                  tween(target, { x: 2 });
                }
              },
              { signal }
            );
            document.addEventListener(
              'pointerout',
              (event) => {
                const target = control(event);
                if (
                  !target ||
                  (event.relatedTarget instanceof Node && target.contains(event.relatedTarget))
                )
                  return;
                hovering.delete(target);
                tween(target, { x: 0, clearProps: 'transform' });
              },
              { signal }
            );
            document.addEventListener(
              'click',
              (event) => {
                const target = control(event);
                if (!target || !target.isConnected) return;
                tween(target, { y: 0, clearProps: 'transform' }, { y: 1 });
              },
              { signal }
            );
            // Pointer preview identifies the destination. Leaving restores the selected destination.
            const lastMarker = new WeakMap<
              HTMLElement,
              { target: HTMLElement; left: number; width: number }
            >();
            const marker = (tabs: HTMLElement, target: HTMLElement) => {
              const left = target.offsetLeft,
                width = target.offsetWidth;
              const previous = lastMarker.get(tabs);
              if (previous?.target === target && previous.left === left && previous.width === width)
                return;
              lastMarker.set(tabs, { target, left, width });
              tween(tabs, {
                '--tab-left': `${left}px`,
                '--tab-width': `${width}px`
              });
            };
            window.addEventListener(
              'resize',
              () => {
                document.querySelectorAll<HTMLElement>('.shared-tabs').forEach((tabs) => {
                  const previous = lastMarker.get(tabs)?.target;
                  const target =
                    previous?.parentElement === tabs
                      ? previous
                      : tabs.querySelector<HTMLElement>('[aria-current]');
                  if (target) marker(tabs, target);
                });
              },
              { signal }
            );
            document.addEventListener(
              'pointermove',
              (event) => {
                if (event.pointerType !== 'mouse') return;
                const target =
                  event.target instanceof Element
                    ? event.target.closest<HTMLElement>('.shared-tabs button')
                    : null;
                if (target?.parentElement) marker(target.parentElement, target);
              },
              { signal }
            );
            document.addEventListener(
              'pointerout',
              (event) => {
                const tabs =
                  event.target instanceof Element
                    ? event.target.closest<HTMLElement>('.shared-tabs')
                    : null;
                if (
                  !tabs ||
                  (event.relatedTarget instanceof Node && tabs.contains(event.relatedTarget))
                )
                  return;
                const selected = tabs.querySelector<HTMLElement>('[aria-current]');
                if (selected) marker(tabs, selected);
              },
              { signal }
            );
            const seen = new WeakSet<Element>();
            observer = new IntersectionObserver(
              (entries) => {
                for (const entry of entries) {
                  if (!entry.isIntersecting) continue;
                  observer!.unobserve(entry.target);
                  pending.delete(entry.target);
                  // Never hide content. Interrupted or failed enhancement stays readable.
                  tween(
                    entry.target,
                    { y: 0, duration: standard, clearProps: 'transform' },
                    { y: 7 }
                  );
                }
              },
              { threshold: 0.05 }
            );
            const scan = () => {
              if (signal.aborted) return;
              for (const target of pending) {
                if (!target.isConnected) {
                  observer!.unobserve(target);
                  pending.delete(target);
                }
              }
              for (const [animation, target] of active) {
                if (!target.isConnected) {
                  animation.kill();
                  active.delete(animation);
                }
              }
              for (const target of transformed) {
                if (!target.isConnected) {
                  hovering.delete(target);
                  context.ignore(() => gsap.set(target, { clearProps: 'transform' }));
                  transformed.delete(target);
                }
              }
              for (const el of document.querySelectorAll(
                '.shared-message,.shared-record,.shared-compose,.console-heading'
              )) {
                if (!seen.has(el)) {
                  seen.add(el);
                  pending.add(el);
                  observer!.observe(el);
                }
              }
            };
            changes = new MutationObserver(scan);
            changes.observe(document.getElementById('desk') ?? document.body, {
              childList: true,
              subtree: true
            });
            scan();
            document.documentElement.dataset.sharedMotion = 'ready';
          } catch {
            failed = true;
            cleanup();
            document.documentElement.dataset.sharedMotion = 'unavailable';
          }
          return cleanup;
        });
        document.documentElement.dataset.sharedMotion = failed ? 'unavailable' : 'ready';
      })
      .catch(() => {
        if (run !== generation || disposed) return;
        dispose();
        dispose = () => {};
        mounted = false;
        document.documentElement.dataset.sharedMotion = 'unavailable';
      });
  };
  window.addEventListener('pagehide', suspend);
  window.addEventListener('pageshow', resume);
  mount();
  return stop;
}
