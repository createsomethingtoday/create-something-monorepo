<script lang="ts">
  import { onMount } from 'svelte';
  import {
    AmbientLight,
    BufferGeometry,
    CanvasTexture,
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
    RepeatWrapping,
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
  import {
    THRESHOLD_DWELLING_DEFERRED_MATERIAL_STUDY_ROLES,
    THRESHOLD_DWELLING_MATERIAL_STUDIES,
    resolveThresholdDwellingMaterialStudy,
    type WorkWayMaterialStudy
  } from './threshold-dwelling-material-study';

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
  let materialStudyEnabled = $state(true);

  function createSurfaceGeometry(
    vertices: readonly WorkWayMassingVertex[],
    kind: 'floor' | 'wall',
    textureScaleM: number
  ): BufferGeometry {
    const renderVertices = vertices.map((vertex) => toThreeMassingVector(vertex, guide));
    const positions = renderVertices.flatMap((position) => {
      return [position.xM, position.yM, position.zM];
    });
    const wallLengthM = Math.hypot(
      renderVertices[1].xM - renderVertices[0].xM,
      renderVertices[1].zM - renderVertices[0].zM
    );
    const wallHeightM = Math.abs(renderVertices[2].yM - renderVertices[1].yM);
    const uvs =
      kind === 'floor'
        ? renderVertices.flatMap((position) => [position.xM / textureScaleM, position.zM / textureScaleM])
        : [0, 0, wallLengthM / textureScaleM, 0, wallLengthM / textureScaleM, wallHeightM / textureScaleM, 0, wallHeightM / textureScaleM];
    const surfaceGeometry = new BufferGeometry();
    surfaceGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    surfaceGeometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    surfaceGeometry.setIndex([0, 1, 2, 0, 2, 3]);
    surfaceGeometry.computeVertexNormals();
    return surfaceGeometry;
  }

  function seededRandom(seed: number) {
    let state = seed >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
    };
  }

  function materialStudyTexture(study: WorkWayMaterialStudy): CanvasTexture | undefined {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 384;
    textureCanvas.height = 384;
    const context = textureCanvas.getContext('2d');
    if (!context) return undefined;
    const random = seededRandom(
      [...study.materialId].reduce((total, character) => total + character.charCodeAt(0), 0)
    );

    switch (study.recipe) {
      case 'polished-concrete-mottle': {
        context.fillStyle = '#d1cec4';
        context.fillRect(0, 0, 384, 384);
        for (let index = 0; index < 420; index += 1) {
          const size = 1 + random() * 4;
          context.fillStyle = `rgba(55, 55, 51, ${0.018 + random() * 0.055})`;
          context.beginPath();
          context.arc(random() * 384, random() * 384, size, 0, Math.PI * 2);
          context.fill();
        }
        context.strokeStyle = 'rgba(74, 71, 64, 0.13)';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(0, 192);
        context.lineTo(384, 192);
        context.stroke();
        break;
      }
      case 'large-format-porcelain-grid': {
        context.fillStyle = '#e0ddd1';
        context.fillRect(0, 0, 384, 384);
        context.strokeStyle = 'rgba(88, 84, 75, 0.28)';
        context.lineWidth = 3;
        for (let offset = 0; offset <= 384; offset += 192) {
          context.beginPath();
          context.moveTo(offset, 0);
          context.lineTo(offset, 384);
          context.moveTo(0, offset);
          context.lineTo(384, offset);
          context.stroke();
        }
        for (let index = 0; index < 120; index += 1) {
          context.fillStyle = `rgba(79, 74, 68, ${0.01 + random() * 0.025})`;
          context.fillRect(random() * 384, random() * 384, 1, 1);
        }
        break;
      }
      case 'mineral-rainscreen-panels': {
        context.fillStyle = '#c4c2b7';
        context.fillRect(0, 0, 384, 384);
        context.strokeStyle = 'rgba(64, 63, 57, 0.36)';
        context.lineWidth = 4;
        for (let offset = 0; offset <= 384; offset += 96) {
          context.beginPath();
          context.moveTo(offset, 0);
          context.lineTo(offset, 384);
          context.stroke();
        }
        for (let index = 0; index < 180; index += 1) {
          context.fillStyle = `rgba(63, 62, 57, ${0.01 + random() * 0.035})`;
          context.fillRect(random() * 384, random() * 384, 1 + random() * 2, 1);
        }
        break;
      }
      case 'gypsum-mineral-finish': {
        context.fillStyle = '#e4e1d5';
        context.fillRect(0, 0, 384, 384);
        for (let index = 0; index < 260; index += 1) {
          context.fillStyle = `rgba(87, 84, 77, ${0.008 + random() * 0.018})`;
          context.fillRect(random() * 384, random() * 384, 1, 1);
        }
        break;
      }
    }

    const texture = new CanvasTexture(textureCanvas);
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.anisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy() ?? 1, 4);
    return texture;
  }

  function materialStudyParameters(study: WorkWayMaterialStudy | undefined) {
    switch (study?.recipe) {
      case 'polished-concrete-mottle':
        return { roughness: 0.42, metalness: 0.03, textureScaleM: 2.4 };
      case 'large-format-porcelain-grid':
        return { roughness: 0.26, metalness: 0.01, textureScaleM: 0.6 };
      case 'mineral-rainscreen-panels':
        return { roughness: 0.8, metalness: 0, textureScaleM: 1.2 };
      case 'gypsum-mineral-finish':
        return { roughness: 0.93, metalness: 0, textureScaleM: 1.8 };
      default:
        return { roughness: 0.78, metalness: 0, textureScaleM: 1 };
    }
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
    const study = materialStudyEnabled
      ? resolveThresholdDwellingMaterialStudy(surface.materialId)
      : undefined;
    const studyParameters = materialStudyParameters(study);
    const texture = study ? materialStudyTexture(study) : undefined;
    const surfaceGeometry = createSurfaceGeometry(
      surface.vertices,
      kind,
      studyParameters.textureScaleM
    );
    const material = new MeshStandardMaterial({
      color: new Color(surface.materialColor),
      map: texture,
      roughness: studyParameters.roughness,
      metalness: studyParameters.metalness,
      transparent: true,
      opacity,
      side: DoubleSide
    });
    const mesh = new Mesh(surfaceGeometry, material);
    mesh.userData = {
      entityId: surface.id,
      materialId: surface.materialId,
      materialSelectionStatus: surface.materialSelectionStatus,
      surfaceKind: kind,
      materialStudy: study
        ? {
            recipe: study.recipe,
            visualSource: study.visualSource,
            productStatus: study.productStatus
          }
        : null
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
    if (texture) massingResources.push(texture);
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
    materialStudyEnabled;
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
      <button
        type="button"
        class:active={materialStudyEnabled}
        aria-pressed={materialStudyEnabled}
        onclick={() => (materialStudyEnabled = !materialStudyEnabled)}
      >
        Material study: {materialStudyEnabled ? 'on' : 'off'}
      </button>
      <button type="button" onclick={() => adjustZoom(-0.1)} aria-label="Zoom out">−</button>
      <button type="button" onclick={resetCamera}>Reset view</button>
      <button type="button" onclick={() => adjustZoom(0.1)} aria-label="Zoom in">+</button>
    </div>
  </div>

  <section class="material-study-panel" aria-label="Material study" data-testid="material-study-panel">
    <div>
      <p class="study-label">Material study / procedural source</p>
      <h3>Plan-bound visual roles</h3>
      <p>
        These are deterministic Three.js texture recipes generated from the current role schedule. They are not manufacturer assets, selected products, thicknesses, or performance claims.
      </p>
    </div>
    <ul>
      {#each THRESHOLD_DWELLING_MATERIAL_STUDIES as study}
        <li data-material-id={study.materialId}>
          <strong>{study.materialName}</strong>
          <span>{study.materialId} · {study.recipe.replaceAll('-', ' ')}</span>
        </li>
      {/each}
    </ul>
    <details>
      <summary>Deferred roles · {THRESHOLD_DWELLING_DEFERRED_MATERIAL_STUDY_ROLES.length} not drawn</summary>
      <p>
        Cedar, glass, structural concrete and steel, casework, roof/trim, terrace, and grade roles remain visible in the schedule but have no issued 3D geometry in this revision.
      </p>
      <ul>
        {#each THRESHOLD_DWELLING_DEFERRED_MATERIAL_STUDY_ROLES as role}
          <li data-material-id={role.materialId}>
            <strong>{role.materialName}</strong>
            <span>{role.materialId} · {role.reason}</span>
          </li>
        {/each}
      </ul>
    </details>
  </section>
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

  .controls button.active {
    border-color: #d5b66a;
    background: #d5b66a;
    color: #25251f;
  }

  .material-study-panel {
    display: grid;
    grid-template-columns: minmax(14rem, 1.3fr) minmax(15rem, 1fr);
    gap: 0.9rem 1.25rem;
    padding: 0.9rem;
    border-top: 1px solid #41433a;
    background: #171915;
  }

  .material-study-panel p,
  .material-study-panel h3 {
    margin: 0;
  }

  .study-label {
    margin-bottom: 0.28rem !important;
    color: #b8b5a8;
    font: 0.63rem ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .material-study-panel h3 {
    color: #e7e2d4;
    font: 1rem Georgia, 'Times New Roman', serif;
  }

  .material-study-panel > div > p:last-child,
  .material-study-panel details > p {
    margin-top: 0.45rem;
    color: #aaa89d;
    font-size: 0.73rem;
    line-height: 1.45;
  }

  .material-study-panel > ul,
  .material-study-panel details ul {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .material-study-panel li {
    display: grid;
    gap: 0.1rem;
    padding: 0.42rem 0;
    border-top: 1px solid #35372f;
  }

  .material-study-panel strong {
    color: #e2ded1;
    font-size: 0.74rem;
  }

  .material-study-panel li span {
    color: #a7a59a;
    font: 0.65rem ui-monospace, SFMono-Regular, Menlo, monospace;
    line-height: 1.4;
  }

  .material-study-panel details {
    grid-column: 1 / -1;
    padding-top: 0.7rem;
    border-top: 1px solid #45463e;
  }

  .material-study-panel summary {
    cursor: pointer;
    color: #d8d3c4;
    font: 0.7rem ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  @media (max-width: 44rem) {
    .viewer-footer {
      align-items: flex-start;
      flex-direction: column;
    }

    .material-study-panel {
      grid-template-columns: 1fr;
    }
  }
</style>
