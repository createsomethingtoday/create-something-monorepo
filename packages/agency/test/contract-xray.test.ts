import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parts,
  handoffs,
  enclosure,
  project,
  route,
  port,
  bounded,
  screen,
  initialCamera,
  surfaces,
  type Point
} from '../src/lib/diagrams/contract-xray';

test('four-part lesson stays inside a coherent three-dimensional enclosure', () => {
  assert.deepEqual(
    parts.map((p) => p.id),
    ['contract', 'orchestration', 'host', 'receipt']
  );
  assert.equal(new Set(parts.map((p) => p.y)).size, 4);
  for (const part of parts)
    for (const face of surfaces(part))
      for (const [x, y, z] of face) {
        assert(x >= enclosure.x && x <= enclosure.x + enclosure.w);
        assert(y >= enclosure.y && y <= enclosure.y + enclosure.d);
        assert(z >= enclosure.z && z <= enclosure.z + enclosure.h);
        for (const view of ['isometric', 'front'] as const) {
          const [sx, sy] = project([x, y, z], view);
          assert(sx >= 0 && sx <= 440 && sy >= 0 && sy <= 520);
        }
      }
});

test('routed handoffs terminate on their actual assembly ports', () => {
  for (const [from, to] of handoffs) {
    const path = route(from, to);
    assert.deepEqual(path[0], port(parts.find((p) => p.id === from)!));
    assert.deepEqual(path.at(-1), port(parts.find((p) => p.id === to)!));
    assert.equal(path[1][1], -57);
    assert.equal(path[2][1], -57);
  }
});

test('navigation bounds, reset scale and selected-point projection are consistent', () => {
  assert.deepEqual(screen([220, 260], initialCamera), [220, 260]);
  assert.deepEqual(screen([240, 300], { zoom: 2, x: 10, y: -20 }), [270, 320]);
  assert.equal(bounded({ zoom: 20, x: 0, y: 0 }).zoom, 4);
  assert.equal(bounded({ zoom: 0.1, x: 0, y: 0 }).zoom, 1);
  assert.deepEqual(bounded({ zoom: 1, x: 1e6, y: -1e6 }), { zoom: 1, x: 60, y: -60 });
});

test('depth model overlaps in projection without conflating contract and host authority', () => {
  const bounds = parts.map((part) => {
    const pts = surfaces(part)
      .flat()
      .map((p: Point) => project(p, 'isometric'));
    return [
      Math.min(...pts.map((p) => p[0])),
      Math.min(...pts.map((p) => p[1])),
      Math.max(...pts.map((p) => p[0])),
      Math.max(...pts.map((p) => p[1]))
    ];
  });
  let overlaps = 0;
  for (let i = 0; i < bounds.length; i++)
    for (let j = i + 1; j < bounds.length; j++) {
      const a = bounds[i],
        b = bounds[j];
      if (a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]) overlaps++;
    }
  assert(overlaps > 0);
  assert.match(parts[0].detail, /does not grant access/);
  assert.match(parts[2].detail, /host and connected tools/);
  assert.match(parts[3].detail, /not automatically signed or independent proof/);
});
