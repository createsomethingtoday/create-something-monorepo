import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import {
  getPerformancePaperShot,
  type PerformancePaperProperty,
  type PerformancePaperShot,
  type PerformancePaperStage
} from './paper-studio';

export type PerformancePaperMotionMode = 'full' | 'reduced';

export interface PerformancePaperStudioMetrics {
  drawCalls: number;
  geometries: number;
  textures: number;
  pixelRatio: number;
  profileId: string;
  withinBudget: boolean;
}

export interface PerformancePaperStudioHandle {
  setStage(stage: PerformancePaperStage): void;
  setMotionMode(mode: PerformancePaperMotionMode): void;
  setVisible(visible: boolean): void;
  resize(width: number, height: number, pixelRatio: number): void;
  renderStatic(): void;
  getMetrics(): PerformancePaperStudioMetrics;
  dispose(forceContextLoss?: boolean): void;
}

interface PerformancePaperStudioOptions {
  shot: PerformancePaperProperty;
  stage: PerformancePaperStage;
  motionMode: PerformancePaperMotionMode;
  compact: boolean;
}

interface StudioProfile {
  id: 'performance-paper-studio-desktop-v1' | 'performance-paper-studio-compact-v1';
  maximumPixelRatio: number;
  antialias: boolean;
  textureSize: number;
}

interface PoseGroup {
  group: THREE.Group;
  materials: THREE.Material[];
}

const STAGE_INDEX: Record<PerformancePaperStage, number> = { map: 0, build: 1, control: 2 };

function deriveProfile(compact: boolean): StudioProfile {
  return compact
    ? {
        id: 'performance-paper-studio-compact-v1',
        maximumPixelRatio: 1.25,
        antialias: false,
        textureSize: 64
      }
    : {
        id: 'performance-paper-studio-desktop-v1',
        maximumPixelRatio: 1.65,
        antialias: true,
        textureSize: 128
      };
}

function cssColor(host: HTMLElement, property: string, fallback: string): THREE.Color {
  const value = getComputedStyle(host).getPropertyValue(property).trim();
  if (!value) return new THREE.Color(fallback);
  try {
    return new THREE.Color(value);
  } catch {
    return new THREE.Color(fallback);
  }
}

