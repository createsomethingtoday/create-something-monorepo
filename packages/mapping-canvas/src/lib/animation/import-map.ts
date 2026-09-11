import { type CanvasDocument } from '../document';
import { DEFAULT_DRAWING_COLOR } from '../palette';
import {
  basePose,
  isMotionDrawingId,
  LIMITS,
  newProject,
  type Drawing,
  type Point,
  type Project
} from './model';

function boundedStrokePoints(points: Point[]): Point[] {
  if (points.length <= LIMITS.points) return points;
  const last = points.length - 1;
  return Array.from(
    { length: LIMITS.points },
    (_, index) => points[Math.round((index * last) / (LIMITS.points - 1))]
  );
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function isImportableCanvasObject(object: CanvasDocument['objects'][number]) {
  return (
    isMotionDrawingId(object.id) &&
    (object.kind === 'stroke' ||
      object.kind === 'note' ||
      object.kind === 'rectangle' ||
      object.kind === 'ellipse' ||
      object.kind === 'arrow')
  );
}

function sceneFit(map: CanvasDocument) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let widest = 0, tallest = 0;
  const include = ({ x, y }: Point) => {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  };
  const includeBox = (x: number, y: number, width: number, height: number) => {
    widest = Math.max(widest, width); tallest = Math.max(tallest, height);
    include({ x, y });
    include({
      x: Number.isFinite(x + width) ? x + width : Number.MAX_VALUE,
      y: Number.isFinite(y + height) ? y + height : Number.MAX_VALUE
    });
  };
  for (const object of map.objects) {
    if (object.kind === 'stroke') object.points.forEach(include);
    else if (object.kind === 'note' || object.kind === 'group')
      includeBox(object.x, object.y, object.width, object.height);
    else if (object.kind === 'rectangle' || object.kind === 'ellipse' || object.kind === 'arrow') {
      include(object.from); include(object.to);
    }
  }
  if (!Number.isFinite(minX)) {
    minX = 100; minY = 100; maxX = 420; maxY = 280;
  }
  const unitsPerScene = Math.max(
    1,
    (maxX / 2 - minX / 2) / 550,
    (maxY / 2 - minY / 2) / 280,
    widest / 550,
    tallest / 280
  );
  const scale = 1 / unitsPerScene;
  return {
    scale,
    toScene: (point: Point): Point => ({
      x: 60 + point.x / unitsPerScene - minX / unitsPerScene,
      y: 60 + point.y / unitsPerScene - minY / unitsPerScene
    })
  };
}

