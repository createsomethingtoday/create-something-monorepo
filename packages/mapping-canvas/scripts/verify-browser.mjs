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
  await page.addInitScript(() => {
    window.__drawWebMcpTools = {};
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool(tool) { window.__drawWebMcpTools[tool.name] = tool; } } });
  });
  const errors = [];
  const failedRequests = [];
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'failed';
    const url = new URL(request.url());
    if (url.pathname === '/cdn-cgi/rum' && failure === 'net::ERR_ABORTED') return;
    failedRequests.push(`${request.method()} ${request.url()}: ${failure}`);
  });
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
  const brandLogo = page.getByRole('img', { name: 'CREATE SOMETHING .agency' });
  if (!(await brandLogo.isVisible()) || !(await brandLogo.getAttribute('src'))?.endsWith('/brand/create-something-agency-white.svg')) throw new Error('Governed CREATE SOMETHING logo is unavailable');
  if (await page.locator('link[rel="canonical"][href="https://draw.createsomething.agency/"]').count() !== 1) throw new Error('Canonical Draw URL is unavailable');
  if (await page.locator('meta[property="og:image"][content="https://draw.createsomething.agency/og-image.png"]').count() !== 1) throw new Error('Draw social image metadata is unavailable');
  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  if (!schemas.some((value) => JSON.parse(value)['@type'] === 'WebApplication') || !schemas.some((value) => JSON.parse(value)['@type'] === 'Organization')) throw new Error('Draw structured identity is incomplete');
  const toolbarOverflows = await page.locator('.toolbar button').evaluateAll((buttons) => buttons.some((button) => button.scrollWidth > button.clientWidth));
  if (toolbarOverflows) throw new Error('Desktop tool sidebar text overflows its rail');
  const agentFollow = await page.evaluate(async () => {
    const tools = window.__drawWebMcpTools;
    const before = await tools.draw_get_state.execute({});
    const id = 'browser-agent-follow-note';
    const receipt = await tools.draw_apply_operations.execute({ operations: [{ type: 'put_object', object: { id, kind: 'note', createdAt: new Date().toISOString(), x: 4000, y: 2800, width: 320, height: 180, text: 'Agent follow proof' } }] });
    const camera = document.querySelector('[data-agent-camera]')?.getAttribute('data-agent-camera');
    const state = await tools.draw_get_state.execute({});
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const content = document.querySelector('[data-agent-camera]');
    const renderedBeforePress = new DOMMatrixReadOnly(getComputedStyle(content).transform);
    document.querySelector(`[data-object-id="${id}"]`)?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 91, pointerType: 'mouse', button: 0 }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const cameraAfterObjectPress = document.querySelector('[data-agent-camera]')?.getAttribute('data-agent-camera');
    const interrupted = await tools.draw_get_state.execute({});
    const renderedAfterPress = new DOMMatrixReadOnly(getComputedStyle(content).transform);
    await tools.draw_undo.execute({});
    const seed = { id: 'browser-agent-seed', kind: 'note', createdAt: new Date().toISOString(), x: 180, y: 160, width: 260, height: 132, text: 'Seed' };
    await tools.draw_apply_operations.execute({ operations: [{ type: 'put_object', object: seed }] });
    await tools.draw_apply_operations.execute({ operations: [{ type: 'remove_objects', ids: [seed.id] }, { type: 'put_object', object: { ...seed, id: 'browser-agent-mixed-note', x: 5200, y: 3600, text: 'Mixed replacement' } }] });
    const mixedCamera = document.querySelector('[data-agent-camera]')?.getAttribute('data-agent-camera');
    await tools.draw_undo.execute({});
    await tools.draw_undo.execute({});
    const explicitViewport = { x: -240, y: -160, zoom: .8 };
    await tools.draw_apply_operations.execute({ operations: [{ type: 'put_object', object: { ...seed, id: 'browser-agent-explicit-frame', x: 6200, y: 4200 } }, { type: 'set_viewport', viewport: explicitViewport }] });
    const explicitViewportState = (await tools.draw_get_state.execute({})).document.viewport;
    await tools.draw_undo.execute({});
    const restored = await tools.draw_get_state.execute({});
    return { beforeCount: before.document.objects.length, receipt, camera, cameraAfterObjectPress, mixedCamera, viewport: state.document.viewport, explicitViewport, explicitViewportState, interruptedViewport: interrupted.document.viewport, renderedBeforePress: { x: renderedBeforePress.e, y: renderedBeforePress.f }, renderedAfterPress: { x: renderedAfterPress.e, y: renderedAfterPress.f }, restoredCount: restored.document.objects.length };
  });
  if (agentFollow.camera !== 'following' || !agentFollow.receipt.changeId || agentFollow.receipt.state) throw new Error(`Agent follow transition or compact receipt was invalid: ${JSON.stringify(agentFollow)}`);
  if (agentFollow.cameraAfterObjectPress !== 'idle') throw new Error(`Object pointer-down did not cancel the agent camera: ${JSON.stringify(agentFollow)}`);
  if (Math.abs(agentFollow.interruptedViewport.x - agentFollow.renderedBeforePress.x) > 2 || Math.abs(agentFollow.interruptedViewport.y - agentFollow.renderedBeforePress.y) > 2 || Math.abs(agentFollow.renderedAfterPress.x - agentFollow.renderedBeforePress.x) > 2 || Math.abs(agentFollow.renderedAfterPress.y - agentFollow.renderedBeforePress.y) > 2) throw new Error(`Agent camera interruption snapped away from its displayed frame: ${JSON.stringify(agentFollow)}`);
  if (agentFollow.mixedCamera !== 'following') throw new Error('Mixed remove-and-create batch did not follow the surviving artifact');
  if (JSON.stringify(agentFollow.explicitViewportState) !== JSON.stringify(agentFollow.explicitViewport)) throw new Error(`Agent follow replaced an explicit viewport: ${JSON.stringify(agentFollow)}`);
  if (agentFollow.viewport.x === 0 && agentFollow.viewport.y === 0) throw new Error('Agent follow camera did not frame the offscreen artifact');
  if (agentFollow.restoredCount !== agentFollow.beforeCount) throw new Error('Agent follow proof did not restore the original canvas');
  const semantic = await page.evaluate(async () => {
    const tools = window.__drawWebMcpTools;
    const names = Object.keys(tools).sort();
    const drawNames = names.filter((name) => name.startsWith('draw_'));
    const before = await tools.draw_get_state.execute({});
    const inspect = await tools.draw_inspect.execute({ limit: 10 });
    const composed = await tools.draw_compose.execute({
      expectedRevision: inspect.revision,
      layout: { direction: 'row', gap: 96 },
      placement: 'visible-center',
      nodes: [{ ref: 'brief', text: 'Mission brief' }, { ref: 'launch', text: 'Spaceship launch' }],
      edges: [{ ref: 'approval', from: 'brief', to: 'launch', label: 'approved' }],
      groups: [{ ref: 'mission', label: 'Mission control', members: ['brief', 'launch'] }]
    });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const composedState = await tools.draw_get_state.execute({});
    const briefModelWidth = composedState.document.objects.find(({ id }) => id === composed.refs.brief)?.width;
    const connectorLabel = [...document.querySelectorAll('.connector-label')].find((node) => node.textContent === 'approved');
    const rawConnectorLabelBounds = connectorLabel?.getBoundingClientRect().toJSON();
    const renderedGeometry = await tools.draw_get_rendered_geometry.execute({ ids: [composed.refs.brief, composed.refs.launch, composed.refs.approval, composed.refs.mission], limit: 10 });
    await tools.draw_select.execute({ ids: [composed.refs.mission] });
    const selectedGroupGeometry = await tools.draw_get_rendered_geometry.execute({ ids: [composed.refs.mission] });
    await tools.draw_select.execute({ ids: [] });
    const unselectedGroupGeometry = await tools.draw_get_rendered_geometry.execute({ ids: [composed.refs.mission] });
    const autoLayouts = [];
    for (const mode of ['flow', 'hierarchy', 'loop', 'orbit', 'swimlane']) {
      const result = await tools.draw_auto_layout.execute({ ids: [composed.refs.launch, composed.refs.brief], mode, gap: 64, lanes: [{ id: composed.refs.brief, lane: 'Plan' }, { id: composed.refs.launch, lane: 'Launch' }] });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const geometry = await tools.draw_get_rendered_geometry.execute({ ids: [composed.refs.brief, composed.refs.launch], limit: 10 });
      autoLayouts.push({ mode: result.mode, placedIds: result.placedIds, peerOverlaps: geometry.overlaps.filter(({ classification }) => classification === 'peer').length });
      await tools.draw_revert_change.execute({ changeId: result.changeId });
    }
    const arrow = await tools.draw_create_freehand_arrow.execute({ start: { x: 40, y: 480 }, end: { x: 440, y: 620 }, curvature: .35, looseness: .55, color: 'signal', weight: 6, arrowhead: 'triangle' });
    const arrowGeometry = await tools.draw_get_rendered_geometry.execute({ ids: arrow.objectIds, limit: 10 });
    await new Promise((resolve) => setTimeout(resolve, 800));
    const settledArrowGeometry = await tools.draw_get_rendered_geometry.execute({ ids: arrow.objectIds, limit: 10 });
    await tools.draw_revert_change.execute({ changeId: arrow.changeId });
    const edgeArrowId = 'browser-rendered-edge-arrow';
    const edgeArrow = await tools.draw_apply_operations.execute({ operations: [{ type: 'put_object', object: { id: edgeArrowId, kind: 'arrow', createdAt: new Date().toISOString(), from: { x: inspect.visibleWorld.x + inspect.visibleWorld.width - 120, y: inspect.visibleWorld.y + 360 }, to: { x: inspect.visibleWorld.x + inspect.visibleWorld.width - 1, y: inspect.visibleWorld.y + 360 }, color: '#fcaa2d' } }] });
    const edgeViewport = await tools.draw_apply_operations.execute({ operations: [{ type: 'set_viewport', viewport: before.document.viewport }] });
    const edgeArrowGeometry = await tools.draw_get_rendered_geometry.execute({ ids: [edgeArrowId], limit: 10 });
    await tools.draw_revert_change.execute({ changeId: edgeViewport.changeId });
    await tools.draw_revert_change.execute({ changeId: edgeArrow.changeId });
    const thickArrow = await tools.draw_create_freehand_arrow.execute({ start: { x: inspect.visibleWorld.x + inspect.visibleWorld.width - 80, y: inspect.visibleWorld.y + 420 }, end: { x: inspect.visibleWorld.x + inspect.visibleWorld.width - 1, y: inspect.visibleWorld.y + 420 }, curvature: 0, looseness: 0, color: 'signal', weight: 24, arrowhead: 'vee' });
    const thickViewport = await tools.draw_apply_operations.execute({ operations: [{ type: 'set_viewport', viewport: before.document.viewport }] });
    const thickArrowGeometry = await tools.draw_get_rendered_geometry.execute({ ids: thickArrow.objectIds, limit: 10 });
    await tools.draw_revert_change.execute({ changeId: thickViewport.changeId });
    await tools.draw_revert_change.execute({ changeId: thickArrow.changeId });
    const collision = await tools.draw_compose.execute({ nodes: [{ ref: 'collision-a', text: 'Collision A' }, { ref: 'collision-b', text: 'Collision B' }], layout: { direction: 'row', gap: 64 } });
    const collisionState = await tools.draw_get_state.execute({});
    const collisionA = collisionState.document.objects.find(({ id }) => id === collision.refs['collision-a']);
    const collisionB = collisionState.document.objects.find(({ id }) => id === collision.refs['collision-b']);
    const collisionPatch = await tools.draw_patch_objects.execute({ patches: [{ id: collisionB.id, translate: { dx: collisionA.x - collisionB.x, dy: collisionA.y - collisionB.y } }] });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const collisionGeometry = await tools.draw_get_rendered_geometry.execute({ ids: [collisionA.id, collisionB.id], limit: 10 });
    const offscreenId = 'browser-rendered-offscreen';
    const offscreen = await tools.draw_apply_operations.execute({ operations: [{ type: 'put_object', object: { id: offscreenId, kind: 'note', createdAt: new Date().toISOString(), x: 100000, y: 100000, width: 180, height: 100, text: 'Offscreen' } }, { type: 'set_viewport', viewport: collisionState.document.viewport }] });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const clippedGeometry = await tools.draw_get_rendered_geometry.execute({ ids: [offscreenId, 'missing-rendered-id'], limit: 10 });
    await tools.draw_revert_change.execute({ changeId: offscreen.changeId });
    await tools.draw_revert_change.execute({ changeId: collisionPatch.changeId });
    await tools.draw_revert_change.execute({ changeId: collision.changeId });
    const path = await tools.draw_path.execute({ kind: 'polygon', color: 'signal', width: 5, smooth: true, points: [{ x: 0, y: -100 }, { x: 75, y: 70 }, { x: 25, y: 50 }, { x: 0, y: 95 }, { x: -25, y: 50 }, { x: -75, y: 70 }] });
    const patched = await tools.draw_patch_objects.execute({ patches: [{ id: composed.refs.launch, text: 'Launch ready', translate: { dx: 24, dy: 16 }, arrange: 'front' }] });
    const staleRevision = inspect.revision;
    let staleError = '';
    try { await tools.draw_patch_objects.execute({ expectedRevision: staleRevision, patches: [{ id: composed.refs.brief, text: 'Stale write' }] }); }
    catch (error) { staleError = error instanceof Error ? error.message : String(error); }
    const layout = await tools.draw_layout.execute({ ids: [composed.refs.brief, composed.refs.launch], direction: 'column', gap: 56 });
    const focus = await tools.draw_focus.execute({ scope: 'ids', ids: [composed.refs.brief, composed.refs.launch], padding: 84 });
    let deleteError = '', replaceError = '';
    try { await tools.draw_delete.execute({ ids: [composed.refs.brief] }); } catch (error) { deleteError = error instanceof Error ? error.message : String(error); }
    try { await tools.draw_replace_canvas.execute({ objects: [] }); } catch (error) { replaceError = error instanceof Error ? error.message : String(error); }
    await tools.draw_revert_change.execute({ changeId: layout.changeId });
    await tools.draw_revert_change.execute({ changeId: patched.changeId });
    await tools.draw_revert_change.execute({ changeId: path.changeId });
    await tools.draw_revert_change.execute({ changeId: composed.changeId });
    const restored = await tools.draw_get_state.execute({});
    return {
      names, drawNames, version: inspect.version, compactBytes: JSON.stringify(inspect).length, fullBytes: JSON.stringify(before).length,
      composed, renderedGeometry, briefModelWidth, rawConnectorLabelBounds, selectedGroupGeometry, unselectedGroupGeometry, autoLayouts, arrow, arrowGeometry, settledArrowGeometry, edgeArrowGeometry, thickArrowGeometry, collisionGeometry, clippedGeometry, connectorVisible: Boolean(connectorLabel && getComputedStyle(connectorLabel).display !== 'none'),
      staleError, deleteError, replaceError, focus, restoredCount: restored.document.objects.length, beforeCount: before.document.objects.length
    };
  });
  const requiredSemanticTools = ['draw_auto_layout', 'draw_compose', 'draw_create_freehand_arrow', 'draw_delete', 'draw_focus', 'draw_get_rendered_geometry', 'draw_inspect', 'draw_layout', 'draw_patch_objects', 'draw_path', 'draw_replace_canvas', 'draw_revert_change'];
  if (!requiredSemanticTools.every((name) => semantic.drawNames.includes(name)) || semantic.drawNames.length !== 19) throw new Error(`Semantic Draw tool inventory is incomplete: ${JSON.stringify(semantic.drawNames)} (all registered tools: ${JSON.stringify(semantic.names)})`);
  if (semantic.version !== '2026-09-05.1' || !semantic.composed.changeId || !semantic.connectorVisible) throw new Error(`Semantic composition or visible connector label failed: ${JSON.stringify(semantic)}`);
  if (semantic.renderedGeometry.objects.length !== 4 || semantic.renderedGeometry.connectors.length !== 1 || !semantic.renderedGeometry.connectors[0].labelBounds || semantic.renderedGeometry.overlaps.some(({ classification }) => classification === 'peer') || !semantic.renderedGeometry.overlaps.some(({ classification }) => classification === 'containment')) throw new Error(`Rendered geometry did not match the visible semantic graph: ${JSON.stringify(semantic.renderedGeometry)}`);
  if (!semantic.briefModelWidth || semantic.renderedGeometry.objects.find(({ id }) => id === semantic.composed.refs.brief)?.worldBounds.width < semantic.briefModelWidth + .9) throw new Error(`Rendered note bounds omitted the painted child outline: ${JSON.stringify({ modelWidth: semantic.briefModelWidth, rendered: semantic.renderedGeometry.objects })}`);
  if (!semantic.rawConnectorLabelBounds || semantic.renderedGeometry.connectors[0].labelBounds.viewportBounds.width < semantic.rawConnectorLabelBounds.width + 4 || semantic.renderedGeometry.connectors[0].labelBounds.viewportBounds.height < semantic.rawConnectorLabelBounds.height + 4) throw new Error(`Rendered connector-label bounds omitted the painted outline: ${JSON.stringify({ raw: semantic.rawConnectorLabelBounds, rendered: semantic.renderedGeometry.connectors[0].labelBounds })}`);
  if (JSON.stringify(semantic.selectedGroupGeometry.objects[0]?.worldBounds) !== JSON.stringify(semantic.unselectedGroupGeometry.objects[0]?.worldBounds) || JSON.stringify(semantic.arrowGeometry.objects) !== JSON.stringify(semantic.settledArrowGeometry.objects)) throw new Error(`Rendered geometry changed with selection UI or after the tool declared the animation settled: ${JSON.stringify({ selected: semantic.selectedGroupGeometry, unselected: semantic.unselectedGroupGeometry, immediateArrow: semantic.arrowGeometry, settledArrow: semantic.settledArrowGeometry })}`);
  if (semantic.autoLayouts.length !== 5 || semantic.autoLayouts.some(({ peerOverlaps }) => peerOverlaps) || semantic.arrow.geometry.arrowhead !== 'triangle' || semantic.arrowGeometry.objects.length !== 2) throw new Error(`Semantic auto-layout or freehand arrow proof failed: ${JSON.stringify({ autoLayouts: semantic.autoLayouts, arrow: semantic.arrow, arrowGeometry: semantic.arrowGeometry })}`);
  if (!semantic.edgeArrowGeometry.objects.some(({ clipped }) => clipped)) throw new Error(`Rendered arrowhead marker clipping was not included: ${JSON.stringify(semantic.edgeArrowGeometry)}`);
  if (!semantic.thickArrowGeometry.objects.some(({ clipped }) => clipped)) throw new Error(`Rendered stroke-width clipping was not included: ${JSON.stringify(semantic.thickArrowGeometry)}`);
  if (!semantic.collisionGeometry.overlaps.some(({ classification }) => classification === 'peer') || !semantic.clippedGeometry.objects[0]?.clipped || !semantic.clippedGeometry.missingIds.includes('missing-rendered-id')) throw new Error(`Rendered collision, clipping, or missing-ID evidence failed: ${JSON.stringify({ collision: semantic.collisionGeometry, clipped: semantic.clippedGeometry })}`);
  if (!semantic.staleError.includes('revision') || !semantic.deleteError.includes('DELETE OBJECTS') || !semantic.replaceError.includes('REPLACE CANVAS')) throw new Error(`Semantic safety boundary failed: ${JSON.stringify(semantic)}`);
  if (semantic.restoredCount !== semantic.beforeCount || !semantic.focus.ok) throw new Error(`Semantic workflow did not restore its isolated fixture: ${JSON.stringify(semantic)}`);
  await page.waitForTimeout(800);
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
  const immediateTyping = await noteEditor.evaluate((input) => {
    const text = 'But loves pink more!';
    const started = performance.now();
    input.value = '';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
    for (const character of text) {
      input.value += character;
      input.dispatchEvent(new InputEvent('input', { bubbles: true, data: character, inputType: 'insertText' }));
    }
    return { value: input.value, elapsed: performance.now() - started, label: input.closest('g')?.getAttribute('aria-label') };
  });
  if (immediateTyping.value !== 'But loves pink more!' || immediateTyping.elapsed > 50) throw new Error(`Note keystrokes did not paint immediately: ${JSON.stringify(immediateTyping)}`);
  if (immediateTyping.label === 'Note: But loves pink more!') throw new Error('Note input rebuilt the canvas document during the keystroke burst');
  const editingConflict = await page.evaluate(async () => {
    try { await window.__drawWebMcpTools.draw_get_state.execute({}); return 'allowed'; }
    catch (error) { return error instanceof Error ? error.message : String(error); }
  });
  if (!editingConflict.includes('Finish the active human gesture')) throw new Error(`Agent access was not paused for active note editing: ${editingConflict}`);
  await notes.nth(1).dispatchEvent('pointerdown', { bubbles: true, button: 0, pointerId: 77, pointerType: 'mouse' });
  if (await notes.first().getAttribute('aria-label') !== 'Note: But loves pink more!') throw new Error('Pointer gesture did not flush note text before capturing canvas state');
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
  await page.evaluate(async () => {
    const state = await window.__drawWebMcpTools.draw_get_state.execute({});
    const connector = state.document.objects.find((object) => object.kind === 'connector');
    if (!connector) throw new Error('Connector unavailable for export-label proof');
    await window.__drawWebMcpTools.draw_patch_objects.execute({ patches: [{ id: connector.id, label: 'Approved path' }] });
  });
  if (await page.locator('.connector-label').textContent() !== 'Approved path') throw new Error('Connector label patch was not rendered');

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
  const beforeTrackpad = await page.evaluate(() => window.__drawWebMcpTools.draw_get_state.execute({}));
  await page.mouse.wheel(40, -30);
  const afterPan = await page.evaluate(() => window.__drawWebMcpTools.draw_get_state.execute({}));
  if (afterPan.document.viewport.zoom !== beforeTrackpad.document.viewport.zoom || afterPan.document.viewport.x !== beforeTrackpad.document.viewport.x - 40 || afterPan.document.viewport.y !== beforeTrackpad.document.viewport.y + 30) throw new Error('Unmodified trackpad scroll did not pan the canvas');
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -30);
  await page.keyboard.up('Control');
  const afterPinch = await page.evaluate(() => window.__drawWebMcpTools.draw_get_state.execute({}));
  if (afterPinch.document.viewport.zoom <= afterPan.document.viewport.zoom) throw new Error('Modifier trackpad gesture did not zoom the canvas');
  await page.waitForTimeout(300);

  await page.locator('rect[aria-label="Rectangle"]').focus();
  await page.locator('rect[aria-label="Rectangle"]').press('Enter');
  await page.getByTestId('convert-menu').click();
  await page.getByTestId('convert-note').click();
  await page.locator('textarea[aria-label="Edit note"]').last().fill('First export line\nSecond export line');
  await page.locator('textarea[aria-label="Edit note"]').last().blur();
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
  const exportArrow = await page.evaluate(async () => {
    const inspect = await window.__drawWebMcpTools.draw_inspect.execute({ limit: 1 });
    const start = { x: inspect.visibleWorld.x + 160, y: inspect.visibleWorld.y + 160 };
    return window.__drawWebMcpTools.draw_create_freehand_arrow.execute({ start, end: { x: start.x + 360, y: start.y + 140 }, curvature: -.3, looseness: .6, color: 'signal', weight: 7, arrowhead: 'barbed' });
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
  if (!svgExport.includes('New thought') || svgExport.includes('foreignObject') || !svgExport.includes('class="group-label"') || !svgExport.includes('Approved path') || !svgExport.includes('fill="#fcaa2d"')) throw new Error('SVG export did not materialize portable note and label styles');
  if (!svgExport.includes('First export line') || !svgExport.includes('Second export line') || !svgExport.includes('dy="1.35em"')) throw new Error('SVG export collapsed explicit note line breaks');
  if (!(await page.evaluate(() => window.__mappingCanvasPngText.some((text) => text.startsWith('CONVERTED · '))))) throw new Error('PNG export omitted conversion provenance');
  if (!(await page.evaluate(() => window.__mappingCanvasPngText.includes('Approved path')))) throw new Error('PNG export omitted the visible connector label');
  if (!(await page.evaluate(() => window.__mappingCanvasPngText.includes('First export line') && window.__mappingCanvasPngText.includes('Second export line')))) throw new Error('PNG export collapsed explicit note line breaks');
  const jsonExport = JSON.parse(await readFile(`${outputRoot}canvas.json`, 'utf8'));
  const exportArrowIds = new Set(exportArrow.objectIds);
  const exportedArrowObjects = jsonExport.objects.filter(({ id }) => exportArrowIds.has(id));
  if (exportedArrowObjects.length !== 2 || !exportedArrowObjects.every(({ kind, color, points }) => kind === 'stroke' && color === '#0057b8' && points.length >= 3) || !svgExport.includes('stroke="#0057b8"')) throw new Error('Semantic freehand arrow was not retained in JSON and SVG exports');
  const exportedDrawingColors = jsonExport.objects.filter((object) => ['stroke', 'rectangle', 'ellipse', 'arrow'].includes(object.kind) && !exportArrowIds.has(object.id)).map((object) => object.color);
  if (!exportedDrawingColors.length || !exportedDrawingColors.every((color) => color === '#007a4d') || !svgExport.includes('stroke="#007a4d"')) throw new Error('JSON or SVG export lost the resolved Growth color');
  if (!(await page.evaluate(() => window.__mappingCanvasPngStrokes.includes('#007a4d') && window.__mappingCanvasPngStrokes.includes('#0057b8') && window.__mappingCanvasPngStrokes.includes('#fcaa2d')))) throw new Error('PNG export lost drawing, semantic arrow, or structural colors');
  await page.evaluate((changeId) => window.__drawWebMcpTools.draw_revert_change.execute({ changeId }), exportArrow.changeId);
  await page.waitForTimeout(300);

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
  if (!(await mobile.page.getByRole('img', { name: 'CREATE SOMETHING .agency' }).isVisible())) throw new Error('Mobile CREATE SOMETHING logo is unavailable');
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
  console.log(JSON.stringify({ baseUrl, runLabel, semantic: { version: semantic.version, drawToolCount: semantic.drawNames.length, registeredToolCount: semantic.names.length, connectorVisible: semantic.connectorVisible, restored: semantic.restoredCount === semantic.beforeCount }, desktop: { exports, countBeforeReload, countAfterReload }, mobile: mobileCritical, offlineShell, result: 'pass' }, null, 2));
} finally {
  await browser.close();
}
