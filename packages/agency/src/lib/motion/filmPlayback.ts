import { derived, get, writable } from 'svelte/store';
export const reducedFilmMotion = writable(true);
export const filmOverlayOpen = writable(false);
export const filmNavigationOpen = writable(false);
const motionPreferenceKey = 'agency-reduced-motion';
let explicitMotionPreference: boolean | null = null;
export function setFilmMotion(reduced: boolean) {
  explicitMotionPreference = reduced;
  try { sessionStorage.setItem(motionPreferenceKey, String(reduced)); } catch { /* Motion still works without storage. */ }
  reducedFilmMotion.set(reduced);
}
export function toggleFilmMotion() {
  setFilmMotion(!get(reducedFilmMotion));
}
const blocked = derived([reducedFilmMotion, filmOverlayOpen, filmNavigationOpen], (values) => values.some(Boolean));
export function initializeFilmMotion() {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  try {
    const saved = sessionStorage.getItem(motionPreferenceKey);
    explicitMotionPreference = saved === 'true' ? true : saved === 'false' ? false : null;
  } catch { /* Use the system preference when storage is unavailable. */ }
  reducedFilmMotion.set(explicitMotionPreference ?? preference.matches);
  const change = () => reducedFilmMotion.set(explicitMotionPreference ?? preference.matches);
  preference.addEventListener('change', change);
  return () => preference.removeEventListener('change', change);
}
/** Visible, muted playback. A deliberate pause survives leaving/re-entering the viewport. */
export function visibleFilm(node: HTMLVideoElement, options: { threshold?: number; enabled?: boolean } = {}) {
  let visible = false, disabled = true, userPaused = false, internalPauses = 0;
  node.muted = true;
  const pause = () => { if (!node.paused) { internalPauses++; node.pause(); } };
  const sync = () => {
    if (!visible || disabled || options.enabled === false || document.hidden) pause();
    else if (!userPaused && !node.ended) void node.play().catch(() => { /* Native controls remain available. */ });
  };
  const onPause = () => { if (internalPauses) internalPauses--; else if (!node.ended) userPaused = true; };
  const onPlay = () => { userPaused = false; };
  node.addEventListener('pause', onPause); node.addEventListener('play', onPlay);
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting && entry.intersectionRatio >= (options.threshold ?? .5); sync(); }, {threshold: [0, options.threshold ?? .5]});
  observer.observe(node);
  const unsubscribe = blocked.subscribe(value => { disabled = value; sync(); });
  document.addEventListener('visibilitychange', sync);
  return {update(next: typeof options) { options = next; sync(); },destroy() { observer.disconnect(); unsubscribe(); document.removeEventListener('visibilitychange', sync); node.removeEventListener('pause', onPause); node.removeEventListener('play', onPlay); pause(); }};
}
