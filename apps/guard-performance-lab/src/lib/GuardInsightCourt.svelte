<script lang="ts">
  import { onMount } from 'svelte';
  import type { LineBasicMaterial, Mesh, MeshBasicMaterial, Object3D } from 'three';
  import { ballScreenPictures } from './data.js';

  type InsightMode = 'spacing' | 'footwork' | 'scheme';
  type SchemeKey = keyof typeof ballScreenPictures;
  type ScenePainter = (mode: InsightMode, scheme: SchemeKey) => void;
  type Insight = {
    label: string;
    headline: string;
    observed: string;
    picture: string;
    nextEvidence: string;
    cue: string;
  };

  const insights: Record<InsightMode, Insight> = {
    spacing: {
      label: 'Spacing picture',
      headline: 'Hold the window before entering it.',
      observed:
        'Base spacing awareness is present: the guard understands that width and distance create room for the ball.',
      picture:
        'The orange guard stays in the slot while four teammates occupy a corner, wing, opposite slot, and interior window.',
      nextEvidence:
        'Watch whether the guard relocates after a pass to rebuild the passing window instead of following the ball.',
      cue: 'Pass. Hold width. Move when the picture changes.'
    },
    footwork: {
      label: 'Footwork picture',
      headline: 'Make the feet prepare the natural shot.',
      observed:
        'Natural shooting foundation is visible. Right-hand handling is usable enough to arrive at the shot without disrupting balance.',
      picture:
        'The orange footprints show a balanced arrival; the short right-hand path creates the shooting window without adding extra steps.',
      nextEvidence:
        'Capture the first foot down, the width of the stop, and whether the shoulders stay available for shot, pass, or drive.',
      cue: 'Quiet feet. Ball in the window. Leave with options.'
    },
    scheme: {
      label: 'Scheme picture',
      headline: 'Use the screen to reveal the next defender.',
      observed:
        'Right hand is usable in the current context. Left hand is developing, but the observed defense has not forced it into a clear problem yet.',
      picture:
        'The screen creates a right-hand lane while the nail helper closes the middle. The weak-hand counter is shown as an available second path, not a verdict.',
      nextEvidence:
        'Create a controlled possession that sends the guard left, then record ball security, eyes, pace, and the decision made after help arrives.',
      cue: 'Read the top foot. Turn the corner. Keep the second side available.'
    }
  };

  const schemeInsights: Record<SchemeKey, Insight> = {
    drop: {
      label: `Scheme picture / ${ballScreenPictures.drop.term}`,
      headline: 'Keep the lane and the pull-up available.',
      observed:
        'Right hand is usable in the current context. Left hand is developing, but the observed defense has not forced it into a clear problem yet.',
      picture: `${ballScreenPictures.drop.meaning} The orange path uses the screen while the nail helper closes the middle.`,
      nextEvidence:
        'Record whether the guard keeps the defender behind, sees the dropping big, and leaves the possession balanced enough to pass, stop, or finish.',
      cue: 'Turn the corner. Put the trailer behind. Read the big.'
    },
    snake: {
      label: `Scheme picture / ${ballScreenPictures.snake.term}`,
      headline: 'Cross the screen line without losing the picture.',
      observed:
        'The right-hand handle supports the first advantage. The left-hand transfer still needs a controlled live rep before the counter is treated as usable.',
      picture: `${ballScreenPictures.snake.meaning} The green path crosses the lane while the orange path marks the initial screen advantage.`,
      nextEvidence:
        'Watch the hand transfer, shoulder position, eyes, and braking point when the guard crosses back in front of the dropping defender.',
      cue: 'Turn the corner. Cross with purpose. Keep the trailer behind.'
    },
    reject: {
      label: `Scheme picture / ${ballScreenPictures.reject.term}`,
      headline: 'Move the on-ball defender before using the open side.',
      observed:
        'The guard has enough right-hand control to use the open lane when a defender leans toward the screen. The opposite-hand answer remains a next-evidence question.',
      picture: `${ballScreenPictures.reject.meaning} The orange path leaves the screener and attacks the defender’s outside foot.`,
      nextEvidence:
        'Give the defender a clear screen-side lean, then record whether the guard changes pace, protects the ball, and reads the first helper after rejecting.',
      cue: 'Show the screen. Read the lean. Take the open side.'
    }
  };

  let courtHost: HTMLDivElement;
  let activeMode = $state<InsightMode>('spacing');
  let activeScheme = $state<SchemeKey>('drop');
  let shareStatus = $state('');
  let renderError = $state('');
  let paintScene: ScenePainter | null = null;
  let current = $derived(
    activeMode === 'scheme' ? schemeInsights[activeScheme] : insights[activeMode]
  );

  $effect(() => {
    const mode = activeMode;
    const scheme = activeScheme;
    paintScene?.(mode, scheme);
    shareStatus = '';
  });

  async function copyInsight() {
    const copy = [
      'Guard development insight / age 12',
      current.label,
      `Observed foundation: ${current.observed}`,
      `Court picture: ${current.picture}`,
      `Next evidence: ${current.nextEvidence}`,
      `Player cue: ${current.cue}`,
      'Private development context / observation, not a ranking or projection.'
    ].join('\n');

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = copy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.append(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      shareStatus = 'Insight copied';
    } catch {
      shareStatus = 'Copy unavailable';
    }
  }

  onMount(() => {
    let disposed = false;
    let cleanup = () => {};

    void (async () => {
      const THREE = await import('three');
      if (disposed) return;
      const style = getComputedStyle(courtHost);
      const color = (token: string, fallback: string) =>
        style.getPropertyValue(token).trim() || fallback;
      const palette = {
        paper: color('--color-performance-paper', '#f8f7f1'),
        panel: color('--color-performance-panel', '#efeee8'),
        ink: color('--color-performance-ink', '#171717'),
        line: color('--color-performance-line-strong', '#9c9c96'),
        pressure: color('--color-performance-pressure', '#e54800'),
        signal: color('--color-performance-signal', '#0057b8'),
        growth: color('--color-performance-growth', '#007a4d'),
        gold: color('--color-performance-gold', '#c28a00')
      };

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(palette.paper);
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 220);
      camera.position.set(0, 62, 68);
      camera.lookAt(0, 0, 3);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      courtHost.append(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 2.2));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
      keyLight.position.set(-22, 42, 28);
      scene.add(keyLight);

      const court = new THREE.Group();
      scene.add(court);
      const surface = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 47),
        new THREE.MeshStandardMaterial({ color: palette.panel, roughness: 0.86, metalness: 0 })
      );
      surface.rotation.x = -Math.PI / 2;
      surface.position.y = -0.08;
      court.add(surface);

      const lineMaterial = new THREE.LineBasicMaterial({ color: palette.ink });
      function line(points: Array<[number, number]>, material = lineMaterial) {
        const geometry = new THREE.BufferGeometry().setFromPoints(
          points.map(([x, z]) => new THREE.Vector3(x, 0.08, z))
        );
        court.add(new THREE.Line(geometry, material));
      }
      line([
        [-25, -23.5],
        [25, -23.5],
        [25, 23.5],
        [-25, 23.5],
        [-25, -23.5]
      ]);
      line([
        [-6, 23.5],
        [-6, 4.5],
        [6, 4.5],
        [6, 23.5]
      ]);
      const freeThrowArc = new THREE.EllipseCurve(0, 4.5, 6, 6, 0, Math.PI, false, 0)
        .getPoints(32)
        .map((point) => [point.x, point.y] as [number, number]);
      line(freeThrowArc);
      const threeArc = new THREE.EllipseCurve(
        0,
        19.5,
        22,
        22,
        Math.PI * 1.055,
        Math.PI * 1.945,
        false,
        0
      )
        .getPoints(56)
        .map((point) => [point.x, point.y] as [number, number]);
      line(threeArc);
      line([
        [-22, 23.5],
        [-22, 15.8]
      ]);
      line([
        [22, 23.5],
        [22, 15.8]
      ]);

      const hoop = new THREE.Mesh(
        new THREE.TorusGeometry(0.75, 0.12, 8, 28),
        new THREE.MeshStandardMaterial({ color: palette.pressure, roughness: 0.5 })
      );
      hoop.rotation.x = Math.PI / 2;
      hoop.position.set(0, 1.8, 19.5);
      court.add(hoop);
      const backboard = new THREE.Mesh(
        new THREE.BoxGeometry(6, 1.8, 0.18),
        new THREE.MeshStandardMaterial({ color: palette.paper, roughness: 0.4 })
      );
      backboard.position.set(0, 2.2, 21.2);
      court.add(backboard);

      const dynamic = new THREE.Group();
      scene.add(dynamic);
      let focusToken: Object3D | null = null;

      function token(x: number, z: number, tokenColor: string, scale = 1, ring = false) {
        const group = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.82 * scale, 0.82 * scale, 0.7, 32),
          new THREE.MeshStandardMaterial({ color: tokenColor, roughness: 0.48 })
        );
        body.position.y = 0.5;
        group.add(body);
        if (ring) {
          const halo = new THREE.Mesh(
            new THREE.RingGeometry(1.25 * scale, 1.55 * scale, 36),
            new THREE.MeshBasicMaterial({
              color: tokenColor,
              transparent: true,
              opacity: 0.35,
              side: THREE.DoubleSide
            })
          );
          halo.rotation.x = -Math.PI / 2;
          halo.position.y = 0.03;
          group.add(halo);
        }
        group.position.set(x, 0, z);
        dynamic.add(group);
        return group;
      }

      function zone(x: number, z: number, width: number, depth: number, zoneColor: string) {
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(width, depth),
          new THREE.MeshBasicMaterial({
            color: zoneColor,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide
          })
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, 0.01, z);
        dynamic.add(mesh);
      }

      function arrow(
        from: [number, number],
        to: [number, number],
        arrowColor: string,
        opacity = 1
      ) {
        const origin = new THREE.Vector3(from[0], 0.28, from[1]);
        const delta = new THREE.Vector3(to[0] - from[0], 0, to[1] - from[1]);
        const length = delta.length();
        const helper = new THREE.ArrowHelper(
          delta.normalize(),
          origin,
          length,
          arrowColor,
          1.7,
          0.8
        );
        const lineMaterial = helper.line.material as LineBasicMaterial;
        const coneMaterial = helper.cone.material as MeshBasicMaterial;
        lineMaterial.transparent = true;
        lineMaterial.opacity = opacity;
        coneMaterial.transparent = true;
        coneMaterial.opacity = opacity;
        dynamic.add(helper);
      }

      function footprint(x: number, z: number, rotation: number) {
        const foot = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.28, 0.62, 4, 12),
          new THREE.MeshStandardMaterial({ color: palette.pressure, roughness: 0.55 })
        );
        foot.scale.set(0.68, 0.12, 1);
        foot.rotation.y = rotation;
        foot.position.set(x, 0.12, z);
        dynamic.add(foot);
      }

      function clearDynamic() {
        while (dynamic.children.length) {
          const child = dynamic.children.pop();
          child?.traverse((object) => {
            const mesh = object as Mesh;
            mesh.geometry?.dispose?.();
            const materials = Array.isArray(mesh.material)
              ? mesh.material
              : mesh.material
                ? [mesh.material]
                : [];
            for (const material of materials) material.dispose();
          });
        }
        focusToken = null;
      }

      paintScene = (mode, scheme) => {
        clearDynamic();
        if (mode === 'spacing') {
          zone(0, 6.5, 24, 18, palette.growth);
          focusToken = token(11.5, -3.5, palette.pressure, 1.15, true);
          token(-21, 18.5, palette.signal);
          token(-19, -3.5, palette.signal);
          token(-10, -13, palette.signal);
          token(9, 17.5, palette.signal);
          arrow([11.5, -3.5], [3, 3], palette.pressure, 0.75);
        } else if (mode === 'footwork') {
          zone(13, -2, 10, 14, palette.gold);
          focusToken = token(15, -1, palette.pressure, 1.15, true);
          token(9.5, -8.5, palette.signal);
          footprint(12.9, -2.6, -0.12);
          footprint(15.2, -2.1, 0.12);
          footprint(13.2, 1.1, -0.02);
          footprint(15.5, 1.1, 0.02);
          arrow([9.5, -8.5], [13.8, -2], palette.signal, 0.7);
          arrow([14.2, -1], [14.2, 6.5], palette.pressure, 0.9);
        } else if (scheme === 'drop') {
          zone(-6, 4, 12, 14, palette.signal);
          focusToken = token(13, -4, palette.pressure, 1.15, true);
          token(7.5, 0, palette.signal, 1.1);
          token(12, 1.5, palette.ink);
          token(0, 8, palette.ink);
          token(-18, 18, palette.signal);
          arrow([13, -4], [7, 8], palette.pressure, 0.95);
          arrow([13, -4], [-1, 1], palette.growth, 0.58);
          arrow([0, 8], [5.5, 6], palette.ink, 0.55);
        } else if (scheme === 'snake') {
          zone(-1, 5, 16, 13, palette.growth);
          focusToken = token(13, -4, palette.pressure, 1.15, true);
          token(7.5, 0, palette.signal, 1.1);
          token(12, 1.5, palette.ink);
          token(0, 8, palette.ink);
          token(-18, 18, palette.signal);
          arrow([13, -4], [7.5, 4], palette.pressure, 0.95);
          arrow([7.5, 4], [-4, 7], palette.growth, 0.9);
          arrow([12, 1.5], [7, 5], palette.ink, 0.55);
        } else {
          zone(13, 4, 13, 16, palette.gold);
          focusToken = token(7, -4, palette.pressure, 1.15, true);
          token(0, 0, palette.signal, 1.1);
          token(4, -0.5, palette.ink);
          token(0, 9, palette.ink);
          token(-18, 18, palette.signal);
          arrow([7, -4], [17, 7], palette.pressure, 0.95);
          arrow([7, -4], [1, 5], palette.signal, 0.35);
          arrow([4, -0.5], [1, 2], palette.ink, 0.55);
        }
        renderer.render(scene, camera);
      };

      const resize = () => {
        const width = Math.max(320, courtHost.clientWidth);
        const height = Math.max(360, Math.min(560, width * 0.68));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      };
      const observer = new ResizeObserver(resize);
      observer.observe(courtHost);
      resize();
      paintScene(activeMode, activeScheme);

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let frame = 0;
      let startedAt = performance.now();
      const animate = (now: number) => {
        if (focusToken) {
          const pulse = 1 + Math.sin((now - startedAt) / 420) * 0.035;
          focusToken.scale.setScalar(pulse);
        }
        renderer.render(scene, camera);
        frame = requestAnimationFrame(animate);
      };
      if (!reduceMotion) frame = requestAnimationFrame(animate);

      const destroy = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        paintScene = null;
        clearDynamic();
        court.traverse((object) => {
          const mesh = object as Mesh;
          mesh.geometry?.dispose?.();
          const materials = Array.isArray(mesh.material)
            ? mesh.material
            : mesh.material
              ? [mesh.material]
              : [];
          for (const material of materials) material.dispose();
        });
        renderer.dispose();
        renderer.domElement.remove();
      };

      if (disposed) destroy();
      else cleanup = destroy;
    })().catch(() => {
      if (!disposed)
        renderError =
          'The 3D court could not start in this browser. The written court picture remains available.';
    });

    return () => {
      disposed = true;
      cleanup();
    };
  });
