import type { CanvasDocument } from './document';
import { editCommandSchema } from './editing';
import { loadCanvasProject } from './project-storage';
import type { Scope, SessionReference } from './session-registry';
import { createSessionRegistryPilot, indexedDbRegistryStore, digest } from './session-registry-pilot';
import { drawRevision, type DrawWebMcpTool } from './webmcp';

const idSchema = { type: 'string', minLength: 1, maxLength: 240 };
const scopeSchema = { type: 'object', additionalProperties: false, required: ['clientId', 'workspaceId'], properties: { clientId: idSchema, workspaceId: idSchema } };
const sessionSchema = { type: 'object', additionalProperties: false, required: ['provider', 'sourceId', 'providerSessionId'], properties: { provider: { type: 'string', enum: ['claude', 'codex'] }, sourceId: idSchema, providerSessionId: idSchema } };

const mapProperties = { clientId: idSchema, workspaceId: idSchema, mapId: idSchema };
const mapSchema = { type: 'object', additionalProperties: false, required: Object.keys(mapProperties), properties: mapProperties };
const hashSchema = { type: 'string', pattern: '^[a-f0-9]{64}$' };
const registrySchema = { type: 'object', additionalProperties: false, required: ['version', 'maps', 'links', 'receipts'], properties: {
  version: { const: 'draw.session-registry.v1' },
  maps: { type: 'array', maxItems: 200, items: mapSchema },
  links: { type: 'array', maxItems: 2000, items: { type: 'object', additionalProperties: false, required: [...Object.keys(mapProperties), 'session'], properties: { ...mapProperties, session: sessionSchema } } },
  receipts: { type: 'array', maxItems: 10000, items: { type: 'object', additionalProperties: false, required: [...Object.keys(mapProperties), 'operationId', 'requestHash', 'expectedRevision', 'status'], properties: { ...mapProperties, operationId: idSchema, requestHash: hashSchema, expectedRevision: idSchema, status: { type: 'string', enum: ['committed', 'verified', 'unknown', 'failed'] }, resultingRevision: idSchema, contentHash: hashSchema, session: sessionSchema } } }
} };

/** Opt-in local browser tools. Scope IDs label data; they are not authentication. */
export function createRegistryPilotTools(
  tools: DrawWebMcpTool[],
  getDocument: () => CanvasDocument,
  persistDocument: (document: CanvasDocument) => Promise<boolean>
): DrawWebMcpTool[] {
  const editTool = tools.find(tool => tool.name === 'draw_edit');
  if (!editTool) throw new Error('Registry pilot requires the existing Draw editing boundary.');
  const pilot = createSessionRegistryPilot(indexedDbRegistryStore(), {
    readMap: async id => getDocument().id === id ? getDocument() : loadCanvasProject(id),
    revision: drawRevision,
    edit: async (mapId, expectedRevision, commands) => {
      if (getDocument().id !== mapId) throw new Error('Open this registered map before editing it.');
      const mutation = await editTool.execute({ expectedRevision, commands }) as { revision?: string };
      if (getDocument().id !== mapId) return { status: 'unknown' as const };
      // Svelte state uses proxies, which structuredClone cannot serialize.
      const after = JSON.parse(JSON.stringify(getDocument())) as CanvasDocument;
      if (!mutation || mutation.revision !== drawRevision(after)) return { status: 'unknown' as const };
      try {
        if (!await persistDocument(after)) return { status: 'unknown' as const };
        return { status: 'committed' as const, resultingRevision: drawRevision(after), contentHash: await digest(after) };
      } catch { return { status: 'unknown' as const }; }
    }
  });
  const tool = (name: string, title: string, description: string, properties: Record<string, unknown>, execute: DrawWebMcpTool['execute'], readOnly = false): DrawWebMcpTool => ({
    name, title, description: `${description} Local pilot only. Client/workspace IDs are labels, not an authorization boundary. No CTX calls or transcript copying.`,
    inputSchema: { type: 'object', additionalProperties: false, required: Object.keys(properties), properties },
    annotations: { readOnlyHint: readOnly, openWorldHint: false },
    execute: async input => {
      if (Object.keys(input).some(key => !(key in properties)) || Object.keys(properties).some(key => !(key in input))) throw new Error('Unexpected or missing registry tool fields.');
      return execute(input);
    }
  });
  return [
    tool('draw_registry_register', 'Register local map', 'Explicitly associate an existing canonical map with one client/workspace scope.', { scope: scopeSchema, mapId: idSchema }, input => pilot.register(input.scope as Scope, input.mapId as string)),
    tool('draw_registry_link', 'Link mapping session', 'Record only a logical Claude/Codex session reference. Requires explicit consent optIn=true; never supply transcript text or credentials.', { scope: scopeSchema, mapId: idSchema, session: sessionSchema, optIn: { type: 'boolean', const: true } }, input => { if (input.optIn !== true) throw new Error('Explicit session-link consent is required.'); return pilot.link(input.scope as Scope, input.mapId as string, input.session as SessionReference, true); }),
    tool('draw_registry_resolve', 'Resolve mapping session', 'Find scoped registered maps and read their current canonical documents, revisions and hashes. Missing maps remain unresolved references.', { scope: scopeSchema, session: sessionSchema }, input => pilot.resolve(input.scope as Scope, input.session as SessionReference), true),
    tool('draw_registry_edit', 'Edit registered map', 'Edit the active registered map through draw_edit. Reuse operationId only for identical requests. Stale revisions reject; inspect and replan. Committed means saved locally, not renderer verified. Unknown must not be blindly retried.', { scope: scopeSchema, mapId: idSchema, session: sessionSchema, operationId: idSchema, expectedRevision: idSchema, commands: { type: 'array', minItems: 1, maxItems: 100, items: editCommandSchema } }, input => pilot.edit(input.scope as Scope, input.mapId as string, input.operationId as string, input.expectedRevision as string, input.commands, input.session as SessionReference)),
    tool('draw_registry_export', 'Export local references', 'Export only scoped map/session references and receipts. Export canonical map JSON separately using Draw existing export.', { scope: scopeSchema }, async input => JSON.parse(await pilot.exportScope(input.scope as Scope)), true),
    tool('draw_registry_import', 'Import local references', 'Validate and merge a scoped registry export with explicit consent optIn=true to restore session links. Imported receipts are historical assertions, not newly verified live edits. Does not import map content or provider transcripts.', { scope: scopeSchema, registry: registrySchema, optIn: { type: 'boolean', const: true } }, input => { if (input.optIn !== true) throw new Error('Explicit import consent is required.'); return pilot.importScope(input.scope as Scope, JSON.stringify(input.registry), true); })
  ];
}
