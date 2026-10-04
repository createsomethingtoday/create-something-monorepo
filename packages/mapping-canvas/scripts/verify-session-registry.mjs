import { chromium, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Synthetic references only. Real browser + IndexedDB, no provider or CTX calls.
const base = process.env.CANVAS_URL || 'http://127.0.0.1:5197';
const profile = await mkdtemp(join(tmpdir(), 'draw-registry-fixture-'));
const restoredProfile = await mkdtemp(join(tmpdir(), 'draw-registry-bundle-'));
const scope = { clientId: 'synthetic-a', workspaceId: 'workspace-a' };
const otherScope = { clientId: 'synthetic-b', workspaceId: 'workspace-b' };
const claude = { provider: 'claude', sourceId: 'fixture-local', providerSessionId: 'claude-fixture' };
const codex = { provider: 'codex', sourceId: 'fixture-local', providerSessionId: 'codex-fixture' };
let context;
const errors = [];
async function open(url, activeProfile = profile) {
  context = await chromium.launchPersistentContext(activeProfile, { headless: true, ...(process.env.DRAW_CHROMIUM_PATH ? { executablePath: process.env.DRAW_CHROMIUM_PATH } : {}), viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    window.__tools = {};
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool(tool) { window.__tools[tool.name] = tool; } } });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(async () => {
    try { await window.__tools.draw_get_state.execute({}); return true; } catch { return false; }
  });
  const start = page.getByRole('button', { name: 'Start sketching', exact: true });
  if (await start.isVisible()) await start.click();
  return { page, call: (name, input = {}) => page.evaluate(async ({ name, input }) => window.__tools[name].execute(input), { name, input }) };
}
try {
  let { page, call } = await open(base);
  expect(await page.evaluate(() => Object.keys(window.__tools).some(name => name.startsWith('draw_registry_')))).toBe(false);
  await context.close();
  ({ page, call } = await open(`${base}/?registryPilot=1`));
  const original = (await call('draw_get_state')).document;
  const mapId = original.id;
  await call('draw_apply_operations', { operations: [
    { type: 'set_title', title: 'Synthetic client A' },
    { type: 'put_object', object: { id: 'fixture-rectangle', kind: 'rectangle', createdAt: '2026-10-04T00:00:00Z', from: { x: 50, y: 50 }, to: { x: 100, y: 100 }, color: '#fcaa2d' } }
  ] });
  await call('draw_registry_register', { scope, mapId });
  await call('draw_registry_link', { scope, mapId, session: claude, optIn: true });
  await call('draw_registry_link', { scope, mapId, session: codex, optIn: true });
  const expectedRevision = (await call('draw_inspect')).revision;
  const editInput = { scope, mapId, session: codex, operationId: 'fixture-op-1', expectedRevision, commands: [{ type: 'transform', ids: ['fixture-rectangle'], x: 180, y: 200 }] };
  const first = await call('draw_registry_edit', editInput);
  expect(first.receipt.status).toBe('committed');
  expect(first.duplicate).toBe(false);
  const duplicate = await call('draw_registry_edit', editInput);
  expect(duplicate.duplicate).toBe(true);
  expect(duplicate.receipt).toEqual(first.receipt);
  const stale = await call('draw_registry_edit', { ...editInput, operationId: 'fixture-op-stale' });
  expect(stale.receipt.status).toBe('failed');
  const beforeRestart = await call('draw_registry_resolve', { scope, session: codex });
  expect(beforeRestart[0].contentHash).toBe(first.receipt.contentHash);
  expect(await call('draw_registry_resolve', { scope: otherScope, session: codex })).toEqual([]);
  await expect(call('draw_registry_register', { scope: otherScope, mapId })).rejects.toThrow('duplicate identity');

  // A second synthetic canonical map fixture in this same isolated profile.
  await page.evaluate(async () => {
    const { createDocument } = await import('/src/lib/document.ts');
    const { saveCanvasProject } = await import('/src/lib/project-storage.ts');
    await saveCanvasProject({ ...createDocument('Synthetic client B'), id: 'fixture-map-b' }, null);
  });
  await call('draw_registry_register', { scope: otherScope, mapId: 'fixture-map-b' });
  await call('draw_registry_link', { scope: otherScope, mapId: 'fixture-map-b', session: codex, optIn: true });
  expect((await call('draw_registry_resolve', { scope: otherScope, session: codex }))[0].mapId).toBe('fixture-map-b');
  const exported = await call('draw_registry_export', { scope });
  expect(exported.maps).toHaveLength(1);
  expect(JSON.stringify(exported)).not.toContain('Synthetic client');
  await call('draw_registry_import', { scope, registry: exported, optIn: true });
  expect(await call('draw_registry_export', { scope })).toEqual(exported);
  await expect(call('draw_registry_import', { scope: otherScope, registry: exported, optIn: true })).rejects.toThrow('another client');

  await context.close();
  ({ page, call } = await open(`${base}/?project=${encodeURIComponent(mapId)}&registryPilot=1`));
  const recovered = await call('draw_registry_resolve', { scope, session: codex });
  expect(recovered).toEqual(beforeRestart);
  expect((await call('draw_registry_edit', editInput)).receipt).toEqual(first.receipt);
  expect((await call('draw_registry_resolve', { scope, session: claude }))[0].mapId).toBe(mapId);
  const bundle = await call('draw_registry_export_bundle', { scope, optIn: true });
  const sourceDocument = (await call('draw_get_state')).document;
  const sourceRegistry = await call('draw_registry_export', { scope });
  // Existing canonical identity with different content must never be overwritten.
  await page.evaluate(async (mapId) => {
    const { loadCanvasProject, saveCanvasProject } = await import('/src/lib/project-storage.ts');
    const stored = await loadCanvasProject(mapId);
    const conflicting = { ...stored, title: 'Synthetic conflicting map', updatedAt: '2026-10-05T00:00:00.000Z' };
    if (!await saveCanvasProject(conflicting, stored.updatedAt)) throw new Error('Conflict fixture save failed');
  }, mapId);
  const conflictBefore = await page.evaluate(async mapId => (await import('/src/lib/project-storage.ts')).loadCanvasProject(mapId), mapId);
  await expect(call('draw_registry_import_bundle', { scope, bundle, optIn: true })).rejects.toThrow();
  expect(await page.evaluate(async mapId => (await import('/src/lib/project-storage.ts')).loadCanvasProject(mapId), mapId)).toEqual(conflictBefore);
  expect(await call('draw_registry_export', { scope })).toEqual(sourceRegistry);

  await context.close();
  ({ page, call } = await open(`${base}/?registryPilot=1`, restoredProfile));
  const freshRegistry = await call('draw_registry_export', { scope });
  await expect(call('draw_registry_import_bundle', { scope: otherScope, bundle, optIn: true })).rejects.toThrow();
  expect(await call('draw_registry_export', { scope })).toEqual(freshRegistry);
  expect(await call('draw_registry_resolve', { scope, session: codex })).toEqual([]);
  const restored = await call('draw_registry_import_bundle', { scope, bundle, optIn: true });
  expect(restored.status).toBe('complete');
  expect(restored.importedMapIds).toContain(mapId);
  await page.goto(`${base}/?project=${encodeURIComponent(mapId)}&registryPilot=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(async () => { try { await window.__tools.draw_get_state.execute({}); return true; } catch { return false; } });
  expect((await call('draw_get_state')).document).toEqual(sourceDocument);
  expect(await call('draw_registry_resolve', { scope, session: codex })).toEqual(beforeRestart);
  expect(await call('draw_registry_export', { scope })).toEqual(sourceRegistry);
  const replay = await call('draw_registry_edit', editInput);
  expect(replay.duplicate).toBe(true);
  expect(replay.receipt).toEqual(first.receipt);
  expect((await call('draw_get_state')).document).toEqual(sourceDocument);

  await context.close();
  ({ page, call } = await open(`${base}/?project=${encodeURIComponent(mapId)}&registryPilot=1`, restoredProfile));
  expect((await call('draw_get_state')).document).toEqual(sourceDocument);
  expect(await call('draw_registry_resolve', { scope, session: codex })).toEqual(beforeRestart);
  expect((await call('draw_registry_resolve', { scope, session: claude }))[0].contentHash).toBe(first.receipt.contentHash);
  expect((await call('draw_registry_edit', editInput)).duplicate).toBe(true);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ evidence: 'synthetic-browser-fixture', providerSessions: 'references-only', ctxCalls: 0, checks: ['default-off', 'opt-in-links', 'current-canonical-resolution', 'guarded-edit', 'durable-committed-receipt', 'duplicate-once', 'stale-rejection', 'two-client-isolation', 'scoped-export-import', 'browser-process-restart', 'portable-map-bundle-fresh-profile', 'bundle-restart-id-hash-document', 'imported-receipt-replay-once', 'bundle-collision-no-overwrite', 'bundle-wrong-scope-no-change'], result: 'passed' }));
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
  await rm(restoredProfile, { recursive: true, force: true });
}
