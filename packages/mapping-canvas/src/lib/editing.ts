import {
  expandCompoundIds,
  isDocument,
  type CanvasDocument,
  type CanvasObject,
  type Point
} from './document';
import type { CanvasOperation } from './paired-session';

export type Bounds = { x: number; y: number; width: number; height: number };
export type EditCommand =
  | {
      type: 'transform';
      ids: string[];
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      rotation?: number;
    }
  | { type: 'style'; ids: string[]; color?: string; fill?: string; strokeWidth?: number }
  | { type: 'layer'; ids: string[]; name?: string; locked?: boolean; hidden?: boolean }
  | { type: 'arrange'; ids: string[]; position: 'front' | 'back' | 'forward' | 'backward' }
  | {
      type: 'align';
      ids: string[];
      axis: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'horizontal' | 'vertical';
    }
  | { type: 'paste'; ids: string[]; objects: CanvasObject[]; dx?: number; dy?: number }
  | { type: 'duplicate'; ids: string[]; dx?: number; dy?: number };

/** Pure, bounded command compiler. IDs/time are explicit dependencies for headless replay. */
export function compileEdits(
  document: CanvasDocument,
  commands: unknown,
  identity: { id: () => string; now: string }
) {
  if (!Array.isArray(commands) || !commands.length || commands.length > 100)
    throw new Error('Provide 1–100 edit commands.');
  let draft: CanvasDocument = JSON.parse(JSON.stringify(document));
  let selectedIds: string[] = [];
  const number = (value: unknown, field: string, min = -1e7, max = 1e7) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
      throw new Error(`${field} must be a finite number between ${min} and ${max}.`);
    return value;
  };
  for (const input of commands) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new Error('Invalid edit command.');
    const command = input as EditCommand;
    const fields: Record<EditCommand['type'], string[]> = {
      transform: ['x', 'y', 'width', 'height', 'rotation'],
      style: ['color', 'fill', 'strokeWidth'],
      layer: ['name', 'locked', 'hidden'],
      arrange: ['position'],
      align: ['axis'],
      duplicate: ['dx', 'dy'],
      paste: ['objects', 'dx', 'dy']
    };
    if (
      !Object.hasOwn(fields, command.type) ||
      Object.keys(command).some((key) => !['type', 'ids', ...fields[command.type]].includes(key))
    )
      throw new Error('Unknown edit command or property.');
    if (
      !Array.isArray(command.ids) ||
      !command.ids.length ||
      command.ids.length > 200 ||
      command.ids.some((id) => typeof id !== 'string') ||
      new Set(command.ids).size !== command.ids.length
    )
      throw new Error('Provide 1–200 unique object IDs.');
    if (command.type === 'paste') {
      if (!Array.isArray(command.objects) || command.objects.length > 5000)
        throw new Error('Paste supports at most 5000 objects.');
      const source = { ...draft, objects: command.objects };
      if (!isDocument(source)) throw new Error('Clipboard artwork is invalid.');
      const copied = compileEdits(
        source,
        [{ type: 'duplicate', ids: command.ids, dx: command.dx, dy: command.dy }],
        identity
      );
      const additions = copied.document.objects.slice(source.objects.length);
      if (additions.some((o) => draft.objects.some((existing) => existing.id === o.id)))
        throw new Error('Pasted IDs must be unique.');
      draft.objects.push(...additions);
      selectedIds = copied.selectedIds;
      if (!isDocument(draft)) throw new Error('Paste would create an invalid document.');
      continue;
    }
    if (command.ids.some((id) => !draft.objects.some((object) => object.id === id)))
      throw new Error('An edit target no longer exists. Inspect the project again.');
    const ids = descendants(draft, command.ids);
    if (ids.size > 5000) throw new Error('Edit exceeds 5000 objects.');
    const objects = draft.objects.filter((object) => ids.has(object.id));
    if (command.type !== 'layer' && objects.some((object) => isLayerLocked(draft, object.id)))
      throw new Error('Unlock the selected layers before editing.');
    selectedIds = [...command.ids];
    if (command.type === 'transform') {
      const geometry = objects.filter((object) => object.kind !== 'connector');
      if (!geometry.length) throw new Error('Transform connector endpoints instead.');
      const roots = transformRoots(draft, command.ids);
      const bounds = editBounds(roots);
      const x = command.x === undefined ? bounds.x : number(command.x, 'x');
      const y = command.y === undefined ? bounds.y : number(command.y, 'y');
      const width = command.width === undefined ? bounds.width : number(command.width, 'width', 1);
      const height =
        command.height === undefined ? bounds.height : number(command.height, 'height', 1);
      const rotation =
        command.rotation === undefined
          ? undefined
          : number(command.rotation, 'rotation', -36000, 36000);
      const sx = width / (bounds.width || 1),
        sy = height / (bounds.height || 1);
      const deltaRotation =
        rotation === undefined
          ? 0
          : rotation - (roots[0]?.rotation || 0);
      const point = (p: Point) => ({ x: x + (p.x - bounds.x) * sx, y: y + (p.y - bounds.y) * sy });
      draft.objects = draft.objects.map((object) => {
        if (!ids.has(object.id) || object.kind === 'connector') return object;
        let next = mapGeometry(object, point, sx, sy);
        if (rotation !== undefined) {
          const b = editBounds([next]),
            cx = b.x + b.width / 2,
            cy = b.y + b.height / 2;
          const px = x + width / 2,
            py = y + height / 2,
            rad = (deltaRotation * Math.PI) / 180;
          const nx = px + (cx - px) * Math.cos(rad) - (cy - py) * Math.sin(rad),
            ny = py + (cx - px) * Math.sin(rad) + (cy - py) * Math.cos(rad);
          next = {
            ...mapGeometry(next, (p) => ({ x: p.x + nx - cx, y: p.y + ny - cy }), 1, 1),
            rotation: (next.rotation || 0) + deltaRotation
          };
        }
        return next;
      });
    } else if (command.type === 'style') {
      for (const key of ['color', 'fill'] as const)
        if (
          command[key] !== undefined &&
          !(
            typeof command[key] === 'string' &&
            (/^#[\da-f]{6}$/i.test(command[key]!) || (key === 'fill' && command[key] === 'none'))
          )
        )
          throw new Error(`${key} must be #RRGGBB${key === 'fill' ? ' or none' : ''}.`);
      if (command.strokeWidth !== undefined) number(command.strokeWidth, 'strokeWidth', 0.1, 100);
      if (
        objects.some((object) => !['stroke', 'rectangle', 'ellipse', 'arrow'].includes(object.kind))
      )
        throw new Error('Style commands target marks and shapes.');
      draft.objects = draft.objects.map((object) =>
        !ids.has(object.id)
          ? object
          : {
              ...object,
              ...(command.color !== undefined ? { color: command.color } : {}),
              ...(command.fill !== undefined ? { fill: command.fill } : {}),
              ...(command.strokeWidth !== undefined
                ? object.kind === 'stroke'
                  ? { width: command.strokeWidth }
                  : { strokeWidth: command.strokeWidth }
                : {})
            }
      );
    } else if (command.type === 'layer') {
      if (
        command.name !== undefined &&
        (typeof command.name !== 'string' || !command.name.trim() || command.name.length > 120)
      )
        throw new Error('Layer name must contain 1–120 characters.');
      for (const key of ['hidden', 'locked'] as const)
        if (command[key] !== undefined && typeof command[key] !== 'boolean')
          throw new Error(`${key} must be boolean.`);
      // Metadata belongs to requested roots; inherited visibility/lock is computed.
      const roots = new Set(command.ids);
      draft.objects = draft.objects.map((object) =>
        !roots.has(object.id)
          ? object
          : {
              ...object,
              ...(command.name !== undefined ? { name: command.name.trim() } : {}),
              ...(command.hidden !== undefined ? { hidden: command.hidden } : {}),
              ...(command.locked !== undefined ? { locked: command.locked } : {})
            }
      );
    } else if (command.type === 'duplicate') {
      const dx = command.dx === undefined ? 24 : number(command.dx, 'dx'),
        dy = command.dy === undefined ? 24 : number(command.dy, 'dy');
      const remap = new Map(objects.map((object) => [object.id, identity.id()]));
      if (
        new Set(remap.values()).size !== remap.size ||
        [...remap.values()].some((id) => draft.objects.some((object) => object.id === id))
      )
        throw new Error('Duplicate IDs must be unique.');
      const copies = objects.map((object): CanvasObject => {
        const copy = mapGeometry(object, (p) => ({ x: p.x + dx, y: p.y + dy }), 1, 1);
        // A duplicate is independent of conversion restoration snapshots.
        delete copy.sourceSnapshot;
        if (copy.sourceIds)
          copy.sourceIds = copy.sourceIds.filter((id) => remap.has(id)).map((id) => remap.get(id)!);
        return {
          ...copy,
          id: remap.get(object.id)!,
          createdAt: identity.now,
          ...(object.name ? { name: `${object.name.slice(0, 115)} copy` } : {}),
          ...(object.kind === 'group'
            ? { childIds: object.childIds.map((id) => remap.get(id) ?? id) }
            : {}),
          ...(object.kind === 'connector'
            ? {
                fromId: remap.get(object.fromId) ?? object.fromId,
                toId: remap.get(object.toId) ?? object.toId
              }
            : {})
        } as CanvasObject;
      });
      draft.objects.push(...copies);
      selectedIds = command.ids.map((id) => remap.get(id)!);
    } else if (command.type === 'arrange') {
      if (!['front', 'back', 'forward', 'backward'].includes(command.position))
        throw new Error('Invalid layer position.');
      if (command.position === 'front' || command.position === 'back') {
        const rest = draft.objects.filter((object) => !ids.has(object.id));
        draft.objects =
          command.position === 'front' ? [...rest, ...objects] : [...objects, ...rest];
      } else {
        const next = [...draft.objects];
        if (command.position === 'forward') {
          for (let i = next.length - 2; i >= 0; i--)
            if (ids.has(next[i].id) && !ids.has(next[i + 1].id))
              [next[i], next[i + 1]] = [next[i + 1], next[i]];
        } else
          for (let i = 1; i < next.length; i++)
            if (ids.has(next[i].id) && !ids.has(next[i - 1].id))
              [next[i], next[i - 1]] = [next[i - 1], next[i]];
        draft.objects = next;
      }
    } else if (command.type === 'align') {
      if (
        !['left', 'center', 'right', 'top', 'middle', 'bottom', 'horizontal', 'vertical'].includes(
          command.axis
        )
      )
        throw new Error('Invalid alignment axis.');
      const roots = command.ids.map((id) => draft.objects.find((object) => object.id === id)!);
      if (roots.length < 2 || roots.some((object) => object.kind === 'connector'))
        throw new Error('Align at least two independent objects, not connectors.');
      const branches = roots.map((root) => descendants(draft, [root.id]));
      const seen = new Set<string>();
      for (const branch of branches)
        for (const id of branch) {
          if (seen.has(id))
            throw new Error('Alignment roots overlap. Select groups or children, not both.');
          seen.add(id);
        }
      const all = editBounds(roots),
        horizontal = ['left', 'center', 'right', 'horizontal'].includes(command.axis);
      const entries = roots.map((root, index) => ({
        root,
        ids: branches[index],
        bounds: editBounds([root])
      }));
      if (['horizontal', 'vertical'].includes(command.axis))
        entries.sort(
          (a, b) =>
            (horizontal ? a.bounds.x - b.bounds.x : a.bounds.y - b.bounds.y) ||
            a.root.id.localeCompare(b.root.id)
        );
      const extent = horizontal ? all.width : all.height;
      const used = entries.reduce(
        (sum, entry) => sum + (horizontal ? entry.bounds.width : entry.bounds.height),
        0
      );
      let cursor = horizontal ? all.x : all.y;
      for (const entry of entries) {
        const b = entry.bounds;
        const dx =
          command.axis === 'left'
            ? all.x - b.x
            : command.axis === 'center'
              ? all.x + all.width / 2 - b.x - b.width / 2
              : command.axis === 'right'
                ? all.x + all.width - b.x - b.width
                : command.axis === 'horizontal'
                  ? cursor - b.x
                  : 0;
        const dy =
          command.axis === 'top'
            ? all.y - b.y
            : command.axis === 'middle'
              ? all.y + all.height / 2 - b.y - b.height / 2
              : command.axis === 'bottom'
                ? all.y + all.height - b.y - b.height
                : command.axis === 'vertical'
                  ? cursor - b.y
                  : 0;
        draft.objects = draft.objects.map((object) =>
          entry.ids.has(object.id)
            ? mapGeometry(object, (p) => ({ x: p.x + dx, y: p.y + dy }), 1, 1)
            : object
        );
        cursor += (horizontal ? b.width : b.height) + (extent - used) / (entries.length - 1);
      }
    }
    if (!isDocument(draft))
      throw new Error('Edit would create an invalid document. No changes were applied.');
  }
  assertLockedLayersPreserved(document, draft);
  const before = new Map(document.objects.map((object) => [object.id, JSON.stringify(object)]));
  const changedIds = draft.objects
    .filter(
      (object, index) =>
        before.get(object.id) !== JSON.stringify(object) ||
        document.objects[index]?.id !== object.id
    )
    .map((object) => object.id);
  const reordered =
    document.objects.length !== draft.objects.length ||
    document.objects.some((object, index) => draft.objects[index]?.id !== object.id);
  const operations: CanvasOperation[] = reordered
    ? [{ type: 'replace_objects', objects: draft.objects }]
    : draft.objects
        .filter((object) => changedIds.includes(object.id))
        .map((object) => ({ type: 'put_object', object }));
  return { operations, selectedIds, changedIds, document: draft };
}

