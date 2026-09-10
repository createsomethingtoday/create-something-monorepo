import { describe, it, expect } from 'vitest';
import {
  newProject,
  basePose,
  validateProject,
  applyOperations,
  evaluateCamera,
  sceneToScreen,
  screenToScene,
  boiledPoints,
  variationIndex,
  type Drawing
} from './model';
const stroke: Drawing = {
  id: 'line',
  kind: 'stroke',
  name: 'Line',
  color: '#000000',
  weight: 3,
  text: '',
  width: 100,
  height: 100,
  points: [
    { x: 0, y: 0 },
    { x: 200, y: 80 }
  ],
  poses: [basePose()]
};
describe('motion contracts', () => {
  it('preserves legacy neutral camera and roundtrips moved camera coordinates', () => {
    const p = newProject();
    expect(sceneToScreen({ x: 12, y: 35 }, p, 2)).toEqual({ x: 12, y: 35 });
    p.camera = [
      { time: 0, x: 300, y: 200, zoom: 1, easing: 'linear' },
      { time: 4, x: 700, y: 400, zoom: 2, easing: 'hold' }
    ];
    expect(evaluateCamera(p, 2)).toMatchObject({ x: 500, y: 300, zoom: 1.5 });
    const screen = sceneToScreen({ x: 123, y: 456 }, p, 2);
    expect(screenToScene(screen, p, 2)).toEqual({ x: 123, y: 456 });
  });
  it('rejects unordered camera, unknown fields and unsafe zoom atomically', () => {
    const p = newProject();
    for (const poses of [
      [{ time: 0, x: 0, y: 0, zoom: 0, easing: 'linear' }],
      [
        { time: 4, x: 0, y: 0, zoom: 1, easing: 'linear' },
        { time: 2, x: 0, y: 0, zoom: 1, easing: 'linear' }
      ]
    ])
      expect(() =>
        applyOperations(p, [{ type: 'set_camera', poses: poses as never }], 0)
      ).toThrow();
    expect(p.camera).toBeUndefined();
    expect(p.revision).toBe(0);
  });
  it('holds camera until its next key', () => {
    const p = newProject();
    p.camera = [
      { time: 0, x: 300, y: 200, zoom: 1, easing: 'hold' },
      { time: 4, x: 700, y: 400, zoom: 2, easing: 'ease' }
    ];
    expect(evaluateCamera(p, 3).x).toBe(300);
    expect(evaluateCamera(p, 4).x).toBe(700);
  });
  it('redraws deterministically on held cadence and anchors connectors', () => {
    const b = { amplitude: 2, fps: 8, seed: 17 };
    const a = boiledPoints(stroke.points, b, 1);
    expect(a).toEqual(boiledPoints(stroke.points, b, 1.1));
    expect(a).not.toEqual(boiledPoints(stroke.points, b, 1.2));
    expect(a).toEqual(boiledPoints(stroke.points, b, 1));
    expect(a[0]).toEqual(stroke.points[0]);
    expect(a.at(-1)).toEqual(stroke.points.at(-1));
    expect(stroke.points).toHaveLength(2);
  });
  it('redraws dense pencil samples and built-in circles while retaining endpoints', () => {
    const pencil = Array.from({ length: 40 }, (_, i) => ({ x: i * 3.1, y: 0 }));
    const circle = Array.from({ length: 49 }, (_, i) => ({
      x: Math.cos((i / 48) * Math.PI * 2) * 55,
      y: Math.sin((i / 48) * Math.PI * 2) * 55
    }));
    for (const points of [pencil, circle]) {
      const original = structuredClone(points);
      const a = boiledPoints(points, { amplitude: 2, fps: 8, seed: 1 }, 0);
      const b = boiledPoints(points, { amplitude: 2, fps: 8, seed: 1 }, 0.125);
      expect(a).not.toEqual(b);
      expect(a[0]).toEqual(points[0]);
      expect(a.at(-1)).toEqual(points.at(-1));
      expect(points).toEqual(original);
    }
  });
  it('bounds resampling for long paths', () => {
    const pts = Array.from({ length: 1000 }, (_, i) => ({ x: i % 2 ? 10000 : -10000, y: i }));
    expect(boiledPoints(pts, { amplitude: 5, fps: 12, seed: 1 }, 1).length).toBeLessThanOrEqual(
      3001
    );
  });
  it('cycles exact variation cells without extra image calls', () => {
    const f = { columns: 3, rows: 1, frames: 3, fps: 8, seed: 0, registration: 'alpha' as const };
    expect([0, 0.125, 0.25, 0.375].map((t) => variationIndex(f, t))).toEqual([0, 1, 2, 0]);
  });
  it('validates variation geometry and rejects boil on raster drawings', () => {
    const p = newProject();
    p.drawings = [{ ...stroke, boil: { amplitude: 2, fps: 8, seed: 3 } }];
    validateProject(p);
    p.drawings[0].flipbook = {
      columns: 3,
      rows: 1,
      frames: 4,
      fps: 8,
      seed: 0,
      registration: 'alpha'
    };
    expect(() => validateProject(p)).toThrow();
  });
});
