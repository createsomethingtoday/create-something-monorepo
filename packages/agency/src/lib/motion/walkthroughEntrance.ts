import { reducedFilmMotion } from './filmPlayback';

type Runtime = typeof import('gsap').gsap;

/** A disposable poster travels; the native dialog, recording and focus never do. */
export function enhanceWalkthroughEntrance(
  root: HTMLElement,
  dialog: HTMLDialogElement | null,
  load: () => Promise<Runtime> = async () => (await import('gsap')).gsap
) {
  const view = root.ownerDocument.defaultView;
  const preview = root.querySelector<HTMLButtonElement>('[data-home-open="work-dialog"]');
  const badge = preview?.querySelector<HTMLElement>('[data-proof-play]');
  const frame = badge?.querySelector<SVGElement>('[data-proof-frame]');
  const system = view?.matchMedia('(prefers-reduced-motion: reduce)');
  const hover = view?.matchMedia('(hover: hover) and (pointer: fine)');
  const abort = new AbortController();
  let runtime: Runtime | undefined;
  let disposed = false;
  let loading = false;
  let reduced = true;
  let flight: HTMLImageElement | undefined;
  let transition: gsap.Context | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const settle = () => {
    clearTimeout(deadline);
    transition?.revert();
    transition = undefined;
    flight?.remove();
    flight = undefined;
    dialog?.removeAttribute('data-walkthrough-entering');
  };
  const resetBadge = () => {
    if (!runtime) return;
    runtime.killTweensOf([badge, frame].filter(Boolean));
    if (badge) runtime.set(badge, { clearProps: 'transform' });
    if (frame) runtime.set(frame, { clearProps: 'transform,transformOrigin' });
  };
  const blocked = () => reduced || !system || system.matches;
  const prepare = () => {
    if (disposed || runtime || loading || blocked()) return;
    loading = true;
    void load().then(value => { if (!disposed) runtime = value; })
      .catch(() => { /* Opening the native theater never depends on GSAP. */ })
      .finally(() => { loading = false; });
  };
  const preferenceChanged = () => { settle(); resetBadge(); prepare(); };
  const unsubscribe = reducedFilmMotion.subscribe(value => { reduced = value; preferenceChanged(); });
  system?.addEventListener('change', preferenceChanged, { signal: abort.signal });
  const reset = () => {
    if (blocked()) { resetBadge(); return; }
    if (!runtime || !badge) return;
    runtime.to(badge, { x: 0, y: 0, duration: .3, ease: 'power3.out', overwrite: true });
    if (frame) runtime.to(frame, { rotation: 0, duration: .3, ease: 'power3.out', overwrite: true });
  };
  preview?.addEventListener('pointermove', event => {
    if (!runtime || blocked() || !hover?.matches || !badge || dialog?.open) return;
    const rect = preview.getBoundingClientRect();
    runtime.to(badge, { x: ((event.clientX - rect.left) / rect.width - .5) * 24,
      y: ((event.clientY - rect.top) / rect.height - .5) * 20, duration: .3, ease: 'power3.out', overwrite: true });
    if (frame) runtime.to(frame, { rotation: 18, transformOrigin: '50% 50%', duration: .35, ease: 'power3.out', overwrite: true });
  }, { signal: abort.signal });
  preview?.addEventListener('pointerleave', reset, { signal: abort.signal });
  preview?.addEventListener('blur', reset, { signal: abort.signal });
  const interrupt = () => { settle(); resetBadge(); };
  dialog?.addEventListener('close', () => { if (!dialog.open) interrupt(); }, { signal: abort.signal });
  // Cancel is synchronous; close can arrive on the next event-loop turn.
  dialog?.addEventListener('cancel', interrupt, { signal: abort.signal });
  view?.addEventListener('resize', interrupt, { signal: abort.signal });
  view?.addEventListener('beforeprint', interrupt, { signal: abort.signal });
  root.ownerDocument.addEventListener('visibilitychange', interrupt, { signal: abort.signal });
  return {
    capture() {
      // Read before showModal focuses its close control or scroll motion reverts.
      return preview?.querySelector('img')?.getBoundingClientRect();
    },
    enter(from: DOMRect | undefined) {
      interrupt();
      const video = dialog?.querySelector('video');
      const poster = preview?.querySelector('img');
      if (!runtime || blocked() || !view || !dialog?.open || !video || !poster?.complete || !poster.naturalWidth || !from?.width) return;
      const target = video.getBoundingClientRect();
      if (!target.width || !target.height || from.bottom <= 0 || from.top >= view.innerHeight) return;
      // Contain the full frame even before remote video metadata is available.
      const ratio = poster.naturalWidth / poster.naturalHeight;
      const width = Math.min(target.width, target.height * ratio);
      const height = width / ratio;
      const left = target.left + (target.width - width) / 2;
      const top = target.top + (target.height - height) / 2;
      flight = poster.cloneNode() as HTMLImageElement;
      flight.removeAttribute('id');
      flight.alt = '';
      flight.setAttribute('aria-hidden', 'true');
      flight.className = 'walkthrough-flight';
      dialog.appendChild(flight);
      dialog.setAttribute('data-walkthrough-entering', '');
      try {
        transition = runtime.context(() => {
          runtime!.timeline({ onComplete: settle })
            .fromTo(flight!, { x: from.left, y: from.top, width: from.width, height: from.height, scaleX: 1, scaleY: 1, rotation: 0 },
              { x: left, y: top, scaleX: width / from.width, scaleY: height / from.height, duration: .62, ease: 'power3.inOut' }, 0)
            .to(flight!, { rotation: -1.4, duration: .16, ease: 'sine.out' }, 0)
            .to(flight!, { rotation: 0, duration: .46, ease: 'power2.inOut' }, .16)
            .to(flight!, { opacity: 0, duration: .18, ease: 'power2.out' }, .44)
            .fromTo(dialog.querySelectorAll('.theater-header h2, .theater-notes'),
              { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: .28, stagger: .05, ease: 'power2.out' }, .22);
        }, dialog);
        // No stalled frame or stale callback can leave a poster over the player.
        deadline = setTimeout(settle, 850);
      } catch { settle(); }
    },
    destroy() { disposed = true; interrupt(); abort.abort(); unsubscribe(); }
  };
}
