const fs = await import('node:fs/promises');
const root = '/Users/micahjohnson/Code/csm-worktrees/cre-2154-agency-public/docs/evidence/CRE-2154';
const task = await taskSpace(22);
const page = task.page('p1');
const routes = [
  '/arcs',
  '/arc/app-review-governance',
  '/arc/operator-inbound-triage',
  '/experiments',
  '/practice',
  '/stack'
];
const results = [];
await page.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
for (const width of [1440, 390, 320]) {
  await page.cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
  for (const route of routes) {
    await page.goto('http://127.0.0.1:5177' + route);
    await page.waitForSelector('h1');
    await page.evaluate(() => document.fonts.ready);
    await page.keyboard.press('Tab');
    const result = await page.evaluate(() => ({
      path: location.pathname,
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim(),
      palette: document.querySelector('.agency-surface')?.dataset.canonPalette,
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      focusedTag: document.activeElement?.tagName,
      focusVisible: document.activeElement?.matches(':focus-visible'),
      runningAnimations: document.getAnimations().filter(a => a.playState === 'running').length
    }));
    results.push(result);
    if (route !== '/practice' && route !== '/stack' && width !== 390) {
      await page.screenshot({ path: root + '/' + route.slice(1).replaceAll('/', '-') + '-' + width + '.png' });
    }
    console.log(width, route, result.scrollWidth > width ? 'OVERFLOW' : 'ok');
  }
}
await fs.writeFile(root + '/catalog-followup.json', JSON.stringify(results, null, 2) + '\n');
