// A newer navigation or refresh owns the mark if an earlier request finishes late.
let generation = 0;

export function beginPageLoad() {
  const current = ++generation;
  document.body.setAttribute('data-brand-loading', '');
  return () => {
    if (current === generation) document.body.removeAttribute('data-brand-loading');
  };
}

// Content and native navigation are available throughout the decorative entrance.
const entry = document.querySelector<HTMLElement>('.relay-entry');
if (entry) {
  const listeners = new AbortController();
  const dismiss = () => {
    entry.dataset.dismissed = '';
    listeners.abort();
  };
  const options = { capture: true, passive: true, signal: listeners.signal };
  for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focusin', 'pagehide']) {
    window.addEventListener(event, dismiss, options);
  }
  entry.addEventListener('animationend', event => {
    if (event.animationName === 'relay-entry-out') dismiss();
  }, options);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  reduced.addEventListener('change', dismiss, options);
  if (reduced.matches || location.hash) dismiss();
}
