/** Original Anatomy XRay application. A teaching model, not observed execution or measured geometry. */
export type Point = [number, number, number];
export type Camera = { zoom: number; x: number; y: number };
export type View = 'isometric' | 'front';
export type Part = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  kind: 'board' | 'core' | 'gate';
  detail: string;
  source: string;
};
export const parts: Part[] = [
  {
    id: 'contract',
    name: 'Contract',
    x: -60,
    y: -26,
    z: 238,
    w: 100,
    d: 52,
    h: 18,
    kind: 'board',
    detail:
      'Declares the goal, scope, inputs and required evidence. This document does not grant access.',
    source: 'OpenProse language; the existing lesson’s first part.'
  },
  {
    id: 'orchestration',
    name: 'Orchestration',
    x: 0,
    y: -40,
    z: 153,
    w: 76,
    d: 66,
    h: 56,
    kind: 'core',
    detail:
      'Makes responsibilities and handoffs explicit. A compatible harness supplies tools and execution.',
    source: 'OpenProse harness requirements; the existing lesson’s second part.'
  },
  {
    id: 'host',
    name: 'Host controls',
    x: -76,
    y: -2,
    z: 85,
    w: 126,
    d: 64,
    h: 37,
    kind: 'gate',
    detail:
      'Permissions, approval gates and checks belong in the host and connected tools. Markdown alone cannot enforce this boundary.',
    source: 'Harness requirements and our pinned-version limits; the existing lesson’s third part.'
  },
  {
    id: 'receipt',
    name: 'Receipt',
    x: -42,
    y: 9,
    z: 15,
    w: 98,
    d: 49,
    h: 22,
    kind: 'board',
    detail:
      'Records results, checks, blockers and the next action. It is not automatically signed or independent proof.',
    source: 'The existing lesson’s fourth part and illustrative launch brief.'
  }
];
export const handoffs = [
  ['contract', 'orchestration'],
  ['orchestration', 'host'],
  ['host', 'receipt']
] as const;
export const initialCamera: Camera = { zoom: 1, x: 0, y: 0 };
export const enclosure = { x: -96, y: -65, z: 0, w: 192, d: 134, h: 276 };
export function project([x, y, z]: Point, view: View): [number, number] {
  return view === 'front'
    ? [220 + x * 1.12, 422 - z * 1.12]
    : [220 + (x - y) * 0.97, 422 + ((x + y) * 0.5 - z) * 1.12];
}
export function screen(point: [number, number], camera: Camera): [number, number] {
  return [
    220 + (point[0] - 220) * camera.zoom + camera.x,
    260 + (point[1] - 260) * camera.zoom + camera.y
  ];
}
export function bounded(camera: Camera): Camera {
  const zoom = Math.min(4, Math.max(1, camera.zoom));
  const limit = 200 * (zoom - 1) + 60;
  return {
    zoom,
    x: Math.max(-limit, Math.min(limit, camera.x)),
    y: Math.max(-limit, Math.min(limit, camera.y))
  };
}
export function port(part: Part): Point {
  return [part.x + part.w / 2, part.y, part.z + part.h / 2];
}
export function route(from: string, to: string): Point[] {
  const start = port(parts.find((p) => p.id === from)!);
  const end = port(parts.find((p) => p.id === to)!);
  return [start, [start[0], -57, start[2]], [end[0], -57, end[2]], end];
}
export function box(a: Pick<Part, 'x' | 'y' | 'z' | 'w' | 'd' | 'h'>): Point[][] {
  const { x, y, z, w, d, h } = a;
  return [
    [
      [x, y, z + h],
      [x + w, y, z + h],
      [x + w, y + d, z + h],
      [x, y + d, z + h]
    ],
    [
      [x, y + d, z],
      [x + w, y + d, z],
      [x + w, y + d, z + h],
      [x, y + d, z + h]
    ],
    [
      [x + w, y, z],
      [x + w, y + d, z],
      [x + w, y + d, z + h],
      [x + w, y, z + h]
    ]
  ];
}
export function ring(z: number): Point[] {
  const { x, y, w, d } = enclosure,
    r = 16;
  return [
    [x + r, y, z],
    [x + w - r, y, z],
    [x + w, y + r, z],
    [x + w, y + d - r, z],
    [x + w - r, y + d, z],
    [x + r, y + d, z],
    [x, y + d - r, z],
    [x, y + r, z]
  ];
}
export function surfaces(a: Part): Point[][] {
  if (a.kind !== 'core') return box(a);
  const circle = (z: number): Point[] =>
    Array.from({ length: 20 }, (_, i) => [
      a.x + a.w / 2 + (Math.cos((i * Math.PI) / 10) * a.w) / 2,
      a.y + a.d / 2 + (Math.sin((i * Math.PI) / 10) * a.d) / 2,
      z
    ]);
  const low = circle(a.z),
    high = circle(a.z + a.h);
  return [high, ...low.map((p, i) => [p, low[(i + 1) % 20], high[(i + 1) % 20], high[i]])];
}
