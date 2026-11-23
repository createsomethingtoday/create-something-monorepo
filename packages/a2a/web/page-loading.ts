// A newer navigation or refresh owns the mark if an earlier request finishes late.
let generation = 0;

export function beginPageLoad() {
  const current = ++generation;
  document.body.setAttribute('data-brand-loading', '');
  return () => {
    if (current === generation) document.body.removeAttribute('data-brand-loading');
  };
}
