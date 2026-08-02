import * as THREE from 'three';
import type { PaperWorkflowStageId } from '$lib/data/paperWorkflow';
import {
  createPipelineEnvironmentPixels,
  createPipelineSurfacePixels
} from './pipelineRenderProfile';

export type PaperPressureMotionMode = 'full' | 'reduced';

export interface PaperPressureRendererMetrics {
  drawCalls: number;
  geometries: number;
  textures: number;
  pixelRatio: number;
  profileId: string;
  withinBudget: boolean;
}

export interface PaperPressureRendererHandle {
  setStage(stage: PaperWorkflowStageId): void;
  setMotionMode(mode: PaperPressureMotionMode): void;
  setVisible(visible: boolean): void;
  resize(width: number, height: number, pixelRatio: number): void;
  renderStatic(): void;
  getMetrics(): PaperPressureRendererMetrics;
  dispose(forceContextLoss?: boolean): void;
}

interface PaperPressureRendererOptions {
  stage: PaperWorkflowStageId;
  motionMode: PaperPressureMotionMode;
  compact: boolean;
}

interface PaperPressureRenderProfile {
  id: 'paper-pressure-desktop-v3' | 'paper-pressure-compact-v3';
  antialias: boolean;
  maximumPixelRatio: number;
  segments: number;
  environment: { width: number; height: number };
  surfaceTextureSize: number;
  budgets: { drawCalls: number; geometries: number; textures: number };
}

const STAGE_INDEX: Record<PaperWorkflowStageId, number> = { map: 0, build: 1, control: 2 };

function deriveProfile(compact: boolean): PaperPressureRenderProfile {
  return compact
    ? {
        id: 'paper-pressure-compact-v3',
        antialias: false,
        maximumPixelRatio: 1.2,
        segments: 42,
        environment: { width: 24, height: 64 },
        surfaceTextureSize: 32,
        budgets: { drawCalls: 12, geometries: 10, textures: 4 }
      }
    : {
        id: 'paper-pressure-desktop-v3',
        antialias: true,
        maximumPixelRatio: 1.6,
        segments: 64,
        environment: { width: 48, height: 96 },
        surfaceTextureSize: 64,
        budgets: { drawCalls: 12, geometries: 10, textures: 4 }
      };
}

