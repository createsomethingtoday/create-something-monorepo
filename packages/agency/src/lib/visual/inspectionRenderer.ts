import * as THREE from 'three';
import { inspectionState } from './inspectionSceneState';

export interface InspectionRenderer {
  render(progress: number): void;
  resize(width: number, height: number, dpr: number): void;
  dispose(forceContextLoss?: boolean): void;
}

/** Procedural outlined assembly. No textures, external models, continuous animation or controls. */
export function createInspectionRenderer(canvas: HTMLCanvasElement): InspectionRenderer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setClearColor(0x171919);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 4, -4, 0.1, 100);
  camera.position.set(7, 6.2, 9);
  camera.lookAt(0, 1.1, 0);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const ivory = 0xe8e3d9;
  const quiet = 0x747c7b;
  const amber = 0xe7ae58;
  let disposed = false;
  let progress = 0;

  function block(
    parent: THREE.Object3D,
    size: [number, number, number],
    position: [number, number, number],
    color = ivory,
    fill = 0x202424
  ) {
    const geometry = new THREE.BoxGeometry(...size);
    const edges = new THREE.EdgesGeometry(geometry);
    const face = new THREE.MeshBasicMaterial({
      color: fill,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });
    const line = new THREE.LineBasicMaterial({ color });
    geometries.push(geometry, edges);
    materials.push(face, line);
    const group = new THREE.Group();
    group.add(new THREE.Mesh(geometry, face), new THREE.LineSegments(edges, line));
    group.position.set(...position);
    parent.add(group);
    return { group, line };
  }
  function trace(parent: THREE.Object3D, points: number[][], color: number) {
    const geometry = new THREE.BufferGeometry().setFromPoints(
      points.map(([x, y, z]) => new THREE.Vector3(x, y, z))
    );
    const material = new THREE.LineBasicMaterial({ color });
    geometries.push(geometry);
    materials.push(material);
    const line = new THREE.Line(geometry, material);
    parent.add(line);
    return line;
  }

  // The same route crosses three assemblies; only the center part is opened.
  block(scene, [7.7, 0.16, 2.25], [0, -0.45, 0], quiet, 0x171919);
  for (const x of [-2.7, 2.7]) {
    block(scene, [1.6, 0.85, 1.55], [x, 0.05, 0], quiet);
    block(scene, [1.7, 0.13, 1.7], [x, 0.55, 0], quiet);
    for (const z of [-0.45, 0, 0.45])
      trace(
        scene,
        [
          [x - 0.55, 0.62, z],
          [x + 0.55, 0.62, z]
        ],
        quiet
      );
  }
  trace(
    scene,
    [
      [-3.8, -0.33, 0],
      [3.8, -0.33, 0]
    ],
    amber
  );
  block(scene, [2.1, 0.25, 1.8], [0, -0.23, 0]);
  const lid = new THREE.Group();
  scene.add(lid);
  block(lid, [2.05, 0.55, 1.8], [0, 0.4, 0]);
  for (const z of [-0.5, 0, 0.5])
    trace(
      lid,
      [
        [-0.7, 0.68, z],
        [0.7, 0.68, z]
      ],
      ivory
    );
  const layer = new THREE.Group();
  scene.add(layer);
  block(layer, [1.7, 0.09, 1.5], [0, 0.06, 0], ivory, 0x282e2e);
  const leftConnection = block(layer, [0.46, 0.14, 0.28], [-0.36, 0.18, 0]);
  const rightConnection = block(layer, [0.46, 0.14, 0.28], [0.36, 0.18, 0]);
  trace(
    layer,
    [
      [-0.75, 0.12, 0],
      [-0.6, 0.12, 0]
    ],
    ivory
  );
  trace(
    layer,
    [
      [0.6, 0.12, 0],
      [0.75, 0.12, 0]
    ],
    ivory
  );
  trace(
    layer,
    [
      [-0.75, 0.12, 0.4],
      [0.75, 0.12, 0.4]
    ],
    quiet
  );
  const scope = trace(
    scene,
    [
      [-1.25, -0.31, -1.08],
      [1.25, -0.31, -1.08],
      [1.25, -0.31, 1.08],
      [-1.25, -0.31, 1.08],
      [-1.25, -0.31, -1.08]
    ],
    amber
  );
  const guides = new THREE.Group();
  scene.add(guides);
  for (const x of [-0.9, 0.9])
    for (const z of [-0.72, 0.72])
      trace(
        guides,
        [
          [x, 0.12, z],
          [x, 2.7, z]
        ],
        0x46504f
      );
  const marker = new THREE.Group();
  layer.add(marker);
  trace(
    marker,
    [
      [-0.15, 0.3, -0.18],
      [0.15, 0.3, -0.18],
      [0.15, 0.3, 0.18],
      [-0.15, 0.3, 0.18],
      [-0.15, 0.3, -0.18]
    ],
    0xf1796d
  );

  function render(value: number) {
    if (disposed) return;
    progress = value;
    const state = inspectionState(value);
    lid.position.y = state.lidLift;
    layer.position.y = state.layerLift;
    scope.visible = state.selection > 0.05;
    guides.visible = state.lidLift > 0.2;
    marker.visible = state.finding > 0.1;
    const color = new THREE.Color(ivory).lerp(new THREE.Color(0xf1796d), state.finding);
    leftConnection.line.color.copy(color);
    rightConnection.line.color.copy(color);
    renderer.render(scene, camera);
    canvas.dataset.progress = state.progress.toFixed(3);
    canvas.dataset.lidLift = state.lidLift.toFixed(3);
  }
  return {
    render,
    resize(width, height, dpr) {
      if (disposed || width <= 0 || height <= 0) return;
      renderer.setPixelRatio(Math.min(dpr, 1.5));
      renderer.setSize(width, height, false);
      const aspect = width / height;
      const halfHeight = Math.max(3.7, 5.1 / aspect);
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      render(progress);
    },
    dispose(forceContextLoss = true) {
      if (disposed) return;
      disposed = true;
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      if (forceContextLoss) renderer.forceContextLoss();
    }
  };
}
