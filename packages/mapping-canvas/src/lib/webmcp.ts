import { objectBounds, type CanvasDocument, type CanvasObject, type Point, type Tool } from './document';
import type { CanvasOperation } from './paired-session';
import { DRAWING_PALETTE } from './palette';

export const DRAW_WEBMCP_VERSION = '2026-09-04.1';
export const REPLACE_CONFIRMATION = 'REPLACE CANVAS';
export const RESET_CONFIRMATION = 'RESET CANVAS';
export const DELETE_CONFIRMATION = 'DELETE OBJECTS';

export type DrawState = {
  document: CanvasDocument;
  selectedIds: string[];
  tool: Tool;
  canUndo: boolean;
  canRedo: boolean;
  surface?: { width: number; height: number };
};

export type DrawTransitionKind = 'create' | 'update' | 'remove' | 'convert' | 'restore' | 'history' | 'reset';
export type DrawController = {
  getState: () => DrawState;
  applyOperations: (operations: CanvasOperation[], expectedRevision?: string) => Promise<{ before: CanvasDocument; after: CanvasDocument }> | { before: CanvasDocument; after: CanvasDocument };
  select: (ids: string[]) => void;
  setTool: (tool: Tool) => void;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
  reset: () => Promise<void> | void;
  animate: (kind: DrawTransitionKind, affectedIds: string[], preserveViewport?: boolean) => string | void;
  focus?: (target: { ids?: string[]; bounds?: { x: number; y: number; width: number; height: number }; padding: number }) => Promise<void> | void;
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
    { type: 'object', required: ['type', 'selectedIds', 'target', 'resultId', 'createdAt'], additionalProperties: false, properties: { type: { const: 'convert' }, selectedIds: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string' } }, target: { type: 'string', enum: ['note', 'group'] }, resultId: { type: 'string' }, createdAt: { type: 'string' } } },
    { type: 'object', required: ['type', 'selectedIds', 'target', 'resultId', 'createdAt'], additionalProperties: false, properties: { type: { const: 'convert' }, selectedIds: { type: 'array', minItems: 2, uniqueItems: true, items: { type: 'string' } }, target: { const: 'connector' }, resultId: { type: 'string' }, createdAt: { type: 'string' } } },
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

function transitionKind(before: CanvasDocument, operations: CanvasOperation[]): DrawTransitionKind {
  if (operations.some(({ type }) => type === 'convert')) return 'convert';
  if (operations.some(({ type }) => type === 'restore_conversion')) return 'restore';
  if (operations.some(({ type }) => type === 'remove_objects')) return 'remove';
  if (operations.every(({ type }) => type === 'put_object')) {
    const existingIds = new Set(before.objects.map(({ id }) => id));
    return operations.some((operation) => operation.type === 'put_object' && existingIds.has(operation.object.id)) ? 'update' : 'create';
  }
  return 'update';
}

function changedObjectIds(before: CanvasDocument, after: CanvasDocument) {
  const prior = new Map(before.objects.map((object) => [object.id, JSON.stringify(object)]));
  const next = new Map(after.objects.map((object) => [object.id, JSON.stringify(object)]));
  return [...new Set([...prior.keys(), ...next.keys()])].filter((id) => prior.get(id) !== next.get(id));
}

export function drawRevision(document: CanvasDocument) {
  const source = JSON.stringify(document);
  let hash = 14695981039346656037n;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= BigInt(source.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 1099511628211n);
  }
  return `draw-${hash.toString(36)}-${source.length.toString(36)}`;
}

function summary(controller: DrawController) {
  const state = controller.getState();
  const selected = compactIdList(state.selectedIds);
  return { objectCount: state.document.objects.length, selectedIds: selected.preview, selectedCount: selected.count, ...(selected.truncated ? { selectedIdsTruncated: true } : {}), tool: state.tool, canUndo: state.canUndo, canRedo: state.canRedo };
}

function compactIdList(ids: string[]) {
  return { preview: ids.slice(0, 50).map((id) => id.slice(0, 240)), count: ids.length, truncated: ids.length > 50 || ids.some((id) => id.length > 240) };
}

type NamedColor = (typeof DRAWING_PALETTE)[number]['id'];
function colorValue(value: unknown) {
  const named = DRAWING_PALETTE.find(({ id }) => id === value);
  if (!named) throw new Error(`color must be one of: ${DRAWING_PALETTE.map(({ id }) => id).join(', ')}.`);
  return named.value;
}

function identity(prefix: string) {
  return { id: `${prefix}-${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
}

function visibleCenter(state: DrawState) {
  const surface = state.surface ?? { width: 1440, height: 900 };
  const { x, y, zoom } = state.document.viewport;
  return { x: (-x + surface.width / 2) / zoom, y: (-y + surface.height / 2) / zoom };
}

function asRecords(value: unknown, label: string, maximum = 50) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maximum || value.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) throw new Error(`${label} must contain at most ${maximum} objects.`);
  return value as Record<string, unknown>[];
}

function requiredText(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

function finite(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function smoothPoints(points: Point[]) {
  if (points.length < 3) return points;
  const result: Point[] = [points[0]];
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index], next = points[index + 1];
    result.push({ x: current.x * .75 + next.x * .25, y: current.y * .75 + next.y * .25 });
    result.push({ x: current.x * .25 + next.x * .75, y: current.y * .25 + next.y * .75 });
  }
  result.push(points.at(-1)!);
  return result;
}

function translated(object: CanvasObject, dx: number, dy: number): CanvasObject {
  const point = ({ x, y }: Point) => ({ x: x + dx, y: y + dy });
  if (object.kind === 'stroke') return { ...object, points: object.points.map(point) };
  if (object.kind === 'rectangle' || object.kind === 'ellipse' || object.kind === 'arrow') return { ...object, from: point(object.from), to: point(object.to) };
  if (object.kind === 'note' || object.kind === 'group') return { ...object, x: object.x + dx, y: object.y + dy };
  return object;
}

function descendants(document: CanvasDocument, ids: string[]) {
  const result = new Set(ids), byId = new Map(document.objects.map((object) => [object.id, object]));
  const collect = (id: string) => {
    const object = byId.get(id);
    if (object?.kind !== 'group') return;
    for (const childId of object.childIds) if (!result.has(childId)) { result.add(childId); collect(childId); }
  };
  ids.forEach(collect);
  return result;
}

function boundsDependenciesAvailable(objects: CanvasObject[], allObjects: CanvasObject[]) {
  const byId = new Map(allObjects.map((object) => [object.id, object])), visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visited.has(id)) return true;
    const object = byId.get(id);
    if (!object) return false;
    visited.add(id);
    return object.kind !== 'connector' || (visit(object.fromId) && visit(object.toId));
  };
  return objects.every(({ id }) => visit(id));
}

function assertMovableConnectorEndpoints(objects: CanvasObject[], moving: Set<string>) {
  const stranded = objects.find((object) => object.kind === 'connector' && moving.has(object.id) && (!moving.has(object.fromId) || !moving.has(object.toId)));
  if (stranded) throw new Error(`Group movement requires connector endpoints to be included with ${stranded.id}.`);
}

function assertRevision(controller: DrawController, expected: unknown) {
  const current = drawRevision(controller.getState().document);
  if (typeof expected === 'string' && expected !== current) throw new Error(`Canvas revision is stale. Inspect again and retry with revision ${current}.`);
}

function boundProjectionStrings(value: unknown, state: { truncated: boolean }): unknown {
  if (typeof value === 'string') {
    if (value.length > 240) state.truncated = true;
    return value.slice(0, 240);
  }
  if (Array.isArray(value)) return value.map((item) => boundProjectionStrings(item, state));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, boundProjectionStrings(item, state)]));
  return value;
}

function receipt(controller: DrawController, kind: DrawTransitionKind, ids: string[], preserveViewport = false, changeId?: string) {
  const transitionId = controller.animate(kind, ids, preserveViewport) || `agent-${crypto.randomUUID()}`;
  const affected = compactIdList(ids);
  return { ok: true, ...(changeId ? { changeId } : {}), revision: drawRevision(controller.getState().document), transition: { transitionId, kind, affectedIds: affected.preview, affectedCount: affected.count, ...(affected.truncated ? { affectedIdsTruncated: true } : {}), durationMs: 520 }, summary: summary(controller) };
}

export function createDrawWebMcpTools(controller: DrawController): DrawWebMcpTool[] {
  const changes = new Map<string, { before: CanvasDocument; after: CanvasDocument; ids: string[] }>();
  const finish = (kind: DrawTransitionKind, ids: string[], before: CanvasDocument, after: CanvasDocument, preserveViewport = false) => {
    const changeId = `change-${crypto.randomUUID()}`;
    changes.set(changeId, { before, after, ids });
    if (changes.size > 100) changes.delete(changes.keys().next().value!);
    return receipt(controller, kind, ids, preserveViewport, changeId);
  };
  return [
    {
      name: 'draw_get_state', title: 'Inspect Draw canvas',
      description: 'Read the complete current Draw document, selected object IDs, active tool, and undo/redo availability.',
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      execute: async () => controller.getState()
    },
    {
      name: 'draw_inspect', title: 'Inspect Draw efficiently',
      description: 'Read a compact, filterable projection with revision, palette, surface, visible-world geometry, selection, and matching objects. Variable-size geometry, text, references, and residual strings are bounded; stringsTruncated signals that draw_get_state is needed for exact oversized values or the complete portable document.',
      inputSchema: {
        type: 'object', additionalProperties: false, properties: {
          ids: { type: 'array', uniqueItems: true, items: { type: 'string' } },
          kinds: { type: 'array', uniqueItems: true, items: { type: 'string', enum: ['stroke', 'rectangle', 'ellipse', 'arrow', 'note', 'connector', 'group'] } },
          text: { type: 'string', maxLength: 240 },
          limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 }
        }
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      execute: async (input) => {
        const state = controller.getState();
        const requestedIds = Array.isArray(input.ids) ? new Set(input.ids.map(String)) : undefined;
        const requestedKinds = Array.isArray(input.kinds) ? new Set(input.kinds.map(String)) : undefined;
        const needle = typeof input.text === 'string' ? input.text.trim().toLowerCase() : '';
        const limit = typeof input.limit === 'number' ? Math.max(1, Math.min(200, Math.floor(input.limit))) : 50;
        const matches = state.document.objects.filter((object) => {
          if (requestedIds && !requestedIds.has(object.id)) return false;
          if (requestedKinds && !requestedKinds.has(object.kind)) return false;
          if (!needle) return true;
          const searchable = object.kind === 'note' ? object.text : object.kind === 'connector' || object.kind === 'group' ? object.label : '';
          return searchable.toLowerCase().includes(needle);
        });
        const surface = state.surface ?? { width: 1440, height: 900 };
        const { x, y, zoom } = state.document.viewport;
        const projection = {
          version: DRAW_WEBMCP_VERSION,
          document: { id: state.document.id, title: state.document.title, version: state.document.version, updatedAt: state.document.updatedAt },
          revision: drawRevision(state.document),
          palette: Object.fromEntries(DRAWING_PALETTE.map(({ id, value }) => [id, value])),
          surface,
          visibleWorld: { x: -x / zoom, y: -y / zoom, width: surface.width / zoom, height: surface.height / zoom, zoom },
          summary: { ...summary(controller), matchedCount: matches.length },
          objects: matches.slice(0, limit).map((object) => {
            const { sourceSnapshot, sourceIds, ...compact } = object;
            const sources = sourceIds ? { sourceIds: sourceIds.slice(0, 50), sourceIdCount: sourceIds.length, ...(sourceIds.length > 50 ? { sourceIdsTruncated: true } : {}) } : {};
            const snapshots = sourceSnapshot ? { sourceSnapshotCount: sourceSnapshot.length } : {};
            if (compact.kind === 'stroke') {
              const { points, ...stroke } = compact;
              return { ...stroke, ...sources, ...snapshots, pointCount: points.length, bounds: objectBounds([object], state.document.objects) };
            }
            if (compact.kind === 'note') {
              const { text, ...note } = compact;
              return { ...note, ...sources, ...snapshots, text: text.slice(0, 240), textLength: text.length, ...(text.length > 240 ? { textTruncated: true } : {}) };
            }
            if (compact.kind === 'connector') {
              const { label, ...connector } = compact;
              return { ...connector, ...sources, ...snapshots, label: label.slice(0, 240), labelLength: label.length, ...(label.length > 240 ? { labelTruncated: true } : {}) };
            }
            if (compact.kind === 'group') {
              const { label, childIds, ...group } = compact;
              return { ...group, ...sources, ...snapshots, label: label.slice(0, 240), labelLength: label.length, ...(label.length > 240 ? { labelTruncated: true } : {}), childIds: childIds.slice(0, 50), childCount: childIds.length, ...(childIds.length > 50 ? { childIdsTruncated: true } : {}) };
            }
            return { ...compact, ...sources, ...snapshots };
          }),
          truncated: matches.length > limit
        };
        const stringState = { truncated: false };
        const bounded = boundProjectionStrings(projection, stringState) as typeof projection;
        return { ...bounded, stringsTruncated: stringState.truncated };
      }
    },
    {
      name: 'draw_compose', title: 'Compose a Draw artifact',
      description: 'Create notes, labeled relationships, groups, and basic shapes atomically from local references. Draw supplies IDs, timestamps, named palette values, deterministic layout, and visible-canvas placement.',
      inputSchema: {
        type: 'object', additionalProperties: false, properties: {
          expectedRevision: { type: 'string' },
          placement: { type: 'string', enum: ['visible-center', 'after-content'], default: 'visible-center' },
          layout: { type: 'object', additionalProperties: false, properties: { direction: { type: 'string', enum: ['row', 'column', 'grid'], default: 'row' }, gap: { type: 'number', minimum: 16, maximum: 400 }, columns: { type: 'integer', minimum: 1, maximum: 12 } } },
          nodes: { type: 'array', maxItems: 50, items: { type: 'object', required: ['ref', 'text'], additionalProperties: false, properties: { ref: { type: 'string' }, text: { type: 'string', maxLength: 4000 }, width: { type: 'number', minimum: 80, maximum: 1200 }, height: { type: 'number', minimum: 60, maximum: 900 } } } },
          shapes: { type: 'array', maxItems: 50, items: { type: 'object', required: ['ref', 'kind'], additionalProperties: false, properties: { ref: { type: 'string' }, kind: { type: 'string', enum: ['rectangle', 'ellipse', 'arrow'] }, color: { type: 'string', enum: DRAWING_PALETTE.map(({ id }) => id) }, width: { type: 'number', minimum: 8, maximum: 1600 }, height: { type: 'number', minimum: 8, maximum: 1200 } } } },
          edges: { type: 'array', maxItems: 100, items: { type: 'object', required: ['ref', 'from', 'to'], additionalProperties: false, properties: { ref: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' }, label: { type: 'string', maxLength: 240 } } } },
          groups: { type: 'array', maxItems: 20, items: { type: 'object', required: ['ref', 'members'], additionalProperties: false, properties: { ref: { type: 'string' }, label: { type: 'string', maxLength: 240 }, members: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string' } } } } }
        }
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      execute: async (input) => {
        const state = controller.getState();
        const currentRevision = drawRevision(state.document);
        if (typeof input.expectedRevision === 'string' && input.expectedRevision !== currentRevision) throw new Error(`Canvas revision is stale. Inspect again and retry with revision ${currentRevision}.`);
        const nodes = asRecords(input.nodes, 'nodes');
        const shapes = asRecords(input.shapes, 'shapes');
        const edges = asRecords(input.edges, 'edges', 100);
        const groups = asRecords(input.groups, 'groups', 20);
        if (!nodes.length && !shapes.length && !edges.length && !groups.length) throw new Error('draw_compose requires at least one node, shape, edge, or group.');
        const refs: Record<string, string> = Object.create(null) as Record<string, string>;
        const items = [...nodes.map((item) => ({ item, category: 'node' as const })), ...shapes.map((item) => ({ item, category: 'shape' as const }))];
        for (const { item, category } of items) {
          const ref = requiredText(item.ref, `${category}.ref`);
          if (Object.hasOwn(refs, ref)) throw new Error(`Duplicate local reference: ${ref}.`);
          refs[ref] = identity(category).id;
        }
        for (const edge of edges) {
          const ref = requiredText(edge.ref, 'edge.ref');
          if (Object.hasOwn(refs, ref)) throw new Error(`Duplicate local reference: ${ref}.`);
          refs[ref] = identity('connector').id;
        }
        for (const group of groups) {
          const ref = requiredText(group.ref, 'group.ref');
          if (Object.hasOwn(refs, ref)) throw new Error(`Duplicate local reference: ${ref}.`);
          refs[ref] = identity('group').id;
        }
        const layout = input.layout && typeof input.layout === 'object' ? input.layout as Record<string, unknown> : {};
        const direction = ['row', 'column', 'grid'].includes(String(layout.direction)) ? String(layout.direction) : 'row';
        const gap = Math.max(16, Math.min(400, finite(layout.gap, 80)));
        const columns = Math.max(1, Math.min(12, Math.floor(finite(layout.columns, Math.ceil(Math.sqrt(items.length))))));
        const sizes = items.map(({ item, category }) => ({ width: finite(item.width, category === 'node' ? 260 : 180), height: finite(item.height, category === 'node' ? 132 : 120) }));
        const maxWidth = Math.max(0, ...sizes.map(({ width }) => width)), maxHeight = Math.max(0, ...sizes.map(({ height }) => height));
        const contentBounds = objectBounds(state.document.objects, state.document.objects);
        const center = input.placement === 'after-content'
          ? { x: contentBounds.x + contentBounds.width + gap + maxWidth / 2, y: contentBounds.y + contentBounds.height / 2 }
          : visibleCenter(state);
        const slots = items.map((_, index) => {
          const column = direction === 'column' ? 0 : direction === 'row' ? index : index % columns;
          const row = direction === 'row' ? 0 : direction === 'column' ? index : Math.floor(index / columns);
          const columnCount = direction === 'column' ? 1 : direction === 'row' ? items.length : Math.min(columns, items.length);
          const rowCount = direction === 'row' ? 1 : direction === 'column' ? items.length : Math.ceil(items.length / columns);
          return { x: center.x + (column - (columnCount - 1) / 2) * (maxWidth + gap), y: center.y + (row - (rowCount - 1) / 2) * (maxHeight + gap) };
        });
        const objects: CanvasObject[] = items.map(({ item, category }, index) => {
          const ref = requiredText(item.ref, `${category}.ref`), size = sizes[index], slot = slots[index], base = { id: refs[ref], createdAt: new Date().toISOString() };
          if (category === 'node') return { ...base, kind: 'note', x: slot.x - size.width / 2, y: slot.y - size.height / 2, width: size.width, height: size.height, text: requiredText(item.text, `node ${ref} text`) };
          const kind = item.kind;
          if (!['rectangle', 'ellipse', 'arrow'].includes(String(kind))) throw new Error(`Unsupported shape kind for ${ref}.`);
          return { ...base, kind: kind as 'rectangle' | 'ellipse' | 'arrow', from: { x: slot.x - size.width / 2, y: slot.y - size.height / 2 }, to: { x: slot.x + size.width / 2, y: slot.y + size.height / 2 }, color: colorValue((item.color ?? 'chalk') as NamedColor) };
        });
        for (const edge of edges) {
          const ref = requiredText(edge.ref, 'edge.ref'), fromRef = requiredText(edge.from, `edge ${ref} from`), toRef = requiredText(edge.to, `edge ${ref} to`), from = refs[fromRef] ?? fromRef, to = refs[toRef] ?? toRef;
          objects.push({ id: refs[ref], kind: 'connector', createdAt: new Date().toISOString(), fromId: from, toId: to, label: typeof edge.label === 'string' ? edge.label : '' });
        }
        let pendingGroups = [...groups];
        while (pendingGroups.length) {
          const unresolved: typeof pendingGroups = [];
          for (const group of pendingGroups) {
            const ref = requiredText(group.ref, 'group.ref'), members = Array.isArray(group.members) ? group.members.map((member) => { const normalized = requiredText(member, `group ${ref} member`); return refs[normalized] ?? normalized; }) : [];
            const candidates = [...state.document.objects, ...objects], children = candidates.filter(({ id }) => members.includes(id));
            if (!members.length) throw new Error(`Group ${ref} requires at least one member.`);
            if (children.length !== members.length) { unresolved.push(group); continue; }
            if (!boundsDependenciesAvailable(children, candidates)) { unresolved.push(group); continue; }
            const bounds = objectBounds(children, candidates);
            objects.push({ id: refs[ref], kind: 'group', createdAt: new Date().toISOString(), x: bounds.x - 28, y: bounds.y - 52, width: bounds.width + 56, height: bounds.height + 80, label: typeof group.label === 'string' ? group.label : '', childIds: members });
          }
          if (unresolved.length === pendingGroups.length) throw new Error(`Group ${requiredText(unresolved[0].ref, 'group.ref')} references an unknown or cyclic member.`);
          pendingGroups = unresolved;
        }
        const validIds = new Set([...state.document.objects.map(({ id }) => id), ...objects.map(({ id }) => id)]);
        for (const object of objects) {
          if (object.kind !== 'connector') continue;
          const edgeName = edges.find((edge) => refs[requiredText(edge.ref, 'edge.ref')] === object.id)?.ref ?? object.id;
          if (object.fromId === object.toId) throw new Error(`Edge ${edgeName} requires distinct endpoints.`);
          if (!validIds.has(object.fromId) || !validIds.has(object.toId)) throw new Error(`Edge ${edgeName} references an unknown endpoint.`);
        }
        const { before, after } = await controller.applyOperations([{ type: 'replace_objects', objects: [...state.document.objects, ...objects] }], currentRevision);
        const ids = changedObjectIds(before, after);
        return { ...finish('create', ids, before, after), refs };
      }
    },
    {
      name: 'draw_path', title: 'Draw a path',
      description: 'Create a line, polyline, polygon, or smoothed path from relative points. The path is safely compiled to the portable v1 stroke model and placed around the visible-canvas center by default.',
      inputSchema: { type: 'object', required: ['kind', 'points'], additionalProperties: false, properties: { expectedRevision: { type: 'string' }, kind: { type: 'string', enum: ['line', 'polyline', 'polygon'] }, points: { type: 'array', minItems: 2, maxItems: 200, items: pointSchema }, color: { type: 'string', enum: DRAWING_PALETTE.map(({ id }) => id), default: 'chalk' }, width: { type: 'number', minimum: 1, maximum: 48, default: 4 }, smooth: { type: 'boolean', default: false }, origin: pointSchema } },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      execute: async (input) => {
        const state = controller.getState(), currentRevision = drawRevision(state.document);
        if (typeof input.expectedRevision === 'string' && input.expectedRevision !== currentRevision) throw new Error(`Canvas revision is stale. Inspect again and retry with revision ${currentRevision}.`);
        if (!Array.isArray(input.points) || input.points.length < 2 || input.points.length > 200) throw new Error('points must contain 2 to 200 points.');
        const raw = input.points.map((value) => {
          if (!value || typeof value !== 'object') throw new Error('Every path point must contain finite x and y values.');
          const point = value as Record<string, unknown>;
          if (typeof point.x !== 'number' || !Number.isFinite(point.x) || typeof point.y !== 'number' || !Number.isFinite(point.y)) throw new Error('Every path point must contain finite x and y values.');
          return { x: point.x, y: point.y };
        });
        const originInput = input.origin && typeof input.origin === 'object' ? input.origin as Record<string, unknown> : undefined;
        const origin = originInput && typeof originInput.x === 'number' && typeof originInput.y === 'number' ? { x: originInput.x, y: originInput.y } : visibleCenter(state);
        let points = raw.map((point) => ({ x: point.x + origin.x, y: point.y + origin.y }));
        if (input.smooth === true) points = smoothPoints(points);
        if (input.kind === 'polygon' && (points[0].x !== points.at(-1)!.x || points[0].y !== points.at(-1)!.y)) points.push({ ...points[0] });
        const object: CanvasObject = { ...identity('stroke'), kind: 'stroke', points, color: colorValue((input.color ?? 'chalk') as NamedColor), width: Math.max(1, Math.min(48, finite(input.width, 4))) };
        const { before, after } = await controller.applyOperations([{ type: 'put_object', object }], currentRevision);
        const ids = changedObjectIds(before, after);
        return finish('create', ids, before, after);
      }
    },
    {
      name: 'draw_patch_objects', title: 'Patch Draw objects',
      description: 'Partially update text, labels, position, size, named color, or layer arrangement without reconstructing stored objects. Group translation moves descendants as a unit.',
      inputSchema: { type: 'object', required: ['patches'], additionalProperties: false, properties: { expectedRevision: { type: 'string' }, patches: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'object', required: ['id'], additionalProperties: false, properties: { id: { type: 'string' }, text: { type: 'string', maxLength: 4000 }, label: { type: 'string', maxLength: 240 }, color: { type: 'string', enum: DRAWING_PALETTE.map(({ id }) => id) }, translate: { type: 'object', required: ['dx', 'dy'], additionalProperties: false, properties: { dx: { type: 'number' }, dy: { type: 'number' } } }, size: { type: 'object', additionalProperties: false, properties: { width: { type: 'number', minimum: 1 }, height: { type: 'number', minimum: 1 } } }, arrange: { type: 'string', enum: ['front', 'back', 'forward', 'backward'] } } } } } },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      execute: async (input) => {
        assertRevision(controller, input.expectedRevision);
        const patches = asRecords(input.patches, 'patches', 100);
        if (!patches.length) throw new Error('patches must contain at least one patch.');
        const before = controller.getState().document;
        let objects = before.objects.map((object) => ({ ...object })) as CanvasObject[];
        const touched = new Set<string>();
        for (const patch of patches) {
          const id = requiredText(patch.id, 'patch.id');
          const index = objects.findIndex((object) => object.id === id);
          if (index < 0) throw new Error(`Unknown Draw object: ${id}.`);
          let object = objects[index];
          if (patch.text !== undefined) {
            if (object.kind !== 'note' || typeof patch.text !== 'string') throw new Error(`text can only patch a note.`);
            object = { ...object, text: patch.text };
          }
          if (patch.label !== undefined) {
            if ((object.kind !== 'connector' && object.kind !== 'group') || typeof patch.label !== 'string') throw new Error(`label can only patch a connector or group.`);
            object = { ...object, label: patch.label };
          }
          if (patch.color !== undefined) {
            if (object.kind !== 'stroke' && object.kind !== 'rectangle' && object.kind !== 'ellipse' && object.kind !== 'arrow') throw new Error(`color cannot patch ${object.kind}.`);
            object = { ...object, color: colorValue(patch.color) };
          }
          objects[index] = object;
          touched.add(id);
          if (patch.translate && typeof patch.translate === 'object') {
            if (object.kind === 'connector') throw new Error('translate cannot patch a connector; move its endpoint objects instead.');
            const move = patch.translate as Record<string, unknown>, dx = finite(move.dx, NaN), dy = finite(move.dy, NaN);
            if (!Number.isFinite(dx) || !Number.isFinite(dy)) throw new Error('translate requires finite dx and dy.');
            const moving = descendants({ ...before, objects }, [id]);
            assertMovableConnectorEndpoints(objects, moving);
            objects = objects.map((candidate) => moving.has(candidate.id) ? translated(candidate, dx, dy) : candidate);
            moving.forEach((movingId) => touched.add(movingId));
          }
          if (patch.size && typeof patch.size === 'object') {
            const size = patch.size as Record<string, unknown>, current = objects.find((candidate) => candidate.id === id)!;
            if (current.kind !== 'note' && current.kind !== 'group') throw new Error(`size can only patch a note or group.`);
            const width = finite(size.width, current.width), height = finite(size.height, current.height);
            if (width <= 0 || height <= 0) throw new Error('size width and height must be positive.');
            if (current.kind === 'note') objects = objects.map((candidate) => candidate.id === id ? { ...current, width, height } : candidate);
            else {
              const scaleX = width / current.width, scaleY = height / current.height, moving = descendants({ ...before, objects }, [id]);
              assertMovableConnectorEndpoints(objects, moving);
              const scalePoint = ({ x, y }: Point) => ({ x: current.x + (x - current.x) * scaleX, y: current.y + (y - current.y) * scaleY });
              objects = objects.map((candidate) => {
                if (candidate.id === id) return { ...current, width, height };
                if (!moving.has(candidate.id)) return candidate;
                touched.add(candidate.id);
                if (candidate.kind === 'stroke') return { ...candidate, points: candidate.points.map(scalePoint) };
                if (candidate.kind === 'rectangle' || candidate.kind === 'ellipse' || candidate.kind === 'arrow') return { ...candidate, from: scalePoint(candidate.from), to: scalePoint(candidate.to) };
                if (candidate.kind === 'note' || candidate.kind === 'group') { const origin = scalePoint({ x: candidate.x, y: candidate.y }); return { ...candidate, x: origin.x, y: origin.y, width: candidate.width * scaleX, height: candidate.height * scaleY }; }
                return candidate;
              });
            }
          }
          if (typeof patch.arrange === 'string') {
            if (object.kind === 'group') throw new Error('Group layer arrangement is unavailable because groups always render behind their content. Arrange the group members instead.');
            const visibleObjects = objects.filter((candidate) => candidate.kind !== 'group'), position = visibleObjects.findIndex((candidate) => candidate.id === id), [moving] = visibleObjects.splice(position, 1);
            if (patch.arrange === 'front') visibleObjects.push(moving);
            else if (patch.arrange === 'back') visibleObjects.unshift(moving);
            else if (patch.arrange === 'forward') visibleObjects.splice(Math.min(visibleObjects.length, position + 1), 0, moving);
            else if (patch.arrange === 'backward') visibleObjects.splice(Math.max(0, position - 1), 0, moving);
            else throw new Error('Unsupported arrange value.');
            let visibleIndex = 0;
            objects = objects.map((candidate) => candidate.kind === 'group' ? candidate : visibleObjects[visibleIndex++]);
          }
        }
        const result = await controller.applyOperations([{ type: 'replace_objects', objects }], drawRevision(before));
        const ids = [...new Set([...touched, ...changedObjectIds(result.before, result.after)])];
        return finish('update', ids, result.before, result.after);
      }
    },
    {
      name: 'draw_layout', title: 'Lay out Draw objects',
      description: 'Arrange existing objects deterministically in a row, column, or grid. Groups move with their descendants.',
      inputSchema: { type: 'object', required: ['ids', 'direction'], additionalProperties: false, properties: { expectedRevision: { type: 'string' }, ids: { type: 'array', minItems: 1, maxItems: 100, uniqueItems: true, items: { type: 'string' } }, direction: { type: 'string', enum: ['row', 'column', 'grid'] }, gap: { type: 'number', minimum: 0, maximum: 400, default: 48 }, columns: { type: 'integer', minimum: 1, maximum: 12 } } },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      execute: async (input) => {
        assertRevision(controller, input.expectedRevision);
        const ids = Array.isArray(input.ids) ? input.ids.map(String) : [];
        if (!ids.length) throw new Error('ids must contain at least one object ID.');
        const before = controller.getState().document, selected = ids.map((id) => before.objects.find((object) => object.id === id));
        if (selected.some((object) => !object || object.kind === 'connector')) throw new Error('Layout IDs must reference existing non-connector objects.');
        const claimedDescendants = new Map<string, string>();
        for (const id of ids) {
          for (const nestedId of descendants(before, [id])) {
            const owner = claimedDescendants.get(nestedId);
            if (owner) throw new Error(`Layout roots overlap through group membership (${owner} and ${id}); pass independent roots only.`);
            claimedDescendants.set(nestedId, id);
          }
        }
        const bounds = selected.map((object) => objectBounds([object!], before.objects));
        const anchor = { x: Math.min(...bounds.map(({ x }) => x)), y: Math.min(...bounds.map(({ y }) => y)) };
        const gap = Math.max(0, Math.min(400, finite(input.gap, 48))), direction = String(input.direction);
        const columns = direction === 'grid' ? Math.max(1, Math.min(12, Math.floor(finite(input.columns, Math.ceil(Math.sqrt(ids.length)))))) : direction === 'row' ? ids.length : 1;
        const maxWidth = Math.max(...bounds.map(({ width }) => width)), maxHeight = Math.max(...bounds.map(({ height }) => height));
        let objects = before.objects;
        const movedIds = new Set<string>();
        ids.forEach((id, index) => {
          const column = direction === 'column' ? 0 : index % columns, row = direction === 'row' ? 0 : Math.floor(index / columns);
          const target = { x: anchor.x + column * (maxWidth + gap), y: anchor.y + row * (maxHeight + gap) };
          const dx = target.x - bounds[index].x, dy = target.y - bounds[index].y, moving = descendants({ ...before, objects }, [id]);
          assertMovableConnectorEndpoints(objects, moving);
          objects = objects.map((object) => moving.has(object.id) ? translated(object, dx, dy) : object);
          moving.forEach((movingId) => movedIds.add(movingId));
        });
        const result = await controller.applyOperations([{ type: 'replace_objects', objects }], drawRevision(before));
        return finish('update', [...movedIds], result.before, result.after);
      }
    },
    {
      name: 'draw_focus', title: 'Focus the Draw camera',
      description: 'Fit the camera to all objects, the current selection, explicit IDs, or explicit bounds without requiring raw viewport transforms.',
      inputSchema: { type: 'object', required: ['scope'], additionalProperties: false, properties: { scope: { type: 'string', enum: ['all', 'selection', 'ids', 'bounds'] }, ids: { type: 'array', uniqueItems: true, items: { type: 'string' } }, bounds: { type: 'object', required: ['x', 'y', 'width', 'height'], additionalProperties: false, properties: { x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number', exclusiveMinimum: 0 }, height: { type: 'number', exclusiveMinimum: 0 } } }, padding: { type: 'number', minimum: 0, maximum: 400, default: 72 } } },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      execute: async (input) => {
        if (!controller.focus) throw new Error('Camera focus is unavailable in this Draw surface.');
        const state = controller.getState(), scope = String(input.scope), padding = Math.max(0, Math.min(400, finite(input.padding, 72)));
        let ids: string[] | undefined, bounds: { x: number; y: number; width: number; height: number } | undefined;
        if (scope === 'all') ids = state.document.objects.map(({ id }) => id);
        else if (scope === 'selection') ids = state.selectedIds;
        else if (scope === 'ids') ids = Array.isArray(input.ids) ? input.ids.map(String) : [];
        else if (scope === 'bounds' && input.bounds && typeof input.bounds === 'object') bounds = input.bounds as typeof bounds;
        else throw new Error('Focus scope requires matching ids or bounds.');
        if (ids && !ids.length) throw new Error('No objects are available for focus.');
        await controller.focus({ ...(ids ? { ids } : {}), ...(bounds ? { bounds } : {}), padding });
        const focused = compactIdList(ids ?? []);
        return { ok: true, revision: drawRevision(controller.getState().document), focusedIds: focused.preview, focusedCount: focused.count, ...(focused.truncated ? { focusedIdsTruncated: true } : {}), bounds, padding };
      }
    },
    {
      name: 'draw_revert_change', title: 'Revert an agent change',
      description: 'Revert one change from a prior mutation receipt. The revert refuses to run if any object touched by that change has since changed.',
      inputSchema: { type: 'object', required: ['changeId'], additionalProperties: false, properties: { changeId: { type: 'string' }, expectedRevision: { type: 'string' } } },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      execute: async (input) => {
        assertRevision(controller, input.expectedRevision);
        const changeId = requiredText(input.changeId, 'changeId'), change = changes.get(changeId);
        if (!change) throw new Error('Unknown or expired Draw change ID.');
        const current = controller.getState().document, currentById = new Map(current.objects.map((object) => [object.id, object])), beforeById = new Map(change.before.objects.map((object) => [object.id, object])), afterById = new Map(change.after.objects.map((object) => [object.id, object]));
        if (current.id !== change.after.id) throw new Error(`Change ${changeId} belongs to another Draw canvas and cannot be reverted here.`);
        for (const id of change.ids) if (JSON.stringify(currentById.get(id)) !== JSON.stringify(afterById.get(id))) throw new Error(`Object ${id} changed since ${changeId}; targeted revert refused.`);
        const beforeOrder = change.before.objects.map(({ id }) => id), afterOrder = change.after.objects.map(({ id }) => id), currentOrder = current.objects.map(({ id }) => id);
        for (const id of change.ids) {
          const beforeIndex = beforeOrder.indexOf(id), afterIndex = afterOrder.indexOf(id);
          if (beforeIndex === afterIndex || afterIndex < 0) continue;
          for (const peer of afterOrder) {
            if (peer === id || !currentById.has(peer)) continue;
            const expectedSide = Math.sign(afterIndex - afterOrder.indexOf(peer));
            const currentSide = Math.sign(currentOrder.indexOf(id) - currentOrder.indexOf(peer));
            if (expectedSide !== currentSide) throw new Error(`Object ${id} layer order changed since ${changeId}; targeted revert refused.`);
          }
        }
        const removing = new Set(change.ids.filter((id) => !beforeById.has(id) && afterById.has(id)));
        for (const object of current.objects) {
          if (change.ids.includes(object.id)) continue;
          const depends = object.kind === 'connector' ? removing.has(object.fromId) || removing.has(object.toId) : object.kind === 'group' ? object.childIds.some((id) => removing.has(id)) : false;
          if (depends) throw new Error(`Object ${object.id} depends on an object created by ${changeId}; targeted revert refused.`);
        }
        if (change.before.title !== change.after.title && current.title !== change.after.title) throw new Error(`Canvas title changed since ${changeId}; targeted revert refused.`);
        const restoresViewport = JSON.stringify(change.before.viewport) !== JSON.stringify(change.after.viewport);
        if (restoresViewport && JSON.stringify(current.viewport) !== JSON.stringify(change.after.viewport)) throw new Error(`Canvas viewport changed since ${changeId}; targeted revert refused.`);
        const touched = new Set(change.ids);
        const orderStable = new Set(change.ids.filter((id) => {
          const beforeIndex = beforeOrder.indexOf(id), afterIndex = afterOrder.indexOf(id);
          return beforeIndex >= 0 && beforeIndex === afterIndex;
        }));
        const wholeCanvasReplacement = JSON.stringify(beforeOrder) !== JSON.stringify(afterOrder)
          && [...new Set([...beforeOrder, ...afterOrder])].every((id) => touched.has(id));
        let restored: CanvasObject[];
        if (wholeCanvasReplacement) {
          const prior = change.before.objects.filter((object) => touched.has(object.id));
          let priorIndex = 0, insertionIndex = 0;
          restored = [];
          for (const object of current.objects) {
            if (!touched.has(object.id)) restored.push(object);
            else if (priorIndex < prior.length) {
              restored.push(prior[priorIndex++]);
              insertionIndex = restored.length;
            }
          }
          restored.splice(insertionIndex, 0, ...prior.slice(priorIndex));
        } else {
          restored = current.objects
            .filter(({ id }) => !touched.has(id) || orderStable.has(id))
            .map((object) => orderStable.has(object.id) ? beforeById.get(object.id)! : object);
          for (const prior of change.before.objects.filter(({ id }) => touched.has(id) && !orderStable.has(id))) {
            const priorIndex = change.before.objects.findIndex(({ id }) => id === prior.id);
            const sameLayer = (object: CanvasObject) => (object.kind === 'group') === (prior.kind === 'group');
            const preceding = change.before.objects.slice(0, priorIndex).reverse().find((object) => sameLayer(object) && restored.some(({ id }) => id === object.id));
            if (preceding) restored.splice(restored.findIndex(({ id }) => id === preceding.id) + 1, 0, prior);
            else {
              const following = change.before.objects.slice(priorIndex + 1).find((object) => sameLayer(object) && restored.some(({ id }) => id === object.id));
              if (following) restored.splice(restored.findIndex(({ id }) => id === following.id), 0, prior);
              else restored.push(prior);
            }
          }
        }
        if (!change.ids.some((id) => currentById.get(id)?.kind === 'group') && restored.length === current.objects.length) {
          const restoredGroups = new Map(restored.filter((object) => object.kind === 'group').map((object) => [object.id, object]));
          const currentGroupIds = current.objects.filter((object) => object.kind === 'group').map(({ id }) => id);
          if (currentGroupIds.every((id) => restoredGroups.has(id)) && restoredGroups.size === currentGroupIds.length) {
            const visible = restored.filter((object) => object.kind !== 'group');
            let visibleIndex = 0;
            restored = current.objects.map((object) => object.kind === 'group' ? restoredGroups.get(object.id)! : visible[visibleIndex++]);
          }
        }
        const operations: CanvasOperation[] = [{ type: 'replace_objects', objects: restored }];
        if (change.before.title !== change.after.title) operations.push({ type: 'set_title', title: change.before.title });
        if (restoresViewport) operations.push({ type: 'set_viewport', viewport: change.before.viewport });
        const result = await controller.applyOperations(operations, drawRevision(current));
        changes.delete(changeId);
        return finish('restore', change.ids, result.before, result.after, restoresViewport);
      }
    },
    {
      name: 'draw_delete', title: 'Delete Draw objects',
      description: `Delete specific objects and dependent connectors. Requires confirmation exactly "${DELETE_CONFIRMATION}".`,
      inputSchema: { type: 'object', required: ['ids', 'confirmation'], additionalProperties: false, properties: { expectedRevision: { type: 'string' }, ids: { type: 'array', minItems: 1, maxItems: 100, uniqueItems: true, items: { type: 'string' } }, confirmation: { type: 'string', const: DELETE_CONFIRMATION } } },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
      execute: async (input) => {
        if (input.confirmation !== DELETE_CONFIRMATION) throw new Error(`Delete requires confirmation exactly "${DELETE_CONFIRMATION}".`);
        assertRevision(controller, input.expectedRevision);
        const ids = Array.isArray(input.ids) ? input.ids.map(String) : [];
        if (!ids.length) throw new Error('ids must contain at least one object ID.');
        const before = controller.getState().document;
        const existing = new Set(before.objects.map(({ id }) => id));
        const unknown = ids.filter((id) => !existing.has(id));
        if (unknown.length) throw new Error(`Unknown Draw object ID${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}.`);
        const result = await controller.applyOperations([{ type: 'remove_objects', ids }], drawRevision(before));
        return finish('remove', changedObjectIds(result.before, result.after), result.before, result.after);
      }
    },
    {
      name: 'draw_replace_canvas', title: 'Replace the Draw canvas',
      description: `Replace every object, optionally changing the title. Requires confirmation exactly "${REPLACE_CONFIRMATION}".`,
      inputSchema: { type: 'object', required: ['objects', 'confirmation'], additionalProperties: false, properties: { expectedRevision: { type: 'string' }, objects: { type: 'array', maxItems: 1000, items: canvasObjectSchema }, title: canvasTitleSchema, confirmation: { type: 'string', const: REPLACE_CONFIRMATION } } },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
      execute: async (input) => {
        if (input.confirmation !== REPLACE_CONFIRMATION) throw new Error(`Whole-canvas replacement requires confirmation exactly "${REPLACE_CONFIRMATION}".`);
        assertRevision(controller, input.expectedRevision);
        if (!Array.isArray(input.objects)) throw new Error('objects must be an array.');
        const operations: CanvasOperation[] = [{ type: 'replace_objects', objects: input.objects as CanvasObject[] }];
        if (typeof input.title === 'string') operations.push({ type: 'set_title', title: input.title });
        const before = controller.getState().document;
        const result = await controller.applyOperations(operations, drawRevision(before));
        const changed = changedObjectIds(result.before, result.after);
        const beforeOrder = result.before.objects.map(({ id }) => id), afterOrder = result.after.objects.map(({ id }) => id);
        const ids = JSON.stringify(beforeOrder) === JSON.stringify(afterOrder) ? changed : [...new Set([...changed, ...beforeOrder, ...afterOrder])];
        return finish('reset', ids, result.before, result.after);
      }
    },
    {
      name: 'draw_apply_operations', title: 'Change Draw canvas',
      description: `Atomically apply browser-local Draw document operations. Supported types: put_object, remove_objects, replace_objects, set_title, set_viewport, convert, restore_conversion. replace_objects requires confirmation exactly "${REPLACE_CONFIRMATION}". Changes share the visible browser canvas, history, and persistence. Native Mac and iPhone shells reject WebMCP mutations and use their dedicated pairing protocol.`,
      inputSchema: { type: 'object', required: ['operations'], additionalProperties: false, properties: { operations: { type: 'array', minItems: 1, maxItems: 100, items: operationSchema }, expectedRevision: { type: 'string', description: 'Optional optimistic concurrency token from draw_inspect or a mutation receipt.' }, confirmation: { type: 'string' } } },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
      execute: async (input) => {
        const operations = input.operations;
        if (!Array.isArray(operations) || !operations.length || operations.length > 100) throw new Error('operations must contain 1 to 100 Draw operations.');
        const currentRevision = drawRevision(controller.getState().document);
        if (typeof input.expectedRevision === 'string' && input.expectedRevision !== currentRevision) throw new Error(`Canvas revision is stale. Inspect again and retry with revision ${currentRevision}.`);
        if (operations.some((operation) => operation && typeof operation === 'object' && (operation as { type?: unknown }).type === 'replace_objects') && input.confirmation !== REPLACE_CONFIRMATION) throw new Error(`Whole-canvas replacement requires confirmation exactly "${REPLACE_CONFIRMATION}".`);
        const typed = operations as CanvasOperation[];
        const { before, after } = await controller.applyOperations(typed, currentRevision);
        const ids = [...new Set([...affectedIds(typed), ...changedObjectIds(before, after)])];
        return finish(transitionKind(before, typed), ids, before, after, typed.some(({ type }) => type === 'set_viewport'));
      }
    },
    {
      name: 'draw_select', title: 'Select Draw objects', description: 'Select zero or more existing canvas object IDs so the user and agent share focus.',
      inputSchema: { type: 'object', required: ['ids'], additionalProperties: false, properties: { ids: { type: 'array', uniqueItems: true, items: { type: 'string' } } } },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      execute: async (input) => {
        controller.select(Array.isArray(input.ids) ? input.ids.map(String) : []);
        const selected = compactIdList(controller.getState().selectedIds);
        return { ok: true, selectedIds: selected.preview, selectedCount: selected.count, ...(selected.truncated ? { selectedIdsTruncated: true } : {}) };
      }
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
