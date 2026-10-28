import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.CANVAS_URL ?? 'http://127.0.0.1:5206';
const output = new URL(`../output/${process.env.CANVAS_RUN_LABEL ?? 'completed-activity'}/`, import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ ...(process.env.CANVAS_BROWSER_CHANNEL ? { channel: process.env.CANVAS_BROWSER_CHANNEL } : {}) });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      window.__tools = {};
      Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool(tool) { window.__tools[tool.name] = tool; } } });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const call = (name, input = {}) => page.evaluate(({ name, input }) => window.__tools[name].execute(input), { name, input });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!window.__tools.draw_agent_activity);
    const start = page.getByRole('button', { name: 'Start sketching', exact: true });
    if (await start.isVisible()) await start.click();
    const annotation = { id: 'operator-annotation', kind: 'note', createdAt: '2026-10-23T00:00:00Z', x: 50, y: 50, width: 300, height: 140, text: 'Operator annotation: preserve this note.' };
    await call('draw_apply_operations', { operations: [{ type: 'put_object', object: annotation }] });
    const before = await call('draw_get_state');
    const panel = page.getByRole('region', { name: 'Agent activity' });
    await expect(panel).toHaveAttribute('data-state', 'completed');
    // Public symptom: completed activity must be compact without an operator action.
    const collapsed = await panel.boundingBox();
    await writeFile(new URL(`initial-size-${width}.json`, output), JSON.stringify({ base, width, collapsed }, null, 2));
    assert(collapsed.height <= 48, `Completed card still obstructs the canvas: ${collapsed.height}px`);
    await expect(panel).toHaveAttribute('data-expanded', 'false');
    const show = page.getByRole('button', { name: 'Show completed agent activity', exact: true });
    await expect(show).toHaveAttribute('aria-expanded', 'false');
    await show.focus();
    await page.keyboard.press('Enter');
    const hide = page.getByRole('button', { name: 'Hide completed agent activity', exact: true });
    await expect(hide).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Follow agent', exact: true })).toBeVisible();
    await page.keyboard.press('Space');
    await expect(show).toHaveAttribute('aria-expanded', 'false');
    await expect(show).toBeFocused();
    // Unrelated operator focus must survive an automatic completion.
    await page.getByLabel('Canvas title').focus();
    await call('draw_inspect', { ids: [annotation.id] });
    await expect(page.getByLabel('Canvas title')).toBeFocused();
    await expect(show).toBeVisible();
    const task = await call('draw_agent_activity', { state: 'begin', label: 'Review synthetic actions', ids: [annotation.id] });
    await expect(panel).toHaveAttribute('data-state', 'working');
    await expect(panel).toHaveAttribute('data-expanded', 'true');
    await expect(panel).toContainText('Review synthetic actions');
    await expect(show).toHaveCount(0);
    await call('draw_agent_activity', { state: 'waiting', taskId: task.task.id, label: 'Approval required before applying', ids: [] });
    await expect(panel).toHaveAttribute('data-state', 'waiting');
    await expect(panel).toHaveAttribute('data-expanded', 'true');
    await expect(panel).toContainText('Approval required before applying');
    // Focus on a control which completion will hide must return to disclosure.
    await page.getByRole('button', { name: 'Follow agent', exact: true }).focus();
    await call('draw_agent_activity', { state: 'completed', taskId: task.task.id, label: 'Synthetic review complete', ids: [] });
    await expect(show).toBeFocused();
    await expect(panel).toHaveAttribute('data-expanded', 'false');
    await show.click();
    await expect(panel).toContainText('Synthetic review complete');
    await expect(hide).toHaveAttribute('aria-controls', /.+/);
    const controlled = await hide.getAttribute('aria-controls');
    await expect(page.locator(`[id="${controlled}"]`)).toBeVisible();
    const failed = await call('draw_agent_activity', { state: 'begin', label: 'A later task', ids: [] });
    const activeHeader = page.getByRole('button', { name: 'Agent activity: Working · reported by agent', exact: true });
    await expect(activeHeader).toBeFocused();
    await expect(activeHeader).toHaveAttribute('aria-disabled', 'true');
    await activeHeader.press('Space');
    await expect(panel).toHaveAttribute('data-expanded', 'true');
    await call('draw_agent_activity', { state: 'failed', taskId: failed.task.id, label: 'Needs owner attention', ids: [] });
    await expect(panel).toHaveAttribute('data-state', 'failed');
    await expect(panel).toHaveAttribute('data-expanded', 'true');
    await expect(panel).toContainText('Needs owner attention');
    await expect(show).toHaveCount(0);
    // A tool error must remain expanded even after an earlier completed task.
    await expect(call('draw_edit', { expectedRevision: 'stale', commands: [] })).rejects.toThrow();
    await expect(panel).toHaveAttribute('data-state', 'failed');
    await expect(panel).toHaveAttribute('data-expanded', 'true');
    const after = await call('draw_get_state');
    assert.deepEqual(after.document, before.document);
    assert.deepEqual(after.document.objects, [annotation]);
    const retry = await call('draw_agent_activity', { state: 'begin', label: 'Finish synthetic verification', ids: [] });
    await call('draw_agent_activity', { state: 'completed', taskId: retry.task.id, label: 'Verification finished', ids: [] });
    await expect(show).toHaveAttribute('aria-expanded', 'false');
    await page.screenshot({ path: new URL(`completed-${width}.png`, output).pathname });
    await show.click();
    await page.screenshot({ path: new URL(`expanded-${width}.png`, output).pathname });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    // A new synthetic document must not inherit the previous completion disclosure.
    page.once('dialog', dialog => dialog.accept());
    await page.locator('.file-menu summary').click();
    await page.getByRole('button', { name: 'New canvas', exact: true }).click();
    await expect(panel).toHaveCount(0);
    const replacement = await call('draw_get_state');
    assert.notEqual(replacement.document.id, before.document.id);
    assert.deepEqual(replacement.document.objects, []);
    await expect(show).toHaveAttribute('aria-expanded', 'false');
    await writeFile(new URL(`receipt-${width}.json`, output), JSON.stringify({ base, width, passed: true, collapsed, errors, documentUnchanged: true }, null, 2));
    await context.close();
    console.log(`Completed activity ${width}: passed`);
  }
} finally { await browser.close(); }
