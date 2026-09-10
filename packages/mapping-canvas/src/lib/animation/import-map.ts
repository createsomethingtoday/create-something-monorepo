import { type CanvasDocument, objectBounds } from '../document';
import { basePose, newProject, type Drawing, type Project } from './model';

/** Materialize representable Canvas marks in Motion without changing their identity. */
export function importMap(map: CanvasDocument): { drawings: Drawing[]; skipped: number } {
  const bounds = objectBounds(map.objects);
  const scale = Math.min(1, 1100 / bounds.width, 560 / bounds.height);
  let skipped = 0;
  const drawings: Drawing[] = [];
  for (const object of map.objects) {
    const common = {
      id: object.id,
      source: { space: 'canvas' as const, objectId: object.id },
      name: object.kind === 'note' ? object.text.slice(0, 80) : object.kind,
      kind: 'stroke' as const,
      color: 'color' in object && /^#[\da-f]{6}$/i.test(object.color) ? object.color : '#282522',
      weight: 3,
      text: '',
      width: 100,
      height: 100,
      poses: [
        {
          ...basePose(),
          x: 60 - bounds.x * scale,
          y: 60 - bounds.y * scale,
          scaleX: scale,
          scaleY: scale
        }
      ]
    };
    if (object.kind === 'stroke')
      drawings.push({ ...common, points: object.points, weight: object.width });
    else if (object.kind === 'note')
      drawings.push({
        ...common,
        kind: 'text',
        points: [],
        text: object.text,
        color: '#282522',
        weight: 24,
        width: object.width,
        height: object.height,
        poses: [
          {
            ...common.poses[0],
            x: 60 + (object.x - bounds.x) * scale,
            y: 60 + (object.y - bounds.y) * scale
          }
        ]
      });
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
      drawings.push({ ...common, points });
    } else skipped++;
  }
  return { drawings, skipped };
}

function retainAnimation(source: Drawing, prior: Drawing | undefined): Drawing {
  if (!prior || prior.source?.space !== 'canvas') return source;
  const samePointCount = prior.points.length === source.points.length;
  return {
    ...source,
    space: prior.space,
    boil: source.kind === 'stroke' ? prior.boil : undefined,
    poses: prior.poses.map((pose) => ({
      ...pose,
      points: samePointCount ? pose.points : undefined
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
  const candidate = { ...existing, id: map.id, title: map.title, drawings };
  return JSON.stringify(candidate) === JSON.stringify(existing)
    ? existing
    : { ...candidate, revision: existing.revision + 1 };
}
