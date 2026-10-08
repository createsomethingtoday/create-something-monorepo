// Standard local Chrome, not native ChatGPT/browser-plugin acceptance.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(
  new URL('../../../../node_modules/.pnpm/node_modules/playwright/index.mjs', import.meta.url)
);
const origin = 'http://127.0.0.1:5185';
const output =
  process.env.PCN_EVIDENCE_DIR || fileURLToPath(new URL('./evidence/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce'
});
await context.route('**/*', (route) =>
  new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort()
);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const results = [];
async function check(name, fn) {
  await fn();
  results.push({ name, status: 'passed' });
  console.log('PASS', name);
}
async function reset(role, scenario = '') {
  await context.request.post(`${origin}/__fixture/reset?role=${role}&scenario=${scenario}`);
}
async function open(path) {
  await page.goto(origin + path);
  await page.locator('main').waitFor();
}
async function shot(name) {
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: false });
}
async function noOverflow() {
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    'horizontal overflow'
  );
}
try {
  await check(
    'viewer start routes to library; creator entry and collection remain distinct',
    async () => {
      await reset('member');
      await open('/start');
      await noOverflow();
      assert.equal(
        await page.getByRole('link', { name: /Explore the library/ }).getAttribute('href'),
        '/library'
      );
      assert.equal(
        await page.getByRole('link', { name: /Creator workspace/ }).getAttribute('href'),
        '/dashboard'
      );
      await shot('start-desktop');
    }
  );
  await check('keyboard skip link and mobile menu escape restore focus', async () => {
    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement.textContent.trim()),
      'Skip to content'
    );
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
    await page.setViewportSize({ width: 390, height: 844 });
    await noOverflow();
    await shot('start-mobile');
    await page.locator('.onboarding-choices').scrollIntoViewIfNeeded();
    await shot('start-mobile-choices');
    const button = page.locator('.menu-toggle');
    await button.click();
    assert.equal(await button.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await button.getAttribute('aria-expanded'), 'false');
    assert(await button.evaluate((el) => document.activeElement === el));
  });
  await check('saved progress loading, failed request and successful retry', async () => {
    await reset('member', 'progress-retry');
    await open('/library');
    await page.getByText('Checking your saved progress…').waitFor();
    await page.getByRole('button', { name: 'Try saved progress again' }).click();
    await page.getByText('Resume at 0:42').waitFor();
    await noOverflow();
    await shot('viewer-resume-mobile');
  });
  await check('lesson return retains filters and saved progress survives reload', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await open('/library?q=handoff&series=Synthetic+workshop');
    await page.locator('.video-card').click();
    await page.getByText('Resume from 0:42.', { exact: false }).waitFor();
    await page.getByText('Synthetic fixture: no recorded media is available.').waitFor();
    await page.reload();
    await page.getByText('Resume from 0:42.', { exact: false }).waitFor();
    await page.getByRole('link', { name: 'Back to sessions' }).click();
    assert.equal(new URL(page.url()).searchParams.get('q'), 'handoff');
    assert.equal(await page.getByRole('searchbox').inputValue(), 'handoff');
    await shot('viewer-library-desktop');
  });
  await check('blocked viewers receive no private lesson data or resume controls', async () => {
    await reset('blocked');
    await open('/library');
    await page.getByText('Public previews only', { exact: true }).waitFor();
    await page.getByText('No sessions available here yet.').waitFor();
    assert.equal(
      await page.getByText('Synthetic: Review an agent handoff', { exact: true }).count(),
      0
    );
    await shot('viewer-denied-desktop');
    await open('/lessons/lesson-1');
    await page.getByRole('heading', { name: 'Lesson unavailable.' }).waitFor();
    assert.equal(
      await page.getByText('Synthetic: Review an agent handoff', { exact: true }).count(),
      0
    );
  });
  await check('creator route guard rejects synthetic member and anonymous roles', async () => {
    for (const role of ['member', 'anonymous']) {
      await reset(role);
      await open('/admin');
      await page.getByRole('heading', { name: 'Access denied' }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Upload private draft' }).count(), 0);
      assert.equal((await context.request.get(origin + '/api/admin')).status(), 403);
    }
  });
  await check(
    'existing-account lesson sign-in returns to lesson, sequence and filters',
    async () => {
      await reset('anonymous');
      await open('/lessons/lesson-1?path=path-1&q=handoff&series=Synthetic+workshop');
      await page.getByRole('link', { name: 'Sign in with your invited email' }).click();
      await page.getByLabel('Email', { exact: true }).fill('member@example.invalid');
      await page.getByLabel('Password', { exact: true }).fill('synthetic-only');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL('**/lessons/lesson-1?**');
      assert.equal(new URL(page.url()).searchParams.get('path'), 'path-1');
      assert.equal(new URL(page.url()).searchParams.get('q'), 'handoff');
      await page.getByRole('heading', { name: 'Synthetic: Review an agent handoff' }).waitFor();
    }
  );
  await check('existing-account path sign-in returns to the path', async () => {
    await reset('anonymous');
    await open('/paths/path-1');
    await page.locator('main').getByRole('link', { name: 'Sign in', exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill('member@example.invalid');
    await page.getByLabel('Password', { exact: true }).fill('synthetic-only');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/paths/path-1');
    await page.getByRole('heading', { name: 'Synthetic: First workflow' }).waitFor();
  });
  await check(
    'empty viewer paths offer available sessions; empty creator paths offer studio',
    async () => {
      await reset('member', 'empty');
      await open('/paths');
      await page.getByRole('link', { name: 'Browse available sessions' }).waitFor();
      await reset('admin', 'empty');
      await open('/paths');
      assert.equal(
        await page.getByRole('link', { name: 'Prepare your first lesson' }).getAttribute('href'),
        '/admin'
      );
    }
  );
  await check('creator guide keyboard open/close, anchors and mobile layout', async () => {
    await reset('admin');
    await open('/admin');
    const summary = page.locator('.creator-guide > summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    assert(await page.locator('.creator-guide').evaluate((el) => el.open));
    await page
      .getByText('Saving lesson material updates it immediately', { exact: false })
      .waitFor();
    await page.getByText('Prepare lesson text with ChatGPT', { exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await noOverflow();
    await page.locator('.creator-guide > summary').scrollIntoViewIfNeeded();
    await shot('creator-guide-mobile');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await shot('creator-guide-desktop');
    await page.getByRole('link', { name: 'publishing desk', exact: true }).click();
    assert.equal(new URL(page.url()).hash, '#publishing-desk');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'publishing-desk');
    await summary.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.creator-guide').evaluate((el) => el.open), false);
  });
  await check(
    'upload transfer success plus readiness failure preserves existing draft guidance',
    async () => {
      await page.getByLabel('Session title', { exact: true }).fill('Synthetic draft');
      await page
        .locator('input[type=file]')
        .setInputFiles({
          name: 'synthetic.mp4',
          mimeType: 'video/mp4',
          buffer: Buffer.from('synthetic fixture, not a recording')
        });
      await page.getByRole('button', { name: 'Upload private draft' }).click();
      await page
        .getByText('Upload received, but processing status could not be checked.', { exact: false })
        .waitFor();
      await page.getByRole('heading', { name: 'Synthetic draft', exact: true }).waitFor();
      await shot('creator-upload-recovery');
    }
  );
  await check(
    'interrupted upload stays reserved across leaving and returning to studio',
    async () => {
      await reset('admin', 'upload-interrupted');
      await open('/admin');
      await page.getByLabel('Session title', { exact: true }).fill('Synthetic draft');
      await page
        .locator('input[type=file]')
        .setInputFiles({
          name: 'synthetic.mp4',
          mimeType: 'video/mp4',
          buffer: Buffer.from('fixture')
        });
      await page.getByRole('button', { name: 'Upload private draft' }).click();
      await page.getByText('Synthetic transfer interrupted.', { exact: false }).waitFor();
      await page.getByRole('heading', { name: 'Uploads to reconcile' }).waitFor();
      await page.getByRole('link', { name: 'Back to library', exact: true }).click();
      await page.goBack();
      await page.getByRole('heading', { name: 'Uploads to reconcile' }).waitFor();
      await page.getByRole('button', { name: 'Check upload', exact: true }).waitFor();
      assert.equal(
        await page.getByRole('heading', { name: 'Synthetic draft', exact: true }).count(),
        0
      );
    }
  );
  await check('no uncaught browser errors', async () => assert.deepEqual(errors, []));
} finally {
  await writeFile(
    `${output}/acceptance-results.json`,
    JSON.stringify(
      {
        browser: 'Installed Google Chrome, headless disposable profile',
        url: origin,
        results,
        errors,
        boundary:
          'Synthetic data; real components and data handlers; mocked Identity and media transport. No provider/native ChatGPT acceptance.'
      },
      null,
      2
    )
  );
  await browser.close();
}
