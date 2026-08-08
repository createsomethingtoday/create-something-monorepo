// @ts-nocheck -- Omma v2 runtime mirror with reviewed camera-basis correction.
// Named camera rigs. Each rig is a settled, deterministic state — no
// auto-rotation, no cycling, no animated meaning.
//
// Composition masks are geometry constraints, enforced by solving camera
// distance and framing offset against the projected cluster bounds inside
// the allowed object field.

import { Box3, Vector3, Sphere } from 'three';

export const MASKS = {
  desktop: {
    // Fractions of the hero viewport (below the 72px nav).
    quietLeft: 0.46,
    quietBottom: 0.18,
    fieldX: [0.52, 0.94],
    fieldY: [0.15, 0.76]
  },
  mobile: {
    quietTop: 0.52,
    quietBottom: 0.14,
    fieldX: [0.08, 0.94],
    fieldY: [0.545, 0.845]
  }
};

export const RIGS = {
  desktop: {
    name: 'desktop',
    fov: 33,
    pitchDeg: 35,
    yawDeg: 38,
    // Target the centre of the object field, not the world origin.
    field: MASKS.desktop.fieldX.concat(MASKS.desktop.fieldY),
    fieldX: MASKS.desktop.fieldX,
    fieldY: MASKS.desktop.fieldY,
    margin: 1.1,
    dpr: 1.5
  },
  mobile: {
    name: 'mobile',
    fov: 36,
    pitchDeg: 33,
    yawDeg: 44,
    fieldX: MASKS.mobile.fieldX,
    fieldY: MASKS.mobile.fieldY,
    margin: 1.06,
    dpr: 1.25
  }
};

export function pickRig(width, height) {
  const aspect = width / Math.max(1, height);
  // Aspect-driven, not user-agent driven.
  return aspect < 1.05 ? RIGS.mobile : RIGS.desktop;
}

const _box = new Box3();
const _sphere = new Sphere();
const _v = new Vector3();

// Solve camera distance from the complete cluster bounds, then offset the
// view so the cluster centre lands at the centre of the permitted object
// field rather than the centre of the frame.
export function solveRig(camera, object3d, rig, width, height) {
  const aspect = width / Math.max(1, height);
  camera.fov = rig.fov;
  camera.aspect = aspect;
  camera.near = 0.02;
  camera.far = 20;

  _box.setFromObject(object3d);
  _box.getBoundingSphere(_sphere);
  const center = _sphere.center.clone();

  const pitch = (rig.pitchDeg * Math.PI) / 180;
  const yaw = (rig.yawDeg * Math.PI) / 180;

  const dir = new Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch)
  ).normalize();

  // Field extents in NDC-ish fraction terms.
  const fw = rig.fieldX[1] - rig.fieldX[0];
  const fh = rig.fieldY[1] - rig.fieldY[0];

  const vFov = (camera.fov * Math.PI) / 180;

  // Project the box onto the camera basis to get true required extents,
  // instead of relying on the bounding sphere alone (which over-frames).
  const right = new Vector3().crossVectors(new Vector3(0, 1, 0), dir).normalize();
  const up = new Vector3().crossVectors(dir, right).normalize();

  const corners = [];
  const min = _box.min;
  const max = _box.max;
  for (let i = 0; i < 8; i++) {
    corners.push(
      new Vector3(
        i & 1 ? max.x : min.x,
        i & 2 ? max.y : min.y,
        i & 4 ? max.z : min.z
      )
    );
  }

  let halfW = 0;
  let halfH = 0;
  for (const c of corners) {
    _v.copy(c).sub(center);
    halfW = Math.max(halfW, Math.abs(_v.dot(right)));
    halfH = Math.max(halfH, Math.abs(_v.dot(up)));
  }
  halfW *= rig.margin;
  halfH *= rig.margin;

  // Distance so cluster halfH occupies fh of the viewport height, and
  // halfW occupies fw of the viewport width.
  const distH = halfH / Math.tan(vFov / 2) / fh;
  const distW = halfW / (Math.tan(vFov / 2) * aspect) / fw;
  const dist = Math.max(distH, distW);

  camera.position.copy(center).add(dir.clone().multiplyScalar(dist));

  // Shift the look target so the cluster sits inside the object field.
  const fieldCenterX = (rig.fieldX[0] + rig.fieldX[1]) / 2;
  const fieldCenterY = (rig.fieldY[0] + rig.fieldY[1]) / 2;
  // NDC: x right positive, y up positive. fieldY measured from top.
  const ndcX = fieldCenterX * 2 - 1;
  const ndcY = 1 - fieldCenterY * 2;

  const halfViewH = Math.tan(vFov / 2) * dist;
  const halfViewW = halfViewH * aspect;

  const offset = right
    .clone()
    .multiplyScalar(-ndcX * halfViewW)
    .add(up.clone().multiplyScalar(-ndcY * halfViewH));

  camera.position.add(offset);
  const target = center.clone().add(offset);
  camera.lookAt(target);
  camera.updateProjectionMatrix();

  return { center, target, dist, dir, right, up };
}
