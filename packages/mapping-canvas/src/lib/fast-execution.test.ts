import { describe, it, expect, vi } from 'vitest';
import { createDrawWebMcpTools } from './webmcp';
import { createDocument } from './document';
import { applyCanvasOperations } from './paired-session';

function harness(failReadback = false, concurrentChange = false, unrelated = false) {
  let document = { ...createDocument(), objects: [{ id: 'note', kind: 'note' as const, createdAt: 'now', x: 0, y: 0, width: 100, height: 100, text: 'Hello' }] };
  if (unrelated) document.objects.push(...Array.from({ length: 220 }, (_, index) => ({ ...document.objects[0], id: `unrelated-${index}` })));
  const activity = vi.fn();
  const apply = vi.fn(async (operations: Parameters<typeof applyCanvasOperations>[1]) => {
    const before = document;
    document = applyCanvasOperations(document, operations)! as typeof document;
    return { before, after: document };
  });
  const tools = createDrawWebMcpTools({
    getState: () => ({ document, selectedIds: [], tool: 'select', canUndo: true, canRedo: false }),
    applyOperations: apply, select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), animate: vi.fn(), activity,
    renderedGeometry: (input) => {
      if (failReadback) throw new Error('Render interrupted');
      if (concurrentChange) document = { ...document, title: 'Human edited while measuring' };
      const bounds = { x: document.objects[0].x, y: 0, width: 100, height: 100 };
      const ids = input.ids ?? document.objects.map(object => object.id);
      return { surface: bounds, objects: ids.map(id => ({ id, kind: 'note' as const, worldBounds: bounds, viewportBounds: bounds, clipped: false })), connectors: [], overlaps: [], totalObjectCount: ids.length };
    }
  });
  const call = (name: string, args = {}) => tools.find(tool => tool.name === name)!.execute(args) as Promise<any>;
  return { call, activity, apply, read: () => document };
}
describe('single-command execution', () => {
  it('edits, verifies and completes real activity with one reversible receipt', async () => {
    const h = harness(); const before = await h.call('draw_inspect');
    const result = await h.call('draw_execute', { expectedRevision: before.revision, commands: [{ type: 'transform', ids: ['note'], x: 32 }] });
    expect(result).toMatchObject({ ok: true, applied: true, verification: { state: 'verified', stable: true } });
    expect(result.mutation.changeId).toBeTruthy(); expect(h.apply).toHaveBeenCalledTimes(1);
    expect(h.read().objects[0].x).toBe(32); expect(h.activity.mock.lastCall?.[0].task.state).toBe('completed');
    expect(result.timings.totalMs).toBeGreaterThanOrEqual(0);
    await h.call('draw_revert_change', { changeId: result.mutation.changeId });
    expect(h.read().objects[0].x).toBe(0);
  });
  it('does not claim verification after a concurrent human edit', async () => {
    const h = harness(false, true); const before = await h.call('draw_inspect');
    const result = await h.call('draw_execute', { expectedRevision: before.revision, commands: [{ type: 'transform', ids: ['note'], x: 32 }] });
    expect(result).toMatchObject({ ok: false, applied: true, phase: 'verify' });
    expect(result.mutation.changeId).toBeTruthy(); expect(h.apply).toHaveBeenCalledTimes(1);
    expect(h.read().title).toBe('Human edited while measuring');
  });
  it('verifies intentional hiding and excludes unrelated large-canvas content', async () => {
    const h = harness(false, false, true); const before = await h.call('draw_inspect');
    const result = await h.call('draw_execute', { expectedRevision: before.revision, commands: [{ type: 'layer', ids: ['note'], hidden: true }] });
    expect(result).toMatchObject({ ok: true, applied: true, verification: { state: 'verified' } });
    expect(result.verification.geometry.objects).toEqual([]);
    expect(result.verification.after.objects[0].hidden).toBe(true);
  });
  it('includes dependent connector chains in the affected geometry', async () => {
    const h = harness(false, false, true);
    await h.call('draw_apply_operations', { operations: [
      { type: 'put_object', object: { id: 'edge', kind: 'connector', createdAt: 'now', fromId: 'note', toId: 'unrelated-0', label: '' } },
      { type: 'put_object', object: { id: 'branch', kind: 'connector', createdAt: 'now', fromId: 'edge', toId: 'unrelated-1', label: '' } }
    ] });
    const before = await h.call('draw_inspect');
    const result = await h.call('draw_execute', { expectedRevision: before.revision, commands: [{ type: 'transform', ids: ['note'], x: 32 }] });
    expect(result.ok).toBe(true);
    expect(result.verification.geometry.objects.map((object: { id: string }) => object.id)).toEqual(['note', 'edge', 'branch']);
  });
  it('rejects stale state without submitting an edit', async () => {
    const h = harness();
    const result = await h.call('draw_execute', { expectedRevision: 'stale', commands: [{ type: 'transform', ids: ['note'], x: 32 }] });
    expect(result).toMatchObject({ ok: false, applied: false, phase: 'inspect' });
    expect(h.apply).not.toHaveBeenCalled(); expect(h.activity.mock.lastCall?.[0].task.state).toBe('failed');
  });
  it('retains an applied receipt if rendering fails and never repeats the mutation', async () => {
    const h = harness(true); const before = await h.call('draw_inspect');
    const result = await h.call('draw_execute', { expectedRevision: before.revision, commands: [{ type: 'transform', ids: ['note'], x: 32 }] });
    expect(result).toMatchObject({ ok: false, applied: true, phase: 'verify', error: 'Render interrupted' });
    expect(result.mutation.changeId).toBeTruthy(); expect(h.apply).toHaveBeenCalledTimes(1);
    expect(h.activity.mock.lastCall?.[0].task.state).toBe('failed');
  });
});
