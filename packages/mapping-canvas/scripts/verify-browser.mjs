import { chromium } from '@playwright/test';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.CANVAS_URL ?? 'http://127.0.0.1:5173';
const runLabel = process.env.CANVAS_RUN_LABEL ?? 'local';
const outputRoot = fileURLToPath(new URL(`../output/${runLabel}/`, import.meta.url));
await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function clearDatabase(page) {
  await page.evaluate(() => new Promise((resolve) => {
    const request = indexedDB.deleteDatabase('create-something-mapping-canvas');
    request.onsuccess = resolve;
    request.onerror = resolve;
    request.onblocked = resolve;
  }));
}

async function startPage(viewport) {
  const localRun = new URL(baseUrl).hostname === '127.0.0.1' || new URL(baseUrl).hostname === 'localhost';
  const context = await browser.newContext({ viewport, acceptDownloads: true, serviceWorkers: localRun ? 'block' : 'allow' });
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'failed'}`));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Pen tool/ }).waitFor();
  await clearDatabase(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Pen tool/ }).waitFor();
  await page.waitForFunction(() => !document.querySelector('.statusbar')?.textContent?.includes('Loading local canvas'));
  return { context, page, errors, failedRequests };
}

function requireCleanRun(run, label) {
  if (run.errors.length) throw new Error(`${label} console errors: ${run.errors.join(' | ')}`);
  if (run.failedRequests.length) throw new Error(`${label} failed requests: ${run.failedRequests.join(' | ')}`);
}

async function verifyOfflineShell() {
  if (['127.0.0.1', 'localhost'].includes(new URL(baseUrl).hostname)) return 'not-applicable-local-dev';
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, serviceWorkers: 'allow' });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle' });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Pen tool/ }).waitFor();
  await context.setOffline(false);
  await context.close();
  return 'pass';
}

try {
  const desktop = await startPage({ width: 1440, height: 900 });
  const { page } = desktop;
  const svg = page.locator('svg');
  const box = await svg.boundingBox();
  if (!box) throw new Error('Canvas surface unavailable');

  await page.mouse.move(box.x + 210, box.y + 180);
  await page.mouse.down();
  await page.mouse.move(box.x + 280, box.y + 220, { steps: 6 });
  await page.mouse.move(box.x + 350, box.y + 170, { steps: 6 });
  await page.mouse.up();
  await page.getByTestId('convert-menu').click();
  await page.getByTestId('convert-note').click();
  if (await page.locator('.provenance').count() !== 1) throw new Error('Note conversion did not preserve provenance');
  await page.getByTestId('restore-source').click();

  await page.getByRole('button', { name: /Note tool/ }).click();
  await page.mouse.click(box.x + 430, box.y + 260);
  await page.mouse.click(box.x + 780, box.y + 440);
  const notes = page.locator('g[aria-label^="Note:"]');
  if (await notes.count() !== 2) throw new Error('Two spatial notes were not created');
  await notes.nth(0).focus();
  await notes.nth(0).press('Enter');
  await notes.nth(1).focus();
  await notes.nth(1).press('Shift+Enter');
  await page.getByTestId('convert-menu').click();
  await page.getByTestId('convert-connector').click();
  if (await page.locator('line[aria-label="Connector"]').count() !== 1) throw new Error('Connector conversion failed');

  await page.getByRole('button', { name: /Rectangle tool/ }).click();
  await page.mouse.move(box.x + 190, box.y + 350);
  await page.mouse.down();
  await page.mouse.move(box.x + 360, box.y + 500, { steps: 4 });
  await page.mouse.up();
  await page.locator('path[aria-label="Ink stroke"]').focus();
  await page.locator('path[aria-label="Ink stroke"]').press('Shift+Enter');
  await page.getByTestId('convert-menu').click();
  await page.getByTestId('convert-group').click();
  if (await page.locator('g[aria-label^="Group:"]').count() !== 1) throw new Error('Group conversion failed');
  await page.mouse.click(box.x + 190, box.y + 410);
  if (!(await page.locator('rect[aria-label="Rectangle"]').getAttribute('class'))?.includes('selected')) throw new Error('Group boundary obscured a child object');

  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('button', { name: 'Redo' }).click();
  await page.getByRole('button', { name: /Pan tool/ }).click();
  await page.mouse.move(box.x + 600, box.y + 300);
  await page.mouse.down();
  await page.mouse.move(box.x + 660, box.y + 350, { steps: 4 });
  await page.mouse.up();
  await page.mouse.move(box.x + 700, box.y + 400);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(300);

  const exports = {};
  for (const extension of ['json', 'svg', 'png']) {
    const event = page.waitForEvent('download', { timeout: 15_000 });
    await page.getByRole('button', { name: extension.toUpperCase() }).click();
    const download = await event;
    const target = `${outputRoot}canvas.${extension}`;
    await download.saveAs(target);
    exports[extension] = (await stat(target)).size;
    if (exports[extension] < 100) throw new Error(`${extension} export is empty`);
  }
  const svgExport = await readFile(`${outputRoot}canvas.svg`, 'utf8');
  if (!svgExport.includes('New thought') || svgExport.includes('foreignObject')) throw new Error('SVG export did not materialize note text');

  const countBeforeReload = await page.locator('[role="button"][aria-label]').count();
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Pen tool/ }).waitFor();
  await page.waitForFunction(() => !document.querySelector('.statusbar')?.textContent?.includes('Loading local canvas'));
  const countAfterReload = await page.locator('[role="button"][aria-label]').count();
  if (countAfterReload < countBeforeReload - 1) throw new Error('Reload lost canvas objects');

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.statusbar')?.textContent?.includes('New local session'));
  await page.locator('input[type=file]').setInputFiles(`${outputRoot}canvas.json`);
  await page.waitForFunction(() => document.querySelector('.statusbar')?.textContent?.includes('Canvas imported'));
  if (await page.locator('g[aria-label^="Group:"]').count() !== 1) throw new Error('JSON import did not restore the group');
  await page.getByRole('button', { name: /Note tool/ }).click();
  await page.mouse.click(box.x + 520, box.y + 210);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.statusbar')?.textContent?.includes('New local session'));
  await page.waitForTimeout(200);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.querySelector('.statusbar')?.textContent?.includes('Loading local canvas'));
  if (await page.locator('[data-object-id], [aria-label="Ink stroke"], [aria-label="Rectangle"], [aria-label="Connector"]').count()) throw new Error('Reset allowed a pending autosave to restore stale objects');
  await page.locator('input[type=file]').setInputFiles(`${outputRoot}canvas.json`);
  await page.waitForFunction(() => document.querySelector('.statusbar')?.textContent?.includes('Canvas imported'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.screenshot({ path: `${outputRoot}desktop.png`, fullPage: true });
  requireCleanRun(desktop, 'Desktop');
  await desktop.context.close();

  const mobile = await startPage({ width: 390, height: 844 });
  await mobile.page.emulateMedia({ reducedMotion: 'reduce' });
  const mobileSvg = mobile.page.locator('svg');
  const mobileBox = await mobileSvg.boundingBox();
  if (!mobileBox) throw new Error('Mobile canvas unavailable');
  await mobile.page.mouse.move(mobileBox.x + 80, mobileBox.y + 100);
  await mobile.page.mouse.down();
  await mobile.page.mouse.move(mobileBox.x + 240, mobileBox.y + 180, { steps: 8 });
  await mobile.page.mouse.up();
  await mobile.page.getByTestId('convert-menu').click();
  await mobile.page.getByTestId('convert-note').click();
  const mobileCritical = await mobile.page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    toolbar: !!document.querySelector('.toolbar'),
    conversion: !!document.querySelector('.provenance')
  }));
  if (mobileCritical.width !== mobileCritical.viewport || !mobileCritical.toolbar || !mobileCritical.conversion) throw new Error(`Mobile layout failed: ${JSON.stringify(mobileCritical)}`);
  await mobile.page.screenshot({ path: `${outputRoot}mobile.png`, fullPage: true });
  requireCleanRun(mobile, 'Mobile');
  await mobile.context.close();

  const offlineShell = await verifyOfflineShell();
  console.log(JSON.stringify({ baseUrl, runLabel, desktop: { exports, countBeforeReload, countAfterReload }, mobile: mobileCritical, offlineShell, result: 'pass' }, null, 2));
} finally {
  await browser.close();
}
