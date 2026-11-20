// Run with ego-browser nodejs < packages/agency/scripts/verify-workshop-tour.ego.mjs
// Requires the Agency dev server at :4186. Reuses the task's browser space.
const assert = (await import('node:assert/strict')).default;
const task = await taskSpace('Agency Canon hotspot replacement');
const page = await task.newPage();
const results = [];
try {
  await page.goto('http://127.0.0.1:4186/#together');
  await page.waitForSelector('.tour-enhanced');
  await page.waitForFunction(() => document.querySelector('.waypoint-guide').dataset.waypointReady === 'true');
  await page.cdp('Page.bringToFront');
  for (const width of [320, 390, 768, 1024, 1025, 1440]) {
    await page.cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    await page.evaluate(() => document.querySelector('[data-tour-step="0"]').scrollIntoView({ behavior: 'instant', block: 'center' }));
    await page.waitForFunction(() => document.querySelector('.handoff-scene.is-active').dataset.tourScene === '0');
    // Regression: CSS translate must not leak into the initial MotionPath transform.
    await page.waitForFunction(() => {
      const guide = document.querySelector('.waypoint-guide').getBoundingClientRect();
      const track = document.querySelector('.waypoint-track').getBoundingClientRect();
      return Math.abs(guide.x + guide.width / 2 - (track.x + track.width * .1)) < 2
        && Math.abs(guide.bottom - (track.top + track.height * .78)) < 2;
    });
    const geometry = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert.ok(geometry.scrollWidth <= geometry.width, JSON.stringify(geometry));
    results.push({ width, initialWaypoint: 'passed', overflow: 'passed' });
  }
  for (const index of [2, 1, 0]) {
    await page.click(`[data-waypoint="${index}"]`);
    await page.waitForFunction(index => document.querySelector('.handoff-scene.is-active').dataset.tourScene === String(index), index);
    await page.waitForFunction(index => {
      const guide = document.querySelector('.waypoint-guide').getBoundingClientRect();
      const track = document.querySelector('.waypoint-track').getBoundingClientRect();
      return Math.abs(guide.x + guide.width / 2 - (track.x + track.width * [.1, .5, .9][index])) < 3;
    }, index);
    await page.waitForFunction(index => {
      const guide = document.querySelector('.waypoint-guide');
      const poses = [...guide.querySelectorAll('[data-guide-pose]')];
      return guide.dataset.guidePose === String(index) && poses.every((pose, i) => Math.abs(Number(getComputedStyle(pose).opacity) - (i === index ? 1 : 0)) < .01);
    }, index);
    results.push({ waypoint: index, settled: 'passed', pose: 'passed' });
  }
  const travel = await page.evaluate(async () => {
    const guide = document.querySelector('.waypoint-guide');
    const samples = [];
    let reversed = false;
    document.querySelector('[data-waypoint="2"]').click();
    const start = performance.now();
    await new Promise(resolve => {
      const timer = setInterval(() => {
        const x = parseFloat(guide.style.left);
        samples.push({ x, pose: guide.dataset.guidePose, opacity: [...guide.querySelectorAll('img')].map(image => Number(getComputedStyle(image).opacity)) });
        if (x > 55 && !reversed) { reversed = true; document.querySelector('[data-waypoint="0"]').click(); }
        if ((reversed && x === 10 && performance.now() - start > 1500) || performance.now() - start > 8000) { clearInterval(timer); resolve(); }
      }, 40);
    });
    return { reversed, samples };
  });
  assert.ok(travel.reversed && travel.samples.some(sample => sample.pose === '1'), JSON.stringify(travel));
  assert.ok(travel.samples.some(sample => sample.opacity.some(value => value > .01 && value < .99)), 'crossfade must be sampled during travel');
  assert.ok(travel.samples.every(sample => Math.abs(sample.opacity.reduce((sum, value) => sum + value, 0) - 1) < .02), 'no blank pose frame');
  assert.equal(travel.samples.at(-1).pose, '0');
  results.push({ intermediatePoseAndReversal: 'passed', noBlankFrame: 'passed' });
  await page.focus('.handoff-scene.is-active summary');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.closest('details').open), true);
  await page.evaluate(() => document.querySelector('[data-tour-step="2"]').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await page.waitForFunction(() => document.querySelector('.handoff-scene.is-active').dataset.tourScene === '2');
  assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('#handoff-validate h3')), true);
  assert.equal(await page.evaluate(() => getComputedStyle(document.activeElement).visibility), 'visible');
  results.push({ keyboardDisclosure: 'passed', focusRetention: 'passed' });
  await page.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await page.evaluate(() => sessionStorage.removeItem('agency-reduced-motion'));
  await page.reload();
  await page.waitForSelector('.tour-enhanced');
  await page.waitForFunction(() => document.querySelector('.waypoint-guide').dataset.waypointReady === 'true');
  await page.waitForFunction(() => document.querySelector('.story-tools button').textContent === 'Enable motion');
  for (const width of [390, 1024, 320]) {
    await page.cdp('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width < 600 });
    for (const index of [2, 1, 0]) {
      await page.focus(`[data-waypoint="${index}"]`);
      await page.keyboard.press('Enter');
      const state = await page.evaluate(() => {
        const guide = document.querySelector('.waypoint-guide').getBoundingClientRect();
        const track = document.querySelector('.waypoint-track').getBoundingClientRect();
        const image = document.querySelector('.waypoint-guide');
        return { stage: Number(document.querySelector('.handoff-scene.is-active').dataset.tourScene), ratio: (guide.x + guide.width / 2 - track.x) / track.width, style: image.getAttribute('style'), computed: { left: getComputedStyle(image).left, transform: getComputedStyle(image).transform, transition: getComputedStyle(image).transition }, guide: guide.toJSON(), track: track.toJSON(), pose: image.dataset.guidePose, opacities: [...image.querySelectorAll('[data-guide-pose]')].map(pose => Number(getComputedStyle(pose).opacity)), motion: document.querySelector('.story-tools button').textContent };
      });
      assert.equal(state.stage, index);
      assert.equal(state.pose, String(index));
      assert.deepEqual(state.opacities, [0, 1, 2].map(pose => pose === index ? 1 : 0));
      assert.ok(Math.abs(state.ratio - [.1, .5, .9][index]) < .01, JSON.stringify({ width, index, ...state }));
    }
    results.push({ width, reducedMotionKeyboardResize: 'passed' });
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await page.close();
}
