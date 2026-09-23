import { describe, it, expect, vi } from 'vitest';
import { createDrawWebMcpTools } from './webmcp';
import { createDocument } from './document';
import { applyCanvasOperations } from './paired-session';

function harness(failReadback = false, concurrentChange = false) {
  let document = { ...createDocument(), objects: [{ id: 'note', kind: 'note' as const, createdAt: 'now', x: 0, y: 0, width: 100, height: 100, text: 'Hello' }] };
  const activity = vi.fn();
  const apply = vi.fn(async (operations: Parameters<typeof applyCanvasOperations>[1]) => {
    const before = document;
    document = applyCanvasOperations(document, operations)! as typeof document;
    return { before, after: document };
  });
  const tools = createDrawWebMcpTools({
    getState: () => ({ document, selectedIds: [], tool: 'select', canUndo: true, canRedo: false }),
    applyOperations: apply, select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), animate: vi.fn(), activity,
    renderedGeometry: () => {
      if (failReadback) throw new Error('Render interrupted');
      if (concurrentChange) document = { ...document, title: 'Human edited while measuring' };
      const bounds = { x: document.objects[0].x, y: 0, width: 100, height: 100 };
      return { surface: bounds, objects: [{ id: 'note', kind: 'note', worldBounds: bounds, viewportBounds: bounds, clipped: false }], connectors: [], overlaps: [], totalObjectCount: 1 };
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