</script>

<section class="insight-lab" data-player-age="12" aria-labelledby="insight-title">
  <div class="insight-intro">
    <div>
      <p class="eyebrow">Observed development context / age 12</p>
      <h3 id="insight-title">One foundation. Three court pictures.</h3>
    </div>
    <p>
      Share what is visible now, then name the next possession needed to learn more. No ranking or
      future projection.
    </p>
  </div>

  <div class="foundation-strip" aria-label="Observed foundation">
    <div><span class="mono">Spacing</span><strong>Base spacing awareness</strong></div>
    <div><span class="mono">Shot</span><strong>Natural shooting foundation</strong></div>
    <div><span class="mono">Right hand</span><strong>Right hand is usable</strong></div>
    <div><span class="mono">Left hand</span><strong>Left hand is developing</strong></div>
  </div>

  <div class="insight-toolbar" role="group" aria-label="Choose a teaching picture">
    {#each Object.entries(insights) as [key, insight]}
      <button
        class:active={activeMode === key}
        aria-pressed={activeMode === key}
        onclick={() => (activeMode = key as InsightMode)}>{insight.label}</button
      >
    {/each}
  </div>

  <div
    class="scheme-toolbar"
    role="group"
    aria-label="Choose a ball-screen picture"
    hidden={activeMode !== 'scheme'}
  >
    <div>
      <span class="mono">Ball-screen family</span>
      <p>{ballScreenPictures[activeScheme].meaning}</p>
    </div>
    {#each Object.entries(ballScreenPictures) as [key, picture]}
      <button
        class:active={activeScheme === key}
        aria-pressed={activeScheme === key}
        onclick={() => (activeScheme = key as SchemeKey)}>{picture.term}</button
      >
    {/each}
  </div>

  <div class="insight-stage">
    <div class="court-frame">
      <div
        class="three-court"
        bind:this={courtHost}
        role="img"
        aria-label="Interactive three-dimensional half-court teaching model"
      ></div>
      {#if renderError}<p class="render-error" role="status">{renderError}</p>{/if}
      <div class="court-key mono" aria-hidden="true">
        <span><i class="guard"></i> guard</span><span><i class="team"></i> teammate</span><span
          ><i class="defense"></i> defender</span
        >
      </div>
      <p class="sr-description">{current.picture}</p>
    </div>
    <aside class="insight-panel" aria-live="polite">
      <p class="eyebrow">{current.label}</p>
      <h3>{current.headline}</h3>
      <dl>
        <div>
          <dt>Observed foundation</dt>
          <dd>{current.observed}</dd>
        </div>
        <div>
          <dt>Court picture</dt>
          <dd>{current.picture}</dd>
        </div>
        <div>
          <dt>Next evidence</dt>
          <dd>{current.nextEvidence}</dd>
        </div>
      </dl>
      <blockquote>{current.cue}</blockquote>
      <div class="share-row">
        <button class="button" onclick={copyInsight}>Copy current insight</button>
        <span class="mono" role="status">{shareStatus}</span>
      </div>
    </aside>
  </div>
</section>

<style>
  .insight-lab {
    display: grid;
    gap: 14px;
  }
  .insight-intro {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 24px;
  }
  .insight-intro h3 {
    margin: 0;
    font-size: clamp(28px, 4vw, 46px);
    font-weight: 450;
    letter-spacing: -0.03em;
  }
  .insight-intro > p {
    max-width: 520px;
    margin: 0;
    color: var(--color-performance-muted);
    line-height: 1.5;
  }
  .foundation-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border: 1px solid var(--color-performance-line);
    background: white;
  }
  .foundation-strip > div {
    display: grid;
    gap: 8px;
    min-width: 0;
    padding: 15px;
    border-right: 1px solid var(--color-performance-line);
  }
  .foundation-strip > div:last-child {
    border-right: 0;
  }
  .foundation-strip span {
    color: var(--color-performance-muted);
    font-size: 8px;
  }
  .foundation-strip strong {
    font-size: 15px;
    font-weight: 550;
    line-height: 1.25;
  }
  .insight-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 7px;
    background: var(--color-performance-panel);
  }
  .insight-toolbar button {
    border: 0;
    background: transparent;
    padding: 11px 14px;
    color: var(--color-performance-muted);
    font: 700 10px/1 var(--font-performance-mono);
    text-transform: uppercase;
  }
  .insight-toolbar button.active {
    background: var(--color-performance-ink);
    color: white;
  }
  .scheme-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) repeat(3, auto);
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    border-left: 4px solid var(--color-performance-signal);
    background: white;
  }
  .scheme-toolbar[hidden] {
    display: none;
  }
  .scheme-toolbar > div {
    display: grid;
    gap: 4px;
  }
  .scheme-toolbar span {
    color: var(--color-performance-signal);
    font-size: 8px;
  }
  .scheme-toolbar p {
    margin: 0;
    color: var(--color-performance-muted);
    font-size: 13px;
  }
  .scheme-toolbar button {
    border: 1px solid var(--color-performance-line);
    background: white;
    padding: 10px 13px;
    color: var(--color-performance-ink);
    font: 700 10px/1 var(--font-performance-mono);
    text-transform: uppercase;
  }
  .scheme-toolbar button.active {
    border-color: var(--color-performance-ink);
    background: var(--color-performance-ink);
    color: white;
  }
  .insight-stage {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.65fr);
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
    min-height: 360px;
  }
  .three-court :global(canvas) {
    display: block;
    width: 100%;
    height: auto;
  }
  .render-error {
    position: absolute;
    inset: auto 16px 16px 16px;
    margin: 0;
    padding: 12px;
    border-left: 4px solid var(--color-performance-pressure);
    background: var(--color-performance-paper);
    color: var(--color-performance-ink);
    font-size: 13px;
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
  .court-key .team {
    background: var(--color-performance-signal);
  }
  .court-key .defense {
    background: var(--color-performance-ink);
  }
  .sr-description {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .insight-panel {
    display: grid;
    align-content: start;
    min-width: 0;
    padding: 24px;
    border-left: 1px solid var(--color-performance-line);
    background: var(--color-performance-ink);
    color: white;
  }
  .insight-panel h3 {
    margin: 0 0 22px;
    font-size: clamp(27px, 3vw, 39px);
    font-weight: 420;
    line-height: 1;
    letter-spacing: -0.03em;
  }
  .insight-panel dl {
    display: grid;
    gap: 17px;
    margin: 0;
  }
  .insight-panel dl div {
    display: grid;
    gap: 6px;
    padding-top: 12px;
    border-top: 1px solid #3f3f3f;
  }
  .insight-panel dt {
    color: var(--color-performance-pressure);
    font: 700 9px/1 var(--font-performance-mono);
    text-transform: uppercase;
  }
  .insight-panel dd {
    margin: 0;
    color: #d4d4d0;
    font-size: 14px;
    line-height: 1.45;
  }
  blockquote {
    margin: 22px 0 0;
    padding: 15px 0 0 15px;
    border-top: 1px solid #3f3f3f;
    border-left: 4px solid var(--color-performance-growth);
    font-size: 18px;
    line-height: 1.3;
  }
  .share-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    margin-top: 22px;
  }
  .share-row .button {
    border-color: white;
    background: white;
  }
  .share-row span {
    color: var(--color-performance-growth);
    font-size: 8px;
  }

  @media (max-width: 860px) {
    .insight-intro {
      display: grid;
    }
    .foundation-strip {
      grid-template-columns: repeat(2, 1fr);
    }
    .foundation-strip > div:nth-child(2) {
      border-right: 0;
    }
    .foundation-strip > div:nth-child(-n + 2) {
      border-bottom: 1px solid var(--color-performance-line);
    }
    .insight-stage {
      grid-template-columns: 1fr;
    }
    .scheme-toolbar {
      grid-template-columns: repeat(3, 1fr);
    }
    .scheme-toolbar > div {
      grid-column: 1 / -1;
    }
    .insight-panel {
      border-top: 1px solid var(--color-performance-line);
      border-left: 0;
    }
  }

  @media (max-width: 520px) {
    .foundation-strip {
      grid-template-columns: 1fr;
    }
    .foundation-strip > div {
      border-right: 0;
      border-bottom: 1px solid var(--color-performance-line);
    }
    .foundation-strip > div:last-child {
      border-bottom: 0;
    }
    .insight-toolbar {
      display: grid;
      grid-template-columns: 1fr;
    }
    .insight-toolbar button {
      text-align: left;
    }
    .scheme-toolbar {
      grid-template-columns: 1fr;
    }
    .scheme-toolbar > div {
      grid-column: auto;
    }
    .three-court {
      min-height: 320px;
    }
    .court-key {
      left: 8px;
      right: auto;
      bottom: 8px;
    }
  }
</style>
