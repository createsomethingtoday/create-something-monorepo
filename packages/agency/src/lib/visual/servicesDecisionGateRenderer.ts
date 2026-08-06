import * as THREE from 'three';

/**
 * Derived from the user-supplied Omma PaperHero export on 2026-08-05.
 *
 * The Agency version keeps its source-sheet, paper-stack, carbon-rail, and
 * authority-tab semantics while deliberately removing the export's macro
 * camera, post-process pass, device orientation, and continuous animation.
 * The canvas progressively enhances a static Paper fallback; it never owns
 * copy, proof, or the decision's meaning.
 */

export interface ServicesDecisionGateRendererMetrics {
  drawCalls: number;
  geometries: number;
  textures: number;
  pixelRatio: number;
  profileId: string;
  withinBudget: boolean;
}

export interface ServicesDecisionGateRendererHandle {
  dispose(forceContextLoss?: boolean): void;
  getMetrics(): ServicesDecisionGateRendererMetrics;
  renderStatic(): void;
  resize(width: number, height: number, pixelRatio: number): void;
  setVisible(visible: boolean): void;
}

interface ServicesDecisionGateRendererOptions {
  compact: boolean;
}

interface RenderProfile {
  antialias: boolean;
  id: 'services-decision-gate-compact-v1' | 'services-decision-gate-desktop-v1';
  maximumPixelRatio: number;
  shadowMapSize: number;
  textureSize: number;
}

function profileFor(compact: boolean): RenderProfile {
  return compact
    ? {
        antialias: false,
        id: 'services-decision-gate-compact-v1',
        maximumPixelRatio: 1.25,
        shadowMapSize: 512,
        textureSize: 96
      }
    : {
        antialias: true,
        id: 'services-decision-gate-desktop-v1',
        maximumPixelRatio: 1.5,
        shadowMapSize: 1024,
        textureSize: 144
      };
}

function seededNoise(index: number, seed: number): number {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function createPaperMaps(
  size: number,
  anisotropy: number
): { bump: THREE.CanvasTexture; roughness: THREE.CanvasTexture } {
  const paperCanvas = document.createElement('canvas');
  paperCanvas.width = size;
  paperCanvas.height = size;
  const context = paperCanvas.getContext('2d');

  if (!context) throw new Error('Paper texture context is unavailable.');

  context.fillStyle = '#f4f4f0';
  context.fillRect(0, 0, size, size);

  const image = context.getImageData(0, 0, size, size);
  for (let index = 0; index < image.data.length; index += 4) {
    const grain = Math.round((seededNoise(index, 20260805) - 0.5) * 14);
    image.data[index] = Math.min(255, Math.max(0, image.data[index] + grain));
    image.data[index + 1] = Math.min(255, Math.max(0, image.data[index + 1] + grain));
    image.data[index + 2] = Math.min(255, Math.max(0, image.data[index + 2] + grain));
  }
  context.putImageData(image, 0, 0);

  context.globalAlpha = 0.08;
  context.lineWidth = 0.45;
  for (let index = 0; index < size * 3; index += 1) {
    const x = seededNoise(index, 17) * size;
    const y = seededNoise(index, 23) * size;
    const length = 2 + seededNoise(index, 31) * 8;
    context.strokeStyle = seededNoise(index, 41) > 0.5 ? '#ffffff' : '#9ca0a2';
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + length, y + (seededNoise(index, 47) - 0.5) * 1.8);
    context.stroke();
  }
  context.globalAlpha = 1;

  const bump = new THREE.CanvasTexture(paperCanvas);
  bump.colorSpace = THREE.NoColorSpace;
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(5, 5);
  bump.anisotropy = anisotropy;
  bump.needsUpdate = true;

  const roughnessCanvas = document.createElement('canvas');
  roughnessCanvas.width = size;
  roughnessCanvas.height = size;
  const roughnessContext = roughnessCanvas.getContext('2d');
  if (!roughnessContext) throw new Error('Paper roughness context is unavailable.');

  roughnessContext.drawImage(paperCanvas, 0, 0);
  roughnessContext.globalAlpha = 0.54;
  roughnessContext.fillStyle = '#b8b8b4';
  roughnessContext.fillRect(0, 0, size, size);
  roughnessContext.globalAlpha = 1;

  const roughness = new THREE.CanvasTexture(roughnessCanvas);
  roughness.colorSpace = THREE.NoColorSpace;
  roughness.wrapS = THREE.RepeatWrapping;
  roughness.wrapT = THREE.RepeatWrapping;
  roughness.repeat.set(5, 5);
  roughness.anisotropy = anisotropy;
  roughness.needsUpdate = true;

  return { bump, roughness };
}

