import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4188';
const out = process.env.EVIDENCE_DIR || '/tmp/w4fjph-progress-copy';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const results = [];
try {
  for (const route of (process.env.ROUTES?.split(',') || ['/', '/services'])) for (const width of (process.env.WIDTHS?.split(',').map(Number) || [1440, 1024, 768, 390, 320])) for (const reducedMotion of ['reduce', 'no-preference']) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(new URL(route, baseURL).href); await page.waitForLoadState('networkidle'); await page.evaluate(() => document.fonts.ready);
    const region = route === '/' ? '.bw-story,.cc-team,.cc-plans' : '#support-scope,.membership';
    const copy = (await page.locator(region).allTextContents()).join(' ');
    assert.match(copy, /work between check-ins/); assert.match(copy, /onboarding, pairing or troubleshooting/);
    assert.match(copy, /\$900/); assert.match(copy, /\$2,500/);
    assert.match(copy, /Monday and Wednesday/); assert.match(copy, /Tuesday and Thursday/);
    assert.match(copy, /production incident response/); assert.match(copy, /separate/);
    const check = () => page.evaluate(region => {
      const roots = [...document.querySelectorAll(region)];
      const nodes = roots.flatMap(root => [...root.querySelectorAll('p,h2,h3,h4,summary,dt,dd,li')]).filter(e => e.checkVisibility() && !e.closest('[aria-hidden="true"]') && (!e.closest('details:not([open])') || e.tagName === 'SUMMARY'));
      const collisions = [];
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].contains(nodes[j]) || nodes[j].contains(nodes[i])) continue;
        const a = nodes[i].getBoundingClientRect(), b = nodes[j].getBoundingClientRect();
        if (a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1) collisions.push([nodes[i].textContent.slice(0, 40), nodes[j].textContent.slice(0, 40)]);
      }
      return { overflow: document.documentElement.scrollWidth > innerWidth + 1, collisions };
    }, region);
    const verify = async label => { const r = await check(); if(r.overflow) console.log(JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,70),width:e.clientWidth,scrollWidth:e.scrollWidth})).slice(0,14)))); assert.equal(r.overflow, false, `${route} ${width} ${label}`); assert.deepEqual(r.collisions, [], `${route} ${width} ${label}`); };
    await verify('normal');
    const summaries = page.locator(region).locator('summary');
    for (const summary of await summaries.all()) { const wasOpen = await summary.evaluate(e => e.parentElement.open); await summary.focus(); await page.keyboard.press('Enter'); assert.equal(await summary.evaluate(e => e.parentElement.open), !wasOpen); if (wasOpen) await page.keyboard.press('Enter'); }
    if (route === '/services') {
      const candidate = page.locator('.membership button[aria-expanded="false"]').first();
      const toggle = await candidate.count() ? await candidate.elementHandle() : null;
      if (toggle) { await toggle.focus(); await page.keyboard.press('Enter'); assert.equal(await toggle.getAttribute('aria-expanded'), 'true'); }
    }
    await verify('expanded');
    if ([1440, 390].includes(width) && reducedMotion === 'reduce') {
      await page.locator(route === '/' ? '.bw-story' : '.membership').screenshot({ path: `${out}/${route === '/' ? 'story' : 'membership'}-${width}.png` });
      if (route === '/') await page.locator('.complete-conversion').screenshot({ path: `${out}/plans-${width}.png` });
    }
    await page.locator(region).evaluateAll(roots => {
      const nodes = roots.flatMap(root => [...root.querySelectorAll('p,li,summary,h2,h3,h4,dt,dd,button')]);
      const sizes = nodes.map(e => parseFloat(getComputedStyle(e).fontSize));
      nodes.forEach((e, i) => { e.style.fontSize = `${sizes[i] * 2}px`; e.style.lineHeight = '1.5'; });
    });
    await verify('doubled text'); assert.deepEqual(errors, []);
    results.push({ route, width, reducedMotion, normalAndExpanded: true, doubledText: true, keyboard: true, overflow: false, collisions: 0, pageErrors: 0 });
    await page.close();
  }
  await writeFile(`${out}/results.json`, JSON.stringify({ passed: true, states: results }, null, 2));
  console.log(JSON.stringify({ passed: true, routeViewportMotionPairs: results.length }));
} finally { await browser.close(); }
