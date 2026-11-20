import { get } from 'svelte/store';
import { filmNavigationOpen, filmOverlayOpen, reducedFilmMotion } from './filmPlayback';
import { agencySearchOpen } from '../site-search/presentation';

/** Finite gestures explain a native selection. No text or control depends on GSAP. */
export function enhanceDentalAgents(root: HTMLElement) {
  let alive = true;
  let gsap: (typeof import('gsap'))['gsap'] | undefined;
  let context: gsap.Context | undefined;
  let introduced = false;
  const radios = [...root.querySelectorAll<HTMLInputElement>('.sequence-radio')];
  const allowed = () =>
    alive &&
    !!gsap &&
    !document.hidden &&
    !get(reducedFilmMotion) &&
    !get(filmNavigationOpen) &&
    !get(filmOverlayOpen) &&
    !get(agencySearchOpen);
  const settle = () => {
    context?.revert();
    context = undefined;
  };
  const sync = () => {
    root.dataset.dentalMotion = allowed() ? 'on' : 'paused';
    if (!allowed()) {
      settle();
      return;
    }
    if (!introduced && gsap) {
      introduced = true;
      context = gsap.context(
        () =>
          gsap!.fromTo(
            '.dental-canon',
            { y: 12, rotation: -2 },
            { y: 0, rotation: 0, duration: 0.6, ease: 'power2.out' }
          ),
        root
      );
    }
  };
  const select = () => {
    settle();
    if (!allowed() || !gsap) return;
    const step = radios.find((radio) => radio.checked)?.value ?? 'ask';
    context = gsap.context(
      () =>
        gsap!.fromTo(
          `[data-step="${step}"] .sequence-mark`,
          { y: 8 },
          { y: 0, duration: 0.35, ease: 'power2.out' }
        ),
      root
    );
  };
  radios.forEach((radio) => radio.addEventListener('change', select));
  const disposers = [reducedFilmMotion, filmNavigationOpen, filmOverlayOpen, agencySearchOpen].map(
    (store) => store.subscribe(sync)
  );
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('resize', settle);
  void import('gsap')
    .then((module) => {
      if (alive) {
        gsap = module.gsap;
        sync();
      }
    })
    .catch(() => {
      /* Native reading, radios and FAQs remain available. */
    });
  return {
    destroy() {
      alive = false;
      settle();
      disposers.forEach((dispose) => dispose());
      radios.forEach((radio) => radio.removeEventListener('change', select));
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('resize', settle);
      delete root.dataset.dentalMotion;
    }
  };
}
