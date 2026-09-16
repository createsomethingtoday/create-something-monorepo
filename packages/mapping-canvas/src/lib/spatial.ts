import type { Point } from './document';

export type PaddedSegment = { start: Point; end: Point; padding: number };

export function paddedSegmentBounds(segments: readonly PaddedSegment[]) {
  if (!segments.length) return undefined;
  let minX = Number.POSITIVE_INFINITY, maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY;
  for (const segment of segments) {
    minX = Math.min(minX, segment.start.x - segment.padding, segment.end.x - segment.padding);
    maxX = Math.max(maxX, segment.start.x + segment.padding, segment.end.x + segment.padding);
    minY = Math.min(minY, segment.start.y - segment.padding, segment.end.y - segment.padding);
    maxY = Math.max(maxY, segment.start.y + segment.padding, segment.end.y + segment.padding);
  }
  return { minX, maxX, minY, maxY };
}
