import { describe, expect, it, vi } from 'vitest';
import { createDrawWebMcpTools, registerDrawWebMcpTools } from './webmcp';
import { createDocument, type CanvasDocument } from './document';

describe('Draw WebMCP tools', () => {
  it('exposes complete canvas control through bounded document operations', async () => {
    let document = createDocument();
    const animate = vi.fn();
    const tools = createDrawWebMcpTools({
      getState: () => ({ document, selectedIds: [], tool: 'pen', canUndo: false, canRedo: false }),
      applyOperations: async (operations) => { const before = document; document = { ...document, title: operations[0].type === 'set_title' ? operations[0].title : document.title }; return { before, after: document }; },
      select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), animate
    });
    expect(tools.map(({ name }) => name)).toEqual(['draw_get_state', 'draw_apply_operations', 'draw_select', 'draw_set_tool', 'draw_undo', 'draw_redo', 'draw_reset']);
    const applySchema = tools.find(({ name }) => name === 'draw_apply_operations')!.inputSchema;
    expect(JSON.stringify(applySchema)).toContain('x-maxUtf8Bytes');
    expect(JSON.stringify(applySchema)).toContain('"minItems":2');
    const result = await tools.find(({ name }) => name === 'draw_apply_operations')!.execute({ operations: [{ type: 'set_title', title: 'Agent map' }] });
    expect(document.title).toBe('Agent map');
    expect(animate).toHaveBeenCalledWith('update', [], false);
    expect(JSON.stringify(result)).toContain('transitionId');
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
    expect(result).toMatchObject({ transition: { affectedIds: [note.id] }, state: { document: { viewport: { x: -300, y: -200, zoom: .8 } } } });
  });

  it('prefers document registerTool and returns structured site-tool results', async () => {
    const registered: Array<Record<string, unknown>> = [];
    const modelContext = { registerTool: vi.fn((tool) => registered.push(tool as Record<string, unknown>)) };
    const tools = createDrawWebMcpTools({
      getState: () => ({ document: createDocument(), selectedIds: [], tool: 'pen', canUndo: false, canRedo: false }),
      applyOperations: vi.fn(), select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), animate: vi.fn()
    });
    expect(registerDrawWebMcpTools(tools, { documentContext: modelContext })).toEqual({ api: 'registerTool', registered: 7 });
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
