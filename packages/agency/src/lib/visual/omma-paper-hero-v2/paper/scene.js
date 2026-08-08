// @ts-nocheck -- Omma v2 runtime mirror; visual source preserved.
// Scene controller. One WebGL context, explicit lifecycle:
// pause / resume / resize / context loss / dispose.

import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Color,
  Mesh,
  PlaneGeometry,
  ACESFilmicToneMapping,
  SRGBColorSpace,
  PCFSoftShadowMap,
  MathUtils,
  Vector3
} from 'three';
import { createMaterials, disposeMaterials, PALETTE } from './materials.js';
import { buildScene, disposeBuilt } from './states.js';
import { createLighting } from './lighting.js';
import { pickRig, solveRig, RIGS } from './rigs.js';

const MAX_PARALLAX_DEG = 0.55; // hard cap, under the 0.6° budget

export function createPaperScene(container, options = {}) {
  const {
    seed = 20514,
    spread = 1.0,
    parallax = true,
    reducedMotion = false
  } = options;

  const state = {
    disposed: false,
    running: false,
    contextLost: false,
    rig: RIGS.desktop,
    pointer: { x: 0, y: 0 },
    smoothed: { x: 0, y: 0 }
  };

  const scene = new Scene();
  scene.background = new Color(PALETTE.field);

  const camera = new PerspectiveCamera(33, 1, 0.02, 20);
  camera.name = 'surveyCamera';

  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.setClearColor(PALETTE.field, 1);
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';

  const materials = createMaterials(seed);
  const built = buildScene(materials, seed);

  // Deterministic static spread — scales the lateral separation between the
  // three states without moving any of them out of the object field.
  const spreadClamped = MathUtils.clamp(spread, 0.85, 1.2);
  built.source.position.x *= spreadClamped;
  built.source.position.z *= spreadClamped;
  built.packet.position.z *= spreadClamped;

  scene.add(built.root);

  // Deck plane: same field value, receives the contact shadows. Kept tight so
  // no shadow can travel into a protected mask.
  const deckGeo = new PlaneGeometry(2.6, 1.9);
  const deck = new Mesh(deckGeo, materials.deckMat);
  deck.name = 'instrumentDeck';
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = -0.0006;
  deck.receiveShadow = true;
  scene.add(deck);

  const clusterCenter = new Vector3();
  built.root.updateWorldMatrix(true, true);

  const lighting = createLighting(scene, built.contact.clone().setY(0.02));

  let solved = null;
  let baseQuat = null;

  function applyRig(width, height) {
    const rig = pickRig(width, height);
    state.rig = rig;
    solved = solveRig(camera, built.root, rig, width, height);
    baseQuat = camera.quaternion.clone();
    clusterCenter.copy(solved.center);
    const dpr = Math.min(window.devicePixelRatio || 1, rig.dpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
  }

  function resize() {
    if (state.disposed) return;
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    applyRig(w, h);
    render();
  }

  // Pointer parallax: rotation only, capped, never translates geometry, so
  // it cannot push an object into a protected mask.
  function onPointerMove(e) {
    if (!parallax || reducedMotion) return;
    const rect = container.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    state.pointer.x = MathUtils.clamp(nx, -1, 1);
    state.pointer.y = MathUtils.clamp(ny, -1, 1);
    if (!state.running) requestRender();
  }

  function onPointerLeave() {
    state.pointer.x = 0;
    state.pointer.y = 0;
    if (!state.running) requestRender();
  }

  let rafId = 0;
  let pendingRender = false;

  function requestRender() {
    if (pendingRender || state.disposed) return;
    pendingRender = true;
    requestAnimationFrame(() => {
      pendingRender = false;
      tick();
    });
  }

  function tick() {
    if (state.disposed || state.contextLost) return;
    const target = reducedMotion ? { x: 0, y: 0 } : state.pointer;
    state.smoothed.x += (target.x - state.smoothed.x) * 0.075;
    state.smoothed.y += (target.y - state.smoothed.y) * 0.075;

    if (baseQuat) {
      const maxRad = MathUtils.degToRad(MAX_PARALLAX_DEG);
      camera.quaternion.copy(baseQuat);
      camera.rotateY(-state.smoothed.x * maxRad);
      camera.rotateX(-state.smoothed.y * maxRad * 0.6);
    }
    render();
  }

  function render() {
    if (state.disposed || state.contextLost) return;
    renderer.render(scene, camera);
  }

  function loop() {
    if (!state.running || state.disposed) return;
    rafId = requestAnimationFrame(loop);
    tick();
  }

  function resume() {
    if (state.running || state.disposed || reducedMotion) {
      if (reducedMotion) render();
      return;
    }
    state.running = true;
    rafId = requestAnimationFrame(loop);
  }

  function pause() {
    state.running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function onContextLost(e) {
    e.preventDefault();
    state.contextLost = true;
    pause();
  }

  function onContextRestored() {
    state.contextLost = false;
    resize();
    if (!reducedMotion) resume();
    else render();
  }

  const canvas = renderer.domElement;
  canvas.addEventListener('webglcontextlost', onContextLost, false);
  canvas.addEventListener('webglcontextrestored', onContextRestored, false);

  if (parallax && !reducedMotion) {
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);
  }

  let ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => resize());
    ro.observe(container);
  }

  resize();
  render();

  function dispose() {
    if (state.disposed) return;
    state.disposed = true;
    pause();
    if (ro) ro.disconnect();
    container.removeEventListener('pointermove', onPointerMove);
    container.removeEventListener('pointerleave', onPointerLeave);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
    lighting.dispose();
    disposeBuilt(built);
    deckGeo.dispose();
    disposeMaterials(materials);
    scene.clear();
    renderer.dispose();
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }

  return {
    scene,
    camera,
    renderer,
    built,
    get rig() {
      return state.rig.name;
    },
    resize,
    pause,
    resume,
    render,
    dispose
  };
}
