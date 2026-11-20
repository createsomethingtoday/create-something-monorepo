// Run in the T3 preview at :4188 with a desktop viewport: read this file,
// remove the export keyword, and evaluate the source followed by checkNavigationScroll().
// Assertions exercise the real rendered header, not source strings or z-index guesses.
const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
/** @param {string} selector */
function required(selector) {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing element: ${selector}`);
  return element;
}
/** @param {unknown} condition @param {string} message */
function assert(condition, message) { if (!condition) throw new Error(message); }

export async function checkNavigationScroll() {
  const trigger = required('.nav-dropdown__trigger');
  assert(trigger.getBoundingClientRect().width > 0, 'Use a desktop navigation viewport');
  const nav = required('.nav-fixed');
  const progress = required('.page-progress');
  scrollTo({ top: required('#next').getBoundingClientRect().top + scrollY - 100, behavior: 'instant' });
  if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click();
  await frame();
  const menu = required('.nav-dropdown__menu');
  const before = menu.getBoundingClientRect();
  const bar = progress.getBoundingClientRect();
  const x = Math.min(before.right - 8, bar.right - 1);
  const previous = progress.style.pointerEvents;
  let paintedAbove;
  try {
    // Include the otherwise decorative bar in the browser's paint-order probe.
    progress.style.pointerEvents = 'auto';
    const top = document.elementsFromPoint(x, bar.top + 1)[0];
    paintedAbove = menu.contains(top);
  } finally { progress.style.pointerEvents = previous; }
  assert(paintedAbove, 'The dropdown must paint above the scroll-progress line');
  assert(Math.abs(bar.top - nav.getBoundingClientRect().bottom) < 1, 'Progress tracks the actual header bottom');
  scrollBy({ top: 180, behavior: 'instant' });
  await frame();
  const after = menu.getBoundingClientRect();
  assert(Math.abs(before.top - after.top) < 1 && Math.abs(before.left - after.left) < 1, 'Dropdown stays anchored while the document scrolls');
  assert(after.bottom <= innerHeight, 'Dropdown stays within the viewport');
  const first = required('.nav-dropdown__menu a');
  first.focus();
  first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await frame();
  assert(trigger.getAttribute('aria-expanded') === 'false' && document.activeElement === trigger, 'Escape closes and restores focus to Explore');
  trigger.click();
  await frame();
  required('#next-title').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  await frame();
  assert(trigger.getAttribute('aria-expanded') === 'false', 'A pointer outside the dropdown dismisses it');
  trigger.click();
  await frame();
  required('.nav-dropdown__menu a').focus();
  required('.hero-links a').focus({ preventScroll: true });
  await frame();
  assert(trigger.getAttribute('aria-expanded') === 'false', 'Moving focus outside dismisses the dropdown');
  return { layering: 'passed', headerAlignment: 'passed', scrollAnchor: 'passed', viewport: 'passed', escapeFocus: 'passed', outsidePointer: 'passed', focusExit: 'passed', width: innerWidth, height: innerHeight };
}
