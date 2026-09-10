<script lang="ts">
  import { onMount } from 'svelte';
  import {
    newProject,
    basePose,
    makeId,
    evaluate,
    applyOperations,
    parseProject,
    validateProject,
    putPose,
    type Project,
    type Drawing,
    type Operation,
    type Pose,
    type Point,
    type Asset
  } from '$lib/animation/model';
  import { Renderer, importImage, toLocal, toWorld } from '$lib/animation/render';
  import {
    loadProjects,
    loadProject,
    saveProject,
    type ProjectSummary
  } from '$lib/animation/storage';
  import { animationTools } from '$lib/animation/tools';
  import { download, png, exportVideo } from '$lib/animation/export';
  import { importMap } from '$lib/animation/import-map';
  import { parse as parseMap } from '$lib/document';
  import { loadDocument } from '$lib/persistence';
  import { registerDrawWebMcpTools } from '$lib/webmcp';
  import './page.css';
  let project = $state.raw<Project>(newProject()),
    projects = $state.raw<ProjectSummary[]>([]),
    past = $state.raw<Project[]>([]),
    future = $state.raw<Project[]>([]);
  let ready = $state(false),
    busy = $state(false),
    status = $state('Loading animation projects…'),
    time = $state(0),
    selected = $state(''),
    playing = $state(false),
    ghosts = $state(2),
    tool = $state<'select' | 'pen' | 'points'>('select');
  let canvas: HTMLCanvasElement, fileInput: HTMLInputElement, imageInput: HTMLInputElement;
  let renderer = new Renderer(),
    assetsReady = $state(false),
    raf = 0,
    exportAbort: AbortController | undefined;
  let exporting = $state(false),
    exportProgress = $state(0),
    showHelp = $state(false),
    frames = $state(0),
    p95 = $state(0),
    drawMilliseconds = $state(0);
  let drag: { start: Point; drawing: Drawing; pose: Pose; pointIndex: number } | undefined;
  let penPoints: Point[] = [];
  let preview = $state.raw<Drawing | null>(null);
  let queue = Promise.resolve();
  const current = $derived(project.drawings.find((d) => d.id === selected));
  const pose = $derived(current ? evaluate(current, time) : undefined);
  const shown = $derived(
    preview
      ? { ...project, drawings: project.drawings.map((d) => (d.id === preview!.id ? preview! : d)) }
      : project
  );
  onMount(() => {
    void (async () => {
      try {
        projects = await loadProjects();
        const requested = new URL(location.href).searchParams.get('project');
        const summary = projects.find((p) => p.id === requested) ?? projects[0];
        project = summary ? await loadProject(summary.id) : newProject();
        if (!projects.length) {
          await saveProject(project, null);
          projects = [{ id: project.id, title: project.title, revision: project.revision }];
        }
        ready = true;
        status = 'Saved on this device';
      } catch (e) {
        status = message(e);
      }
    })();
    registerDrawWebMcpTools(
      animationTools({
        get: () => {
          if (!ready) throw new Error('Animation is loading; retry when ready.');
          return project;
        },
        time: () => time,
        apply: commit,
        seek: (t, id) => {
          stop();
          time = t;
          if (id) selected = id;
        },
        history
      })
    );
    return () => {
      cancelAnimationFrame(raf);
      exportAbort?.abort();
    };
  });
  $effect(() => {
    const assets = project.assets;
    assetsReady = false;
    let active = true;
    void renderer
      .prepare(assets)
      .then(() => {
        if (active) assetsReady = true;
      })
      .catch((e) => {
        if (active) status = message(e);
      });
    return () => {
      active = false;
    };
  });
  $effect(() => {
    if (canvas && assetsReady) {
      const start = performance.now();
      renderer.paint(canvas.getContext('2d')!, shown, time, {
        ghosts: playing ? 0 : ghosts,
        selected: playing ? '' : selected,
        points: tool === 'points' && !playing
      });
      drawMilliseconds = performance.now() - start;
    }
  });
  const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
  const run = (action: () => Promise<unknown>) => {
    void action().catch((e) => (status = message(e)));
  };
  function commit(ops: Operation[], revision: number): Promise<void> {
    const work = queue.then(async () => {
      if (!ready || busy || exporting) throw new Error('Editor is busy; retry after it is ready.');
      stop();
      busy = true;
      try {
        const next = applyOperations(project, ops, revision);
        const prepared = renderer.fork();
        await prepared.prepare(next.assets);
        await saveProject(next, project.revision);
        renderer = prepared;
        past = [...past.slice(-39), project];
        future = [];
        project = next;
        projects = projects.map((p) =>
          p.id === next.id ? { id: next.id, title: next.title, revision: next.revision } : p
        );
        time = Math.min(time, project.duration);
        if (selected && !project.drawings.some((d) => d.id === selected)) selected = '';
        status = 'Saved on this device';
      } finally {
        busy = false;
      }
    });
    queue = work.catch(() => {});
    return work;
  }
  async function history(direction: 'undo' | 'redo') {
    if (busy || exporting) throw new Error('Editor is busy.');
    const stack = direction === 'undo' ? past : future;
    const target = stack.at(-1);
    if (!target) return;
    stop();
    busy = true;
    try {
      const next = { ...target, revision: project.revision + 1 };
      const prepared = renderer.fork();
      await prepared.prepare(next.assets);
      await saveProject(next, project.revision);
      renderer = prepared;
      if (direction === 'undo') {
        past = past.slice(0, -1);
        future = [...future, project];
      } else {
        future = future.slice(0, -1);
        past = [...past, project];
      }
      project = next;
      projects = projects.map((p) =>
        p.id === next.id ? { id: next.id, title: next.title, revision: next.revision } : p
      );
      time = Math.min(time, next.duration);
      status = `${direction === 'undo' ? 'Undid' : 'Redid'} change · saved`;
    } finally {
      busy = false;
    }
  }
  function stop() {
    playing = false;
    cancelAnimationFrame(raf);
  }
  function play() {
    if (playing) {
      stop();
      return;
    }
    if (!assetsReady) return;
    if (time >= project.duration) time = 0;
    playing = true;
    const start = performance.now() - time * 1000;
    let prior = performance.now();
    const intervals: number[] = [];
    frames = 0;
    const tick = (now: number) => {
      intervals.push(now - prior);
      prior = now;
      frames++;
      time = Math.min(
        project.duration,
        Math.floor(((now - start) / 1000) * project.fps) / project.fps
      );
      if (time >= project.duration) {
        stop();
        const sorted = intervals.sort((a, b) => a - b);
        p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  function updatePose(key: keyof Pose, value: number | string) {
    if (!current || !pose) return;
    const k = { ...pose, time: Math.round(time * project.fps) / project.fps, [key]: value };
    run(() => commit([{ type: 'put_pose', id: current!.id, pose: k }], project.revision));
  }
  function changeSetting(key: 'title' | 'duration' | 'fps' | 'background', value: string | number) {
    run(() => commit([{ type: 'settings', [key]: value }], project.revision));
  }
  async function fresh(p = newProject()) {
    if (busy || exporting) throw new Error('Editor is busy.');
    stop();
    busy = true;
    try {
      validateProject(p);
      const prepared = renderer.fork();
      await prepared.prepare(p.assets);
      await saveProject(p, null);
      renderer = prepared;
      project = p;
      window.history.replaceState(null, '', `/animate?project=${p.id}`);
      projects = [{ id: p.id, title: p.title, revision: p.revision }, ...projects];
      past = [];
      future = [];
      time = 0;
      selected = '';
      status = 'New project saved · other projects preserved';
    } finally {
      busy = false;
    }
  }
  async function importFile(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 40_000_000) throw new Error('Project must be under 40 MB.');
    const text = await file.text();
    let p: Project;
    if (JSON.parse(text).version === 'draw.animation.v1') p = parseProject(text);
    else {
      const map = parseMap(text),
        result = importMap(map);
      p = { ...newProject(), title: map.title, drawings: result.drawings };
      status = `Copied drawing; ${result.skipped} mapping-only objects omitted`;
    }
    await fresh({ ...p, id: makeId(), revision: 0 });
  }
  async function addAsset(asset: Asset, projectId: string, revision: number) {
    if (project.id !== projectId || project.revision !== revision)
      throw new Error('Project changed while importing. Import the asset again.');
    const width = Math.min(400, asset.width),
      height = (asset.height * width) / asset.width;
    const d: Drawing = {
      id: makeId(),
      name: asset.name,
      kind: 'image',
      assetId: asset.id,
      points: [],
      text: '',
      color: '#292522',
      weight: 3,
      width,
      height,
      poses: [{ ...basePose(), x: (project.width - width) / 2, y: (project.height - height) / 2 }]
    };
    await commit(
      [
        { type: 'put_asset', asset },
        { type: 'put_drawing', drawing: d }
      ],
      project.revision
    );
    selected = d.id;
  }
  async function imageFile(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const projectId = project.id,
      revision = project.revision;
    if (file.name.endsWith('.json')) {
      if (file.size > 9_000_000) throw new Error('Asset bundle is too large.');
      const bundle = JSON.parse(await file.text());
      if (bundle.version !== 'draw.asset.v1') throw new Error('Expected a draw.asset.v1 bundle.');
      await addAsset({ ...bundle.asset, id: makeId() }, projectId, revision);
    } else await addAsset(await importImage(file), projectId, revision);
  }
  async function copyMap() {
    const map = await loadDocument();
    if (!map) throw new Error('No drawing saved on this device.');
    const result = importMap(map);
    await fresh({ ...newProject(), title: `${map.title} · animation`, drawings: result.drawings });
    status = `Copied ${result.drawings.length} marks; ${result.skipped} mapping-only objects omitted. Original map preserved.`;
  }
  function add(kind: 'circle' | 'text') {
    const d: Drawing = {
      id: makeId(),
      name: kind === 'circle' ? 'Circle' : 'Caption',
      kind: kind === 'circle' ? 'stroke' : 'text',
      points:
        kind === 'circle'
          ? Array.from({ length: 49 }, (_, i) => ({
              x: Math.cos((i / 48) * Math.PI * 2) * 55,
              y: Math.sin((i / 48) * Math.PI * 2) * 55
            }))
          : [],
      text: kind === 'text' ? 'A request arrives' : '',
      color: '#292522',
      weight: kind === 'text' ? 30 : 4,
      width: 650,
      height: 100,
      poses: [{ ...basePose(), x: project.width / 2, y: project.height / 2 }]
    };
    run(async () => {
      await commit([{ type: 'put_drawing', drawing: d }], project.revision);
      selected = d.id;
    });
  }
  function point(e: PointerEvent): Point {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * project.width) / r.width,
      y: ((e.clientY - r.top) * project.height) / r.height
    };
  }
  function pointerDown(e: PointerEvent) {
    if (busy || exporting || !ready || e.button !== 0) return;
    stop();
    const p = point(e);
    canvas.setPointerCapture(e.pointerId);
    if (tool === 'pen') {
      penPoints = [p];
      return;
    }
    if (tool === 'points' && current?.kind === 'stroke' && pose) {
      const i = pose.points.findIndex((pt) => {
        const w = toWorld(pt, pose);
        return Math.hypot(w.x - p.x, w.y - p.y) < 16;
      });
      if (i >= 0) drag = { start: p, drawing: current, pose: { ...pose, time }, pointIndex: i };
      return;
    }
    const hit = [...project.drawings].reverse().find((d) => {
      const k = evaluate(d, time),
        local = toLocal(p, k);
      if (k.opacity === 0) return false;
      if (d.kind !== 'stroke')
        return local.x >= 0 && local.y >= 0 && local.x <= d.width && local.y <= d.height;
      const xs = k.points.map((pt) => pt.x),
        ys = k.points.map((pt) => pt.y);
      return (
        local.x >= Math.min(...xs) - 12 &&
        local.x <= Math.max(...xs) + 12 &&
        local.y >= Math.min(...ys) - 12 &&
        local.y <= Math.max(...ys) + 12
      );
    });
    selected = hit?.id ?? '';
    if (hit)
      drag = { start: p, drawing: hit, pose: { ...evaluate(hit, time), time }, pointIndex: -1 };
  }
  function pointerMove(e: PointerEvent) {
    const p = point(e);
    if (tool === 'pen' && penPoints.length) {
      if (
        penPoints.length < 1000 &&
        Math.hypot(p.x - penPoints.at(-1)!.x, p.y - penPoints.at(-1)!.y) > 3
      )
        penPoints.push(p);
      renderer.paint(canvas.getContext('2d')!, project, time, { ghosts });
      const ctx = canvas.getContext('2d')!;
      ctx.strokeStyle = '#292522';
      ctx.lineWidth = 3;
      ctx.beginPath();
      penPoints.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
      ctx.stroke();
      return;
    }
    if (!drag) return;
    const k = { ...drag.pose };
    if (drag.pointIndex < 0) {
      k.x += p.x - drag.start.x;
      k.y += p.y - drag.start.y;
    } else {
      k.points = [...(drag.pose.points ?? drag.drawing.points)];
      k.points[drag.pointIndex] = toLocal(p, drag.pose as ReturnType<typeof evaluate>);
    }
    preview = putPose(drag.drawing, k);
  }
  function pointerUp() {
    if (penPoints.length > 1) {
      const origin = penPoints[0],
        d: Drawing = {
          id: makeId(),
          name: 'Pencil stroke',
          kind: 'stroke',
          points: penPoints.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y })),
          text: '',
          color: '#292522',
          weight: 3,
          width: 100,
          height: 100,
          poses: [{ ...basePose(), x: origin.x, y: origin.y }]
        };
      run(async () => {
        await commit([{ type: 'put_drawing', drawing: d }], project.revision);
        selected = d.id;
      });
    }
    penPoints = [];
    if (preview) {
      const d = preview;
      preview = null;
      run(() => commit([{ type: 'put_drawing', drawing: d }], project.revision));
    }
    drag = undefined;
  }
  async function video() {
    stop();
    exporting = true;
    exportProgress = 0;
    exportAbort = new AbortController();
    try {
      const blob = await exportVideo(project, (v) => (exportProgress = v), exportAbort.signal);
      download(blob, `draw-animation.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
      status = 'Video exported · silent, ready for narration and assembly';
    } finally {
      exporting = false;
    }
  }
</script>

<svelte:head
  ><title>{project.title} · Draw Animation</title><meta
    name="description"
    content="Draw, pose and animate illustrations with your agent. Editable drawings, onion skins and local video export."
  /></svelte:head
>
<main>
  <header>
    <a href="/" class="brand">DRAW <span>ANIMATION</span></a><input
      aria-label="Animation title"
      value={project.title}
      onchange={(e) => changeSetting('title', e.currentTarget.value)}
      disabled={!ready || busy || exporting}
    /><button onclick={() => (showHelp = !showHelp)}>Codex assets</button><button
      onclick={() => run(() => fresh())}
      disabled={!ready || busy || exporting}>New</button
    ><button onclick={() => fileInput.click()} disabled={!ready || busy || exporting}
      >Open project</button
    ><button
      onclick={() =>
        download(
          new Blob([JSON.stringify(project)], { type: 'application/json' }),
          'animation.draw.json'
        )}
      disabled={!ready}>Save project</button
    ><a href="/">Back to drawing</a>
  </header>
  {#if showHelp}<aside class="help">
      <strong>Create artwork in your Codex conversation.</strong> Ask Codex to generate an
      illustration using its built-in image tool, then import the image or its Draw asset bundle
      here. Generation uses your Codex account; this editor does not call an image API. Images
      remain reusable raster layers; pencil strokes stay editable vectors.
      <a href="/draw-animation-guide.md" target="_blank">Agent workflow and export guide</a>
    </aside>{/if}
  <div class="workspace">
    <aside class="layers">
      <div class="section-label">PROJECTS</div>
      <select
        aria-label="Saved animation project"
        value={project.id}
        disabled={!ready || busy || exporting}
        onchange={(e) => {
          const id = e.currentTarget.value;
          run(async () => {
            stop();
            busy = true;
            try {
              const p = await loadProject(id);
              const prepared = renderer.fork();
              await prepared.prepare(p.assets);
              renderer = prepared;
              project = p;
              window.history.replaceState(null, '', `/animate?project=${p.id}`);
              past = [];
              future = [];
              selected = '';
              time = 0;
            } finally {
              busy = false;
            }
          });
        }}
        >{#each projects as p}<option value={p.id}>{p.title}</option>{/each}</select
      >
      <div class="section-label">ARTWORK</div>
      <div class="tools">
        <button class:active={tool === 'select'} onclick={() => (tool = 'select')}>Move</button
        ><button class:active={tool === 'pen'} onclick={() => (tool = 'pen')}>Pencil</button><button
          class:active={tool === 'points'}
          onclick={() => (tool = 'points')}>Edit points</button
        >
      </div>
      <div class="tools">
        <button onclick={() => add('circle')} disabled={!ready || busy || exporting}
          >+ Circle</button
        ><button onclick={() => add('text')} disabled={!ready || busy || exporting}
          >+ Caption</button
        >
      </div>
      <button onclick={() => imageInput.click()} disabled={!ready || busy || exporting}
        >+ Image / asset</button
      ><button
        onclick={() =>
          run(async () => {
            const r = await fetch('/approval-pilot.draw.json');
            if (!r.ok) throw new Error('Sample could not load.');
            await fresh({ ...parseProject(await r.text()), id: makeId(), revision: 0 });
          })}
        disabled={!ready || busy || exporting}>Open sample tutorial</button
      ><button onclick={() => run(copyMap)} disabled={!ready || busy || exporting}
        >Copy saved drawing</button
      >
      <div class="drawing-list">
        {#each project.drawings as d (d.id)}<button
            class:active={selected === d.id}
            onclick={() => {
              selected = d.id;
              stop();
            }}
            ><span>{d.kind === 'image' ? '▧' : d.kind === 'text' ? 'T' : '〰'}</span>{d.name}<small
              >{d.poses.length} poses</small
            ></button
          >{/each}
      </div>
      {#if !project.drawings.length}<p class="muted">
          Add a drawing, set a pose, then move forward in time and change it.
        </p>{/if}
    </aside>
    <section class="stage" aria-label="Animation stage">
      <div class="stage-meta">
        <span>{project.width} × {project.height}</span><span
          >{playing
            ? 'Playing'
            : tool === 'points'
              ? 'Drag a point to change this pose'
              : tool === 'pen'
                ? 'Draw a stroke'
                : 'Drag artwork to set its position'}</span
        >
      </div>
      <canvas
        bind:this={canvas}
        width={project.width}
        height={project.height}
        style:aspect-ratio={project.width / project.height}
        onpointerdown={pointerDown}
        onpointermove={pointerMove}
        onpointerup={pointerUp}
        onpointercancel={() => {
          drag = undefined;
          preview = null;
          penPoints = [];
        }}
        aria-label="Illustration animation canvas"
      ></canvas>
      <div class="stage-meta">
        <span>{project.drawings.length} drawings · {project.assets.length} reusable assets</span
        ><span
          >{drawMilliseconds.toFixed(1)} ms draw{#if p95 > 0}
            · playback p95 {p95.toFixed(1)} ms{/if}</span
        >
      </div>
    </section>
    <aside class="inspector">
      <div class="section-label">{current ? 'SELECTED DRAWING' : 'SCENE'}</div>
      {#if current && pose}<input
          aria-label="Drawing name"
          value={current.name}
          onchange={(e) => {
            const name = e.currentTarget.value;
            run(() =>
              commit([{ type: 'put_drawing', drawing: { ...current!, name } }], project.revision)
            );
          }}
          disabled={busy || exporting}
        />
        {#if current.kind === 'text'}<textarea
            aria-label="Caption text"
            value={current.text}
            onchange={(e) => {
              const text = e.currentTarget.value;
              run(() =>
                commit([{ type: 'put_drawing', drawing: { ...current!, text } }], project.revision)
              );
            }}
            disabled={busy || exporting}
          ></textarea>{/if}
        <div class="pose-fields">
          {#each [['x', 'X'], ['y', 'Y'], ['rotation', 'Rotation °'], ['scaleX', 'Scale X'], ['scaleY', 'Scale Y'], ['opacity', 'Opacity'], ['reveal', 'Reveal']] as [key, label]}<label
              >{label}<input
                aria-label={label}
                type="number"
                step={key.startsWith('scale') || key === 'opacity' || key === 'reveal' ? 0.1 : 1}
                value={pose[key as keyof Pose] as number}
                onchange={(e) => updatePose(key as keyof Pose, Number(e.currentTarget.value))}
                disabled={busy || exporting}
              /></label
            >{/each}
        </div>
        <label
          >To next pose<select
            aria-label="Pose transition"
            value={pose.easing}
            onchange={(e) => updatePose('easing', e.currentTarget.value)}
            disabled={busy || exporting}
            ><option value="ease">Ease in / out</option><option value="linear">Linear</option
            ><option value="hold">Hold, then switch</option></select
          ></label
        ><button
          class="primary"
          onclick={() =>
            run(() =>
              commit(
                [{ type: 'put_pose', id: current!.id, pose: { ...pose!, time } }],
                project.revision
              )
            )}
          disabled={busy || exporting}>Set key pose</button
        >
        <div class="key-list">
          {#each current.poses as k}<button
              class:active={Math.abs(time - k.time) < 0.001}
              onclick={() => {
                stop();
                time = k.time;
              }}>{k.time.toFixed(2)}s</button
            >{/each}
        </div>
        <button
          onclick={() =>
            run(() => commit([{ type: 'remove_pose', id: current!.id, time }], project.revision))}
          disabled={busy ||
            exporting ||
            current.poses.length < 2 ||
            !current.poses.some((k) => k.time === time)}>Remove current pose</button
        ><button
          onclick={() =>
            run(() =>
              commit(
                [
                  {
                    type: 'put_drawing',
                    drawing: { ...current!, id: makeId(), name: `${current!.name} copy` }
                  }
                ],
                project.revision
              )
            )}
          disabled={busy || exporting}>Duplicate drawing</button
        ><button
          onclick={() =>
            run(() => commit([{ type: 'remove_drawing', id: current!.id }], project.revision))}
          disabled={busy || exporting}>Remove drawing</button
        >
      {:else}<p class="muted">
          Select a drawing to edit its pose. Each change at a new time creates a key pose.
        </p>{/if}
      <div class="section-label">OUTPUT</div>
      <label
        >Duration (seconds)<input
          aria-label="Animation duration"
          type="number"
          min="0.1"
          max="120"
          step="0.1"
          value={project.duration}
          onchange={(e) => changeSetting('duration', Number(e.currentTarget.value))}
          disabled={busy || exporting}
        /></label
      ><label
        >Frames per second<input
          aria-label="Frames per second"
          type="number"
          min="1"
          max="60"
          value={project.fps}
          onchange={(e) => changeSetting('fps', Number(e.currentTarget.value))}
          disabled={busy || exporting}
        /></label
      ><label
        >Paper<input
          aria-label="Paper color"
          type="color"
          value={project.background}
          onchange={(e) => changeSetting('background', e.currentTarget.value)}
          disabled={busy || exporting}
        /></label
      >
      <button
        onclick={() =>
          run(async () => {
            const r = new Renderer();
            await r.prepare(project.assets);
            const c = document.createElement('canvas');
            c.width = project.width;
            c.height = project.height;
            r.paint(c.getContext('2d')!, project, time);
            download(await png(c), 'animation-frame.png');
          })}
        disabled={!assetsReady || exporting}>Export clean frame</button
      ><button
        class="primary"
        onclick={() => run(video)}
        disabled={!assetsReady || busy || exporting || !project.drawings.length}
        >Export video</button
      >{#if exporting}<progress max="1" value={exportProgress}></progress><button
          onclick={() => exportAbort?.abort()}>Cancel export</button
        ><small>Keep this tab visible while recording.</small>{/if}
    </aside>
  </div>
  <footer>
    <div class="transport">
      <button
        onclick={() => run(() => history('undo'))}
        disabled={!past.length || busy || exporting}>Undo</button
      ><button
        onclick={() => run(() => history('redo'))}
        disabled={!future.length || busy || exporting}>Redo</button
      ><button class="primary" onclick={play} disabled={!ready || !assetsReady || exporting}
        >{playing ? 'Pause' : 'Play'}</button
      ><input
        aria-label="Playhead seconds"
        type="number"
        min="0"
        max={project.duration}
        step={1 / project.fps}
        value={Number(time.toFixed(3))}
        onchange={(e) => {
          stop();
          time = Math.max(0, Math.min(project.duration, Number(e.currentTarget.value) || 0));
        }}
      /><span>/ {project.duration}s</span><label
        >Ghosts<select aria-label="Onion skin frames" bind:value={ghosts}
          ><option value={0}>Off</option><option value={1}>1 each side</option><option value={2}
            >2 each side</option
          ><option value={3}>3 each side</option></select
        ></label
      >
    </div>
    <input
      class="timeline"
      aria-label="Animation timeline"
      type="range"
      min="0"
      max={project.duration}
      step={1 / project.fps}
      value={time}
      oninput={(e) => {
        stop();
        time = Number(e.currentTarget.value);
      }}
    />
    <div class="status" role="status">{status}</div>
  </footer>
  <input
    class="hidden"
    bind:this={fileInput}
    type="file"
    accept="application/json,.json"
    onchange={(e) => run(() => importFile(e))}
  /><input
    class="hidden"
    bind:this={imageInput}
    type="file"
    accept="image/png,image/jpeg,image/webp,application/json,.json"
    onchange={(e) => run(() => imageFile(e))}
  />
</main>
