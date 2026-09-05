import { objectBounds, type CanvasDocument, type CanvasObject, type Point, type Tool } from './document';
import type { CanvasOperation } from './paired-session';
import { DRAWING_PALETTE } from './palette';

export const DRAW_WEBMCP_VERSION = '2026-09-05.1';
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

type RenderedBounds = { x: number; y: number; width: number; height: number };
export type DrawRenderedGeometry = {
  surface: RenderedBounds;
  objects: Array<{ id: string; kind: CanvasObject['kind']; worldBounds: RenderedBounds; viewportBounds: RenderedBounds; clipped: boolean }>;
  connectors: Array<{ id: string; fromId: string; toId: string; route: Point[]; labelBounds?: { worldBounds: RenderedBounds; viewportBounds: RenderedBounds } }>;
  overlaps: Array<{ firstId: string; secondId: string; bounds: RenderedBounds; classification: 'peer' | 'containment' }>;
  totalObjectCount: number;
  missingIds?: string[];
  unrenderedIds?: string[];
  comparisonCount?: number;
  truncated?: boolean;
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
  focus?: (target: { scope: 'all' | 'selection' | 'ids' | 'bounds'; ids?: string[]; bounds?: { x: number; y: number; width: number; height: number }; padding: number }) => Promise<{ ids?: string[]; bounds?: { x: number; y: number; width: number; height: number } } | void> | { ids?: string[]; bounds?: { x: number; y: number; width: number; height: number } } | void;
  renderedGeometry?: (input: { ids?: string[]; limit: number }) => Promise<DrawRenderedGeometry> | DrawRenderedGeometry;
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

export function changedOrderIds(before: CanvasDocument, after: CanvasDocument) {
  const nextIds = new Set(after.objects.map(({ id }) => id));
  const priorOrder = before.objects.map(({ id }) => id).filter((id) => nextIds.has(id));
  const priorPosition = new Map(priorOrder.map((id, index) => [id, index]));
  const shared = after.objects.map(({ id }) => id).filter((id) => priorPosition.has(id));
  const positions = shared.map((id) => priorPosition.get(id)!);
  const prefixMax = new Array<number>(positions.length), suffixMin = new Array<number>(positions.length);
  for (let index = 0, maximum = -1; index < positions.length; index += 1) {
    prefixMax[index] = maximum;
    maximum = Math.max(maximum, positions[index]);
  }
  for (let index = positions.length - 1, minimum = positions.length; index >= 0; index -= 1) {
    suffixMin[index] = minimum;
    minimum = Math.min(minimum, positions[index]);
  }
  return shared.filter((_, index) => prefixMax[index] > positions[index] || suffixMin[index] < positions[index]);
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

function requiredId(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.length) throw new Error(`${label} is required.`);
  return value;
}

function localReference(value: unknown, label: string) {
  const reference = requiredText(value, label);
  if (reference.length > 120) throw new Error(`${label} must be at most 120 characters.`);
  return reference;
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

function semanticArrowPoints(start: Point, end: Point, curvature: number, looseness: number) {
  const dx = end.x - start.x, dy = end.y - start.y, distance = Math.hypot(dx, dy);
  const normal = { x: -dy / distance, y: dx / distance };
  const control = { x: (start.x + end.x) / 2 + normal.x * distance * curvature * .5, y: (start.y + end.y) / 2 + normal.y * distance * curvature * .5 };
  return Array.from({ length: 33 }, (_, index) => {
    const t = index / 32, inverse = 1 - t;
    const organic = Math.sin(t * Math.PI * 6) * Math.sin(t * Math.PI) * distance * .015 * looseness;
    return {
      x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x + normal.x * organic,
      y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y + normal.y * organic
    };
  });
}

function semanticArrowHead(points: Point[], weight: number, style: 'vee' | 'triangle' | 'barbed') {
  const end = points.at(-1)!, previous = points.at(-2)!;
  const angle = Math.atan2(end.y - previous.y, end.x - previous.x), length = Math.max(14, Math.min(64, weight * 5));
  const wing = .62;
  const left = { x: end.x - Math.cos(angle - wing) * length, y: end.y - Math.sin(angle - wing) * length };
  const right = { x: end.x - Math.cos(angle + wing) * length, y: end.y - Math.sin(angle + wing) * length };
  if (style === 'vee') return [left, end, right];
  if (style === 'triangle') return [left, end, right, left];
  const notch = { x: end.x - Math.cos(angle) * length * .55, y: end.y - Math.sin(angle) * length * .55 };
  return [left, end, right, notch, left];
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
  const stack = [...ids];
  while (stack.length) {
    const id = stack.pop()!;
    const object = byId.get(id);
    if (object?.kind !== 'group') continue;
    for (const childId of object.childIds) if (!result.has(childId)) { result.add(childId); stack.push(childId); }
  }
  return result;
}

function graphLayoutTargets(document: CanvasDocument, rootIds: string[], mode: 'flow' | 'hierarchy' | 'loop' | 'orbit' | 'swimlane', gap: number, laneById: Map<string, string>, orientation?: 'horizontal' | 'vertical') {
  const roots = [...rootIds].sort();
  const rootBounds = new Map(roots.map((id) => [id, objectBounds([document.objects.find((object) => object.id === id)!], document.objects)]));
  const width = Math.max(...[...rootBounds.values()].map((bounds) => bounds.width)), height = Math.max(...[...rootBounds.values()].map((bounds) => bounds.height));
  const anchor = { x: Math.min(...[...rootBounds.values()].map(({ x }) => x)), y: Math.min(...[...rootBounds.values()].map(({ y }) => y)) };
  const rootByMember = new Map<string, string>();
  for (const root of roots) for (const id of descendants(document, [root])) rootByMember.set(id, root);
  const adjacency = new Map(roots.map((id) => [id, new Set<string>()]));
  for (const connector of document.objects) {
    if (connector.kind !== 'connector') continue;
    const from = rootByMember.get(connector.fromId), to = rootByMember.get(connector.toId);
    if (from && to && from !== to) adjacency.get(from)!.add(to);
  }
  const targets = new Map<string, Point>();
  if (mode === 'loop' || mode === 'orbit') {
    const orbiting = mode === 'orbit' ? roots.slice(1) : roots;
    if (mode === 'orbit') targets.set(roots[0], anchor);
    if (mode === 'loop' && orbiting.length === 1) { targets.set(orbiting[0], anchor); return { targets, layerCount: 1, laneCount: 0 }; }
    const diameter = Math.max(width, height) + gap;
    const hubBounds = rootBounds.get(roots[0])!;
    let radius = diameter;
    const separated = () => {
      const ids = [...targets.keys()];
      for (let first = 0; first < ids.length; first += 1) for (let second = first + 1; second < ids.length; second += 1) {
        const a = targets.get(ids[first])!, b = targets.get(ids[second])!, aBounds = rootBounds.get(ids[first])!, bBounds = rootBounds.get(ids[second])!;
        if (!(a.x + aBounds.width + gap <= b.x || b.x + bBounds.width + gap <= a.x || a.y + aBounds.height + gap <= b.y || b.y + bBounds.height + gap <= a.y)) return false;
      }
      return true;
    };
    for (let attempt = 0; attempt < 32; attempt += 1) {
      if (mode === 'orbit') targets.set(roots[0], anchor); else targets.clear();
      const center = mode === 'orbit'
        ? { x: anchor.x + hubBounds.width / 2, y: anchor.y + hubBounds.height / 2 }
        : { x: anchor.x + radius + width / 2, y: anchor.y + radius + height / 2 };
      orbiting.forEach((id, index) => {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / Math.max(1, orbiting.length), bounds = rootBounds.get(id)!;
        targets.set(id, { x: center.x + Math.cos(angle) * radius - bounds.width / 2, y: center.y + Math.sin(angle) * radius - bounds.height / 2 });
      });
      if (separated()) break;
      radius *= 1.25;
      if (attempt === 31) throw new Error('Circular layout could not satisfy bounded object clearance.');
    }
    return { targets, layerCount: mode === 'orbit' ? 2 : 1, laneCount: 0 };
  }
  if (mode === 'swimlane') {
    const lanes = [...new Set(roots.map((id) => laneById.get(id) ?? 'Unassigned'))].sort();
    for (const [laneIndex, lane] of lanes.entries()) {
      roots.filter((id) => (laneById.get(id) ?? 'Unassigned') === lane).forEach((id, itemIndex) => targets.set(id, orientation === 'vertical'
        ? { x: anchor.x + itemIndex * (width + gap), y: anchor.y + laneIndex * (height + gap * 2) }
        : { x: anchor.x + laneIndex * (width + gap * 2), y: anchor.y + itemIndex * (height + gap) }));
    }
    return { targets, layerCount: 0, laneCount: lanes.length };
  }
  const reverse = new Map(roots.map((id) => [id, new Set<string>()]));
  for (const [from, toIds] of adjacency) for (const to of toIds) reverse.get(to)!.add(from);
  const visited = new Set<string>(), order: string[] = [];
  const visit = (id: string) => { if (visited.has(id)) return; visited.add(id); [...adjacency.get(id)!].sort().forEach(visit); order.push(id); };
  roots.forEach(visit);
  const assigned = new Set<string>(), components: string[][] = [];
  const collect = (id: string, component: string[]) => { if (assigned.has(id)) return; assigned.add(id); component.push(id); [...reverse.get(id)!].sort().forEach((next) => collect(next, component)); };
  [...order].reverse().forEach((id) => { if (assigned.has(id)) return; const component: string[] = []; collect(id, component); components.push(component.sort()); });
  components.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  const componentById = new Map<string, number>();
  components.forEach((component, index) => component.forEach((id) => componentById.set(id, index)));
  const incoming = components.map(() => new Set<number>()), outgoing = components.map(() => new Set<number>());
  for (const [from, toIds] of adjacency) for (const to of toIds) {
    const source = componentById.get(from)!, target = componentById.get(to)!;
    if (source !== target) { outgoing[source].add(target); incoming[target].add(source); }
  }
  const levels = components.map(() => 0), queue = components.map((_, index) => index).filter((index) => incoming[index].size === 0).sort((a, b) => components[a][0] < components[b][0] ? -1 : components[a][0] > components[b][0] ? 1 : 0);
  const pendingIncoming = incoming.map((entries) => new Set(entries));
  while (queue.length) {
    const source = queue.shift()!;
    for (const target of [...outgoing[source]].sort((a, b) => components[a][0] < components[b][0] ? -1 : components[a][0] > components[b][0] ? 1 : 0)) {
      levels[target] = Math.max(levels[target], levels[source] + 1);
      pendingIncoming[target].delete(source);
      if (!pendingIncoming[target].size) { queue.push(target); queue.sort((a, b) => components[a][0] < components[b][0] ? -1 : components[a][0] > components[b][0] ? 1 : 0); }
    }
  }
  const idsByLevel = new Map<number, string[]>();
  components.forEach((component, index) => { const bucket = idsByLevel.get(levels[index]) ?? []; bucket.push(...component); idsByLevel.set(levels[index], bucket.sort()); });
  const vertical = orientation ? orientation === 'vertical' : mode === 'hierarchy';
  for (const [level, ids] of [...idsByLevel].sort(([a], [b]) => a - b)) ids.forEach((id, index) => targets.set(id, !vertical
    ? { x: anchor.x + level * (width + gap), y: anchor.y + index * (height + gap) }
    : { x: anchor.x + index * (width + gap), y: anchor.y + level * (height + gap) }));
  return { targets, layerCount: idsByLevel.size, laneCount: 0 };
}

function boundsDependenciesAvailable(objects: CanvasObject[], allObjects: CanvasObject[]) {
  const byId = new Map(allObjects.map((object) => [object.id, object])), visited = new Set<string>();
  const stack = objects.map(({ id }) => id);
  while (stack.length) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    const object = byId.get(id);
    if (!object) return false;
    visited.add(id);
    if (object.kind === 'connector') stack.push(object.fromId, object.toId);
  }
  return true;
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
  const maxJournalBytes = 4 * 1024 * 1024;
  const changes = new Map<string, { before: CanvasDocument; after: CanvasDocument; ids: string[]; objectIds: string[]; orderIds: string[]; bytes: number }>();
  let journalBytes = 0;
  const finish = (kind: DrawTransitionKind, ids: string[], before: CanvasDocument, after: CanvasDocument, preserveViewport = false) => {
    const objectIds = changedObjectIds(before, after), orderIds = changedOrderIds(before, after);
    const journalIds = [...new Set([...objectIds, ...orderIds])];
    const changeId = `change-${crypto.randomUUID()}`;
    const bytes = new TextEncoder().encode(JSON.stringify({ before, after, objectIds, orderIds })).byteLength;
    if (bytes <= maxJournalBytes) {
      while (changes.size >= 100 || journalBytes + bytes > maxJournalBytes) {
        const oldestId = changes.keys().next().value;
        if (!oldestId) break;
        journalBytes -= changes.get(oldestId)!.bytes;
        changes.delete(oldestId);
      }
      changes.set(changeId, { before, after, ids: journalIds, objectIds, orderIds, bytes });
      journalBytes += bytes;
      return receipt(controller, kind, ids, preserveViewport, changeId);
    }
    return receipt(controller, kind, ids, preserveViewport);
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
            const { sourceSnapshot, sourceIds } = object;
            const sources = sourceIds ? { sourceIds: sourceIds.slice(0, 50), sourceIdCount: sourceIds.length, ...(sourceIds.length > 50 ? { sourceIdsTruncated: true } : {}) } : {};
            const snapshots = sourceSnapshot ? { sourceSnapshotCount: sourceSnapshot.length } : {};
            const base = { id: object.id, kind: object.kind, createdAt: object.createdAt, ...sources, ...snapshots };
            if (object.kind === 'stroke') {
              return { ...base, color: object.color, width: object.width, pointCount: object.points.length, bounds: objectBounds([object], state.document.objects) };
            }
            if (object.kind === 'note') {
              return { ...base, x: object.x, y: object.y, width: object.width, height: object.height, text: object.text.slice(0, 240), textLength: object.text.length, ...(object.text.length > 240 ? { textTruncated: true } : {}) };
            }
            if (object.kind === 'connector') {
              return { ...base, fromId: object.fromId, toId: object.toId, label: object.label.slice(0, 240), labelLength: object.label.length, ...(object.label.length > 240 ? { labelTruncated: true } : {}) };
            }
            if (object.kind === 'group') {
              return { ...base, x: object.x, y: object.y, width: object.width, height: object.height, label: object.label.slice(0, 240), labelLength: object.label.length, ...(object.label.length > 240 ? { labelTruncated: true } : {}), childIds: object.childIds.slice(0, 50), childCount: object.childIds.length, ...(object.childIds.length > 50 ? { childIdsTruncated: true } : {}) };
            }
            return { ...base, from: object.from, to: object.to, color: object.color };
          }),
          truncated: matches.length > limit
        };
        const stringState = { truncated: false };
        const bounded = boundProjectionStrings(projection, stringState) as typeof projection;
        return { ...bounded, stringsTruncated: stringState.truncated };
      }
    },
    {
      name: 'draw_get_rendered_geometry', title: 'Inspect rendered Draw geometry',
      description: 'Read actual post-render object bounds, connector routes, label bounds, viewport clipping, and overlaps from the current web canvas. This capability is unavailable in native shells without a rendered web surface.',
      inputSchema: {
        type: 'object', additionalProperties: false, properties: {
          ids: { type: 'array', maxItems: 200, uniqueItems: true, items: { type: 'string', minLength: 1, maxLength: 240 } },
          limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 }
        }
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      execute: async (input) => {
        if (!controller.renderedGeometry) throw new Error('Rendered geometry requires the rendered web surface and is unavailable in this Draw environment.');
        let ids: string[] | undefined;
        if (input.ids !== undefined) {
          if (!Array.isArray(input.ids) || input.ids.length > 200 || input.ids.some((id) => typeof id !== 'string' || !id.length || id.length > 240) || new Set(input.ids).size !== input.ids.length) throw new Error('ids must contain at most 200 unique non-empty IDs of at most 240 characters.');
          ids = input.ids as string[];
        }
        if (input.limit !== undefined && (typeof input.limit !== 'number' || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 200)) throw new Error('limit must be an integer from 1 to 200.');
        const limit = typeof input.limit === 'number' ? input.limit : 50;
        const state = controller.getState(), initialRevision = drawRevision(state.document);
        const rendered = await controller.renderedGeometry({ ...(ids ? { ids } : {}), limit });
        const finalRevision = drawRevision(controller.getState().document);
        if (finalRevision !== initialRevision) throw new Error(`Canvas changed while rendered geometry was measured. Inspect again with revision ${finalRevision}.`);
        const projection = {
          version: DRAW_WEBMCP_VERSION,
          revision: finalRevision,
          surface: rendered.surface,
          summary: {
            objectCount: rendered.totalObjectCount,
            returnedObjectCount: rendered.objects.length,
            connectorCount: rendered.connectors.length,
            overlapCount: rendered.overlaps.length,
            comparisonCount: rendered.comparisonCount ?? 0,
            missingIdCount: rendered.missingIds?.length ?? 0,
            unrenderedIdCount: rendered.unrenderedIds?.length ?? 0
          },
          objects: rendered.objects,
          connectors: rendered.connectors,
          overlaps: rendered.overlaps,
          missingIds: rendered.missingIds ?? [],
          unrenderedIds: rendered.unrenderedIds ?? [],
          truncated: rendered.truncated === true || rendered.objects.length < rendered.totalObjectCount
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
          nodes: { type: 'array', maxItems: 50, items: { type: 'object', required: ['ref', 'text'], additionalProperties: false, properties: { ref: { type: 'string', minLength: 1, maxLength: 120 }, text: { type: 'string', maxLength: 4000 }, width: { type: 'number', minimum: 80, maximum: 1200 }, height: { type: 'number', minimum: 60, maximum: 900 } } } },
          shapes: { type: 'array', maxItems: 50, items: { type: 'object', required: ['ref', 'kind'], additionalProperties: false, properties: { ref: { type: 'string', minLength: 1, maxLength: 120 }, kind: { type: 'string', enum: ['rectangle', 'ellipse', 'arrow'] }, color: { type: 'string', enum: DRAWING_PALETTE.map(({ id }) => id) }, width: { type: 'number', minimum: 8, maximum: 1600 }, height: { type: 'number', minimum: 8, maximum: 1200 } } } },
          edges: { type: 'array', maxItems: 100, items: { type: 'object', required: ['ref', 'from', 'to'], additionalProperties: false, properties: { ref: { type: 'string', minLength: 1, maxLength: 120 }, from: { type: 'string' }, to: { type: 'string' }, label: { type: 'string', maxLength: 240 } } } },
          groups: { type: 'array', maxItems: 20, items: { type: 'object', required: ['ref', 'members'], additionalProperties: false, properties: { ref: { type: 'string', minLength: 1, maxLength: 120 }, label: { type: 'string', maxLength: 240 }, members: { type: 'array', minItems: 1, maxItems: 200, uniqueItems: true, items: { type: 'string' } } } } }
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
        const existingIds = new Set(state.document.objects.map(({ id }) => id));
        const refs: Record<string, string> = Object.create(null) as Record<string, string>;
        const items = [...nodes.map((item) => ({ item, category: 'node' as const })), ...shapes.map((item) => ({ item, category: 'shape' as const }))];
        for (const { item, category } of items) {
          const rawRef = requiredId(item.ref, `${category}.ref`), ref = localReference(rawRef, `${category}.ref`);
          if (existingIds.has(rawRef) || existingIds.has(ref)) throw new Error(`Local reference ${rawRef} conflicts with an existing object ID.`);
          if (Object.hasOwn(refs, ref)) throw new Error(`Duplicate local reference: ${ref}.`);
          refs[ref] = identity(category).id;
        }
        for (const edge of edges) {
          const rawRef = requiredId(edge.ref, 'edge.ref'), ref = localReference(rawRef, 'edge.ref');
          if (existingIds.has(rawRef) || existingIds.has(ref)) throw new Error(`Local reference ${rawRef} conflicts with an existing object ID.`);
          if (Object.hasOwn(refs, ref)) throw new Error(`Duplicate local reference: ${ref}.`);
          refs[ref] = identity('connector').id;
        }
        for (const group of groups) {
          const rawRef = requiredId(group.ref, 'group.ref'), ref = localReference(rawRef, 'group.ref');
          if (existingIds.has(rawRef) || existingIds.has(ref)) throw new Error(`Local reference ${rawRef} conflicts with an existing object ID.`);
          if (Object.hasOwn(refs, ref)) throw new Error(`Duplicate local reference: ${ref}.`);
          refs[ref] = identity('group').id;
        }
        const compositionReference = (value: unknown, label: string) => {
          const exact = requiredId(value, label);
          if (existingIds.has(exact)) return exact;
          const normalized = requiredText(exact, label);
          return refs[normalized] ?? normalized;
        };
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
          const ref = requiredText(edge.ref, 'edge.ref'), from = compositionReference(edge.from, `edge ${ref} from`), to = compositionReference(edge.to, `edge ${ref} to`);
          objects.push({ id: refs[ref], kind: 'connector', createdAt: new Date().toISOString(), fromId: from, toId: to, label: typeof edge.label === 'string' ? edge.label : '' });
        }
        let pendingGroups = [...groups], candidates = [...state.document.objects, ...objects];
        const candidateById = new Map(candidates.map((object) => [object.id, object]));
        while (pendingGroups.length) {
          const unresolved: typeof pendingGroups = [];
          for (const group of pendingGroups) {
            const ref = requiredText(group.ref, 'group.ref'), members = Array.isArray(group.members) ? group.members.map((member) => compositionReference(member, `group ${ref} member`)) : [];
            if (!members.length) throw new Error(`Group ${ref} requires at least one member.`);
            if (members.length > 200) throw new Error(`Group ${ref} must contain at most 200 members.`);
            if (new Set(members).size !== members.length) throw new Error(`Group ${ref} members must be unique.`);
            const children = members.map((id) => candidateById.get(id));
            if (children.some((child) => !child)) { unresolved.push(group); continue; }
            const resolvedChildren = children as CanvasObject[];
            if (!boundsDependenciesAvailable(resolvedChildren, candidates)) { unresolved.push(group); continue; }
            const bounds = objectBounds(resolvedChildren, candidates);
            const created: CanvasObject = { id: refs[ref], kind: 'group', createdAt: new Date().toISOString(), x: bounds.x - 28, y: bounds.y - 52, width: bounds.width + 56, height: bounds.height + 80, label: typeof group.label === 'string' ? group.label : '', childIds: members };
            objects.push(created); candidates.push(created); candidateById.set(created.id, created);
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
      name: 'draw_create_freehand_arrow', title: 'Create a freehand arrow',
      description: 'Create a deterministic natural-looking arrow from semantic start, end, curvature, looseness, named color, weight, and arrowhead inputs. The result compiles only to portable v1 strokes.',
      inputSchema: { type: 'object', required: ['start', 'end'], additionalProperties: false, properties: { expectedRevision: { type: 'string' }, start: pointSchema, end: pointSchema, curvature: { type: 'number', minimum: -1, maximum: 1, default: 0 }, looseness: { type: 'number', minimum: 0, maximum: 1, default: .35 }, color: { type: 'string', enum: DRAWING_PALETTE.map(({ id }) => id), default: 'chalk' }, weight: { type: 'number', minimum: 1, maximum: 24, default: 4 }, arrowhead: { type: 'string', enum: ['vee', 'triangle', 'barbed'], default: 'vee' } } },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      execute: async (input) => {
        const state = controller.getState(), currentRevision = drawRevision(state.document);
        if (typeof input.expectedRevision === 'string' && input.expectedRevision !== currentRevision) throw new Error(`Canvas revision is stale. Inspect again and retry with revision ${currentRevision}.`);
        const readPoint = (value: unknown, label: string): Point => {
          if (!value || typeof value !== 'object') throw new Error(`${label} requires finite x and y.`);
          const point = value as Record<string, unknown>;
          if (typeof point.x !== 'number' || !Number.isFinite(point.x) || typeof point.y !== 'number' || !Number.isFinite(point.y)) throw new Error(`${label} requires finite x and y.`);
          if (Math.abs(point.x) > 1_000_000 || Math.abs(point.y) > 1_000_000) throw new Error(`${label} coordinates must stay within 1,000,000 world units.`);
          return { x: point.x, y: point.y };
        };
        const start = readPoint(input.start, 'start'), end = readPoint(input.end, 'end');
        if (Math.hypot(end.x - start.x, end.y - start.y) < 8) throw new Error('Freehand arrow endpoints must be at least 8 world units apart.');
        const curvature = finite(input.curvature, 0), looseness = finite(input.looseness, .35), weight = finite(input.weight, 4);
        if (curvature < -1 || curvature > 1) throw new Error('curvature must be from -1 to 1.');
        if (looseness < 0 || looseness > 1) throw new Error('looseness must be from 0 to 1.');
        if (weight < 1 || weight > 24) throw new Error('weight must be from 1 to 24.');
        const arrowhead = (input.arrowhead ?? 'vee') as 'vee' | 'triangle' | 'barbed';
        if (!['vee', 'triangle', 'barbed'].includes(arrowhead)) throw new Error('arrowhead must be vee, triangle, or barbed.');
        const color = colorValue((input.color ?? 'chalk') as NamedColor), points = semanticArrowPoints(start, end, curvature, looseness);
        const objects: CanvasObject[] = [
          { ...identity('stroke'), kind: 'stroke', points, color, width: weight },
          { ...identity('stroke'), kind: 'stroke', points: semanticArrowHead(points, weight, arrowhead), color, width: weight }
        ];
        const { before, after } = await controller.applyOperations([{ type: 'replace_objects', objects: [...state.document.objects, ...objects] }], currentRevision);
        const objectIds = changedObjectIds(before, after);
        return { ...finish('create', objectIds, before, after), objectIds, geometry: { start, end, curvature, looseness, weight, arrowhead, pointCount: points.length, compiledKinds: ['stroke'] } };
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
          const id = requiredId(patch.id, 'patch.id');
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
        const objectChanges = changedObjectIds(result.before, result.after), orderChanges = changedOrderIds(result.before, result.after);
        const ids = [...new Set([...touched, ...objectChanges, ...orderChanges])];
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
      name: 'draw_auto_layout', title: 'Automatically lay out a Draw graph',
      description: 'Arrange independent object or group roots as a topology-aware flow, hierarchy, loop, orbit, or swimlane. Existing connectors determine directed flow; cycles and disconnected components are handled deterministically.',
      inputSchema: { type: 'object', required: ['ids', 'mode'], additionalProperties: false, properties: { expectedRevision: { type: 'string' }, ids: { type: 'array', minItems: 1, maxItems: 100, uniqueItems: true, items: { type: 'string', minLength: 1, maxLength: 240 } }, mode: { type: 'string', enum: ['flow', 'hierarchy', 'loop', 'orbit', 'swimlane'] }, orientation: { type: 'string', enum: ['horizontal', 'vertical'] }, gap: { type: 'number', minimum: 16, maximum: 400, default: 64 }, lanes: { type: 'array', maxItems: 100, items: { type: 'object', required: ['id', 'lane'], additionalProperties: false, properties: { id: { type: 'string', minLength: 1, maxLength: 240 }, lane: { type: 'string', minLength: 1, maxLength: 120 } } } } } },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      execute: async (input) => {
        assertRevision(controller, input.expectedRevision);
        if (!Array.isArray(input.ids) || !input.ids.length || input.ids.length > 100 || input.ids.some((id) => typeof id !== 'string' || !id.length || id.length > 240) || new Set(input.ids).size !== input.ids.length) throw new Error('ids must contain 1 to 100 unique existing root IDs.');
        const ids = (input.ids as string[]).slice().sort();
        const mode = String(input.mode) as 'flow' | 'hierarchy' | 'loop' | 'orbit' | 'swimlane';
        if (!['flow', 'hierarchy', 'loop', 'orbit', 'swimlane'].includes(mode)) throw new Error('mode must be flow, hierarchy, loop, orbit, or swimlane.');
        const before = controller.getState().document, selected = ids.map((id) => before.objects.find((object) => object.id === id));
        if (selected.some((object) => !object || object.kind === 'connector')) throw new Error('Auto-layout IDs must reference existing non-connector objects.');
        const claimed = new Map<string, string>();
        for (const id of ids) for (const nestedId of descendants(before, [id])) {
          const owner = claimed.get(nestedId);
          if (owner) throw new Error(`Auto-layout roots overlap through group membership (${owner} and ${id}); pass independent roots only.`);
          claimed.set(nestedId, id);
        }
        const lanes = asRecords(input.lanes, 'lanes', 100), laneById = new Map<string, string>();
        for (const lane of lanes) {
          const id = requiredId(lane.id, 'lane.id'), name = requiredText(lane.lane, 'lane.lane');
          if (!ids.includes(id)) throw new Error(`Lane references unknown layout root: ${id}.`);
          if (name.length > 120 || laneById.has(id)) throw new Error('Lane names must be at most 120 characters and root assignments must be unique.');
          laneById.set(id, name);
        }
        const gap = finite(input.gap, 64);
        if (gap < 16 || gap > 400) throw new Error('gap must be from 16 to 400.');
        const orientation = input.orientation === 'horizontal' || input.orientation === 'vertical' ? input.orientation : undefined;
        const layout = graphLayoutTargets(before, ids, mode, gap, laneById, orientation);
        let objects = before.objects;
        const movedIds = new Set<string>();
        for (const id of ids) {
          const bounds = objectBounds([before.objects.find((object) => object.id === id)!], before.objects), target = layout.targets.get(id)!;
          const moving = descendants(before, [id]);
          assertMovableConnectorEndpoints(objects, moving);
          objects = objects.map((object) => moving.has(object.id) ? translated(object, target.x - bounds.x, target.y - bounds.y) : object);
          moving.forEach((movingId) => movedIds.add(movingId));
        }
        const result = await controller.applyOperations([{ type: 'replace_objects', objects }], drawRevision(before));
        return { ...finish('update', [...movedIds], result.before, result.after), mode, orientation: orientation ?? (mode === 'hierarchy' ? 'vertical' : 'horizontal'), placedIds: ids, layerCount: layout.layerCount, laneCount: layout.laneCount };
      }
    },
    {
      name: 'draw_focus', title: 'Focus the Draw camera',
      description: 'Fit the camera to all objects, the current selection, explicit IDs, or explicit bounds without requiring raw viewport transforms.',
      inputSchema: { type: 'object', required: ['scope'], additionalProperties: false, properties: { scope: { type: 'string', enum: ['all', 'selection', 'ids', 'bounds'] }, ids: { type: 'array', uniqueItems: true, items: { type: 'string' } }, bounds: { type: 'object', required: ['x', 'y', 'width', 'height'], additionalProperties: false, properties: { x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number', exclusiveMinimum: 0 }, height: { type: 'number', exclusiveMinimum: 0 } } }, padding: { type: 'number', minimum: 0, maximum: 400, default: 72 } } },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      execute: async (input) => {
        if (!controller.focus) throw new Error('Camera focus is unavailable in this Draw surface.');
        const scope = String(input.scope), padding = Math.max(0, Math.min(400, finite(input.padding, 72)));
        let ids: string[] | undefined, bounds: { x: number; y: number; width: number; height: number } | undefined;
        if (scope === 'all' || scope === 'selection') { /* Resolved inside the serialized controller call. */ }
        else if (scope === 'ids') ids = Array.isArray(input.ids) ? input.ids.map(String) : [];
        else if (scope === 'bounds' && input.bounds && typeof input.bounds === 'object') bounds = input.bounds as typeof bounds;
        else throw new Error('Focus scope requires matching ids or bounds.');
        if (scope === 'ids' && !ids?.length) throw new Error('No objects are available for focus.');
        const resolved = await controller.focus({ scope: scope as 'all' | 'selection' | 'ids' | 'bounds', ...(ids ? { ids } : {}), ...(bounds ? { bounds } : {}), padding });
        const focused = compactIdList(resolved?.ids ?? ids ?? []), focusedBounds = resolved?.bounds ?? bounds;
        return { ok: true, revision: drawRevision(controller.getState().document), focusedIds: focused.preview, focusedCount: focused.count, ...(focused.truncated ? { focusedIdsTruncated: true } : {}), bounds: focusedBounds, padding };
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
        for (const id of change.objectIds) if (JSON.stringify(currentById.get(id)) !== JSON.stringify(afterById.get(id))) throw new Error(`Object ${id} changed since ${changeId}; targeted revert refused.`);
        const originallyReordered = new Set(changedOrderIds(change.before, change.after));
        const reorderedSince = new Set(changedOrderIds(change.after, current));
        for (const id of change.orderIds) {
          if (!currentById.has(id)) throw new Error(`Object ${id} changed since ${changeId}; targeted revert refused.`);
          if (originallyReordered.has(id) && reorderedSince.has(id)) throw new Error(`Object ${id} layer order changed since ${changeId}; targeted revert refused.`);
        }
        const removing = new Set(change.ids.filter((id) => !beforeById.has(id) && afterById.has(id)));
        const touched = new Set(change.ids);
        for (const object of current.objects) {
          if (touched.has(object.id)) continue;
          const depends = object.kind === 'connector' ? removing.has(object.fromId) || removing.has(object.toId) : object.kind === 'group' ? object.childIds.some((id) => removing.has(id)) : false;
          if (depends) throw new Error(`Object ${object.id} depends on an object created by ${changeId}; targeted revert refused.`);
        }
        if (change.before.title !== change.after.title && current.title !== change.after.title) throw new Error(`Canvas title changed since ${changeId}; targeted revert refused.`);
        const restoresViewport = JSON.stringify(change.before.viewport) !== JSON.stringify(change.after.viewport);
        if (restoresViewport && JSON.stringify(current.viewport) !== JSON.stringify(change.after.viewport)) throw new Error(`Canvas viewport changed since ${changeId}; targeted revert refused.`);
        const objectChanged = new Set(change.objectIds);
        const priorValue = (object: CanvasObject) => objectChanged.has(object.id) ? object : currentById.get(object.id) ?? object;
        const ordered = new Set(change.orderIds);
        const desired = change.before.objects.filter(({ id }) => ordered.has(id)).map(priorValue);
        let desiredIndex = 0;
        let restored = current.objects
          .map((object) => ordered.has(object.id) ? desired[desiredIndex++] : objectChanged.has(object.id) && beforeById.has(object.id) ? beforeById.get(object.id)! : object)
          .filter(({ id }) => !removing.has(id));
        const retained = new Set(restored.map(({ id }) => id)), after = new Map<string, CanvasObject[]>(), prefix = new Map<boolean, CanvasObject[]>();
        const anchors = new Map<boolean, string>();
        for (const object of change.before.objects) {
          const layer = object.kind === 'group';
          if (retained.has(object.id)) { anchors.set(layer, object.id); continue; }
          if (afterById.has(object.id)) continue;
          const anchor = anchors.get(layer), bucket = anchor ? after.get(anchor) ?? [] : prefix.get(layer) ?? [];
          bucket.push(object);
          if (anchor) after.set(anchor, bucket); else prefix.set(layer, bucket);
        }
        const emittedPrefix = new Set<boolean>(), rebuilt: CanvasObject[] = [];
        for (const object of restored) {
          const layer = object.kind === 'group';
          if (!emittedPrefix.has(layer)) { rebuilt.push(...(prefix.get(layer) ?? [])); emittedPrefix.add(layer); }
          rebuilt.push(object, ...(after.get(object.id) ?? []));
        }
        for (const layer of [false, true]) if (!emittedPrefix.has(layer)) rebuilt.push(...(prefix.get(layer) ?? []));
        restored = rebuilt;
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
        journalBytes -= change.bytes;
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
        if (!Array.isArray(input.objects) || input.objects.length > 1000) throw new Error('objects must be an array of at most 1000 objects.');
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