function deterministicNoise(index: number, seed: number): number {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function setMaterialOpacity(material: THREE.Material, opacity: number): void {
  if ('opacity' in material) {
    material.opacity = opacity;
  }
}

export function createPerformancePaperStudioRenderer(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  options: PerformancePaperStudioOptions
): PerformancePaperStudioHandle {
  const shot = getPerformancePaperShot(options.shot);
  const frame = options.compact ? shot.camera.mobile : shot.camera.desktop;
  const profile = deriveProfile(options.compact);
  const geometryRegistry = new Set<THREE.BufferGeometry>();
  const materialRegistry = new Set<THREE.Material>();
  const textureRegistry = new Set<THREE.Texture>();
  const trackGeometry = <T extends THREE.BufferGeometry>(geometry: T): T => {
    geometryRegistry.add(geometry);
    return geometry;
  };
  const trackMaterial = <T extends THREE.Material>(material: T): T => {
    materialRegistry.add(material);
    return material;
  };
  const trackTexture = <T extends THREE.Texture>(texture: T): T => {
    textureRegistry.add(texture);
    return texture;
  };

  const panel = cssColor(host, '--color-performance-panel', '#ffffff');
  const paper = cssColor(host, '--color-performance-paper', '#f3f3f0');
  const edge = cssColor(host, '--color-performance-paper-edge', '#b6b6ae');
  const fold = cssColor(host, '--color-performance-paper-fold', '#deded7');
  const ink = cssColor(host, '--color-performance-ink', '#090909');
  const signal = cssColor(host, '--color-performance-signal', '#0057b8');
  const pressure = cssColor(host, '--color-performance-pressure', '#e54800');
  const growth = cssColor(host, '--color-performance-growth', '#007a4d');
  const risk = cssColor(host, '--color-performance-risk', '#c62026');
  const accentByShot: Record<PerformancePaperProperty, THREE.Color> = {
    agency: signal,
    io: signal,
    space: pressure,
    ltd: risk,
    learn: growth
  };
  const accent = accentByShot[options.shot];

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: profile.antialias,
    powerPreference: 'high-performance',
    premultipliedAlpha: true,
    failIfMajorPerformanceCaveat: true
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = shot.lighting.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.setFocalLength(frame.focalLength);
  camera.position.fromArray(frame.position);
  camera.lookAt(new THREE.Vector3().fromArray(frame.target));

  const world = new THREE.Group();
  world.scale.setScalar(frame.objectScale);
  world.position.x = options.shot === 'agency' ? 0 : options.compact ? 0.45 : 2.05;
  world.position.z = options.compact ? 0.55 : 0;
  scene.add(world);

  RectAreaLightUniformsLib.init();
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnvironment = new RoomEnvironment();
  const environmentTarget = pmremGenerator.fromScene(roomEnvironment, 0.04);
  roomEnvironment.dispose();
  pmremGenerator.dispose();
  trackTexture(environmentTarget.texture);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = shot.lighting.environment;

  const key = new THREE.RectAreaLight(
    panel,
    shot.lighting.key.intensity,
    shot.lighting.key.width,
    shot.lighting.key.height
  );
  key.position.fromArray(shot.lighting.key.position);
  key.lookAt(0, 0, 0);
  const fillLight = new THREE.HemisphereLight(panel, edge, shot.lighting.fill.intensity);
  fillLight.position.fromArray(shot.lighting.fill.position);
  const graze = new THREE.DirectionalLight(panel, shot.lighting.graze.intensity);
  graze.position.fromArray(shot.lighting.graze.position);
  const shadowKey = new THREE.DirectionalLight(panel, 0.16);
  shadowKey.position.set(-3.5, 7.5, 4.5);
  shadowKey.castShadow = true;
  shadowKey.shadow.mapSize.set(options.compact ? 512 : 1024, options.compact ? 512 : 1024);
  shadowKey.shadow.camera.left = -4.5;
  shadowKey.shadow.camera.right = 4.5;
  shadowKey.shadow.camera.top = 4.5;
  shadowKey.shadow.camera.bottom = -4.5;
  shadowKey.shadow.bias = -0.0005;
  scene.add(key, fillLight, graze, shadowKey);

  function createContactShadowTexture(): THREE.DataTexture {
    const size = profile.textureSize;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const normalizedX = (x / (size - 1) - 0.5) * 2;
        const normalizedY = (y / (size - 1) - 0.5) * 2;
        const distance = Math.sqrt(normalizedX ** 2 + normalizedY ** 2);
        const alpha = Math.max(0, 1 - THREE.MathUtils.smoothstep(distance, 0.12, 1));
        const offset = (y * size + x) * 4;
        data[offset] = 255;
        data[offset + 1] = 255;
        data[offset + 2] = 255;
        data[offset + 3] = Math.round(alpha * 255);
      }
    }
    const texture = trackTexture(new THREE.DataTexture(data, size, size, THREE.RGBAFormat));
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
  }

  const contactShadowTexture = createContactShadowTexture();
  const groundMaterial = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: ink,
      map: contactShadowTexture,
      transparent: true,
      opacity: options.compact ? 0.1 : 0.13,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  const ground = new THREE.Mesh(trackGeometry(new THREE.PlaneGeometry(6.8, 4.8)), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.045;
  world.add(ground);

  const createSurfaceTexture = (kind: 'roughness' | 'normal', seed: number): THREE.DataTexture => {
    const size = profile.textureSize;
    const data = new Uint8Array(size * size * 4);
    for (let index = 0; index < size * size; index += 1) {
      const primary = deterministicNoise(index, seed);
      const fiber = deterministicNoise(index * 7, seed + 17);
      const value =
        kind === 'roughness'
          ? Math.round(198 + primary * 45)
          : Math.round(128 + (primary - 0.5) * 18 + (fiber - 0.5) * 7);
      const offset = index * 4;
      data[offset] = kind === 'normal' ? value : value;
      data[offset + 1] = kind === 'normal' ? 128 + Math.round((fiber - 0.5) * 12) : value;
      data[offset + 2] = kind === 'normal' ? 255 : value;
      data[offset + 3] = 255;
    }
    const texture = trackTexture(new THREE.DataTexture(data, size, size, THREE.RGBAFormat));
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...shot.material.fiberRepeat);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
    texture.needsUpdate = true;
    return texture;
  };

  const roughnessMap = createSurfaceTexture('roughness', 20260802 + options.shot.length);
  const normalMap = createSurfaceTexture('normal', 20260819 + options.shot.length);

  function createPaperMaterial(color = paper): THREE.MeshPhysicalMaterial {
    return trackMaterial(
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: shot.material.roughness,
        roughnessMap,
        normalMap,
        normalScale: new THREE.Vector2(shot.material.normalStrength, shot.material.normalStrength),
        metalness: 0,
        transmission: 0,
        clearcoat: 0,
        sheen: 0.08,
        sheenColor: paper,
        sheenRoughness: 0.92,
        envMapIntensity: 0.26,
        side: THREE.DoubleSide
      })
    );
  }

  function createAccentMaterial(color = accent): THREE.MeshStandardMaterial {
    return trackMaterial(new THREE.MeshStandardMaterial({ color, metalness: 0, roughness: 0.78 }));
  }

  function paperLayerTone(edgeMix: number): THREE.Color {
    return paper.clone().lerp(edge, edgeMix);
  }

  function createSheet(
    width: number,
    depth: number,
    material: THREE.MeshPhysicalMaterial,
    options: { bend?: number; crease?: number; seed?: number } = {}
  ): THREE.Mesh {
    const geometry = trackGeometry(
      new THREE.BoxGeometry(width, shot.material.thickness, depth, 12, 1, 10)
    );
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    const seed = options.seed ?? 1;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const z = positions.getZ(index);
      const surface = positions.getY(index);
      const bow = (options.bend ?? 0.03) * Math.sin((x / width + 0.5) * Math.PI);
      const crease =
        (options.crease ?? 0.012) * Math.sin(x * 4.3 + z * 1.7 + seed) * Math.sin(z * 3.1 - seed);
      positions.setY(index, surface + bow + crease);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function createRail(
    width: number,
    depth: number,
    material: THREE.MeshStandardMaterial,
    thickness = 0.035
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      trackGeometry(new THREE.BoxGeometry(width, thickness, depth)),
      material
    );
    mesh.castShadow = true;
    return mesh;
  }

  function pose(group: THREE.Group): PoseGroup {
    const materials: THREE.Material[] = [];
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return;
      const values = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of values) {
        if (!materials.includes(material)) {
          material.transparent = true;
          material.depthWrite = false;
          materials.push(material);
        }
      }
    });
    return { group, materials };
  }

  function createAgencyMap(): PoseGroup {
    const group = new THREE.Group();
    const crumpledMaterial = createPaperMaterial(fold);
    crumpledMaterial.flatShading = true;
    const geometry = trackGeometry(new THREE.IcosahedronGeometry(1.4, options.compact ? 4 : 5));
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const z = positions.getZ(index);
      const macroCrease =
        Math.sin(x * 5.1 + y * 3.7 - z * 4.4) * 0.055 +
        Math.sin(x * 8.2 - y * 4.8 + z * 3.3) * 0.035;
      const scale = 0.95 + deterministicNoise(index, 41) * 0.1 + macroCrease;
      positions.setXYZ(index, x * scale * 1.15, y * scale * 0.88, z * scale);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    const ball = new THREE.Mesh(geometry, crumpledMaterial);
    ball.position.set(0.35, 0.74, 0.05);
    ball.rotation.set(0.18, -0.4, 0.12);
    ball.castShadow = true;
    group.add(ball);

    const tag = createSheet(1.55, 0.68, createPaperMaterial(fold), {
      bend: 0.08,
      crease: 0.025,
      seed: 7
    });
    tag.position.set(-1.15, 0.08, 0.72);
    tag.rotation.set(0.02, -0.28, -0.16);
    group.add(tag);
    const sourceMark = createRail(0.64, 0.055, createAccentMaterial(signal), 0.045);
    sourceMark.position.set(-1.35, 0.16, 0.74);
    sourceMark.rotation.y = -0.28;
    group.add(sourceMark);
    return pose(group);
  }

  function createAgencyBuild(): PoseGroup {
    const group = new THREE.Group();
    const panels = [
      { x: -1.72, tilt: -0.23, z: 0.16 },
      { x: -0.58, tilt: 0.2, z: -0.06 },
      { x: 0.58, tilt: -0.18, z: 0.02 },
      { x: 1.72, tilt: 0.15, z: -0.12 }
    ];
    panels.forEach((panelSpec, index) => {
      const sheet = createSheet(1.34, 3.05, createPaperMaterial(index % 2 ? paper : panel), {
        bend: 0.025,
        crease: 0.01,
        seed: index + 13
      });
      sheet.position.set(panelSpec.x, 0.45 + Math.abs(panelSpec.tilt) * 0.7, panelSpec.z);
      sheet.rotation.z = panelSpec.tilt;
      group.add(sheet);
    });
    const route = new THREE.Mesh(
      trackGeometry(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(-2.15, 0.88, 0.38),
            new THREE.Vector3(-0.85, 0.84, 0.2),
            new THREE.Vector3(0.15, 0.9, -0.1),
            new THREE.Vector3(2.1, 0.78, -0.28)
          ]),
          28,
          0.035,
          6,
          false
        )
      ),
      createAccentMaterial(signal)
    );
    route.castShadow = true;
    group.add(route);
    return pose(group);
  }

  function createAgencyControl(): PoseGroup {
    const group = new THREE.Group();
    const sheet = createSheet(4.65, 3.55, createPaperMaterial(panel), {
      bend: 0.045,
      crease: 0.018,
      seed: 23
    });
    sheet.position.y = 0.25;
    sheet.rotation.y = -0.05;
    group.add(sheet);
    const boundary = createRail(0.11, 3.32, createAccentMaterial(risk), 0.08);
    boundary.position.set(1.62, 0.43, 0);
    group.add(boundary);
    const stampMaterial = createAccentMaterial(growth);
    const stamp = new THREE.Mesh(
      trackGeometry(new THREE.RingGeometry(0.42, 0.5, 42)),
      stampMaterial
    );
    stamp.rotation.x = -Math.PI / 2;
    stamp.position.set(0.72, 0.43, 0.72);
    stamp.castShadow = true;
    group.add(stamp);
    const receipt = createSheet(1.12, 0.66, createPaperMaterial(fold), {
      bend: 0.018,
      crease: 0.006,
      seed: 31
    });
    receipt.position.set(1.78, 0.5, -1.08);
    receipt.rotation.y = -0.08;
    group.add(receipt);
    return pose(group);
  }

  function createResearchStack(): PoseGroup {
    const group = new THREE.Group();
    for (let index = 0; index < 4; index += 1) {
      const sheet = createSheet(
        4.15,
        3.1,
        createPaperMaterial(
          index === 3 ? paperLayerTone(0.22) : paperLayerTone(0.5 - index * 0.08)
        ),
        {
          bend: 0.025 + index * 0.008,
          crease: 0.008,
          seed: index + 41
        }
      );
      sheet.position.set((index - 1.5) * 0.14, 0.14 + index * 0.12, (1.5 - index) * 0.16);
      sheet.rotation.y = (index - 1.5) * 0.035;
      group.add(sheet);
    }
    const trace = new THREE.Mesh(
      trackGeometry(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(-1.7, 0.72, 0.72),
            new THREE.Vector3(-0.65, 0.78, 0.18),
            new THREE.Vector3(0.42, 0.77, 0.48),
            new THREE.Vector3(1.75, 0.72, -0.66)
          ]),
          36,
          0.035,
          6,
          false
        )
      ),
      createAccentMaterial(signal)
    );
    trace.castShadow = true;
    group.add(trace);
    [-0.72, -0.08, 0.56].forEach((z, index) => {
      const rule = createRail(2.45 - index * 0.28, 0.025, createAccentMaterial(ink), 0.018);
      rule.position.set(-0.35 + index * 0.12, 0.635, z);
      rule.rotation.y = -0.045;
      group.add(rule);
    });
    [-1.7, 0.42, 1.75].forEach((x, index) => {
      const pin = new THREE.Mesh(
        trackGeometry(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 18)),
        createAccentMaterial(signal)
      );
      pin.position.set(x, 0.74, [0.72, 0.48, -0.66][index]);
      group.add(pin);
    });
    return pose(group);
  }

  function createScoredPrototype(): PoseGroup {
    const group = new THREE.Group();
    const specs = [
      { x: -1.42, tilt: -0.34, z: 0.08 },
      { x: 0, tilt: 0.3, z: -0.04 },
      { x: 1.42, tilt: -0.26, z: -0.18 }
    ];
    specs.forEach((spec, index) => {
      const sheet = createSheet(1.72, 3.45, createPaperMaterial(index === 1 ? panel : paper), {
        bend: 0.03,
        crease: 0.012,
        seed: index + 61
      });
      sheet.position.set(spec.x, 0.46 + Math.abs(spec.tilt) * 0.75, spec.z);
      sheet.rotation.z = spec.tilt;
      group.add(sheet);
    });
    const score = createRail(4.1, 0.055, createAccentMaterial(pressure), 0.05);
    score.position.set(0.1, 0.78, 0.7);
    score.rotation.y = -0.08;
    group.add(score);
    const register = new THREE.Mesh(
      trackGeometry(new THREE.RingGeometry(0.28, 0.34, 32)),
      createAccentMaterial(pressure)
    );
    register.rotation.x = -Math.PI / 2;
    register.position.set(0.1, 0.83, 0.68);
    group.add(register);
    return pose(group);
  }

  function createCanonStack(): PoseGroup {
    const group = new THREE.Group();
    for (let index = 0; index < 6; index += 1) {
      const sheet = createSheet(
        4.35,
        3.25,
        createPaperMaterial(
          index === 5 ? paperLayerTone(0.18) : paperLayerTone(0.5 - index * 0.055)
        ),
        {
          bend: 0.018 + index * 0.003,
          crease: 0.006,
          seed: index + 73
        }
      );
      sheet.position.set(index * 0.025, 0.11 + index * 0.095, -index * 0.025);
      sheet.rotation.y = -0.055 + index * 0.006;
      group.add(sheet);
    }
    const spine = createRail(3.85, 0.11, createAccentMaterial(risk), 0.07);
    spine.position.set(0, 0.78, 1.2);
    spine.rotation.y = -0.055;
    group.add(spine);
    const standard = new THREE.Mesh(
      trackGeometry(new THREE.RingGeometry(0.36, 0.42, 36)),
      createAccentMaterial(ink)
    );
    standard.rotation.x = -Math.PI / 2;
    standard.position.set(0.88, 0.77, 0.66);
    group.add(standard);
    return pose(group);
  }

  function createWorkbook(): PoseGroup {
    const group = new THREE.Group();
    const specs = [
      { x: -1.72, tilt: -0.2, z: 0.14 },
      { x: -0.58, tilt: 0.18, z: -0.04 },
      { x: 0.58, tilt: -0.16, z: 0.04 },
      { x: 1.72, tilt: 0.2, z: -0.12 }
    ];
    specs.forEach((spec, index) => {
      const sheet = createSheet(1.32, 3.2, createPaperMaterial(index % 2 ? paper : panel), {
        bend: 0.025,
        crease: 0.008,
        seed: index + 89
      });
      sheet.position.set(spec.x, 0.4 + Math.abs(spec.tilt) * 0.72, spec.z);
      sheet.rotation.z = spec.tilt;
      group.add(sheet);
      const tab = createRail(0.48, 0.18, createAccentMaterial(index === 3 ? growth : signal), 0.05);
      tab.position.set(spec.x + 0.25, 0.78 + Math.abs(spec.tilt) * 0.4, -1.46 + index * 0.08);
      tab.rotation.z = spec.tilt;
      group.add(tab);
    });
    const receipt = createSheet(1.1, 0.72, createPaperMaterial(fold), {
      bend: 0.018,
      crease: 0.006,
      seed: 97
    });
    receipt.position.set(2.05, 0.68, 1.32);
    receipt.rotation.y = -0.1;
    group.add(receipt);
    const receiptMark = new THREE.Mesh(
      trackGeometry(new THREE.RingGeometry(0.2, 0.26, 28)),
      createAccentMaterial(growth)
    );
    receiptMark.rotation.x = -Math.PI / 2;
    receiptMark.position.set(2.05, 0.75, 1.31);
    group.add(receiptMark);
    return pose(group);
  }

  const agencyPoses =
    options.shot === 'agency'
      ? [createAgencyMap(), createAgencyBuild(), createAgencyControl()]
      : [];
  const staticPose =
    options.shot === 'io'
      ? createResearchStack()
      : options.shot === 'space'
        ? createScoredPrototype()
        : options.shot === 'ltd'
          ? createCanonStack()
          : options.shot === 'learn'
            ? createWorkbook()
            : null;

  if (agencyPoses.length) {
    for (const item of agencyPoses) world.add(item.group);
  } else if (staticPose) {
    world.add(staticPose.group);
  }

  let stage = options.stage;
  let stageProgress = STAGE_INDEX[stage];
  let stageVelocity = 0;
  let motionMode = options.motionMode;
  let visible = true;
  let disposed = false;
  let lastTime = 0;
  let elapsed = 0;

  function updateAgencyPoses(progress: number): void {
    if (!agencyPoses.length) return;
    agencyPoses.forEach((item, index) => {
      const distance = Math.abs(progress - index);
      const weight = THREE.MathUtils.smoothstep(1 - Math.min(distance, 1), 0, 1);
      item.group.visible = weight > 0.01;
      item.group.position.y = (1 - weight) * 0.18;
      item.group.scale.setScalar(0.94 + weight * 0.06);
      item.materials.forEach((material) => setMaterialOpacity(material, weight));
    });
  }

  function resize(width: number, height: number, pixelRatio: number): void {
    if (disposed || width <= 0 || height <= 0) return;
    const ratio = Math.min(pixelRatio || 1, profile.maximumPixelRatio);
    renderer.setPixelRatio(ratio);
    renderer.setSize(Math.round(width), Math.round(height), false);
    camera.aspect = width / height;
    camera.setFocalLength(frame.focalLength);
    camera.updateProjectionMatrix();
  }

  function render(now = 0): void {
    if (disposed) return;
    const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime = now;
    const target = STAGE_INDEX[stage];
    if (motionMode === 'reduced') {
      stageProgress = target;
      stageVelocity = 0;
    } else {
      const spring = 34;
      const damping = 10.5;
      stageVelocity += ((target - stageProgress) * spring - stageVelocity * damping) * delta;
      stageProgress = THREE.MathUtils.clamp(stageProgress + stageVelocity * delta, 0, 2);
      elapsed += delta;
    }
    updateAgencyPoses(stageProgress);
    world.rotation.y = motionMode === 'full' ? Math.sin(elapsed * 0.42) * 0.018 : 0;
    renderer.render(scene, camera);
  }

  function animate(now: number): void {
    if (!visible || disposed) return;
    render(now);
  }

  function renderStatic(): void {
    render(performance.now());
  }

  function setVisible(nextVisible: boolean): void {
    visible = nextVisible;
    renderer.setAnimationLoop(nextVisible && motionMode === 'full' ? animate : null);
    if (nextVisible) renderStatic();
  }

  function getMetrics(): PerformancePaperStudioMetrics {
    const metrics = {
      drawCalls: renderer.info.render.calls,
      geometries: geometryRegistry.size,
      textures: textureRegistry.size,
      pixelRatio: renderer.getPixelRatio(),
      profileId: profile.id
    };
    return {
      ...metrics,
      withinBudget:
        metrics.drawCalls <= shot.budget.drawCalls &&
        metrics.geometries <= shot.budget.geometries &&
        metrics.textures <= shot.budget.textures
    };
  }

  updateAgencyPoses(stageProgress);
  renderStatic();
  if (motionMode === 'full') renderer.setAnimationLoop(animate);

  return {
    setStage(nextStage) {
      stage = nextStage;
      if (motionMode === 'reduced') {
        stageProgress = STAGE_INDEX[nextStage];
        updateAgencyPoses(stageProgress);
      }
      renderStatic();
    },
    setMotionMode(nextMode) {
      motionMode = nextMode;
      renderer.setAnimationLoop(visible && nextMode === 'full' ? animate : null);
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
      geometryRegistry.forEach((geometry) => geometry.dispose());
      materialRegistry.forEach((material) => material.dispose());
      environmentTarget.dispose();
      textureRegistry.forEach((texture) => {
        if (texture !== environmentTarget.texture) texture.dispose();
      });
      renderer.dispose();
      if (forceContextLoss) renderer.forceContextLoss();
    }
  };
}
