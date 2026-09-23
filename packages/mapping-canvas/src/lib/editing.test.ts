import { describe, it, expect, vi } from 'vitest';
import { createDocument, parse, serialize, type CanvasDocument } from './document';
import { compileEdits, visibleObjects, isLayerLocked } from './editing';
import { createDrawWebMcpTools, drawRevision } from './webmcp';
import { applyCanvasOperations } from './paired-session';

const fixture = (): CanvasDocument => ({
  ...createDocument(),
  objects: [
    {
      id: 'a',
      kind: 'rectangle',
      createdAt: '2026-09-22',
      from: { x: 10, y: 20 },
      to: { x: 110, y: 80 },
      color: '#ffffff'
    },
    {
      id: 'b',
      kind: 'note',
      createdAt: '2026-09-22',
      x: 160,
      y: 100,
      width: 80,
      height: 60,
      text: 'B'
    },
    {
      id: 'c',
      kind: 'note',
      createdAt: '2026-09-22',
      x: 350,
      y: 20,
      width: 100,
      height: 80,
      text: 'C'
    },
    {
      id: 'edge',
      kind: 'connector',
      createdAt: '2026-09-22',
      fromId: 'a',
      toId: 'b',
      label: 'Next'
    },
    {
      id: 'group',
      kind: 'group',
      createdAt: '2026-09-22',
      x: 0,
      y: 0,
      width: 250,
      height: 180,
      label: 'Flow',
      childIds: ['a', 'b', 'edge']
    }
  ]
});
const identity = () => {
  let i = 0;
  return { id: () => `copy-${++i}`, now: '2026-09-23' };
};

