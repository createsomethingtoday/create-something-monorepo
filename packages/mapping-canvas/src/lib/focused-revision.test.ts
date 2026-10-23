import { describe, expect, it, vi } from 'vitest';
import { createDocument, type CanvasDocument } from './document';
import { applyCanvasOperations } from './paired-session';
import { createDrawWebMcpTools, drawRevision } from './webmcp';
import { prepareFocusedRevision, focusedRevisionPatch } from './focused-revision';
function fixture(): CanvasDocument { return { ...createDocument(), objects: [
  { id: 'review', kind: 'note', createdAt: 'now', x: 0, y: 0, width: 300, height: 160, text: 'Noah reviews Noah’s actions.' },
  { id: 'other', kind: 'note', createdAt: 'now', x: 400, y: 0, width: 300, height: 160, text: 'Noah handles exceptions.' },
  { id: 'annotation', kind: 'stroke', createdAt: 'now', points: [{ x: 5, y: 5 }, { x: 80, y: 20 }], color: '#ffffff', width: 3 },
  { id: 'edge', kind: 'connector', createdAt: 'now', fromId: 'review', toId: 'other', label: 'verified' }
] }; }
function harness() {
  let document = fixture();
  const tools = createDrawWebMcpTools({ getState: () => ({ document, selectedIds: ['review'], tool: 'select', canUndo: false, canRedo: false }),
    applyOperations: async (operations, expected) => { if (expected && expected !== drawRevision(document)) throw new Error('stale queued revision'); const before = document, after = applyCanvasOperations(document, operations); if (!after) throw new Error('invalid'); document = after; return { before, after }; },
    select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), animate: vi.fn() });
  return { read: () => document, call: async (name: string, input: Record<string, unknown>) => await tools.find(t => t.name === name)!.execute(input) as Record<string, unknown> };
}
describe('focused revision public contract', () => {
  it('previews literal replacement without mutation, excluding selected annotation marks', () => {
    const d = fixture(), before = structuredClone(d), p = prepareFocusedRevision(d, ['review', 'annotation'], 'Noah', '$& Inez');
    expect(d).toEqual(before); expect(p.affected[0].after).toBe('$& Inez reviews $& Inez’s actions.');
    expect(p.excluded).toEqual([{ id: 'annotation', reason: 'Non-note annotation/artwork preserved' }]);
    expect(focusedRevisionPatch(p, d, ['annotation', 'review']).patches).toEqual([{ id: 'review', text: p.affected[0].after }]);
  });
  it('accepts via real patch API; targeted Undo retains a later independent annotation edit', async () => {
    const h = harness(), original = structuredClone(h.read()), p = prepareFocusedRevision(h.read(), ['review'], 'Noah', 'Inez');
    const receipt = await h.call('draw_patch_objects', focusedRevisionPatch(p, h.read(), ['review']));
    expect(h.read().objects[0]).toMatchObject({ text: 'Inez reviews Inez’s actions.' }); expect(h.read().objects.slice(1)).toEqual(original.objects.slice(1));
    await h.call('draw_patch_objects', { patches: [{ id: 'annotation', translate: { dx: 7, dy: 0 } }] });
    const annotation = structuredClone(h.read().objects[2]); await h.call('draw_revert_change', { changeId: receipt.changeId });
    expect(h.read().objects[0]).toEqual(original.objects[0]); expect(h.read().objects[2]).toEqual(annotation);
  });
  it('applies a two-note preview in one atomic patch and reverts both notes together', async () => {
    const h = harness(), before = structuredClone(h.read());
    const proposal = prepareFocusedRevision(h.read(), ['review', 'other'], 'Noah', 'Inez');
    expect(proposal.affected).toHaveLength(2);
    const receipt = await h.call('draw_patch_objects', focusedRevisionPatch(proposal, h.read(), ['review', 'other']));
    expect(h.read().objects.slice(0, 2).every(o => o.kind === 'note' && o.text.includes('Inez'))).toBe(true);
    expect(h.read().objects.slice(2)).toEqual(before.objects.slice(2));
    await h.call('draw_revert_change', { changeId: receipt.changeId });
    expect(h.read().objects).toEqual(before.objects);
  });
  it('refuses stale selections, queued writes, tampered previews and conflicting Undo atomically', async () => {
    const h = harness(), p = prepareFocusedRevision(h.read(), ['review'], 'Noah', 'Inez');
    expect(() => focusedRevisionPatch(p, h.read(), ['other'])).toThrow('changed');
    const tampered = structuredClone(p); tampered.affected[0].after = 'unreviewed'; expect(() => focusedRevisionPatch(tampered, h.read(), ['review'])).toThrow('proposal changed');
    const input = focusedRevisionPatch(p, h.read(), ['review']); await h.call('draw_patch_objects', { patches: [{ id: 'other', text: 'Mira' }] }); const before = structuredClone(h.read());
    expect(() => focusedRevisionPatch(p, h.read(), ['review'])).toThrow('changed'); await expect(h.call('draw_patch_objects', input)).rejects.toThrow('stale'); expect(h.read()).toEqual(before);
    const fresh = prepareFocusedRevision(h.read(), ['review'], 'Noah', 'Inez'); const receipt = await h.call('draw_patch_objects', focusedRevisionPatch(fresh, h.read(), ['review']));
    await h.call('draw_patch_objects', { patches: [{ id: 'review', text: 'Later human edit' }] }); const later = structuredClone(h.read());
    await expect(h.call('draw_revert_change', { changeId: receipt.changeId })).rejects.toThrow('changed since'); expect(h.read()).toEqual(later);
  });
  it('preserves rich/locked/hidden notes and refuses groups or invalid requests', () => {
    const d = fixture(), n = d.objects[0]; if (n.kind !== 'note') throw new Error('fixture');
    d.objects.push({ ...n, id: 'rich', content: { blocks: [{ type: 'paragraph', runs: [{ text: n.text }] }] } }, { ...n, id: 'locked', locked: true }, { ...n, id: 'hidden', hidden: true });
    const p = prepareFocusedRevision(d, ['review', 'rich', 'locked', 'hidden'], 'Noah', 'Inez'); expect(p.affected.map(o => o.id)).toEqual(['review']); expect(p.excluded).toHaveLength(3);
    d.objects.push({ id: 'group', kind: 'group', createdAt: 'now', x: 0, y: 0, width: 300, height: 160, label: '', childIds: ['review'] });
    expect(() => prepareFocusedRevision(d, ['group', 'review'], 'Noah', 'Inez')).toThrow('individual');
    for (const [find, replace, message] of [['', 'Inez', 'Find'], ['Noah', 'Noah', 'differ'], ['missing', 'Inez', 'No selected']]) expect(() => prepareFocusedRevision(d, ['review'], find, replace)).toThrow(message);
  });
});
