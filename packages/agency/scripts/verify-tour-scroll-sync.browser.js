// Evaluate this expression with preview_evaluate on the Agency home page.
// Run at 320, 390, 768, 1024, 1025 and 1440px, with motion on and off.
// Throws on the original focused-hotspot/scroll mismatch; no server fixtures.
(async () => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  // Wait for native scroll/focus events to render before sampling animation.
  const settle = async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise(resolve => setTimeout(resolve, 800));
  };
  await settle();
  const steps = [...document.querySelectorAll('[data-tour-step]')];
  const scenes = [...document.querySelectorAll('[data-tour-scene]')];
  assert(steps.length === 3 && scenes.length === 3, 'Tour must be mounted');
  const samples = [];
  for (const [from, to] of [[0, 1], [1, 2], [2, 0], [0, 2], [2, 1]]) {
    document.querySelector(`[data-waypoint="${from}"]`).click();
    await settle();
    const summary = scenes[from].querySelector('summary');
    summary.focus({ preventScroll: true });
    summary.click();
    await settle();
    steps[to].scrollIntoView({ block: 'center', behavior: 'instant' });
    await settle();
    const scene = document.querySelector('.handoff-scene.is-active');
    assert(scene?.dataset.tourScene === String(to), `After hotspot ${from + 1} and scroll to ${to + 1}, image is ${scene?.dataset.tourScene}`);
    assert(steps[to].classList.contains('is-active'), 'Text step must match');
    assert(document.querySelector('[data-waypoint][aria-current="step"]')?.dataset.waypoint === String(to), 'Waypoint must match');
    assert(scene.querySelector('figcaption').textContent.includes(`0${to + 1} / 03`), 'Caption must match');
    assert(getComputedStyle(document.activeElement).visibility === 'visible', 'Focus must stay visible');
    const guide = document.querySelector('.waypoint-guide');
    if (guide?.dataset.waypointReady === 'true') assert(guide.dataset.guidePose === String(to), 'Guide pose must settle at the current step');
    samples.push({ from, to, scene: Number(scene.dataset.tourScene), focus: document.activeElement.textContent });
  }
  assert(document.documentElement.scrollWidth <= innerWidth, 'No horizontal overflow');
  return { passed: true, width: innerWidth, height: innerHeight, samples };
})()
