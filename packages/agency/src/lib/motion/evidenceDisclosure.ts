/** Short, reversible enhancement of explicitly owned native disclosures. */
export function enhanceNativeDisclosure(details: HTMLDetailsElement): () => void {
  const summary = Array.from(details.children).find(child => child.tagName === 'SUMMARY') as HTMLElement | undefined;
  const body = details.querySelector<HTMLElement>(':scope > [data-disclosure-body], :scope > .evidence-body, :scope > .cc-faq');
  const view = details.ownerDocument.defaultView;
  if (!summary || !body || !view?.matchMedia || typeof details.animate !== 'function') return () => {};

  const preference = view.matchMedia('(prefers-reduced-motion: reduce)');
  let expanded = details.open;
  let resize: Animation | undefined;
  let reveal: Animation | undefined;
  let printState: boolean | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const originalInert = body.inert;

  const cancel = () => {
    clearTimeout(deadline);
    deadline = undefined;
    const previous = resize;
    resize = undefined;
    previous?.cancel();
    reveal?.cancel();
    reveal = undefined;
  };
  const settle = () => {
    cancel();
    details.open = expanded;
    details.classList.remove('is-closing');
    details.style.removeProperty('height');
    details.style.removeProperty('overflow');
    body.inert = originalInert;
  };
  const focusSummary = () => {
    if (body.contains(details.ownerDocument.activeElement)) summary.focus({ preventScroll: true });
  };
  const toggle = (event: MouseEvent) => {
    // Keyboard, find-in-page and scripted native toggles stay immediate.
    if (event.defaultPrevented || event.detail === 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
      // Native toggle events are queued; rapid keyboard input can arrive first.
      if (!resize) expanded = details.open;
      settle();
      return;
    }
    event.preventDefault();
    const start = details.getBoundingClientRect().height;
    expanded = !expanded;
    if (!expanded) focusSummary();
    cancel();
    details.classList.toggle('is-closing', !expanded);
    const style = view.getComputedStyle(details);
    const durationValue = style.getPropertyValue('--duration-performance-micro').trim();
    const duration = parseFloat(durationValue) * (durationValue.endsWith('ms') ? 1 : 1000);
    if (preference.matches || !Number.isFinite(duration) || duration <= 0) {
      settle();
      return;
    }

    details.style.removeProperty('height');
    details.open = true;
    lastHeight = body.getBoundingClientRect().height;
    const border = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
    const end = expanded ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height + border;
    // Large libraries open directly instead of pulling a screenful through a tween.
    if (Math.abs(end - start) > view.innerHeight * .75) {
      settle();
      return;
    }
    body.inert = !expanded || originalInert;
    details.style.height = `${end}px`;
    details.style.overflow = 'clip';
    const easing = style.getPropertyValue('--ease-performance-standard').trim() || 'ease';
    try {
      const current = details.animate([{ height: `${start}px` }, { height: `${end}px` }], { duration, easing });
      resize = current;
      deadline = setTimeout(() => { if (resize === current) settle(); }, duration + 100);
      reveal = body.animate(expanded ? [{ opacity: .5 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], { duration, easing });
      void current.finished.then(() => { if (resize === current) settle(); }).catch(() => {});
    } catch {
      settle();
    }
  };
  const nativeToggle = (event: Event) => {
    if (event.target !== details) return;
    if (!resize) expanded = details.open;
    else if (!details.open) { expanded = false; settle(); }
  };
  const revealNative = () => { expanded = true; settle(); };
  const focusContent = (event: FocusEvent) => { if (event.target instanceof view.HTMLElement && body.contains(event.target)) revealNative(); };
  const hashChange = () => {
    let id: string;
    try { id = decodeURIComponent(view.location.hash.slice(1)); } catch { return; }
    const target = details.ownerDocument.getElementById(id);
    if (target && body.contains(target)) revealNative();
  };
  const changePreference = () => { if (preference.matches) settle(); };
  const beforePrint = () => { printState = expanded; revealNative(); };
  const afterPrint = () => { if (printState !== undefined) { expanded = printState; printState = undefined; settle(); } };
  let lastHeight = body.getBoundingClientRect().height;
  const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(() => {
    const height = body.getBoundingClientRect().height;
    if (resize && Math.abs(height - lastHeight) > .5) settle();
    lastHeight = height;
  }) : undefined;
  observer?.observe(body);
  summary.addEventListener('click', toggle);
  details.addEventListener('toggle', nativeToggle);
  details.addEventListener('beforematch', revealNative);
  details.addEventListener('focusin', focusContent);
  preference.addEventListener('change', changePreference);
  view.addEventListener('resize', settle);
  view.addEventListener('hashchange', hashChange);
  view.addEventListener('beforeprint', beforePrint);
  view.addEventListener('afterprint', afterPrint);
  return () => {
    summary.removeEventListener('click', toggle);
    details.removeEventListener('toggle', nativeToggle);
    details.removeEventListener('beforematch', revealNative);
    details.removeEventListener('focusin', focusContent);
    preference.removeEventListener('change', changePreference);
    view.removeEventListener('resize', settle);
    view.removeEventListener('hashchange', hashChange);
    view.removeEventListener('beforeprint', beforePrint);
    view.removeEventListener('afterprint', afterPrint);
    observer?.disconnect();
    settle();
  };
}

/** Compatibility for the original evidence panel. */
export const enhanceEvidenceDisclosure = enhanceNativeDisclosure;

/** Svelte action; ownership is explicit on each selected disclosure. */
export function nativeDisclosure(details: HTMLDetailsElement): { destroy: () => void } {
  return { destroy: enhanceNativeDisclosure(details) };
}
