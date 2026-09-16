import { readFile, writeFile } from 'node:fs/promises';
const [bundlePath, outPath, mode] = process.argv.slice(2);
const redraw = mode === '--redraw-sheet';
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
    space: 'screen',
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
      name: 'Approval gate · hinged barrier',
      weight: 7,
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 115 },
        { x: 0, y: 230 }
      ],
      poses: [
        pose(0, 700, 280, { easing: 'hold' }),
        pose(8, 700, 280),
        pose(9.5, 700, 280, { rotation: -90, easing: 'hold' }),
        pose(14, 700, 280, { rotation: -90 }),
        pose(15.5, 700, 280, { easing: 'hold' })
      ]
    }),
    drawing('approval-hinge', 'stroke', {
      name: 'Gate hinge',
      weight: 4,
      points: Array.from({ length: 25 }, (_, i) => ({
        x: Math.cos((i / 24) * Math.PI * 2) * 8,
        y: Math.sin((i / 24) * Math.PI * 2) * 8
      })),
      poses: [pose(0, 700, 280)]
    }),
    drawing('request', 'image', {
      name: 'Graphite request · Codex asset',
      assetId: asset.id,
      width: 180,
      height: 180,
      poses: [
        pose(0, 70, 327),
        pose(3, 460, 327, { easing: 'hold' }),
        pose(10, 460, 327),
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
      space: 'screen',
      text: 'CREATE SOMETHING  /  HUMAN DECISION → TOOL ACTION → RECEIPT',
      color: '#796c59',
      weight: 16,
      width: 1120,
      height: 30,
      poses: [pose(0, 80, 620)]
    })
  ]
};
if (redraw) {
  project.camera = [
    { time: 0, x: 340, y: 360, zoom: 1.25, easing: 'ease' },
    { time: 3, x: 500, y: 360, zoom: 1.2, easing: 'hold' },
    { time: 7, x: 500, y: 360, zoom: 1.2, easing: 'ease' },
    { time: 9.5, x: 640, y: 360, zoom: 1.25, easing: 'hold' },
    { time: 10, x: 640, y: 360, zoom: 1.25, easing: 'ease' },
    { time: 13, x: 900, y: 360, zoom: 1.25, easing: 'hold' },
    { time: 16.5, x: 900, y: 360, zoom: 1.25, easing: 'ease' },
    { time: 19, x: 640, y: 360, zoom: 1, easing: 'hold' }
  ];
  const request = project.drawings.find((d) => d.id === 'request');
  request.width = 150;
  request.height = 150;
  request.flipbook = { columns: 3, rows: 1, frames: 3, fps: 8, seed: 0, registration: 'alpha' };
  request.poses = request.poses.map((k) => ({ ...k, x: k.x + 15, y: 360 }));
  const receipt = project.drawings.find((d) => d.id === 'receipt');
  receipt.poses = [
    pose(0, 1000, 185, { opacity: 0, reveal: 0, easing: 'hold' }),
    pose(14.8, 1000, 185, { reveal: 0 }),
    pose(16.2, 1000, 185, { easing: 'hold' })
  ];
  project.drawings.splice(
    1,
    0,
    drawing('request-approval-link', 'stroke', {
      name: 'Line grows toward approval',
      color: '#8d806c',
      weight: 2.5,
      points: [
        { x: 550, y: 360 },
        { x: 550, y: 305 },
        { x: 700, y: 305 },
        { x: 700, y: 280 }
      ],
      poses: [
        pose(0, 0, 0, { opacity: 0, reveal: 0, easing: 'hold' }),
        pose(4, 0, 0, { reveal: 0, easing: 'linear' }),
        pose(6.8, 0, 0, { easing: 'hold' }),
        pose(10, 0, 0, { opacity: 0, easing: 'hold' })
      ]
    }),
    drawing('work-receipt-link', 'stroke', {
      name: 'Line grows into receipt',
      color: '#8d806c',
      weight: 2.5,
      points: [
        { x: 1050, y: 360 },
        { x: 1050, y: 305 }
      ],
      poses: [
        pose(0, 0, 0, { opacity: 0, reveal: 0, easing: 'hold' }),
        pose(13.5, 0, 0, { reveal: 0, easing: 'linear' }),
        pose(14.8, 0, 0, { easing: 'hold' })
      ]
    })
  );
  for (let i = 0; i < project.drawings.length; i++)
    if (project.drawings[i].kind === 'stroke')
      project.drawings[i].boil = {
        amplitude: project.drawings[i].id === 'ground' ? 0.35 : 1.2,
        fps: 8,
        seed: i + 1
      };
}
await writeFile(outPath, JSON.stringify(project));
console.log(outPath);
