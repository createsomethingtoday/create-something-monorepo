import { describe, expect, it, vi } from 'vitest';
import { changedOrderIds, createDrawWebMcpTools, registerDrawWebMcpTools } from './webmcp';
import { createDocument, type CanvasDocument } from './document';
import { applyCanvasOperations } from './paired-session';

describe('Draw WebMCP tools', () => {
  const harness = (initial = createDocument()) => {
    let document = initial;
    const controller = {
      getState: () => ({ document, selectedIds: [] as string[], tool: 'select' as const, canUndo: true, canRedo: false, surface: { width: 1200, height: 800 } }),
      applyOperations: async (operations: Parameters<typeof applyCanvasOperations>[1]) => {
        const before = document;
        const after = applyCanvasOperations(document, operations);
        if (!after) throw new Error('Invalid operation batch');
        document = after;
        return { before, after };
      },
      select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), animate: vi.fn(),
      read: () => document
    };
    return controller;
  };

  it('detects reordered layers in linear time without losing inversion participants', () => {
    const objects = Array.from({ length: 20_000 }, (_, index) => ({
      id: `large-${index}`, kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z',
      x: 0, y: index, width: 100, height: 80, text: String(index)
    }));
    const unchanged = { ...createDocument(), objects };
    expect(changedOrderIds(unchanged, unchanged)).toEqual([]);

    const reversedEdges = { ...unchanged, objects: [objects.at(-1)!, ...objects.slice(1, -1), objects[0]] };
    expect(new Set(changedOrderIds(unchanged, reversedEdges))).toEqual(new Set(objects.map(({ id }) => id)));
  });

  it('exposes complete canvas control through bounded document operations', async () => {
    let document = createDocument();
    const animate = vi.fn();
    const tools = createDrawWebMcpTools({
      getState: () => ({ document, selectedIds: [], tool: 'pen', canUndo: false, canRedo: false }),
      applyOperations: async (operations) => { const before = document; document = { ...document, title: operations[0].type === 'set_title' ? operations[0].title : document.title }; return { before, after: document }; },
      select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), animate
    });
    expect(tools.map(({ name }) => name)).toEqual(['draw_get_state', 'draw_inspect', 'draw_get_rendered_geometry', 'draw_compose', 'draw_path', 'draw_create_freehand_arrow', 'draw_patch_objects', 'draw_layout', 'draw_auto_layout', 'draw_focus', 'draw_revert_change', 'draw_delete', 'draw_replace_canvas', 'draw_apply_operations', 'draw_select', 'draw_set_tool', 'draw_undo', 'draw_redo', 'draw_reset']);
    const applySchema = tools.find(({ name }) => name === 'draw_apply_operations')!.inputSchema;
    expect(JSON.stringify(applySchema)).toContain('x-maxUtf8Bytes');
    expect(JSON.stringify(applySchema)).toContain('"minItems":2');
    const result = await tools.find(({ name }) => name === 'draw_apply_operations')!.execute({ operations: [{ type: 'set_title', title: 'Agent map' }] });
    expect(document.title).toBe('Agent map');
    expect(animate).toHaveBeenCalledWith('update', [], false);
    expect(JSON.stringify(result)).toContain('transitionId');
  });

  it('inspects a filtered compact projection and returns revision-bearing compact receipts', async () => {
    const note = { id: 'note-one', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 120, y: 180, width: 260, height: 132, text: 'Decision owner' };
    const ellipse = { id: 'ellipse-one', kind: 'ellipse' as const, createdAt: '2026-09-04T00:00:00.000Z', from: { x: 500, y: 200 }, to: { x: 680, y: 340 }, color: '#0057b8' };
    const background = Array.from({ length: 20 }, (_, index) => ({ ...ellipse, id: `ellipse-${index}`, from: { x: 500 + index * 20, y: 200 }, to: { x: 680 + index * 20, y: 340 } }));
    let document: CanvasDocument = { ...createDocument(), objects: [note, ...background] };
    const tools = createDrawWebMcpTools({
      getState: () => ({ document, selectedIds: [note.id], tool: 'select', canUndo: true, canRedo: false, surface: { width: 1200, height: 800 } }),
      applyOperations: async (operations) => { const before = document; document = { ...document, title: operations[0].type === 'set_title' ? operations[0].title : document.title }; return { before, after: document }; },
      select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), animate: vi.fn()
    });
    const inspect = tools.find(({ name }) => name === 'draw_inspect')!;
    expect(inspect).toBeDefined();
    const projection = await inspect.execute({ kinds: ['note'], text: 'owner', limit: 10 });
    expect(projection).toMatchObject({
      version: '2026-09-05.1',
      revision: expect.any(String),
      palette: { chalk: '#f3ebe4', signal: '#0057b8' },
      surface: { width: 1200, height: 800 },
      visibleWorld: expect.objectContaining({ width: 1200, height: 800 }),
      summary: { objectCount: 21, matchedCount: 1, selectedIds: [note.id] },
      objects: [{ id: note.id, kind: 'note', text: note.text }]
    });
    expect(JSON.stringify(projection).length).toBeLessThan(JSON.stringify({ document, selectedIds: [note.id] }).length);

    const revision = (projection as { revision: string }).revision;
    const receipt = await tools.find(({ name }) => name === 'draw_apply_operations')!.execute({ expectedRevision: revision, operations: [{ type: 'set_title', title: 'Compact receipt' }] });
    expect(receipt).toMatchObject({ ok: true, changeId: expect.any(String), revision: expect.any(String), summary: { objectCount: 21 } });
    expect(receipt).not.toHaveProperty('state');
    await expect(tools.find(({ name }) => name === 'draw_apply_operations')!.execute({ expectedRevision: revision, operations: [{ type: 'set_title', title: 'Stale' }] })).rejects.toThrow('revision');
  });

  it('returns actual bounded rendered geometry and fails closed without a web render surface', async () => {
    const note = { id: 'rendered-note', kind: 'note' as const, createdAt: '2026-09-05T00:00:00.000Z', x: 20, y: 30, width: 200, height: 100, text: 'Rendered' };
    const renderedGeometry = vi.fn(async () => ({
      surface: { x: 0, y: 0, width: 1200, height: 800 },
      objects: [{ id: note.id, kind: note.kind, worldBounds: { x: 20, y: 30, width: 214, height: 112 }, viewportBounds: { x: 84, y: 96, width: 214, height: 112 }, clipped: false }],
      connectors: [], overlaps: [], totalObjectCount: 1
    }));
    const controller = { ...harness({ ...createDocument(), objects: [note] }), renderedGeometry };
    const tool = createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_get_rendered_geometry');
    expect(tool).toBeDefined();
    expect(tool?.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, idempotentHint: true });
    const result = await tool!.execute({ ids: [note.id], limit: 25 });
    expect(renderedGeometry).toHaveBeenCalledWith({ ids: [note.id], limit: 25 });
    expect(result).toMatchObject({
      version: expect.any(String), revision: expect.any(String), truncated: false,
      surface: { width: 1200, height: 800 },
      summary: { objectCount: 1, returnedObjectCount: 1, connectorCount: 0, overlapCount: 0 },
      objects: [{ id: note.id, worldBounds: { width: 214 }, viewportBounds: { x: 84 }, clipped: false }]
    });

    const unavailable = createDrawWebMcpTools(harness()).find(({ name }) => name === 'draw_get_rendered_geometry');
    await expect(unavailable!.execute({})).rejects.toThrow('rendered web surface');
  });

  it('creates a deterministic semantic freehand arrow as portable v1 strokes and reverts it exactly', async () => {
    const controller = harness(), tools = createDrawWebMcpTools(controller);
    const arrow = tools.find(({ name }) => name === 'draw_create_freehand_arrow');
    expect(arrow).toBeDefined();
    expect(arrow?.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: false });
    const input = { start: { x: 40, y: 80 }, end: { x: 440, y: 220 }, curvature: .35, looseness: .45, color: 'signal', weight: 6, arrowhead: 'triangle' };
    const first = await arrow!.execute(input) as { changeId: string; objectIds: string[]; geometry: { pointCount: number; arrowhead: string } };
    const firstObjects = controller.read().objects.map(({ id, createdAt, ...object }) => object);
    expect(first).toMatchObject({ changeId: expect.any(String), objectIds: expect.any(Array), geometry: { pointCount: expect.any(Number), arrowhead: 'triangle' } });
    expect(controller.read().version).toBe('create-something.mapping-canvas.v1');
    expect(controller.read().objects.every(({ kind }) => kind === 'stroke')).toBe(true);
    expect(first.geometry.pointCount).toBeLessThanOrEqual(64);
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: first.changeId });
    expect(controller.read().objects).toEqual([]);
    const second = await arrow!.execute(input) as { objectIds: string[] };
    const secondObjects = controller.read().objects.map(({ id, createdAt, ...object }) => object);
    expect(secondObjects).toEqual(firstObjects);
    expect(second.objectIds).toHaveLength(first.objectIds.length);
  });

  it('bounds semantic arrow geometry and produces distinct supported treatments', async () => {
    const geometries: string[] = [];
    for (const [index, arrowhead] of ['vee', 'triangle', 'barbed'].entries()) {
      const controller = harness(), tool = createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_create_freehand_arrow')!;
      await tool.execute({ start: { x: 0, y: 0 }, end: { x: 320, y: 120 }, curvature: index * .25, looseness: index * .3, weight: 5, arrowhead });
      geometries.push(JSON.stringify(controller.read().objects.map((object) => object.kind === 'stroke' ? object.points : [])));
    }
    expect(new Set(geometries).size).toBe(3);
    const controller = harness(), tool = createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_create_freehand_arrow')!;
    await expect(tool.execute({ start: { x: 0, y: 0 }, end: { x: 1, y: 1 } })).rejects.toThrow('at least 8');
    await expect(tool.execute({ start: { x: Number.POSITIVE_INFINITY, y: 0 }, end: { x: 100, y: 0 } })).rejects.toThrow('finite');
    await expect(tool.execute({ start: { x: 0, y: 0 }, end: { x: 100, y: 0 }, curvature: 2 })).rejects.toThrow('curvature');
    await expect(tool.execute({ start: { x: 0, y: 0 }, end: { x: 100, y: 0 }, arrowhead: 'random' })).rejects.toThrow('arrowhead');
    expect(controller.read().objects).toEqual([]);
  });

  it.each(['flow', 'hierarchy', 'loop', 'orbit', 'swimlane'] as const)('auto-layouts graph roots deterministically in %s mode with exact revert', async (mode) => {
    const notes = ['alpha', 'beta', 'gamma', 'delta'].map((id, index) => ({ id, kind: 'note' as const, createdAt: '2026-09-05T00:00:00.000Z', x: index * 12, y: index * 8, width: 120, height: 80, text: id }));
    const connectors = [
      { id: 'edge-ab', kind: 'connector' as const, createdAt: '2026-09-05T00:00:00.000Z', fromId: 'alpha', toId: 'beta', label: '' },
      { id: 'edge-bg', kind: 'connector' as const, createdAt: '2026-09-05T00:00:00.000Z', fromId: 'beta', toId: 'gamma', label: '' },
      { id: 'edge-ga', kind: 'connector' as const, createdAt: '2026-09-05T00:00:00.000Z', fromId: 'gamma', toId: 'alpha', label: '' }
    ];
    const initial = { ...createDocument(), objects: [...notes, ...connectors] };
    const run = async (objects: CanvasDocument['objects']) => {
      const controller = harness({ ...initial, objects }), tools = createDrawWebMcpTools(controller);
      const autoLayout = tools.find(({ name }) => name === 'draw_auto_layout');
      expect(autoLayout).toBeDefined();
      const result = await autoLayout!.execute({ mode, ids: notes.map(({ id }) => id).reverse(), gap: 48, lanes: [{ id: 'alpha', lane: 'Plan' }, { id: 'beta', lane: 'Build' }, { id: 'gamma', lane: 'Build' }] }) as { changeId: string; mode: string; placedIds: string[] };
      expect(result).toMatchObject({ changeId: expect.any(String), mode, placedIds: ['alpha', 'beta', 'delta', 'gamma'] });
      const positioned = Object.fromEntries(controller.read().objects.filter((object): object is Extract<CanvasDocument['objects'][number], { kind: 'note' }> => object.kind === 'note').map((object) => [object.id, { x: object.x, y: object.y }]));
      await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: result.changeId });
      expect(controller.read().objects).toEqual(objects);
      return positioned;
    };
    expect(await run(initial.objects)).toEqual(await run([...connectors, ...notes].reverse()));
  });

  it('moves nested group roots as units and rejects overlapping roots atomically in auto-layout', async () => {
    const child = { id: 'nested-child', kind: 'note' as const, createdAt: '2026-09-05T00:00:00.000Z', x: 30, y: 50, width: 120, height: 80, text: 'Child' };
    const group = { id: 'nested-group', kind: 'group' as const, createdAt: child.createdAt, x: 0, y: 0, width: 180, height: 160, label: 'Group', childIds: [child.id] };
    const peer = { ...child, id: 'peer', x: 20, y: 20, text: 'Peer' };
    const controller = harness({ ...createDocument(), objects: [group, child, peer] }), tools = createDrawWebMcpTools(controller), layout = tools.find(({ name }) => name === 'draw_auto_layout')!;
    const beforeOffset = { x: child.x - group.x, y: child.y - group.y };
    await layout.execute({ ids: [group.id, peer.id], mode: 'flow' });
    const movedGroup = controller.read().objects.find((object): object is typeof group => object.id === group.id)!, movedChild = controller.read().objects.find((object): object is typeof child => object.id === child.id)!;
    expect({ x: movedChild.x - movedGroup.x, y: movedChild.y - movedGroup.y }).toEqual(beforeOffset);
    const stable = controller.read();
    await expect(layout.execute({ ids: [group.id, child.id], mode: 'hierarchy' })).rejects.toThrow('overlap through group membership');
    expect(controller.read()).toEqual(stable);
  });

  it('centers orbit satellites on the anchored root and leaves a singleton loop in place', async () => {
    const notes = ['alpha', 'beta', 'gamma', 'delta'].map((id, index) => ({ id, kind: 'note' as const, createdAt: '2026-09-05T00:00:00.000Z', x: 100 + index * 20, y: 200 + index * 20, width: 120, height: 80, text: id }));
    const controller = harness({ ...createDocument(), objects: notes }), tools = createDrawWebMcpTools(controller), layout = tools.find(({ name }) => name === 'draw_auto_layout')!;
    await layout.execute({ ids: notes.map(({ id }) => id), mode: 'orbit', gap: 48 });
    const positioned = controller.read().objects.filter((object): object is typeof notes[number] => object.kind === 'note');
    const hub = positioned.find(({ id }) => id === 'alpha')!, satellites = positioned.filter(({ id }) => id !== 'alpha');
    const average = { x: satellites.reduce((sum, note) => sum + note.x + note.width / 2, 0) / satellites.length, y: satellites.reduce((sum, note) => sum + note.y + note.height / 2, 0) / satellites.length };
    expect(average.x).toBeCloseTo(hub.x + hub.width / 2, 8);
    expect(average.y).toBeCloseTo(hub.y + hub.height / 2, 8);

    const singleController = harness({ ...createDocument(), objects: [notes[0]] }), single = createDrawWebMcpTools(singleController).find(({ name }) => name === 'draw_auto_layout')!;
    await single.execute({ ids: ['alpha'], mode: 'loop' });
    expect(singleController.read().objects[0]).toEqual(notes[0]);
  });

  it('summarizes dense stroke geometry in compact inspection', async () => {
    const points = Array.from({ length: 2_000 }, (_, index) => ({ x: index, y: index % 50 }));
    const stroke = { id: 'dense-stroke', kind: 'stroke' as const, createdAt: '2026-09-04T00:00:00.000Z', points, color: '#0057b8', width: 5 };
    const controller = harness({ ...createDocument(), objects: [stroke] });
    const projection = await createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_inspect')!.execute({ ids: [stroke.id] }) as { objects: Record<string, unknown>[] };
    expect(projection.objects[0]).toMatchObject({ id: stroke.id, kind: 'stroke', pointCount: 2_000, bounds: { x: 0, y: 0, width: 1_999, height: 80 } });
    expect(projection.objects[0]).not.toHaveProperty('points');
    expect(JSON.stringify(projection).length).toBeLessThan(JSON.stringify(stroke).length / 10);
  });

  it('bounds imported text and reference arrays in compact inspection', async () => {
    const longText = 'agent context '.repeat(1_000);
    const note = { id: 'long-note', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: longText, sourceIds: Array.from({ length: 100 }, (_, index) => `source-${index}`) };
    const controller = harness({ ...createDocument(), objects: [note] });
    const projection = await createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_inspect')!.execute({ ids: [note.id] }) as { objects: Record<string, unknown>[] };
    expect(projection.objects[0]).toMatchObject({ id: note.id, textLength: longText.length, textTruncated: true, sourceIdCount: 100, sourceIdsTruncated: true });
    expect((projection.objects[0].text as string).length).toBe(240);
    expect((projection.objects[0].sourceIds as string[])).toHaveLength(50);
    expect(JSON.stringify(projection).length).toBeLessThan(JSON.stringify(note).length / 5);
  });

  it('bounds residual imported strings across compact inspection', async () => {
    const huge = 'x'.repeat(20_000);
    const rectangle = { id: huge, kind: 'rectangle' as const, createdAt: huge, from: { x: 0, y: 0 }, to: { x: 100, y: 80 }, color: huge };
    const controller = harness({ ...createDocument(), objects: [rectangle] });
    const projection = await createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_inspect')!.execute({ kinds: ['rectangle'] }) as { stringsTruncated: boolean; objects: Record<string, unknown>[] };
    expect(projection.stringsTruncated).toBe(true);
    expect(projection.objects[0]).toMatchObject({ kind: 'rectangle' });
    expect((projection.objects[0].id as string).length).toBe(240);
    expect((projection.objects[0].createdAt as string).length).toBe(240);
    expect((projection.objects[0].color as string).length).toBe(240);
    expect(JSON.stringify(projection).length).toBeLessThan(JSON.stringify(rectangle).length / 20);
  });

  it('bounds ID arrays in receipts and selection summaries', async () => {
    const objects = Array.from({ length: 120 }, (_, index) => ({ id: `receipt-${index}-${'x'.repeat(300)}`, kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: index * 10, y: 0, width: 100, height: 80, text: `Note ${index}` }));
    const controller = harness();
    const baseState = controller.getState;
    controller.getState = () => ({ ...baseState(), selectedIds: objects.map(({ id }) => id) });
    const receipt = await createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_apply_operations')!.execute({ operations: [{ type: 'replace_objects', objects }], confirmation: 'REPLACE CANVAS' }) as { transition: { affectedIds: string[]; affectedCount: number; affectedIdsTruncated: boolean }; summary: { selectedIds: string[]; selectedCount: number; selectedIdsTruncated: boolean } };
    expect(receipt.transition).toMatchObject({ affectedCount: 120, affectedIdsTruncated: true });
    expect(receipt.transition.affectedIds).toHaveLength(50);
    expect(receipt.transition.affectedIds.every((id) => id.length <= 240)).toBe(true);
    expect(receipt.summary).toMatchObject({ selectedCount: 120, selectedIdsTruncated: true });
    expect(receipt.summary.selectedIds).toHaveLength(50);
    expect(receipt.summary.selectedIds.every((id) => id.length <= 240)).toBe(true);
  });

  it('omits targeted-revert receipts that exceed the byte-capped journal', async () => {
    const text = 'x'.repeat(2_200_000);
    const note = { id: 'oversized-journal-note', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text };
    const controller = harness({ ...createDocument(), objects: [note] });
    const result = await createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_patch_objects')!.execute({ patches: [{ id: note.id, text: `${text}y` }] });
    expect(result).not.toHaveProperty('changeId');
  });

  it('journals only objects changed by a low-level replacement', async () => {
    const first = { id: 'journal-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'journal-second', text: 'Second' };
    const controller = harness({ ...createDocument(), objects: [first, second] }), tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_apply_operations')!.execute({ operations: [{ type: 'replace_objects', objects: [first, { ...second, text: 'Agent second' }] }], confirmation: 'REPLACE CANVAS' }) as { changeId: string };
    await tools.find(({ name }) => name === 'draw_apply_operations')!.execute({ operations: [{ type: 'put_object', object: { ...first, text: 'Human first' } }] });
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId });
    expect(controller.read().objects).toEqual([{ ...first, text: 'Human first' }, second]);
  });

  it('journals only objects actually changed by semantic patches', async () => {
    const first = { id: 'semantic-journal-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'semantic-journal-second', text: 'Second' };
    const controller = harness({ ...createDocument(), objects: [first, second] }), tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_patch_objects')!.execute({ patches: [{ id: first.id, text: first.text }, { id: second.id, text: 'Agent second' }] }) as { changeId: string };
    await controller.applyOperations([{ type: 'put_object', object: { ...first, text: 'Human first' } }]);
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId });
    expect(controller.read().objects).toEqual([{ ...first, text: 'Human first' }, second]);
  });

  it('preserves opaque imported IDs when patching', async () => {
    const note = { id: ' note ', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'Before' };
    const controller = harness({ ...createDocument(), objects: [note] });
    await createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_patch_objects')!.execute({ patches: [{ id: note.id, text: 'After' }] });
    expect(controller.read().objects[0]).toMatchObject({ id: note.id, text: 'After' });
  });

  it('preserves opaque existing IDs in composed edges and groups', async () => {
    const first = { id: ' first ', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: ' second ', x: 200, text: 'Second' };
    const controller = harness({ ...createDocument(), objects: [first, second] });
    await createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_compose')!.execute({ edges: [{ ref: 'edge', from: first.id, to: second.id }], groups: [{ ref: 'group', members: [first.id, second.id] }] });
    expect(controller.read().objects).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'connector', fromId: first.id, toId: second.id }),
      expect.objectContaining({ kind: 'group', childIds: [first.id, second.id] })
    ]));
  });

  it('rejects local composition refs that collide with existing object IDs', async () => {
    const existing = { id: 'brief', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'Existing' };
    const controller = harness({ ...createDocument(), objects: [existing] });
    await expect(createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_compose')!.execute({ nodes: [{ ref: existing.id, text: 'New' }] })).rejects.toThrow('conflicts with an existing object ID');
    expect(controller.read().objects).toEqual([existing]);
  });

  it('rejects raw local refs that shadow opaque existing IDs after normalization', async () => {
    const existing = { id: ' brief ', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'Existing' };
    const controller = harness({ ...createDocument(), objects: [existing] });
    await expect(createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_compose')!.execute({ nodes: [{ ref: existing.id, text: 'New' }] })).rejects.toThrow('conflicts with an existing object ID');
    expect(controller.read().objects).toEqual([existing]);
  });

  it('composes around a 20,000-deep connector dependency without overflowing the stack', async () => {
    const origin = { id: 'compose-origin', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'Origin' };
    const anchor = { ...origin, id: 'compose-anchor', x: 200, text: 'Anchor' }, objects: CanvasDocument['objects'] = [origin, anchor];
    for (let index = 0; index < 20_000; index += 1) objects.unshift({ id: `compose-deep-${index}`, kind: 'connector', createdAt: origin.createdAt, fromId: objects[0].id, toId: anchor.id, label: '' });
    const controller = harness({ ...createDocument(), objects });
    await createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_compose')!.execute({ groups: [{ ref: 'deep-group', members: [objects[0].id] }] });
    expect(controller.read().objects.at(-1)).toMatchObject({ kind: 'group', childIds: [objects[0].id] });
  });

  it('journals only objects actually moved by layout', async () => {
    const first = { id: 'layout-journal-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'layout-journal-second', x: 500, text: 'Second' };
    const controller = harness({ ...createDocument(), objects: [first, second] }), tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_layout')!.execute({ ids: [first.id, second.id], direction: 'row', gap: 40 }) as { changeId: string };
    await controller.applyOperations([{ type: 'put_object', object: { ...first, text: 'Human first' } }]);
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId });
    expect(controller.read().objects).toEqual([{ ...first, text: 'Human first' }, second]);
  });

  it('does not journal index shifts caused only by a low-level insertion', async () => {
    const first = { id: 'insert-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'insert-second', text: 'Second' };
    const inserted = { ...first, id: 'insert-new', text: 'New' };
    const controller = harness({ ...createDocument(), objects: [first, second] }), tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_apply_operations')!.execute({ operations: [{ type: 'replace_objects', objects: [inserted, first, second] }], confirmation: 'REPLACE CANVAS' }) as { changeId: string };
    await tools.find(({ name }) => name === 'draw_apply_operations')!.execute({ operations: [{ type: 'put_object', object: { ...first, text: 'Human first' } }] });
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId });
    expect(controller.read().objects).toEqual([{ ...first, text: 'Human first' }, second]);
  });

  it('projects only documented compact object fields and bounds semantic refs', async () => {
    const rectangle = { id: 'extended-shape', kind: 'rectangle' as const, createdAt: '2026-09-04T00:00:00.000Z', from: { x: 0, y: 0 }, to: { x: 100, y: 80 }, color: '#0057b8', extensionPayload: Array.from({ length: 10_000 }, (_, index) => index) };
    const controller = harness({ ...createDocument(), objects: [rectangle] });
    const tools = createDrawWebMcpTools(controller);
    const projection = await tools.find(({ name }) => name === 'draw_inspect')!.execute({ kinds: ['rectangle'] }) as { objects: Record<string, unknown>[] };
    expect(projection.objects[0]).not.toHaveProperty('extensionPayload');
    await expect(tools.find(({ name }) => name === 'draw_compose')!.execute({ nodes: [{ ref: 'r'.repeat(121), text: 'Too long' }] })).rejects.toThrow('at most 120');
    expect(JSON.stringify(tools.find(({ name }) => name === 'draw_compose')!.inputSchema)).toContain('"maxLength":120');
  });

  it('bounds semantic group memberships in schema and runtime', async () => {
    const controller = harness(), compose = createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_compose')!;
    const members = Array.from({ length: 201 }, (_, index) => `member-${index}`);
    await expect(compose.execute({ groups: [{ ref: 'oversized', members }] })).rejects.toThrow('at most 200');
    expect(JSON.stringify(compose.inputSchema)).toContain('"maxItems":200');
  });

  it('composes a labeled workflow from local references and creates v1 paths without storage fields', async () => {
    const controller = harness();
    const tools = createDrawWebMcpTools(controller);
    const compose = tools.find(({ name }) => name === 'draw_compose')!;
    const path = tools.find(({ name }) => name === 'draw_path')!;
    expect(compose).toBeDefined();
    expect(path).toBeDefined();

    const composed = await compose.execute({
      layout: { direction: 'row', gap: 80 },
      placement: 'visible-center',
      nodes: [{ ref: 'brief', text: 'Brief' }, { ref: 'ship', text: 'Launch' }],
      edges: [{ ref: 'handoff', from: 'brief', to: 'ship', label: 'approved' }],
      groups: [{ ref: 'mission', label: 'Mission', members: ['brief', 'ship'] }]
    }) as { refs: Record<string, string>; changeId: string };
    expect(composed.refs).toMatchObject({ brief: expect.any(String), ship: expect.any(String), handoff: expect.any(String), mission: expect.any(String) });
    expect(new Set(Object.values(composed.refs)).size).toBe(4);
    const created = controller.read().objects;
    expect(created).toHaveLength(4);
    expect(created.find(({ id }) => id === composed.refs.handoff)).toMatchObject({ kind: 'connector', fromId: composed.refs.brief, toId: composed.refs.ship, label: 'approved' });
    expect(created.find(({ id }) => id === composed.refs.mission)).toMatchObject({ kind: 'group', childIds: [composed.refs.brief, composed.refs.ship] });
    expect(created.every(({ createdAt }) => Number.isFinite(Date.parse(createdAt)))).toBe(true);

    await path.execute({ kind: 'polygon', color: 'signal', width: 6, points: [{ x: 0, y: -80 }, { x: 70, y: 80 }, { x: 0, y: 45 }, { x: -70, y: 80 }] });
    const stroke = controller.read().objects.at(-1)!;
    expect(stroke).toMatchObject({ kind: 'stroke', color: '#0057b8', width: 6 });
    if (stroke.kind !== 'stroke') throw new Error('Expected stroke');
    expect(stroke.points[0]).toEqual(stroke.points.at(-1));
    expect(controller.read().version).toBe('create-something.mapping-canvas.v1');
  });

  it('patches, arranges, lays out, focuses, deletes, replaces, and conflict-safely reverts agent changes', async () => {
    const first = { id: 'first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 100, y: 100, width: 200, height: 100, text: 'First' };
    const second = { ...first, id: 'second', x: 420, text: 'Second' };
    const third = { ...first, id: 'third', x: 740, text: 'Third' };
    const controller = harness({ ...createDocument(), objects: [first, second, third] });
    const focus = vi.fn();
    Object.assign(controller, { focus });
    const tools = createDrawWebMcpTools(controller);
    const patchTool = tools.find(({ name }) => name === 'draw_patch_objects')!;
    const layoutTool = tools.find(({ name }) => name === 'draw_layout')!;
    const focusTool = tools.find(({ name }) => name === 'draw_focus')!;
    const revertTool = tools.find(({ name }) => name === 'draw_revert_change')!;
    const deleteTool = tools.find(({ name }) => name === 'draw_delete')!;
    const replaceTool = tools.find(({ name }) => name === 'draw_replace_canvas')!;
    expect([patchTool, layoutTool, focusTool, revertTool, deleteTool, replaceTool].every(Boolean)).toBe(true);

    const patched = await patchTool.execute({ patches: [{ id: second.id, text: 'Owner', translate: { dx: 20, dy: 30 }, arrange: 'front' }] }) as { changeId: string };
    expect(controller.read().objects.map(({ id }) => id)).toEqual([first.id, third.id, second.id]);
    expect(controller.read().objects.at(-1)).toMatchObject({ id: second.id, text: 'Owner', x: 440, y: 130 });
    await revertTool.execute({ changeId: patched.changeId });
    expect(controller.read().objects.map(({ id }) => id)).toEqual([first.id, second.id, third.id]);
    expect(controller.read().objects[1]).toMatchObject(second);

    await layoutTool.execute({ ids: [first.id, second.id, third.id], direction: 'column', gap: 40 });
    expect(controller.read().objects.map((object) => object.kind === 'note' ? object.x : 0)).toEqual([100, 100, 100]);
    expect(controller.read().objects.map((object) => object.kind === 'note' ? object.y : 0)).toEqual([100, 240, 380]);
    await focusTool.execute({ scope: 'ids', ids: [second.id, third.id], padding: 80 });
    expect(focus).toHaveBeenCalledWith({ scope: 'ids', ids: [second.id, third.id], padding: 80 });

    await expect(deleteTool.execute({ ids: [third.id] })).rejects.toThrow('DELETE OBJECTS');
    await deleteTool.execute({ ids: [third.id], confirmation: 'DELETE OBJECTS' });
    expect(controller.read().objects.some(({ id }) => id === third.id)).toBe(false);
    await expect(replaceTool.execute({ objects: [] })).rejects.toThrow('REPLACE CANVAS');
    await replaceTool.execute({ objects: [], confirmation: 'REPLACE CANVAS' });
    expect(controller.read().objects).toEqual([]);
  });

  it('refuses targeted revert when a touched object changed after the recorded agent change', async () => {
    const note = { id: 'shared', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 100, y: 100, width: 200, height: 100, text: 'Original' };
    const controller = harness({ ...createDocument(), objects: [note] });
    const tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_patch_objects')!.execute({ patches: [{ id: note.id, text: 'Agent' }] }) as { changeId: string };
    await tools.find(({ name }) => name === 'draw_apply_operations')!.execute({ operations: [{ type: 'put_object', object: { ...note, text: 'Human' } }] });
    await expect(tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId })).rejects.toThrow('changed since');
  });

  it('refuses to revert a creation referenced by a later group', async () => {
    const controller = harness(), tools = createDrawWebMcpTools(controller);
    const created = await tools.find(({ name }) => name === 'draw_compose')!.execute({ nodes: [{ ref: 'created', text: 'Created' }] }) as { changeId: string; refs: Record<string, string> };
    const note = controller.read().objects[0];
    await tools.find(({ name }) => name === 'draw_apply_operations')!.execute({ operations: [{ type: 'put_object', object: {
      id: 'later-group', kind: 'group', createdAt: note.createdAt, x: 0, y: 0, width: 300, height: 200, label: 'Later', childIds: [created.refs.created]
    } }] });
    await expect(tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: created.changeId })).rejects.toThrow('depends on');
    expect(controller.read().objects.map(({ id }) => id)).toEqual([created.refs.created, 'later-group']);
  });

  it('serializes read-modify-write revisions and restores non-object fields on targeted revert', async () => {
    const note = { id: 'serial', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 100, y: 100, width: 200, height: 100, text: 'Original' };
    const controller = harness({ ...createDocument('Before title'), objects: [note] });
    const originalApply = controller.applyOperations;
    controller.applyOperations = vi.fn(originalApply);
    const tools = createDrawWebMcpTools(controller);
    await tools.find(({ name }) => name === 'draw_patch_objects')!.execute({ patches: [{ id: note.id, text: 'Serialized' }] });
    expect(controller.applyOperations).toHaveBeenLastCalledWith(expect.any(Array), expect.stringMatching(/^draw-/));

    const titleChange = await tools.find(({ name }) => name === 'draw_apply_operations')!.execute({ operations: [{ type: 'set_title', title: 'After title' }] }) as { changeId: string };
    expect(controller.read().title).toBe('After title');
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: titleChange.changeId });
    expect(controller.read().title).toBe('Before title');
  });

  it('returns the post-focus revision for safe mutation chaining', async () => {
    const note = { id: 'focus-note', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 100, y: 100, width: 200, height: 100, text: 'Focus' };
    const controller = harness({ ...createDocument(), objects: [note] });
    Object.assign(controller, { focus: async () => { await controller.applyOperations([{ type: 'set_viewport', viewport: { x: -80, y: -60, zoom: 1.2 } }]); } });
    const tools = createDrawWebMcpTools(controller);
    const result = await tools.find(({ name }) => name === 'draw_focus')!.execute({ scope: 'ids', ids: [note.id] }) as { revision: string };
    const after = await tools.find(({ name }) => name === 'draw_inspect')!.execute({}) as { revision: string };
    expect(result.revision).toBe(after.revision);
  });

  it('resolves dynamic focus scopes inside the serialized controller call', async () => {
    const document = createDocument(), focus = vi.fn(async (target) => ({ ids: ['created-before-focus'], bounds: { x: 0, y: 0, width: 100, height: 100 } }));
    let focusStarted = false;
    focus.mockImplementation(async (target) => { focusStarted = true; expect(target).toEqual({ scope: 'all', padding: 72 }); return { ids: ['created-before-focus'], bounds: { x: 0, y: 0, width: 100, height: 100 } }; });
    const controller = {
      getState: () => { if (!focusStarted) throw new Error('Focus scope was read before entering the controller queue.'); return { document, selectedIds: [], tool: 'select' as const, canUndo: false, canRedo: false }; },
      applyOperations: vi.fn(), select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), animate: vi.fn(), focus
    };
    const result = await createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_focus')!.execute({ scope: 'all' }) as { focusedIds: string[]; focusedCount: number };
    expect(result).toMatchObject({ focusedIds: ['created-before-focus'], focusedCount: 1 });
  });

  it('preserves later unrelated layer ordering when reverting an older patch', async () => {
    const first = { id: 'layer-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'layer-second', text: 'Second' };
    const third = { ...first, id: 'layer-third', text: 'Third' };
    const controller = harness({ ...createDocument(), objects: [first, second, third] });
    const tools = createDrawWebMcpTools(controller), patch = tools.find(({ name }) => name === 'draw_patch_objects')!;
    const older = await patch.execute({ patches: [{ id: second.id, text: 'Agent second' }] }) as { changeId: string };
    await patch.execute({ patches: [{ id: third.id, arrange: 'back' }] });
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: older.changeId });
    expect(controller.read().objects.map(({ id }) => id)).toEqual([third.id, first.id, second.id]);
    expect(controller.read().objects.find(({ id }) => id === second.id)).toMatchObject({ text: 'Second' });
  });

  it('preserves a later arrangement of the object touched by a non-order patch', async () => {
    const first = { id: 'slot-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'slot-second', text: 'Second' };
    const third = { ...first, id: 'slot-third', text: 'Third' };
    const controller = harness({ ...createDocument(), objects: [first, second, third] }), tools = createDrawWebMcpTools(controller);
    const patch = tools.find(({ name }) => name === 'draw_patch_objects')!;
    const older = await patch.execute({ patches: [{ id: second.id, text: 'Agent second' }] }) as { changeId: string };
    await patch.execute({ patches: [{ id: second.id, arrange: 'front' }] });
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: older.changeId });
    expect(controller.read().objects.map(({ id }) => id)).toEqual([first.id, third.id, second.id]);
    expect(controller.read().objects.at(-1)).toMatchObject({ id: second.id, text: 'Second' });
  });

  it('rejects a mixed delete when any requested ID is unknown', async () => {
    const note = { id: 'keep-me', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'Keep' };
    const controller = harness({ ...createDocument(), objects: [note] });
    const remove = createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_delete')!;
    await expect(remove.execute({ ids: [note.id, 'misspelled'], confirmation: 'DELETE OBJECTS' })).rejects.toThrow('Unknown');
    expect(controller.read().objects).toEqual([note]);
  });

  it('omits change IDs from receipts that targeted revert cannot consume', async () => {
    const tools = createDrawWebMcpTools(harness());
    for (const name of ['draw_undo', 'draw_redo']) {
      const result = await tools.find((tool) => tool.name === name)!.execute({});
      expect(result).not.toHaveProperty('changeId');
    }
  });

  it('normalizes semantic local references consistently', async () => {
    const controller = harness(), tools = createDrawWebMcpTools(controller);
    const result = await tools.find(({ name }) => name === 'draw_compose')!.execute({
      nodes: [{ ref: ' brief ', text: 'Brief' }, { ref: ' launch ', text: 'Launch' }],
      edges: [{ ref: ' approval ', from: ' brief ', to: ' launch ', label: 'approved' }],
      groups: [{ ref: ' mission ', label: 'Mission', members: [' brief ', ' launch '] }]
    }) as { refs: Record<string, string> };
    expect(result.refs).toHaveProperty('brief');
    expect(controller.read().objects).toHaveLength(4);
  });

  it('accepts local references that match inherited object keys', async () => {
    const controller = harness(), tools = createDrawWebMcpTools(controller);
    const result = await tools.find(({ name }) => name === 'draw_compose')!.execute({
      nodes: [{ ref: 'constructor', text: 'Constructor' }, { ref: '__proto__', text: 'Prototype' }],
      edges: [{ ref: 'toString', from: 'constructor', to: '__proto__' }]
    }) as { refs: Record<string, string> };
    expect(Object.keys(result.refs).sort()).toEqual(['__proto__', 'constructor', 'toString']);
    expect(controller.read().objects).toHaveLength(3);
  });

  it('connects to a group created in the same composition batch', async () => {
    const controller = harness(), tools = createDrawWebMcpTools(controller);
    const result = await tools.find(({ name }) => name === 'draw_compose')!.execute({
      nodes: [{ ref: 'brief', text: 'Brief' }, { ref: 'launch', text: 'Launch' }],
      groups: [{ ref: 'mission', label: 'Mission', members: ['brief'] }],
      edges: [{ ref: 'handoff', from: 'mission', to: 'launch', label: 'approved' }]
    }) as { refs: Record<string, string> };
    expect(controller.read().objects.find(({ id }) => id === result.refs.handoff)).toMatchObject({
      kind: 'connector',
      fromId: result.refs.mission,
      toId: result.refs.launch
    });
  });

  it('summarizes conversion provenance in compact inspection', async () => {
    const source = { id: 'source', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'Source' };
    const converted = { ...source, id: 'converted', text: 'Converted', sourceIds: [source.id], sourceSnapshot: Array.from({ length: 100 }, (_, index) => ({ ...source, id: `source-${index}` })) };
    const tools = createDrawWebMcpTools(harness({ ...createDocument(), objects: [converted] }));
    const result = await tools.find(({ name }) => name === 'draw_inspect')!.execute({ limit: 1 }) as { objects: Array<Record<string, unknown>> };
    expect(result.objects[0]).not.toHaveProperty('sourceSnapshot');
    expect(result.objects[0]).toMatchObject({ sourceIds: [source.id], sourceSnapshotCount: 100 });
    expect(JSON.stringify(result).length).toBeLessThan(3000);
  });

  it('rejects semantic connector self-loops without changing the canvas', async () => {
    const controller = harness(), compose = createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_compose')!;
    await expect(compose.execute({
      nodes: [{ ref: 'only', text: 'Only' }],
      edges: [{ ref: 'loop', from: 'only', to: 'only' }]
    })).rejects.toThrow('distinct endpoints');
    expect(controller.read().objects).toEqual([]);
  });

  it('composes nested groups independently of declaration order', async () => {
    const controller = harness(), tools = createDrawWebMcpTools(controller);
    const result = await tools.find(({ name }) => name === 'draw_compose')!.execute({
      nodes: [{ ref: 'brief', text: 'Brief' }],
      groups: [
        { ref: 'portfolio', label: 'Portfolio', members: ['mission'] },
        { ref: 'mission', label: 'Mission', members: ['brief'] }
      ]
    }) as { refs: Record<string, string> };
    expect(controller.read().objects.find(({ id }) => id === result.refs.portfolio)).toMatchObject({
      kind: 'group',
      childIds: [result.refs.mission]
    });
  });

  it('waits for connector endpoints before bounding an enclosing group', async () => {
    const controller = harness(), tools = createDrawWebMcpTools(controller);
    const result = await tools.find(({ name }) => name === 'draw_compose')!.execute({
      nodes: [{ ref: 'source', text: 'Source' }, { ref: 'target', text: 'Target' }],
      edges: [{ ref: 'handoff', from: 'source', to: 'target-group' }],
      groups: [
        { ref: 'edge-group', label: 'Edge group', members: ['handoff'] },
        { ref: 'target-group', label: 'Target group', members: ['target'] }
      ]
    }) as { refs: Record<string, string> };
    const objects = controller.read().objects;
    const enclosing = objects.find(({ id }) => id === result.refs['edge-group'])!;
    const target = objects.find(({ id }) => id === result.refs['target-group'])!;
    expect(enclosing).toMatchObject({ kind: 'group' });
    expect(target).toMatchObject({ kind: 'group' });
    if (enclosing.kind !== 'group' || target.kind !== 'group') throw new Error('Expected groups');
    expect(enclosing.x + enclosing.width).toBeGreaterThanOrEqual(target.x + target.width);
  });

  it('waits for transitive connector endpoints before bounding an enclosing group', async () => {
    const controller = harness(), tools = createDrawWebMcpTools(controller);
    const result = await tools.find(({ name }) => name === 'draw_compose')!.execute({
      nodes: [{ ref: 'source', text: 'Source' }, { ref: 'target', text: 'Target' }],
      edges: [
        { ref: 'outer-edge', from: 'source', to: 'inner-edge' },
        { ref: 'inner-edge', from: 'source', to: 'target-group' }
      ],
      groups: [
        { ref: 'edge-group', label: 'Edge group', members: ['outer-edge'] },
        { ref: 'target-group', label: 'Target group', members: ['target'] }
      ]
    }) as { refs: Record<string, string> };
    const objects = controller.read().objects;
    const enclosing = objects.find(({ id }) => id === result.refs['edge-group'])!;
    const target = objects.find(({ id }) => id === result.refs['target-group'])!;
    if (enclosing.kind !== 'group' || target.kind !== 'group') throw new Error('Expected groups');
    expect(enclosing.x + enclosing.width).toBeGreaterThanOrEqual(target.x + target.width);
  });

  it('composes an edge using only existing canvas objects', async () => {
    const first = { id: 'existing-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'existing-second', x: 200, text: 'Second' };
    const controller = harness({ ...createDocument(), objects: [first, second] }), tools = createDrawWebMcpTools(controller);
    const result = await tools.find(({ name }) => name === 'draw_compose')!.execute({
      edges: [{ ref: 'existing-edge', from: first.id, to: second.id, label: 'existing' }]
    }) as { refs: Record<string, string> };
    expect(controller.read().objects.at(-1)).toMatchObject({ id: result.refs['existing-edge'], kind: 'connector', fromId: first.id, toId: second.id });
  });

  it('rejects layout roots that overlap through group membership', async () => {
    const child = { id: 'group-child', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 20, y: 40, width: 100, height: 80, text: 'Child' };
    const group = { id: 'parent-group', kind: 'group' as const, createdAt: child.createdAt, x: 0, y: 0, width: 160, height: 140, label: 'Parent', childIds: [child.id] };
    const controller = harness({ ...createDocument(), objects: [group, child] });
    const layout = createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_layout')!;
    await expect(layout.execute({ ids: [group.id, child.id], direction: 'row' })).rejects.toThrow('overlap');
    expect(controller.read().objects).toEqual([group, child]);
  });

  it('rejects layout roots with a shared descendant', async () => {
    const child = { id: 'shared-child', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 20, y: 40, width: 100, height: 80, text: 'Child' };
    const first = { id: 'first-group', kind: 'group' as const, createdAt: child.createdAt, x: 0, y: 0, width: 160, height: 140, label: 'First', childIds: [child.id] };
    const second = { ...first, id: 'second-group', x: 240, label: 'Second' };
    const controller = harness({ ...createDocument(), objects: [first, second, child] });
    const layout = createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_layout')!;
    await expect(layout.execute({ ids: [first.id, second.id], direction: 'row' })).rejects.toThrow('overlap');
    expect(controller.read().objects).toEqual([first, second, child]);
  });

  it('rejects layer arrangement for groups that always render behind content', async () => {
    const child = { id: 'arrange-child', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 20, y: 40, width: 100, height: 80, text: 'Child' };
    const group = { id: 'arrange-group', kind: 'group' as const, createdAt: child.createdAt, x: 0, y: 0, width: 160, height: 140, label: 'Group', childIds: [child.id] };
    const controller = harness({ ...createDocument(), objects: [group, child] });
    const patch = createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_patch_objects')!;
    await expect(patch.execute({ patches: [{ id: group.id, arrange: 'front' }] })).rejects.toThrow('Group layer arrangement');
    expect(controller.read().objects).toEqual([group, child]);
  });

  it('rejects connector translation instead of reporting a no-op success', async () => {
    const first = { id: 'translate-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'translate-second', x: 200, text: 'Second' };
    const connector = { id: 'translate-edge', kind: 'connector' as const, createdAt: first.createdAt, fromId: first.id, toId: second.id, label: 'Edge' };
    const controller = harness({ ...createDocument(), objects: [first, second, connector] });
    const patch = createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_patch_objects')!;
    await expect(patch.execute({ patches: [{ id: connector.id, translate: { dx: 20, dy: 30 } }] })).rejects.toThrow('connector');
    expect(controller.read().objects).toEqual([first, second, connector]);
  });

  it('rejects moving a group when connector endpoints are outside the group', async () => {
    const first = { id: 'external-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'external-second', x: 200, text: 'Second' };
    const connector = { id: 'contained-edge', kind: 'connector' as const, createdAt: first.createdAt, fromId: first.id, toId: second.id, label: 'Edge' };
    const group = { id: 'edge-only-group', kind: 'group' as const, createdAt: first.createdAt, x: -20, y: -40, width: 340, height: 160, label: 'Edges', childIds: [connector.id] };
    const initial = { ...createDocument(), objects: [group, first, second, connector] };
    for (const [toolName, input] of [
      ['draw_patch_objects', { patches: [{ id: group.id, translate: { dx: 20, dy: 30 } }] }],
      ['draw_layout', { ids: [group.id], direction: 'row' }]
    ] as const) {
      const controller = harness(initial), tool = createDrawWebMcpTools(controller).find(({ name }) => name === toolName)!;
      await expect(tool.execute(input)).rejects.toThrow('connector endpoints');
      expect(controller.read().objects).toEqual(initial.objects);
    }
  });

  it('arranges visible objects across fixed background groups', async () => {
    const first = { id: 'visible-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'visible-second', text: 'Second' };
    const group = { id: 'background-group', kind: 'group' as const, createdAt: first.createdAt, x: 0, y: 0, width: 160, height: 140, label: 'Background', childIds: [first.id] };
    const controller = harness({ ...createDocument(), objects: [first, group, second] });
    const tools = createDrawWebMcpTools(controller), patch = tools.find(({ name }) => name === 'draw_patch_objects')!;
    const changed = await patch.execute({ patches: [{ id: second.id, arrange: 'backward' }] }) as { changeId: string };
    expect(controller.read().objects.map(({ id }) => id)).toEqual([second.id, group.id, first.id]);
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId });
    expect(controller.read().objects.map(({ id }) => id)).toEqual([first.id, group.id, second.id]);
  });

  it('reverts a whole-canvas replacement that only changes layer order', async () => {
    const first = { id: 'replace-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'replace-second', text: 'Second' };
    const controller = harness({ ...createDocument(), objects: [first, second] }), tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_replace_canvas')!.execute({ objects: [second, first], confirmation: 'REPLACE CANVAS' }) as { changeId: string };
    expect(controller.read().objects.map(({ id }) => id)).toEqual([second.id, first.id]);
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId });
    expect(controller.read().objects.map(({ id }) => id)).toEqual([first.id, second.id]);
  });

  it('preserves later content edits while reverting a pure layer reorder', async () => {
    const first = { id: 'content-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'content-second', text: 'Second' };
    const controller = harness({ ...createDocument(), objects: [first, second] }), tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_replace_canvas')!.execute({ objects: [second, first], confirmation: 'REPLACE CANVAS' }) as { changeId: string };
    await controller.applyOperations([{ type: 'put_object', object: { ...second, text: 'Human second' } }]);
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId });
    expect(controller.read().objects).toEqual([first, { ...second, text: 'Human second' }]);
  });

  it('preserves a later insertion slot while reverting a partial layer reorder', async () => {
    const first = { id: 'slot-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'slot-second', text: 'Second' }, third = { ...first, id: 'slot-third', text: 'Third' }, inserted = { ...first, id: 'slot-inserted', text: 'Inserted' };
    const controller = harness({ ...createDocument(), objects: [first, second, third] }), tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_patch_objects')!.execute({ patches: [{ id: second.id, arrange: 'back' }] }) as { changeId: string };
    await controller.applyOperations([{ type: 'replace_objects', objects: [second, inserted, first, third] }]);
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId });
    expect(controller.read().objects.map(({ id }) => id)).toEqual([first.id, inserted.id, second.id, third.id]);
  });

  it('preserves a later insertion slot while reverting a mixed edit and reorder', async () => {
    const first = { id: 'mixed-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'mixed-second', text: 'Second' }, third = { ...first, id: 'mixed-third', text: 'Third' }, inserted = { ...first, id: 'mixed-inserted', text: 'Inserted' };
    const controller = harness({ ...createDocument(), objects: [first, second, third] }), tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_patch_objects')!.execute({ patches: [{ id: second.id, text: 'Edited', arrange: 'back' }] }) as { changeId: string };
    const edited = { ...second, text: 'Edited' };
    await controller.applyOperations([{ type: 'replace_objects', objects: [edited, inserted, first, third] }]);
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId });
    expect(controller.read().objects).toEqual([first, inserted, second, third]);
  });

  it('preserves a later insertion slot while reverting membership and order changes', async () => {
    const base = { id: 'membership-u', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'U' };
    const a = { ...base, id: 'membership-a', text: 'A' }, b = { ...base, id: 'membership-b', text: 'B' }, c = { ...base, id: 'membership-c', text: 'C' }, v = { ...base, id: 'membership-v', text: 'V' }, inserted = { ...base, id: 'membership-x', text: 'X' };
    const controller = harness({ ...createDocument(), objects: [base, a, b, c, v] }), tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_replace_canvas')!.execute({ objects: [base, c, b, v], confirmation: 'REPLACE CANVAS' }) as { changeId: string };
    await controller.applyOperations([{ type: 'replace_objects', objects: [base, c, inserted, b, v] }]);
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId });
    expect(controller.read().objects).toEqual([base, a, b, inserted, c, v]);
  });

  it('validates and reverts the maximum semantic layer reorder without repeated index scans', async () => {
    const objects = Array.from({ length: 1_000 }, (_, index) => ({ id: `revert-scale-${index}`, kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: index, y: 0, width: 80, height: 60, text: String(index) }));
    const controller = harness({ ...createDocument(), objects }), tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_replace_canvas')!.execute({ objects: [...objects].reverse(), confirmation: 'REPLACE CANVAS' }) as { changeId: string };
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId });
    expect(controller.read().objects.map(({ id }) => id)).toEqual(objects.map(({ id }) => id));
  });

  it('preserves a newer layer position while reverting an older whole-canvas reorder', async () => {
    const first = { id: 'older-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'older-second', text: 'Second' };
    const third = { ...first, id: 'newer-third', text: 'Third' };
    const controller = harness({ ...createDocument(), objects: [first, second] }), tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_replace_canvas')!.execute({ objects: [second, first], confirmation: 'REPLACE CANVAS' }) as { changeId: string };
    await tools.find(({ name }) => name === 'draw_apply_operations')!.execute({ operations: [{ type: 'put_object', object: third }] });
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId });
    expect(controller.read().objects.map(({ id }) => id)).toEqual([first.id, second.id, third.id]);
  });

  it('preserves a newer layer position while reverting a replacement that deleted an object', async () => {
    const first = { id: 'deleted-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'surviving-second', text: 'Second' };
    const third = { ...first, id: 'newer-after-delete', text: 'Third' };
    const controller = harness({ ...createDocument(), objects: [first, second] }), tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_replace_canvas')!.execute({ objects: [second], confirmation: 'REPLACE CANVAS' }) as { changeId: string };
    await tools.find(({ name }) => name === 'draw_apply_operations')!.execute({ operations: [{ type: 'put_object', object: third }] });
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId });
    expect(controller.read().objects.map(({ id }) => id)).toEqual([first.id, second.id, third.id]);
  });

  it('restores a deleted object without treating an unchanged order anchor as an object conflict', async () => {
    const first = { id: 'anchor-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'anchor-second', text: 'Second' };
    const controller = harness({ ...createDocument(), objects: [first, second] }), tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_replace_canvas')!.execute({ objects: [second], confirmation: 'REPLACE CANVAS' }) as { changeId: string };
    await controller.applyOperations([{ type: 'put_object', object: { ...second, text: 'Human second' } }]);
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId });
    expect(controller.read().objects).toEqual([first, { ...second, text: 'Human second' }]);
  });

  it('restores reordered replacement objects by identity across layer-kind changes', async () => {
    const first = { id: 'kind-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'kind-second', text: 'Second' };
    const changedSecond = { id: second.id, kind: 'group' as const, createdAt: second.createdAt, x: 0, y: 0, width: 160, height: 140, label: 'Changed', childIds: [first.id] };
    const controller = harness({ ...createDocument(), objects: [first, second] }), tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_replace_canvas')!.execute({ objects: [changedSecond, first], confirmation: 'REPLACE CANVAS' }) as { changeId: string };
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId });
    expect(controller.read().objects).toEqual([first, second]);
  });

  it('refuses revert after a touched layer is rearranged again', async () => {
    const first = { id: 'order-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'order-second', text: 'Second' };
    const third = { ...first, id: 'order-third', text: 'Third' };
    const controller = harness({ ...createDocument(), objects: [first, second, third] }), tools = createDrawWebMcpTools(controller);
    const patch = tools.find(({ name }) => name === 'draw_patch_objects')!;
    const older = await patch.execute({ patches: [{ id: second.id, arrange: 'front' }] }) as { changeId: string };
    await patch.execute({ patches: [{ id: second.id, arrange: 'back' }] });
    await expect(tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: older.changeId })).rejects.toThrow('layer order changed');
    expect(controller.read().objects.map(({ id }) => id)).toEqual([second.id, first.id, third.id]);
  });

  it('refuses to resurrect an order-touched object deleted after the receipt', async () => {
    const first = { id: 'deleted-after-order-first', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 0, y: 0, width: 100, height: 80, text: 'First' };
    const second = { ...first, id: 'deleted-after-order-second', text: 'Second' };
    const controller = harness({ ...createDocument(), objects: [first, second] }), tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_replace_canvas')!.execute({ objects: [second, first], confirmation: 'REPLACE CANVAS' }) as { changeId: string };
    await controller.applyOperations([{ type: 'remove_objects', ids: [first.id] }]);
    await expect(tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId })).rejects.toThrow(`Object ${first.id} changed`);
    expect(controller.read().objects).toEqual([second]);
  });

  it('fails closed for destructive replacement and reset', async () => {
    const reset = vi.fn();
    const controller = {
      getState: () => ({ document: createDocument(), selectedIds: [], tool: 'pen' as const, canUndo: false, canRedo: false }),
      applyOperations: vi.fn(), select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset, animate: vi.fn()
    };
    const tools = createDrawWebMcpTools(controller);
    const apply = tools.find(({ name }) => name === 'draw_apply_operations')!;
    await expect(apply.execute({ operations: [{ type: 'replace_objects', objects: [] }] })).rejects.toThrow('REPLACE CANVAS');
    await expect(tools.find(({ name }) => name === 'draw_reset')!.execute({})).rejects.toThrow('RESET CANVAS');
    expect(controller.applyOperations).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
  });

  it('includes restored source objects in the visible transition receipt', async () => {
    const source = { id: 'source-note', kind: 'note' as const, createdAt: '2026-09-02T00:00:00.000Z', x: 1800, y: 1200, width: 260, height: 132, text: 'Source' };
    const converted = { ...source, id: 'converted-note', text: 'Converted', sourceIds: [source.id], sourceSnapshot: [source] };
    let document: CanvasDocument = { ...createDocument(), objects: [converted] };
    const animate = vi.fn();
    const tools = createDrawWebMcpTools({
      getState: () => ({ document, selectedIds: [], tool: 'pen', canUndo: false, canRedo: false }),
      applyOperations: async () => { const before = document; document = { ...document, objects: [source] }; return { before, after: document }; },
      select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), animate
    });
    await tools.find(({ name }) => name === 'draw_apply_operations')!.execute({ operations: [{ type: 'restore_conversion', id: converted.id }] });
    expect(animate).toHaveBeenCalledWith('restore', expect.arrayContaining([converted.id, source.id]), false);
  });

  it('preserves an explicit viewport while retaining the artifact transition receipt', async () => {
    const note = { id: 'framed-note', kind: 'note' as const, createdAt: '2026-09-02T00:00:00.000Z', x: 4000, y: 2800, width: 260, height: 132, text: 'Explicit frame' };
    let document = createDocument();
    const animate = vi.fn();
    const tools = createDrawWebMcpTools({
      getState: () => ({ document, selectedIds: [], tool: 'pen', canUndo: false, canRedo: false }),
      applyOperations: async () => { const before = document; document = { ...document, objects: [note], viewport: { x: -300, y: -200, zoom: .8 } }; return { before, after: document }; },
      select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), animate
    });
    const result = await tools.find(({ name }) => name === 'draw_apply_operations')!.execute({ operations: [{ type: 'put_object', object: note }, { type: 'set_viewport', viewport: { x: -300, y: -200, zoom: .8 } }] });
    expect(animate).toHaveBeenCalledWith('update', [note.id], true);
    expect(result).toMatchObject({ transition: { affectedIds: [note.id] }, revision: expect.any(String), summary: { objectCount: 1 } });
    expect(result).not.toHaveProperty('state');
  });

  it('preserves the restored viewport during a targeted revert transition', async () => {
    const note = { id: 'revert-framed-note', kind: 'note' as const, createdAt: '2026-09-02T00:00:00.000Z', x: 4000, y: 2800, width: 260, height: 132, text: 'Explicit frame' };
    const controller = harness(), tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_apply_operations')!.execute({
      operations: [{ type: 'put_object', object: note }, { type: 'set_viewport', viewport: { x: -300, y: -200, zoom: .8 } }]
    }) as { changeId: string };
    await tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId });
    expect(controller.animate).toHaveBeenLastCalledWith('restore', [note.id], true);
    expect(controller.read().viewport).toEqual(createDocument().viewport);
  });

  it('rejects a change receipt from a replaced canvas identity', async () => {
    let document = createDocument('Before title');
    const controller = {
      getState: () => ({ document, selectedIds: [] as string[], tool: 'select' as const, canUndo: true, canRedo: false }),
      applyOperations: async (operations: Parameters<typeof applyCanvasOperations>[1]) => {
        const before = document, after = applyCanvasOperations(document, operations);
        if (!after) throw new Error('Invalid operation batch');
        document = after;
        return { before, after };
      },
      select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(),
      reset: vi.fn(() => { document = createDocument('After title'); }), animate: vi.fn()
    };
    const tools = createDrawWebMcpTools(controller);
    const changed = await tools.find(({ name }) => name === 'draw_apply_operations')!.execute({ operations: [{ type: 'set_title', title: 'After title' }] }) as { changeId: string };
    await tools.find(({ name }) => name === 'draw_reset')!.execute({ confirmation: 'RESET CANVAS' });
    await expect(tools.find(({ name }) => name === 'draw_revert_change')!.execute({ changeId: changed.changeId })).rejects.toThrow('canvas');
    expect(document.title).toBe('After title');
  });

  it('prefers document registerTool and returns structured site-tool results', async () => {
    const registered: Array<Record<string, unknown>> = [];
    const modelContext = { registerTool: vi.fn((tool) => registered.push(tool as Record<string, unknown>)) };
    const tools = createDrawWebMcpTools({
      getState: () => ({ document: createDocument(), selectedIds: [], tool: 'pen', canUndo: false, canRedo: false }),
      applyOperations: vi.fn(), select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), animate: vi.fn()
    });
    expect(registerDrawWebMcpTools(tools, { documentContext: modelContext })).toEqual({ api: 'registerTool', registered: 19 });
    const result = await (registered[0].execute as (input: unknown) => Promise<unknown>)({});
    expect(result).toMatchObject({ document: { title: 'Untitled mapping session' }, selectedIds: [] });
  });

  it('wraps results for the legacy navigator registration contract', async () => {
    const registered: Array<Record<string, unknown>> = [];
    const tools = createDrawWebMcpTools({
      getState: () => ({ document: createDocument(), selectedIds: [], tool: 'pen', canUndo: false, canRedo: false }),
      applyOperations: vi.fn(), select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), animate: vi.fn()
    });
    registerDrawWebMcpTools(tools, { navigatorContext: { registerTool: (tool) => registered.push(tool as Record<string, unknown>) } });
    const result = await (registered[0].execute as (input: unknown) => Promise<unknown>)({});
    expect(result).toMatchObject({ content: [{ type: 'text' }] });
  });
});
