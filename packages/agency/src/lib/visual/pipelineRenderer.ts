import * as THREE from 'three';
import type { PublicProductId } from '$lib/data/productFamily';
import { derivePipelineSceneState, type PipelineValveState } from './pipelineSceneState';

export type PipelineMotionMode = 'full' | 'reduced';

export interface PipelineRendererMetrics {
  drawCalls: number;
  geometries: number;
  textures: number;
  pixelRatio: number;
}

export interface PipelineRendererHandle {
  setStage(stage: PublicProductId): void;
  setMotionMode(mode: PipelineMotionMode): void;
  setVisible(visible: boolean): void;
  resize(width: number, height: number, pixelRatio: number): void;
  renderStatic(): void;
  getMetrics(): PipelineRendererMetrics;
  dispose(): void;
}

export interface PipelineRendererOptions {
  stage: PublicProductId;
  motionMode: PipelineMotionMode;
  compact: boolean;
}

type ValveAssembly = {
  group: THREE.Group;
  blade: THREE.Group;
  ringMaterial: THREE.MeshStandardMaterial;
  bladeMaterial: THREE.MeshStandardMaterial;
  state: PipelineValveState;
};

const PIPE_START = -7;
const PIPE_END = 7;
const PIPE_LENGTH = PIPE_END - PIPE_START;
const VALVE_X = [-2.55, 1.05, 4.45];

function cssColor(host: HTMLElement, property: string, fallback: string): THREE.Color {
  const value = getComputedStyle(host).getPropertyValue(property).trim();
  return new THREE.Color(value || fallback);
}

function createSegment(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  radialSegments = 20
): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(end, start);
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    direction.length(),
    radialSegments,
    1,
    false
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function ease(current: number, target: number, delta: number, speed = 5): number {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-delta * speed));
}

