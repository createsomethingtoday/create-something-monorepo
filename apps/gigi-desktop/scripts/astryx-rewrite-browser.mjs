// Full React/Astryx runtime acceptance, synthetic data only. Development fixture
// cannot call native/provider tools; it is excluded from the production build.
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const app = resolve(new URL('../', import.meta.url).pathname);
const out = resolve(process.env.GIGI_REWRITE_EVIDENCE || '/tmp/gigi-astryx-rewrite');
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
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 840 },
    reducedMotion: 'reduce'
  });
  const errors = [];
  const external = [];
  page.on('request', (request) => {
    if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))
      external.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  const open = async (view = 'overview', theme = 'studio', density = 'comfortable') => {
    await page.goto(`${origin}/?fixture=${view}&theme=${theme}&density=${density}`);
    await page.waitForFunction(() => globalThis.gigiTest);
    await page.waitForTimeout(100);
  };
  const fits = async (label) =>
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      `${label}: horizontal overflow`
    );
  const routes = [
    'overview',
    'gigs',
    'schedule',
    'tasks',
    'contacts',
    'finances',
    'companies',
    'locations',
    'notes',
    'documents',
    'interactions',
    'services',
    'tags',
    'profile',
    'history',
    'settings',
    'appearance',
    'music',
    'social'
  ];
  if (!process.argv.includes('--regressions'))
    for (const width of [880, 1280])
      for (const theme of ['studio', 'paper', 'midnight'])
        for (const density of ['comfortable', 'compact']) {
          await page.setViewportSize({ width, height: width === 880 ? 620 : 840 });
          await open('overview', theme, density);
          await fits(`${theme}/${density}/${width}`);
          assert.ok(
            (await page.locator('.astryx-button').count()) > 0,
            'actual Astryx buttons rendered'
          );
          await page.screenshot({
            path: resolve(out, `${theme}-${width}-${density}.png`),
            fullPage: true
          });
        }
  await page.setViewportSize({ width: 880, height: 620 });
  if (!process.argv.includes('--regressions'))
    for (const route of routes) {
      await open(route, 'paper');
      await fits(route);
      assert.ok((await page.locator('h1').innerText()).length, `${route}: page heading`);
      await page.screenshot({ path: resolve(out, `route-${route}.png`), fullPage: true });
    }
  await open('overview');
  await page.getByRole('button', { name: 'Autumn showcase', exact: true }).click();
  await page.waitForFunction(() =>
    gigiTest.calls.some((c) => c.operation === 'records.get' && c.input.id === 'gig-1')
  );
  assert.equal(
    await page.evaluate(
      () =>
        gigiTest.calls.find((c) => c.operation === 'records.get' && c.input.id === 'gig-1').input
          .entity
    ),
    'gigs',
    'Today preserves the native entity for mixed agenda records'
  );
  await open('tasks');
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await page.locator('#title').fill('Synthetic rewrite task');
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await page.getByRole('alertdialog').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(
    await page.locator('#title').inputValue(),
    'Synthetic rewrite task',
    'unsaved draft retained'
  );
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await page.getByRole('heading', { name: 'Synthetic rewrite task', exact: true }).waitFor();
  let saves = await page.evaluate(() =>
    gigiTest.calls.filter((c) => c.operation === 'records.save')
  );
  assert.equal(saves.length, 1);
  assert.equal(saves[0].input.entity, 'tasks');
  await page.getByRole('button', { name: 'Edit details', exact: true }).click();
  await page.locator('#title').fill('Revised synthetic task');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await page.getByRole('heading', { name: 'Revised synthetic task', exact: true }).waitFor();
  saves = await page.evaluate(() => gigiTest.calls.filter((c) => c.operation === 'records.save'));
  assert.equal(saves.at(-1).input.fieldsMode, 'replace');
  assert.equal(
    saves.at(-1).input.expectedRecord.title,
    'Synthetic rewrite task',
    'stale-write snapshot retained'
  );
  await page.keyboard.press('Meta+f');
  await page.getByRole('dialog').waitFor();
  await page.locator('#workspace-search-input').fill('Rehearsal');
  await page.locator('.workspace-search-result').first().waitFor();
  await page.keyboard.press('ArrowDown');
  assert.equal(
    await page
      .locator('.workspace-search-result')
      .first()
      .evaluate((node) => node === document.activeElement),
    true
  );
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Appearance & views', exact: true }).click();
  await page.locator('[data-preferences-theme=paper]').click();
  assert.equal(await page.evaluate(() => gigiTest.snapshot().preferences.theme), 'paper');
  await page.getByRole('button', { name: 'Ask GiGi', exact: true }).first().click();
  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await page.locator('#chat-message').fill('Review the saved plan');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page
    .getByText('Review the saved call time before changing it.', { exact: false })
    .waitFor();
  assert.equal(
    await page.locator('script').filter({ hasText: 'untrusted source' }).count(),
    0,
    'provider HTML stays inert'
  );
  const textBefore = await page
    .locator('.chat-answer p')
    .first()
    .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
  await page.locator('.chat-view-options>summary').click();
  await page.locator('#chat-chatTextSize-display').click();
  await page.getByRole('option', { name: 'Larger', exact: true }).click();
  assert.ok(
    (await page
      .locator('.chat-answer p')
      .first()
      .evaluate((node) => parseFloat(getComputedStyle(node).fontSize))) > textBefore,
    'larger chat text changes rendered response text'
  );
  await page.screenshot({ path: resolve(out, 'chat.png'), fullPage: true });
  assert.deepEqual(errors, [], 'no uncaught errors across rewritten routes');
  assert.deepEqual(external, [], 'desktop UI and fonts stay local');
  assert.ok(
    await page.evaluate(async () => {
      const fonts = await document.fonts.load('14px Figtree');
      return fonts.length > 0;
    }),
    'bundled Figtree font actually loads'
  );
  const assets = readdirSync(resolve(app, 'dist/assets'));
  const js = assets
    .filter((name) => name.endsWith('.js'))
    .map((name) => readFileSync(resolve(app, 'dist/assets', name), 'utf8'))
    .join('\n');
  assert.equal(
    js.includes('synthetic-astryx-rewrite'),
    false,
    'development backend excluded from production'
  );
  assert.equal(
    js.includes('insertAdjacentHTML'),
    false,
    'legacy HTML renderer excluded from production'
  );
  const result = {
    passed: true,
    routes: process.argv.includes('--regressions') ? 0 : routes.length,
    appearanceCombinations: process.argv.includes('--regressions') ? 0 : 12,
    package: '@astryxdesign/core@0.7.11',
    scope:
      'Actual React/Astryx in synthetic Chromium. No native WebKit, real records, provider, signing or installer acceptance.'
  };
  writeFileSync(
    resolve(out, process.argv.includes('--regressions') ? 'regressions.json' : 'result.json'),
    JSON.stringify(result, null, 2)
  );
  console.log(JSON.stringify(result));
} finally {
  if (browser) await browser.close();
  await server.close();
}
