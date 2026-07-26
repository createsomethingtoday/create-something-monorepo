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

/**
 * Normalised (0-1) canvas-space anchor for one policy gate. DOM labels consume these
 * so a card never drifts away from — or sits on top of — the valve it names.
 */
export interface PipelineMarker {
  id: PublicProductId;
  x: number;
  y: number;
  visible: boolean;
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
  onmarkers?: (markers: PipelineMarker[]) => void;
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
const PIPE_RADIUS = 0.46;
const VALVE_X = [-2.55, 1.05, 4.45];
const STAGE_IDS: PublicProductId[] = ['map', 'build', 'control'];

/**
 * The channel is cut open toward the camera. A sealed tube hides the flow, the packets,
 * and the valve blades — everything the scene is about. A cutaway keeps the shell opaque
 * (no transparent sort ambiguity) while exposing the governed interior.
 */
const CUTAWAY_CENTER = -Math.PI / 4;
const CUTAWAY_ARC = THREE.MathUtils.degToRad(96);
const SHELL_THETA_START = CUTAWAY_CENTER + CUTAWAY_ARC / 2;
const SHELL_THETA_LENGTH = Math.PI * 2 - CUTAWAY_ARC;

/** World extents that must stay in frame, so framing follows the container instead of one tuned aspect. */
const FRAME_WIDTH = 16.4;
const FRAME_HEIGHT = 7.4;
const FRAME_PADDING = 1.04;
const VIEW_DIRECTION = new THREE.Vector3(0, 0.34, 1).normalize();
const VIEW_TARGET = new THREE.Vector3(0, -0.05, 0);

const PENDING_VALVE_COLOR = new THREE.Color(0x6f757b);
const MARKER_HEIGHT = 0.92;
const ZERO_SCALE = new THREE.Vector3(0, 0, 0);

function cssColor(host: HTMLElement, property: string, fallback: string): THREE.Color {
  const value = getComputedStyle(host).getPropertyValue(property).trim();
  if (!value) return new THREE.Color(fallback);
  try {
    return new THREE.Color(value);
  } catch {
    // Modern CSS colour syntax (oklch, color-mix) is not parseable by THREE.Color.
    return new THREE.Color(fallback);
  }
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

  const geometryRegistry = new Set<THREE.BufferGeometry>();
  const materialRegistry = new Set<THREE.Material>();
  const textureRegistry = new Set<THREE.Texture>();

  function trackGeometry<T extends THREE.BufferGeometry>(geometry: T): T {
    geometryRegistry.add(geometry);
    return geometry;
  }

  function trackMaterial<T extends THREE.Material>(material: T): T {
    materialRegistry.add(material);
    return material;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !options.compact,
    powerPreference: 'high-performance',
    premultipliedAlpha: true,
    failIfMajorPerformanceCaveat: true
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(ink.getHex(), 20, 44);

  const camera = new THREE.PerspectiveCamera(options.compact ? 39 : 34, 1, 0.1, 60);

  /**
   * Machined metal with no environment to reflect resolves to flat grey. A small procedural
   * gradient probe (bright softbox band above, court horizon, ink floor) gives the shell and
   * valves something to reflect for the cost of one 4x64 texture.
   */
  const environmentTexture = (() => {
    const width = 4;
    const height = 64;
    const data = new Uint8Array(width * height * 4);
    const colour = new THREE.Color();
    const floorColour = ink.clone().lerp(court, 0.08);
    const horizonColour = ink.clone().lerp(court, 0.34);
    const skyColour = court.clone().lerp(signalSoft, 0.42);

    for (let row = 0; row < height; row += 1) {
      const v = row / (height - 1);
      if (v < 0.5) colour.copy(floorColour).lerp(horizonColour, v / 0.5);
      else colour.copy(horizonColour).lerp(skyColour, (v - 0.5) / 0.5);

      const softbox = Math.exp(-((v - 0.84) ** 2) / 0.0022) * 0.9;
      const r = Math.min(1, colour.r + softbox);
      const g = Math.min(1, colour.g + softbox);
      const b = Math.min(1, colour.b + softbox);

      for (let column = 0; column < width; column += 1) {
        const offset = (row * width + column) * 4;
        data[offset] = Math.round(r * 255);
        data[offset + 1] = Math.round(g * 255);
        data[offset + 2] = Math.round(b * 255);
        data[offset + 3] = 255;
      }
    }

    const gradient = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
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
  scene.environmentIntensity = 0.62;

  const world = new THREE.Group();
  world.rotation.y = options.compact ? -0.04 : -0.09;
  scene.add(world);

  const ambient = new THREE.HemisphereLight(court, ink, 0.52);
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(-2, 7, 9);
  const rim = new THREE.DirectionalLight(signalSoft, 1.05);
  rim.position.set(7, 2, -5);
  scene.add(ambient, key, rim);

  function createSegment(
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
    material: THREE.Material,
    radialSegments = 20,
    thetaStart?: number,
    thetaLength?: number
  ): THREE.Mesh {
    const direction = new THREE.Vector3().subVectors(end, start);
    const geometry = trackGeometry(
      new THREE.CylinderGeometry(
        radius,
        radius,
        direction.length(),
        radialSegments,
        1,
        thetaLength !== undefined,
        thetaStart ?? 0,
        thetaLength ?? Math.PI * 2
      )
    );
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
  }

  const shellMaterial = trackMaterial(
    new THREE.MeshPhysicalMaterial({
      color: 0xb8bdc2,
      metalness: 0.82,
      roughness: 0.26,
      clearcoat: 0.48,
      clearcoatRoughness: 0.24,
      side: THREE.DoubleSide
    })
  );
  const sleeveMaterial = trackMaterial(
    new THREE.MeshPhysicalMaterial({
      color: 0x33383d,
      metalness: 0.94,
      roughness: 0.22
    })
  );
  const inletMaterial = trackMaterial(
    new THREE.MeshStandardMaterial({
      color: 0x7c858d,
      metalness: 0.78,
      roughness: 0.34
    })
  );
  const flowMaterial = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: signal,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false
    })
  );

  const pipe = createSegment(
    new THREE.Vector3(PIPE_START, 0, 0),
    new THREE.Vector3(PIPE_END, 0, 0),
    PIPE_RADIUS,
    shellMaterial,
    40,
    SHELL_THETA_START,
    SHELL_THETA_LENGTH
  );
  world.add(pipe);

  const flowGeometry = trackGeometry(new THREE.CylinderGeometry(0.3, 0.3, 1, 24, 1, false));
  const flow = new THREE.Mesh(flowGeometry, flowMaterial);
  flow.rotation.z = Math.PI / 2;
  flow.renderOrder = 2;
  world.add(flow);

  const sleeveGeometry = trackGeometry(new THREE.CylinderGeometry(0.58, 0.58, 0.34, 32));
  for (const x of [-5.9, 5.9]) {
    const sleeve = new THREE.Mesh(sleeveGeometry, sleeveMaterial);
    sleeve.rotation.z = Math.PI / 2;
    sleeve.position.x = x;
    world.add(sleeve);
  }

  // Three typed inputs tap one header, then converge into one controlled line.
  const header = createSegment(
    new THREE.Vector3(-7.55, -2.92, 0),
    new THREE.Vector3(-7.55, 2.92, 0),
    0.2,
    inletMaterial,
    18
  );
  world.add(header);

  const inletPaths = [
    [
      new THREE.Vector3(-7.55, 2.65, 0),
      new THREE.Vector3(-7.02, 2.65, 0),
      new THREE.Vector3(-7.02, 0.55, 0),
      new THREE.Vector3(-6.58, 0.05, 0)
    ],
    [new THREE.Vector3(-7.55, 0, 0), new THREE.Vector3(-6.52, 0, 0)],
    [
      new THREE.Vector3(-7.55, -2.65, 0),
      new THREE.Vector3(-7.02, -2.65, 0),
      new THREE.Vector3(-7.02, -0.55, 0),
      new THREE.Vector3(-6.58, -0.05, 0)
    ]
  ];
  const elbowGeometry = trackGeometry(new THREE.SphereGeometry(0.2, 14, 10));
  for (const points of inletPaths) {
    for (let index = 0; index < points.length - 1; index += 1) {
      world.add(createSegment(points[index], points[index + 1], 0.2, inletMaterial, 16));
      // Fillet the corners so the inlets read as plumbing rather than detached arms.
      if (index > 0) {
        const elbow = new THREE.Mesh(elbowGeometry, inletMaterial);
        elbow.position.copy(points[index]);
        world.add(elbow);
      }
    }
  }

  const valveRingGeometry = trackGeometry(new THREE.TorusGeometry(0.72, 0.085, 14, 40));
  const valveBladeGeometry = trackGeometry(new THREE.BoxGeometry(0.12, 0.96, 0.1));
  const valveAssemblies: ValveAssembly[] = VALVE_X.map((x) => {
    const group = new THREE.Group();
    group.position.set(x, 0, 0);
    group.rotation.y = Math.PI / 2;

    const ringMaterial = trackMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x787f86,
        metalness: 0.86,
        roughness: 0.22,
        emissive: 0x000000,
        emissiveIntensity: 0
      })
    );
    const bladeMaterial = trackMaterial(ringMaterial.clone());
    const ring = new THREE.Mesh(valveRingGeometry, ringMaterial);
    const blade = new THREE.Group();
    const bladeA = new THREE.Mesh(valveBladeGeometry, bladeMaterial);
    const bladeB = new THREE.Mesh(valveBladeGeometry, bladeMaterial);
    bladeA.rotation.z = Math.PI / 4;
    bladeB.rotation.z = -Math.PI / 4;
    blade.add(bladeA, bladeB);
    group.add(ring, blade);
    world.add(group);
    return { group, blade, ringMaterial, bladeMaterial, state: 'pending' as const };
  });

  /**
   * One InstancedMesh instead of one mesh per packet: a single draw call, and per-instance
   * colour carries the "safe work continues" state that used to require swapping materials.
   */
  const packetCount = options.compact ? 18 : 30;
  const packetGeometry = trackGeometry(
    new THREE.SphereGeometry(options.compact ? 0.085 : 0.105, 12, 8)
  );
  const packetMaterial = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false
    })
  );
  const packets = new THREE.InstancedMesh(packetGeometry, packetMaterial, packetCount);
  packets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  packets.frustumCulled = false;
  packets.renderOrder = 3;
  for (let index = 0; index < packetCount; index += 1) packets.setColorAt(index, signalSoft);
  world.add(packets);
  const packetMatrix = new THREE.Matrix4();
  const packetPosition = new THREE.Vector3();
  const packetScale = new THREE.Vector3(2.8, 1, 1);
  const packetQuaternion = new THREE.Quaternion();
  const packetColour = new THREE.Color();

  const branchMaterial = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: review,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      fog: false
    })
  );
  const branch = createSegment(
    new THREE.Vector3(3.55, -0.35, 0),
    new THREE.Vector3(3.55, -1.68, 0),
    0.09,
    branchMaterial,
    12
  );
  world.add(branch);

  const heldMaterial = trackMaterial(
    new THREE.MeshStandardMaterial({
      color: review,
      emissive: review,
      emissiveIntensity: 1.1,
      metalness: 0.25,
      roughness: 0.28,
      transparent: true,
      opacity: 0
    })
  );
  const heldPacket = new THREE.Mesh(
    trackGeometry(new THREE.OctahedronGeometry(0.31, 0)),
    heldMaterial
  );
  heldPacket.position.set(3.55, -1.82, 0);
  world.add(heldPacket);

  const safeFlowMaterial = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: ready,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false
    })
  );
  const safeFlow = createSegment(
    new THREE.Vector3(3.55, 0, 0),
    new THREE.Vector3(6.72, 0, 0),
    0.31,
    safeFlowMaterial,
    20
  );
  safeFlow.renderOrder = 2;
  world.add(safeFlow);

  const proofMaterial = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: ready,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false
    })
  );
  const proofRing = new THREE.Mesh(
    trackGeometry(new THREE.TorusGeometry(0.62, 0.055, 12, 44)),
    proofMaterial
  );
  proofRing.position.set(6.65, 0, 0);
  proofRing.rotation.y = Math.PI / 2;
  proofRing.renderOrder = 3;
  world.add(proofRing);

  const outcomeMaterial = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: ready,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false
    })
  );
  const outcome = new THREE.Mesh(
    trackGeometry(new THREE.IcosahedronGeometry(0.22, 1)),
    outcomeMaterial
  );
  outcome.position.set(6.88, 0, 0);
  outcome.renderOrder = 3;
  world.add(outcome);

  const grid = new THREE.GridHelper(26, 26, signal, 0x474b4f);
  grid.position.y = -2.9;
  const gridMaterial = grid.material as THREE.Material;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.17;
  trackGeometry(grid.geometry);
  trackMaterial(gridMaterial);
  world.add(grid);

  /** A light pool under the channel: contact grounding without paying for a shadow map. */
  const groundGlowTexture = (() => {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    const red = Math.round(signal.r * 255);
    const green = Math.round(signal.g * 255);
    const blue = Math.round(signal.b * 255);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const nx = (x / (size - 1)) * 2 - 1;
        const ny = (y / (size - 1)) * 2 - 1;
        const falloff = Math.max(0, 1 - Math.sqrt(nx * nx + ny * ny));
        const offset = (y * size + x) * 4;
        data[offset] = red;
        data[offset + 1] = green;
        data[offset + 2] = blue;
        data[offset + 3] = Math.round(falloff ** 2.2 * 255);
      }
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    textureRegistry.add(texture);
    return texture;
  })();

  const groundGlow = new THREE.Mesh(
    trackGeometry(new THREE.PlaneGeometry(17, 5.6)),
    trackMaterial(
      new THREE.MeshBasicMaterial({
        map: groundGlowTexture,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: false
      })
    )
  );
  groundGlow.rotation.x = -Math.PI / 2;
  groundGlow.position.y = -2.87;
  groundGlow.renderOrder = 1;
  world.add(groundGlow);

  let state = derivePipelineSceneState(options.stage);
  let targetProgress = state.progress;
  let displayedProgress = options.motionMode === 'reduced' ? targetProgress : 0.02;
  let motionMode = options.motionMode;
  let visible = true;
  let disposed = false;
  let elapsed = 0;
  let lastTime = 0;

  const markerVector = new THREE.Vector3();

  function fitCamera(aspect: number): void {
    camera.aspect = aspect;
    const fovY = THREE.MathUtils.degToRad(camera.fov);
    const fovX = 2 * Math.atan(Math.tan(fovY / 2) * aspect);
    const distanceForHeight = FRAME_HEIGHT / 2 / Math.tan(fovY / 2);
    const distanceForWidth = FRAME_WIDTH / 2 / Math.tan(fovX / 2);
    const distance = Math.max(distanceForHeight, distanceForWidth) * FRAME_PADDING;
    camera.position.copy(VIEW_TARGET).addScaledVector(VIEW_DIRECTION, distance);
    camera.lookAt(VIEW_TARGET);
    camera.updateProjectionMatrix();
  }

  function emitMarkers(): void {
    if (!options.onmarkers) return;
    scene.updateMatrixWorld();
    options.onmarkers(
      VALVE_X.map((x, index) => {
        markerVector.set(x, MARKER_HEIGHT, 0);
        world.localToWorld(markerVector);
        markerVector.project(camera);
        return {
          id: STAGE_IDS[index],
          x: (markerVector.x + 1) / 2,
          y: (1 - markerVector.y) / 2,
          visible: markerVector.z > -1 && markerVector.z < 1
        };
      })
    );
  }

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
      const color = next === 'verified' ? ready : next === 'active' ? pressure : PENDING_VALVE_COLOR;
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

    let colourDirty = false;
    for (let index = 0; index < packetCount; index += 1) {
      const phase = (elapsed * 0.16 + index / packetCount) % 1;
      const x = PIPE_START + phase * PIPE_LENGTH;
      const withinFlow = x <= PIPE_START + PIPE_LENGTH * displayedProgress + 0.05;
      packetPosition.set(x, Math.sin(index * 1.7) * 0.04, Math.cos(index * 1.3) * 0.08);
      packetMatrix.compose(
        packetPosition,
        packetQuaternion,
        withinFlow ? packetScale : ZERO_SCALE
      );
      packets.setMatrixAt(index, packetMatrix);

      const target = state.safeWorkContinues && x > 3.55 ? ready : signalSoft;
      if (packets.instanceColor) {
        packetColour.fromBufferAttribute(packets.instanceColor, index);
        if (!packetColour.equals(target)) {
          packets.setColorAt(index, target);
          colourDirty = true;
        }
      }
    }
    packets.instanceMatrix.needsUpdate = true;
    if (colourDirty && packets.instanceColor) packets.instanceColor.needsUpdate = true;

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
      fitCamera(width / height);
      render(performance.now());
      emitMarkers();
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
      packets.dispose();
      geometryRegistry.forEach((geometry) => geometry.dispose());
      materialRegistry.forEach((material) => material.dispose());
      textureRegistry.forEach((texture) => texture.dispose());
      geometryRegistry.clear();
      materialRegistry.clear();
      textureRegistry.clear();
      scene.environment = null;
      renderer.dispose();
      renderer.forceContextLoss();
    }
  };

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.compact ? 1.2 : 1.6));
  fitCamera(1);
  syncLoop();
  return handle;
}
