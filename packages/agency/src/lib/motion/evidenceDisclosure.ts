/** Animate a native disclosure without taking away its no-JavaScript behavior. */
export function enhanceEvidenceDisclosure(details: HTMLDetailsElement): () => void {
  const summary = details.querySelector('summary');
  const body = details.querySelector<HTMLElement>('.evidence-body');
  if (!summary || !body || typeof details.animate !== 'function') return () => {};

  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let expanded = details.open;
  let resize: Animation | undefined;
  let reveal: Animation | undefined;

  const settle = () => {
    resize?.cancel();
    reveal?.cancel();
    resize = reveal = undefined;
    details.open = expanded;
    details.classList.remove('is-closing');
    details.style.removeProperty('height');
    details.style.removeProperty('overflow');
  };

  const toggle = (event: MouseEvent) => {
    // Keep modifier-assisted and synthetic native interactions intact.
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    const start = details.getBoundingClientRect().height;
    expanded = !expanded;
    details.classList.toggle('is-closing', !expanded);
    resize?.cancel();
    reveal?.cancel();
    const style = getComputedStyle(details);
    const durationValue = style.getPropertyValue('--evidence-duration').trim();
    const duration = parseFloat(durationValue) * (durationValue.endsWith('ms') ? 1 : 1000);
    if (preference.matches || !Number.isFinite(duration) || duration <= 0) {
      settle();
      return;
    }

    details.style.removeProperty('height');
    details.open = true;
    const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const end = expanded ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height + border;
    details.style.height = `${end}px`;
    details.style.overflow = 'clip';
    const easing = style.getPropertyValue('--ease-performance-standard').trim() || 'ease';
    const current = details.animate([{ height: `${start}px` }, { height: `${end}px` }], { duration, easing });
    resize = current;
    reveal = body.animate(
      expanded ? [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'translateY(0)' }] : [{ opacity: 1 }, { opacity: 0 }],
      { duration, easing }
    );
    void current.finished.then(() => { if (resize === current) settle(); }).catch(() => {});
  };
  const changePreference = () => { if (preference.matches) settle(); };
  summary.addEventListener('click', toggle);
  preference.addEventListener('change', changePreference);
  return () => {
    summary.removeEventListener('click', toggle);
    preference.removeEventListener('change', changePreference);
    settle();
  };
}
