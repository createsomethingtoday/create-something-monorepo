import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

const root = document.documentElement;
const stage = document.querySelector('.stage');
const fallbackImage = document.querySelector('#render-fallback');
const status = document.querySelector('#runtime-status');
const recipeField = document.querySelector('#receipt-recipe');
const backendField = document.querySelector('#receipt-backend');
const budgetField = document.querySelector('#receipt-budget');
const receiptJson = document.querySelector('#render-receipt-json');
const parameters = new URLSearchParams(location.search);
const forceFallback = parameters.get('noWebgl') === '1';
const captureMode = parameters.get('capture') === '1';
const forceReducedMotion = parameters.get('motion') === 'reduce';
const testContextLoss = parameters.get('testContextLoss') === '1';
const reducedMotion = forceReducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
const startedAt = performance.now();

window.__CS_RENDER_LAB__ = {
  state: 'loading',
  backend: null,
  fallback: { available: true, active: false, reason: null },
  animationActive: false,
  reducedMotion,
  captureMode
};

function publishReceipt(receipt = {}) {
  const serializable = {
    state: window.__CS_RENDER_LAB__.state,
    backend: window.__CS_RENDER_LAB__.backend,
    recipeHash: window.__CS_RENDER_LAB__.recipeHash,
    durationMs: window.__CS_RENDER_LAB__.durationMs,
    render: window.__CS_RENDER_LAB__.render,
    budgets: window.__CS_RENDER_LAB__.budgets,
    fallback: window.__CS_RENDER_LAB__.fallback,
    animationActive: window.__CS_RENDER_LAB__.animationActive,
    reducedMotion,
    reducedMotionSource: forceReducedMotion ? 'test-override' : 'media-query',
    captureMode,
    ...receipt
  };
  receiptJson.textContent = JSON.stringify(serializable);
  root.dataset.renderState = serializable.state;
  root.dataset.renderBackend = serializable.backend ?? 'pending';
  root.dataset.animationActive = String(Boolean(serializable.animationActive));
  root.dataset.reducedMotion = String(reducedMotion);
  root.dataset.fallbackReason = serializable.fallback?.reason ?? '';
}

function setState(state, message) {
  root.dataset.renderState = state;
  status.textContent = message;
  window.__CS_RENDER_LAB__.state = state;
  publishReceipt();
}

function activateFallback(reason) {
  window.__CS_RENDER_LAB__.fallback = { available: true, active: true, reason };
  window.__CS_RENDER_LAB__.backend = 'static-fallback';
  backendField.textContent = 'Static fallback';
  setState('fallback', reason === 'context-lost' ? 'Context protected' : 'Static proof');
}

function color(value) {
  return new THREE.Color(value);
}

function materialFrom(source, options) {
  const material = source?.clone?.() ?? new THREE.MeshPhysicalMaterial();
  material.color = color(options.color);
  material.roughness = options.roughness;
  material.metalness = options.metalness;
  if ('clearcoat' in material) material.clearcoat = options.clearcoat ?? 0;
  if ('clearcoatRoughness' in material) {
    material.clearcoatRoughness = options.clearcoatRoughness ?? 0.5;
  }
  if (material.normalMap) material.normalScale = new THREE.Vector2(0.38, 0.38);
  material.needsUpdate = true;
  return material;
}

function roleForMesh(mesh) {
  const name = `${mesh.name} ${mesh.material?.name ?? ''}`.toLowerCase();
  if (name.includes('markng') || name.includes('marking')) return 'line';
  if (name.includes('concrete')) return 'court';
  if (name.includes('rope')) return 'rope';
  if (name.includes('hoop')) return 'structure';
  return 'hidden';
}

function sceneMetrics(model) {
  let drawCalls = 0;
  let triangles = 0;
  const textures = new Set();
  model.traverse((object) => {
    if (!object.isMesh || !object.visible) return;
    drawCalls += Array.isArray(object.material) ? object.material.length : 1;
    const geometry = object.geometry;
    triangles += geometry.index
      ? Math.floor(geometry.index.count / 3)
      : Math.floor((geometry.attributes.position?.count ?? 0) / 3);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const key of [
        'map',
        'normalMap',
        'roughnessMap',
        'metalnessMap',
        'alphaMap',
        'aoMap',
        'emissiveMap'
      ]) {
        if (material?.[key]) textures.add(material[key]);
      }
    }
  });
  return { drawCalls, triangles, textures: textures.size };
}