function colourBytes(colour: THREE.Color): readonly [number, number, number] {
  return [
    Math.round(THREE.MathUtils.clamp(colour.r, 0, 1) * 255),
    Math.round(THREE.MathUtils.clamp(colour.g, 0, 1) * 255),
    Math.round(THREE.MathUtils.clamp(colour.b, 0, 1) * 255)
  ];
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

function hashNoise(index: number, channel: number): number {
  const value = Math.sin(index * 91.345 + channel * 47.77) * 43_758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

export function createPaperPressureRenderer(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  options: PaperPressureRendererOptions
): PaperPressureRendererHandle {
  const profile = deriveProfile(options.compact);
  const ink = cssColor(host, '--paper-pressure-ink', '#090909');
  const sheet = cssColor(host, '--paper-pressure-sheet', '#ffffff');
  const signal = cssColor(host, '--paper-pressure-signal', '#3157d5');
  const review = cssColor(host, '--paper-pressure-review', '#7255c8');
  const stop = cssColor(host, '--paper-pressure-stop', '#b4312f');

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

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: profile.antialias,
    powerPreference: 'high-performance',
    premultipliedAlpha: true,
    failIfMajorPerformanceCaveat: true
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(options.compact ? 34 : 31, 1, 0.1, 40);
  const world = new THREE.Group();
  scene.add(world);

  const environmentTexture = (() => {
    const signalSoft = sheet.clone().lerp(signal, 0.12);
    const pixels = createPipelineEnvironmentPixels(profile.environment, {
      ink: colourBytes(ink),
      court: colourBytes(sheet),
      signal: colourBytes(signal),
      signalSoft: colourBytes(signalSoft)
    });
    const gradient = new THREE.DataTexture(
      pixels,
      profile.environment.width,
      profile.environment.height,
      THREE.RGBAFormat
    );
    gradient.mapping = THREE.EquirectangularReflectionMapping;
    gradient.colorSpace = THREE.SRGBColorSpace;
    gradient.needsUpdate = true;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const target = pmrem.fromEquirectangular(gradient);
    gradient.dispose();
    pmrem.dispose();
    textureRegistry.add(target.texture);
    return target.texture;
  })();
  scene.environment = environmentTexture;
  scene.environmentIntensity = 0.58;

  const createSurfaceTexture = (semantic: 'roughness' | 'normal', seed: number) => {
    const size = profile.surfaceTextureSize;
    const texture = new THREE.DataTexture(
      createPipelineSurfacePixels(semantic, size, seed),
      size,
      size,
      THREE.RGBAFormat
    );
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(7, 5);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
    texture.needsUpdate = true;
    textureRegistry.add(texture);
    return texture;
  };
  const paperRoughness = createSurfaceTexture('roughness', 20260801);
  const paperNormal = createSurfaceTexture('normal', 20260801);

  const ambient = new THREE.HemisphereLight(sheet, ink, 0.86);
  const key = new THREE.DirectionalLight(0xffffff, 2.35);
  key.position.set(-5, 7, 8);
  const rim = new THREE.DirectionalLight(signal, 0.74);
  rim.position.set(6, 2, -5);
  scene.add(ambient, key, rim);

  const paperMaterial = trackMaterial(
    new THREE.MeshPhysicalMaterial({
      color: sheet,
      roughness: 0.92,
      roughnessMap: paperRoughness,
      normalMap: paperNormal,
      normalScale: new THREE.Vector2(0.045, 0.045),
      metalness: 0,
      clearcoat: 0,
      sheen: 0.05,
      sheenColor: sheet,
      sheenRoughness: 0.94,
      envMapIntensity: 0.2,
      flatShading: true,
      side: THREE.DoubleSide
    })
  );
  const paperGeometry = trackGeometry(
    new THREE.PlaneGeometry(5.7, 4.2, profile.segments, profile.segments)
  );
  const positions = paperGeometry.getAttribute('position') as THREE.BufferAttribute;
  positions.setUsage(THREE.DynamicDrawUsage);
  const vertexCount = positions.count;
  const compressed = new Float32Array(vertexCount * 3);
  const opening = new Float32Array(vertexCount * 3);
  const settled = new Float32Array(vertexCount * 3);

  for (let index = 0; index < vertexCount; index += 1) {
    const flatX = positions.getX(index);
    const flatY = positions.getY(index);
    const u = flatX / 5.7 + 0.5;
    const v = flatY / 4.2 + 0.5;
    const ridgeA = Math.abs(Math.sin(u * Math.PI * 9 + v * Math.PI * 3.5)) - 0.5;
    const ridgeB = Math.abs(Math.sin(v * Math.PI * 11 - u * Math.PI * 4.2)) - 0.5;
    const ridgeC = Math.abs(Math.sin((u + v) * Math.PI * 7.5)) - 0.5;
    const theta =
      u * Math.PI * 2 + Math.sin(v * Math.PI * 4) * 0.32 + ridgeB * 0.18;
    const phi = 0.2 + v * (Math.PI - 0.4) + ridgeC * 0.11;
    const radius = 1.3 + ridgeA * 0.24 + ridgeB * 0.17 + ridgeC * 0.11;
    const sphereX = Math.sin(phi) * Math.cos(theta) * radius;
    const sphereY = Math.cos(phi) * radius;
    const sphereZ = Math.sin(phi) * Math.sin(theta) * radius;

    const creaseField =
      Math.sin(flatX * 4.2 + flatY * 1.7) * 0.055 +
      Math.sin(flatY * 6.1 - flatX * 1.2) * 0.035 +
      hashNoise(index, 1) * 0.006;
    const openedX = flatX * 0.72 + sphereX * 0.28;
    const openedY = flatY * 0.72 + sphereY * 0.28;
    const openedZ = sphereZ * 0.27 + Math.sin(flatX * 2.25) * 0.22 + creaseField;
    const settledZ = creaseField + Math.exp(-(flatX * flatX) / 0.07) * 0.15;

    compressed.set([sphereX + 0.28, sphereY, sphereZ], index * 3);
    opening.set([openedX + 0.16, openedY, openedZ], index * 3);
    settled.set([flatX * 0.9, flatY * 0.82, settledZ], index * 3);
  }

  const paper = new THREE.Mesh(paperGeometry, paperMaterial);
  world.add(paper);

  const routeMaterial = trackMaterial(
    new THREE.LineBasicMaterial({ color: review, transparent: true, opacity: 0 })
  );
  const routeGeometry = trackGeometry(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-2.1, 0.48, 0.62),
      new THREE.Vector3(-0.55, 0.48, 0.72),
      new THREE.Vector3(0.35, -0.16, 0.68),
      new THREE.Vector3(2.1, -0.16, 0.58)
    ])
  );
  const route = new THREE.Line(routeGeometry, routeMaterial);
  world.add(route);

  const hardwareMaterial = trackMaterial(
    new THREE.MeshStandardMaterial({
      color: ink,
      metalness: 0.76,
      roughness: 0.3,
      transparent: true,
      opacity: 0
    })
  );
  const clamp = new THREE.Group();
  const barGeometry = trackGeometry(new THREE.BoxGeometry(0.13, 3.8, 0.18));
  const topGeometry = trackGeometry(new THREE.BoxGeometry(0.8, 0.13, 0.18));
  const clampBar = new THREE.Mesh(barGeometry, hardwareMaterial);
  const clampTop = new THREE.Mesh(topGeometry, hardwareMaterial);
  const clampBottom = new THREE.Mesh(topGeometry, hardwareMaterial);
  clampTop.position.set(-0.34, 1.84, 0);
  clampBottom.position.set(-0.34, -1.84, 0);
  clamp.add(clampBar, clampTop, clampBottom);
  clamp.position.set(2.78, 0, 0.18);
  world.add(clamp);

  const stampMaterial = trackMaterial(
    new THREE.MeshBasicMaterial({ color: stop, transparent: true, opacity: 0, side: THREE.DoubleSide })
  );
  const stamp = new THREE.Mesh(trackGeometry(new THREE.RingGeometry(0.5, 0.59, 48)), stampMaterial);
  stamp.position.set(1.25, -0.92, 0.25);
  stamp.rotation.z = -0.14;
  world.add(stamp);

  let stage = options.stage;
  let stageProgress = STAGE_INDEX[stage];
  let stageVelocity = 0;
  let motionMode = options.motionMode;
  let visible = true;
  let disposed = false;
  let elapsed = 0;
  let lastTime = 0;

  function updatePaper(progress: number): void {
    const lowerIndex = Math.min(1, Math.floor(progress));
    const localProgress = progress - lowerIndex;
    const from = lowerIndex === 0 ? compressed : opening;
    const to = lowerIndex === 0 ? opening : settled;
    const target = positions.array as Float32Array;

    for (let index = 0; index < target.length; index += 1) {
      target[index] = THREE.MathUtils.lerp(from[index], to[index], localProgress);
    }
    positions.needsUpdate = true;
  }

  function render(now = 0): void {
    const delta = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60;
    lastTime = now;
    if (motionMode === 'full') elapsed += delta;
    const targetProgress = STAGE_INDEX[stage];
    if (motionMode === 'reduced') {
      stageProgress = targetProgress;
      stageVelocity = 0;
    } else {
      // A bounded damped spring keeps the material transformation physical without overshooting
      // far enough to detach the selected semantic state from the visible sheet.
      const spring = 38;
      const damping = 11;
      stageVelocity += ((targetProgress - stageProgress) * spring - stageVelocity * damping) * delta;
      stageProgress = THREE.MathUtils.clamp(stageProgress + stageVelocity * delta, 0, 2);
    }
    updatePaper(stageProgress);

    const buildWeight = 1 - Math.min(1, Math.abs(stageProgress - 1));
    const controlWeight = THREE.MathUtils.clamp(stageProgress - 1, 0, 1);
    routeMaterial.opacity = buildWeight * 0.92;
    hardwareMaterial.opacity = controlWeight * 0.92;
    stampMaterial.opacity = controlWeight * 0.95;

    stamp.scale.setScalar(0.8 + controlWeight * 0.2);
    world.rotation.x = -0.08 + (motionMode === 'full' ? Math.sin(elapsed * 0.38) * 0.018 : 0);
    world.rotation.y = -0.2 + stageProgress * 0.08;
    world.rotation.z = 0.02 - stageProgress * 0.015;
    const wideCanvas = camera.aspect >= 1.05;
    const mapDistance = wideCanvas ? 5.75 : 7.2;
    const openedDistance = wideCanvas ? 7.45 : 9.1;
    camera.position.z = THREE.MathUtils.lerp(
      mapDistance,
      openedDistance,
      THREE.MathUtils.smoothstep(stageProgress, 0, 1)
    );
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  function syncLoop(): void {
    if (disposed) return;
    if (visible && motionMode === 'full') renderer.setAnimationLoop(render);
    else {
      renderer.setAnimationLoop(null);
      render(performance.now());
    }
  }

  const handle: PaperPressureRendererHandle = {
    setStage(nextStage) {
      stage = nextStage;
      if (motionMode === 'reduced') render(performance.now());
    },
    setMotionMode(nextMode) {
      motionMode = nextMode;
      syncLoop();
    },
    setVisible(nextVisible) {
      visible = nextVisible;
      lastTime = 0;
      syncLoop();
    },
    resize(width, height, pixelRatio) {
      if (!width || !height) return;
      renderer.setPixelRatio(Math.min(pixelRatio || 1, profile.maximumPixelRatio));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.set(0.25, 0.08, camera.aspect < 1.05 ? 7.2 : 5.75);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      render(performance.now());
    },
    renderStatic() {
      stageProgress = STAGE_INDEX[stage];
      stageVelocity = 0;
      render(performance.now());
    },
    getMetrics() {
      const drawCalls = renderer.info.render.calls;
      const geometries = renderer.info.memory.geometries;
      const textures = renderer.info.memory.textures;
      return {
        drawCalls,
        geometries,
        textures,
        pixelRatio: renderer.getPixelRatio(),
        profileId: profile.id,
        withinBudget:
          drawCalls <= profile.budgets.drawCalls &&
          geometries <= profile.budgets.geometries &&
          textures <= profile.budgets.textures
      };
    },
    dispose(forceContextLoss = true) {
      if (disposed) return;
      disposed = true;
      renderer.setAnimationLoop(null);
      geometryRegistry.forEach((geometry) => geometry.dispose());
      materialRegistry.forEach((material) => material.dispose());
      textureRegistry.forEach((texture) => texture.dispose());
      geometryRegistry.clear();
      materialRegistry.clear();
      textureRegistry.clear();
      scene.environment = null;
      renderer.dispose();
      if (forceContextLoss) renderer.forceContextLoss();
    }
  };

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.maximumPixelRatio));
  updatePaper(stageProgress);
  syncLoop();
  return handle;
}
