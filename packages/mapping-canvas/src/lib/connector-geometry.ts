import { arrowHeadPoints } from './arrow-geometry';
import { createObjectCenterResolver, type CanvasObject, type Connector, type Point } from './document';

/** Shared node attachment geometry for the canvas, snapshots, exports and tool labels. */
export function createConnectorResolver(objects: CanvasObject[], center = createObjectCenterResolver(objects)) {
  const index = new Map(objects.map(object => [object.id, object]));
  type Route = { a: Point; b: Point };
  const routes = new Map<string, Route | undefined>();
  const endpointCenter = (object: CanvasObject): Point | undefined => {
    if (object.kind !== 'connector') return center(object);
    const route = routes.get(object.id);
    return route ? { x: (route.a.x + route.b.x) / 2, y: (route.a.y + route.b.y) / 2 } : undefined;
  };
  const boundary = (object: CanvasObject, origin: Point, toward: Point): { point: Point; clearance: number; headLateral: number } => {
    let halfWidth: number, halfHeight: number;
    if (object.kind === 'note' || object.kind === 'group') {
      halfWidth = object.width / 2; halfHeight = object.height / 2;
    } else if (object.kind === 'rectangle' || object.kind === 'ellipse') {
      halfWidth = Math.abs(object.to.x - object.from.x) / 2;
      halfHeight = Math.abs(object.to.y - object.from.y) / 2;
    } else return { point: origin, clearance: 0, headLateral: 0 }; // Point-like objects have no node body.
    if (!halfWidth || !halfHeight) return { point: origin, clearance: 0, headLateral: 0 };
    const angle = (object.rotation ?? 0) * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
    const dx = toward.x - origin.x, dy = toward.y - origin.y;
    const localX = cos * dx + sin * dy, localY = -sin * dx + cos * dy;
    if (!dx && !dy) return { point: origin, clearance: 0, headLateral: 0 };
    const strokeRadius = object.kind === 'rectangle' || object.kind === 'ellipse' ? (object.strokeWidth || 2) / 2 : 0;
    const extentX = halfWidth + strokeRadius, extentY = halfHeight + strokeRadius;
    const scale = object.kind === 'ellipse'
      ? 1 / Math.hypot(localX / halfWidth, localY / halfHeight)
      : Math.min(localX ? extentX / Math.abs(localX) : Infinity, localY ? extentY / Math.abs(localY) : Infinity);
    const distance = Math.hypot(dx, dy);
    const normal = object.kind === 'ellipse'
      ? { x: localX * scale / (halfWidth * halfWidth), y: localY * scale / (halfHeight * halfHeight) }
      : Math.abs(localX) / extentX >= Math.abs(localY) / extentY
        ? { x: Math.sign(localX), y: 0 } : { x: 0, y: Math.sign(localY) };
    const incidence = (normal.x * localX + normal.y * localY) / (Math.hypot(normal.x, normal.y) * distance);
    // Rectangles use the first exit from their painted box, including adjacent corner faces.
    // Ellipses use the outward stroke support plane.
    return { point: { x: origin.x + dx * scale, y: origin.y + dy * scale }, clearance: 4 + (object.kind === 'ellipse' ? strokeRadius / incidence : 0), headLateral: 7 * Math.sqrt(Math.max(0, 1 - incidence * incidence)) / incidence - 18 };
  };
  const calculate = (connector: Connector): Route | undefined => {
    const from = index.get(connector.fromId), to = index.get(connector.toId);
    if (!from || !to) return undefined;
    const first = endpointCenter(from), last = endpointCenter(to);
    if (!first || !last) return undefined;
    const dx = last.x - first.x, dy = last.y - first.y;
    const distance = Math.hypot(dx, dy);
    if (!distance) return undefined;
    const unit = { x: dx / distance, y: dy / distance };
    const start = boundary(from, first, last), end = boundary(to, last, first);
    // Keep the marker tip (2 units beyond the endpoint) outside the node border.
    const a = { x: start.point.x + unit.x * start.clearance, y: start.point.y + unit.y * start.clearance };
    const b = { x: end.point.x - unit.x * end.clearance, y: end.point.y - unit.y * end.clearance };
    const gap = (b.x - a.x) * unit.x + (b.y - a.y) * unit.y;
    // At shallow angles the triangle's wing can reach farther into a node than its tip.
    // Solve clearance together with the scaled head length so short routes remain visible.
    if (gap > 0 && end.headLateral > 3) {
      const full = end.headLateral - 3;
      const extra = gap - full >= 20 ? full : Math.max(0, (end.headLateral * gap - 60) / (20 + end.headLateral));
      b.x -= unit.x * extra; b.y -= unit.y * extra;
    }
    // Overlapping/touching nodes have no exterior route; never draw a reversed arrow through them.
    if ((b.x - a.x) * unit.x + (b.y - a.y) * unit.y <= 0) return undefined;
    return { a, b };
  };
  return (connector: Connector): Route | undefined => {
    const pending = new Set<string>(), stack: Array<[Connector, boolean]> = [[connector, false]];
    while (stack.length) {
      const [current, expanded] = stack.pop()!;
      if (routes.has(current.id)) continue;
      if (expanded) { pending.delete(current.id); routes.set(current.id, calculate(current)); continue; }
      if (pending.has(current.id)) { routes.set(current.id, undefined); continue; }
      pending.add(current.id); stack.push([current, true]);
      for (const id of [current.toId, current.fromId]) {
        const dependency = index.get(id);
        if (dependency?.kind === 'connector' && !routes.has(id)) stack.push([dependency, false]);
      }
    }
    return routes.get(connector.id);
  };
}

export const connectorHeadScale = (a: Point, b: Point) => Math.min(1, Math.hypot(b.x - a.x, b.y - a.y) / 20);
export const connectorHeadPoints = (a: Point, b: Point) => arrowHeadPoints(a, b, connectorHeadScale(a, b));
