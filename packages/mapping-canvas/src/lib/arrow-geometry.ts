import type { Point } from './document';

/** Fixed user-space arrowhead, matching the 20 by 14 SVG marker with ref (18, 7). */
export function arrowHeadPoints(from: Point, to: Point, scale = 1): Point[] {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const unit = distance ? { x: (to.x - from.x) / distance, y: (to.y - from.y) / distance } : { x: 1, y: 0 };
  const normal = { x: -unit.y, y: unit.x };
  return [
    { x: to.x + unit.x * 2 * scale, y: to.y + unit.y * 2 * scale },
    { x: to.x - unit.x * 18 * scale + normal.x * 7 * scale, y: to.y - unit.y * 18 * scale + normal.y * 7 * scale },
    { x: to.x - unit.x * 18 * scale - normal.x * 7 * scale, y: to.y - unit.y * 18 * scale - normal.y * 7 * scale }
  ];
}
