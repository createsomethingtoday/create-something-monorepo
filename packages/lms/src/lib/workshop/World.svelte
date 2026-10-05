<script lang="ts">
  import { onMount } from 'svelte';
  import { stations as requestStations } from './content';
  let {
    selected,
    paused,
    onselect,
    objects,
    interactive = false,
    statuses = {},
    destination = ''
  }: {
    selected: string;
    paused: boolean;
    onselect: (id: string) => void;
    objects?: readonly {
      id: string;
      label: string;
      short?: string;
      kind?: string;
      x: number;
      z: number;
    }[];
    interactive?: boolean;
    statuses?: Record<string, string>;
    destination?: string;
  } = $props();
  const stations = $derived(objects ?? requestStations);
  let host: HTMLDivElement;
  let unavailable = $state(false);
  let labels = $state<{ id: string; label: string; number: string; left: number; top: number }[]>(
    []
  );
  let travel: ((id: string) => void) | undefined;
  let refresh: (() => void) | undefined;
  $effect(() => {
    travel?.(selected);
    // Status and carry changes redraw even with reduced motion or paused travel.
    statuses;
    destination;
    refresh?.();
  });

  onMount(() => {
    let disposed = false;
    let cleanup = () => {};
    import('three')
      .then((T) => {
        if (disposed) return;
        try {
          const scene = new T.Scene();
          scene.background = new T.Color('#171716');
          const renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
          renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
          renderer.shadowMap.enabled = true;
          renderer.shadowMap.type = T.PCFSoftShadowMap;
          host.appendChild(renderer.domElement);
          renderer.domElement.setAttribute('aria-hidden', 'true');
          cleanup = () => {
            renderer.setAnimationLoop(null);
            renderer.dispose();
            renderer.domElement.remove();
          };
          const camera = new T.OrthographicCamera(-8, 8, 7, -7, 0.1, 60);
          camera.position.set(12, 13, 12);
          camera.lookAt(0, 0, 0);
          const player = new T.Vector3(0, 0, -1);
          const goal = player.clone();
          let rendered = false;
          scene.add(new T.HemisphereLight(0xfff7e8, 0x454541, 2.2));
          const light = new T.DirectionalLight(0xfff8ec, 3.2);
          light.position.set(-4, 10, 6);
          light.castShadow = true;
          light.shadow.mapSize.set(1024, 1024);
          light.shadow.camera.left = light.shadow.camera.bottom = -8;
          light.shadow.camera.right = light.shadow.camera.top = 8;
          light.shadow.bias = -0.001;
          scene.add(light);
          const ink = new T.MeshStandardMaterial({ color: '#33332f', roughness: 0.95 });
          const paper = new T.MeshStandardMaterial({ color: '#eee8dc', roughness: 1 });
          const stone = new T.MeshStandardMaterial({ color: '#928d80', roughness: 1 });
          const timber = new T.MeshStandardMaterial({ color: '#bcb4a3', roughness: 1 });
          const box = (
            parent: import('three').Object3D,
            w: number,
            h: number,
            d: number,
            x: number,
            y: number,
            z: number,
            material = ink
          ) => {
            const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material);
            mesh.position.set(x, y, z);
            mesh.castShadow = mesh.receiveShadow = true;
            parent.add(mesh);
            return mesh;
          };
          const floor = box(scene, 10, 0.24, 9, 0, -0.18, 0, timber);
          box(scene, 10.2, 0.12, 9.2, 0, -0.36, 0, ink);
          // Low cutaway walls preserve the isometric view into a small real workshop.
          box(scene, 10, 0.65, 0.16, 0, 0.18, -4.5, stone);
          box(scene, 0.16, 0.65, 9, -5, 0.18, 0, stone);
          // An etched floor trace connects the responsibilities of one request.
          const points = [stations[0], stations[1], stations[2], stations[3]].map(
            (s) => new T.Vector3(s.x, -0.035, s.z + 1)
          );
          const trace = new T.Line(
            new T.BufferGeometry().setFromPoints(points),
            new T.LineBasicMaterial({ color: '#eee8dc' })
          );
          scene.add(trace);
          const groups: import('three').Group[] = [];
          const pads: import('three').Mesh[] = [];
          const short = ['Intake', 'Validate', 'Approve', 'Receipt', 'Secrets', 'Handoff'];
          stations.forEach((s, index) => {
            const group = new T.Group();
            group.position.set(s.x, 0, s.z);
            group.userData.id = s.id;
            scene.add(group);
            groups.push(group);
            const pad = box(
              group,
              1.65,
              0.035,
              1.35,
              0,
              -0.025,
              0,
              new T.MeshStandardMaterial({ color: '#a69f90', roughness: 1 })
            );
            pads.push(pad);
            if ('kind' in s && s.kind === 'crate') {
              box(group, 1.2, 0.8, 0.9, 0, 0.4, 0, timber);
              box(group, 1.25, 0.12, 0.95, 0, 0.86, 0, paper);
              box(group, 0.12, 0.82, 0.94, 0, 0.42, 0, stone);
            } else if ('kind' in s && s.kind === 'repository') {
              for (const x of [-0.42, 0, 0.42]) {
                box(group, 0.3, 0.95, 0.65, x, 0.5, 0, paper);
                box(group, 0.18, 0.07, 0.03, x, 0.76, 0.34, ink);
              }
              box(group, 1.5, 0.12, 0.85, 0, 0.05, 0, ink);
            } else if ('kind' in s && s.kind === 'launch') {
              const ring = new T.Mesh(new T.CylinderGeometry(0.76, 0.86, 0.18, 24), paper);
              ring.position.y = 0.1;
              group.add(ring);
              box(group, 0.8, 0.1, 0.65, 0, 0.28, 0, ink);
              box(group, 0.12, 0.7, 0.12, 0, 0.7, 0, stone);
              box(group, 0.5, 0.1, 0.3, 0, 1.06, 0, paper);
            } else if ('kind' in s && s.kind === 'beacon') {
              box(group, 1, 0.15, 0.85, 0, 0.08, 0, ink);
              box(group, 0.24, 1.1, 0.24, 0, 0.65, 0, stone);
              box(group, 0.65, 0.42, 0.55, 0, 1.34, 0, paper);
              box(group, 0.4, 0.12, 0.02, 0, 1.34, 0.29, ink);
            } else if (s.id === 'intake' || ('kind' in s && s.kind === 'workbench')) {
              box(group, 1.35, 0.12, 0.85, 0, 0.75, 0, paper);
              for (const x of [-0.5, 0.5]) box(group, 0.09, 0.75, 0.6, x, 0.35, 0, ink);
              const sheet = box(group, 0.45, 0.02, 0.46, -0.22, 0.83, 0.02, stone);
              sheet.rotation.y = 0.12;
              box(group, 0.36, 0.025, 0.38, 0.28, 0.84, -0.07, paper);
            } else if (s.id === 'validate') {
              box(group, 1.35, 0.1, 0.72, 0, 0.45, 0, stone);
              box(group, 0.12, 1.05, 0.3, -0.5, 0.8, 0, ink);
              box(group, 0.12, 1.05, 0.3, 0.5, 0.8, 0, ink);
              box(group, 1.12, 0.12, 0.3, 0, 1.28, 0, paper);
              box(group, 0.45, 0.04, 0.4, 0, 0.54, 0, paper);
            } else if (s.id === 'approve') {
              box(group, 0.92, 0.85, 0.65, 0, 0.42, 0, ink);
              const panel = box(group, 0.85, 0.06, 0.62, 0, 0.9, 0, paper);
              panel.rotation.x = 0.2;
              const screen = box(group, 0.5, 0.025, 0.29, 0, 0.955, -0.05, ink);
              screen.rotation.x = 0.2;
              box(group, 0.12, 0.04, 0.09, 0.26, 0.98, 0.19, stone);
            } else if (s.id === 'receipt') {
              for (const x of [-0.56, 0.56]) box(group, 0.09, 1.4, 0.66, x, 0.7, 0, ink);
              for (const y of [0.14, 0.65, 1.16]) {
                box(group, 1.2, 0.075, 0.66, 0, y, 0, stone);
                box(group, 0.64, 0.08, 0.4, -0.08, y + 0.08, 0, paper);
              }
            } else if (s.id === 'vault' || ('kind' in s && s.kind === 'vault')) {
              box(group, 0.9, 1.4, 0.8, 0, 0.7, 0, ink);
              box(group, 0.78, 1.23, 0.04, 0, 0.7, 0.42, stone);
              box(group, 0.04, 1.04, 0.04, -0.27, 0.7, 0.45, ink);
              const lock = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.035, 16), paper);
              lock.rotation.x = Math.PI / 2;
              lock.position.set(0.18, 0.75, 0.465);
              group.add(lock);
            } else {
              for (const x of [-0.53, 0.53]) box(group, 0.14, 1.6, 0.4, x, 0.8, 0, paper);
              box(group, 1.2, 0.16, 0.4, 0, 1.64, 0, paper);
              box(group, 1.35, 0.08, 0.9, 0, 0.04, 0.12, stone);
            }
          });
          const texture = new T.TextureLoader().load('/workshop/canon.png', () => {
            rendered = false;
          });
          texture.colorSpace = T.SRGBColorSpace;
          const sprite = new T.Sprite(
            new T.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
          );
          sprite.scale.set(1.5, 1.5, 1);
          sprite.renderOrder = 10;
          scene.add(sprite);
          const shadow = new T.Mesh(
            new T.CircleGeometry(0.32, 24),
            new T.MeshBasicMaterial({
              color: '#33332f',
              transparent: true,
              opacity: 0.22,
              depthWrite: false
            })
          );
          shadow.rotation.x = -Math.PI / 2;
          scene.add(shadow);
          const reduced = matchMedia('(prefers-reduced-motion: reduce)');
          travel = (id) => {
            const station = stations.find((s) => s.id === id);
            if (station) goal.set(station.x, 0, station.z + 1);
            pads.forEach((p, i) =>
              (p.material as import('three').MeshStandardMaterial).color.set(
                stations[i].id === id ? '#eee8dc' : '#a69f90'
              )
            );
            rendered = false;
          };
          refresh = () => {
            pads.forEach((pad, i) =>
              (pad.material as import('three').MeshStandardMaterial).color.set(
                stations[i].id === destination
                  ? '#f6edd9'
                  : statuses[stations[i].id] === 'Stale'
                    ? '#766d5d'
                    : stations[i].id === selected
                      ? '#eee8dc'
                      : '#a69f90'
              )
            );
            rendered = false;
          };
          travel(selected);
          const ray = new T.Raycaster();
          const pointer = new T.Vector2();
          const click = (event: PointerEvent) => {
            if (paused && !interactive) return;
            const rect = renderer.domElement.getBoundingClientRect();
            pointer.set(
              ((event.clientX - rect.left) / rect.width) * 2 - 1,
              (-(event.clientY - rect.top) / rect.height) * 2 + 1
            );
            ray.setFromCamera(pointer, camera);
            const hits = ray.intersectObjects(groups, true);
            if (hits.length) {
              let object = hits[0].object;
              while (object.parent && !object.userData.id) object = object.parent;
              if (object.userData.id) onselect(object.userData.id);
            } else {
              const point = ray.intersectObject(floor)[0]?.point;
              if (point) {
                goal.set(
                  Math.max(-4.3, Math.min(4.3, point.x)),
                  0,
                  Math.max(-3.7, Math.min(3.7, point.z))
                );
                rendered = false;
              }
            }
          };
          renderer.domElement.addEventListener('pointerup', click);
          const resize = new ResizeObserver(() => {
            rendered = false;
            const width = host.clientWidth,
              height = host.clientHeight,
              aspect = width / height;
            renderer.setSize(width, height);
            const halfHeight = Math.max(5.6, 7.5 / aspect);
            camera.left = -halfHeight * aspect;
            camera.right = halfHeight * aspect;
            camera.top = halfHeight;
            camera.bottom = -halfHeight;
            camera.updateProjectionMatrix();
          });
          resize.observe(host);
          let last = 0;
          renderer.setAnimationLoop((time: number) => {
            if (document.hidden || time - last < 1000 / 30) return;
            if (rendered && (paused || player.distanceToSquared(goal) < 0.0001)) return;
            const dt = Math.min((time - last) / 1000, 0.05);
            last = time;
            if (!paused) player.lerp(goal, reduced.matches ? 1 : 1 - Math.exp(-4 * dt));
            sprite.position.copy(player).y = 0.75;
            shadow.position.set(player.x, -0.025, player.z);
            renderer.render(scene, camera);
            rendered = true;
            labels = stations.map((s, i) => {
              const p = new T.Vector3(s.x, 1.8, s.z).project(camera);
              return {
                id: s.id,
                label: 'short' in s ? (s.short ?? s.label) : short[i],
                number: String(i + 1).padStart(2, '0'),
                left: (p.x + 1) * 50,
                top: (1 - p.y) * 50
              };
            });
          });
          cleanup = () => {
            renderer.setAnimationLoop(null);
            resize.disconnect();
            renderer.domElement.removeEventListener('pointerup', click);
            scene.traverse((object) => {
              const mesh = object as import('three').Mesh;
              mesh.geometry?.dispose();
              if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
              else mesh.material?.dispose();
            });
            texture.dispose();
            light.shadow.map?.dispose();
            renderer.dispose();
            renderer.domElement.remove();
            travel = undefined;
            refresh = undefined;
          };
        } catch {
          cleanup();
          unavailable = true;
        }
      })
      .catch(() => (unavailable = true));
    return () => {
      disposed = true;
      cleanup();
    };
  });
