import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4186';
const evidence = process.env.AGENCY_EVIDENCE_DIR ?? '/tmp/agency-image-entrances';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(30000);
const errors = [];
const results = [];
page.on('pageerror', error => errors.push(error.message));
const handoff = '[data-image-entrance="handoff"]';
const hero = '[data-image-entrance="hero-study"]';
const waitSettled = selector => page.waitForFunction(selector => {
  const image = document.querySelector(selector);
  return image?.getAttribute('data-image-entrance-state') === 'settled' && image.getAnimations().length === 0;
}, selector);
const approachHandoff = async () => {
  await page.evaluate(selector => {
    const image = document.querySelector(selector);
    scrollTo({ top: scrollY + image.getBoundingClientRect().top - innerHeight - 150, behavior: 'instant' });
  }, handoff);
  await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute('data-image-entrance-state') === 'armed', handoff);
};
const enterHandoff = () => page.evaluate(selector => {
  const image = document.querySelector(selector);
  scrollTo({ top: scrollY + image.getBoundingClientRect().top - 180, behavior: 'instant' });
}, handoff);
const inspect = selector => page.evaluate(selector => {
  const image = document.querySelector(selector);
  const animation = image.getAnimations()[0];
  if (!animation) throw new Error('Expected authored image animation');
  animation.pause();
  animation.currentTime = 250;
  const style = getComputedStyle(image);
  const figure = image.closest('figure');
  const caption = figure.querySelector('figcaption');
  const copy = image.closest('.home-team')?.querySelector(':scope > div');
  return {
    frames: animation.effect.getKeyframes(), timing: animation.effect.getTiming(),
    imageTransform: style.transform, opacity: style.opacity,
    figureTransform: getComputedStyle(figure).transform,
    figureOpacity: getComputedStyle(figure).opacity,
    captionClip: getComputedStyle(caption).clipPath,
    captionAnimations: caption.getAnimations().length,
    copy: copy ? { opacity: getComputedStyle(copy).opacity, transform: getComputedStyle(copy).transform } : null
  };
}, selector);

try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-home-step="build"]:enabled').waitFor();
  assert.equal(await page.locator('.home-team figure[data-scroll-entrance]').count(), 0, 'The image entrance replaces the previous figure entrance');
  assert.equal(await page.locator('.hero img[data-image-entrance]').count(), 0, 'Homepage hero stays immediate');
  await approachHandoff();
  await enterHandoff();
  await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute('data-image-entrance-state') === 'revealing', handoff);
  const handoffMotion = await inspect(handoff);
  assert.equal(handoffMotion.frames[0].clipPath, 'inset(0px 100% 0px 0px)');
  assert.equal(handoffMotion.timing.duration, 500);
  assert.equal(handoffMotion.imageTransform, 'none');
  assert.equal(handoffMotion.figureTransform, 'none');
  assert.equal(handoffMotion.opacity, '1');
  assert.equal(handoffMotion.figureOpacity, '1');
  assert.equal(handoffMotion.captionClip, 'none');
  assert.equal(handoffMotion.captionAnimations, 0);
  assert.deepEqual(handoffMotion.copy, { opacity: '1', transform: 'none' });
  await page.screenshot({ path: `${evidence}/handoff-midpoint.png` });
  await page.locator(handoff).evaluate(image => image.getAnimations()[0]?.finish());
  await waitSettled(handoff);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await enterHandoff();
  assert.equal(await page.locator(handoff).evaluate(image => image.getAnimations().length), 0, 'A return scroll does not replay');
  results.push({ handoffMotion, onceOnly: true });

  await page.goto(`${base}/agent-foundation?study=image-reveal`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(selector => document.querySelector(selector)?.getAnimations().length > 0, hero);
  const heroMotion = await inspect(hero);
  assert.ok(['inset(0px 3%)', 'inset(0px 3% 0px 3%)'].includes(heroMotion.frames[0].clipPath));
  assert.equal(heroMotion.timing.duration, 500);
  assert.equal(heroMotion.imageTransform, 'none');
  assert.equal(heroMotion.opacity, '1');
  assert.equal(await page.locator('.performance-campaign-opening h1:visible').count(), 1);
  assert.ok(await page.locator('.performance-campaign-opening a:visible').count() > 0);
  await page.screenshot({ path: `${evidence}/hero-study-midpoint.png` });
  // Preference changes must settle an in-flight image entrance.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await waitSettled(hero);
  results.push({ heroMotion, midPlaybackReducedMotion: true });

  await page.goto(`${base}/agent-foundation`, { waitUntil: 'domcontentloaded' });
  await page.locator('.agency-preview-media').waitFor();
  assert.equal(await page.locator(hero).count(), 0, 'The baseline hero is outside the study');
  results.push('Hero study is scoped to one exact route and query value.');

  for (const width of [320, 390, 768, 1024, 1025, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-home-step="build"]:enabled').waitFor();
    await page.locator(handoff).scrollIntoViewIfNeeded();
    await page.waitForFunction(selector => document.querySelector(selector)?.naturalWidth > 0, handoff);
    assert.equal(await page.locator(handoff).evaluate(image => image.getAnimations().length), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Homepage overflow at ${width}`);
    await page.screenshot({ path: `${evidence}/handoff-${width}.png` });
    await page.goto(`${base}/agent-foundation?study=image-reveal`, { waitUntil: 'domcontentloaded' });
    await page.locator(hero).scrollIntoViewIfNeeded();
    await page.waitForFunction(selector => document.querySelector(selector)?.naturalWidth > 0, hero);
    assert.equal(await page.locator(hero).evaluate(image => image.getAnimations().length), 0);
    const foregroundClear = await page.evaluate(() => {
      const root = document.querySelector('.performance-campaign-opening');
      const scrim = getComputedStyle(root, '::before');
      if (scrim.display === 'none' || scrim.content === 'none' || scrim.opacity === '0') return true;
      const heading = root.querySelector('h1:not([hidden])');
      for (let node = heading; node && node !== root; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display !== 'contents' && style.position !== 'static' && Number(style.zIndex) > Number(scrim.zIndex)) return true;
      }
      return false;
    });
    assert.ok(foregroundClear, `Hero text must paint above the background scrim at ${width}`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Hero overflow at ${width}`);
    await page.screenshot({ path: `${evidence}/hero-${width}.png` });
  }
  results.push('Static reduced-motion crops and text reviewed at 320,390,768,1024,1025,1440.');

  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const fallback = await noJs.newPage();
  await fallback.goto(base, { waitUntil: 'domcontentloaded' });
  await fallback.locator(handoff).scrollIntoViewIfNeeded();
  await fallback.waitForFunction(selector => document.querySelector(selector)?.naturalWidth > 0, handoff);
  assert.equal(await fallback.locator(handoff).evaluate(image => getComputedStyle(image).clipPath), 'none');
  await noJs.close();
  results.push('No-JavaScript handoff remains visible and loaded.');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`${base}/#team`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator(handoff).evaluate(image => getComputedStyle(image).clipPath), 'none');
  results.push('Hash arrival preserves a complete image.');
  assert.deepEqual(errors, []);
  await writeFile(`${evidence}/results.json`, JSON.stringify({ passed: true, base, results, errors }, null, 2));
  console.log(JSON.stringify({ passed: true, evidence }));
} finally {
  await browser.close();
}
