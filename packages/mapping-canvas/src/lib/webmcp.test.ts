import { describe, expect, it, vi } from 'vitest';
import { createDrawWebMcpTools, registerDrawWebMcpTools } from './webmcp';
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

  it('exposes complete canvas control through bounded document operations', async () => {
    let document = createDocument();
    const animate = vi.fn();
    const tools = createDrawWebMcpTools({
      getState: () => ({ document, selectedIds: [], tool: 'pen', canUndo: false, canRedo: false }),
      applyOperations: async (operations) => { const before = document; document = { ...document, title: operations[0].type === 'set_title' ? operations[0].title : document.title }; return { before, after: document }; },
      select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), animate
    });
    expect(tools.map(({ name }) => name)).toEqual(['draw_get_state', 'draw_inspect', 'draw_compose', 'draw_path', 'draw_patch_objects', 'draw_layout', 'draw_focus', 'draw_revert_change', 'draw_delete', 'draw_replace_canvas', 'draw_apply_operations', 'draw_select', 'draw_set_tool', 'draw_undo', 'draw_redo', 'draw_reset']);
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
      version: '2026-09-04.1',
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
    expect(focus).toHaveBeenCalledWith({ ids: [second.id, third.id], padding: 80 });

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

  it('rejects layout roots that overlap through group membership', async () => {
    const child = { id: 'group-child', kind: 'note' as const, createdAt: '2026-09-04T00:00:00.000Z', x: 20, y: 40, width: 100, height: 80, text: 'Child' };
    const group = { id: 'parent-group', kind: 'group' as const, createdAt: child.createdAt, x: 0, y: 0, width: 160, height: 140, label: 'Parent', childIds: [child.id] };
    const controller = harness({ ...createDocument(), objects: [group, child] });
    const layout = createDrawWebMcpTools(controller).find(({ name }) => name === 'draw_layout')!;
    await expect(layout.execute({ ids: [group.id, child.id], direction: 'row' })).rejects.toThrow('overlap');
    expect(controller.read().objects).toEqual([group, child]);
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

  it('prefers document registerTool and returns structured site-tool results', async () => {
    const registered: Array<Record<string, unknown>> = [];
    const modelContext = { registerTool: vi.fn((tool) => registered.push(tool as Record<string, unknown>)) };
    const tools = createDrawWebMcpTools({
      getState: () => ({ document: createDocument(), selectedIds: [], tool: 'pen', canUndo: false, canRedo: false }),
      applyOperations: vi.fn(), select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), animate: vi.fn()
    });
    expect(registerDrawWebMcpTools(tools, { documentContext: modelContext })).toEqual({ api: 'registerTool', registered: 16 });
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
