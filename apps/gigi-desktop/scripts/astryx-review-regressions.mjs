// Actual React/Astryx application regressions for review findings. Development
// backend only: no native app, user profile, picker, provider or database opens.
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const app = resolve(new URL('../', import.meta.url).pathname);
const out = resolve(process.env.GIGI_REVIEW_EVIDENCE || '/tmp/gigi-review-regressions');
mkdirSync(out, { recursive: true });
const { chromium } = createRequire(
  new URL('../../../packages/agency/package.json', import.meta.url)
)('@playwright/test');
const server = await createServer({
  configFile: resolve(app, 'vite.config.mjs'),
  root: app,
  server: { port: 0, strictPort: false, host: '127.0.0.1' }
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
let browser;
const results = [];
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({
    viewport: { width: 880, height: 620 },
    reducedMotion: 'reduce'
  });
  page.setDefaultTimeout(2500);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const open = async (route) => {
    await page.goto(`${origin}/?fixture=${route}&review=1`);
    await page.waitForFunction(() => globalThis.gigiTest);
    await page.waitForTimeout(60);
  };
  const nav = (name) =>
    page
      .getByRole('navigation', { name: 'Workspace', exact: true })
      .getByRole('button', { name, exact: true });
  const count = (operation) =>
    page.evaluate(
      (operation) => gigiTest.calls.filter((call) => call.operation === operation).length,
      operation
    );
  const cases = {
    music: async () => {
      await open('music');
      await page.getByRole('button', { name: 'Organize', exact: true }).waitFor();
      await nav('Music').click();
      await page.getByRole('button', { name: 'Organize', exact: true }).click();
      await page.locator('#music-edit-title').fill('Keep this music draft');
      await nav('Music').click();
      assert.equal(await page.getByRole('dialog').count(), 0, 'active Music route is not a leave');
      assert.equal(await page.locator('#music-edit-title').inputValue(), 'Keep this music draft');
      await nav('People').click();
      await page.getByRole('dialog', { name: 'Discard changes?', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
      assert.equal(
        await page.locator('#music-edit-title').inputValue(),
        'Keep this music draft',
        'Music leave guard remains registered'
      );
      await page.getByRole('button', { name: 'Save organization', exact: true }).click();
      await page.waitForFunction(() =>
        gigiTest.calls.some((call) => call.operation === 'music.edit')
      );
      const saved = await page.evaluate(
        () => gigiTest.calls.find((call) => call.operation === 'music.edit').input
      );
      assert.equal(saved.title, 'Keep this music draft');
      assert.equal(saved.expectedRevision, 1);
    },
    social: async () => {
      await open('social');
      await nav('Instagram drafts').click();
      await page.getByRole('button', { name: 'New draft', exact: true }).click();
      await page.getByLabel('Title', { exact: true }).fill('Keep this Instagram draft');
      await nav('Instagram drafts').click();
      assert.equal(
        await page.getByRole('dialog').count(),
        0,
        'active Instagram route is not a leave'
      );
      await nav('People').click();
      await page.getByRole('dialog', { name: 'Leave this draft?', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
      assert.equal(
        await page.getByLabel('Title', { exact: true }).inputValue(),
        'Keep this Instagram draft',
        'Instagram leave guard remains registered'
      );
      assert.equal(await count('social.save'), 0, 'guard and active-route clicks do not save');
    },
    create: async () => {
      await open('overview');
      await page.evaluate(() => {
        gigiTest.set({ workspace: null, setupProfile: false, setupDraft: null, toast: null });
        gigiTest.failNext('workspace.create', 'Synthetic workspace creation failed. Try again.');
      });
      await page.locator('#owner-name').fill('Synthetic owner');
      await page.locator('#workspace-name').fill('Synthetic new workspace');
      await page.locator('#currency-display').click();
      await page.getByRole('option', { name: 'USD', exact: true }).click();
      await page.getByRole('button', { name: 'Create private workspace', exact: true }).click();
      await page
        .getByRole('alert')
        .filter({ hasText: 'Synthetic workspace creation failed. Try again.' })
        .waitFor();
      await page.screenshot({ path: resolve(out, 'create-failure-visible.png'), fullPage: true });
      assert.equal(await page.locator('#owner-name').inputValue(), 'Synthetic owner');
      assert.equal(await count('records.save'), 0, 'failed create cannot save a profile');
      await page.getByRole('button', { name: 'Create private workspace', exact: true }).click();
      await page.getByRole('heading', { name: 'Setup & safety', exact: true }).waitFor();
      assert.equal(await count('workspace.create'), 2, 'one failed create and one explicit retry');
      assert.equal(await count('records.save'), 1, 'successful retry saves one profile');
    },
    native_controls: async () => {
      await open('overview');
      await page.evaluate(() => {
        globalThis.__TAURI__ = {};
        gigiTest.set({ workspace: null, setupProfile: false, setupDraft: null, toast: null });
      });
      await page.locator('#currency-display').click();
      const sheet = page.getByRole('dialog', { name: 'Currency', exact: true });
      await sheet.waitFor();
      for (const currency of ['USD', 'CAD', 'EUR', 'GBP'])
        assert.equal(
          await sheet.getByRole('option', { name: currency, exact: true }).isVisible(),
          true
        );
      await sheet.getByRole('option', { name: 'USD', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#currency').value === 'USD');
      await sheet.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => document.activeElement?.id === 'currency-display');
      const frame = await page.locator('.gigi-onboarding').boundingBox();
      assert.ok(frame.x >= 24 && frame.width <= 800, 'setup has a bounded centered frame');
      await page.screenshot({ path: resolve(out, 'native-controls.png'), fullPage: true });
    },
    profile: async () => {
      await open('overview');
      await page.evaluate(() => {
        gigiTest.set({ workspace: null, setupProfile: false, setupDraft: null, toast: null });
        gigiTest.failNext(
          'records.save:profile',
          'Synthetic profile save failed. Retry the profile.'
        );
      });
      await page.locator('#owner-name').fill('Synthetic owner');
      await page.locator('#workspace-name').fill('Synthetic partial workspace');
      await page.locator('#currency-display').click();
      await page.getByRole('option', { name: 'USD', exact: true }).click();
      await page.getByRole('button', { name: 'Create private workspace', exact: true }).click();
      await page
        .getByRole('alert')
        .filter({ hasText: 'Synthetic profile save failed. Retry the profile.' })
        .waitFor();
      await page.screenshot({ path: resolve(out, 'profile-failure-visible.png'), fullPage: true });
      await page.getByRole('heading', { name: 'Finish your profile.', exact: true }).waitFor();
      assert.equal(await count('workspace.create'), 1, 'partial setup has one workspace');
      assert.equal(await page.locator('#owner-name').inputValue(), 'Synthetic owner');
      await page.getByRole('button', { name: 'Finish setup', exact: true }).click();
      await page.getByRole('heading', { name: 'Setup & safety', exact: true }).waitFor();
      assert.equal(
        await count('workspace.create'),
        1,
        'profile retry must not create another workspace'
      );
      assert.equal(
        await count('records.save'),
        2,
        'one failed profile save and one explicit retry'
      );
    }
  };
  const selected = process.argv.find((value) => value.startsWith('--case='))?.slice(7);
  for (const [name, run] of Object.entries(cases)) {
    if (selected && selected !== name) continue;
    try {
      await run();
      results.push({ name, passed: true });
    } catch (error) {
      results.push({ name, passed: false, error: error.message });
    }
    await page.screenshot({ path: resolve(out, `${name}.png`), fullPage: true });
  }
  const result = {
    passed: results.every((result) => result.passed) && errors.length === 0,
    cases: results,
    errors,
    scope:
      'Actual React application with synthetic development backend; no native or provider acceptance.'
  };
  writeFileSync(resolve(out, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  assert.equal(result.passed, true, 'review regressions must pass');
} finally {
  if (browser) await browser.close();
  await server.close();
}
