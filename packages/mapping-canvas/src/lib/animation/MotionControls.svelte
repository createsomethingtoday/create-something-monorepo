<script lang="ts">
  import {
    evaluateCamera,
    type Project,
    type Drawing,
    type Operation,
    type CameraPose,
    type Boil,
    type Flipbook
  } from './model';
  let {
    project,
    current,
    time,
    disabled = false,
    apply,
    seek
  }: {
    project: Project;
    current?: Drawing;
    time: number;
    disabled?: boolean;
    apply: (ops: Operation[]) => void;
    seek: (time: number) => void;
  } = $props();
  const camera = $derived(evaluateCamera(project, time));
  function cameraKey(key: keyof CameraPose, value: number | string) {
    const pose = { ...camera, time, [key]: value };
    const existing =
      project.camera ??
      (time > 0
        ? [
            {
              time: 0,
              x: project.width / 2,
              y: project.height / 2,
              zoom: 1,
              easing: 'ease' as const
            }
          ]
        : []);
    apply([
      {
        type: 'set_camera',
        poses: [...existing.filter((p) => Math.abs(p.time - time) > 1e-6), pose].sort(
          (a, b) => a.time - b.time
        )
      }
    ]);
  }
  function updateDrawing(patch: Partial<Drawing>) {
    if (current) apply([{ type: 'put_drawing', drawing: { ...current, ...patch } }]);
  }
  function boil(key: keyof Boil, value: number) {
    if (current)
      updateDrawing({ boil: { amplitude: 1.2, fps: 8, seed: 1, ...current.boil, [key]: value } });
  }
  function flipbook(key: keyof Flipbook, value: number | string) {
    if (!current) return;
    const f = {
      columns: 3,
      rows: 1,
      frames: 3,
      fps: 8,
      seed: 0,
      registration: 'alpha' as const,
      ...current.flipbook,
      [key]: value
    };
    const asset = project.assets.find((a) => a.id === current.assetId);
    updateDrawing({
      flipbook: f,
      ...(asset
        ? { height: (current.width * (asset.height / f.rows)) / (asset.width / f.columns) }
        : {})
    });
  }
  function disableEffect(key: 'boil' | 'flipbook') {
    if (!current) return;
    const d = { ...current };
    delete d[key];
    apply([{ type: 'put_drawing', drawing: d }]);
  }
</script>

{#if current}
  <details open class="motion-controls">
    <summary>Drawing character</summary>
    <label
      ><input
        type="checkbox"
        aria-label="Fixed to screen"
        checked={current.space === 'screen'}
        {disabled}
        onchange={(e) => updateDrawing({ space: e.currentTarget.checked ? 'screen' : 'world' })}
      /> Fixed to screen</label
    >
    {#if current.kind === 'stroke'}
      <label
        ><input
          type="checkbox"
          aria-label="Hand-drawn line boil"
          checked={!!current.boil}
          {disabled}
          onchange={(e) =>
            e.currentTarget.checked ? boil('amplitude', 1.2) : disableEffect('boil')}
        /> Hand-drawn redraw</label
      >
      {#if current.boil}
        <label
          >Line variation<input
            aria-label="Line boil amount"
            type="number"
            min="0"
            max="5"
            step="0.2"
            value={current.boil.amplitude}
            {disabled}
            onchange={(e) => boil('amplitude', Number(e.currentTarget.value))}
          /></label
        >
        <label
          >Redraws / second<input
            aria-label="Line redraw rate"
            type="number"
            min="1"
            max="24"
            value={current.boil.fps}
            {disabled}
            onchange={(e) => boil('fps', Number(e.currentTarget.value))}
          /></label
        >
        <label
          >Variation seed<input
            aria-label="Line variation seed"
            type="number"
            min="0"
            max="65535"
            value={current.boil.seed}
            {disabled}
            onchange={(e) => boil('seed', Number(e.currentTarget.value))}
          /></label
        >
      {/if}
    {:else if current.kind === 'image'}
      <label
        ><input
          type="checkbox"
          aria-label="Play image variations"
          checked={!!current.flipbook}
          {disabled}
          onchange={(e) =>
            e.currentTarget.checked ? flipbook('columns', 3) : disableEffect('flipbook')}
        /> Play image variations</label
      >
      {#if current.flipbook}
        <p>One image sheet, read left to right, then down.</p>
        {#each [['columns', 'Sheet columns'], ['rows', 'Sheet rows'], ['frames', 'Variation frames'], ['fps', 'Image redraw rate'], ['seed', 'Image variation seed']] as [key, label]}
          <label
            >{label}<input
              aria-label={label}
              type="number"
              min={key === 'seed' ? 0 : 1}
              value={current.flipbook[key as keyof Flipbook] as number}
              {disabled}
              onchange={(e) => flipbook(key as keyof Flipbook, Number(e.currentTarget.value))}
            /></label
          >
        {/each}
        <label
          >Alignment<select
            aria-label="Variation alignment"
            value={current.flipbook.registration}
            {disabled}
            onchange={(e) => flipbook('registration', e.currentTarget.value)}
            ><option value="alpha">Align transparent silhouettes</option><option value="cell"
              >Keep sheet cell positions</option
            ></select
          ></label
        >
      {/if}
    {/if}
  </details>
{/if}
<details class="motion-controls">
  <summary>Camera</summary>
  <p>Move the scene beneath a camera. Fixed drawings stay in place.</p>
  {#each [['x', 'Camera X'], ['y', 'Camera Y'], ['zoom', 'Camera zoom']] as [key, label]}
    <label
      >{label}<input
        aria-label={label}
        type="number"
        step={key === 'zoom' ? 0.05 : 10}
        value={Number(camera[key as 'x' | 'y' | 'zoom'].toFixed(3))}
        {disabled}
        onchange={(e) => cameraKey(key as keyof CameraPose, Number(e.currentTarget.value))}
      /></label
    >
  {/each}
  <label
    >To next camera pose<select
      aria-label="Camera transition"
      value={camera.easing}
      {disabled}
      onchange={(e) => cameraKey('easing', e.currentTarget.value)}
      ><option value="ease">Ease in / out</option><option value="linear">Linear</option><option
        value="hold">Hold, then switch</option
      ></select
    ></label
  >
  <button {disabled} onclick={() => cameraKey('zoom', camera.zoom)}>Set camera pose</button>
  <div class="key-list">
    {#each project.camera ?? [] as k}<button {disabled} onclick={() => seek(k.time)}
        >{k.time.toFixed(2)}s camera</button
      >{/each}
  </div>
  <button
    disabled={disabled || !project.camera?.some((k) => Math.abs(k.time - time) < 1e-6)}
    onclick={() => {
      const remaining = project.camera!.filter((k) => Math.abs(k.time - time) >= 1e-6);
      apply([
        {
          type: 'set_camera',
          poses: remaining.length
            ? remaining
            : [{ time: 0, x: project.width / 2, y: project.height / 2, zoom: 1, easing: 'ease' }]
        }
      ]);
    }}>Remove camera pose</button
  >
</details>

<style>
  details {
    margin: 16px 0;
    border-top: 1px solid #38342e;
    padding-top: 12px;
  }
  summary {
    cursor: pointer;
    color: #d5b881;
    margin-bottom: 12px;
  }
  label {
    display: block;
    margin: 8px 0;
    font-size: 12px;
  }
  input:not([type='checkbox']),
  select {
    width: 100%;
    margin-top: 4px;
  }
  input[type='checkbox'] {
    width: auto;
    margin-right: 6px;
  }
  p {
    font-size: 12px;
    color: #aaa399;
    line-height: 1.5;
  }
</style>
