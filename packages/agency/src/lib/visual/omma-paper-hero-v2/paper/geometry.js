// @ts-nocheck -- Omma v2 runtime mirror with reviewed face-winding correction.
// Paper geometry builders. Every sheet is real thickness with distinct face
// and edge material groups so laminated cut edges read at desktop scale.

import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Shape,
  ExtrudeGeometry
} from 'three';

// Material group order for BoxGeometry: +X, -X, +Y, -Y, +Z, -Z
// We want faces (top/bottom = +Y/-Y) on the face material and the four
// perimeter sides on the edge material.
export const BOX_MATERIAL_ORDER = ['edge', 'edge', 'face', 'face', 'edge', 'edge'];

export function createSheetGeometry(w, t, d, segW = 1, segD = 1) {
  const g = new BoxGeometry(w, t, d, segW, 1, segD);
  return g;
}

// A sheet with a controlled fold: the panel is split at foldX and the far
// panel rotates up around the score line. Built as a single buffer so the
// score relief (a shallow valley) stays continuous across the crease.
export function createFoldedSheetGeometry({
  width = 1,
  depth = 1,
  thickness = 0.006,
  foldRatio = 0.62,
  foldAngle = 0.42,
  scoreWidth = 0.018,
  segmentsAlong = 96,
  segmentsAcross = 8
}) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const foldX = -width / 2 + width * foldRatio;
  const half = thickness / 2;

  // Path along X: flat up to score, valley through score, rotated after.
  function pathPoint(x) {
    if (x <= foldX - scoreWidth / 2) {
      return { x, y: 0, ang: 0, score: 0 };
    }
    if (x >= foldX + scoreWidth / 2) {
      const l = x - (foldX + scoreWidth / 2);
      const baseX = foldX + scoreWidth / 2;
      return {
        x: baseX + Math.cos(foldAngle) * l,
        y: Math.sin(foldAngle) * l,
        ang: foldAngle,
        score: 0
      };
    }
    // Inside the score: smooth arc, plus a shallow compression valley.
    const t = (x - (foldX - scoreWidth / 2)) / scoreWidth;
    const ang = foldAngle * (t * t * (3 - 2 * t));
    const l = t * scoreWidth;
    const valley = Math.sin(t * Math.PI) * thickness * 0.42;
    return {
      x: foldX - scoreWidth / 2 + Math.cos(ang * 0.5) * l,
      y: Math.sin(ang * 0.5) * l,
      ang,
      score: valley
    };
  }

  const rows = segmentsAlong + 1;
  const cols = segmentsAcross + 1;

  // Top surface then bottom surface.
  for (let surface = 0; surface < 2; surface++) {
    const sign = surface === 0 ? 1 : -1;
    const base = positions.length / 3;
    for (let i = 0; i < rows; i++) {
      const u = i / segmentsAlong;
      const x = -width / 2 + u * width;
      const p = pathPoint(x);
      const nx = -Math.sin(p.ang);
      const ny = Math.cos(p.ang);
      // Score valley only depresses the outer (top) face.
      const depress = surface === 0 ? p.score : p.score * 0.22;
      const off = half - depress;
      for (let j = 0; j < cols; j++) {
        const v = j / segmentsAcross;
        const z = -depth / 2 + v * depth;
        positions.push(p.x + nx * off * sign, p.y + ny * off * sign, z);
        normals.push(nx * sign, ny * sign, 0);
        uvs.push(u, v);
      }
    }
    for (let i = 0; i < segmentsAlong; i++) {
      for (let j = 0; j < segmentsAcross; j++) {
        const a = base + i * cols + j;
        const b = a + cols;
        const c = a + 1;
        const d = b + 1;
        if (surface === 0) {
          indices.push(a, c, d, a, d, b);
        } else {
          indices.push(a, b, d, a, d, c);
        }
      }
    }
  }

  const faceVertexCount = positions.length / 3;

  // Perimeter edge band — the laminated cut edge.
  const edgeStart = indices.length;
  const sideBase = positions.length / 3;
  const sideRows = [];

  for (let i = 0; i < rows; i++) {
    const u = i / segmentsAlong;
    const x = -width / 2 + u * width;
    const p = pathPoint(x);
    const nx = -Math.sin(p.ang);
    const ny = Math.cos(p.ang);
    sideRows.push({ p, nx, ny, u });
  }

  // Two long edges (z = -depth/2 and +depth/2)
  for (let side = 0; side < 2; side++) {
    const z = side === 0 ? -depth / 2 : depth / 2;
    const base = positions.length / 3;
    const nz = side === 0 ? -1 : 1;
    for (let i = 0; i < rows; i++) {
      const { p, nx, ny, u } = sideRows[i];
      positions.push(p.x + nx * half, p.y + ny * half, z);
      normals.push(0, 0, nz);
      uvs.push(u * 8, 1);
      positions.push(p.x - nx * half, p.y - ny * half, z);
      normals.push(0, 0, nz);
      uvs.push(u * 8, 0);
    }
    for (let i = 0; i < segmentsAlong; i++) {
      const a = base + i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      if (side === 0) indices.push(a, c, b, b, c, d);
      else indices.push(a, b, c, b, d, c);
    }
  }

  // Two short ends
  for (let end = 0; end < 2; end++) {
    const i = end === 0 ? 0 : rows - 1;
    const { p, nx, ny } = sideRows[i];
    const dirX = end === 0 ? -1 : 1;
    const ex = Math.cos(p.ang) * dirX;
    const ey = Math.sin(p.ang) * dirX;
    const base = positions.length / 3;
    const pts = [
      [p.x + nx * half, p.y + ny * half, -depth / 2],
      [p.x - nx * half, p.y - ny * half, -depth / 2],
      [p.x + nx * half, p.y + ny * half, depth / 2],
      [p.x - nx * half, p.y - ny * half, depth / 2]
    ];
    const uvSet = [
      [0, 1],
      [0, 0],
      [1, 1],
      [1, 0]
    ];
    for (let k = 0; k < 4; k++) {
      positions.push(pts[k][0], pts[k][1], pts[k][2]);
      normals.push(ex, ey, 0);
      uvs.push(uvSet[k][0], uvSet[k][1]);
    }
    if (end === 0) indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    else indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.addGroup(0, edgeStart, 0); // faces
  geo.addGroup(edgeStart, indices.length - edgeStart, 1); // edges
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

// Rounded rectangle plate used for the gold authority tab and the rail cap.
export function createPlateGeometry(w, d, t, radius = 0.01, curveSegments = 6) {
  const shape = new Shape();
  const x = -w / 2;
  const y = -d / 2;
  const r = Math.min(radius, w / 2, d / 2);
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + d - r);
  shape.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  shape.lineTo(x + r, y + d);
  shape.quadraticCurveTo(x, y + d, x, y + d - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  const geo = new ExtrudeGeometry(shape, {
    depth: t,
    bevelEnabled: true,
    bevelThickness: t * 0.18,
    bevelSize: t * 0.22,
    bevelSegments: 2,
    curveSegments
  });
  geo.rotateX(-Math.PI / 2);
  geo.center();
  return geo;
}
