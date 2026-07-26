<script lang="ts">
  import { onMount } from 'svelte';
  import type { Material, Mesh, MeshBasicMaterial, Object3D } from 'three';
  import {
    getSharedLanguageScene,
    type ActorTiming,
    type CourtPoint,
    type SceneTone,
    type SharedLanguageActor,
    type SharedLanguageScene
  } from './shared-language-scenes.js';

  let { term }: { term: string } = $props();
  let courtHost: HTMLDivElement;
  let current = $derived(getSharedLanguageScene(term));
  let playing = $state(true);
  let reducedMotion = $state(false);
  let renderError = $state('');
  let paintScene: ((scene: SharedLanguageScene) => void) | null = null;
  let startAnimation: ((reset: boolean) => void) | null = null;
  let stopAnimation: (() => void) | null = null;

  $effect(() => {
    const scene = current;
    paintScene?.(scene);
    if (!reducedMotion) startAnimation?.(true);
  });

  function replay() {
    if (reducedMotion) return;
    startAnimation?.(true);
  }

  function togglePlaying() {
    if (reducedMotion) return;
    if (playing) stopAnimation?.();
    else startAnimation?.(false);
  }

  function progressFor(timing: ActorTiming | undefined, progress: number, delay = 0): number {
    const available = Math.max(0, Math.min(1, (progress - delay) / Math.max(0.05, 1 - delay)));
    if (timing === 'burst') return available < 0.38
      ? available * 0.55
      : 0.21 + ((available - 0.38) / 0.62) * 0.79;
    if (timing === 'hesitation') {
      if (available < 0.34) return (available / 0.34) * 0.42;
      if (available < 0.62) return 0.42;
      return 0.42 + ((available - 0.62) / 0.38) * 0.58;
    }
    if (timing === 'quick') return Math.min(1, available * 1.45);
    if (timing === 'return') return available < 0.5 ? available * 2 : (1 - available) * 2;
    return available;
  }

  function samplePath(path: readonly CourtPoint[], progress: number): CourtPoint {
    if (path.length <= 1) return path[0] ?? [0, 0];
    const scaled = Math.min(0.999999, Math.max(0, progress)) * (path.length - 1);
    const index = Math.floor(scaled);
    const local = scaled - index;
    const from = path[index] ?? path[0]!;
    const to = path[index + 1] ?? path.at(-1)!;
    return [from[0] + (to[0] - from[0]) * local, from[1] + (to[1] - from[1]) * local];
  }

  onMount(() => {
    let disposed = false;
    let cleanup = () => {};

    void (async () => {
      const THREE = await import('three');
      if (disposed) return;
      const style = getComputedStyle(courtHost);
      const tokenColor = (name: string, fallback: string) =>
        style.getPropertyValue(name).trim() || fallback;
      const palette: Record<SceneTone, string> & Record<'paper' | 'panel', string> = {
        paper: tokenColor('--color-performance-paper', '#f8f7f1'),
        panel: tokenColor('--color-performance-panel', '#efeee8'),
        ink: tokenColor('--color-performance-ink', '#171717'),
        pressure: tokenColor('--color-performance-pressure', '#e54800'),
        signal: tokenColor('--color-performance-signal', '#0057b8'),
        growth: tokenColor('--color-performance-growth', '#007a4d'),
        gold: tokenColor('--color-performance-gold', '#c28a00')
      };
      const actorColors = {
        guard: palette.pressure,
        teammate: palette.signal,
        defender: palette.ink,
        ball: palette.gold
      };

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(palette.paper);
      const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 220);
      camera.position.set(0, 63, 69);
      camera.lookAt(0, 0, 3);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      courtHost.append(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 2.2));
      const key = new THREE.DirectionalLight(0xffffff, 2.3);
      key.position.set(-20, 40, 25);
      scene.add(key);

      const court = new THREE.Group();
      scene.add(court);
      const surface = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 47),
        new THREE.MeshStandardMaterial({ color: palette.panel, roughness: 0.88 })
      );
      surface.rotation.x = -Math.PI / 2;
      surface.position.y = -0.08;
      court.add(surface);
      const lineMaterial = new THREE.LineBasicMaterial({ color: palette.ink });
      function courtLine(points: CourtPoint[]) {
        const geometry = new THREE.BufferGeometry().setFromPoints(
          points.map(([x, z]) => new THREE.Vector3(x, 0.08, z))
        );
        court.add(new THREE.Line(geometry, lineMaterial));
      }
      courtLine([[-25, -23.5], [25, -23.5], [25, 23.5], [-25, 23.5], [-25, -23.5]]);
      courtLine([[-6, 23.5], [-6, 4.5], [6, 4.5], [6, 23.5]]);
      courtLine(new THREE.EllipseCurve(0, 4.5, 6, 6, 0, Math.PI).getPoints(32).map(({ x, y }) => [x, y]));
      courtLine(new THREE.EllipseCurve(0, 19.5, 22, 22, Math.PI * 1.055, Math.PI * 1.945).getPoints(56).map(({ x, y }) => [x, y]));
      courtLine([[-22, 23.5], [-22, 15.8]]);
      courtLine([[22, 23.5], [22, 15.8]]);
      const hoop = new THREE.Mesh(
        new THREE.TorusGeometry(0.75, 0.12, 8, 28),
        new THREE.MeshStandardMaterial({ color: palette.pressure, roughness: 0.5 })
      );
      hoop.rotation.x = Math.PI / 2;
      hoop.position.set(0, 1.8, 19.5);
      court.add(hoop);

      const dynamic = new THREE.Group();
      scene.add(dynamic);
      let activeScene = current;
      let actorObjects: Array<{ definition: SharedLanguageActor; object: Object3D }> = [];
      let zoneObjects: Mesh[] = [];
      let frame = 0;
      let startedAt = performance.now();
      let pausedProgress = 0;

      function disposeObject(object: Object3D) {
        object.traverse((child) => {
          const mesh = child as Mesh;
          mesh.geometry?.dispose?.();
          const materials: Material[] = Array.isArray(mesh.material)
            ? mesh.material
            : mesh.material
              ? [mesh.material]
              : [];
          for (const material of materials) material.dispose();
        });
      }

      function clearDynamic() {
        while (dynamic.children.length) {
          const child = dynamic.children.pop();
          if (child) disposeObject(child);
        }
        actorObjects = [];
        zoneObjects = [];
      }

      function makeActor(definition: SharedLanguageActor): Object3D {
        const group = new THREE.Group();
        const color = actorColors[definition.kind];
        if (definition.kind === 'ball') {
          const ball = new THREE.Mesh(
            new THREE.SphereGeometry(0.42, 18, 12),
            new THREE.MeshStandardMaterial({ color, roughness: 0.58 })
          );
          ball.position.y = 1.4;
          group.add(ball);
        } else {
          const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.82 * (definition.scale ?? 1), 0.82 * (definition.scale ?? 1), 0.7, 28),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
          );
          body.position.y = 0.5;
          group.add(body);
          if (definition.focus) {
            const ring = new THREE.Mesh(
              new THREE.RingGeometry(1.18, 1.48, 34),
              new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.36, side: THREE.DoubleSide })
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.03;
            group.add(ring);
          }
        }
        const [x, z] = definition.path[0] ?? [0, 0];
        group.position.set(x, 0, z);
        dynamic.add(group);

        if (definition.path.length > 1) {
          const trailMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: definition.kind === 'ball' ? 0.55 : 0.28 });
          const trailGeometry = new THREE.BufferGeometry().setFromPoints(
            definition.path.map(([pathX, pathZ]) => new THREE.Vector3(pathX, 0.16, pathZ))
          );
          dynamic.add(new THREE.Line(trailGeometry, trailMaterial));
        }
        return group;
      }

      function renderAt(progress: number) {
        for (const { definition, object } of actorObjects) {
          const timed = progressFor(definition.timing, progress, definition.delay);
          const [x, z] = samplePath(definition.path, timed);
          object.position.set(x, 0, z);
          if (definition.focus && definition.kind !== 'ball') {
            const pulse = 1 + Math.sin(progress * Math.PI * 4) * 0.035;
            object.scale.setScalar(pulse);
          }
        }
        zoneObjects.forEach((object, index) => {
          const material = object.material as MeshBasicMaterial;
          material.opacity = 0.08 + ((Math.sin(progress * Math.PI * 2 + index) + 1) / 2) * 0.1;
        });
        renderer.render(scene, camera);
      }

      function tick(now: number) {
        const progress = ((now - startedAt) % activeScene.durationMs) / activeScene.durationMs;
        pausedProgress = progress;
        renderAt(progress);
        frame = requestAnimationFrame(tick);
      }

      paintScene = (next) => {
        activeScene = next;
        clearDynamic();
        for (const highlight of next.zones) {
          const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(highlight.size[0], highlight.size[1]),
            new THREE.MeshBasicMaterial({
              color: palette[highlight.tone],
              transparent: true,
              opacity: 0.12,
              side: THREE.DoubleSide
            })
          );
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.set(highlight.center[0], 0.01, highlight.center[1]);
          dynamic.add(mesh);
          zoneObjects.push(mesh);
        }
        actorObjects = next.actors.map((definition) => ({ definition, object: makeActor(definition) }));
        pausedProgress = reducedMotion ? 0.62 : 0;
        renderAt(pausedProgress);
      };
      startAnimation = (reset) => {
        if (reducedMotion) return;
        cancelAnimationFrame(frame);
        if (reset) pausedProgress = 0;
        startedAt = performance.now() - pausedProgress * activeScene.durationMs;
        playing = true;
        frame = requestAnimationFrame(tick);
      };
      stopAnimation = () => {
        cancelAnimationFrame(frame);
        playing = false;
        renderAt(pausedProgress);
      };

      reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      paintScene(current);
      if (reducedMotion) playing = false;
      else startAnimation(true);

      const resize = () => {
        const width = Math.max(320, courtHost.clientWidth);
        const height = Math.max(300, Math.min(470, width * 0.58));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderAt(pausedProgress);
      };
      const observer = new ResizeObserver(resize);
      observer.observe(courtHost);
      resize();

      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        paintScene = null;
        startAnimation = null;
        stopAnimation = null;
        clearDynamic();
        disposeObject(court);
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => {
      if (!disposed) renderError = 'The animated court could not start. The written example remains available.';
    });

    return () => {
      disposed = true;
      cleanup();
    };
  });
