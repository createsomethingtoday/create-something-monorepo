import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const base = process.env.DRAW_COMPOSITION_URL || 'http://127.0.0.1:51957';
const out = process.env.DRAW_POLISH_OUTPUT || '../../output/integration/ux-polish';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true
});
const result = { assertions: [], errors: [], completed: false };
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce'
  });
  context.setDefaultTimeout(15000);
  context.setDefaultNavigationTimeout(15000);
  await context.route('**/*', (route) => {
    const request = route.request();
    return new URL(request.url()).origin === new URL(base).origin &&
      ['GET', 'HEAD'].includes(request.method())
      ? route.continue()
      : route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => result.errors.push(e.message));
  await page.goto(`${base}/compose`);
  const heading = page.getByLabel('Heading', { exact: true });
  const preview = page.locator('.preview-form');
  await expect(preview.getByRole('heading', { name: 'Make the next step clear.' })).toBeVisible();
  await heading.fill('SYNTHETIC — saved visible edit');
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await expect(page.getByText('Saved on this device.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(heading).toHaveValue('SYNTHETIC — saved visible edit');
  await expect(
    preview.getByRole('heading', { name: 'SYNTHETIC — saved visible edit' })
  ).toBeVisible();
  result.assertions.push(
    'Edit → Save without Apply → reload preserves the visible heading and preview'
  );
  await heading.fill('SYNTHETIC — canceled draft');
  await expect(page.getByText('Unapplied changes · not saved.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel edits', exact: true }).click();
  await expect(heading).toHaveValue('SYNTHETIC — saved visible edit');
  result.assertions.push(
    'Cancel edits restores the applied document without changing the saved copy'
  );
  await heading.fill('SYNTHETIC — applied draft');
  await page.getByRole('button', { name: 'Apply changes' }).click();
  await expect(preview.getByRole('heading', { name: 'SYNTHETIC — applied draft' })).toBeVisible();
  await expect(page.getByText('Unsaved changes.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Draw canvas', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(page).toHaveURL(`${base}/compose`);
  await expect(heading).toHaveValue('SYNTHETIC — applied draft');
  result.assertions.push('Apply updates preview; canceling departure preserves unsaved work');
  const canceledReload = page.waitForEvent('dialog').then((dialog) => dialog.dismiss());
  // A canceled reload never reaches Playwright's load condition. Trigger the
  // browser action without waiting for a navigation that must not complete.
  await page.evaluate(() => {
    window.setTimeout(() => window.location.reload(), 0);
  });
  await canceledReload;
  await expect(heading).toHaveValue('SYNTHETIC — applied draft');
  result.assertions.push('Canceling browser reload preserves applied unsaved edits');
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await page.reload();
  await expect(heading).toHaveValue('SYNTHETIC — applied draft');
  result.assertions.push('Apply → Save → reload preserves content');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const json = await readFile(await (await download).path(), 'utf8');
  const imported = JSON.parse(json);
  imported.content.title = 'SYNTHETIC — imported';
  const file = {
    name: 'synthetic.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(imported))
  };
  await heading.fill('SYNTHETIC — retained draft');
  const cancelImport = page.waitForEvent('dialog').then((d) => d.dismiss());
  await page.getByLabel('Import composition JSON').setInputFiles(file);
  await cancelImport;
  await expect(heading).toHaveValue('SYNTHETIC — retained draft');
  await expect(
    page.getByText('Import canceled. Current composition unchanged.', { exact: true })
  ).toBeVisible();
  result.assertions.push('Cancel import replacement retains pending edits');
  await page.getByLabel('Import composition JSON').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{bad')
  });
  await expect(
    page.getByRole('alert').filter({ hasText: 'Choose a valid Draw composition JSON file.' })
  ).toBeVisible();
  await expect(page.getByRole('alert')).not.toContainText('position 1');
  await expect(heading).toHaveValue('SYNTHETIC — retained draft');
  await page.getByLabel('Import composition JSON').dispatchEvent('cancel');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(heading).toHaveValue('SYNTHETIC — retained draft');
  result.assertions.push(
    'Malformed import and picker cancellation preserve the draft with readable feedback'
  );
  const acceptImport = page.waitForEvent('dialog').then((d) => d.accept());
  await page.getByLabel('Import composition JSON').setInputFiles(file);
  await acceptImport;
  await expect(heading).toHaveValue('SYNTHETIC — imported');
  await expect(page.getByText('Unsaved changes.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await page.reload();
  await expect(heading).toHaveValue('SYNTHETIC — imported');
  result.assertions.push('Confirmed import clears stale errors and persists only after Save');
  await heading.fill('   ');
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Could not save.');
  await expect(preview.getByRole('heading', { name: 'SYNTHETIC — imported' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel edits', exact: true }).click();
  await page.reload();
  await expect(heading).toHaveValue('SYNTHETIC — imported');
  result.assertions.push('Invalid content cannot overwrite the saved document');
  // Adapt the actual storage boundary, not internal editor methods.
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'draw.composition.demo.v1')
        throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await heading.fill('SYNTHETIC — storage failure draft');
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Could not save.');
  await expect(page.getByText('Unapplied changes · not saved.', { exact: true })).toBeVisible();
  const rescue = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const rescued = JSON.parse(await readFile(await (await rescue).path(), 'utf8'));
  expect(rescued.content.title).toBe('SYNTHETIC — storage failure draft');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel edits', exact: true }).click();
  await page.reload();
  await expect(heading).toHaveValue('SYNTHETIC — imported');
  result.assertions.push(
    'Storage failure keeps draft and prior saved copy; export rescues visible edits and clears stale errors'
  );
  await page.evaluate(() => {
    const original = File.prototype.text;
    File.prototype.text = async function () {
      const value = await original.call(this);
      await new Promise((resolve) => (window.releaseSyntheticImport = resolve));
      return value;
    };
  });
  await page.getByLabel('Import composition JSON').setInputFiles(file);
  await page.waitForFunction(() => typeof window.releaseSyntheticImport === 'function');
  await heading.fill('SYNTHETIC — edited during import');
  await page.evaluate(() => window.releaseSyntheticImport());
  await expect(page.getByRole('alert')).toContainText('changed while the file was opening');
  await expect(heading).toHaveValue('SYNTHETIC — edited during import');
  await page.getByRole('button', { name: 'Cancel edits', exact: true }).click();
  await page.reload();
  result.assertions.push('Delayed import cannot overwrite newer editor input');
  const handoffDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export render handoff', exact: true }).click();
  expect((await handoffDownload).suggestedFilename()).toBe('draw-render-handoff.json');
  await expect(page.getByRole('link', { name: /Open render view/ })).toHaveAttribute(
    'href',
    '/compose/render'
  );
  await page.screenshot({ path: `${out}/desktop-compose.png`, fullPage: true });
  result.assertions.push('Render handoff supplies a discoverable next-step link');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(preview).toBeVisible();
  expect((await preview.boundingBox()).y).toBeLessThan(650);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${out}/phone-preview.png`, fullPage: true });
  await preview.getByLabel('Your name').fill('Synthetic visitor');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await heading.fill('SYNTHETIC — mobile draft');
  expect(await heading.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(preview.getByLabel('Your name')).toHaveValue('Synthetic visitor');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(heading).toHaveValue('SYNTHETIC — mobile draft');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await expect(preview.getByRole('heading', { name: 'SYNTHETIC — mobile draft' })).toBeVisible();
  result.assertions.push(
    'Phone opens on preview; mode switching retains draft and form entries; Save works from preview'
  );
  await page.getByRole('button', { name: 'Motion', exact: true }).click();
  const caption = page.locator('.live-caption p');
  await expect(caption).toBeVisible();
  expect(await caption.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
  await expect(page.getByRole('button', { name: '01 / Context', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  for (const sequence of ['01 / Context', '02 / Detail']) {
    await page.getByRole('button', { name: sequence, exact: true }).click();
    await expect(page.getByRole('button', { name: sequence, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    for (const time of [0, 5, 9, 14]) {
      await page.getByLabel('Animation time').fill(String(time));
      await page.getByLabel('Animation time').dispatchEvent('input');
      await expect(page.locator('.compact-stage form')).toHaveAttribute(
        'data-state',
        time === 0 || time === 14
          ? 'recovered'
          : time === 9
            ? 'error'
            : sequence === '02 / Detail'
              ? 'invalid'
              : 'empty'
      );
      await page.waitForTimeout(100);
      const target =
        time === 5 && sequence === '02 / Detail'
          ? page
              .locator('.compact-stage [data-instance-id]')
              .filter({ has: page.locator('textarea') })
              .last()
          : time === 0 || time === 9 || time === 14
            ? page.locator('.compact-stage [role=alert], .compact-stage [role=status]').first()
            : null;
      if (target) {
        const scene = await page.locator('.compact-stage').boundingBox();
        const box = await target.boundingBox();
        expect(box.y).toBeGreaterThanOrEqual(scene.y - 1);
        expect(box.y + Math.min(box.height, 100)).toBeLessThanOrEqual(scene.y + scene.height + 1);
      }
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `${out}/phone-${sequence.includes('Context') ? 'context' : 'detail'}.png`,
      fullPage: true
    });
  }
  await page.getByLabel('Animation time').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Animation time')).toHaveValue('14.1');
  await expect(page.getByLabel('Animation time')).toHaveAttribute(
    'aria-valuetext',
    '14.1 of 18 seconds'
  );
  expect(
    await page.getByLabel('Animation time').evaluate((el) => getComputedStyle(el).outlineStyle)
  ).toBe('solid');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const name of ['01 / Context', '02 / Detail', 'Play', 'Save locally'])
    expect(
      (await page.getByRole('button', { name, exact: true }).boundingBox()).height
    ).toBeGreaterThanOrEqual(44);
  result.assertions.push(
    'Both phone sequences keep readable captions and relevant cues in view; selected state, keyboard seek and 44px controls work without overflow'
  );
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await heading.fill('SYNTHETIC — pending Motion export');
  await page.getByRole('button', { name: 'Motion', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Export Context ZIP', exact: true })
  ).toBeDisabled();
  result.assertions.push('Motion ZIP export requires pending edits to be applied or saved');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole('button', { name: 'Motion', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(heading).toHaveValue('SYNTHETIC — pending Motion export');
  await page.getByRole('button', { name: 'Cancel edits', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Export Context ZIP', exact: true })).toBeEnabled();
  result.assertions.push(
    'Leaving the phone Edit layout restores the visible mode selection without losing the draft'
  );
  expect(result.errors).toEqual([]);
  result.completed = true;
} catch (error) {
  result.failure = String(error);
  throw error;
} finally {
  await writeFile(`${out}/polish-results.json`, JSON.stringify(result, null, 2));
  await browser.close();
}
console.log(JSON.stringify(result, null, 2));
