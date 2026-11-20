import { derived } from 'svelte/store';
import { reducedFilmMotion, filmNavigationOpen, filmOverlayOpen } from './filmPlayback';

/** The selected artifact arrives; reading, controls and scene ownership stay immediate. */
export function enhanceHandoffSceneMotion(root: HTMLElement) {
  const document = root.ownerDocument;
  const view = document.defaultView;
  const scenes = Array.from(root.querySelectorAll<HTMLElement>('[data-tour-scene]'));
  const links = Array.from(root.querySelectorAll<HTMLElement>('[data-waypoint]'));
  const track = root.querySelector<HTMLElement>('.waypoint-links');
  const noop = { select(_index: number) {}, destroy() {} };
  if (!view?.matchMedia || !track || !scenes.length || typeof track.animate !== 'function')
    return noop;

  const systemMotion = view.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = view.matchMedia('(min-width: 901px) and (min-height: 751px)');
  const abort = new AbortController();
  const rail = document.createElement('span');
  rail.className = 'handoff-selection-rail';
  rail.setAttribute('data-handoff-rail', '');
  rail.setAttribute('aria-hidden', 'true');
  track.appendChild(rail);
  track.classList.add('has-selection-rail');

  let active = -1;
  let blocked = true;
  let disposed = false;
  let interrupted = false;
  let printing = false;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const animations = new Set<Animation>();

  const cancel = () => {
    clearTimeout(deadline);
    deadline = undefined;
    for (const animation of animations) animation.cancel();
    animations.clear();
  };
  const bounds = (element: HTMLElement) => {
    const parent = track.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return { x: rect.left - parent.left, width: rect.width };
  };
  const placeRail = () => {
    const link = links[active];
    if (!link) return;
    const target = bounds(link);
    rail.style.width = `${target.width}px`;
    rail.style.transform = `translateX(${target.x}px)`;
  };
  const settle = () => {
    cancel();
    placeRail();
  };
  const interrupt = () => {
    interrupted = true;
    settle();
    // Selection listeners in the same resize/hash event must also stay instant.
    queueMicrotask(() => {
      interrupted = false;
    });
  };
  const allowed = () =>
    !blocked &&
    !systemMotion.matches &&
    !document.hidden &&
    desktop.matches &&
    !interrupted &&
    !printing;
  const timing = () => {
    const style = view.getComputedStyle(root);
    const value = style.getPropertyValue('--duration-performance-micro').trim();
    const duration = parseFloat(value) * (value.endsWith('ms') ? 1 : 1000);
    return {
      duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
      easing: style.getPropertyValue('--ease-performance-standard').trim() || 'ease'
    };
  };
  const animate = (
    element: HTMLElement,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions
  ) => {
    const animation = element.animate(keyframes, options);
    animations.add(animation);
    // WAAPI effects have no fill and never replace authored inline styles.
    void animation.finished
      .then(() => {
        animations.delete(animation);
        animation.cancel();
      })
      .catch(() => {});
  };

  const unsubscribe = derived([reducedFilmMotion, filmNavigationOpen, filmOverlayOpen], (values) =>
    values.some(Boolean)
  ).subscribe((value) => {
    blocked = value;
    if (value) settle();
  });
  systemMotion.addEventListener('change', settle, { signal: abort.signal });
  desktop.addEventListener('change', settle, { signal: abort.signal });
  view.addEventListener('resize', interrupt, { signal: abort.signal });
  view.addEventListener('hashchange', interrupt, { signal: abort.signal });
  view.addEventListener(
    'beforeprint',
    () => {
      printing = true;
      settle();
    },
    { signal: abort.signal }
  );
  view.addEventListener(
    'afterprint',
    () => {
      printing = false;
    },
    { signal: abort.signal }
  );
  document.addEventListener('visibilitychange', settle, { signal: abort.signal });
  root.addEventListener(
    'focusin',
    (event) => {
      if (scenes.some((scene) => scene.contains(event.target as Node))) settle();
    },
    { signal: abort.signal }
  );

  return {
    select(index: number) {
      if (disposed || !scenes[index] || !links[index] || active === index) return;
      const previous = active;
      const from = previous < 0 ? undefined : bounds(rail);
      active = index;
      cancel();
      placeRail();
      const options = timing();
      if (!from || !allowed() || !options.duration) return;

      const target = bounds(links[index]);
      const image = scenes[index].querySelector<HTMLImageElement>('.handoff-art > img');
      try {
        if (target.width > 0)
          animate(
            rail,
            [
              { transform: `translateX(${from.x}px) scaleX(${from.width / target.width})` },
              { transform: `translateX(${target.x}px) scaleX(1)` }
            ],
            options
          );
        // An undecoded image stays in its authored state instead of fading from a blank frame.
        if (image?.complete && image.naturalWidth && typeof image.animate === 'function') {
          const distance = index > previous ? 8 : -8;
          animate(
            image,
            [
              {
                opacity: 0.65,
                translate: `${distance}px 0`,
                clipPath: distance > 0 ? 'inset(0 8px 0 0)' : 'inset(0 0 0 8px)'
              },
              { opacity: 1, translate: '0px 0px', clipPath: 'inset(0)' }
            ],
            options
          );
        }
        // A suspended animation clock must not leave a partial reveal behind.
        deadline = setTimeout(settle, options.duration + 100);
      } catch {
        settle();
      }
    },
    destroy() {
      disposed = true;
      cancel();
      unsubscribe();
      abort.abort();
      rail.remove();
      track.classList.remove('has-selection-rail');
    }
  };
}