export function descendants(document: CanvasDocument, ids: Iterable<string>) {
  const byId = new Map(document.objects.map((object) => [object.id, object]));
  const result = expandCompoundIds(document, ids),
    queue = [...result];
  for (let i = 0; i < queue.length; i++) {
    const object = byId.get(queue[i]);
    if (object?.kind === 'group')
      for (const child of object.childIds)
        if (!result.has(child)) {
          result.add(child);
          queue.push(child);
        }
  }
  return result;
}
/** A portable clipboard graph includes connector endpoints and group descendants. */
export function clipboardObjects(
  document: CanvasDocument,
  selected: Iterable<string>
): CanvasObject[] {
  const ids = descendants(document, selected),
    byId = new Map(document.objects.map((o) => [o.id, o])),
    queue = [...ids];
  for (let i = 0; i < queue.length; i++) {
    const object = byId.get(queue[i]);
    if (object?.kind === 'connector')
      for (const id of descendants(document, [object.fromId, object.toId]))
        if (!ids.has(id)) {
          ids.add(id);
          queue.push(id);
        }
  }
  return document.objects.filter((o) => ids.has(o.id));
}
export function isLayerLocked(document: CanvasDocument, id: string) {
  return document.objects.some(
    (object) =>
      object.locked &&
      (object.id === id || (object.kind === 'group' && descendants(document, [object.id]).has(id)))
  );
}
export function visibleObjects(document: CanvasDocument) {
  const hidden = descendants(
    document,
    document.objects.filter((object) => object.hidden).map((object) => object.id)
  );
  return document.objects.filter(
    (object) =>
      !hidden.has(object.id) &&
      (object.kind !== 'connector' || (!hidden.has(object.fromId) && !hidden.has(object.toId)))
  );
}
/** Shared transform baseline: visible controls and commands use the same geometry roots. */
export function transformRoots(document: CanvasDocument, ids: string[]): CanvasObject[] {
  const selected = document.objects.filter(object => ids.includes(object.id) && object.kind !== 'connector');
  return selected.filter(object => !selected.some(parent => parent.kind === 'group' && parent.id !== object.id && descendants(document, [parent.id]).has(object.id)));
}
export function editBounds(objects: CanvasObject[]): Bounds {
  const points: Point[] = [];
  for (const object of objects) {
    if (object.kind === 'stroke') for (const p of object.points) points.push(p);
    else if ('from' in object) points.push(object.from, object.to);
    else if ('x' in object)
      points.push(
        { x: object.x, y: object.y },
        { x: object.x + object.width, y: object.y + object.height }
      );
  }
  if (!points.length) return { x: 0, y: 0, width: 0, height: 0 };
  let left = Infinity,
    top = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const p of points) {
    left = Math.min(left, p.x);
    top = Math.min(top, p.y);
    right = Math.max(right, p.x);
    bottom = Math.max(bottom, p.y);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}
