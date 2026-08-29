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
  const toolbarOverflows = await page.locator('.toolbar button').evaluateAll((buttons) => buttons.some((button) => button.scrollWidth > button.clientWidth));
  if (toolbarOverflows) throw new Error('Desktop tool sidebar text overflows its rail');
  const toolbarBox = await page.locator('.toolbar').boundingBox();
  if (!toolbarBox || toolbarBox.width < 144 || toolbarBox.width > 160) throw new Error('Desktop tool sidebar lacks a deliberate readable width');
  const sidebarToggle = page.getByRole('button', { name: 'Collapse tool sidebar' });
  await sidebarToggle.click();
  const collapsedToolbarBox = await page.locator('.toolbar').boundingBox();
  if (!collapsedToolbarBox || collapsedToolbarBox.width < 56 || collapsedToolbarBox.width > 72) throw new Error('Collapsed tool sidebar is not a compact letter rail');
  const collapsedCanvasWidth = (await svg.boundingBox())?.width;
  const collapsedViewBoxWidth = await svg.evaluate((node) => node.viewBox.baseVal.width);
  if (!collapsedCanvasWidth || Math.abs(collapsedCanvasWidth - collapsedViewBoxWidth) > 1) throw new Error('Canvas viewBox did not follow the collapsed sidebar layout');
  if (await page.locator('.toolbar .tool-label:visible').count()) throw new Error('Collapsed tool sidebar still shows tool labels');
  if (await page.locator('.toolbar .tool-key:visible').count() !== 10) throw new Error('Collapsed tool sidebar lost letter indicators');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Expand tool sidebar' }).waitFor();
  if ((await page.locator('.toolbar').boundingBox())?.width !== collapsedToolbarBox.width) throw new Error('Collapsed tool sidebar state did not persist locally');
  await page.getByRole('button', { name: 'Expand tool sidebar' }).click();
  const swatches = page.locator('.palette button');
  if (await swatches.count() !== 5) throw new Error('Minimal five-color palette is unavailable');
  if (await page.getByTestId('color-chalk').getAttribute('aria-pressed') !== 'true') throw new Error('Chalk is not the clean-state default');
  if (!(await page.getByTestId('color-signal').getAttribute('style'))?.includes('var(--color-performance-signal,#0057b8)')) throw new Error('Signal swatch is not bound to its Performance token');
  if ((await swatches.first().boundingBox())?.height < 40) throw new Error('Desktop swatches are below the minimum target size');
  await page.getByRole('button', { name: /Note tool/ }).click();
  if (await page.locator('.palette').count()) throw new Error('Palette remained visible for an ineligible tool without eligible selection');
  await page.getByRole('button', { name: /Pen tool/ }).click();
  await page.getByTestId('color-signal').focus();
  await page.getByTestId('color-signal').press('Enter');

  await page.mouse.move(box.x + 210, box.y + 180);
  await page.mouse.down();
  await page.mouse.move(box.x + 280, box.y + 220, { steps: 6 });
  await page.mouse.move(box.x + 350, box.y + 170, { steps: 6 });
  await page.mouse.up();
  if (await page.locator('path[aria-label="Ink stroke"]').getAttribute('stroke') !== '#0057b8') throw new Error('Pen did not use the Signal color');
  await page.getByTestId('convert-menu').click();
  await page.getByTestId('convert-note').click();
  if (await page.locator('.provenance').count() !== 1) throw new Error('Note conversion did not preserve provenance');
  await page.getByTestId('restore-source').click();

  await page.getByRole('button', { name: /Note tool/ }).click();
  await page.mouse.click(box.x + 430, box.y + 260);
  await page.mouse.click(box.x + 780, box.y + 440);
  const notes = page.locator('g[aria-label^="Note:"]');
  if (await notes.count() !== 2) throw new Error('Two spatial notes were not created');
  const noteEditor = page.locator('textarea[aria-label="Edit note"]').first();
  await noteEditor.fill('MCP');
  await noteEditor.pressSequentially(' tools');
  if (await noteEditor.inputValue() !== 'MCP tools') throw new Error('Note editing did not preserve typed spaces');
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
  if (await page.locator('rect[aria-label="Rectangle"]').evaluate((node) => getComputedStyle(node).filter === 'none')) throw new Error('Selected-object filter is not active');

  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('button', { name: 'Redo' }).click();
  await page.getByRole('button', { name: /Ellipse tool/ }).click();
  await page.mouse.move(box.x + 900, box.y + 180);
  await page.mouse.down();
  await page.mouse.move(box.x + 1050, box.y + 270, { steps: 4 });
  await page.mouse.up();
  await page.getByRole('button', { name: /Arrow tool/ }).click();
  await page.mouse.move(box.x + 600, box.y + 600);
  await page.mouse.down();
  await page.mouse.move(box.x + 800, box.y + 680, { steps: 4 });
  await page.mouse.up();
  if (await page.locator('ellipse[aria-label="Ellipse"]').getAttribute('stroke') !== '#0057b8' || await page.locator('line[aria-label="Arrow"]').getAttribute('stroke') !== '#0057b8' || await page.locator('rect[aria-label="Rectangle"]').getAttribute('stroke') !== '#0057b8') throw new Error('Signal did not carry across authored shape tools');
  await page.locator('path[aria-label="Ink stroke"]').focus();
  await page.locator('path[aria-label="Ink stroke"]').press('Enter');
  await page.locator('rect[aria-label="Rectangle"]').focus();
  await page.locator('rect[aria-label="Rectangle"]').press('Shift+Enter');
  await page.locator('ellipse[aria-label="Ellipse"]').focus();
  await page.locator('ellipse[aria-label="Ellipse"]').press('Shift+Enter');
  await page.locator('line[aria-label="Arrow"]').focus();
  await page.locator('line[aria-label="Arrow"]').press('Shift+Enter');
  await page.getByTestId('color-growth').click();
  const eligibleColors = async () => Promise.all([
    page.locator('path[aria-label="Ink stroke"]').getAttribute('stroke'),
    page.locator('rect[aria-label="Rectangle"]').getAttribute('stroke'),
    page.locator('ellipse[aria-label="Ellipse"]').getAttribute('stroke'),
    page.locator('line[aria-label="Arrow"]').getAttribute('stroke')
  ]);
  if (!(await eligibleColors()).every((color) => color === '#007a4d')) throw new Error('Growth did not recolor the eligible selection');
  if (await page.locator('line[aria-label="Connector"]').getAttribute('stroke') !== '#fcaa2d' || !(await page.locator('g[aria-label^="Group:"] rect').getAttribute('stroke'))?.includes('252,170,45')) throw new Error('Structural Amber was changed by drawing recolor');
  await page.getByRole('button', { name: 'Undo' }).click();
  if (!(await eligibleColors()).every((color) => color === '#0057b8')) throw new Error('Undo did not restore the prior drawing color');
  await page.getByRole('button', { name: 'Redo' }).click();
  if (!(await eligibleColors()).every((color) => color === '#007a4d')) throw new Error('Redo did not reapply the drawing color');
  await page.getByRole('button', { name: /Pan tool/ }).click();
  await page.mouse.move(box.x + 600, box.y + 300);
  await page.mouse.down();
  await page.mouse.move(box.x + 660, box.y + 350, { steps: 4 });
  await page.mouse.up();
  await page.mouse.move(box.x + 700, box.y + 400);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(300);

  await page.locator('rect[aria-label="Rectangle"]').focus();
  await page.locator('rect[aria-label="Rectangle"]').press('Enter');
  await page.getByTestId('convert-menu').click();
  await page.getByTestId('convert-note').click();
  await page.locator('textarea[aria-label="Edit note"]').last().fill('First export line\nSecond export line');
  await page.evaluate(() => {
    window.__mappingCanvasPngText = [];
    window.__mappingCanvasPngStrokes = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      window.__mappingCanvasPngText.push(String(text));
      return original.call(this, text, ...args);
    };
    const strokeStyle = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'strokeStyle');
    if (strokeStyle?.get && strokeStyle.set) Object.defineProperty(CanvasRenderingContext2D.prototype, 'strokeStyle', { configurable: true, get: strokeStyle.get, set(value) { window.__mappingCanvasPngStrokes.push(String(value)); strokeStyle.set.call(this, value); } });
  });

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
  if (!svgExport.includes('New thought') || svgExport.includes('foreignObject') || !svgExport.includes('class="group-label"') || !svgExport.includes('fill="#fcaa2d"')) throw new Error('SVG export did not materialize portable note and label styles');
  if (!svgExport.includes('First export line') || !svgExport.includes('Second export line') || !svgExport.includes('dy="1.35em"')) throw new Error('SVG export collapsed explicit note line breaks');
  if (!(await page.evaluate(() => window.__mappingCanvasPngText.some((text) => text.startsWith('CONVERTED · '))))) throw new Error('PNG export omitted conversion provenance');
  if (!(await page.evaluate(() => window.__mappingCanvasPngText.includes('First export line') && window.__mappingCanvasPngText.includes('Second export line')))) throw new Error('PNG export collapsed explicit note line breaks');
  const jsonExport = JSON.parse(await readFile(`${outputRoot}canvas.json`, 'utf8'));
  const exportedDrawingColors = jsonExport.objects.filter((object) => ['stroke', 'rectangle', 'ellipse', 'arrow'].includes(object.kind)).map((object) => object.color);
  if (!exportedDrawingColors.length || !exportedDrawingColors.every((color) => color === '#007a4d') || !svgExport.includes('stroke="#007a4d"')) throw new Error('JSON or SVG export lost the resolved Growth color');
  if (!(await page.evaluate(() => window.__mappingCanvasPngStrokes.includes('#007a4d') && window.__mappingCanvasPngStrokes.includes('#fcaa2d')))) throw new Error('PNG export lost drawing or structural colors');

  const countBeforeReload = await page.locator('[role="button"][aria-label]').count();
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Pen tool/ }).waitFor();
  await page.waitForFunction(() => !document.querySelector('.statusbar')?.textContent?.includes('Loading local canvas'));
  if (await page.getByTestId('color-growth').getAttribute('aria-pressed') !== 'true' || !(await eligibleColors()).every((color) => color === '#007a4d')) throw new Error('Reload lost the palette preference or authored colors');
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
  const mobileSwatches = mobile.page.locator('.palette button');
  if (await mobileSwatches.count() !== 5 || (await mobileSwatches.first().boundingBox())?.height < 44) throw new Error('Mobile palette is incomplete or below the touch target');
  if (await mobileSwatches.locator('small').allTextContents().then((labels) => labels.join(',')) !== 'Chalk,Amber,Signal,Growth,Risk') throw new Error('Mobile palette lacks color-independent labels');
  await mobile.page.getByTestId('color-risk').click();
  await mobile.page.mouse.move(mobileBox.x + 80, mobileBox.y + 100);
  await mobile.page.mouse.down();
  await mobile.page.mouse.move(mobileBox.x + 240, mobileBox.y + 180, { steps: 8 });
  await mobile.page.mouse.up();
  if (await mobile.page.locator('path[aria-label="Ink stroke"]').getAttribute('stroke') !== '#c62026') throw new Error('Mobile pen did not use the Risk color');
  await mobile.page.getByTestId('convert-menu').click();
  await mobile.page.getByTestId('convert-note').click();
  const mobileCritical = await mobile.page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    toolbar: !!document.querySelector('.toolbar'),
    conversion: !!document.querySelector('.provenance'),
    fileActions: [...document.querySelectorAll('.file-actions button')].every((button) => getComputedStyle(button).display !== 'none'),
    palette: document.querySelectorAll('.palette button').length === 5
  }));
  if (mobileCritical.width !== mobileCritical.viewport || !mobileCritical.toolbar || !mobileCritical.conversion || !mobileCritical.fileActions || !mobileCritical.palette) throw new Error(`Mobile layout failed: ${JSON.stringify(mobileCritical)}`);
  await mobile.page.screenshot({ path: `${outputRoot}mobile.png`, fullPage: true });
  requireCleanRun(mobile, 'Mobile');
  await mobile.context.close();

  const offlineShell = await verifyOfflineShell();
  console.log(JSON.stringify({ baseUrl, runLabel, desktop: { exports, countBeforeReload, countAfterReload }, mobile: mobileCritical, offlineShell, result: 'pass' }, null, 2));
} finally {
  await browser.close();
}
