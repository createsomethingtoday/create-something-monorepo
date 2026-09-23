import { describe, expect, it } from 'vitest';
import { connectorLabelLayout } from './webmcp';
import type { CanvasObject } from './document';

describe('node boundary connector geometry', () => {
  it('places the connector label in the gap between unequal nodes', () => {
    const objects: CanvasObject[] = [
      { id: 'a', kind: 'note', createdAt: 'now', x: 0, y: 0, width: 100, height: 100, text: 'A' },
      { id: 'b', kind: 'note', createdAt: 'now', x: 0, y: 300, width: 100, height: 200, text: 'B' },
      { id: 'edge', kind: 'connector', createdAt: 'now', fromId: 'a', toId: 'b', label: 'Next' }
    ];
    expect(connectorLabelLayout(objects).get('edge')).toMatchObject({ x: 50, y: 190 });
  });
});

import { createConnectorResolver, connectorHeadPoints } from './connector-geometry';
import { arrowHeadPoints } from './arrow-geometry';
import type { Connector, Note, Shape } from './document';
const note = (id: string, x: number, y: number, width = 100, height = 100): Note => ({ id, kind: 'note', createdAt: 'now', x, y, width, height, text: id });
const edge: Connector = { id: 'edge', kind: 'connector', createdAt: 'now', fromId: 'a', toId: 'b', label: '' };
it('clips vertical and horizontal connectors, including the arrowhead, outside the nodes', () => {
  const vertical = createConnectorResolver([note('a', 0, 0), note('b', 0, 300)])(edge)!;
  expect(vertical).toEqual({ a: { x: 50, y: 104 }, b: { x: 50, y: 296 } });
  expect(arrowHeadPoints(vertical.a, vertical.b).every(point => point.y < 300 && point.y > 100)).toBe(true);
  const horizontal = createConnectorResolver([note('a', 0, 0), note('b', 300, 0)])(edge)!;
  expect(horizontal).toEqual({ a: { x: 104, y: 50 }, b: { x: 296, y: 50 } });
});
it('recalculates attachments from moved and resized nodes without changing connector data', () => {
  const a = note('a', 0, 0), b = note('b', 0, 300);
  const before = createConnectorResolver([a, b])(edge)!;
  const after = createConnectorResolver([{ ...a, height: 160 }, { ...b, y: 400 }])(edge)!;
  expect(before.a.y).toBe(104); expect(after.a.y).toBe(164); expect(after.b.y).toBe(396);
  expect(edge).not.toHaveProperty('from');
});
it('uses the rotated rectangle boundary rather than its unrotated box', () => {
  const a = { ...note('a', 0, 0, 200, 100), rotation: 90 };
  const route = createConnectorResolver([a, note('b', 0, 400, 200, 100)])(edge)!;
  expect(route.a.x).toBeCloseTo(100); expect(route.a.y).toBeCloseTo(154);
});
it('uses the ellipse outline for diagonal connections', () => {
  const a: Shape = { id: 'a', kind: 'ellipse', createdAt: 'now', from: { x: 0, y: 0 }, to: { x: 200, y: 100 }, color: '#ffffff' };
  const route = createConnectorResolver([a, note('b', 300, 300)])(edge)!;
  const dx = 350 - 100, dy = 350 - 50, length = Math.hypot(dx, dy);
  const boundary = { x: route.a.x - 4 * dx / length, y: route.a.y - 4 * dy / length };
  const normalized = ((boundary.x - 100) / 100) ** 2 + ((boundary.y - 50) / 50) ** 2;
  expect(normalized).toBeGreaterThan(1); expect(normalized).toBeLessThan(1.1);
});
it('does not draw reversed or oversized arrowheads through overlapping nodes', () => {
  for (const y of [0, 50, 100]) expect(createConnectorResolver([note('a', 0, 0), note('b', 0, y)])(edge)).toBeUndefined();
  expect(createConnectorResolver([note('a', 0, 0)])(edge)).toBeUndefined();
});

it('shrinks the arrowhead to fit a narrow gap', () => {
  const route = createConnectorResolver([note('a', 0, 0), note('b', 0, 110)])(edge)!;
  expect(connectorHeadPoints(route.a, route.b).every(point => point.y > 100 && point.y < 110)).toBe(true);
});