export function createServicesDecisionGateRenderer(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  options: ServicesDecisionGateRendererOptions
): ServicesDecisionGateRendererHandle {
  const profile = profileFor(options.compact);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const trackGeometry = <T extends THREE.BufferGeometry>(geometry: T): T => {
    geometries.add(geometry);
    return geometry;
  };
  const trackMaterial = <T extends THREE.Material>(material: T): T => {
    materials.add(material);
    return material;
  };
  const trackTexture = <T extends THREE.Texture>(texture: T): T => {
    textures.add(texture);
    return texture;
  };

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: profile.antialias,
    canvas,
    failIfMajorPerformanceCaveat: true,
    powerPreference: 'high-performance',
    premultipliedAlpha: true
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 48);
  const baseCamera = new THREE.Vector3();
  const baseTarget = new THREE.Vector3();
  const pointer = new THREE.Vector2();
  const root = new THREE.Group();
  scene.add(root);

  const maximumAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
  const { bump, roughness } = createPaperMaps(profile.textureSize, maximumAnisotropy);
  trackTexture(bump);
  trackTexture(roughness);

  const paper = trackMaterial(
    new THREE.MeshPhysicalMaterial({
      bumpMap: bump,
      bumpScale: 0.018,
      clearcoat: 0.04,
      clearcoatRoughness: 0.8,
      color: 0xf5f5f1,
      metalness: 0,
      roughness: 0.76,
      roughnessMap: roughness,
      sheen: 0.07,
      sheenColor: new THREE.Color(0xe6e7e2),
      sheenRoughness: 0.94
    })
  );
  const paperEdge = trackMaterial(
    new THREE.MeshPhysicalMaterial({
      color: 0xc8cbc9,
      metalness: 0,
      roughness: 0.88,
      sheen: 0.04,
      sheenRoughness: 1
    })
  );
  const carbon = trackMaterial(
    new THREE.MeshPhysicalMaterial({
      clearcoat: 0.25,
      clearcoatRoughness: 0.44,
      color: 0x121517,
      metalness: 0.62,
      roughness: 0.34
    })
  );
  const brass = trackMaterial(
    new THREE.MeshPhysicalMaterial({
      clearcoat: 0.32,
      clearcoatRoughness: 0.3,
      color: 0x8b7140,
      emissive: 0x251a06,
      emissiveIntensity: 0.14,
      metalness: 0.58,
      roughness: 0.34
    })
  );
  const deck = trackMaterial(
    new THREE.MeshStandardMaterial({
      color: 0x151719,
      metalness: 0.18,
      roughness: 0.52
    })
  );

  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(-4.8, 8.4, 6.6);
  key.castShadow = true;
  key.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
  key.shadow.camera.left = -4.8;
  key.shadow.camera.right = 4.8;
  key.shadow.camera.top = 4.8;
  key.shadow.camera.bottom = -4.8;
  key.shadow.camera.near = 0.4;
  key.shadow.camera.far = 24;
  key.shadow.bias = -0.00035;
  key.shadow.normalBias = 0.006;

  const fill = new THREE.HemisphereLight(0xe9ece9, 0x080a0b, 1.14);
  const rim = new THREE.DirectionalLight(0xd1d7d2, 1.42);
  rim.position.set(5.1, 3.2, -6.8);
  const tabLight = new THREE.PointLight(0x9b7d45, 0.58, 3.2, 2);
  tabLight.position.set(4.1, 0.72, -1.28);
  scene.add(key, fill, rim, tabLight, key.target);

  const deckPlane = new THREE.Mesh(trackGeometry(new THREE.PlaneGeometry(4.8, 6.7)), deck);
  deckPlane.position.set(3.25, -0.08, -0.58);
  deckPlane.rotation.x = -Math.PI / 2;
  deckPlane.receiveShadow = true;
  root.add(deckPlane);

  const sheetGeometry = trackGeometry(new THREE.BoxGeometry(2.08, 0.035, 2.58, 18, 1, 18));
  const sourceSheet = new THREE.Mesh(sheetGeometry, paper);
  sourceSheet.position.set(1.78, 0.07, 0.38);
  sourceSheet.rotation.y = 0.12;
  sourceSheet.rotation.z = -0.035;
  sourceSheet.castShadow = true;
  sourceSheet.receiveShadow = true;
  root.add(sourceSheet);

  const packet = new THREE.Group();
  const packetGeometry = trackGeometry(new THREE.BoxGeometry(1.88, 0.03, 2.26, 16, 1, 16));
  for (let index = 0; index < 7; index += 1) {
    const sheet = new THREE.Mesh(packetGeometry, index === 0 ? paperEdge : paper);
    sheet.position.set((index - 3) * 0.018, index * 0.043, (index - 3) * 0.012);
    sheet.rotation.y = 0.05 + index * 0.004;
    sheet.castShadow = true;
    sheet.receiveShadow = true;
    packet.add(sheet);
  }
  packet.position.set(3.28, 0.01, -0.08);
  packet.rotation.y = -0.1;
  root.add(packet);

  const heldSheet = new THREE.Mesh(sheetGeometry, paper);
  heldSheet.position.set(4.37, 0.27, -0.62);
  heldSheet.rotation.y = -0.18;
  heldSheet.rotation.z = 0.06;
  heldSheet.castShadow = true;
  heldSheet.receiveShadow = true;
  root.add(heldSheet);

  const rail = new THREE.Group();
  const railBar = new THREE.Mesh(trackGeometry(new THREE.BoxGeometry(2.65, 0.16, 0.13)), carbon);
  railBar.position.set(3.25, 0.57, -1.5);
  railBar.castShadow = true;
  rail.add(railBar);

  const tickGeometry = trackGeometry(new THREE.BoxGeometry(0.018, 0.22, 0.024));
  for (let index = 0; index < 15; index += 1) {
    const tick = new THREE.Mesh(tickGeometry, carbon);
    tick.position.set(2 + index * 0.18, 0.71, -1.48);
    rail.add(tick);
  }

  const authorityTab = new THREE.Mesh(trackGeometry(new THREE.BoxGeometry(0.36, 0.1, 0.11)), brass);
  authorityTab.position.set(4.25, 0.66, -1.42);
  authorityTab.castShadow = true;
  rail.add(authorityTab);

  const authorityPin = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(0.028, 0.028, 0.13, 24)), brass);
  authorityPin.position.set(4.25, 0.7, -1.34);
  authorityPin.rotation.x = Math.PI / 2;
  rail.add(authorityPin);
  root.add(rail);

  let visible = true;
  let disposed = false;
  let pointerListenerAttached = false;

  function configureCamera(width: number, height: number): void {
    const portrait = options.compact || width < 760;
    const compact = portrait || width / Math.max(height, 1) < 1.2;
    camera.aspect = Math.max(width / Math.max(height, 1), 0.35);

    if (portrait) {
      camera.fov = 38;
      baseCamera.set(4.45, 5.1, 12.6);
      baseTarget.set(1.7, 1.35, -0.25);
      root.scale.setScalar(0.48);
      root.position.set(0.12, -0.1, 0.28);
    } else if (compact) {
      camera.fov = 36;
      baseCamera.set(4.45, 4.6, 12.6);
      baseTarget.set(-0.6, 1.35, -0.25);
      root.scale.setScalar(0.44);
      root.position.set(0.12, -0.1, 0.28);
    } else {
      camera.fov = 32;
      baseCamera.set(5.2, 3.8, 11.6);
      baseTarget.set(0.9, 0.18, -0.24);
      root.scale.setScalar(1);
      root.position.set(0, -0.1, 0);
    }
    key.target.position.copy(baseTarget).add(root.position);
    key.target.updateMatrixWorld();
    camera.updateProjectionMatrix();
  }

  function render(): void {
    if (disposed || !visible) return;
    camera.position.set(
      baseCamera.x + pointer.x * 0.085,
      baseCamera.y - pointer.y * 0.05,
      baseCamera.z - Math.abs(pointer.x) * 0.04
    );
    camera.lookAt(
      baseTarget.x + root.position.x + pointer.x * 0.03,
      baseTarget.y - pointer.y * 0.018,
      baseTarget.z + root.position.z
    );
    renderer.render(scene, camera);
  }

  function onPointerMove(event: PointerEvent): void {
    if (!visible || disposed) return;
    const bounds = canvas.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    ) {
      if (pointer.lengthSq() > 0) {
        pointer.set(0, 0);
        render();
      }
      return;
    }

    pointer.set(
      THREE.MathUtils.clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1),
      THREE.MathUtils.clamp(((event.clientY - bounds.top) / bounds.height) * 2 - 1, -1, 1)
    );
    render();
  }

  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    pointerListenerAttached = true;
  }

  function resize(width: number, height: number, pixelRatio: number): void {
    if (disposed || width <= 0 || height <= 0) return;
    renderer.setPixelRatio(Math.min(Math.max(pixelRatio, 1), profile.maximumPixelRatio));
    renderer.setSize(width, height, false);
    configureCamera(width, height);
    renderStatic();
  }

  function renderStatic(): void {
    pointer.set(0, 0);
    render();
  }

  function setVisible(nextVisible: boolean): void {
    visible = nextVisible;
    if (visible) renderStatic();
  }

  function getMetrics(): ServicesDecisionGateRendererMetrics {
    const drawCalls = renderer.info.render.calls;
    const textureCount = Math.max(renderer.info.memory.textures, textures.size);
    const geometryCount = Math.max(renderer.info.memory.geometries, geometries.size);
    const pixelRatio = renderer.getPixelRatio();

    return {
      drawCalls,
      geometries: geometryCount,
      pixelRatio,
      profileId: profile.id,
      textures: textureCount,
      withinBudget:
        drawCalls <= 32 &&
        geometryCount <= 20 &&
        textureCount <= 6 &&
        pixelRatio <= profile.maximumPixelRatio
    };
  }

  function dispose(forceContextLoss = true): void {
    if (disposed) return;
    disposed = true;
    if (pointerListenerAttached) {
      window.removeEventListener('pointermove', onPointerMove);
    }
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    renderer.renderLists.dispose();
    renderer.dispose();
    if (forceContextLoss) renderer.forceContextLoss();
    scene.clear();
  }

  return { dispose, getMetrics, renderStatic, resize, setVisible };
}
