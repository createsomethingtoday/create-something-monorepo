// Run through ego-browser nodejs in the parent's existing taskspace. Prepend:
// globalThis.MEASURED_FOUNDATION = { taskSpaceId: 9, pageId: 'p1',
//   baseURL: 'http://127.0.0.1:4192/', output: '/tmp/agency-measured-foundation' };
// Ego does not inherit shell environment. Never create or finish a space here.
const assert = (await import('node:assert/strict')).default;
const fs = await import('node:fs/promises');
const config = globalThis.MEASURED_FOUNDATION ?? {};
assert.ok(Number.isInteger(config.taskSpaceId) && config.taskSpaceId > 0, 'Provide the existing taskSpaceId');
const task = await taskSpace(config.taskSpaceId);
const page = task.page(config.pageId ?? 'p1');
const base = new URL(config.baseURL ?? 'http://127.0.0.1:4192/').href;
const output = config.output ?? '/tmp/agency-measured-foundation';
await fs.mkdir(output, { recursive: true });
const ready = async () => {
  await page.waitForSelector('[data-dial-ready="true"]');
  await page.waitForFunction(() => !document.querySelector('[data-agency-wordmark]'));
};
const reports = [];
for (const width of [320, 390, 768, 1024, 1025, 1440, 1920, 2560]) {
  await page.cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.goto(base + '?measured-check=' + width);
  await ready();
  const report = await page.evaluate(() => ({
    width: innerWidth,
    overflow: document.documentElement.scrollWidth > innerWidth,
    links: [...document.querySelectorAll('.chapter-dial a')].map(link => ({
      target: !!document.getElementById(link.hash.slice(1)),
      height: link.getBoundingClientRect().height
    })),
    background: getComputedStyle(document.querySelector('.agency-home')).backgroundColor,
    heading: getComputedStyle(document.querySelector('h1')).color,
    heroWidth: document.querySelector('.hero').getBoundingClientRect().width,
    heroCopyWidth: document.querySelector('.hero-copy').getBoundingClientRect().width,
    nav: getComputedStyle(document.querySelector('.nav-fixed')).backgroundColor,
    heroBackdropHidden: [...document.querySelectorAll('.hero-workshop')].every(image => getComputedStyle(image).display === 'none'),
    workshopImage: document.querySelector('[data-workshop-plate] img')?.getAttribute('src'),
    annotations: [...document.querySelectorAll('.plate-annotation')].map(link => ({
      label: link.getAttribute('aria-label'), height: link.getBoundingClientRect().height,
      visible: getComputedStyle(link).display !== 'none'
    }))
  }));
  assert.equal(report.width, width);
  assert.equal(report.overflow, false, `overflow at ${width}`);
  assert.equal(report.background, 'rgb(0, 0, 0)');
  assert.equal(report.heading, 'rgb(255, 255, 255)');
  assert.equal(report.nav, 'rgb(0, 0, 0)');
  assert.ok(Math.abs(report.heroWidth - report.heroCopyWidth) < 1, `legacy hero width constraint at ${width}`);
  assert.equal(report.heroBackdropHidden, true, `duplicate hero backdrop at ${width}`);
  assert.equal(report.workshopImage, '/images/agency-sales/hero.webp');
  assert.equal(report.links.length, 5);
  assert.ok(report.links.every(link => link.target && link.height >= 44));
  assert.ok(report.annotations.every(link => link.label && link.visible && link.height >= 44));
  await page.screenshot({ path: `${output}/${width}.png` });
  reports.push(report);
}
console.log('PASS: eight widths, monochrome palette, named targets and no overflow.');

// Public regression: pointer exit must preserve an existing keyboard preview.
await page.focus('.chapter-dial a[href="#work"]');
await page.hover('.chapter-dial a[href="#work"]', { label: 'Preview evidence chapter' });
await page.hover('.hero-copy h1', { label: 'Leave pointer with focus retained' });
assert.equal(await page.evaluate(() => document.querySelector('.chapter-dial').style.getPropertyValue('--dial-position')), '50%');
await page.focus('.hero-links .button');
assert.equal(await page.evaluate(() => document.querySelector('.chapter-dial').style.getPropertyValue('--dial-position')), '10%');
await page.hover('.chapter-dial a[href="#together"]', { label: 'Preview the team handoff' });
assert.equal(await page.evaluate(() => document.querySelector('.chapter-dial').style.getPropertyValue('--dial-position')), '70%');
await page.hover('.hero-copy h1', { label: 'Restore current chapter marker' });
assert.equal(await page.evaluate(() => document.querySelector('.chapter-dial').style.getPropertyValue('--dial-position')), '10%');