it('preserves short connections between ink strokes without node clearance', () => {
  const stroke = (id: string, x: number): CanvasObject => ({ id, kind: 'stroke', createdAt: 'now', color: '#ffffff', width: 1, points: [{ x, y: 0 }, { x, y: 1 }] });
  expect(createConnectorResolver([stroke('a', 0), stroke('b', 4)])(edge)).toEqual({ a: { x: 0, y: 1 }, b: { x: 4, y: 1 } });
});

it('clears the painted outline of thick rectangles and ellipses', () => {
  for (const kind of ['rectangle', 'ellipse'] as const) {
    const a: Shape = { id: 'a', kind, createdAt: 'now', from: { x: 0, y: 0 }, to: { x: 100, y: 100 }, color: '#ffffff', strokeWidth: 100 };
    const route = createConnectorResolver([a, note('b', 0, 400)])(edge)!;
    expect(route.a.y).toBeCloseTo(154);
    expect(connectorHeadPoints(route.a, route.b).every(point => point.y < 400)).toBe(true);
  }
});
it('clears thick borders at shallow angles and after rotation', () => {
  const a: Shape = { id: 'a', kind: 'rectangle', createdAt: 'now', from: { x: 0, y: 0 }, to: { x: 20, y: 1000 }, color: '#ffffff', strokeWidth: 100, rotation: 90 };
  const route = createConnectorResolver([a, note('b', 1000, 550)])(edge)!;
  const localY = -(route.a.x - 10);
  expect(Math.abs(localY)).toBeGreaterThan(550);
});

it('attaches dependent connectors to the visible shaft midpoint', () => {
  const dependency = { ...edge, id: 'dependent', fromId: edge.id, toId: 'c' };
  const resolve = createConnectorResolver([note('a', 0, 0, 1000), note('b', 1200, 0), note('c', 1050, 300), edge, dependency]);
  expect(resolve(dependency)?.a).toEqual({ x: 1100, y: 50 });
});
it('propagates missing and suppressed routes to dependent connectors', () => {
  const dependency = { ...edge, id: 'dependent', fromId: edge.id, toId: 'c' };
  expect(createConnectorResolver([note('a', 0, 0), note('b', 0, 0), note('c', 0, 300), edge])(dependency)).toBeUndefined();
  expect(createConnectorResolver([note('a', 0, 0), note('c', 0, 300), edge])(dependency)).toBeUndefined();
});
it('resolves deep dependent connector graphs without recursive stack growth', () => {
  const objects: CanvasObject[] = [note('a', 0, 0), note('b', 0, 400), edge];
  for (let i = 0; i < 20000; i++) objects.push({ ...edge, id: `edge-${i}`, fromId: objects.at(-1)!.id });
  expect(() => createConnectorResolver(objects)(objects.at(-1) as Connector)).not.toThrow();
});

it('keeps arrowhead wings outside a node on a shallow approach', () => {
  const target: Shape = { id: 'b', kind: 'rectangle', createdAt: 'now', from: { x: 0, y: 0 }, to: { x: 20, y: 1000 }, color: '#ffffff', strokeWidth: 2 };
  const route = createConnectorResolver([note('a', 50, 1000), target])(edge)!;
  expect(connectorHeadPoints(route.a, route.b).every(point => point.x > 21)).toBe(true);
});

it('keeps a visible route when a ray exits a tall rectangle near its corner', () => {
  const a: Shape = { id: 'a', kind: 'rectangle', createdAt: 'now', from: { x: -10, y: -500 }, to: { x: 10, y: 500 }, color: '#ffffff', strokeWidth: 2 };
  const b: Shape = { ...a, id: 'b', from: { x: 10.4, y: 520 }, to: { x: 30.4, y: 1520 } };
  const route = createConnectorResolver([a, b])(edge)!;
  expect(route).toBeDefined();
  expect(route.a.y).toBeGreaterThan(501);
  expect(route.b.y).toBeLessThan(519);
  expect(route.b.y).toBeGreaterThan(route.a.y);
  expect(connectorHeadPoints(route.a, route.b).every(point => point.y > 501 && point.y < 519)).toBe(true);
});
