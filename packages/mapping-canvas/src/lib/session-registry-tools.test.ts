import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocument } from './document';
import { createRegistryPilotTools } from './session-registry-tools';
import { drawRevision, type DrawWebMcpTool } from './webmcp';

const service = vi.hoisted(() => ({ register: vi.fn(), link: vi.fn(), resolve: vi.fn(), edit: vi.fn(), exportScope: vi.fn(), importScope: vi.fn(), boundary: null as any }));
vi.mock('./session-registry-pilot', () => ({
  indexedDbRegistryStore: () => ({}), digest: async () => 'a'.repeat(64),
  createSessionRegistryPilot: (_store: unknown, boundary: unknown) => { service.boundary = boundary; return service; }
}));
vi.mock('./project-storage', () => ({ loadCanvasProject: vi.fn(async () => null) }));
const scope = { clientId: 'synthetic-a', workspaceId: 'workspace-a' };
const session = { provider: 'claude', sourceId: 'fixture', providerSessionId: 'session-a' };
function setup(saved = true) {
  let document = createDocument();
  const execute = vi.fn(async () => ({ revision: drawRevision(document) }));
  const persist = vi.fn(async () => saved);
  const base: DrawWebMcpTool = { name: 'draw_edit', title: 'Edit', description: 'Edit', inputSchema: {}, annotations: { readOnlyHint: false, openWorldHint: false }, execute };
  const tools = createRegistryPilotTools([base], () => document, persist);
  return { tools, execute, persist, document, setDocument: (next: typeof document) => document = next };
}
describe('opt-in browser registry adapter', () => {
  beforeEach(() => vi.clearAllMocks());
  it('requires explicit link consent and rejects unknown fields', async () => {
    const { tools } = setup();
    const tool = tools.find(t => t.name === 'draw_registry_link')!;
    await expect(tool.execute({ scope, mapId: 'map', session, optIn: false })).rejects.toThrow('consent');
    await expect(tool.execute({ scope, mapId: 'map', session, optIn: true, transcript: 'forbidden' })).rejects.toThrow('fields');
    expect(service.link).not.toHaveBeenCalled();
    await tool.execute({ scope, mapId: 'map', session, optIn: true });
    expect(service.link).toHaveBeenCalledWith(scope, 'map', session, true);
  });
  it('delegates guarded edits and confirms durable save without claiming renderer verification', async () => {
    const { document, execute, persist } = setup();
    const result = await service.boundary.edit(document.id, 'revision', [{ type: 'rename' }]);
    expect(execute).toHaveBeenCalledWith({ expectedRevision: 'revision', commands: [{ type: 'rename' }] });
    expect(persist).toHaveBeenCalledWith(document);
    expect(result.status).toBe('committed');
  });
  it('returns unknown when durable save fails and refuses another active map', async () => {
    const { document, execute } = setup(false);
    expect((await service.boundary.edit(document.id, 'revision', [])).status).toBe('unknown');
    await expect(service.boundary.edit('different-map', 'revision', [])).rejects.toThrow('Open');
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it('does not save a different map if activation changes during editing', async () => {
    const setupResult = setup();
    setupResult.execute.mockImplementation(async () => { setupResult.setDocument(createDocument()); return {revision:'different'}; });
    expect((await service.boundary.edit(setupResult.document.id, 'revision', [])).status).toBe('unknown');
    expect(setupResult.persist).not.toHaveBeenCalled();
  });
  it('does not attribute a concurrent same-map edit to the first receipt', async () => {
    const h = setup();
    h.execute.mockImplementation(async () => {
      const revision = drawRevision(h.document);
      h.setDocument({ ...h.document, title: 'Concurrent later edit' });
      return { revision };
    });
    expect((await service.boundary.edit(h.document.id, 'revision', [])).status).toBe('unknown');
    expect(h.persist).not.toHaveBeenCalled();
  });
  it('requires explicit consent when restoring imported session links', async () => {
    const { tools } = setup();
    await expect(tools.find(t => t.name === 'draw_registry_import')!.execute({ scope, registry: {}, optIn: false })).rejects.toThrow('consent');
    expect(service.importScope).not.toHaveBeenCalled();
  });
  it('round trips registry objects without including canonical map content', async () => {
    const { tools } = setup();
    const registry = { version: 'draw.session-registry.v1', maps: [], links: [], receipts: [] };
    service.exportScope.mockResolvedValue(JSON.stringify(registry));
    expect(await tools.find(t => t.name === 'draw_registry_export')!.execute({ scope })).toEqual(registry);
    await tools.find(t => t.name === 'draw_registry_import')!.execute({ scope, registry, optIn: true });
    expect(service.importScope).toHaveBeenCalledWith(scope, JSON.stringify(registry), true);
  });
});