for (const id of ['opening', 'example', 'work', 'together', 'next']) {
  await page.focus(`.chapter-dial a[href="#${id}"]`);
  await page.keyboard.press('Enter');
  await page.waitForFunction((id) => location.hash === '#' + id && document.activeElement?.id === (id === 'together' ? 'handoff-title' : id) && document.querySelector('.chapter-dial a[aria-current]')?.getAttribute('href') === '#' + id, id);
  await page.waitForFunction((id) => document.getElementById(id).getBoundingClientRect().top < innerHeight / 2, id);
}
await page.goto(base + '?measured-check=direct#together');
await ready();
await page.waitForFunction(() => document.activeElement?.id === 'handoff-title');
await page.screenshot({ path: `${output}/handoff.png` });
console.log('PASS: hover/focus return, all five keyboard destinations, direct hash and current chapter.');

await page.focus('[data-home-open="work-dialog"]');
await page.keyboard.press('Enter');
await page.waitForSelector('#work-dialog[open]');
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.querySelector('#work-dialog').open);
await page.waitForFunction(() => document.querySelector('#work-dialog video').paused && document.activeElement?.matches('[data-home-open="work-dialog"]'));

await page.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
await page.goto(base + '?measured-check=mobile-menu');
await ready();
await page.click('button[aria-label="Open menu"]', { label: 'Open existing mobile navigation' });
await page.keyboard.press('Escape');
await page.waitForSelector('button[aria-label="Open menu"]');
await page.screenshot({ path: `${output}/390-settled.png` });

await page.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await page.evaluate(() => sessionStorage.removeItem('agency-reduced-motion'));
await page.goto(base + '?measured-check=reduced');
await ready();
assert.equal(await page.evaluate(() => document.querySelector('.chapter-dial').dataset.reduced), 'true');
assert.ok(await page.evaluate(() => getComputedStyle(document.querySelector('.dial-needle')).transitionDuration.split(',').every(duration => parseFloat(duration) <= .001)));
await page.click('.chapter-dial a[href="#together"]', { label: 'Use reduced motion chapter link' });
await page.waitForFunction(() => document.activeElement?.id === 'handoff-title');

await page.cdp('Emulation.setScriptExecutionDisabled', { value: true });
try {
  await page.goto(base + '?measured-check=nojs');
  assert.equal(await page.evaluate(() => document.querySelectorAll('.chapter-dial a').length), 5);
  assert.ok(await page.evaluate(() => document.querySelector('h1').textContent.includes('Your tools should')));
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('.handoff-scene')].every(scene => getComputedStyle(scene).display !== 'none')));
  const { root } = await page.cdp('DOM.getDocument');
  const { nodeId } = await page.cdp('DOM.querySelector', { nodeId: root.nodeId, selector: '.chapter-dial a[href="#together"]' });
  await page.cdp('DOM.focus', { nodeId });
  await page.keyboard.press('Enter');
  assert.equal(new URL(await page.url()).hash, '#together');
  await page.screenshot({ path: `${output}/nojs-handoff.png` });
} finally {
  await page.cdp('Emulation.setScriptExecutionDisabled', { value: false });
  await page.cdp('Emulation.setEmulatedMedia', { features: [] });
}
await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await page.goto(base + '?measured-check=final');
await ready();
await page.screenshot({ path: `${output}/1440-final.png` });
await fs.writeFile(`${output}/browser-report.json`, JSON.stringify({ reports, checks: ['hover', 'keyboard-preview-pointer-exit', 'preview-return', 'hash-focus', 'scroll-current', 'walkthrough-close-pause-focus', 'mobile-menu', 'reduced-motion', 'no-js'] }, null, 2) + '\n');
console.log(`PASS: ${reports.length} viewports; hover, keyboard/focus, current chapter, walkthrough, mobile menu, reduced motion, no-JS.`);
