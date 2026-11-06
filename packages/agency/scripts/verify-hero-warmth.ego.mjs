// Run: ego-browser nodejs < packages/agency/scripts/verify-hero-warmth.ego.mjs
// Resume the parent's task space; this script does not create, close, or finish it.
// Update these explicit inputs for another review session (Ego does not inherit env).
const TASK_SPACE_ID = 36;
const BASE_URL = 'http://127.0.0.1:4193';
const EVIDENCE_DIR = '/tmp/cre-2360-evidence';
const WIDTHS = [320, 390, 768, 1024, 1025, 1440];
const assert = (await import('node:assert/strict')).default;
const { mkdir, writeFile } = await import('node:fs/promises');
await mkdir(EVIDENCE_DIR, { recursive: true });
const task = await taskSpace(TASK_SPACE_ID);
const page = task.page('p1');
const results = [];
let failure;

const viewport = async (width, motion) => {
  await page.cdp('Emulation.setDeviceMetricsOverride', {
    width, height: width < 600 ? 844 : 1000, deviceScaleFactor: 1, mobile: width < 600,
  });
  await page.cdp('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: motion }],
  });
};

const homeGeometry = () => {
  const image = document.querySelector('.hero-workshop img');
  const copy = document.querySelector('.hero-copy');
  const title = document.querySelector('#hero-title');
  const rect = element => element?.getBoundingClientRect().toJSON() ?? null;
  const box = image?.getBoundingClientRect();
  const style = image ? getComputedStyle(image) : null;
  // Desktop image uses contain/right center. Only its quiet left side may sit behind copy.
  // The authored desktop image's visible subject occupies x=.40..98, y=.23..74.
  const scale = box && image?.naturalWidth
    ? (style.objectFit === 'contain' ? Math.min : Math.max)(box.width / image.naturalWidth, box.height / image.naturalHeight) : 0;
  const renderedWidth = scale * (image?.naturalWidth ?? 0);
  const renderedHeight = scale * (image?.naturalHeight ?? 0);
  const subject = box ? {
    x: box.right - renderedWidth + .40 * renderedWidth,
    y: box.top + (box.height - renderedHeight) / 2 + .23 * renderedHeight,
    right: box.right - renderedWidth + .98 * renderedWidth,
    bottom: box.top + (box.height - renderedHeight) / 2 + .74 * renderedHeight,
  } : null;
  return {
    width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    image: rect(image), copy: rect(copy), title: rect(title), subject,
    source: image?.currentSrc ?? '', loaded: !!image?.complete && image.naturalWidth > 0,
    naturalWidth: image?.naturalWidth ?? 0, naturalHeight: image?.naturalHeight ?? 0,
    objectFit: style?.objectFit, objectPosition: style?.objectPosition,
    titleVisible: !!title && getComputedStyle(title).visibility === 'visible'
      && Number(getComputedStyle(title).opacity) > 0,
    primary: document.querySelector('.hero-links .button')?.getAttribute('href'),
    secondary: document.querySelector('.hero-links .simplelink')?.getAttribute('href'),
    alt: image?.alt ?? '',
    motion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
};

const checkHome = (state, width) => {
  assert.ok(state.image && state.copy && state.title, 'Dedicated homepage image and copy exist');
  assert.ok(state.loaded, `Hero image loads: ${state.source}`);
  assert.ok(state.alt.trim(), 'Concept illustration has an accessible description');
  assert.ok(state.titleVisible && state.title.width > 0 && state.title.height > 0, 'Hero title is visible');
  assert.ok(state.scrollWidth <= state.width + 1, `No page overflow: ${JSON.stringify(state)}`);
  assert.equal(state.primary, '#next', 'Primary CTA destination is preserved');
  assert.equal(state.secondary, '#example', 'Secondary CTA destination is preserved');
  assert.ok(state.image.width > 0 && state.image.height > 0, 'Hero image reserves visible space');
  if (width <= 900) {
    assert.ok(state.image.top >= state.copy.bottom - 1, 'Mobile image follows the complete copy and CTA');
    assert.equal(state.objectFit, 'contain', 'Mobile preserves the entire shared scene');
    assert.ok(state.image.left >= -1 && state.image.right <= state.width + 1, 'Mobile image stays in frame');
    assert.ok(Math.abs(state.image.width / state.image.height
      - state.naturalWidth / state.naturalHeight) < .02, 'Mobile image box matches the full asset ratio');
  } else {
    assert.ok(state.copy.right <= state.subject.x + 4,
      `Copy stays left of characters and shared task: ${JSON.stringify(state)}`);
    assert.ok(state.subject.x >= -1 && state.subject.right <= state.width + 1,
      'Desktop subject stays within the visible horizontal frame');
    assert.ok(state.subject.y >= state.image.top - 1 && state.subject.bottom <= state.image.bottom + 1,
      'Desktop cover crop retains the subject vertically');
  }
};

try {
  for (const motion of ['no-preference', 'reduce']) {
    for (const width of WIDTHS) {
      await viewport(width, motion);
      await page.goto(`${BASE_URL}/`);
      // Fail promptly on the old CSS-only hero; do not spend 12 image waits on a missing picture.
      assert.ok(await page.evaluate(() => !!document.querySelector('.hero-workshop img')),
        'Homepage has a dedicated art-directed scene (old background-only implementation fails)');
      await page.waitForFunction(() => {
        const image = document.querySelector('.hero-workshop img');
        return image?.complete && image.naturalWidth > 0
          && document.querySelector('.handoff-tour.tour-enhanced')
          && !document.querySelector('.story-curtain');
      }, undefined, { timeout: 10000 });
      const state = await page.evaluate(homeGeometry);
      checkHome(state, width);
      assert.equal(state.motion, motion === 'reduce', 'Browser motion preference is applied');
      const screenshot = `${EVIDENCE_DIR}/home-${width}-${motion}.png`;
      await page.screenshot({ path: screenshot });
      results.push({ route: '/', width, motion, status: 'passed', screenshot, ...state });
    }
  }

  await viewport(390, 'reduce');
  await page.goto(`${BASE_URL}/`);
  await page.focus('.hero-links .button');
  await page.keyboard.press('Tab');
  const keyboard = await page.evaluate(() => {
    const active = document.activeElement;
    const style = getComputedStyle(active);
    const box = active.getBoundingClientRect();
    return {
      href: active.getAttribute('href'), focusVisible: active.matches(':focus-visible'),
      outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow, width: box.width, height: box.height,
    };
  });
  assert.equal(keyboard.href, '#example', 'Keyboard advances through both hero actions');
  assert.ok(keyboard.focusVisible, 'Keyboard focus is visible');
  assert.ok((keyboard.outlineStyle !== 'none' && parseFloat(keyboard.outlineWidth) > 0)
    || keyboard.boxShadow !== 'none', 'Focused action has a visible outline or ring');
  results.push({ check: 'keyboard', status: 'passed', ...keyboard });
  await page.screenshot({ path: `${EVIDENCE_DIR}/home-keyboard-390.png` });

  for (const route of ['/services', '/agent-foundation']) {
    for (const width of [390, 1440]) {
      await viewport(width, 'reduce');
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForFunction(() => [...document.images].some(image =>
        /warm-v2\.webp(?:$|\?)/.test(image.currentSrc) && image.complete && image.naturalWidth > 0),
      undefined, { timeout: 10000 });
      const state = await page.evaluate(() => {
        const image = [...document.images].find(image => /warm-v2\.webp(?:$|\?)/.test(image.currentSrc));
        return {
          width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          source: image.currentSrc, alt: image.alt, image: image.getBoundingClientRect().toJSON(),
        };
      });
      assert.ok(state.scrollWidth <= width + 1, `No overflow at ${route}/${width}`);
      assert.ok(state.alt.includes('Concept illustration'), 'Service concept boundary is retained');
      assert.ok(state.image.width > 0 && state.image.height > 0, 'Service image is visible');
      const screenshot = `${EVIDENCE_DIR}/${route.slice(1)}-${width}.png`;
      await page.screenshot({ path: screenshot });
      results.push({ route, status: 'passed', screenshot, ...state });
    }
  }

  // Explicit SSR/no-JS check: keep the real page script disabled, not a mocked fixture.
  await page.cdp('Emulation.setScriptExecutionDisabled', { value: true });
  try {
    for (const width of [390, 1440]) {
      await viewport(width, 'reduce');
      await page.goto(`${BASE_URL}/`);
      const state = await page.evaluate(homeGeometry);
      checkHome(state, width);
      const screenshot = `${EVIDENCE_DIR}/home-no-js-${width}.png`;
      await page.screenshot({ path: screenshot });
      results.push({ route: '/', width, check: 'no-js', status: 'passed', screenshot, ...state });
    }
  } finally {
    await page.cdp('Emulation.setScriptExecutionDisabled', { value: false });
  }
} catch (error) {
  failure = { message: error.message, stack: error.stack };
  await page.screenshot({ path: `${EVIDENCE_DIR}/failure.png` }).catch(() => {});
} finally {
  await page.cdp('Emulation.setScriptExecutionDisabled', { value: false });
  await page.cdp('Emulation.clearDeviceMetricsOverride');
  await page.cdp('Emulation.setEmulatedMedia', { features: [] });
  const report = {
    baseUrl: BASE_URL, taskSpaceId: TASK_SPACE_ID, generatedAt: new Date().toISOString(),
    status: failure ? 'failed' : 'passed', results, failure,
    limits: [
      'Geometry and loading checks do not establish aesthetic quality; inspect screenshots directly.',
      'Desktop subject bounds are specific to the approved asset and right-center containment treatment.',
      'No credential, form submission, production deployment, or client runtime was exercised.',
    ],
  };
  await writeFile(`${EVIDENCE_DIR}/hero-warmth-report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
assert.ok(!failure, failure?.message);
