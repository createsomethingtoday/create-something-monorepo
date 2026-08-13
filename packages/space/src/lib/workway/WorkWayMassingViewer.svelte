<script lang="ts">
  import { onMount } from 'svelte';
  import {
    AmbientLight,
    BufferGeometry,
    Color,
    DirectionalLight,
    DoubleSide,
    EdgesGeometry,
    Float32BufferAttribute,
    Group,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshStandardMaterial,
    PerspectiveCamera,
    Scene,
    SRGBColorSpace,
    WebGLRenderer
  } from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

  import {
    toThreeMassingVector,
    type WorkWayMassingGeometry,
    type WorkWayMassingGuide,
    type WorkWayMassingVertex
  } from './threshold-dwelling-massing';

  let {
    geometry,
    guide
  }: {
    geometry: WorkWayMassingGeometry;
    guide: WorkWayMassingGuide;
  } = $props();

  type Disposable = { dispose: () => void };

  const initialCameraPosition = { x: 14.6, y: 12.4, z: 17.2 };
  const initialCameraTarget = { x: 0, y: 1.15, z: 0 };

  let canvas: HTMLCanvasElement;
  let renderer: WebGLRenderer | undefined;
  let scene: Scene | undefined;
  let camera: PerspectiveCamera | undefined;
  let controls: OrbitControls | undefined;
  let massingGroup: Group | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let massingResources: Disposable[] = [];
  let rendererUnavailable = $state(false);

  function createSurfaceGeometry(vertices: readonly WorkWayMassingVertex[]): BufferGeometry {
    const positions = vertices.flatMap((vertex) => {
      const position = toThreeMassingVector(vertex, guide);
      return [position.xM, position.yM, position.zM];
    });
    const surfaceGeometry = new BufferGeometry();
    surfaceGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    surfaceGeometry.setIndex([0, 1, 2, 0, 2, 3]);
    surfaceGeometry.computeVertexNormals();
    return surfaceGeometry;
  }

  function render() {
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function disposeMassing() {
    for (const resource of massingResources) resource.dispose();
    massingResources = [];
    if (massingGroup && scene) scene.remove(massingGroup);
    massingGroup = undefined;
  }

  function addSurface(
    group: Group,
    surface: WorkWayMassingGeometry['floors'][number] | WorkWayMassingGeometry['walls'][number],
    kind: 'floor' | 'wall',
    opacity: number
  ) {
    const surfaceGeometry = createSurfaceGeometry(surface.vertices);
    const material = new MeshStandardMaterial({
      color: new Color(surface.materialColor),
      roughness: kind === 'floor' ? 0.86 : 0.72,
      metalness: 0,
      transparent: true,
      opacity,
      side: DoubleSide
    });
    const mesh = new Mesh(surfaceGeometry, material);
    mesh.userData = {
      entityId: surface.id,
      materialId: surface.materialId,
      materialSelectionStatus: surface.materialSelectionStatus,
      surfaceKind: kind
    };
    group.add(mesh);

    const edgeGeometry = new EdgesGeometry(surfaceGeometry, 20);
    const edgeMaterial = new LineBasicMaterial({
      color: kind === 'wall' && 'exterior' in surface && surface.exterior ? '#fff6db' : '#f0f0e8',
      transparent: true,
      opacity: kind === 'wall' ? 0.78 : 0.26
    });
    const edges = new LineSegments(edgeGeometry, edgeMaterial);
    edges.userData = mesh.userData;
    group.add(edges);

    massingResources.push(surfaceGeometry, material, edgeGeometry, edgeMaterial);
  }

  function rebuildMassing() {
    if (!scene) return;
    disposeMassing();

    const group = new Group();
    group.name = 'threshold-dwelling-r08-plan-derived-massing';
    group.userData = {
      coordinateTruth: 'revised-plan-horizontal-only',
      verticalStatus: guide.dimensions.verticalStatus,
      constructionReady: false
    };

    for (const floor of geometry.floors) {
      addSurface(group, floor, 'floor', floor.type === 'open' ? 0.78 : 0.67);
    }
    for (const wall of geometry.walls) {
      addSurface(group, wall, 'wall', wall.exterior ? 0.93 : 0.64);
    }

    scene.add(group);
    massingGroup = group;
    render();
  }

  function resizeAndRender() {
    if (!canvas || !renderer || !camera) return;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(bounds.width, bounds.height, false);
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
    render();
  }

  function resetCamera() {
    if (!camera || !controls) return;
    camera.position.set(
      initialCameraPosition.x,
      initialCameraPosition.y,
      initialCameraPosition.z
    );
    controls.target.set(initialCameraTarget.x, initialCameraTarget.y, initialCameraTarget.z);
    controls.update();
    render();
  }

  function adjustZoom(amount: number) {
    if (!camera || !controls) return;
    const distance = camera.position.distanceTo(controls.target);
    const scale = amount < 0 ? 1.16 : 0.84;
    const nextDistance = Math.min(
      controls.maxDistance,
      Math.max(controls.minDistance, distance * scale)
    );
    camera.position
      .sub(controls.target)
      .setLength(nextDistance)
      .add(controls.target);
    controls.update();
    render();
  }

  $effect(() => {
    geometry;
    guide;
    rebuildMassing();
  });

  onMount(() => {
    try {
      scene = new Scene();
      scene.background = new Color('#11130f');

      camera = new PerspectiveCamera(36, 1, 0.1, 100);
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
      renderer.outputColorSpace = SRGBColorSpace;

      scene.add(new AmbientLight('#f1ebdc', 1.85));
      const sun = new DirectionalLight('#ffe5ba', 2.7);
      sun.position.set(7, 14, 9);
      scene.add(sun);
      const fill = new DirectionalLight('#b7cae0', 0.9);
      fill.position.set(-10, 5, -8);
      scene.add(fill);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false;
      controls.enablePan = false;
      controls.minDistance = 4.5;
      controls.maxDistance = 32;
      controls.minPolarAngle = Math.PI * 0.14;
      controls.maxPolarAngle = Math.PI * 0.47;
      controls.addEventListener('change', render);
      resetCamera();
      rebuildMassing();

      resizeObserver = new ResizeObserver(resizeAndRender);
      resizeObserver.observe(canvas);
      resizeAndRender();
    } catch {
      rendererUnavailable = true;
    }

    return () => {
      resizeObserver?.disconnect();
      controls?.dispose();
      disposeMassing();
      renderer?.dispose();
    };
  });
</script>

<section class="massing-viewer" aria-label="Interactive 3D design-intent massing guide">
  <div class="canvas-shell">
    <canvas
      bind:this={canvas}
      aria-label="Interactive Three.js massing guide based on the Threshold Dwelling Rev 0.8 floor plan"
      data-renderer="threejs"
      data-testid="massing-canvas"
    ></canvas>
    <div class="canvas-stamp">
      <p>Horizontal geometry</p>
      <strong>{guide.dimensions.widthIn / 12} ft × {guide.dimensions.depthIn / 12} ft</strong>
      <span>direct plan-derived mesh · meter render space</span>
      <p class="material-contract" title={guide.materialContract.scheduleId}>Material schedule · Rev 0.8</p>
      <span>material roles codified · products unselected</span>
    </div>
    {#if rendererUnavailable}
      <p class="renderer-notice">
        This browser cannot initialize the Three.js guide. The exact 2D plan and downloadable GLB remain available.
      </p>
    {/if}
  </div>

  <div class="viewer-footer">
    <p>
      Orbit or pinch to inspect plan-derived floors and walls. The {guide.dimensions.verticalMassingHeightIn / 12} ft vertical mass is illustrative only.
    </p>
    <div class="controls" aria-label="3D massing controls">
      <button type="button" onclick={() => adjustZoom(-0.1)} aria-label="Zoom out">−</button>
      <button type="button" onclick={resetCamera}>Reset view</button>
      <button type="button" onclick={() => adjustZoom(0.1)} aria-label="Zoom in">+</button>
    </div>
  </div>
</section>

<style>
  .massing-viewer {
    display: grid;
    min-height: 25rem;
    overflow: hidden;
    border: 1px solid #5a594f;
    background: #11130f;
  }

  .canvas-shell {
    position: relative;
    min-height: 22rem;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 22rem;
    cursor: grab;
    touch-action: none;
  }

  canvas:active {
    cursor: grabbing;
  }

  .canvas-stamp {
    position: absolute;
    right: 0.85rem;
    bottom: 0.85rem;
    display: grid;
    gap: 0.15rem;
    max-width: 15rem;
    padding: 0.65rem 0.7rem;
    border: 1px solid rgba(228, 222, 204, 0.3);
    background: rgba(17, 19, 15, 0.86);
    color: #e6e2d5;
  }

  .canvas-stamp p,
  .canvas-stamp span,
  .viewer-footer p {
    margin: 0;
  }

  .canvas-stamp p {
    color: #cbc7ba;
    font: 0.64rem ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .canvas-stamp strong {
    font: 0.95rem ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .canvas-stamp span {
    color: #b7b6ac;
    font-size: 0.7rem;
  }

  .canvas-stamp .material-contract {
    margin-top: 0.34rem;
  }

  .renderer-notice {
    position: absolute;
    inset: auto 0.85rem 0.85rem 0.85rem;
    max-width: 35rem;
    margin: 0;
    padding: 0.7rem;
    border: 1px solid #a96b4b;
    background: rgba(30, 20, 15, 0.94);
    color: #f1ddd0;
    font-size: 0.76rem;
    line-height: 1.45;
  }

  .viewer-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 0.85rem;
    border-top: 1px solid #41433a;
    color: #b8b6aa;
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .viewer-footer p {
    max-width: 54rem;
  }

  .controls {
    display: flex;
    flex: 0 0 auto;
    gap: 0.35rem;
  }

  .controls button {
    border: 1px solid #6c6b60;
    background: transparent;
    color: #e7e3d8;
    font: 0.7rem ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .controls button:hover {
    border-color: #d5b66a;
    color: #f2cb72;
  }

  @media (max-width: 44rem) {
    .viewer-footer {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