</script>

<section class="language-example" aria-labelledby="language-example-title">
  <div class="court-frame">
    <div
      class="three-court"
      bind:this={courtHost}
      role="img"
      aria-label={`Animated half-court example for ${current.term}`}
    ></div>
    <div class="court-key mono" aria-hidden="true">
      <span><i class="guard"></i> guard</span>
      <span><i class="team"></i> teammate</span>
      <span><i class="defense"></i> defender</span>
      <span><i class="ball"></i> ball</span>
    </div>
    {#if renderError}<p class="render-error" role="status">{renderError}</p>{/if}
  </div>
  <div class="example-copy" aria-live="polite">
    <div>
      <p class="eyebrow">Animated example / {current.term}</p>
      <h3 id="language-example-title">{current.term}</h3>
      <p class="meaning">{current.meaning}</p>
    </div>
    <div class="picture">
      <span class="mono">Court picture</span>
      <p>{current.caption}</p>
    </div>
    <blockquote>{current.cue}</blockquote>
    <div class="animation-controls">
      <button class="button" type="button" onclick={replay} disabled={reducedMotion}>Replay example</button>
      <button class="button" type="button" onclick={togglePlaying} disabled={reducedMotion}>
        {playing ? 'Pause animation' : 'Play animation'}
      </button>
      {#if reducedMotion}<span class="mono">Motion reduced / representative frame</span>{/if}
    </div>
  </div>
</section>

<style>
  .language-example {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.65fr);
    margin: 18px 0;
    border: 1px solid var(--color-performance-line);
    background: white;
  }
  .court-frame {
    position: relative;
    min-width: 0;
    overflow: hidden;
    background: var(--color-performance-paper);
  }
  .three-court {
    width: 100%;
    min-height: 300px;
  }
  .three-court :global(canvas) {
    display: block;
    width: 100%;
    height: auto;
  }
  .court-key {
    position: absolute;
    right: 12px;
    bottom: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 8px 10px;
    background: color-mix(in srgb, var(--color-performance-paper) 88%, transparent);
    color: var(--color-performance-ink);
    font-size: 8px;
  }
  .court-key span {
    display: flex;
    gap: 5px;
    align-items: center;
  }
  .court-key i {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--color-performance-pressure);
  }
  .court-key .team { background: var(--color-performance-signal); }
  .court-key .defense { background: var(--color-performance-ink); }
  .court-key .ball { background: var(--color-performance-gold); }
  .render-error {
    position: absolute;
    inset: auto 14px 14px 14px;
    margin: 0;
    padding: 12px;
    border-left: 4px solid var(--color-performance-pressure);
    background: var(--color-performance-paper);
    font-size: 13px;
  }
  .example-copy {
    display: grid;
    align-content: start;
    gap: 20px;
    min-width: 0;
    padding: 24px;
    border-left: 1px solid var(--color-performance-line);
    background: var(--color-performance-ink);
    color: white;
  }
  .example-copy h3 {
    margin: 0;
    font-size: clamp(30px, 3.4vw, 46px);
    font-weight: 430;
    line-height: 1;
    letter-spacing: -0.03em;
  }
  .meaning {
    margin: 10px 0 0;
    color: #d4d4d0;
    line-height: 1.45;
  }
  .picture {
    padding-top: 14px;
    border-top: 1px solid #3f3f3f;
  }
  .picture span {
    color: var(--color-performance-pressure);
    font-size: 9px;
    text-transform: uppercase;
  }
  .picture p {
    margin: 7px 0 0;
    color: #d4d4d0;
    font-size: 14px;
    line-height: 1.45;
  }
  blockquote {
    margin: 0;
    padding: 14px 0 0 14px;
    border-top: 1px solid #3f3f3f;
    border-left: 4px solid var(--color-performance-growth);
    font-size: 18px;
    line-height: 1.3;
  }
  .animation-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .animation-controls .button {
    border-color: white;
    background: white;
  }
  .animation-controls .button:disabled {
    opacity: 0.45;
  }
  .animation-controls span {
    color: #d4d4d0;
    font-size: 8px;
  }
  @media (max-width: 860px) {
    .language-example { grid-template-columns: 1fr; }
    .example-copy {
      border-top: 1px solid var(--color-performance-line);
      border-left: 0;
    }
  }
  @media (max-width: 520px) {
    .three-court { min-height: 280px; }
    .court-key { left: 8px; right: auto; bottom: 8px; }
    .animation-controls { display: grid; }
  }
</style>
