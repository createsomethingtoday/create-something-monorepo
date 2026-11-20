import { get } from 'svelte/store';
import { filmNavigationOpen, filmOverlayOpen, reducedFilmMotion } from './filmPlayback';
import { agencySearchOpen } from '../site-search/presentation';

/** Native radios own selection. Finite, optional gestures never gate the content. */
export function enhanceDotsGuide(root: HTMLElement) {
  let alive = true;
  let gsap: (typeof import('gsap'))['gsap'] | undefined;
  let stepContext: gsap.Context | undefined;
  let introContext: gsap.Context | undefined;
  const benefitContexts: gsap.Context[] = [];
  let introduced = false;
  const replay = root.querySelector<HTMLButtonElement>('.replay');
  const radios = [...root.querySelectorAll<HTMLInputElement>('.step-radio')];
  const allowed = () =>
    alive &&
    !!gsap &&
    !document.hidden &&
    !get(reducedFilmMotion) &&
    !get(filmNavigationOpen) &&
    !get(filmOverlayOpen) &&
    !get(agencySearchOpen);
  const settle = () => {
    stepContext?.revert();
    stepContext = undefined;
    introContext?.revert();
    introContext = undefined;
    benefitContexts.splice(0).forEach((context) => context.revert());
  };
  const sync = () => {
    const enabled = allowed();
    root.dataset.dotsMotion = enabled ? 'on' : 'paused';
    if (replay) replay.hidden = !enabled;
    if (!enabled) {
      settle();
      return;
    }
    if (gsap && !introduced) {
      introduced = true;
      introContext = gsap.context(() => {
        gsap!.fromTo(
          '.canon-hero',
          { y: 12, rotation: -2 },
          { y: 0, rotation: 0, duration: 0.65, ease: 'power2.out' }
        );
        gsap!.fromTo(
          '.hero-arc',
          { strokeDashoffset: 560 },
          { strokeDashoffset: 0, duration: 0.8, ease: 'power2.out' }
        );
      }, root);
    }
  };
  const showStep = () => {
    stepContext?.revert();
    stepContext = undefined;
    const index = radios.find((radio) => radio.checked)?.value ?? '0';
    if (!allowed() || !gsap) return;
    stepContext = gsap.context(() => {
      gsap!
        .timeline({ defaults: { ease: 'power2.out' } })
        .fromTo('.paper-front', { y: 16, rotation: -3 }, { y: 0, rotation: 0, duration: 0.45 })
        .fromTo(`[data-panel="${index}"]`, { y: 10 }, { y: 0, duration: 0.35 }, 0)
        .fromTo(
          '.canon-desk',
          { x: -6, rotation: -2 },
          { x: 0, rotation: 0, duration: 0.45 },
          0.08
        );
    }, root);
  };
  const change = (event: Event) => {
    if ((event.target as HTMLInputElement).checked) showStep();
  };
  radios.forEach((radio) => radio.addEventListener('change', change));
  replay?.addEventListener('click', showStep);
  const disposers = [reducedFilmMotion, filmNavigationOpen, filmOverlayOpen, agencySearchOpen].map(
    (store) => store.subscribe(sync)
  );
  document.addEventListener('visibilitychange', sync);
  // Interruption settles every authored transform. Selection remains native.
  window.addEventListener('resize', settle);
  let observer: IntersectionObserver | undefined;
  void import('gsap')
    .then((module) => {
      if (!alive) return;
      gsap = module.gsap;
      sync();
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting || !allowed() || !gsap) continue;
            observer?.unobserve(entry.target);
            const mark = entry.target.querySelector('.benefit-mark');
            if (mark)
              benefitContexts.push(
                gsap.context(() => {
                  gsap!.fromTo(mark, { y: 12 }, { y: 0, duration: 0.4, ease: 'power2.out' });
                }, root)
              );
          }
        },
        { threshold: 0.2 }
      );
      root.querySelectorAll('.benefit').forEach((benefit) => observer!.observe(benefit));
    })
    .catch(() => {
      /* Reading, radios and details remain usable if motion cannot load. */
    });
  return {
    destroy() {
      alive = false;
      observer?.disconnect();
      settle();
      disposers.forEach((dispose) => dispose());
      radios.forEach((radio) => radio.removeEventListener('change', change));
      replay?.removeEventListener('click', showStep);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('resize', settle);
      delete root.dataset.dotsMotion;
    }
  };
}
