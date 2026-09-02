import type { CanvasDocument, Tool } from './document';
import type { CanvasOperation } from './paired-session';

export const DRAW_WEBMCP_VERSION = '2026-09-02.1';
export const REPLACE_CONFIRMATION = 'REPLACE CANVAS';
export const RESET_CONFIRMATION = 'RESET CANVAS';

export type DrawState = {
  document: CanvasDocument;
  selectedIds: string[];
  tool: Tool;
  canUndo: boolean;
  canRedo: boolean;
};

export type DrawTransitionKind = 'create' | 'update' | 'remove' | 'convert' | 'restore' | 'history' | 'reset';
export type DrawController = {
  getState: () => DrawState;
  applyOperations: (operations: CanvasOperation[]) => Promise<CanvasDocument> | CanvasDocument;
  select: (ids: string[]) => void;
  setTool: (tool: Tool) => void;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
  reset: () => Promise<void> | void;
  animate: (kind: DrawTransitionKind, affectedIds: string[]) => string | void;
};

export type DrawWebMcpTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint: false };
  execute: (input: Record<string, unknown>) => Promise<unknown>;
};

const emptySchema = { type: 'object', properties: {}, additionalProperties: false };
const toolNames: Tool[] = ['select', 'pen', 'eraser', 'rectangle', 'ellipse', 'arrow', 'note', 'connector', 'group', 'pan'];
const pointSchema = { type: 'object', required: ['x', 'y'], additionalProperties: false, properties: { x: { type: 'number' }, y: { type: 'number' } } };
const canvasTitleSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 240,
  description: 'Canvas title. Maximum 240 UTF-8 bytes; this byte limit is validated atomically when the operation runs.',
  'x-maxUtf8Bytes': 240
};
const canvasObjectSchema = {
  oneOf: [
    { type: 'object', required: ['id', 'kind', 'createdAt', 'points', 'color', 'width'], properties: { id: { type: 'string' }, kind: { const: 'stroke' }, createdAt: { type: 'string' }, points: { type: 'array', minItems: 2, items: pointSchema }, color: { type: 'string' }, width: { type: 'number', exclusiveMinimum: 0 } } },
    ...(['rectangle', 'ellipse', 'arrow'] as const).map((kind) => ({ type: 'object', required: ['id', 'kind', 'createdAt', 'from', 'to', 'color'], properties: { id: { type: 'string' }, kind: { const: kind }, createdAt: { type: 'string' }, from: pointSchema, to: pointSchema, color: { type: 'string' } } })),
    { type: 'object', required: ['id', 'kind', 'createdAt', 'x', 'y', 'width', 'height', 'text'], properties: { id: { type: 'string' }, kind: { const: 'note' }, createdAt: { type: 'string' }, x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number', exclusiveMinimum: 0 }, height: { type: 'number', exclusiveMinimum: 0 }, text: { type: 'string' } } },
    { type: 'object', required: ['id', 'kind', 'createdAt', 'fromId', 'toId', 'label'], properties: { id: { type: 'string' }, kind: { const: 'connector' }, createdAt: { type: 'string' }, fromId: { type: 'string' }, toId: { type: 'string' }, label: { type: 'string' } } },
    { type: 'object', required: ['id', 'kind', 'createdAt', 'x', 'y', 'width', 'height', 'label', 'childIds'], properties: { id: { type: 'string' }, kind: { const: 'group' }, createdAt: { type: 'string' }, x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number', exclusiveMinimum: 0 }, height: { type: 'number', exclusiveMinimum: 0 }, label: { type: 'string' }, childIds: { type: 'array', items: { type: 'string' } } } }
  ]
};
const operationSchema = {
  oneOf: [
    { type: 'object', required: ['type', 'object'], additionalProperties: false, properties: { type: { const: 'put_object' }, object: canvasObjectSchema } },
    { type: 'object', required: ['type', 'ids'], additionalProperties: false, properties: { type: { const: 'remove_objects' }, ids: { type: 'array', minItems: 1, items: { type: 'string' } } } },
    { type: 'object', required: ['type', 'objects'], additionalProperties: false, properties: { type: { const: 'replace_objects' }, objects: { type: 'array', items: canvasObjectSchema } } },
    { type: 'object', required: ['type', 'title'], additionalProperties: false, properties: { type: { const: 'set_title' }, title: canvasTitleSchema } },
    { type: 'object', required: ['type', 'viewport'], additionalProperties: false, properties: { type: { const: 'set_viewport' }, viewport: { type: 'object', required: ['x', 'y', 'zoom'], additionalProperties: false, properties: { x: { type: 'number' }, y: { type: 'number' }, zoom: { type: 'number', minimum: 0.25, maximum: 3 } } } } },
    { type: 'object', required: ['type', 'selectedIds', 'target', 'resultId', 'createdAt'], additionalProperties: false, properties: { type: { const: 'convert' }, selectedIds: { type: 'array', minItems: 1, items: { type: 'string' } }, target: { type: 'string', enum: ['note', 'group'] }, resultId: { type: 'string' }, createdAt: { type: 'string' } } },
    { type: 'object', required: ['type', 'selectedIds', 'target', 'resultId', 'createdAt'], additionalProperties: false, properties: { type: { const: 'convert' }, selectedIds: { type: 'array', minItems: 2, items: { type: 'string' } }, target: { const: 'connector' }, resultId: { type: 'string' }, createdAt: { type: 'string' } } },
    { type: 'object', required: ['type', 'id'], additionalProperties: false, properties: { type: { const: 'restore_conversion' }, id: { type: 'string' } } }
  ]
};

function affectedIds(operations: CanvasOperation[]) {
  const ids = new Set<string>();
  for (const operation of operations) {
    if (operation.type === 'put_object') ids.add(operation.object.id);
    else if (operation.type === 'remove_objects') operation.ids.forEach((id) => ids.add(id));
    else if (operation.type === 'replace_objects') operation.objects.forEach(({ id }) => ids.add(id));
    else if (operation.type === 'convert') { operation.selectedIds.forEach((id) => ids.add(id)); ids.add(operation.resultId); }
    else if (operation.type === 'restore_conversion') ids.add(operation.id);
  }
  return [...ids];
}

function transitionKind(operations: CanvasOperation[]): DrawTransitionKind {
  if (operations.some(({ type }) => type === 'convert')) return 'convert';
  if (operations.some(({ type }) => type === 'restore_conversion')) return 'restore';
  if (operations.some(({ type }) => type === 'remove_objects')) return 'remove';
  if (operations.every(({ type }) => type === 'put_object')) return 'create';
  return 'update';
}

function changedObjectIds(before: CanvasDocument, after: CanvasDocument) {
  const prior = new Map(before.objects.map((object) => [object.id, JSON.stringify(object)]));
  const next = new Map(after.objects.map((object) => [object.id, JSON.stringify(object)]));
  return [...new Set([...prior.keys(), ...next.keys()])].filter((id) => prior.get(id) !== next.get(id));
}

function receipt(controller: DrawController, kind: DrawTransitionKind, ids: string[]) {
  const transitionId = controller.animate(kind, ids) || `agent-${crypto.randomUUID()}`;
  return { ok: true, transition: { transitionId, kind, affectedIds: ids, durationMs: 520 }, state: controller.getState() };
}

export function createDrawWebMcpTools(controller: DrawController): DrawWebMcpTool[] {
  return [
    {
      name: 'draw_get_state', title: 'Inspect Draw canvas',
      description: 'Read the complete current Draw document, selected object IDs, active tool, and undo/redo availability.',
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      execute: async () => controller.getState()
    },
    {
      name: 'draw_apply_operations', title: 'Change Draw canvas',
      description: `Atomically apply Draw document operations. Supported types: put_object, remove_objects, replace_objects, set_title, set_viewport, convert, restore_conversion. replace_objects requires confirmation exactly "${REPLACE_CONFIRMATION}". Changes share the visible canvas, history, persistence, and paired-device path.`,
      inputSchema: { type: 'object', required: ['operations'], additionalProperties: false, properties: { operations: { type: 'array', minItems: 1, maxItems: 100, items: operationSchema }, confirmation: { type: 'string' } } },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
      execute: async (input) => {
        const operations = input.operations;
        if (!Array.isArray(operations) || !operations.length || operations.length > 100) throw new Error('operations must contain 1 to 100 Draw operations.');
        if (operations.some((operation) => operation && typeof operation === 'object' && (operation as { type?: unknown }).type === 'replace_objects') && input.confirmation !== REPLACE_CONFIRMATION) throw new Error(`Whole-canvas replacement requires confirmation exactly "${REPLACE_CONFIRMATION}".`);
        const typed = operations as CanvasOperation[];
        await controller.applyOperations(typed);
        return receipt(controller, transitionKind(typed), affectedIds(typed));
      }
    },
    {
      name: 'draw_select', title: 'Select Draw objects', description: 'Select zero or more existing canvas object IDs so the user and agent share focus.',
      inputSchema: { type: 'object', required: ['ids'], additionalProperties: false, properties: { ids: { type: 'array', uniqueItems: true, items: { type: 'string' } } } },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      execute: async (input) => { controller.select(Array.isArray(input.ids) ? input.ids.map(String) : []); return { ok: true, selectedIds: controller.getState().selectedIds }; }
    },
    {
      name: 'draw_set_tool', title: 'Choose Draw tool', description: 'Choose the active human drawing tool without changing the document.',
      inputSchema: { type: 'object', required: ['tool'], additionalProperties: false, properties: { tool: { type: 'string', enum: toolNames } } },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      execute: async (input) => { if (!toolNames.includes(input.tool as Tool)) throw new Error('Unsupported Draw tool.'); controller.setTool(input.tool as Tool); return { ok: true, tool: controller.getState().tool }; }
    },
    {
      name: 'draw_undo', title: 'Undo Draw change', description: 'Undo the most recent durable canvas change.', inputSchema: emptySchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      execute: async () => { const before = controller.getState().document; await controller.undo(); return receipt(controller, 'history', changedObjectIds(before, controller.getState().document)); }
    },
    {
      name: 'draw_redo', title: 'Redo Draw change', description: 'Redo the next available canvas change.', inputSchema: emptySchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      execute: async () => { const before = controller.getState().document; await controller.redo(); return receipt(controller, 'history', changedObjectIds(before, controller.getState().document)); }
    },
    {
      name: 'draw_reset', title: 'Reset Draw canvas', description: `Clear the canvas and begin a new local document. Requires confirmation exactly "${RESET_CONFIRMATION}".`,
      inputSchema: { type: 'object', required: ['confirmation'], additionalProperties: false, properties: { confirmation: { type: 'string', const: RESET_CONFIRMATION } } },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
      execute: async (input) => { if (input.confirmation !== RESET_CONFIRMATION) throw new Error(`Reset requires confirmation exactly "${RESET_CONFIRMATION}".`); await controller.reset(); return receipt(controller, 'reset', []); }
    }
  ];
}

type ModelContextLike = { registerTool?: (tool: unknown) => unknown; provideContext?: (context: { tools: unknown[] }) => unknown };
function asWebMcpTool(tool: DrawWebMcpTool, legacy = false) {
  return { ...tool, execute: async (input: Record<string, unknown> = {}) => {
    const result = await tool.execute(input);
    return legacy ? { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } : result;
  } };
}

export function registerDrawWebMcpTools(tools: DrawWebMcpTool[], contexts?: { documentContext?: ModelContextLike; navigatorContext?: ModelContextLike }) {
  try {
    const doc = contexts?.documentContext ?? (typeof document === 'undefined' ? undefined : (document as Document & { modelContext?: ModelContextLike }).modelContext);
    const nav = contexts?.navigatorContext ?? (typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { modelContext?: ModelContextLike }).modelContext);
    if (typeof doc?.registerTool === 'function') { tools.forEach((tool) => doc.registerTool!(asWebMcpTool(tool))); return { api: 'registerTool' as const, registered: tools.length }; }
    const legacy = nav ?? doc;
    if (typeof legacy?.registerTool === 'function') { tools.forEach((tool) => legacy.registerTool!(asWebMcpTool(tool, true))); return { api: 'registerTool' as const, registered: tools.length }; }
    if (typeof legacy?.provideContext === 'function') { legacy.provideContext({ tools: tools.map((tool) => asWebMcpTool(tool, true)) }); return { api: 'provideContext' as const, registered: tools.length }; }
  } catch (error) { console.warn('[Draw WebMCP] registration failed', error); }
  return { api: 'none' as const, registered: 0 };
}