/** Axis-aligned painted geometry envelope, including object rotation. */
export function visualBounds(objects: CanvasObject[]): Bounds {
  const corners: CanvasObject[] = [];
  for (const object of objects) {
    if (object.kind === 'connector') continue;
    const b = editBounds([object]),
      r = ((object.rotation || 0) * Math.PI) / 180,
      cx = b.x + b.width / 2,
      cy = b.y + b.height / 2;
    const points = [
      { x: b.x, y: b.y },
      { x: b.x + b.width, y: b.y },
      { x: b.x + b.width, y: b.y + b.height },
      { x: b.x, y: b.y + b.height }
    ].map((p) => ({
      x: cx + (p.x - cx) * Math.cos(r) - (p.y - cy) * Math.sin(r),
      y: cy + (p.x - cx) * Math.sin(r) + (p.y - cy) * Math.cos(r)
    }));
    corners.push({
      id: object.id,
      createdAt: object.createdAt,
      kind: 'stroke',
      points,
      width: 1,
      color: '#ffffff'
    });
  }
  return editBounds(corners);
}
function mapGeometry(
  object: CanvasObject,
  point: (p: Point) => Point,
  sx: number,
  sy: number
): CanvasObject {
  if (object.kind === 'stroke') return { ...object, points: object.points.map(point) };
  if ('from' in object) return { ...object, from: point(object.from), to: point(object.to) };
  if ('x' in object)
    return { ...object, ...point(object), width: object.width * sx, height: object.height * sy };
  return { ...object };
}

