export const DOCUMENT_VERSION = 'create-something.mapping-canvas.v1' as const;
export type Point = { x: number; y: number };
export type Viewport = { x: number; y: number; zoom: number };
export type Tool = 'select' | 'pen' | 'eraser' | 'rectangle' | 'ellipse' | 'arrow' | 'note' | 'connector' | 'group' | 'pan';
type Base = { id: string; createdAt: string; sourceIds?: string[]; sourceSnapshot?: CanvasObject[] };
export type Stroke = Base & { kind: 'stroke'; points: Point[]; color: string; width: number };
export type Shape = Base & { kind: 'rectangle' | 'ellipse' | 'arrow'; from: Point; to: Point; color: string };
export type Note = Base & { kind: 'note'; x: number; y: number; width: number; height: number; text: string };
export type Connector = Base & { kind: 'connector'; fromId: string; toId: string; label: string };
export type Group = Base & { kind: 'group'; x: number; y: number; width: number; height: number; label: string; childIds: string[] };
export type CanvasObject = Stroke | Shape | Note | Connector | Group;
export type CanvasDocument = { version: typeof DOCUMENT_VERSION; id: string; title: string; createdAt: string; updatedAt: string; viewport: Viewport; objects: CanvasObject[] };
export type History = { past: CanvasDocument[]; present: CanvasDocument; future: CanvasDocument[] };

const now = () => new Date().toISOString();
export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function createDocument(title = 'Untitled mapping session'): CanvasDocument {
  const timestamp = now();
  return { version: DOCUMENT_VERSION, id: uid('canvas'), title, createdAt: timestamp, updatedAt: timestamp, viewport: { x: 0, y: 0, zoom: 1 }, objects: [] };
}

export function isDocument(value: unknown): value is CanvasDocument {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CanvasDocument>;
  if (candidate.version !== DOCUMENT_VERSION || typeof candidate.id !== 'string' || typeof candidate.title !== 'string' || typeof candidate.createdAt !== 'string' || typeof candidate.updatedAt !== 'string' || !Array.isArray(candidate.objects) || !isViewport(candidate.viewport) || !candidate.objects.every((object) => isCanvasObject(object))) return false;
  const ids = new Set(candidate.objects.map(({ id }) => id));
  return ids.size === candidate.objects.length && candidate.objects.every((object) => {
    if (object.kind === 'connector') return object.fromId !== object.toId && ids.has(object.fromId) && ids.has(object.toId);
    if (object.kind === 'group') return object.childIds.every((id) => ids.has(id));
    return true;
  }) && !hasConnectorCycle(candidate.objects);
}

export function normalizeDocument(value: unknown): CanvasDocument | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<CanvasDocument>;
  if (candidate.version !== DOCUMENT_VERSION || typeof candidate.id !== 'string' || typeof candidate.title !== 'string' || typeof candidate.createdAt !== 'string' || typeof candidate.updatedAt !== 'string' || !Array.isArray(candidate.objects) || !isViewport(candidate.viewport) || !candidate.objects.every((object) => isCanvasObject(object))) return null;
  const objects = candidate.objects as CanvasObject[], ids = new Set(objects.map(({ id }) => id));
  if (ids.size !== objects.length || objects.some((object) => object.kind === 'connector' && (object.fromId === object.toId || !ids.has(object.fromId) || !ids.has(object.toId))) || hasConnectorCycle(objects)) return null;
  const repaired = { ...candidate, objects: objects.map((object) => object.kind === 'group' ? { ...object, childIds: object.childIds.filter((id) => ids.has(id)) } : object) } as CanvasDocument;
  return isDocument(repaired) ? repaired : null;
}

