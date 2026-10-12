// Disposable browser profile: no real documents or remote requests.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
const base = process.env.CANVAS_URL || 'http://127.0.0.1:5193';
const output = process.env.UX_OUTPUT || new URL('../output/ux/', import.meta.url).pathname;
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  headless: true
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.route('**/*', (route) =>
  new URL(route.request().url()).hostname === new URL(base).hostname
    ? route.continue()
    : route.abort()
);
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.on('dialog', (dialog) => dialog.accept());
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const failures = [];
async function check(name, run) {
  try {
    await run();
    console.log('PASS', name);
  } catch (e) {
    failures.push(name);
    console.log('FAIL', name, e.message);
  }
}
try {
  await page.goto(base);
  await expect(page.getByText('New local session', { exact: true })).toBeVisible();
  const doc = {
    version: 'create-something.mapping-canvas.v1',
    id: 'synthetic-import-ux',
    title: 'Synthetic imported UX',
    background: '#000000',
    createdAt: '2026-10-12',
    updatedAt: '2026-10-12',
    viewport: { x: 0, y: 0, zoom: 1 },
    objects: [
      {
        id: 'clipped-note',
        kind: 'note',
        x: 100,
        y: 100,
        width: 270,
        height: 80,
        text: 'Synthetic text\nMore detail\nFinal detail',
        content: {
          blocks: [
            { type: 'heading1', runs: [{ text: 'Synthetic text' }] },
            { type: 'paragraph', runs: [{ text: 'More detail' }] },
            { type: 'paragraph', runs: [{ text: 'Final detail' }] }
          ]
        },
        createdAt: '2026-10-12'
      }
    ]
  };
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'synthetic.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(doc))
    });
  await expect(page.getByLabel('Canvas title')).toHaveValue(doc.title);
  await check('clipped rich notes report hidden text', async () => {
    await expect(page.getByText('More text · resize note', { exact: true })).toBeVisible();
  });
  await check('rich-note overflow reacts to content and size; SVG excludes UI', async () => {
    await page.locator('[data-object-id="clipped-note"]').focus();
    await page.keyboard.press('Enter');
    const fitHeight = await page
      .locator('.rich-note')
      .evaluate((element) => element.scrollHeight + 30);
    await page.getByLabel('Selection height', { exact: true }).fill(String(fitHeight));
    await page.getByLabel('Selection height', { exact: true }).press('Tab');
    await expect(page.getByText('More text · resize note', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'H1', exact: true }).click();
    await expect(page.getByText('More text · resize note', { exact: true })).toBeVisible();
    await page.getByLabel('Selection height', { exact: true }).fill('250');
    await page.getByLabel('Selection height', { exact: true }).press('Tab');
    await expect(page.getByText('More text · resize note', { exact: true })).toHaveCount(0);
    await page.getByLabel('Selection height', { exact: true }).fill('80');
    await page.getByLabel('Selection height', { exact: true }).press('Tab');
    await expect(page.getByText('More text · resize note', { exact: true })).toBeVisible();
    await mkdir(output, { recursive: true });
    await page.screenshot({ path: `${output}/note-overflow.png` });
    await page.locator('summary').filter({ hasText: 'File' }).click();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export viewport SVG', exact: true }).click();
    assert.ok(!(await readFile(await (await downloading).path(), 'utf8')).includes('resize note'));
  });
  await check('import updates all mode links without reload', async () => {
    await expect.poll(() => new URL(page.url()).searchParams.get('project')).not.toBe(null);
    const id = new URL(page.url()).searchParams.get('project');
    for (const name of ['Canvas', 'Motion', 'Preview'])
      await expect(
        page
          .getByRole('navigation', { name: 'Project mode' })
          .getByRole('link', { name, exact: true })
      ).toHaveAttribute('href', new RegExp(`project=${id}`));
  });
  await check('Draw opens Compose with current project', async () => {
    const id = new URL(page.url()).searchParams.get('project');
    await page.getByRole('link', { name: 'Compose', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/compose\\?project=${id}`));
    await expect(page.getByRole('link', { name: 'Draw canvas' })).toHaveAttribute(
      'href',
      `/?project=${id}`
    );
  });
  await page.goto(`${base}/compose?project=synthetic-return`);
  await expect(page.getByLabel('Heading', { exact: true })).toBeVisible();
  await page.getByLabel('Heading', { exact: true }).fill('Draft saved without preview');
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await page.reload();
  await check(
    'save includes pending content',
    async () =>
      await expect(page.getByLabel('Heading', { exact: true })).toHaveValue(
        'Draft saved without preview'
      )
  );
  await check(
    'Compose return retains Canvas context',
    async () =>
      await expect(page.getByRole('link', { name: 'Draw canvas' })).toHaveAttribute(
        'href',
        '/?project=synthetic-return'
      )
  );
  await check('JSON export includes pending content', async () => {
    await page.getByLabel('Heading', { exact: true }).fill('Current exported draft');
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
    const value = JSON.parse(await readFile(await (await downloading).path(), 'utf8'));
    assert.equal(value.content.title, 'Current exported draft');
    await expect(page.locator('.preview-form')).toContainText('Current exported draft');
  });
  await check('invalid draft preserves saved bytes and shows error', async () => {
    const saved = await page.evaluate(() => localStorage.getItem('draw.composition.demo.v1'));
    await page.getByLabel('Heading', { exact: true }).fill('   ');
    await page.getByRole('button', { name: 'Save locally', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    assert.equal(
      await page.evaluate(() => localStorage.getItem('draw.composition.demo.v1')),
      saved
    );
  });
  await check('ZIP export waits for updated preview', async () => {
    await page.getByRole('button', { name: 'Motion', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Export Context ZIP', exact: true })
    ).toBeDisabled();
    await page.getByLabel('Heading', { exact: true }).fill('Updated ZIP content');
    await page.getByRole('button', { name: 'Update preview' }).click();
    await expect(
      page.getByRole('button', { name: 'Export Context ZIP', exact: true })
    ).toBeEnabled();
  });
  await check('unsaved return offers an in-page cancellation dialog', async () => {
    await page.getByRole('link', { name: 'Draw canvas' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Keep editing' })).toBeFocused();
    await page.getByRole('button', { name: 'Keep editing' }).click();
    await expect(page).toHaveURL(/compose/);
    await expect(page.getByRole('link', { name: 'Draw canvas' })).toBeFocused();
  });
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await expect(page.locator('.status')).toContainText('Saved on this device');
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: `${output}/compose.png`, fullPage: true });
  await check('client-side Back supports cancel and leave', async () => {
    await page.goto(`${base}/compose/render`);
    await expect(page.locator('main')).toHaveAttribute('data-ready', 'true');
    await page.getByRole('link', { name: '← Compose', exact: true }).click();
    await page.getByLabel('Heading', { exact: true }).fill('Retain this draft on Back');
    page.removeAllListeners('dialog');
    const dialog = page.waitForEvent('dialog');
    const back = page.goBack();
    const warning = await dialog;
    assert.equal(warning.type(), 'confirm');
    await warning.dismiss();
    await back;
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue(
      'Retain this draft on Back'
    );
    page.on('dialog', (dialog) => dialog.accept());
    const leaving = page.waitForEvent('dialog');
    const again = page.goBack();
    assert.equal((await leaving).type(), 'confirm');
    await again;
    await expect(page).toHaveURL(/compose\/render/);
  });
  await check('unapplied invalid draft survives reload without replacing saved content', async () => {
    await page.goto(`${base}/compose`);
    await page.getByRole('button', { name: 'Restore draft' }).click();
    await page.getByRole('button', { name: 'Save locally', exact: true }).click();
    const saved = await page.evaluate(() => localStorage.getItem('draw.composition.demo.v1'));
    await page.getByLabel('Heading', { exact: true }).fill('   ');
    await page.reload();
    await page.getByRole('button', { name: 'Restore draft' }).click();
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('   ');
    assert.equal(await page.evaluate(() => localStorage.getItem('draw.composition.demo.v1')), saved);
    await page.getByRole('link', { name: 'Draw canvas' }).click();
    await page.getByRole('button', { name: 'Save and return' }).click();
    await expect(page).toHaveURL(/compose/);
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByRole('link', { name: 'Draw canvas' }).click();
    await page.getByRole('button', { name: 'Leave without saving' }).click();
    await page.goto(`${base}/compose`);
    await expect(page.getByRole('button', { name: 'Restore draft' })).toHaveCount(0);
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('Retain this draft on Back');
  });
  await check('successful save and return clears recovery', async () => {
    await page.getByLabel('Heading', { exact: true }).fill('Native-safe return');
    await page.getByRole('link', { name: 'Draw canvas' }).click();
    await page.getByRole('button', { name: 'Save and return' }).click();
    await expect(page).not.toHaveURL(/compose/);
    await page.goto(`${base}/compose`);
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('Native-safe return');
    assert.equal(await page.evaluate(() => localStorage.getItem('draw.composition.recovery.v1')), null);
  });
  await check('failed save and return stays in Compose and preserves saved bytes', async () => {
    const saved = await page.evaluate(() => {
      window.__originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { if (key === 'draw.composition.demo.v1') throw Error('Synthetic storage failure'); return window.__originalSetItem.call(this, key, value); };
      return localStorage.getItem('draw.composition.demo.v1');
    });
    await page.getByLabel('Heading', { exact: true }).fill('Failed save draft');
    await page.getByRole('link', { name: 'Draw canvas' }).click();
    await page.getByRole('button', { name: 'Save and return' }).click();
    await expect(page).toHaveURL(/compose/);
    await expect(page.getByRole('alert')).toContainText('Could not complete local save');
    assert.equal(await page.evaluate(() => localStorage.getItem('draw.composition.demo.v1')), saved);
    await page.evaluate(() => { Storage.prototype.setItem = window.__originalSetItem; });
    await page.getByRole('link', { name: 'Draw canvas' }).click();
    await page.getByRole('button', { name: 'Leave without saving' }).click();
    await page.goto(`${base}/compose`);
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('Native-safe return');
  });
  await check('malformed recovery retains saved bytes until explicit discard', async () => {
    const saved = await page.evaluate(() => { localStorage.setItem('draw.composition.recovery.v1', '{broken'); return localStorage.getItem('draw.composition.demo.v1'); });
    await page.reload();
    await expect(page.getByRole('region', { name: 'Unsaved draft recovery' })).toBeVisible();
    assert.equal(await page.evaluate(() => localStorage.getItem('draw.composition.recovery.v1')), '{broken');
    assert.equal(await page.evaluate(() => localStorage.getItem('draw.composition.demo.v1')), saved);
    await page.screenshot({ path: `${output}/recovery-error.png`, fullPage: true });
    await page.getByRole('button', { name: 'Discard draft' }).click();
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('Native-safe return');
    assert.equal(await page.evaluate(() => localStorage.getItem('draw.composition.demo.v1')), saved);
  });
  await check('reverting to saved fields removes obsolete recovery', async () => {
    await page.getByLabel('Heading', { exact: true }).fill('Temporary draft');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('draw.composition.recovery.v1'))).not.toBe(null);
    await page.getByLabel('Heading', { exact: true }).fill('Native-safe return');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('draw.composition.recovery.v1'))).toBe(null);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Restore draft' })).toHaveCount(0);
  });
  await check('saved content survives recovery cleanup failure without stale restoration', async () => {
    await page.getByLabel('Heading', { exact: true }).fill('Saved despite cleanup failure');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('draw.composition.recovery.v1'))).not.toBe(null);
    await page.evaluate(() => { window.__originalRemoveItem = Storage.prototype.removeItem; Storage.prototype.removeItem = function(key) { if (key === 'draw.composition.recovery.v1') throw Error('Synthetic cleanup failure'); return window.__originalRemoveItem.call(this, key); }; });
    await page.getByRole('button', { name: 'Save locally', exact: true }).click();
    await expect(page.locator('.status')).toContainText('Saved on this device');
    await expect(page.getByRole('alert')).toContainText('Saved content is safe');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Restore draft' })).toHaveCount(0);
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('Saved despite cleanup failure');
  });
  await page.goto(`${base}/animate`);
  await check('Motion distinguishes editable JSON from images and video', async () => {
    await expect(
      page.getByRole('button', { name: 'Export project JSON', exact: true })
    ).toBeEnabled();
    await expect(
      page.getByRole('button', { name: 'Import project JSON', exact: true })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export PNG frame', exact: true })).toBeVisible();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export project JSON', exact: true }).click();
    const file = await downloading;
    assert.equal(file.suggestedFilename(), 'animation.draw.json');
    assert.ok(JSON.parse(await readFile(await file.path(), 'utf8')).id);
  });
  await page.screenshot({ path: `${output}/motion.png`, fullPage: true });
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
assert.deepEqual(failures, []);
