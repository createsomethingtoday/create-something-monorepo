import * as THREE from 'three';

import { getHeroArtifactScene, type HeroArtifactSceneId } from './physical-artifact.js';

export type PhysicalArtifactMotionMode = 'full' | 'reduced';

export interface PhysicalArtifactRendererMetrics {
  drawCalls: number;
  geometries: number;
  textures: number;
  triangles: number;
  pixelRatio: number;
  profileId: string;
  withinBudget: boolean;
}

export interface PhysicalArtifactRendererHandle {
  setMotionMode(mode: PhysicalArtifactMotionMode): void;
  setVisible(visible: boolean): void;
  resize(width: number, height: number, pixelRatio: number): void;
  renderStatic(): void;
  getMetrics(): PhysicalArtifactRendererMetrics;
  dispose(forceContextLoss?: boolean): void;
}

interface PhysicalArtifactRendererOptions {
  scene: HeroArtifactSceneId;
  motionMode: PhysicalArtifactMotionMode;
  compact: boolean;
  /** Static scenes never animate, even when the browser permits motion. */
  live: boolean;
}

function color(host: HTMLElement, property: string, fallback: string): THREE.Color {
  const token = getComputedStyle(host).getPropertyValue(property).trim();
  try {
    return new THREE.Color(token || fallback);
  } catch {
    return new THREE.Color(fallback);
  }
}

function addRole(object: THREE.Object3D, role: string): void {
  object.userData.artifactRole = role;
}

/**
 * One intentionally small renderer for all public hero artifacts. The scene
 * registry decides the object; this module decides only physical treatment.
 */
