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
  return candidate.version === DOCUMENT_VERSION && typeof candidate.id === 'string' && typeof candidate.title === 'string' && Array.isArray(candidate.objects) && !!candidate.viewport && typeof candidate.viewport.x === 'number' && typeof candidate.viewport.y === 'number' && typeof candidate.viewport.zoom === 'number';
}

export function withObjects(document: CanvasDocument, objects: CanvasObject[]): CanvasDocument {
  return { ...document, objects, updatedAt: now() };
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

export function objectBounds(objects: CanvasObject[]) {
  const points: Point[] = [];
  for (const object of objects) {
    if (object.kind === 'stroke') points.push(...object.points);
    else if (object.kind === 'rectangle' || object.kind === 'ellipse' || object.kind === 'arrow') points.push(object.from, object.to);
    else if (object.kind === 'note' || object.kind === 'group') points.push({ x: object.x, y: object.y }, { x: object.x + object.width, y: object.y + object.height });
  }
  if (!points.length) return { x: 100, y: 100, width: 320, height: 180 };
  const xs = points.map(({ x }) => x), ys = points.map(({ y }) => y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(120, Math.max(...xs) - x), height: Math.max(80, Math.max(...ys) - y) };
}

export function convert(document: CanvasDocument, selectedIds: string[], target: 'note' | 'connector' | 'group'): CanvasDocument {
  const sources = document.objects.filter(({ id }) => selectedIds.includes(id));
  if (!sources.length || (target === 'connector' && sources.length < 2)) return document;
  const bounds = objectBounds(sources);
  const base = { id: uid(target), createdAt: now(), sourceIds: [...selectedIds], sourceSnapshot: structuredClone(sources) };
  let result: CanvasObject;
  if (target === 'note') result = { ...base, kind: 'note', x: bounds.x, y: bounds.y, width: Math.max(240, bounds.width), height: Math.max(120, bounds.height), text: 'Captured thought' };
  else if (target === 'group') result = { ...base, kind: 'group', x: bounds.x - 24, y: bounds.y - 40, width: bounds.width + 48, height: bounds.height + 64, label: 'Working group', childIds: [...selectedIds] };
  else result = { ...base, kind: 'connector', fromId: selectedIds[0], toId: selectedIds[1], label: '' };
  return withObjects(document, [...document.objects, result]);
}

export function restoreConversion(document: CanvasDocument, id: string): CanvasDocument {
  const conversion = document.objects.find((object) => object.id === id);
  if (!conversion?.sourceSnapshot) return document;
  const remaining = document.objects.filter((object) => object.id !== id);
  const existing = new Set(remaining.map((object) => object.id));
  return withObjects(document, [...remaining, ...conversion.sourceSnapshot.filter((object) => !existing.has(object.id))]);
}

export const serialize = (document: CanvasDocument) => JSON.stringify(document, null, 2);
export function parse(source: string): CanvasDocument {
  const value: unknown = JSON.parse(source);
  if (!isDocument(value)) throw new Error('This file is not a supported mapping canvas document.');
  return value;
}
