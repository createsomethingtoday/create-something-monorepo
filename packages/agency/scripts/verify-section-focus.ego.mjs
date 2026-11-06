// Run: ego-browser nodejs < packages/agency/scripts/verify-section-focus.ego.mjs
// Requires the Agency dev server at :4186.
const assert = (await import('node:assert/strict')).default;
const task = await taskSpace('Agency section focus correction');
const page = await task.newPage();
try {
  await page.goto('http://127.0.0.1:4186/#together');
  await page.waitForFunction(() => ['together', 'handoff-title'].includes(document.activeElement?.id));
  assert.equal(await page.evaluate(() => document.activeElement.id), 'handoff-title', 'direct section links focus the heading, not the section frame');
  await page.focus('[data-waypoint="1"]');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'handoff-test');
  // A waypoint changes focus without changing the hash; use another hash first.
  await page.evaluate(() => { location.hash = 'handoff-build'; });
  await page.waitForFunction(() => document.activeElement?.id === 'handoff-build');
  await page.evaluate(() => { location.hash = 'together'; });
  await page.waitForFunction(() => document.activeElement?.id === 'handoff-title');
  assert.equal(await page.evaluate(() => document.querySelector('#together').matches(':focus')), false);
  await page.focus('[data-waypoint="0"]');
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), 'none', 'waypoint keyboard focus remains visible');
  await page.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await page.reload();
  await page.waitForFunction(() => document.activeElement?.id === 'handoff-title');
  console.log('PASS: direct link, same-document hash, waypoint keyboard focus, reduced motion');
} finally {
  await page.close();
}