function hasConnectorCycle(objects: CanvasObject[]) {
  const byId = new Map(objects.map((object) => [object.id, object]));
  const visiting = new Set<string>(), visited = new Set<string>();
  const visit = (id: string): boolean => {
    const object = byId.get(id);
    if (object?.kind !== 'connector' || visited.has(id)) return false;
    if (visiting.has(id)) return true;
    visiting.add(id);
    if (visit(object.fromId) || visit(object.toId)) return true;
    visiting.delete(id); visited.add(id); return false;
  };
  return objects.some(({ id }) => visit(id));
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isPoint = (value: unknown): value is Point => !!value && typeof value === 'object' && isFiniteNumber((value as Point).x) && isFiniteNumber((value as Point).y);
const isViewport = (value: unknown): value is Viewport => isPoint(value) && isFiniteNumber((value as Viewport).zoom) && (value as Viewport).zoom > 0;
export function isCanvasObject(value: unknown): value is CanvasObject {
  if (!value || typeof value !== 'object') return false;
  const object = value as Partial<CanvasObject>;
  if (typeof object.id !== 'string' || typeof object.createdAt !== 'string' || typeof object.kind !== 'string') return false;
  if (object.sourceIds !== undefined && (!Array.isArray(object.sourceIds) || !object.sourceIds.every((id) => typeof id === 'string'))) return false;
  if (object.sourceSnapshot !== undefined && (!Array.isArray(object.sourceSnapshot) || !object.sourceSnapshot.every((source) => isCanvasObject(source)))) return false;
  if (object.kind === 'stroke') return Array.isArray(object.points) && object.points.length > 1 && object.points.every(isPoint) && typeof object.color === 'string' && isFiniteNumber(object.width) && object.width > 0;
  if (object.kind === 'rectangle' || object.kind === 'ellipse' || object.kind === 'arrow') return isPoint(object.from) && isPoint(object.to) && typeof object.color === 'string';
  if (object.kind === 'note') return isFiniteNumber(object.x) && isFiniteNumber(object.y) && isFiniteNumber(object.width) && object.width > 0 && isFiniteNumber(object.height) && object.height > 0 && typeof object.text === 'string';
  if (object.kind === 'connector') return typeof object.fromId === 'string' && typeof object.toId === 'string' && typeof object.label === 'string';
  if (object.kind === 'group') return isFiniteNumber(object.x) && isFiniteNumber(object.y) && isFiniteNumber(object.width) && object.width > 0 && isFiniteNumber(object.height) && object.height > 0 && typeof object.label === 'string' && Array.isArray(object.childIds) && object.childIds.every((id) => typeof id === 'string');
  return false;
}

export function withObjects(document: CanvasDocument, objects: CanvasObject[]): CanvasDocument {
  return { ...document, objects, updatedAt: now() };
}

export function removeObjects(document: CanvasDocument, ids: string[]): CanvasDocument {
  const removed = new Set(ids);
  let objects = document.objects.filter((object) => !removed.has(object.id));
  while (true) {
    const existing = new Set(objects.map(({ id }) => id));
    const repaired = objects.filter((object) => object.kind !== 'connector' || (existing.has(object.fromId) && existing.has(object.toId)));
    if (repaired.length === objects.length) break;
    objects = repaired;
  }
  const existing = new Set(objects.map(({ id }) => id));
  objects = objects.map((object) => object.kind === 'group' ? { ...object, childIds: object.childIds.filter((id) => existing.has(id)) } : object);
  return withObjects(document, objects);
}

export function resizeGroup(document: CanvasDocument, groupId: string, width: number, height: number): CanvasDocument {
  const group = document.objects.find((object): object is Group => object.id === groupId && object.kind === 'group');
  if (!group || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return document;
  const scaleX = width / group.width, scaleY = height / group.height;
  const byId = new Map(document.objects.map((object) => [object.id, object]));
  const descendants = new Set<string>();
  const collect = (id: string) => {
    if (descendants.has(id)) return;
    descendants.add(id);
    const object = byId.get(id);
    if (object?.kind === 'group') object.childIds.forEach(collect);
  };
  group.childIds.forEach(collect);
  const point = (value: Point): Point => ({ x: group.x + (value.x - group.x) * scaleX, y: group.y + (value.y - group.y) * scaleY });
  const resize = (object: CanvasObject): CanvasObject => {
    if (object.kind === 'stroke') return { ...object, points: object.points.map(point) };
    if (object.kind === 'rectangle' || object.kind === 'ellipse' || object.kind === 'arrow') return { ...object, from: point(object.from), to: point(object.to) };
    if (object.kind === 'note' || object.kind === 'group') {
      const origin = point({ x: object.x, y: object.y });
      return { ...object, x: origin.x, y: origin.y, width: object.width * scaleX, height: object.height * scaleY };
    }
    return object;
  };
  return withObjects(document, document.objects.map((object) => object.id === groupId
    ? { ...group, width, height }
    : descendants.has(object.id) ? resize(object) : object));
}

export function commit(history: History, present: CanvasDocument): History {
  return { past: [...history.past, history.present], present, future: [] };
}
export function undo(history: History): History {
  const previous = history.past.at(-1);
  return previous ? { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] } : history;
}
export function redo(history: History): History {
  const next = history.future[0];
  return next ? { past: [...history.past, history.present], present: next, future: history.future.slice(1) } : history;
}

export function objectBounds(objects: CanvasObject[], allObjects = objects) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const include = ({ x, y }: Point) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
  const byId = new Map(allObjects.map((object) => [object.id, object])), visited = new Set<string>();
  const add = (object: CanvasObject) => {
    if (visited.has(object.id)) return;
    visited.add(object.id);
    if (object.kind === 'stroke') object.points.forEach(include);
    else if (object.kind === 'rectangle' || object.kind === 'ellipse' || object.kind === 'arrow') { include(object.from); include(object.to); }
    else if (object.kind === 'note' || object.kind === 'group') { include({ x: object.x, y: object.y }); include({ x: object.x + object.width, y: object.y + object.height }); }
    else if (object.kind === 'connector') { const from = byId.get(object.fromId), to = byId.get(object.toId); if (from) add(from); if (to) add(to); }
  };
  objects.forEach(add);
  if (!Number.isFinite(minX)) return { x: 100, y: 100, width: 320, height: 180 };
  return { x: minX, y: minY, width: Math.max(120, maxX - minX), height: Math.max(80, maxY - minY) };
}

