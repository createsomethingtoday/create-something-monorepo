import { readFile, writeFile } from 'node:fs/promises';
const [bundlePath, outPath] = process.argv.slice(2);
if (!bundlePath || !outPath)
  throw new Error(
    'Usage: node scripts/create-animation-pilot.mjs <asset.draw-asset.json> <pilot.draw.json>'
  );
const { asset } = JSON.parse(await readFile(bundlePath, 'utf8'));
const pose = (time, x = 0, y = 0, extra = {}) => ({
  time,
  x,
  y,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
  reveal: 1,
  easing: 'ease',
  ...extra
});
const drawing = (id, kind, extra = {}) => ({
  id,
  name: id,
  kind,
  points: [],
  color: '#292522',
  weight: 4,
  text: '',
  width: 100,
  height: 100,
  poses: [pose(0)],
  ...extra
});
const caption = (id, text, start, end) =>
  drawing(id, 'text', {
    name: text,
    text,
    weight: 36,
    width: 1120,
    height: 100,
    poses: [
      pose(0, 80, 80, { opacity: start === 0 ? 1 : 0, easing: 'hold' }),
      ...(start ? [pose(start, 80, 80, { easing: 'hold' })] : []),
      ...(end < 20 ? [pose(end, 80, 80, { opacity: 0, easing: 'hold' })] : [])
    ]
  });
const project = {
  version: 'draw.animation.v1',
  id: 'draw-approval-pilot',
  revision: 0,
  title: 'A request, a decision, a receipt',
  width: 1280,
  height: 720,
  duration: 20,
  fps: 24,
  background: '#eee5d4',
  assets: [asset],
  drawings: [
    drawing('ground', 'stroke', {
      points: [
        { x: 80, y: 510 },
        { x: 1190, y: 510 }
      ],
      color: '#c8baa2',
      weight: 2
    }),
    drawing('approval-gate', 'stroke', {
      name: 'Approval gate · editable points',
      points: [
        { x: 0, y: 0 },
        { x: 0, y: -230 },
        { x: 0, y: -270 }
      ],
      poses: [
        pose(0, 700, 510, { easing: 'hold' }),
        pose(8, 700, 510, {
          points: [
            { x: 0, y: 0 },
            { x: 0, y: -230 },
            { x: 0, y: -270 }
          ]
        }),
        pose(10, 700, 510, {
          points: [
            { x: 0, y: 0 },
            { x: 200, y: -130 },
            { x: 250, y: -150 }
          ],
          easing: 'hold'
        })
      ]
    }),
    drawing('request', 'image', {
      name: 'Graphite request · Codex asset',
      assetId: asset.id,
      width: 180,
      height: 180,
      poses: [
        pose(0, 70, 327),
        pose(3, 460, 327, { easing: 'hold' }),
        pose(9, 460, 327),
        pose(13, 960, 327, { easing: 'hold' }),
        pose(20, 960, 327)
      ]
    }),
    drawing('approval', 'stroke', {
      name: 'Human approval mark',
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 22 },
        { x: 65, y: -35 }
      ],
      color: '#42745d',
      weight: 7,
      poses: [
        pose(0, 530, 245, { opacity: 0, reveal: 0, easing: 'hold' }),
        pose(7, 530, 245, { reveal: 0 }),
        pose(8, 530, 245, { reveal: 1, easing: 'hold' })
      ]
    }),
    drawing('receipt', 'stroke', {
      name: 'Receipt',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 120 },
        { x: 80, y: 110 },
        { x: 60, y: 120 },
        { x: 40, y: 110 },
        { x: 20, y: 120 },
        { x: 0, y: 110 },
        { x: 0, y: 0 }
      ],
      poses: [
        pose(0, 1000, 210, { opacity: 0, reveal: 0, easing: 'hold' }),
        pose(14, 1000, 210, { reveal: 0 }),
        pose(16, 1000, 210, { easing: 'hold' })
      ]
    }),
    caption('caption-1', 'A request arrives.', 0, 4),
    caption('caption-2', 'Some work waits for a person.', 4, 9),
    caption('caption-3', 'Approval lets the tool act.', 9, 14),
    caption('caption-4', 'Keep the receipt. Know what happened.', 14, 20),
    drawing('footer', 'text', {
      text: 'CREATE SOMETHING  /  HUMAN DECISION → TOOL ACTION → RECEIPT',
      color: '#796c59',
      weight: 16,
      width: 1120,
      height: 30,
      poses: [pose(0, 80, 620)]
    })
  ]
};
await writeFile(outPath, JSON.stringify(project));
console.log(outPath);
