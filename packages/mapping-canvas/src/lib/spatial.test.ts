import { describe, expect, it } from 'vitest';
import { paddedSegmentBounds } from './spatial';

describe('painted spatial index', () => {
  it('bounds a 200,000-segment imported stroke without spreading an unbounded array', () => {
    const segments = Array.from({ length: 200_000 }, (_, index) => ({
      start: { x: index, y: -index }, end: { x: index + 1, y: 1 - index }, padding: 3
    }));
    expect(paddedSegmentBounds(segments)).toEqual({ minX: -3, maxX: 200_003, minY: -200_002, maxY: 4 });
  });
});
