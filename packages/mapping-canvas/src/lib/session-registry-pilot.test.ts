import { describe, expect, it, vi } from 'vitest';
import { createDocument } from './document';
import { drawRevision } from './webmcp';
import { emptyRegistry, exportRegistry, importRegistry, recordReceipt, validateState } from './session-registry';
import { createSessionRegistryPilot, digest, type RegistryStore, type RegistryBoundary } from './session-registry-pilot';

const a = { clientId: 'client-a', workspaceId: 'workspace-a' };
const b = { clientId: 'client-b', workspaceId: 'workspace-b' };
const claude = { provider: 'claude' as const, sourceId: 'local-fixture', providerSessionId: 'claude-fixture-1' };
const codex = { provider: 'codex' as const, sourceId: 'local-fixture', providerSessionId: 'codex-fixture-2' };

// Models atomic persistence through serialized bytes, not a live provider session.
function harness() {
  let bytes = exportRegistry(emptyRegistry());
  let tail: Promise<unknown> = Promise.resolve();
  const store: RegistryStore = {
    read: async () => importRegistry(bytes),
    update: change => {
      const result = tail.then(() => {
        const changed = change(importRegistry(bytes));
        bytes = exportRegistry(changed.state);
        return changed.result;
      });
      tail = result.catch(() => undefined);
      return result;
    }
  };
  let document = { ...createDocument('Synthetic fixture'), id: 'map-a' };
  const boundary: RegistryBoundary = {
    readMap: async id => id === document.id ? structuredClone(document) : null,
    revision: drawRevision,
    edit: vi.fn(async (mapId, expectedRevision, commands) => {
      if (mapId !== document.id || drawRevision(document) !== expectedRevision) return { status: 'failed' as const };
      document = { ...document, title: String((commands as { title: string }[])[0].title), updatedAt: '2026-10-04T20:00:00Z' };
      return { status: 'committed' as const, resultingRevision: drawRevision(document), contentHash: await digest(document) };
    })
  };
  const open = () => createSessionRegistryPilot(store, boundary);
  return { store, boundary, open, document: () => document, setDocument: (next: typeof document) => { document = next; } };
}

