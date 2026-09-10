import { describe, it, expect } from 'vitest';
import {
  newProject,
  basePose,
  evaluate,
  applyOperations,
  validateProject,
  timing,
  parseProject,
  type Drawing
} from './model';
const drawing = (): Drawing => ({
  id: 'line',
  name: 'Line',
  kind: 'stroke',
  points: [
    { x: 0, y: 0 },
    { x: 100, y: 0 }
  ],
  color: '#222222',
  weight: 3,
  text: '',
  width: 100,
  height: 100,
  poses: [
    { ...basePose(), easing: 'linear' },
    {
      ...basePose(2),
      x: 100,
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      ]
    }
  ]
});
describe('animation contract', () => {
  it('interpolates corresponding points and independent transforms, preserving endpoints', () => {
    const d = drawing();
    expect(evaluate(d, 1).x).toBe(50);
    expect(evaluate(d, 1).points[1].y).toBe(50);
    expect(evaluate(d, 2).points[1].y).toBe(100);
    expect(evaluate(d, 99).x).toBe(100);
    expect(d.points[1].y).toBe(0);
  });
  it('holds until the next exact key, then switches', () => {
    const d = drawing();
    d.poses[0].easing = 'hold';
    expect(evaluate(d, 1.99).x).toBe(0);
    expect(evaluate(d, 2).x).toBe(100);
  });
  it('solves symmetric cubic timing and stays monotonic', () => {
    expect(timing(0.5, 'ease')).toBeCloseTo(0.5, 6);
    expect(timing(0.25, 'ease')).toBeLessThan(0.25);
    let prev = 0;
    for (let i = 0; i <= 100; i++) {
      const v = timing(i / 100, 'ease');
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
  it('rejects point count changes, duplicate times and missing image references', () => {
    const p = newProject();
    p.drawings = [drawing()];
    validateProject(p);
    p.drawings[0].poses[1].points = [];
    expect(() => validateProject(p)).toThrow();
    p.drawings = [drawing()];
    p.drawings[0].poses[1].time = 0;
    expect(() => validateProject(p)).toThrow();
    p.drawings = [{ ...drawing(), kind: 'image', assetId: 'absent' }];
    expect(() => validateProject(p)).toThrow();
  });
  it('rejects stale edits atomically and keeps original project unchanged', () => {
    const p = newProject();
    p.drawings = [drawing()];
    expect(() =>
      applyOperations(p, [{ type: 'put_pose', id: 'line', pose: basePose(1) }], 9)
    ).toThrow('Stale');
    expect(() =>
      applyOperations(
        p,
        [
          { type: 'settings', title: 'Changed' },
          { type: 'settings', duration: 0.5 }
        ],
        0
      )
    ).toThrow();
    expect(p.title).toBe('Untitled animation');
  });
  it('round trips an edited pose and rejects deleting the last pose', () => {
    const p = newProject();
    p.drawings = [drawing()];
    const q = applyOperations(
      p,
      [{ type: 'put_pose', id: 'line', pose: { ...basePose(1), y: 70 } }],
      0
    );
    expect(parseProject(JSON.stringify(q))).toEqual(q);
    expect(q.drawings[0].poses.map((k) => k.time)).toEqual([0, 1, 2]);
    const single = { ...p, drawings: [{ ...drawing(), poses: [basePose()] }] };
    expect(() =>
      applyOperations(single, [{ type: 'remove_pose', id: 'line', time: 0 }], 0)
    ).toThrow();
  });
  it('keeps Canvas-backed drawings owned by the Canvas space', () => {
    const p = newProject();
    p.drawings = [
      {
        ...drawing(),
        source: {
          space: 'canvas',
          objectId: 'line',
          origin: { x: 0, y: 0, scaleX: 1, scaleY: 1 }
        }
      }
    ];
    expect(() => applyOperations(p, [{ type: 'remove_drawing', id: 'line' }], 0)).toThrow(
      'Remove it in Canvas'
    );
    expect(() =>
      applyOperations(
        p,
        [
          { type: 'put_drawing', drawing: { ...p.drawings[0], source: undefined } },
          { type: 'remove_drawing', id: 'line' }
        ],
        0
      )
    ).toThrow('Canvas provenance');
    expect(() =>
      applyOperations(
        newProject(),
        [
          {
            type: 'put_drawing',
            drawing: {
              ...drawing(),
              source: { space: 'canvas', objectId: 'line', origin: { x: 0, y: 0, scaleX: 1, scaleY: 1 } }
            }
          }
        ],
        0
      )
    ).toThrow('Canvas provenance');
    expect(p.drawings).toHaveLength(1);
  });
  it('accepts unchanged Canvas provenance regardless of object key order', () => {
    const p = newProject();
    p.drawings = [{ ...drawing(), source: { space: 'canvas', objectId: 'line', origin: { x: 0, y: 0, scaleX: 1, scaleY: 1 } } }];
    const updated = applyOperations(p, [{
      type: 'put_drawing',
      drawing: {
        ...p.drawings[0],
        color: '#ff0000',
        source: { objectId: 'line', origin: { scaleY: 1, scaleX: 1, y: 0, x: 0 }, space: 'canvas' }
      }
    }], 0);
    expect(updated.drawings[0].color).toBe('#ff0000');
  });
  it('rejects external image URLs and nonfinite coordinates', () => {
    const p = newProject();
    p.assets = [
      { id: 'asset', name: 'Image', width: 10, height: 10, data: 'https://example.com/a.png' }
    ];
    expect(() => validateProject(p)).toThrow();
    p.assets = [];
    p.drawings = [drawing()];
    p.drawings[0].poses[0].x = NaN;
    expect(() => validateProject(p)).toThrow();
  });
});
