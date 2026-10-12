// Real Svelte UI with a revision-checked synthetic native bridge. Run against a
// native build preview; physical app/relaunch qualification is a separate gate.
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.CANVAS_URL || 'http://127.0.0.1:5187';
const output = new URL('../output/native-layers/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
const fixture = {
  version: 'create-something.mapping-canvas.v1', id: 'layers-synthetic',
  title: 'SYNTHETIC — Native Layers regression', background: '#000000',
  createdAt: '2026-10-12T00:00:00Z', updatedAt: '2026-10-12T00:00:00Z',
  viewport: { x: 0, y: 0, zoom: 1 },
  objects: [
    { id: 'rich-note', kind: 'note', name: 'Rich note', x: 450, y: 100, width: 270, height: 130, text: 'Unrelated rich content', content: { blocks: [{ type: 'paragraph', runs: [{ text: 'Unrelated rich content' }] }] }, createdAt: '2026-10-12' },
    { id: 'back', kind: 'rectangle', name: 'Back', from: { x: 100, y: 100 }, to: { x: 300, y: 260 }, color: '#ffffff', fill: '#0057b8', createdAt: '2026-10-12' },
    { id: 'front', kind: 'rectangle', name: 'Front', from: { x: 200, y: 180 }, to: { x: 400, y: 340 }, color: '#ffffff', fill: '#fcaa2d', createdAt: '2026-10-12' }
  ]
};
const results = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 920 } });
  await context.addInitScript(({ fixture }) => {
    const key = 'synthetic-native-layers-authority';
    let state = JSON.parse(localStorage.getItem(key) || 'null') || { document: fixture, revision: 0, past: [], future: [] };
    const clone = value => JSON.parse(JSON.stringify(value));
    const persist = () => localStorage.setItem(key, JSON.stringify(state));
    const snapshot = () => clone({ sessionId: 'layers-session', revision: state.revision, document: state.document, history: { canUndo: !!state.past.length, canRedo: !!state.future.length, depth: state.past.length }, pairedClients: [] });
    window.__layerTest = { snapshot, failNext: false, failRecovery: false, calls: [] };
    window.__TAURI_INTERNALS__ = { invoke: async (command, args = {}) => {
      window.__layerTest.calls.push(command);
      if (command === 'draw_runtime_role') return 'host';
      if (command === 'draw_agent_status') return { active: false };
      if (command === 'draw_host_status') {
        if (window.__layerTest.failRecovery) throw new Error('Synthetic authority unavailable');
        return snapshot();
      }
      if (command === 'draw_host_apply_batch') {
        if (window.__layerTest.failNext) { window.__layerTest.failNext = false; throw new Error('Synthetic commit rejected'); }
        const { request } = args;
        if (request.expectedRevision !== state.revision || request.documentId !== state.document.id) throw new Error('STALE_REVISION');
        const before = clone(state.document);
        for (const operation of request.operations) {
          if (operation.type === 'replace_objects') state.document.objects = clone(operation.objects);
          else if (operation.type === 'put_object') {
            const index = state.document.objects.findIndex(o => o.id === operation.object.id);
            if (index < 0) throw new Error('Synthetic fixture only updates existing layers');
            state.document.objects[index] = clone(operation.object);
          } else throw new Error(`Unexpected layer operation: ${operation.type}`);
        }
        state.past.push(before); state.future = []; state.revision++;
        state.document.updatedAt = new Date().toISOString(); persist();
        return { ...snapshot(), status: 'applied', previousDocument: before };
      }
      if (command === 'draw_host_history') {
        if (args.expectedRevision !== state.revision) throw new Error('STALE_REVISION');
        const from = args.direction === 'undo' ? state.past : state.future;
        const to = args.direction === 'undo' ? state.future : state.past;
        if (!from.length) throw new Error('Empty history');
        to.push(clone(state.document)); state.document = from.pop(); state.revision++; persist();
        return { ...snapshot(), status: 'applied' };
      }
      throw new Error(`Unexpected native call: ${command}`);
    } };
  }, { fixture });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await expect(page.getByText('MAC AUTHORITY', { exact: true })).toBeVisible();
  const toggle = page.getByRole('button', { name: 'Layers', exact: true });
  // Normalize to closed, then test the reported click path rather than only default mounting.
  if (await toggle.getAttribute('aria-expanded') === 'true') await toggle.click();
  await expect(page.getByRole('complementary', { name: 'Layers and properties' })).toHaveCount(0);
  await toggle.click();
  const panel = page.getByRole('complementary', { name: 'Layers and properties' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveAttribute('aria-controls', 'draw-inspector');
  await expect(panel).toBeVisible();
  const panelBox = await panel.boundingBox(), canvasBox = await page.locator('.canvas-frame').boundingBox();
  expect(canvasBox.x + canvasBox.width).toBeLessThanOrEqual(panelBox.x + 1);
  const row = name => panel.getByRole('button', { name: `rectangle ${name}`, exact: true });
  const shape = id => page.locator(`[data-object-id="${id}"]`);
  const authority = () => page.evaluate(() => window.__layerTest.snapshot());
  const commit = async action => { const revision = (await authority()).revision; await action(); await expect.poll(async () => (await authority()).revision).toBe(revision + 1); };
  const order = () => page.locator('svg[aria-label="Canvas objects"] [data-object-id]').evaluateAll(nodes => nodes.map(n => n.dataset.objectId));
  await row('Back').click();
  await expect(row('Back')).toHaveAttribute('aria-pressed', 'true');
  await expect(shape('back')).toHaveClass(/selected/);
  await row('Front').click({ modifiers: ['Shift'] });
  await expect(panel.getByText('2 selected', { exact: true })).toBeVisible();
  await row('Back').click();
  await commit(() => panel.getByRole('button', { name: 'Forward', exact: true }).click());
  expect(await order()).toEqual(['rich-note', 'front', 'back']);
  await commit(() => panel.getByRole('button', { name: 'Backward', exact: true }).click());
  expect(await order()).toEqual(['rich-note', 'back', 'front']);
  await commit(() => panel.getByRole('button', { name: 'Hide layer Back', exact: true }).click());
  await expect(shape('back')).toHaveCount(0);
  await commit(() => page.getByRole('button', { name: 'Undo', exact: true }).click());
  await expect(shape('back')).toBeVisible();
  await commit(() => page.getByRole('button', { name: 'Redo', exact: true }).click());
  await expect(shape('back')).toHaveCount(0);
  await commit(() => panel.getByRole('button', { name: 'Show layer Back', exact: true }).click());
  await row('Back').click();
  await commit(() => panel.getByRole('button', { name: 'Lock layer Back', exact: true }).click());
  await expect(panel.getByLabel('Selection x', { exact: true })).toBeDisabled();
  await expect(panel.getByRole('button', { name: 'Forward', exact: true })).toBeDisabled();
  await commit(() => panel.getByRole('button', { name: 'Unlock layer Back', exact: true }).click());
  await expect(panel.getByLabel('Selection x', { exact: true })).toBeEnabled();
  await commit(() => panel.getByRole('button', { name: 'Forward', exact: true }).click());
  await commit(() => panel.getByRole('button', { name: 'Hide layer Back', exact: true }).click());
  await commit(() => panel.getByRole('button', { name: 'Lock layer Back', exact: true }).click());
  const saved = (await authority()).document;
  await page.reload();
  await expect(page.getByText('MAC AUTHORITY', { exact: true })).toBeVisible();
  await expect(panel).toBeVisible();
  expect((await authority()).document).toEqual(saved);
  await expect(shape('back')).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'Unlock layer Back', exact: true })).toBeVisible();
  expect(saved.objects.map(o => o.id)).toEqual(['rich-note', 'front', 'back']);
  // Failed native commit must reconcile to authority rather than leaving an optimistic hide.
  await page.evaluate(() => { window.__layerTest.failNext = true; });
  await panel.getByRole('button', { name: 'Hide layer Front', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Synthetic commit rejected');
  await expect(shape('front')).toBeVisible();
  expect((await authority()).document).toEqual(saved);
  await page.screenshot({ path: new URL('host.png', output).pathname });
  await page.setViewportSize({ width: 780, height: 600 });
  await expect(toggle).toBeVisible();
  await expect(panel).toHaveCount(0);
  await toggle.click();
  await expect(panel).toBeVisible();
  await panel.getByLabel('Search layers').focus();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await toggle.click();
  await expect(panel).toBeVisible();
  await toggle.click();
  await expect(panel).toHaveCount(0);
  await expect(shape('front')).toBeVisible();
  await page.screenshot({ path: new URL('host-narrow.png', output).pathname });
  results.push('780px Mac window retains Layers toggle, open/close, Escape focus return and canvas access');
  expect(errors).toEqual([]);
  results.push('Host open/close and layout; row/multi-selection; SVG stacking; hide/show; lock/unlock; native undo/redo; bridge reload persistence; failed commit reconciliation');
  await context.close();
  for (const role of ['web', 'companion']) {
    const other = await browser.newContext({ viewport: { width: 1440, height: 920 } });
    if (role === 'companion') await other.addInitScript(() => { window.__TAURI_INTERNALS__ = { invoke: async name => {
      if (name === 'draw_runtime_role') return 'companion';
      if (name === 'draw_companion_status') return { status: 'unpaired' };
      throw new Error(`Unexpected companion call: ${name}`);
    } }; });
    const otherPage = await other.newPage(); await otherPage.goto(base);
    await expect(otherPage.getByText(role === 'web' ? 'LOCAL CANVAS' : 'IPHONE COMPANION', { exact: true })).toBeVisible();
    if (role === 'web') await expect(otherPage.getByRole('complementary', { name: 'Layers and properties' })).toBeVisible();
    else { await expect(otherPage.getByRole('button', { name: 'Layers', exact: true })).toHaveCount(0); await expect(otherPage.locator('#draw-inspector')).toHaveCount(0); }
    results.push(`${role} inspector eligibility preserved`); await other.close();
  }
  await writeFile(new URL('results.json', output), JSON.stringify({ passed: true, results }, null, 2));
  console.log(results.join('\n'));
} finally { await browser.close(); }