export function createPipelineRenderer(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  options: PipelineRendererOptions
): PipelineRendererHandle {
  const signal = cssColor(host, '--waterway-signal', '#0057b8');
  const signalSoft = cssColor(host, '--waterway-signal-soft', '#dce8f5');
  const pressure = cssColor(host, '--waterway-pressure', '#e54800');
  const ready = cssColor(host, '--waterway-ready', '#007a4d');
  const review = cssColor(host, '--waterway-review', '#8b6b00');
  const court = cssColor(host, '--waterway-court', '#e6e6e0');
  const ink = cssColor(host, '--waterway-ink', '#090909');

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !options.compact,
    powerPreference: 'high-performance',
    premultipliedAlpha: true,
    failIfMajorPerformanceCaveat: true
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(options.compact ? 39 : 34, 1, 0.1, 60);
  camera.position.set(
    options.compact ? 0.3 : 0,
    options.compact ? 4.7 : 5.7,
    options.compact ? 15.5 : 16.8
  );
  camera.lookAt(0, -0.05, 0);

  const world = new THREE.Group();
  world.rotation.y = options.compact ? -0.04 : -0.09;
  scene.add(world);

  const ambient = new THREE.HemisphereLight(court, ink, 1.65);
  const key = new THREE.DirectionalLight(0xffffff, 3.6);
  key.position.set(-2, 7, 9);
  const rim = new THREE.DirectionalLight(signalSoft, 2.2);
  rim.position.set(7, 2, -5);
  scene.add(ambient, key, rim);

  const shellMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xb8bdc2,
    metalness: 0.82,
    roughness: 0.28,
    clearcoat: 0.48,
    clearcoatRoughness: 0.24,
    transparent: true,
    opacity: 0.94
  });
  const sleeveMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x33383d,
    metalness: 0.94,
    roughness: 0.22,
    transparent: true,
    opacity: 0.9
  });
  const inletMaterial = new THREE.MeshStandardMaterial({
    color: 0x7c858d,
    metalness: 0.78,
    roughness: 0.34
  });
  const flowMaterial = new THREE.MeshBasicMaterial({
    color: signal,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });

  const pipe = createSegment(
    new THREE.Vector3(PIPE_START, 0, 0),
    new THREE.Vector3(PIPE_END, 0, 0),
    0.46,
    shellMaterial,
    28
  );
  world.add(pipe);

  const flowGeometry = new THREE.CylinderGeometry(0.255, 0.255, 1, 24, 1, false);
  const flow = new THREE.Mesh(flowGeometry, flowMaterial);
  flow.rotation.z = Math.PI / 2;
  world.add(flow);

  for (const x of [-5.9, 5.9]) {
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.34, 28), sleeveMaterial);
    sleeve.rotation.z = Math.PI / 2;
    sleeve.position.x = x;
    world.add(sleeve);
  }

  const inletPaths = [
    [
      new THREE.Vector3(-7.8, 2.65, 0),
      new THREE.Vector3(-7.15, 2.65, 0),
      new THREE.Vector3(-7.15, 0.72, 0),
      new THREE.Vector3(-6.85, 0.24, 0)
    ],
    [new THREE.Vector3(-7.8, 0, 0), new THREE.Vector3(-6.85, 0, 0)],
    [
      new THREE.Vector3(-7.8, -2.65, 0),
      new THREE.Vector3(-7.15, -2.65, 0),
      new THREE.Vector3(-7.15, -0.72, 0),
      new THREE.Vector3(-6.85, -0.24, 0)
    ]
  ];
  for (const points of inletPaths) {
    for (let index = 0; index < points.length - 1; index += 1) {
      world.add(createSegment(points[index], points[index + 1], 0.22, inletMaterial, 18));
    }
  }

  const valveAssemblies: ValveAssembly[] = VALVE_X.map((x) => {
    const group = new THREE.Group();
    group.position.set(x, 0, 0);
    group.rotation.y = Math.PI / 2;

    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0x787f86,
      metalness: 0.86,
      roughness: 0.22,
      emissive: 0x000000,
      emissiveIntensity: 0
    });
    const bladeMaterial = ringMaterial.clone();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.085, 12, 32), ringMaterial);
    const blade = new THREE.Group();
    const bladeGeometry = new THREE.BoxGeometry(0.12, 1.03, 0.1);
    const bladeA = new THREE.Mesh(bladeGeometry, bladeMaterial);
    const bladeB = new THREE.Mesh(bladeGeometry, bladeMaterial);
    bladeA.rotation.z = Math.PI / 4;
    bladeB.rotation.z = -Math.PI / 4;
    blade.add(bladeA, bladeB);
    group.add(ring, blade);
    world.add(group);
    return { group, blade, ringMaterial, bladeMaterial, state: 'pending' as const };
  });

  const packetGeometry = new THREE.SphereGeometry(options.compact ? 0.085 : 0.105, 12, 8);
  const packetMaterial = new THREE.MeshBasicMaterial({
    color: signalSoft,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const safePacketMaterial = new THREE.MeshBasicMaterial({
    color: ready,
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const packets = Array.from({ length: options.compact ? 12 : 18 }, () => {
    const packet = new THREE.Mesh(packetGeometry, packetMaterial);
    packet.scale.set(2.8, 1, 1);
    world.add(packet);
    return packet;
  });

  const branchMaterial = new THREE.MeshBasicMaterial({
    color: review,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false
  });
  const branch = createSegment(
    new THREE.Vector3(3.55, -0.35, 0),
    new THREE.Vector3(3.55, -1.68, 0),
    0.09,
    branchMaterial,
    12
  );
  world.add(branch);

  const heldMaterial = new THREE.MeshStandardMaterial({
    color: review,
    emissive: review,
    emissiveIntensity: 1.1,
    metalness: 0.25,
    roughness: 0.28,
    transparent: true,
    opacity: 0
  });
  const heldPacket = new THREE.Mesh(new THREE.OctahedronGeometry(0.31, 0), heldMaterial);
  heldPacket.position.set(3.55, -1.82, 0);
  world.add(heldPacket);

  const safeFlowMaterial = new THREE.MeshBasicMaterial({
    color: ready,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const safeFlow = createSegment(
    new THREE.Vector3(3.55, 0, 0),
    new THREE.Vector3(6.72, 0, 0),
    0.285,
    safeFlowMaterial,
    20
  );
  world.add(safeFlow);

  const proofMaterial = new THREE.MeshBasicMaterial({
    color: ready,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const proofRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.055, 10, 40), proofMaterial);
  proofRing.position.set(6.65, 0, 0);
  proofRing.rotation.y = Math.PI / 2;
  world.add(proofRing);

  const outcomeMaterial = new THREE.MeshBasicMaterial({
    color: ready,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const outcome = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), outcomeMaterial);
  outcome.position.set(6.88, 0, 0);
  world.add(outcome);

  const grid = new THREE.GridHelper(20, 20, signal, 0x474b4f);
  grid.position.y = -2.9;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.2;
  world.add(grid);

  let state = derivePipelineSceneState(options.stage);
  let targetProgress = state.progress;
  let displayedProgress = options.motionMode === 'reduced' ? targetProgress : 0.02;
  let motionMode = options.motionMode;
  let visible = true;
  let disposed = false;
  let elapsed = 0;
  let lastTime = 0;

  const applyState = (delta: number, now: number) => {
    displayedProgress =
      motionMode === 'reduced'
        ? targetProgress
        : ease(displayedProgress, targetProgress, delta, 4.8);
    const flowLength = Math.max(0.08, PIPE_LENGTH * displayedProgress);
    flow.scale.set(1, flowLength, 1);
    flow.position.x = PIPE_START + flowLength / 2;

    valveAssemblies.forEach((assembly, index) => {
      const next = state.valves[index].state;
      assembly.state = next;
      const color =
        next === 'verified' ? ready : next === 'active' ? pressure : new THREE.Color(0x6f757b);
      assembly.ringMaterial.color.lerp(
        color,
        motionMode === 'reduced' ? 1 : Math.min(1, delta * 8)
      );
      assembly.bladeMaterial.color.copy(assembly.ringMaterial.color);
      assembly.ringMaterial.emissive.copy(
        next === 'active' ? pressure : next === 'verified' ? ready : ink
      );
      assembly.bladeMaterial.emissive.copy(assembly.ringMaterial.emissive);
      const pulse =
        next === 'active' && motionMode === 'full'
          ? 0.85 + Math.sin(now * 0.004) * 0.25
          : next === 'pending'
            ? 0.05
            : 0.45;
      assembly.ringMaterial.emissiveIntensity = pulse;
      assembly.bladeMaterial.emissiveIntensity = pulse * 0.72;
      const targetRotation = next === 'pending' ? Math.PI / 4 : next === 'active' ? Math.PI / 2 : 0;
      assembly.blade.rotation.z =
        motionMode === 'reduced'
          ? targetRotation
          : ease(assembly.blade.rotation.z, targetRotation, delta, 7);
    });

    packets.forEach((packet, index) => {
      const phase = (elapsed * 0.16 + index / packets.length) % 1;
      const x = PIPE_START + phase * PIPE_LENGTH;
      const withinFlow = x <= PIPE_START + PIPE_LENGTH * displayedProgress + 0.05;
      packet.position.set(x, Math.sin(index * 1.7) * 0.04, Math.cos(index * 1.3) * 0.08);
      packet.material = state.safeWorkContinues && x > 3.55 ? safePacketMaterial : packetMaterial;
      packet.visible = withinFlow;
    });

    const controlVisibility = state.protectedActionHeld ? 1 : 0;
    branchMaterial.opacity = ease(branchMaterial.opacity, controlVisibility * 0.68, delta, 6);
    heldMaterial.opacity = ease(heldMaterial.opacity, controlVisibility, delta, 6);
    safeFlowMaterial.opacity = ease(
      safeFlowMaterial.opacity,
      state.safeWorkContinues ? 0.52 : 0,
      delta,
      6
    );
    heldPacket.rotation.y = motionMode === 'full' ? now * 0.00055 : 0.45;
    const heldScale =
      controlVisibility * (motionMode === 'full' ? 1 + Math.sin(now * 0.003) * 0.08 : 1);
    heldPacket.scale.setScalar(heldScale);

    proofMaterial.opacity = ease(proofMaterial.opacity, state.proofVisible ? 0.82 : 0, delta, 6);
    outcomeMaterial.opacity = ease(
      outcomeMaterial.opacity,
      state.outcomeVisible ? 0.92 : 0,
      delta,
      6
    );
    const proofScale =
      state.proofVisible && motionMode === 'full' ? 1 + Math.sin(now * 0.0032) * 0.12 : 1;
    proofRing.scale.setScalar(proofScale);
    outcome.scale.setScalar(
      state.outcomeVisible && motionMode === 'full' ? 1 + Math.sin(now * 0.004) * 0.16 : 1
    );
    outcome.rotation.x = motionMode === 'full' ? now * 0.00035 : 0.3;
    outcome.rotation.y = motionMode === 'full' ? now * 0.0005 : 0.45;
  };

  const render = (now = 0) => {
    const delta = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60;
    lastTime = now;
    if (motionMode === 'full') elapsed += delta;
    applyState(delta, now);
    renderer.render(scene, camera);
  };

  const syncLoop = () => {
    if (disposed) return;
    if (visible && motionMode === 'full') renderer.setAnimationLoop(render);
    else {
      renderer.setAnimationLoop(null);
      render(performance.now());
    }
  };

  const handle: PipelineRendererHandle = {
    setStage(stage) {
      state = derivePipelineSceneState(stage);
      targetProgress = state.progress;
      if (motionMode === 'reduced') render(performance.now());
    },
    setMotionMode(mode) {
      motionMode = mode;
      if (mode === 'reduced') displayedProgress = targetProgress;
      syncLoop();
    },
    setVisible(nextVisible) {
      visible = nextVisible;
      lastTime = 0;
      syncLoop();
    },
    resize(width, height, pixelRatio) {
      if (!width || !height) return;
      const cappedPixelRatio = Math.min(pixelRatio || 1, options.compact ? 1.2 : 1.6);
      renderer.setPixelRatio(cappedPixelRatio);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render(performance.now());
    },
    renderStatic() {
      displayedProgress = targetProgress;
      render(performance.now());
    },
    getMetrics() {
      return {
        drawCalls: renderer.info.render.calls,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        pixelRatio: renderer.getPixelRatio()
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.setAnimationLoop(null);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        const objectMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        objectMaterials.forEach((material) => materials.add(material));
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
    }
  };

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.compact ? 1.2 : 1.6));
  syncLoop();
  return handle;
}