/** Chalk and note text are neutral ink; choose their light/dark variant for the paper. */
function paperInk(background: string): string {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(background.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance > 0.179 ? '#282522' : DEFAULT_DRAWING_COLOR;
}

/** Materialize representable Canvas marks in Motion without changing their identity. */
export function importMap(map: CanvasDocument, background = '#eee5d4'): { drawings: Drawing[]; skipped: number } {
  const objects = map.objects.filter(isImportableCanvasObject).slice(0, LIMITS.drawings);
  const retainedMap = { ...map, objects };
  const { scale, toScene } = sceneFit(retainedMap);
  const skipped = map.objects.length - objects.length;
  const drawings: Drawing[] = [];
  const neutralInk = paperInk(background);
  for (const object of objects) {
    const common = {
      id: object.id,
      name: object.kind === 'note' ? object.text.slice(0, 80) : object.kind,
      kind: 'stroke' as const,
      color: 'color' in object && /^#[\da-f]{6}$/i.test(object.color)
        ? object.color.toLowerCase() === DEFAULT_DRAWING_COLOR ? neutralInk : object.color
        : neutralInk,
      weight: Math.max(0.1, 3 * scale),
      text: '',
      width: 100,
      height: 100,
      poses: [basePose()]
    };
    const sourced = <T extends Drawing>(drawing: T): T => {
      const { x, y } = drawing.poses[0];
      return {
        ...drawing,
        source: {
          space: 'canvas',
          objectId: object.id,
          origin: { x, y, scaleX: scale, scaleY: scale }
        }
      };
    };
    if (object.kind === 'stroke')
      drawings.push(
        sourced({
          ...common,
          points: boundedStrokePoints(object.points).map(toScene),
          weight: Math.min(100, Math.max(0.1, object.width * scale))
        })
      );
    else if (object.kind === 'note')
      drawings.push(
        sourced({
          ...common,
          kind: 'text',
          points: [],
          text: object.text.slice(0, 2000),
          color: neutralInk,
          weight: Math.max(0.1, 24 * scale),
          width: Math.max(1, object.width * scale),
          height: Math.max(1, object.height * scale),
          poses: [
            {
              ...common.poses[0],
              ...toScene({ x: object.x, y: object.y })
            }
          ]
        })
      );
    else if (object.kind === 'rectangle' || object.kind === 'ellipse' || object.kind === 'arrow') {
      const a = object.from,
        b = object.to;
      const points =
        object.kind === 'rectangle'
          ? [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }, a]
          : object.kind === 'ellipse'
            ? (() => {
                const sceneA = toScene(a), sceneB = toScene(b);
                const center = { x: sceneA.x / 2 + sceneB.x / 2, y: sceneA.y / 2 + sceneB.y / 2 };
                const radius = { x: Math.abs(sceneB.x - sceneA.x) / 2, y: Math.abs(sceneB.y - sceneA.y) / 2 };
                return Array.from({ length: 49 }, (_, i) => ({
                  x: center.x + Math.cos((i / 48) * Math.PI * 2) * radius.x,
                  y: center.y + Math.sin((i / 48) * Math.PI * 2) * radius.y
                }));
              })()
            : (() => {
                const angle = Math.atan2(b.y - a.y, b.x - a.x);
                const head = Math.min(18, Math.hypot(b.x - a.x, b.y - a.y) / 3);
                return [
                  a,
                  b,
                  {
                    x: b.x - head * Math.cos(angle - Math.PI / 6),
                    y: b.y - head * Math.sin(angle - Math.PI / 6)
                  },
                  b,
                  {
                    x: b.x - head * Math.cos(angle + Math.PI / 6),
                    y: b.y - head * Math.sin(angle + Math.PI / 6)
                  }
                ];
              })();
      drawings.push(sourced({ ...common, points: object.kind === 'ellipse' ? points : points.map(toScene) }));
    }
  }
  return { drawings, skipped };
}

function retainAnimation(source: Drawing, prior: Drawing | undefined): Drawing {
  if (!prior || prior.source?.space !== 'canvas') return source;
  const samePointCount = prior.points.length === source.points.length;
  const oldOrigin = prior.source.origin ?? prior.poses[0];
  const newOrigin = source.source!.origin!;
  const scaleX = newOrigin.scaleX / oldOrigin.scaleX;
  const scaleY = newOrigin.scaleY / oldOrigin.scaleY;
  return {
    ...source,
    space: prior.space,
    boil: source.kind === 'stroke' ? prior.boil : undefined,
    poses: prior.poses.map((pose) => ({
      ...pose,
      x: clamp(newOrigin.x + (pose.x - oldOrigin.x) * scaleX, -10_000, 10_000),
      y: clamp(newOrigin.y + (pose.y - oldOrigin.y) * scaleY, -10_000, 10_000),
      scaleX: pose.scaleX,
      scaleY: pose.scaleY,
      points:
        samePointCount && pose.points
          ? pose.points.map((point, index) => ({
              x: clamp(
                source.points[index].x + (point.x - prior.points[index].x) * scaleX,
                -10_000,
                10_000
              ),
              y: clamp(
                source.points[index].y + (point.y - prior.points[index].y) * scaleY,
                -10_000,
                10_000
              )
            }))
          : undefined
    }))
  };
}

function preserveMotionOnlyIds(drawings: Drawing[], canvasIds: Set<string>): Drawing[] {
  const used = new Set(canvasIds);
  return drawings.map((drawing) => {
    if (!used.has(drawing.id)) {
      used.add(drawing.id);
      return drawing;
    }
    let index = 0;
    let id: string;
    do {
      const suffix = index ? `--motion-${index}` : '--motion';
      id = `${drawing.id.slice(0, 240 - suffix.length)}${suffix}`;
      index++;
    } while (used.has(id));
    used.add(id);
    return { ...drawing, id };
  });
}

