import { describe, expect, it, vi } from 'vitest';
import { createDocument, type CanvasDocument } from './document';
import { emptyRegistry, exportRegistry, importRegistry } from './session-registry';
import { createSessionRegistryPilot, digest, type RegistryStore, type RegistryBoundary } from './session-registry-pilot';
import { drawRevision } from './webmcp';
import { validateBundleStructure } from './session-registry-bundle';

const scope = { clientId: 'synthetic-a', workspaceId: 'workspace-a' };
const other = { clientId: 'synthetic-b', workspaceId: 'workspace-b' };
const session = { provider: 'codex' as const, sourceId: 'fixture', providerSessionId: 'fixture-session' };
const document = (id: string): CanvasDocument => ({ ...createDocument(`Synthetic ${id}`), id });
function harness(initial: CanvasDocument[] = []) {
  let bytes = exportRegistry(emptyRegistry());
  const maps = new Map(initial.map(doc => [doc.id, structuredClone(doc)]));
  let tail: Promise<unknown> = Promise.resolve();
  const store: RegistryStore = {
    read: async () => importRegistry(bytes),
    update: change => {
      const promise = tail.then(() => { const next = change(importRegistry(bytes)); bytes = exportRegistry(next.state); return next.result; });
      tail = promise.catch(() => undefined);
      return promise;
    }
  };
  const restore = vi.fn(async (doc: CanvasDocument) => {
    if (maps.has(doc.id)) return false;
    maps.set(doc.id, structuredClone(doc));
    return true;
  });
  const boundary: RegistryBoundary = {
    readMap: async id => structuredClone(maps.get(id) ?? null),
    revision: drawRevision,
    edit: vi.fn(async () => ({ status: 'failed' as const })),
    inspectRestoreSlot: async id => ({ occupied: maps.has(id), document: structuredClone(maps.get(id) ?? null) }),
    restoreMap: restore
  };
  const open = () => createSessionRegistryPilot(store, boundary);
  return { maps, store, boundary, restore, open };
}
async function fixture() {
  const doc = document('map-a'), h = harness([doc]), pilot = h.open();
  await pilot.register(scope, doc.id);
  await pilot.link(scope, doc.id, session, true);
  const expectedRevision = drawRevision(doc);
  const commands = [{ type: 'rename', ids: [], name: 'fixture' }];
  h.boundary.edit = vi.fn(async () => ({ status: 'committed' as const, resultingRevision: expectedRevision, contentHash: await digest(doc) }));
  const receipt = await pilot.edit(scope, doc.id, 'fixture-operation', expectedRevision, commands, session);
  return { doc, h, bundle: await pilot.exportBundle(scope, true), expectedRevision, commands, receipt };
}
describe('portable local map bundles', () => {
  it('validates a detached closed bundle and rejects extra transcript fields and membership mismatches', async () => {
    const { bundle } = await fixture();
    const detached = validateBundleStructure(bundle, scope);
    expect(detached).toEqual(bundle);
    expect(detached).not.toBe(bundle);
    detached.maps[0].document.title = 'Detached mutation';
    expect(bundle.maps[0].document.title).not.toBe('Detached mutation');
    expect(() => validateBundleStructure({ ...bundle, transcript: 'forbidden' }, scope)).toThrow('unknown field');
    expect(() => validateBundleStructure({ ...bundle, maps: [] }, scope)).toThrow('membership');
    const nested = structuredClone(bundle);
    Object.assign(nested.maps[0].document, { providerCredential: 'forbidden' });
    expect(() => validateBundleStructure(nested, scope)).toThrow('unknown field');
  });
  it('rejects content hash tampering before accepting reservations or copying maps', async () => {
    const { bundle } = await fixture(), target = harness();
    const tampered = structuredClone(bundle);
    tampered.maps[0].document.title = 'Tampered content';
    await expect(target.open().importBundle(scope, tampered, true)).rejects.toThrow('hash mismatch');
    expect(target.restore).not.toHaveBeenCalled();
    expect(await target.store.read()).toEqual(emptyRegistry());
    expect(target.maps.size).toBe(0);
  });
  it('rejects accessors and non-JSON values without evaluating getters', async () => {
    const { bundle } = await fixture();
    const getter = vi.fn(() => 'secret');
    const suspicious = { ...bundle };
    Object.defineProperty(suspicious, 'extra', { enumerable: true, get: getter });
    expect(() => validateBundleStructure(suspicious, scope)).toThrow('non-JSON');
    expect(getter).not.toHaveBeenCalled();
    expect(() => validateBundleStructure({ ...bundle, extra: undefined }, scope)).toThrow('plain JSON');
  });
  it('refuses export when canonical stored content differs from current in-memory content', async () => {
    const source = await fixture();
    source.h.boundary.readMap = async () => ({ ...source.doc, title: 'Unsaved current map' });
    await expect(source.h.open().exportBundle(scope, true)).rejects.toThrow();
  });

  it('restores canonical document, stable hash, references and once-only receipts into a fresh store across reopen', async () => {
    const source = await fixture(), target = harness();
    const result = await target.open().importBundle(scope, source.bundle, true);
    expect(result).toEqual({ status: 'complete', importedMapIds: [source.doc.id] });
    expect(target.maps.get(source.doc.id)).toEqual(source.doc);
    const reopened = target.open();
    const [resolved] = await reopened.resolve(scope, session);
    expect(resolved.document).toEqual(source.doc);
    expect(resolved.contentHash).toBe(await digest(source.doc));
    expect(await reopened.exportScope(scope)).toBe(await source.h.open().exportScope(scope));
    const replay = await reopened.edit(scope, source.doc.id, 'fixture-operation', source.expectedRevision, source.commands, session);
    expect(replay.duplicate).toBe(true);
    expect(replay.receipt).toEqual(source.receipt.receipt);
    expect(target.boundary.edit).not.toHaveBeenCalled();
  });
  it('requires consent and rejects another scope before any map or registry changes', async () => {
    const source = await fixture(), target = harness(), pilot = target.open();
    const before = await target.store.read();
    await expect(pilot.importBundle(scope, source.bundle, false as true)).rejects.toThrow();
    await expect(pilot.importBundle(other, source.bundle, true)).rejects.toThrow();
    expect(target.restore).not.toHaveBeenCalled();
    expect(target.maps.size).toBe(0);
    expect(await target.store.read()).toEqual(before);
    await expect(source.h.open().exportBundle(scope, false as true)).rejects.toThrow();
  });
  it('rejects occupied unregistered identities even when content is identical', async () => {
    const source = await fixture(), target = harness([source.doc]);
    await expect(target.open().importBundle(scope, source.bundle, true)).rejects.toThrow();
    expect(target.restore).not.toHaveBeenCalled();
    expect(target.maps.get(source.doc.id)).toEqual(source.doc);
    expect(await target.store.read()).toEqual(emptyRegistry());
  });
  it('rejects an ID already registered to another client without changing its records', async () => {
    const source = await fixture(), target = harness([source.doc]);
    await target.open().register(other, source.doc.id);
    await target.open().link(other, source.doc.id, session, true);
    const before = await target.store.read();
    await expect(target.open().importBundle(scope, source.bundle, true)).rejects.toThrow('duplicate identity');
    expect(await target.store.read()).toEqual(before);
    expect(target.maps.get(source.doc.id)).toEqual(source.doc);
    expect(target.restore).not.toHaveBeenCalled();
  });
  it('rejects occupied non-Canvas slots before copying anything', async () => {
    const source = await fixture(), target = harness();
    target.boundary.inspectRestoreSlot = async () => ({ occupied: true, document: null });
    await expect(target.open().importBundle(scope, source.bundle, true)).rejects.toThrow('collision');
    expect(await target.store.read()).toEqual(emptyRegistry());
    expect(target.restore).not.toHaveBeenCalled();
  });
  it('preserves rich notes, connectors, groups, and conversion snapshots exactly', async () => {
    const doc = document('map-complete');
    const shape = { id: 'shape', kind: 'rectangle' as const, createdAt: doc.createdAt, from: { x: 1, y: 2 }, to: { x: 60, y: 80 }, color: '#fcaa2d', rotation: 15, fill: 'none' };
    doc.objects = [shape,
      { id: 'note', kind: 'note', createdAt: doc.createdAt, x: 90, y: 10, width: 200, height: 100, text: 'Synthetic decision', content: { blocks: [{ type: 'paragraph', runs: [{ text: 'Synthetic decision', bold: true }] }] }, sourceIds: ['original-shape'], sourceSnapshot: [{ ...shape, id: 'original-shape' }] },
      { id: 'connector', kind: 'connector', createdAt: doc.createdAt, fromId: 'shape', toId: 'note', label: 'Synthetic link' },
      { id: 'group', kind: 'group', createdAt: doc.createdAt, x: 0, y: 0, width: 320, height: 120, label: 'Synthetic group', childIds: ['shape', 'note'] }
    ];
    const source = harness([doc]), target = harness();
    await source.open().register(scope, doc.id);
    const bundle = await source.open().exportBundle(scope, true);
    expect((await target.open().importBundle(scope, bundle, true)).status).toBe('complete');
    expect(target.maps.get(doc.id)).toEqual(doc);
    expect(await digest(target.maps.get(doc.id))).toBe(bundle.maps[0].contentHash);
  });
  it('rejects changed canonical content in the same registered scope without overwriting it', async () => {
    const source = await fixture(), changed = { ...source.doc, title: 'Synthetic conflict' }, target = harness([changed]);
    await target.open().register(scope, changed.id);
    const before = await target.store.read();
    await expect(target.open().importBundle(scope, source.bundle, true)).rejects.toThrow();
    expect(target.maps.get(changed.id)).toEqual(changed);
    expect(target.restore).not.toHaveBeenCalled();
    expect(await target.store.read()).toEqual(before);
  });
  it('reports incomplete after a failed create and safely recovers by retrying the same bundle', async () => {
    const source = await fixture(), target = harness();
    target.restore.mockResolvedValueOnce(false);
    const interrupted = await target.open().importBundle(scope, source.bundle, true);
    expect(interrupted.status).toBe('incomplete');
    expect(interrupted.importedMapIds).toEqual([]);
    expect((await target.store.read()).links).toEqual([]);
    expect((await target.store.read()).receipts).toEqual([]);
    expect((await target.open().importBundle(scope, source.bundle, true)).status).toBe('complete');
    expect(target.maps.get(source.doc.id)).toEqual(source.doc);
    expect((await target.open().resolve(scope, session))[0].contentHash).toBe(await digest(source.doc));
  });
  it('keeps a partially copied multi-map bundle explicit and resumes without recopying accepted maps', async () => {
    const first = document('map-first'), second = document('map-second');
    const source = harness([first, second]), target = harness();
    for (const doc of [first, second]) {
      await source.open().register(scope, doc.id);
      await source.open().link(scope, doc.id, session, true);
    }
    const bundle = await source.open().exportBundle(scope, true);
    target.restore.mockImplementationOnce(async doc => { target.maps.set(doc.id, structuredClone(doc)); return true; }).mockResolvedValueOnce(false);
    const interrupted = await target.open().importBundle(scope, bundle, true);
    expect(interrupted.status).toBe('incomplete');
    expect(interrupted.importedMapIds).toEqual([first.id]);
    expect(target.maps.get(first.id)).toEqual(first);
    expect(target.maps.has(second.id)).toBe(false);
    expect((await target.store.read()).links).toEqual([]);
    target.restore.mockClear();
    const recovered = await target.open().importBundle(scope, bundle, true);
    expect(recovered.status).toBe('complete');
    expect(recovered.importedMapIds).toEqual([first.id, second.id]);
    expect(target.restore).toHaveBeenCalledTimes(1);
    expect(target.restore).toHaveBeenCalledWith(second);
    expect(await target.open().resolve(scope, session)).toHaveLength(2);
  });
  it('reimporting an accepted exact bundle neither overwrites maps nor duplicates links or receipts', async () => {
    const source = await fixture(), target = harness(), pilot = target.open();
    await pilot.importBundle(scope, source.bundle, true);
    const before = await target.store.read();
    target.restore.mockClear();
    expect((await pilot.importBundle(scope, source.bundle, true)).status).toBe('complete');
    expect(target.restore).not.toHaveBeenCalled();
    expect(await target.store.read()).toEqual(before);
  });
  it('reports copied maps as incomplete if final registry publication fails, then resumes', async () => {
    const source = await fixture(), target = harness();
    let writes = 0;
    const failing: RegistryStore = { read: target.store.read, update: change => ++writes === 2 ? Promise.reject(new Error('Disk full')) : target.store.update(change) };
    const result = await createSessionRegistryPilot(failing, target.boundary).importBundle(scope, source.bundle, true);
    expect(result.status).toBe('incomplete');
    expect(result.importedMapIds).toEqual([source.doc.id]);
    expect(target.maps.get(source.doc.id)).toEqual(source.doc);
    expect((await target.store.read()).links).toEqual([]);
    target.restore.mockClear();
    expect((await target.open().importBundle(scope, source.bundle, true)).status).toBe('complete');
    expect(target.restore).not.toHaveBeenCalled();
    expect((await target.open().resolve(scope, session))[0].contentHash).toBe(source.bundle.maps[0].contentHash);
  });
});
