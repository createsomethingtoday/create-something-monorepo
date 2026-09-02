import { describe, expect, it, vi } from 'vitest';
import { createDrawWebMcpTools, registerDrawWebMcpTools } from './webmcp';
import { createDocument } from './document';

describe('Draw WebMCP tools', () => {
  it('exposes complete canvas control through bounded document operations', async () => {
    let document = createDocument();
    const animate = vi.fn();
    const tools = createDrawWebMcpTools({
      getState: () => ({ document, selectedIds: [], tool: 'pen', canUndo: false, canRedo: false }),
      applyOperations: async (operations) => { document = { ...document, title: operations[0].type === 'set_title' ? operations[0].title : document.title }; return document; },
      select: vi.fn(), setTool: vi.fn(), undo: vi.fn(), redo: vi.fn(), reset: vi.fn(), animate
    });
    expect(tools.map(({ name }) => name)).toEqual(['draw_get_state', 'draw_apply_operations', 'draw_select', 'draw_set_tool', 'draw_undo', 'draw_redo', 'draw_reset']);
    const result = await tools.find(({ name }) => name === 'draw_apply_operations')!.execute({ operations: [{ type: 'set_title', title: 'Agent map' }] });
    expect(document.title).toBe('Agent map');
    expect(animate).toHaveBeenCalledWith('update', []);
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