describe('Shared Draw editing commands', () => {
  it('duplicates a graph with fresh IDs and remaps internal relationships', () => {
    const before = fixture();
    const result = compileEdits(before, [{ type: 'duplicate', ids: ['group'] }], identity());
    const copy = result.document.objects.find((o) => o.id === result.selectedIds[0]);
    expect(copy).toMatchObject({ kind: 'group', childIds: ['copy-1', 'copy-2', 'copy-3'] });
    expect(result.document.objects.find((o) => o.id === 'copy-3')).toMatchObject({
      fromId: 'copy-1',
      toId: 'copy-2'
    });
    expect(before.objects).toHaveLength(5);
    expect(applyCanvasOperations(before, result.operations)?.objects).toEqual(
      result.document.objects
    );
  });
  it('pastes detached clipboard graphs with fresh identities and group-first ordering', () => {
    const source = fixture();
    source.objects = [source.objects[4], ...source.objects.slice(0, 4)];
    const result = compileEdits(
      createDocument(),
      [{ type: 'paste', ids: ['group'], objects: source.objects }],
      identity()
    );
    expect(result.document.objects).toHaveLength(4);
    expect(applyCanvasOperations(createDocument(), result.operations)?.objects).toEqual(
      result.document.objects
    );
    expect(result.document.objects[0]).toMatchObject({ childIds: ['copy-2', 'copy-3', 'copy-4'] });
  });
  it('rotates selection centers together and restores a full turn', () => {
    const source = fixture();
    const rotated = compileEdits(
      source,
      [{ type: 'transform', ids: ['group'], rotation: 90 }],
      identity()
    );
    expect(rotated.document.objects[0].rotation).toBe(90);
    expect(rotated.document.objects[3]).toMatchObject({ fromId: 'a', toId: 'b' });
    const restored = compileEdits(
      rotated.document,
      [{ type: 'transform', ids: ['group'], rotation: 0 }],
      identity()
    );
    const a = restored.document.objects[0];
    if (a.kind !== 'rectangle') throw new Error('shape lost');
    expect(a.from.x).toBeCloseTo(10);
    expect(a.from.y).toBeCloseTo(20);
  });
  it('transforms group descendants once and preserves endpoint identities', () => {
    const result = compileEdits(
      fixture(),
      [{ type: 'transform', ids: ['group', 'a'], x: 100, y: 50, width: 500, height: 360 }],
      identity()
    );
    expect(result.document.objects[0]).toMatchObject({
      from: { x: 120, y: 90 },
      to: { x: 320, y: 210 }
    });
    expect(result.document.objects[3]).toMatchObject({ fromId: 'a', toId: 'b' });
  });
  it('aligns objects and distributes equal gaps without changing their order', () => {
    const result = compileEdits(
      fixture(),
      [
        { type: 'align', ids: ['a', 'b', 'c'], axis: 'top' },
        { type: 'align', ids: ['a', 'b', 'c'], axis: 'horizontal' }
      ],
      identity()
    );
    expect(result.document.objects[1]).toMatchObject({ x: 190, y: 20 });
    expect(result.document.objects.map((o) => o.id)).toEqual(fixture().objects.map((o) => o.id));
  });
  it('rejects partial invalid batches and inherited locked transformations', () => {
    const before = fixture();
    expect(() =>
      compileEdits(
        before,
        [
          { type: 'layer', ids: ['a'], name: 'Changed' },
          { type: 'transform', ids: ['missing'], x: 0 }
        ],
        identity()
      )
    ).toThrow('no longer exists');
    expect(before.objects[0].name).toBeUndefined();
    const locked = compileEdits(
      before,
      [{ type: 'layer', ids: ['group'], locked: true }],
      identity()
    ).document;
    expect(isLayerLocked(locked, 'a')).toBe(true);
    expect(() =>
      compileEdits(locked, [{ type: 'transform', ids: ['a'], x: 10 }], identity())
    ).toThrow('Unlock');
    expect(() =>
      compileEdits(before, [{ type: 'transform', ids: ['a'], width: NaN }], identity())
    ).toThrow('finite');
    expect(() =>
      compileEdits(before, [{ type: 'layer', ids: ['a'], hidden: 'false' }], identity())
    ).toThrow('boolean');
  });
  it('persists additive style/layer fields and computes inherited visibility', () => {
    const result = compileEdits(
      fixture(),
      [
        { type: 'style', ids: ['a'], fill: '#0057b8', strokeWidth: 4 },
        { type: 'layer', ids: ['group'], hidden: true, name: 'Scene one' }
      ],
      identity()
    );
    expect(parse(serialize(result.document)).objects).toEqual(result.document.objects);
    expect(visibleObjects(result.document).map((o) => o.id)).toEqual(['c']);
  });
  it('exposes revision-required edits and targeted revert through the public API', async () => {
    let document = fixture();
    const original = document;
    const tools = createDrawWebMcpTools({
      getState: () => ({
        document,
        selectedIds: [],
        tool: 'select',
        canUndo: true,
        canRedo: false
      }),
      applyOperations: (operations, expected) => {
        if (expected && expected !== drawRevision(document)) throw new Error('stale');
        const before = document;
        document = applyCanvasOperations(document, operations)!;
        return { before, after: document };
      },
      select: vi.fn(),
      setTool: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      reset: vi.fn(),
      animate: vi.fn()
    });
    const edit = tools.find((t) => t.name === 'draw_edit')!;
    await expect(
      edit.execute({ commands: [{ type: 'layer', ids: ['a'], name: 'A' }] })
    ).rejects.toThrow('required');
    await expect(
      edit.execute({
        expectedRevision: 'stale',
        commands: [{ type: 'layer', ids: ['a'], name: 'A' }]
      })
    ).rejects.toThrow('stale');
    const receipt = (await edit.execute({
      expectedRevision: drawRevision(document),
      commands: [
        { type: 'transform', ids: ['a'], width: 200 },
        { type: 'layer', ids: ['a'], name: 'Decision' }
      ]
    })) as { changeId: string };
    expect(document.objects[0]).toMatchObject({ name: 'Decision', to: { x: 210, y: 80 } });
    await tools
      .find((t) => t.name === 'draw_revert_change')!
      .execute({ changeId: receipt.changeId });
    expect(document.objects).toEqual(original.objects);
  });
});