</script>

<div
  class="world"
  bind:this={host}
  aria-hidden={interactive ? undefined : 'true'}
  role={interactive ? 'group' : undefined}
  aria-label={interactive ? 'Practice stack objects in the isometric room' : undefined}
>
  <div class="world-caption">
    WORKSHOP / {interactive ? 'STACK' : '01'}
    <span>{interactive ? 'PREPARE · REVIEW · CHECK' : 'ONE CONTROLLED REQUEST'}</span>
  </div>
  {#each labels as label}{#if interactive}<button
        type="button"
        class="object-label"
        class:active={selected === label.id}
        class:receiving={destination === label.id}
        style:left={`${label.left}%`}
        style:top={`${label.top}%`}
        aria-label={`${stations.find((s) => s.id === label.id)?.label}: ${statuses[label.id] ?? 'Empty'}`}
        aria-pressed={selected === label.id}
        onclick={() => onselect(label.id)}
        ><span>{label.label}</span><small
          >{destination === label.id ? 'Place here' : (statuses[label.id] ?? 'Empty')}</small
        ></button
      >
    {:else}<span
        class:active={selected === label.id}
        class="station-label"
        style:left={`${label.left}%`}
        style:top={`${label.top}%`}><b>{label.number}</b> {label.label}</span
      >{/if}{/each}
  <div class="world-help">
    {interactive
      ? 'Tap an object, then its next destination. Keyboard: Tab and Enter.'
      : paused
        ? 'Paused for reading'
        : 'Tap a station or the floor to travel'}
  </div>
</div>
{#if unavailable}<p>
    3D view unavailable. All workshop actions remain available in the station list.
  </p>{/if}

<style>
  .world {
    position: relative;
    width: 100%;
    height: clamp(350px, 52vw, 520px);
    overflow: hidden;
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-surface);
  }
  .world-caption {
    position: absolute;
    top: 1.2rem;
    left: 1.2rem;
    right: 1.2rem;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.06em;
    color: var(--color-fg-secondary);
    pointer-events: none;
  }
  .station-label {
    position: absolute;
    z-index: 1;
    transform: translate(-50%, -100%);
    padding: 0.35rem 0.5rem;
    background: var(--color-bg-surface);
    color: var(--color-fg-secondary);
    font-size: 0.7rem;
    white-space: nowrap;
    pointer-events: none;
    border-bottom: 1px solid var(--color-border-default);
  }
  .station-label.active {
    color: var(--color-fg-primary);
    border-bottom: 2px solid currentColor;
  }
  .object-label {
    position: absolute;
    z-index: 2;
    transform: translate(-50%, -100%);
    padding: 0.4rem 0.55rem;
    min-height: 44px;
    min-width: 68px;
    max-width: 125px;
    color: var(--color-fg-primary, #eee);
    background: var(--color-bg-surface, #171716);
    border: 1px solid var(--color-border-default, #444);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }
  .object-label small {
    display: block;
    font-size: 0.62rem;
    margin-top: 0.2rem;
  }
  .object-label.active {
    border-color: currentColor;
  }
  .object-label.receiving {
    outline: 2px dashed var(--color-fg-primary, #eee);
    outline-offset: 3px;
  }
  .object-label:focus-visible {
    outline: 3px solid var(--color-fg-primary, #eee);
    outline-offset: 3px;
  }
  b {
    font: inherit;
    font-family: var(--font-mono);
    margin-right: 0.3rem;
  }
  .world-help {
    position: absolute;
    bottom: 1rem;
    left: 1.2rem;
    z-index: 1;
    color: var(--color-fg-secondary);
    font-size: 0.7rem;
    pointer-events: none;
  }
  @media (max-width: 480px) {
    .world-caption span {
      display: none;
    }
    .station-label {
      font-size: 0.6rem;
      padding: 0.2rem 0.3rem;
    }
    .world {
      height: 370px;
    }
    .object-label {
      font-size: 0.65rem;
      padding: 0.25rem;
      max-width: 95px;
    }
  }
</style>