export function convertWithIdentity(document: CanvasDocument, selectedIds: string[], target: 'note' | 'connector' | 'group', identity: { id: string; createdAt: string }): CanvasDocument {
  const sources = document.objects.filter(({ id }) => selectedIds.includes(id));
  if (!sources.length || (target === 'connector' && sources.length < 2)) return document;
  const bounds = objectBounds(sources, document.objects);
  // Svelte state exposes proxy-backed objects; JSON cloning produces a portable
  // document snapshot where structuredClone would throw DataCloneError.
  const sourceSnapshot = JSON.parse(JSON.stringify(sources)) as CanvasObject[];
  const base = { id: identity.id, createdAt: identity.createdAt, sourceIds: [...selectedIds], sourceSnapshot };
  let result: CanvasObject;
  if (target === 'note') result = { ...base, kind: 'note', x: bounds.x, y: bounds.y, width: Math.max(240, bounds.width), height: Math.max(120, bounds.height), text: 'Captured thought' };
  else if (target === 'group') result = { ...base, kind: 'group', x: bounds.x - 24, y: bounds.y - 40, width: bounds.width + 48, height: bounds.height + 64, label: 'Working group', childIds: [...selectedIds] };
  else result = { ...base, kind: 'connector', fromId: selectedIds[0], toId: selectedIds[1], label: '' };
  return withObjects(document, [...document.objects, result]);
}

export function convert(document: CanvasDocument, selectedIds: string[], target: 'note' | 'connector' | 'group'): CanvasDocument {
  return convertWithIdentity(document, selectedIds, target, { id: uid(target), createdAt: now() });
}

export function restoreConversion(document: CanvasDocument, id: string): CanvasDocument {
  const conversion = document.objects.find((object) => object.id === id);
  if (!conversion?.sourceSnapshot) return document;
  const remaining = removeObjects(document, [id]).objects;
  const existing = new Set(remaining.map((object) => object.id));
  let restored = [...remaining, ...conversion.sourceSnapshot.filter((object) => !existing.has(object.id))];
  let changed = true;
  while (changed) {
    const ids = new Set(restored.map((object) => object.id));
    const next = restored.filter((object) => object.kind !== 'connector' || (ids.has(object.fromId) && ids.has(object.toId)));
    changed = next.length !== restored.length; restored = next;
  }
  const ids = new Set(restored.map((object) => object.id));
  restored = restored.map((object) => object.kind === 'group' ? { ...object, childIds: object.childIds.filter((childId) => ids.has(childId)) } : object);
  return withObjects(document, restored);
}

export const serialize = (document: CanvasDocument) => JSON.stringify(document, null, 2);
export function parse(source: string): CanvasDocument {
  const value: unknown = JSON.parse(source);
  const document = normalizeDocument(value);
  if (!document) throw new Error('This file is not a supported mapping canvas document.');
  return document;
}