function budgetResult(recipe, metrics, sourceBytes) {
  const checks = {
    sourceBytes: sourceBytes <= recipe.budgets.maxSourceBytes,
    triangles: metrics.triangles <= recipe.budgets.maxTriangles,
    drawCalls: metrics.drawCalls <= recipe.budgets.maxDrawCalls,
    textures: metrics.textures <= recipe.budgets.maxTextures
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}

try {
  const response = await fetch('/recipe.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Recipe request failed: ${response.status}`);
  const { recipe, recipeHash, inspection } = await response.json();
  recipeField.textContent = recipeHash.slice(0, 12);
  window.__CS_RENDER_LAB__.recipe = recipe;
  window.__CS_RENDER_LAB__.recipeHash = recipeHash;
  window.__CS_RENDER_LAB__.inspection = inspection;

  if (forceFallback) {
    const budgets = budgetResult(recipe, { drawCalls: 0, triangles: 0, textures: 0 }, inspection.byteLength);
    window.__CS_RENDER_LAB__.render = { drawCalls: 0, triangles: 0, textures: 0, sourceBytes: inspection.byteLength };
    window.__CS_RENDER_LAB__.budgets = budgets;
    budgetField.textContent = budgets.pass ? 'Pass' : 'Review';
    activateFallback('forced-no-webgl');
  } else {
    const scene = new THREE.Scene();
    scene.background = color(recipe.style.background);
    scene.fog = new THREE.FogExp2(recipe.style.background, 0.018);

    const stageSize = () => ({
      width: Math.max(1, stage.clientWidth),
      height: Math.max(1, stage.clientHeight)
    });
    const initialStageSize = stageSize();
    const camera = new THREE.PerspectiveCamera(
      34,
      initialStageSize.width / initialStageSize.height,
      0.02,
      160
    );
    camera.setFocalLength(recipe.shot.focalLengthMm);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, recipe.output.pixelRatioCap));
    renderer.setSize(initialStageSize.width, initialStageSize.height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = recipe.style.exposure;
    stage.append(renderer.domElement);

    RectAreaLightUniformsLib.init();
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(recipe.asset.browserUri);
    const model = gltf.scene;
    scene.add(model);
    model.updateMatrixWorld(true);

    const roles = { structure: [], rope: [], court: [], line: [] };
    model.traverse((object) => {
      if (!object.isMesh) return;
      const role = roleForMesh(object);
      object.castShadow = true;
      object.receiveShadow = true;
      if (role === 'hidden') {
        object.visible = false;
        return;
      }
      roles[role].push(object);
      if (role === 'structure') {
        object.material = materialFrom(object.material, {
          color: recipe.style.structure,
          roughness: 0.29,
          metalness: 0.54,
          clearcoat: 0.3,
          clearcoatRoughness: 0.22
        });
      } else if (role === 'rope') {
        object.material = materialFrom(object.material, {
          color: recipe.style.line,
          roughness: 0.72,
          metalness: 0
        });
      } else if (role === 'court') {
        object.material = materialFrom(object.material, {
          color: recipe.style.court,
          roughness: 0.78,
          metalness: 0.02,
          clearcoat: 0.04,
          clearcoatRoughness: 0.9
        });
      } else {
        object.material = materialFrom(object.material, {
          color: recipe.style.line,
          roughness: 0.64,
          metalness: 0
        });
        object.material.transparent = true;
      }
    });

    if (!roles.structure.length || !roles.court.length) {
      throw new Error(
        `Scene roles unresolved: structure=${roles.structure.length}, court=${roles.court.length}`
      );
    }

    model.updateMatrixWorld(true);
    const hoopBox = new THREE.Box3();
    [...roles.structure, ...roles.rope].forEach((mesh) => hoopBox.expandByObject(mesh));
    const courtBox = new THREE.Box3();
    [...roles.court, ...roles.line].forEach((mesh) => courtBox.expandByObject(mesh));
    const courtCenter = courtBox.getCenter(new THREE.Vector3());
    const courtSize = courtBox.getSize(new THREE.Vector3());
    const longAxis = courtSize.z >= courtSize.x ? 'z' : 'x';
    const hoopAnchor = courtCenter.clone();
    if (longAxis === 'z') hoopAnchor.z = courtBox.max.z - courtSize.z * 0.075;
    else hoopAnchor.x = courtBox.max.x - courtSize.x * 0.075;
    hoopAnchor.y = hoopBox.max.y * 0.72;
    const towardCourt = courtCenter.clone().sub(hoopAnchor).setY(0).normalize();
    const side = new THREE.Vector3(-towardCourt.z, 0, towardCourt.x);
    const up = new THREE.Vector3(0, 1, 0);

    const [forwardOffset, sideOffset, upOffset] = recipe.shot.position;
    const [targetForward, targetSide, targetUp] = recipe.shot.target;
    const target = hoopAnchor
      .clone()
      .addScaledVector(towardCourt, targetForward)
      .addScaledVector(side, targetSide)
      .addScaledVector(up, targetUp);
    const subjectTarget = hoopAnchor.clone().addScaledVector(up, 0.12);
    camera.position
      .copy(hoopAnchor)
      .addScaledVector(towardCourt, forwardOffset)
      .addScaledVector(side, sideOffset)
      .addScaledVector(up, upOffset);
    camera.lookAt(target);

    const receipt = new THREE.Mesh(
      new RoundedBoxGeometry(1.72, 0.055, 1.05, 5, 0.045),
      new THREE.MeshPhysicalMaterial({
        color: recipe.style.line,
        roughness: 0.62,
        clearcoat: 0.04,
        clearcoatRoughness: 0.7
      })
    );
    receipt.name = 'CS_ATTACHED_RECEIPT';
    receipt.position
      .copy(courtCenter)
      .addScaledVector(towardCourt, 2.7)
      .addScaledVector(side, 1.15);
    receipt.position.y = courtBox.max.y + 0.06;
    receipt.rotation.y = Math.atan2(towardCourt.x, towardCourt.z);
    receipt.castShadow = true;
    receipt.receiveShadow = true;
    scene.add(receipt);

    const proof = new THREE.Mesh(
      new RoundedBoxGeometry(0.16, 0.024, 0.92, 4, 0.012),
      new THREE.MeshPhysicalMaterial({
        color: recipe.style.proof,
        roughness: 0.42,
        metalness: 0.12,
        clearcoat: 0.18
      })
    );
    proof.position.copy(receipt.position).addScaledVector(side, 0.72);
    proof.position.y += 0.05;
    proof.rotation.y = receipt.rotation.y;
    proof.castShadow = true;
    scene.add(proof);

    scene.add(new THREE.HemisphereLight(0xb6c6df, 0x080a09, 0.5));
    const configureLight = (light, position) => {
      light.position.copy(position);
      light.lookAt(subjectTarget);
      scene.add(light);
      return light;
    };
    configureLight(
      new THREE.RectAreaLight(0xffd6ac, 78, 4.8, 4.8),
      subjectTarget.clone().addScaledVector(towardCourt, 2).addScaledVector(side, 3.5).addScaledVector(up, 4.7)
    );
    configureLight(
      new THREE.RectAreaLight(0x1e62ff, 52, 2.4, 3),
      subjectTarget.clone().addScaledVector(towardCourt, -2.8).addScaledVector(side, -2.2).addScaledVector(up, 2.8)
    );
    configureLight(
      new THREE.RectAreaLight(0xe2ebff, 32, 5.5, 4.5),
      subjectTarget.clone().addScaledVector(towardCourt, 1.2).addScaledVector(side, -4).addScaledVector(up, 1.4)
    );
    const shadowKey = new THREE.SpotLight(0xffe4c7, 138, 40, Math.PI / 5, 0.65, 1.4);
    shadowKey.position.copy(subjectTarget).addScaledVector(towardCourt, 2).addScaledVector(side, 3.5).addScaledVector(up, 4.7);
    shadowKey.target.position.copy(subjectTarget);
    shadowKey.castShadow = true;
    shadowKey.shadow.mapSize.set(2048, 2048);
    shadowKey.shadow.bias = -0.00008;
    scene.add(shadowKey, shadowKey.target);

    composer.addPass(
      new BokehPass(scene, camera, {
        focus: recipe.shot.focusDistance,
        aperture: recipe.shot.aperture,
        maxblur: 0.006,
        width: initialStageSize.width,
        height: initialStageSize.height
      })
    );

    let frame = 0;
    let animationFrame = null;
    const baseReceiptRotation = receipt.rotation.y;
    const render = (time = 0) => {
      if (window.__CS_RENDER_LAB__.animationActive) {
        const phase = (time % recipe.motion.periodMs) / recipe.motion.periodMs;
        receipt.rotation.y = baseReceiptRotation + Math.sin(phase * Math.PI * 2) * recipe.motion.amplitude;
      }
      composer.render();
      frame += 1;
      if (window.__CS_RENDER_LAB__.animationActive) animationFrame = requestAnimationFrame(render);
    };

    const metrics = sceneMetrics(model);
    metrics.drawCalls += 2;
    metrics.triangles += 84;
    const budgets = budgetResult(recipe, metrics, inspection.byteLength);
    const backend = renderer.capabilities.isWebGL2 ? 'webgl2' : 'webgl1';
    renderer.domElement.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault();
        if (animationFrame) cancelAnimationFrame(animationFrame);
        window.__CS_RENDER_LAB__.animationActive = false;
        activateFallback('context-lost');
      },
      false
    );

    window.__CS_RENDER_LAB__.animationActive = Boolean(
      recipe.motion.enabled && !reducedMotion && !captureMode
    );
    render(0);
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    if (!window.__CS_RENDER_LAB__.animationActive) render(0);

    try {
      fallbackImage.src = renderer.domElement.toDataURL('image/png');
    } catch {
      // The authored SVG remains the fallback if the drawing buffer cannot be copied.
    }

    window.__CS_RENDER_LAB__ = {
      ...window.__CS_RENDER_LAB__,
      state: 'ready',
      backend,
      durationMs: Math.round(performance.now() - startedAt),
      render: { ...metrics, sourceBytes: inspection.byteLength },
      budgets,
      fallback: { available: true, active: false, reason: null },
      roles: Object.fromEntries(Object.entries(roles).map(([key, meshes]) => [key, meshes.map((mesh) => mesh.name)])),
      frame,
      loseContext() {
        const gl = renderer.getContext();
        const extension = gl.getExtension('WEBGL_lose_context');
        if (!extension) return false;
        extension.loseContext();
        return true;
      }
    };
    backendField.textContent = backend.toUpperCase();
    budgetField.textContent = budgets.pass ? 'Pass' : 'Review';
    setState('ready', 'Render ready');
    publishReceipt({
      inspection,
      roles: window.__CS_RENDER_LAB__.roles,
      camera: {
        position: camera.position.toArray(),
        target: target.toArray(),
        focalLengthMm: camera.getFocalLength(),
        near: camera.near,
        far: camera.far
      },
      bounds: {
        hoop: { min: hoopBox.min.toArray(), max: hoopBox.max.toArray() },
        court: { min: courtBox.min.toArray(), max: courtBox.max.toArray() },
        longAxis,
        hoopAnchor: hoopAnchor.toArray()
      }
    });

    if (testContextLoss) {
      setTimeout(() => {
        window.__CS_RENDER_LAB__.loseContext();
      }, 120);
    }

    addEventListener('resize', () => {
      const nextStageSize = stageSize();
      camera.aspect = nextStageSize.width / nextStageSize.height;
      camera.updateProjectionMatrix();
      renderer.setSize(nextStageSize.width, nextStageSize.height);
      composer.setSize(nextStageSize.width, nextStageSize.height);
      if (!window.__CS_RENDER_LAB__.animationActive) render(0);
    });
  }
} catch (error) {
  console.error(error);
  window.__CS_RENDER_LAB__.error = error instanceof Error ? error.message : String(error);
  activateFallback('render-error');
  setState('error', 'Render fallback');
}