export function createPhysicalArtifactRenderer(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  options: PhysicalArtifactRendererOptions
): PhysicalArtifactRendererHandle {
  const definition = getHeroArtifactScene(options.scene);
  const frame = options.compact ? definition.camera.mobile : definition.camera.desktop;
  const maxPixelRatio = options.compact ? 1.2 : definition.budget.pixelRatioCap;
  const geometryRegistry = new Set<THREE.BufferGeometry>();
  const materialRegistry = new Set<THREE.Material>();
  const textureRegistry = new Set<THREE.Texture>();
  const geometry = <T extends THREE.BufferGeometry>(value: T): T => {
    geometryRegistry.add(value);
    return value;
  };
  const material = <T extends THREE.Material>(value: T): T => {
    materialRegistry.add(value);
    return value;
  };

  const porcelain = color(host, '--color-performance-paper', '#f3f3ed');
  const panel = color(host, '--color-performance-panel', '#d8d8d1');
  const ink = color(host, '--color-performance-ink', '#090909');
  const signal = color(host, '--color-performance-signal', '#0057b8');
  const proof = color(host, '--color-performance-growth', '#007a4d');
  const boundary = color(host, '--color-performance-risk', '#c62026');
  const pressure = color(host, '--color-performance-pressure', '#e54800');

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !options.compact,
    powerPreference: 'high-performance',
    premultipliedAlpha: true,
    failIfMajorPerformanceCaveat: true
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.setFocalLength(frame.focalLength);
  camera.position.fromArray(frame.position);
  camera.lookAt(new THREE.Vector3().fromArray(frame.target));

  const world = new THREE.Group();
  world.scale.setScalar(frame.scale);
  world.position.set(options.compact ? 0.18 : 1.7, 0, options.compact ? 0.55 : 0);
  scene.add(world);

  const hemisphere = new THREE.HemisphereLight(porcelain, ink, 2.1);
  const key = new THREE.DirectionalLight(porcelain, 3.8);
  key.position.set(-4.8, 7.5, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(options.compact ? 512 : 1024, options.compact ? 512 : 1024);
  key.shadow.bias = -0.0004;
  const rim = new THREE.DirectionalLight(signal, 1.55);
  rim.position.set(5.5, 3.3, -4.6);
  const low = new THREE.PointLight(proof, 0.5, 14);
  low.position.set(1.5, 1.2, 2.5);
  scene.add(hemisphere, key, rim, low);

  const physical = (value: THREE.Color, roughness = 0.78) =>
    material(
      new THREE.MeshPhysicalMaterial({
        color: value,
        roughness,
        metalness: 0.02,
        clearcoat: 0.08,
        clearcoatRoughness: 0.84,
        sheen: 0.05,
        sheenColor: porcelain,
        envMapIntensity: 0.18
      })
    );
  const flat = (value: THREE.Color, roughness = 0.72) =>
    material(new THREE.MeshStandardMaterial({ color: value, roughness, metalness: 0.04 }));
  const paper = physical(porcelain, 0.86);
  const paperEdge = physical(panel, 0.78);
  const sourceMaterial = flat(signal, 0.5);
  const proofMaterial = flat(proof, 0.54);
  const boundaryMaterial = flat(boundary, 0.5);
  const pressureMaterial = flat(pressure, 0.48);
  const inkMaterial = flat(ink, 0.78);

  const box = (
    width: number,
    height: number,
    depth: number,
    useMaterial: THREE.Material,
    role: string,
    position: readonly [number, number, number],
    rotation: readonly [number, number, number] = [0, 0, 0]
  ) => {
    const mesh = new THREE.Mesh(geometry(new THREE.BoxGeometry(width, height, depth)), useMaterial);
    mesh.position.fromArray(position);
    mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    addRole(mesh, role);
    world.add(mesh);
    return mesh;
  };
  const cylinder = (
    radius: number,
    height: number,
    useMaterial: THREE.Material,
    role: string,
    position: readonly [number, number, number],
    radialSegments = 24
  ) => {
    const mesh = new THREE.Mesh(
      geometry(new THREE.CylinderGeometry(radius, radius, height, radialSegments)),
      useMaterial
    );
    mesh.position.fromArray(position);
    mesh.castShadow = true;
    addRole(mesh, role);
    world.add(mesh);
    return mesh;
  };
  const ring = (
    innerRadius: number,
    outerRadius: number,
    useMaterial: THREE.Material,
    role: string,
    position: readonly [number, number, number],
    rotation: readonly [number, number, number] = [-Math.PI / 2, 0, 0]
  ) => {
    const mesh = new THREE.Mesh(
      geometry(new THREE.RingGeometry(innerRadius, outerRadius, 32)),
      useMaterial
    );
    mesh.position.fromArray(position);
    mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    addRole(mesh, role);
    world.add(mesh);
    return mesh;
  };
  const route = (
    points: readonly (readonly [number, number, number])[],
    useMaterial: THREE.Material,
    role: string
  ) => {
    const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
    const mesh = new THREE.Mesh(
      geometry(new THREE.TubeGeometry(curve, 32, 0.032, 6, false)),
      useMaterial
    );
    mesh.castShadow = true;
    addRole(mesh, role);
    world.add(mesh);
    return mesh;
  };

  const field = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(7.5, 5.2)),
    material(
      new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: options.compact ? 0.07 : 0.11 })
    )
  );
  field.rotation.x = -Math.PI / 2;
  field.position.y = -0.04;
  field.receiveShadow = true;
  addRole(field, 'field');
  world.add(field);

  function buildFoldedPlaybook(): void {
    [-1.3, 0, 1.3].forEach((x, index) => {
      box(1.1, 0.1, 3.25, index === 1 ? paper : paperEdge, 'subject', [x, 0.42, 0], [0, 0, (index - 1) * 0.23]);
      box(0.42, 0.045, 0.18, index === 2 ? proofMaterial : sourceMaterial, 'source', [x + 0.25, 0.51, -1.37], [0, 0, (index - 1) * 0.23]);
    });
    box(3.95, 0.09, 0.12, inkMaterial, 'boundary', [0, 0.53, 1.38]);
    route(
      [
        [-1.65, 0.59, 0.8],
        [-0.6, 0.64, 0.35],
        [0.48, 0.64, -0.1],
        [1.72, 0.6, -0.75]
      ],
      sourceMaterial,
      'evidence'
    );
    ring(0.17, 0.25, proofMaterial, 'evidence', [1.72, 0.59, -0.75]);
  }

  function buildGatedRoute(): void {
    [-1.7, 0, 1.7].forEach((x, index) => {
      box(0.85, 0.48, 0.85, index === 1 ? paper : paperEdge, 'subject', [x, 0.3, 0]);
      box(0.45, 0.06, 0.12, index === 0 ? sourceMaterial : proofMaterial, 'source', [x, 0.58, -0.38]);
    });
    box(0.12, 1.28, 0.12, boundaryMaterial, 'boundary', [0, 0.85, -0.45]);
    box(1.35, 0.12, 0.12, boundaryMaterial, 'boundary', [0.58, 1.43, -0.45]);
    route(
      [
        [-2.05, 0.72, 0],
        [-0.75, 0.72, 0],
        [0, 1.08, -0.45],
        [0.78, 0.72, 0],
        [2.08, 0.72, 0]
      ],
      sourceMaterial,
      'evidence'
    );
    ring(0.18, 0.27, proofMaterial, 'evidence', [1.7, 0.58, -0.39]);
  }

  function buildThreePath(): void {
    cylinder(0.55, 0.26, paper, 'subject', [-1.55, 0.25, 0]);
    const targets: readonly (readonly [number, number, number])[] = [
      [1.15, 0.3, -1.22],
      [1.5, 0.3, 0],
      [1.15, 0.3, 1.22]
    ];
    targets.forEach((target, index) => {
      box(0.85, 0.43, 0.72, index === 1 ? paper : paperEdge, 'subject', target);
      route(
        [
          [-1.1, 0.5, 0],
          [-0.25, 0.57, 0],
          [0.45, 0.56, target[2] * 0.42],
          [target[0] - 0.52, 0.5, target[2]]
        ],
        index === 2 ? proofMaterial : sourceMaterial,
        'source'
      );
    });
    box(0.08, 0.95, 3.45, boundaryMaterial, 'boundary', [0.3, 0.5, 0]);
    ring(0.2, 0.28, proofMaterial, 'evidence', [1.15, 0.56, 1.22]);
  }

  function buildEvidenceStack(): void {
    for (let index = 0; index < 5; index += 1) {
      box(3.65, 0.08, 2.7, index === 4 ? paper : paperEdge, 'subject', [index * 0.07, 0.12 + index * 0.1, -index * 0.055], [0, -0.055 + index * 0.008, 0]);
    }
    box(3.1, 0.06, 0.11, boundaryMaterial, 'boundary', [0.08, 0.65, 1.02]);
    ring(0.33, 0.42, proofMaterial, 'evidence', [0.72, 0.68, 0.4]);
    box(1.08, 0.065, 0.68, paper, 'evidence', [1.45, 0.7, -0.82], [0, -0.1, 0]);
    route(
      [
        [-1.55, 0.71, 0.65],
        [-0.6, 0.74, 0.18],
        [0.25, 0.74, 0.56],
        [1.43, 0.75, -0.79]
      ],
      sourceMaterial,
      'source'
    );
  }

  function buildResearchSpecimen(): void {
    for (let index = 0; index < 4; index += 1) {
      box(3.45, 0.075, 2.25, index === 3 ? paper : paperEdge, 'subject', [(index - 1.5) * 0.12, 0.12 + index * 0.095, (1.5 - index) * 0.12], [0, (index - 1.5) * 0.045, 0]);
    }
    [-0.65, 0.04, 0.73].forEach((z) => box(2.1, 0.02, 0.025, inkMaterial, 'evidence', [0.2, 0.54, z]));
    route(
      [
        [-1.45, 0.6, 0.65],
        [-0.48, 0.63, 0.1],
        [0.45, 0.64, 0.52],
        [1.44, 0.61, -0.6]
      ],
      sourceMaterial,
      'source'
    );
    [-1.45, 0.45, 1.44].forEach((x, index) => cylinder(0.095, 0.06, sourceMaterial, 'source', [x, 0.61, [0.65, 0.52, -0.6][index]]));
    box(0.1, 0.75, 2.15, boundaryMaterial, 'boundary', [1.72, 0.5, 0]);
  }

  function buildCanonStandard(): void {
    for (let index = 0; index < 6; index += 1) {
      box(3.62, 0.08, 2.7, index === 5 ? paper : paperEdge, 'subject', [index * 0.035, 0.12 + index * 0.075, -index * 0.035], [0, -0.045 + index * 0.005, 0]);
    }
    box(3.25, 0.12, 0.12, inkMaterial, 'boundary', [0.1, 0.67, 1.04]);
    box(0.66, 0.06, 0.2, boundaryMaterial, 'source', [-1.26, 0.68, -0.86]);
    ring(0.34, 0.43, sourceMaterial, 'evidence', [0.8, 0.69, 0.38]);
    route(
      [
        [-1.28, 0.72, -0.86],
        [-0.72, 0.73, -0.3],
        [0.08, 0.73, 0.3],
        [0.78, 0.72, 0.38]
      ],
      sourceMaterial,
      'evidence'
    );
  }

  function buildRuntimeRig(): void {
    const base = cylinder(1.35, 0.16, paperEdge, 'field', [0, 0.12, 0], 48);
    base.receiveShadow = true;
    ring(0.82, 0.9, sourceMaterial, 'subject', [0, 0.22, 0]);
    ring(0.36, 0.45, proofMaterial, 'evidence', [0, 0.23, 0]);
    [[-1.65, 0, 0], [0.82, 0, -1.42], [0.82, 0, 1.42]].forEach((point, index) => {
      box(0.62, 0.54, 0.62, index === 0 ? paper : paperEdge, 'subject', [point[0], 0.32, point[2]]);
      route(
        [
          [0, 0.55, 0],
          [point[0] * 0.42, 0.6, point[2] * 0.42],
          [point[0] * 0.78, 0.55, point[2] * 0.78]
        ],
        index === 2 ? proofMaterial : sourceMaterial,
        'source'
      );
    });
    box(0.08, 1.25, 2.95, pressureMaterial, 'boundary', [1.82, 0.72, 0]);
  }

  function buildBasketballCourt(): void {
    box(5.4, 0.18, 3.4, paperEdge, 'field', [0, 0.09, 0]);
    const courtLine = (width: number, depth: number, x: number, z: number) =>
      box(width, 0.025, depth, porcelain === undefined ? paper : paper, 'evidence', [x, 0.2, z]);
    courtLine(5.05, 0.035, 0, 0);
    courtLine(0.035, 3.05, 0, 0);
    ring(0.38, 0.415, paper, 'evidence', [0, 0.205, 0]);
    box(0.035, 1.12, 1.2, paper, 'evidence', [-2.18, 0.205, 0]);
    box(0.035, 1.12, 1.2, paper, 'evidence', [2.18, 0.205, 0]);
    const ball = new THREE.Mesh(geometry(new THREE.SphereGeometry(0.32, 24, 16)), pressureMaterial);
    ball.position.set(0.72, 0.5, 0.46);
    ball.castShadow = true;
    addRole(ball, 'subject');
    world.add(ball);
    cylinder(0.05, 1.65, inkMaterial, 'boundary', [2.38, 0.98, -0.42]);
    box(1.18, 0.72, 0.06, porcelain === undefined ? paper : paper, 'boundary', [2.38, 1.55, -0.42]);
    const hoop = new THREE.Mesh(geometry(new THREE.TorusGeometry(0.22, 0.035, 12, 32)), pressureMaterial);
    hoop.position.set(2.38, 1.25, -0.17);
    hoop.rotation.x = Math.PI / 2;
    addRole(hoop, 'evidence');
    world.add(hoop);
    route(
      [
        [-1.85, 0.29, 1.1],
        [-0.7, 0.31, 0.68],
        [0.55, 0.33, 0.46],
        [1.95, 0.58, -0.04]
      ],
      sourceMaterial,
      'source'
    );
    ring(0.18, 0.26, proofMaterial, 'evidence', [1.86, 0.3, -0.02]);
  }

  switch (definition.subject) {
    case 'folded-playbook':
      buildFoldedPlaybook();
      break;
    case 'gated-route':
      buildGatedRoute();
      break;
    case 'three-path':
      buildThreePath();
      break;
    case 'evidence-stack':
      buildEvidenceStack();
      break;
    case 'research-specimen':
      buildResearchSpecimen();
      break;
    case 'canon-standard':
      buildCanonStandard();
      break;
    case 'runtime-rig':
      buildRuntimeRig();
      break;
    case 'basketball-court':
      buildBasketballCourt();
      break;
  }

  let motionMode = options.motionMode;
  let visible = true;
  let disposed = false;
  let elapsed = 0;
  let previous = 0;
  const canAnimate = () => options.live && definition.liveEnhancement && motionMode === 'full';

  function render(now = 0): void {
    if (disposed) return;
    const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 1 / 60;
    previous = now;
    if (canAnimate()) {
      elapsed += delta;
      world.rotation.y = Math.sin(elapsed * 0.48) * 0.045;
      world.position.y = Math.sin(elapsed * 0.72) * 0.035;
    } else {
      world.rotation.y = 0;
      world.position.y = 0;
    }
    renderer.render(scene, camera);
  }
  function animate(now: number): void {
    if (visible && !disposed) render(now);
  }
  function resize(width: number, height: number, pixelRatio: number): void {
    if (disposed || width <= 0 || height <= 0) return;
    renderer.setPixelRatio(Math.min(pixelRatio || 1, maxPixelRatio));
    renderer.setSize(Math.round(width), Math.round(height), false);
    camera.aspect = width / height;
    camera.setFocalLength(frame.focalLength);
    camera.updateProjectionMatrix();
  }
  function renderStatic(): void {
    render(performance.now());
  }
  function setVisible(nextVisible: boolean): void {
    visible = nextVisible;
    renderer.setAnimationLoop(nextVisible && canAnimate() ? animate : null);
    if (nextVisible) renderStatic();
  }
  function getMetrics(): PhysicalArtifactRendererMetrics {
    const metrics = {
      drawCalls: renderer.info.render.calls,
      geometries: geometryRegistry.size,
      textures: textureRegistry.size,
      triangles: renderer.info.render.triangles,
      pixelRatio: renderer.getPixelRatio(),
      profileId: options.compact ? 'physical-artifact-compact-v1' : 'physical-artifact-desktop-v1'
    };
    return {
      ...metrics,
      withinBudget:
        metrics.drawCalls <= definition.budget.drawCalls &&
        metrics.geometries <= definition.budget.geometries &&
        metrics.textures <= definition.budget.textures
    };
  }

  renderStatic();
  if (canAnimate()) renderer.setAnimationLoop(animate);

  return {
    setMotionMode(nextMode) {
      motionMode = nextMode;
      renderer.setAnimationLoop(visible && canAnimate() ? animate : null);
      renderStatic();
    },
    setVisible,
    resize,
    renderStatic,
    getMetrics,
    dispose(forceContextLoss = true) {
      if (disposed) return;
      disposed = true;
      renderer.setAnimationLoop(null);
      geometryRegistry.forEach((item) => item.dispose());
      materialRegistry.forEach((item) => item.dispose());
      textureRegistry.forEach((item) => item.dispose());
      renderer.dispose();
      if (forceContextLoss) renderer.forceContextLoss();
    }
  };
}