/** Reconcile the Canvas space into Motion while preserving poses and Motion-only artwork. */
export function syncMotionProject(map: CanvasDocument, existing?: Project): Project {
  const prior = new Map(existing?.drawings.map((drawing) => [drawing.id, drawing]));
  const priorMotionOnly =
    existing?.drawings.filter((drawing) => drawing.source?.space !== 'canvas') ?? [];
  const priorCanvasIds = new Set(
    existing?.drawings
      .filter((drawing) => drawing.source?.space === 'canvas')
      .map((drawing) => drawing.source!.objectId) ?? []
  );
  const originalOrder = new Map(map.objects.map((object, index) => [object.id, index]));
  const prioritizedMap = {
    ...map,
    objects: [
      ...map.objects.filter((object) => priorCanvasIds.has(object.id)),
      ...map.objects.filter((object) => !priorCanvasIds.has(object.id))
    ]
  };
  const capacity = Math.max(0, LIMITS.drawings - priorMotionOnly.length);
  const template = existing
    ? { ...existing, id: map.id, revision: existing.revision + 1 }
    : { ...newProject(), id: map.id, title: map.title.slice(0, 240) };
  const emptyProjectBytes = JSON.stringify({ ...template, drawings: [] }).length;
  const assemble = (selected: Drawing[]) => {
    const canvasDrawings = [...selected].sort(
      (a, b) => originalOrder.get(a.id)! - originalOrder.get(b.id)!
    );
    const motionOnly = preserveMotionOnlyIds(
      priorMotionOnly,
      new Set(canvasDrawings.map(({ id }) => id))
    );
    return { ...template, drawings: [...canvasDrawings, ...motionOnly] };
  };
  const serializedBytes = (candidate: Project) =>
    emptyProjectBytes - 2 + JSON.stringify(candidate.drawings).length;
  const importableObjects = prioritizedMap.objects
    .filter(isImportableCanvasObject)
    .slice(0, capacity);
  const existingObjects = importableObjects.filter((object) => priorCanvasIds.has(object.id));
  let updateableExistingObjects = existingObjects;
  let newObjects = importableObjects
    .filter((object) => !priorCanvasIds.has(object.id))
    .slice(0, capacity - existingObjects.length);
  let candidate = assemble([]);
  for (;;) {
    const selectedMap = { ...map, objects: [...updateableExistingObjects, ...newObjects] };
    const imported = importMap(selectedMap, template.background).drawings;
    const importedById = new Map(imported.map((drawing) => [drawing.id, drawing]));
    let selected = existingObjects
      .map((object) => prior.get(object.id))
      .filter((drawing): drawing is Drawing => drawing?.source?.space === 'canvas');
    let current = assemble(selected);
    if (serializedBytes(current) > LIMITS.bytes) {
      if (existing) return existing;
      selected = [];
      current = assemble(selected);
    }
    const acceptedExistingUpdateIds = new Set<string>();
    for (const object of updateableExistingObjects) {
      const updated = importedById.get(object.id);
      if (!updated) continue;
      const retained = retainAnimation(updated, prior.get(updated.id));
      const trial = selected.map((drawing) => drawing.id === retained.id ? retained : drawing);
      const next = assemble(trial);
      if (serializedBytes(next) <= LIMITS.bytes) {
        selected = trial;
        current = next;
        acceptedExistingUpdateIds.add(object.id);
      }
    }
    if (acceptedExistingUpdateIds.size !== updateableExistingObjects.length) {
      updateableExistingObjects = updateableExistingObjects.filter((object) =>
        acceptedExistingUpdateIds.has(object.id)
      );
      continue;
    }
    const retainedNewIds = new Set<string>();
    for (const object of newObjects) {
      const added = importedById.get(object.id);
      if (!added) continue;
      const trial = [...selected, added];
      const next = assemble(trial);
      if (serializedBytes(next) <= LIMITS.bytes) {
        selected = trial;
        current = next;
        retainedNewIds.add(object.id);
      }
    }
    if (retainedNewIds.size === newObjects.length) {
      candidate = current;
      break;
    }
    newObjects = newObjects.filter((object) => retainedNewIds.has(object.id));
  }
  if (!existing) return candidate;
  const unchangedCandidate = { ...candidate, revision: existing.revision };
  return JSON.stringify(unchangedCandidate) === JSON.stringify(existing)
    ? existing
    : candidate;
}