const idsSchema = {
  type: 'array',
  minItems: 1,
  maxItems: 200,
  uniqueItems: true,
  items: { type: 'string' }
};
const numeric = { type: 'number', minimum: -1e7, maximum: 1e7 };
export const editCommandSchema = {
  oneOf: [
    {
      type: 'transform',
      properties: {
        x: numeric,
        y: numeric,
        width: { type: 'number', minimum: 1, maximum: 1e7 },
        height: { type: 'number', minimum: 1, maximum: 1e7 },
        rotation: { type: 'number', minimum: -36000, maximum: 36000 }
      }
    },
    {
      type: 'style',
      properties: {
        color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
        fill: { type: 'string', pattern: '^(#[0-9a-fA-F]{6}|none)$' },
        strokeWidth: { type: 'number', minimum: 0.1, maximum: 100 }
      }
    },
    {
      type: 'layer',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 120 },
        locked: { type: 'boolean' },
        hidden: { type: 'boolean' }
      }
    },
    { type: 'duplicate', properties: { dx: numeric, dy: numeric } },
    {
      type: 'paste',
      properties: {
        objects: {
          type: 'array',
          minItems: 1,
          maxItems: 5000,
          items: { type: 'object' },
          description:
            'Portable mapping-canvas.v1 objects. All references must resolve inside this array.'
        },
        dx: numeric,
        dy: numeric
      }
    },
    {
      type: 'arrange',
      properties: { position: { type: 'string', enum: ['front', 'back', 'forward', 'backward'] } }
    },
    {
      type: 'align',
      properties: {
        axis: {
          type: 'string',
          enum: ['left', 'center', 'right', 'top', 'middle', 'bottom', 'horizontal', 'vertical']
        }
      }
    }
  ].map(({ type, properties }) => ({
    type: 'object',
    additionalProperties: false,
    required: [
      'type',
      'ids',
      ...(type === 'arrange'
        ? ['position']
        : type === 'align'
          ? ['axis']
          : type === 'paste'
            ? ['objects']
            : [])
    ],
    properties: { type: { const: type }, ids: idsSchema, ...properties }
  }))
};

/** Lock is an editing contract shared by legacy and new operation callers. */
export function assertLockedLayersPreserved(before: CanvasDocument, after: CanvasDocument) {
  const next = new Map(after.objects.map((object) => [object.id, object]));
  const beforeIds = new Set(before.objects.map(object => object.id));
  const beforeOrder = new Map(before.objects.filter(object => next.has(object.id)).map((object, index) => [object.id, index]));
  const afterOrder = new Map(after.objects.filter(object => beforeIds.has(object.id)).map((object, index) => [object.id, index]));
  for (const object of before.objects) {
    if (!isLayerLocked(before, object.id)) continue;
    const updated = next.get(object.id);
    if (!updated) throw new Error(`Unlock layer ${object.name || object.id} before deleting it.`);
    if (beforeOrder.get(object.id) !== afterOrder.get(object.id))
      throw new Error(`Unlock layer ${object.name || object.id} before changing its stacking order.`);
    const editableMetadata = (value: CanvasObject) => {
      const { locked, hidden, name, ...rest } = value;
      return rest;
    };
    if (JSON.stringify(editableMetadata(object)) !== JSON.stringify(editableMetadata(updated)))
      throw new Error(`Unlock layer ${object.name || object.id} before editing it.`);
  }
}
