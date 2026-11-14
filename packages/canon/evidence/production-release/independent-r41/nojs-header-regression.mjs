// Run inside `ego-browser nodejs` after choosing your TaskSpace/Page:
// const { checkNoJsHeaders } = await import('file:///absolute/path/nojs-header-regression.mjs');
// await checkNoJsHeaders(page, '/absolute/evidence/output');
// The caller owns TaskSpace finish. All navigation is local and read-only.
import { mkdir, writeFile } from 'node:fs/promises';

export async function checkNoJsHeaders(page, out) {
  await mkdir(out, { recursive: true });
  await page.cdp('Emulation.setScriptExecutionDisabled', { value: true });
  const cases = [];
  for (const site of [
    { name: 'agency', port: 5192, required: ['Services & tools', 'Book a mapping session'] },
    { name: 'io', port: 5193, required: ['Contact', 'Sign in'] },
    { name: 'ltd', port: 5194, required: ['Canon', 'Sign in'] },
    { name: 'space', port: 5195, required: ['GitHub'] }
  ]) {
    for (const width of [320, 1440]) {
      await page.cdp('Emulation.setDeviceMetricsOverride', {
        width, height: 900, deviceScaleFactor: 1, mobile: false
      });
      await page.goto(`http://127.0.0.1:${site.port}/`, { timeout: 45000 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        window.scrollTo(0, 0);
      });
      const state = await page.evaluate(() => {
        const nav = document.querySelector('nav.nav-container');
        const chapter = document.querySelector('.chapter-dial, .agency-page-wayfinding');
        const h1 = document.querySelector('h1');
        return {
          url: location.href, width: innerWidth, height: innerHeight,
          dpr: devicePixelRatio, scrollY,
          docWidth: document.documentElement.scrollWidth,
          nav: { position: getComputedStyle(nav).position, rect: nav.getBoundingClientRect().toJSON() },
          chapter: chapter?.getBoundingClientRect().toJSON() ?? null,
          h1: { text: h1.innerText, rect: h1.getBoundingClientRect().toJSON() },
          links: [...document.querySelectorAll('.nav-static-links a')].map(a => ({
            text: a.textContent.trim(), href: a.getAttribute('href'),
            visible: a.getClientRects().length > 0 && getComputedStyle(a).visibility !== 'hidden',
            rect: a.getBoundingClientRect().toJSON()
          })),
          duplicateDesktopVisible: [...document.querySelectorAll('.nav-desktop')].some(e =>
            e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none')
        };
      });
      const failures = [];
      if (state.width !== width || state.dpr !== 1 || state.scrollY !== 0) failures.push('viewport mismatch');
      if (state.docWidth > width) failures.push('horizontal overflow');
      if (['fixed', 'sticky'].includes(state.nav.position)) failures.push('fallback header is out of flow');
      if (state.h1.rect.top < state.nav.rect.bottom - 0.5) failures.push('header covers h1');
      if (state.chapter && state.chapter.top < state.nav.rect.bottom - 0.5) failures.push('header covers chapter ruler');
      if (state.duplicateDesktopVisible) failures.push('duplicate JS desktop strip is visible');
      for (const name of site.required) {
        if (!state.links.some(a => a.text === name && a.visible && a.rect.width > 0 && a.rect.height >= 44)) {
          failures.push(`missing visible native destination: ${name}`);
        }
      }
      if (state.links.some(a => !a.visible || a.rect.width <= 0 || a.rect.height < 44)) failures.push('unavailable fallback link');
      await page.screenshot({ path: `${out}/nojs-${site.name}-${width}-after.png` });
      const result = { site: site.name, ...state, failures };
      cases.push(result);
      await writeFile(`${out}/nojs-header-after.json`, JSON.stringify(cases, null, 2) + '\n');
      console.log(site.name, width, state.nav.position, state.nav.rect.bottom, state.h1.rect.top, failures);
      if (failures.length) throw new Error(`${site.name} ${width}: ${failures.join('; ')}`);
    }
  }
  // Native keyboard navigation with script execution still disabled. CDP focus
  // avoids the Ego element-action helper's Runtime.callFunctionOn no-JS timeout.
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 320, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.goto('http://127.0.0.1:5192/', { timeout: 45000 });
  const document = await page.cdp('DOM.getDocument', {});
  const target = await page.cdp('DOM.querySelector', {
    nodeId: document.root.nodeId, selector: '.nav-static-links a[href="/services"]'
  });
  await page.cdp('DOM.focus', { nodeId: target.nodeId });
  await page.keyboard.press('Enter');
  await page.waitForURL('http://127.0.0.1:5192/services');
  const native = await page.evaluate(() => ({ url: location.href, h1: document.querySelector('h1')?.innerText }));
  if (!native.h1?.includes('Bring us the work')) throw new Error('Native services navigation failed');
  await writeFile(`${out}/nojs-native-after.json`, JSON.stringify(native, null, 2) + '\n');
  return cases;
}
