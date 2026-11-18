import { reducedFilmMotion, filmOverlayOpen, filmNavigationOpen } from './filmPlayback';

export const HERO_VIDEO = '/films/agency-hero-20261117/one-small-adjustment.mp4';
/** Owns the decorative hero only. Sources are absent until visible motion is allowed. */
export function enhanceHeroPlayback(root: HTMLElement) {
  const video = root.querySelector<HTMLVideoElement>('video');
  const button = root.querySelector<HTMLButtonElement>('[data-hero-playback]');
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  if (!video || !button || !view?.IntersectionObserver) return { destroy() {} };
  const connection = (view.navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
  let visible = false, reduced = true, overlay = false, navigation = false;
  let manualPause = false, completed = false, failed = false, destroyed = false, pending = false;
  let generation = 0;
  video.muted = true;
  const label = () => {
    button.textContent = completed ? 'Replay hero animation' : manualPause ? 'Play hero animation' : 'Pause hero animation';
    button.setAttribute('aria-label', button.textContent);
  };
  const canPlay = () => !destroyed && !failed && !reduced && !connection?.saveData && visible && !overlay && !navigation && !doc.hidden && !manualPause && !completed;
  const sync = () => {
    const still = reduced || !!connection?.saveData || failed;
    button.hidden = still || (!visible && !video.hasAttribute('src'));
    if (still) {
      generation++; pending = false;
      video.pause(); video.hidden = true;
      if (video.hasAttribute('src')) { video.removeAttribute('src'); video.load(); }
    } else if (!canPlay()) {
      generation++; pending = false; video.pause();
    } else {
      if (!video.hasAttribute('src')) { video.setAttribute('src', HERO_VIDEO); video.load(); button.hidden = false; }
      if (video.paused && !pending) {
        pending = true;
        const request = ++generation;
        void video.play().then(() => {
          if (destroyed || request !== generation) { if (!canPlay()) video.pause(); return; }
          pending = false; label();
        }).catch(() => {
          if (destroyed || request !== generation) return;
          pending = false; manualPause = true; label();
        });
      }
    }
    label();
  };
  const click = () => {
    if (completed) { completed = false; video.currentTime = 0; manualPause = false; }
    else manualPause = !manualPause;
    sync();
  };
  const ended = () => { generation++; pending = false; completed = true; manualPause = false; label(); };
  const playing = () => { if (canPlay()) video.hidden = false; else video.pause(); label(); };
  const error = () => { failed = true; sync(); };
  button.addEventListener('click', click);
  video.addEventListener('playing', playing);
  video.addEventListener('ended', ended);
  video.addEventListener('error', error);
  doc.addEventListener('visibilitychange', sync);
  connection?.addEventListener('change', sync);
  const observer = new view.IntersectionObserver(([entry]) => { visible = entry.isIntersecting && entry.intersectionRatio >= .15; sync(); }, { threshold: [0, .15] });
  observer.observe(root.querySelector<HTMLElement>('.hero-motion') ?? root);
  const unsubscribers = [
    reducedFilmMotion.subscribe(value => { reduced = value; sync(); }),
    filmOverlayOpen.subscribe(value => { overlay = value; sync(); }),
    filmNavigationOpen.subscribe(value => { navigation = value; sync(); })
  ];
  return { destroy() {
    destroyed = true; generation++;
    observer.disconnect(); unsubscribers.forEach(unsubscribe => unsubscribe());
    button.removeEventListener('click', click);
    video.removeEventListener('playing', playing); video.removeEventListener('ended', ended); video.removeEventListener('error', error);
    doc.removeEventListener('visibilitychange', sync); connection?.removeEventListener('change', sync);
    video.pause(); video.removeAttribute('src'); video.load(); video.hidden = true; button.hidden = true;
  } };
}
