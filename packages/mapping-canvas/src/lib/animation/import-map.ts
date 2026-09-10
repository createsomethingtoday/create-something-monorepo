import { type CanvasDocument, objectBounds } from '../document';
import { basePose, makeId, type Drawing } from './model';
/** Copy representable marks; never mutate the source map or its local storage. */
export function importMap(map: CanvasDocument): { drawings: Drawing[]; skipped: number } {
  const bounds = objectBounds(map.objects);
  const scale = Math.min(1, 1100 / bounds.width, 560 / bounds.height);
  let skipped = 0;
  const drawings: Drawing[] = [];
  for (const object of map.objects) {
    const common = {
      id: makeId(),
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