describe('bounded Draw session registry pilot', () => {
  it('links Claude and later Codex references to the same current map across reopen', async () => {
    const h = harness(), pilot = h.open();
    await pilot.register(a, 'map-a');
    await pilot.link(a, 'map-a', claude, true);
    await pilot.link(a, 'map-a', codex, true);
    h.setDocument({ ...h.document(), title: 'Current canonical map' });
    const reopened = h.open();
    const [result] = await reopened.resolve(a, codex);
    expect(result.document?.title).toBe('Current canonical map');
    expect(result.revision).toBe(drawRevision(h.document()));
    expect(result.contentHash).toBe(await digest(h.document()));
    expect(await reopened.resolve(a, claude)).toEqual([result]);
    expect(await reopened.resolve(b, codex)).toEqual([]);
  });

  it('requires opt-in, exact source authority and provider identity', async () => {
    const h = harness(), pilot = h.open();
    await pilot.register(a, 'map-a');
    await expect(pilot.link(a, 'map-a', claude, false as true)).rejects.toThrow('opt-in');
    await pilot.link(a, 'map-a', claude, true);
    expect(await pilot.resolve(a, { ...claude, sourceId: 'other-source' })).toEqual([]);
    expect(await pilot.resolve(a, { ...claude, provider: 'codex' })).toEqual([]);
  });
  it('binds edit provenance to an explicitly linked provider session', async () => {
    const h = harness(), pilot = h.open();
    await pilot.register(a, 'map-a');
    const expected = drawRevision(h.document());
    await expect(pilot.edit(a, 'map-a', 'op', expected, [{ title: 'Changed' }], codex)).rejects.toThrow('not linked');
    expect(h.boundary.edit).not.toHaveBeenCalled();
    await pilot.link(a, 'map-a', codex, true);
    const result = await pilot.edit(a, 'map-a', 'op', expected, [{ title: 'Changed' }], codex);
    expect(result.receipt.session).toEqual(codex);
    expect(result.receipt.status).toBe('committed');
  });

  it('rejects assignment of the same canonical map ID to another scope', async () => {
    const h = harness();
    await h.open().register(a, 'map-a');
    await expect(h.open().register(b, 'map-a')).rejects.toThrow('duplicate identity');
    await expect(h.open().edit(b, 'map-a', 'op-1', drawRevision(h.document()), [])).rejects.toThrow('not registered');
  });

  it('reserves once under concurrent replay and retains committed receipt after reopen', async () => {
    const h = harness(), pilot = h.open();
    await pilot.register(a, 'map-a');
    const expected = drawRevision(h.document()), commands = [{ title: 'Changed once' }];
    const results = await Promise.all([pilot.edit(a, 'map-a', 'op-1', expected, commands), pilot.edit(a, 'map-a', 'op-1', expected, commands)]);
    expect(h.boundary.edit).toHaveBeenCalledTimes(1);
    expect(results.some(result => result.receipt.status === 'committed')).toBe(true);
    const replay = await h.open().edit(a, 'map-a', 'op-1', expected, commands);
    expect(replay.duplicate).toBe(true);
    expect(replay.receipt.status).toBe('committed');
    await expect(pilot.edit(a, 'map-a', 'op-1', expected, [{ title: 'Different' }])).rejects.toThrow('reused');
  });

  it('rejects stale revision without invoking Draw; a new operation can replan', async () => {
    const h = harness(), pilot = h.open();
    await pilot.register(a, 'map-a');
    const result = await pilot.edit(a, 'map-a', 'op-stale', 'stale', [{ title: 'Wrong' }]);
    expect(result.receipt.status).toBe('failed');
    expect(h.boundary.edit).not.toHaveBeenCalled();
    const replanned = await pilot.edit(a, 'map-a', 'op-new', drawRevision(h.document()), [{ title: 'Replanned' }]);
    expect(replanned.receipt.status).toBe('committed');
  });

  it('keeps mutation uncertainty durable and never replays a thrown boundary', async () => {
    const h = harness(), pilot = h.open();
    await pilot.register(a, 'map-a');
    h.boundary.edit = vi.fn(async () => { throw new Error('Transport interrupted after mutation'); });
    const expected = drawRevision(h.document()), commands = [{ title: 'Uncertain' }];
    expect((await pilot.edit(a, 'map-a', 'op-unknown', expected, commands)).receipt.status).toBe('unknown');
    expect((await h.open().edit(a, 'map-a', 'op-unknown', expected, commands)).receipt.status).toBe('unknown');
    expect(h.boundary.edit).toHaveBeenCalledTimes(1);
  });

  it('fails closed before edit when the durable reservation cannot be written', async () => {
    const h = harness();
    await h.open().register(a, 'map-a');
    const failing = createSessionRegistryPilot({ read: h.store.read, update: async () => { throw new Error('Disk unavailable'); } }, h.boundary);
    await expect(failing.edit(a, 'map-a', 'op', drawRevision(h.document()), [])).rejects.toThrow('Disk unavailable');
    expect(h.boundary.edit).not.toHaveBeenCalled();
  });

  it('returns durable unknown if commit receipt storage fails after an edit', async () => {
    const h = harness();
    await h.open().register(a, 'map-a');
    let writes = 0;
    const store: RegistryStore = { read: h.store.read, update: change => ++writes === 2 ? Promise.reject(new Error('Disk full')) : h.store.update(change) };
    const pilot = createSessionRegistryPilot(store, h.boundary);
    const expected = drawRevision(h.document()), commands = [{ title: 'Applied' }];
    const result = await pilot.edit(a, 'map-a', 'op', expected, commands);
    expect(h.document().title).toBe('Applied');
    expect(result.receipt.status).toBe('unknown');
    expect((await h.open().edit(a, 'map-a', 'op', expected, commands)).receipt.status).toBe('unknown');
    expect(h.boundary.edit).toHaveBeenCalledTimes(1);
  });

  it('distinguishes committed from verified without changing committed content', async () => {
    const h = harness(), pilot = h.open();
    await pilot.register(a, 'map-a');
    const { receipt } = await pilot.edit(a, 'map-a', 'op', drawRevision(h.document()), [{ title: 'Saved' }]);
    expect(receipt.status).toBe('committed');
    const state = await h.store.read();
    expect(recordReceipt(state, { ...receipt, status: 'verified' }).receipts[0].status).toBe('verified');
    expect(() => recordReceipt(state, { ...receipt, status: 'verified', contentHash: '0'.repeat(64) })).toThrow('cannot change');
  });

  it('exports scoped identifiers/hashes, imports idempotently, rejects cross-client and transcript fields', async () => {
    const h = harness(), pilot = h.open();
    await pilot.register(a, 'map-a'); await pilot.link(a, 'map-a', codex, true);
    await pilot.edit(a, 'map-a', 'op', drawRevision(h.document()), [{ title: 'Private authored map text' }]);
    const text = await pilot.exportScope(a);
    expect(text).not.toContain('Private authored map text');
    const fresh = harness(), imported = fresh.open();
    await imported.importScope(a, text, true); await imported.importScope(a, text, true);
    expect(await imported.exportScope(a)).toBe(text);
    await expect(imported.importScope(b, text, true)).rejects.toThrow('another client');
    const payload = JSON.parse(text);
    payload.links[0].session.transcript = 'sensitive';
    await expect(imported.importScope(a, JSON.stringify(payload), true)).rejects.toThrow('unknown field');
    expect(await imported.exportScope(a)).toBe(text);
  });

  it('preserves unresolved logical links when canonical map content is absent', async () => {
    const h = harness(), pilot = h.open();
    await pilot.register(a, 'map-a'); await pilot.link(a, 'map-a', codex, true);
    h.boundary.readMap = async () => null;
    expect(await pilot.resolve(a, codex)).toEqual([{ mapId: 'map-a', document: null, revision: null, contentHash: null }]);
  });

  it('operates without any CTX dependency and hashes portable content deterministically', async () => {
    expect(await digest({ b: 2, a: 1 })).toBe(await digest({ a: 1, b: 2 }));
    expect(await digest({ a: 1 })).not.toBe(await digest({ a: 2 }));
    const h = harness(); await h.open().register(a, 'map-a'); await h.open().link(a, 'map-a', codex, true);
    expect(await h.open().resolve(a, codex)).toHaveLength(1);
  });

  it('rejects malformed hash, path identity, orphan references, and unsupported versions', () => {
    const invalid = { ...emptyRegistry(), maps: [{ ...a, mapId: '/private/path' }] };
    expect(() => validateState(invalid)).toThrow('opaque');
    expect(() => validateState({ ...emptyRegistry(), version: 'future' })).toThrow('version');
    expect(() => validateState({ ...emptyRegistry(), links: [{ ...a, mapId: 'missing', session: claude }] })).toThrow('unregistered');
    expect(() => validateState({ ...emptyRegistry(), maps: [{ ...a, mapId: 'map-a' }], receipts: [{ ...a, mapId: 'map-a', operationId: 'op', expectedRevision: 'rev', requestHash: 'wrong', status: 'unknown' }] })).toThrow('SHA256');
  });
});
