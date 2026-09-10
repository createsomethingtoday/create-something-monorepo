import { type CanvasDocument, objectBounds } from '../document';
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
  return Array.from({ length: LIMITS.points }, (_, index) =>
    points[Math.round((index * last) / (LIMITS.points - 1))]
  );
}

/** Materialize representable Canvas marks in Motion without changing their identity. */
export function importMap(map: CanvasDocument): { drawings: Drawing[]; skipped: number } {
  const bounds = objectBounds(map.objects);
  const scale = Math.min(1, 1100 / bounds.width, 560 / bounds.height);
  const toScene = (point: Point): Point => ({
    x: 60 + (point.x - bounds.x) * scale,
    y: 60 + (point.y - bounds.y) * scale
  });
  let skipped = 0;
  const drawings: Drawing[] = [];
  for (const object of map.objects) {
    if (!isMotionDrawingId(object.id)) {
      skipped++;
      continue;
    }
    const common = {
      id: object.id,
      name: object.kind === 'note' ? object.text.slice(0, 80) : object.kind,
      kind: 'stroke' as const,
      color: 'color' in object && /^#[\da-f]{6}$/i.test(object.color) ? object.color : '#282522',
      weight: Math.max(0.1, 3 * scale),
      text: '',
      width: 100,
      height: 100,
      poses: [basePose()]
    };
    const sourced = <T extends Drawing>(drawing: T): T => {
      const { x, y, scaleX, scaleY } = drawing.poses[0];
      return {
        ...drawing,
        source: { space: 'canvas', objectId: object.id, origin: { x, y, scaleX, scaleY } }
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
      drawings.push(sourced({
        ...common,
        kind: 'text',
        points: [],
        text: object.text,
        color: '#282522',
        weight: Math.max(0.1, 24 * scale),
        width: Math.max(1, object.width * scale),
        height: Math.max(1, object.height * scale),
        poses: [
          {
            ...common.poses[0],
            ...toScene({ x: object.x, y: object.y })
          }
        ]
      }));
    else if (object.kind === 'rectangle' || object.kind === 'ellipse' || object.kind === 'arrow') {
      const a = object.from,
        b = object.to;
      const points =
        object.kind === 'rectangle'
          ? [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }, a]
          : object.kind === 'ellipse'
            ? Array.from({ length: 49 }, (_, i) => ({
                x: (a.x + b.x) / 2 + (Math.cos((i / 48) * Math.PI * 2) * Math.abs(b.x - a.x)) / 2,
                y: (a.y + b.y) / 2 + (Math.sin((i / 48) * Math.PI * 2) * Math.abs(b.y - a.y)) / 2
              }))
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
      drawings.push(sourced({ ...common, points: points.map(toScene) }));
    } else skipped++;
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
      x: newOrigin.x + (pose.x - oldOrigin.x) * scaleX,
      y: newOrigin.y + (pose.y - oldOrigin.y) * scaleY,
      scaleX: pose.scaleX * scaleX,
      scaleY: pose.scaleY * scaleY,
      points:
        samePointCount && pose.points
          ? pose.points.map((point, index) => ({
              x: source.points[index].x + (point.x - prior.points[index].x),
              y: source.points[index].y + (point.y - prior.points[index].y)
            }))
          : undefined
    }))
  };
}

/** Reconcile the Canvas space into Motion while preserving poses and Motion-only artwork. */
export function syncMotionProject(map: CanvasDocument, existing?: Project): Project {
  const imported = importMap(map);
  const prior = new Map(existing?.drawings.map((drawing) => [drawing.id, drawing]));
  const canvasDrawings = imported.drawings.map((drawing) =>
    retainAnimation(drawing, prior.get(drawing.id))
  );
  const motionOnly =
    existing?.drawings.filter((drawing) => drawing.source?.space !== 'canvas') ?? [];
  const drawings = [
    ...canvasDrawings,
    ...motionOnly.filter(
      (drawing) => !prior.has(drawing.id) || !canvasDrawings.some(({ id }) => id === drawing.id)
    )
  ];
  if (!existing) return { ...newProject(), id: map.id, title: map.title, drawings };
  const candidate = { ...existing, id: map.id, drawings };
  return JSON.stringify(candidate) === JSON.stringify(existing)
    ? existing
    : { ...candidate, revision: existing.revision + 1 };
}
