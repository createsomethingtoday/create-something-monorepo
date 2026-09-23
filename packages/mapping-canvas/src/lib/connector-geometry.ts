import { arrowHeadPoints } from './arrow-geometry';
import { createObjectCenterResolver, type CanvasObject, type Connector, type Point } from './document';

/** Shared node attachment geometry for the canvas, snapshots, exports and tool labels. */
export function createConnectorResolver(objects: CanvasObject[], center = createObjectCenterResolver(objects)) {
  const index = new Map(objects.map(object => [object.id, object]));
  const boundary = (object: CanvasObject, toward: Point): Point => {
    const origin = center(object);
    let halfWidth: number, halfHeight: number;
    if (object.kind === 'note' || object.kind === 'group') {
      halfWidth = object.width / 2; halfHeight = object.height / 2;
    } else if (object.kind === 'rectangle' || object.kind === 'ellipse') {
      halfWidth = Math.abs(object.to.x - object.from.x) / 2;
      halfHeight = Math.abs(object.to.y - object.from.y) / 2;
    } else return origin; // Ink, free arrows and connector junctions have no node body.
    if (!halfWidth || !halfHeight) return origin;
    const angle = (object.rotation ?? 0) * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
    const dx = toward.x - origin.x, dy = toward.y - origin.y;
    const localX = cos * dx + sin * dy, localY = -sin * dx + cos * dy;
    if (!dx && !dy) return origin;
    const scale = object.kind === 'ellipse'
      ? 1 / Math.hypot(localX / halfWidth, localY / halfHeight)
      : Math.min(localX ? halfWidth / Math.abs(localX) : Infinity, localY ? halfHeight / Math.abs(localY) : Infinity);
    return { x: origin.x + dx * scale, y: origin.y + dy * scale };
  };
  return (connector: Connector): { a: Point; b: Point } | undefined => {
    const from = index.get(connector.fromId), to = index.get(connector.toId);
    if (!from || !to) return undefined;
    const first = center(from), last = center(to), dx = last.x - first.x, dy = last.y - first.y;
    const distance = Math.hypot(dx, dy);
    if (!distance) return undefined;
    const unit = { x: dx / distance, y: dy / distance };
    const start = boundary(from, last), end = boundary(to, first);
    // Keep the marker tip (2 units beyond the endpoint) outside the node border.
    const clearance = (object: CanvasObject) => ['note', 'group', 'rectangle', 'ellipse'].includes(object.kind) ? 4 : 0;
    const a = { x: start.x + unit.x * clearance(from), y: start.y + unit.y * clearance(from) };
    const b = { x: end.x - unit.x * clearance(to), y: end.y - unit.y * clearance(to) };
    // Overlapping/touching nodes have no exterior route; never draw a reversed arrow through them.
    if ((b.x - a.x) * unit.x + (b.y - a.y) * unit.y <= 0) return undefined;
    return { a, b };
  };
}

export const connectorHeadScale = (a: Point, b: Point) => Math.min(1, Math.hypot(b.x - a.x, b.y - a.y) / 20);
export const connectorHeadPoints = (a: Point, b: Point) => arrowHeadPoints(a, b, connectorHeadScale(a, b));
