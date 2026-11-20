import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4196';
const evidence = process.env.AGENCY_EVIDENCE_DIR ?? '/tmp/cre-2362-motion';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const errors = [];
const artwork = '[data-tour-scene] .handoff-art > img';
// Ignore pre-existing inherited CSS visibility transitions (0.01ms under reduced motion).
// Artwork opacity/translation and rail transforms are the effects under review.
const setup = async (page) => {
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/#handoff-build`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-waypoint-ready="true"]');
  await page.waitForSelector('[data-handoff-rail]');
  // Hidden scenes may still be lazy. Start real requests before decoding.
  await page.locator(artwork).evaluateAll((nodes) =>
    nodes.forEach((node) => {
      node.loading = 'eager';
    })
  );
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('[data-tour-scene] .handoff-art > img')).every(
      (node) => node.complete && node.naturalWidth
    )
  );
  await page
    .locator(artwork)
    .evaluateAll((nodes) => Promise.all(nodes.map((node) => node.decode())));
};
const state = async (page, index) => {
  assert.equal(
    await page.locator(`[data-waypoint="${index}"]`).getAttribute('aria-current'),
    'step'
  );
  assert.equal(
    await page
      .locator(`[data-tour-scene="${index}"]`)
      .evaluate((node) => node.classList.contains('is-active')),
    true
  );
  assert.equal(await page.locator('[data-waypoint][aria-current="step"]').count(), 1);
};
const clean = async (page) => {
  await page.waitForTimeout(360);
  assert.equal(
    await page
      .locator(`${artwork}, [data-handoff-rail]`)
      .evaluateAll(
        (nodes) =>
          nodes.flatMap((node) =>
            node
              .getAnimations()
              .filter((animation) =>
                animation.effect
                  ?.getKeyframes()
                  .some(
                    (frame) => 'opacity' in frame || 'translate' in frame || 'transform' in frame
                  )
              )
          ).length
      ),
    0
  );
  assert.equal(
    await page
      .locator(artwork)
      .evaluateAll((nodes) =>
        nodes.some((node) => node.style.opacity || node.style.translate || node.style.clipPath)
      ),
    false
  );
  const delta = await page.evaluate(() => {
    const a = document
      .querySelector('[data-waypoint][aria-current="step"]')
      .getBoundingClientRect();
    const b = document.querySelector('[data-handoff-rail]').getBoundingClientRect();
    return Math.max(Math.abs(a.left - b.left), Math.abs(a.width - b.width));
  });
  assert.ok(delta < 1, `Rail settles on selected link at ${page.viewportSize().width}px: ${delta}`);
};
try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const context = await browser.newContext({ reducedMotion });
    for (const width of [320, 390, 768, 1024, 1025, 1440]) {
      const page = await context.newPage();
      await page.setViewportSize({ width, height: 900 });
      await setup(page);
      await page.locator('[data-waypoint="1"]').click();
      await state(page, 1);
      const running = await page
        .locator('[data-tour-scene="1"] .handoff-art > img')
        .evaluate((node) =>
          node
            .getAnimations()
            .filter((animation) =>
              animation.effect
                ?.getKeyframes()
                .some((frame) => 'opacity' in frame || 'translate' in frame || 'transform' in frame)
            )
            .some((animation) => animation.playState === 'running')
        );
      assert.equal(
        running,
        reducedMotion === 'no-preference' && width > 900,
        'Only normal-motion desktop artwork transitions'
      );
      if (running) {
        const samples = await page
          .locator('[data-tour-scene="1"] .handoff-art > img')
          .evaluate(async (node) => {
            const values = [];
            for (let i = 0; i < 16; i++) {
              values.push({
                opacity: +getComputedStyle(node).opacity,
                translate: getComputedStyle(node).translate
              });
              await new Promise(requestAnimationFrame);
            }
            return values;
          });
        assert.ok(
          samples.some((sample) => sample.opacity > 0.65 && sample.opacity < 1),
          'Actual intermediate opacity observed'
        );
        results.push({ width, reducedMotion, samples });
      } else results.push({ width, reducedMotion, static: true });
      await clean(page);
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `No overflow at ${width}`
      );
      await page.locator('[data-waypoint="2"]').focus();
      await page.keyboard.press('Enter');
      await state(page, 2);
      assert.equal(
        await page.evaluate(() => document.activeElement.id),
        'handoff-validate',
        'Keyboard focus reaches the selected explanation immediately'
      );
      await clean(page);
      if (width === 390 || width === 1440)
        await page.screenshot({ path: `${evidence}/tour-${width}-${reducedMotion}.png` });
      await page.close();
    }
    await context.close();
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await setup(page);
  // A rapid pointer reversal interrupts the old artwork and marker together.
  await page.evaluate(() => {
    for (const index of [2, 0, 1, 2, 1])
      document.querySelector(`[data-waypoint="${index}"]`).click();
  });
  await state(page, 1);
  const intermediate = await page.locator(artwork).evaluateAll((nodes) =>
    nodes.map((node) => ({
      opacity: +getComputedStyle(node).opacity,
      running: node
        .getAnimations()
        .filter((animation) =>
          animation.effect
            ?.getKeyframes()
            .some((frame) => 'opacity' in frame || 'translate' in frame || 'transform' in frame)
        ).length
    }))
  );
  assert.equal(
    intermediate.filter((value) => value.running).length,
    1,
    'Only incoming artwork remains animated after reversal'
  );
  await page.screenshot({ path: `${evidence}/reversal-intermediate.png` });
  await clean(page);
  const repeat = await page.evaluate(() => {
    document.querySelector('[data-waypoint="1"]').click();
    return document
      .querySelector('[data-tour-scene="1"] .handoff-art > img')
      .getAnimations()
      .filter((animation) =>
        animation.effect
          ?.getKeyframes()
          .some((frame) => 'opacity' in frame || 'translate' in frame || 'transform' in frame)
      ).length;
  });
  assert.equal(repeat, 0, 'Repeated selection does not restart');
  await page.evaluate(() => {
    document.querySelector('[data-waypoint="2"]').click();
    document.querySelector('.story-tools button').click();
  });
  assert.equal(
    await page
      .locator(artwork)
      .evaluateAll(
        (nodes) =>
          nodes.flatMap((node) =>
            node
              .getAnimations()
              .filter((animation) =>
                animation.effect
                  ?.getKeyframes()
                  .some(
                    (frame) => 'opacity' in frame || 'translate' in frame || 'transform' in frame
                  )
              )
          ).length
      ),
    0,
    'Motion off settles in flight'
  );
  await clean(page);
  await page.evaluate(() => document.querySelector('.story-tools button').click());
  await page.locator('[data-waypoint="0"]').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await clean(page);
  await page.locator('[data-waypoint="1"]').click();
  assert.equal(
    await page
      .locator(artwork)
      .evaluateAll(
        (nodes) =>
          nodes.flatMap((node) =>
            node
              .getAnimations()
              .filter((animation) =>
                animation.effect
                  ?.getKeyframes()
                  .some(
                    (frame) => 'opacity' in frame || 'translate' in frame || 'transform' in frame
                  )
              )
          ).length
      ),
    0,
    'OS reduction wins over explicit enable'
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => {
    document.querySelector('[data-waypoint="2"]').click();
    window.dispatchEvent(new Event('beforeprint'));
  });
  await clean(page);
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await page.locator('[data-waypoint="0"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await clean(page);
  assert.equal(
    await page.locator('[data-tour-scene]:visible').count(),
    3,
    'Resize restores all stacked artifacts'
  );
  await page.close();

  const staticPage = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 }
  });
  await staticPage.goto(`${base}/#together`, { waitUntil: 'networkidle' });
  assert.equal(await staticPage.locator('[data-handoff-rail]').count(), 0);
  assert.equal(await staticPage.locator('[data-tour-scene]:visible').count(), 3);
  await staticPage.locator('[data-waypoint="1"]').click();
  assert.equal(new URL(staticPage.url()).hash, '#handoff-test');
  await staticPage.locator('#handoff-test-detail > summary').click();
  assert.equal(
    await staticPage.locator('#handoff-test-detail').evaluate((node) => node.open),
    true
  );
  await staticPage.close();
  assert.deepEqual(errors, []);
  await writeFile(
    `${evidence}/results.json`,
    JSON.stringify(
      {
        base,
        passed: true,
        results,
        reversal: intermediate,
        errors,
        keyboard: true,
        noJavaScript: true,
        interruptions: true
      },
      null,
      2
    )
  );
  console.log(JSON.stringify({ passed: true, cases: results.length, evidence }));
} finally {
  await browser.close();
}
