<script lang="ts">
  import { onMount } from 'svelte';
  import { stations } from './content';
  let {
    selected,
    paused,
    onselect
  }: { selected: string; paused: boolean; onselect: (id: string) => void } = $props();
  let host: HTMLDivElement;
  let unavailable = $state(false);
  let labels = $state<{ id: string; label: string; left: number; top: number }[]>([]);
  let travel: ((id: string) => void) | undefined;
  $effect(() => {
    travel?.(selected);
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
          const renderer = new T.WebGLRenderer({ antialias: true });
          renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
          host.appendChild(renderer.domElement);
          cleanup = () => { renderer.setAnimationLoop(null); renderer.dispose(); renderer.domElement.remove(); };
          let rendered = false;
          const camera = new T.PerspectiveCamera(45, 1, 0.1, 50);
          const player = new T.Vector3(0, 0, 0);
          const goal = player.clone();
          scene.add(new T.HemisphereLight(0xfff1db, 0x343434, 3));
          const floor = new T.Mesh(
            new T.BoxGeometry(10, 0.1, 9),
            new T.MeshStandardMaterial({ color: '#55514a', roughness: 1 })
          );
          floor.position.y = -0.1;
          scene.add(floor);
          const wall = new T.Mesh(new T.BoxGeometry(10, 1.5, .15), new T.MeshStandardMaterial({ color: '#625c52', roughness: 1 }));
          wall.position.set(0, .7, -4.5); scene.add(wall);
          const meshes: import('three').Mesh[] = [];
          for (const station of stations) {
            const desk = new T.Mesh(
              new T.BoxGeometry(1.2, 0.8, 0.8),
              new T.MeshStandardMaterial({ color: '#a29b8e' })
            );
            desk.position.set(station.x, 0.4, station.z);
            desk.userData.id = station.id;
            scene.add(desk);
            meshes.push(desk);
          }
          const texture = new T.TextureLoader().load('/workshop/canon.png');
          texture.colorSpace = T.SRGBColorSpace;
          const sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, transparent: true }));
          sprite.scale.set(1.4, 1.4, 1);
          scene.add(sprite);
          const reduced = matchMedia('(prefers-reduced-motion: reduce)');
          travel = (id) => {
            const s = stations.find((s) => s.id === id);
            if (s) goal.set(s.x, 0, s.z + 1);
            rendered = false;
          };
          travel(selected);
          const ray = new T.Raycaster();
          const pointer = new T.Vector2();
          const click = (event: PointerEvent) => {
            if (paused) return;
            const r = renderer.domElement.getBoundingClientRect();
            pointer.set(
              ((event.clientX - r.left) / r.width) * 2 - 1,
              (-(event.clientY - r.top) / r.height) * 2 + 1
            );
            ray.setFromCamera(pointer, camera);
            const hit = ray.intersectObjects(meshes)[0];
            if (hit) onselect(hit.object.userData.id);
          };
          renderer.domElement.addEventListener('pointerup', click);
          const resize = new ResizeObserver(() => {
            rendered = false;
            const width = host.clientWidth,
              height = host.clientHeight;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
          });
          resize.observe(host);
          let last = 0;
          renderer.setAnimationLoop((time: number) => {
            if (document.hidden || time - last < 1000 / 30) return;
            if (rendered && (paused || player.distanceToSquared(goal) < .0001)) return;
            const dt = Math.min((time - last) / 1000, 0.05);
            last = time;
            if (!paused) player.lerp(goal, reduced.matches ? 1 : 1 - Math.exp(-4 * dt));
            sprite.position.copy(player).y = 0.7;
            camera.position.set(player.x * 0.35, 7, player.z * 0.35 + 9);
            camera.lookAt(player.x * 0.3, 0, player.z * 0.3);
            renderer.render(scene, camera);
            rendered = true;
            labels = stations.map((s) => {
              const p = new T.Vector3(s.x, 1.2, s.z).project(camera);
              return { id: s.id, label: s.label, left: (p.x + 1) * 50, top: (1 - p.y) * 50 };
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
            renderer.dispose();
            renderer.domElement.remove();
            travel = undefined;
          };
        } catch {
          cleanup();
          unavailable = true;
        }
      })
      .catch(() => {
        unavailable = true;
      });
    return () => {
      disposed = true;
      cleanup();
    };
  });
</script>

<div class="world" bind:this={host} aria-hidden="true">
  {#each labels as label}<span style:left={`${label.left}%`} style:top={`${label.top}%`}
      >{label.label}</span
    >{/each}
</div>
{#if unavailable}<p>
    3D view unavailable. All workshop actions remain available in the station list.
  </p>{/if}

<style>
  .world {
    position: relative;
    width: 100%;
    height: min(50vh, 420px);
    min-height: 240px;
    overflow: hidden;
    border: 1px solid var(--color-border-default);
  }
  span {
    position: absolute;
    z-index: 1;
    transform: translate(-50%, -50%);
    padding: 0.5rem;
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
    font-size: 0.75rem;
    white-space: nowrap;
    pointer-events: none;
  }
</style>
