<script lang="ts">
  import { onMount, tick } from 'svelte';
  import FormView from './FormView.svelte';
  import type { Document } from './model';
  import { sequences, beatAt, type Sequence } from './motion';
  let {
    doc,
    tracks,
    renderSequence,
    renderTime,
    exportOnly = false
  }: {
    doc: Document;
    tracks?: Sequence[];
    renderSequence?: Sequence;
    renderTime?: number;
    exportOnly?: boolean;
  } = $props();
  let selection = $state<'context' | 'detail'>('context'),
    time = $state(0),
    playing = $state(false),
    reduced = $state(false),
    width = $state(1000);
  const seq = $derived(
    renderSequence ?? (tracks ?? sequences(doc)).find((s) => s.id === selection)!
  );
  const beat = $derived(beatAt(seq, renderTime ?? time));
  const compact = $derived(!exportOnly && width <= 600);
  let compactStage = $state<HTMLDivElement>();
  let world = $state<HTMLDivElement>();
  let tx = $state(0),
    ty = $state(0),
    zoom = $state(1);
  $effect(() => {
    const target = beat.target;
    const z = beat.zoom;
    const snapshot = doc;
    const viewportWidth = width;
    const cue = beat.state;
    const isCompact = compact;
    void snapshot;
    void cue;
    void tick().then(() => {
      if (isCompact && compactStage) {
        // Reframe only the scrollable teaching scene, never the surrounding
        // document. Keep Canon text at its actual size on a phone.
        const stage = compactStage;
        const targetNode =
          z > 1
            ? [...stage.querySelectorAll<HTMLElement>('[data-instance-id]')].find(
                (e) => e.dataset.instanceId === target
              )
            : cue === 'error' || cue === 'recovered'
              ? stage.querySelector<HTMLElement>('[role="alert"], [role="status"]')
              : null;
        stage.scrollTop = targetNode
          ? Math.max(
              0,
              stage.scrollTop +
                targetNode.getBoundingClientRect().top -
                stage.getBoundingClientRect().top -
                24
            )
          : 0;
        return;
      }
      if (!world) return;
      const el = [...world.querySelectorAll<HTMLElement>('[data-instance-id]')].find(
        (e) => e.dataset.instanceId === target
      );
      if (z === 1 || !el) {
        tx = 0;
        ty = 0;
        zoom = 1;
        return;
      }
      const rect = el.getBoundingClientRect(),
        base = world.getBoundingClientRect();
      const scale = (viewportWidth / 1200) * zoom;
      const x = (rect.left - base.left + rect.width / 2) / scale,
        y = (rect.top - base.top + rect.height / 2) / scale;
      const first = world
        .querySelector<HTMLElement>('.paper input')
        ?.closest<HTMLElement>('[data-instance-id]');
      const firstY = first ? (first.getBoundingClientRect().top - base.top) / scale : y;
      tx = 600 - x * z;
      ty = 16 - firstY * z;
      zoom = z;
    });
  });
  onMount(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    reduced = media.matches;
    const change = () => {
      reduced = media.matches;
      if (reduced) playing = false;
    };
    media.addEventListener('change', change);
    let last = 0,
      id = 0;
    const frame = (now: number) => {
      if (playing) {
        time = Math.min(seq.duration, time + (last ? now - last : 0) / 1000);
        if (time === seq.duration) playing = false;
      }
      last = now;
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(id);
      media.removeEventListener('change', change);
    };
  });
  function choose(value: 'context' | 'detail') {
    selection = value;
    time = 0;
    playing = false;
  }
</script>

{#if !exportOnly}<div class="motion-tools">
    <div class="sequences" aria-label="Camera sequence">
      <button
        class:active={selection === 'context'}
        aria-pressed={selection === 'context'}
        onclick={() => choose('context')}>01 / Context</button
      ><button
        class:active={selection === 'detail'}
        aria-pressed={selection === 'detail'}
        onclick={() => choose('detail')}>02 / Detail</button
      >
    </div>
    <span>Same composition · two explanations</span>
  </div>{/if}
<div
  class="viewport"
  class:compact
  bind:clientWidth={width}
  style:height={compact ? 'clamp(280px, 50svh, 480px)' : `${width * 0.75}px`}
  aria-label="Teaching animation"
  data-sequence={selection}
  data-time={(renderTime ?? time).toFixed(2)}
>
  {#if compact}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable scripted scene needs keyboard access; its form remains inert.) -->
    <div
      class="compact-stage"
      bind:this={compactStage}
      tabindex="0"
      role="region"
      aria-label="Scripted form preview; scroll to inspect"
    >
      <div class="compact-paper"><FormView {doc} scripted={beat.state} prefix="motion" /></div>
    </div>
  {:else}
    <div class="scale" style:transform={`scale(${width / 1200})`}>
      <div
        class="world"
        bind:this={world!}
        style:transform={`translate(${tx}px, ${ty}px) scale(${zoom})`}
        class:reduced
        class:playing
        class:detail={beat.zoom > 1}
      >
        <div class="paper"><FormView {doc} scripted={beat.state} prefix="motion" /></div>
        <aside>
          <p class="step">A BETTER NEXT STEP</p>
          <h3>Keep the context.<br />Make recovery clear.</h3>
          <p>
            Inputs, feedback and actions stay together. Change the explanation without rebuilding
            the form.
          </p>
          <div class="rule"></div>
          <span>Canon components<br />Agency composition<br />Draw motion</span>
        </aside>
      </div>
      <div class="caption">
        <span>LOCAL DEMONSTRATION</span>
        <p>{beat.caption}</p>
      </div>
    </div>
  {/if}
</div>
{#if compact}<div class="live-caption"><p>{beat.caption}</p></div>{/if}
{#if !exportOnly}<div class="transport">
    <button
      onclick={() => {
        if (time >= seq.duration) time = 0;
        playing = !playing;
      }}>{playing ? 'Pause' : 'Play'}</button
    ><label for="playhead">Time</label><input
      id="playhead"
      aria-label="Animation time"
      type="range"
      min="0"
      max={seq.duration}
      step="0.1"
      aria-valuetext={`${Number(time).toFixed(1)} of ${seq.duration} seconds`}
      bind:value={time}
      oninput={() => (playing = false)}
    /><output>{Number(time).toFixed(1)} / {seq.duration}s</output>
  </div>
  <p class="reason">
    {beat.reason}
    {reduced ? 'Reduced motion: camera changes use cuts.' : ''}
  </p>{/if}

<style>
  .motion-tools,
  .transport {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .motion-tools {
    justify-content: space-between;
    margin-bottom: 18px;
  }
  .motion-tools > span,
  .reason {
    font-size: 12px;
    color: var(--color-performance-muted);
  }
  .sequences {
    display: flex;
    gap: 4px;
  }
  button {
    min-height: 44px;
    font: inherit;
    font-size: 12px;
    border: 1px solid var(--color-performance-line);
    padding: 10px 14px;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  button.active {
    background: var(--color-performance-ink);
    color: var(--color-performance-paper);
  }
  .viewport {
    overflow: hidden;
    position: relative;
    background: var(--color-performance-paper);
    border: 1px solid var(--color-performance-line);
  }
  .compact-stage {
    height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .compact-paper {
    width: 100%;
  }
  .live-caption {
    padding: 12px 16px;
    min-height: 96px;
    background: var(--color-performance-ink);
    color: var(--color-performance-paper);
  }
  .live-caption p {
    margin: 0;
    font-size: 16px;
    line-height: 1.5;
  }
  .compact-stage:focus-visible,
  button:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--color-performance-signal);
    outline-offset: 3px;
  }
  .scale {
    width: 1200px;
    height: 900px;
    transform-origin: top left;
  }
  .world {
    width: 1200px;
    height: 900px;
    transform-origin: top left;
  }
  .world.playing:not(.reduced) {
    transition: transform 900ms cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  .detail aside {
    visibility: hidden;
  }
  .paper {
    position: absolute;
    left: 66px;
    top: 48px;
    width: 570px;
    border: 1px solid var(--color-performance-line);
  }
  aside {
    position: absolute;
    left: 744px;
    top: 200px;
    width: 350px;
    color: var(--color-performance-ink);
  }
  .step {
    font-family: var(--font-performance-mono);
    font-size: 11px;
    letter-spacing: 0.09em;
  }
  h3 {
    font-size: 38px;
    line-height: 1.12;
    letter-spacing: -0.035em;
    font-weight: 500;
    margin: 22px 0;
  }
  aside > p:not(.step) {
    font-size: 17px;
    line-height: 1.6;
    color: var(--color-performance-muted);
  }
  .rule {
    height: 1px;
    background: var(--color-performance-line);
    margin: 36px 0 20px;
  }
  aside > span {
    font-size: 13px;
    line-height: 1.8;
    color: var(--color-performance-muted);
  }
  .caption {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 26px 42px;
    background: var(--color-performance-ink);
    color: var(--color-performance-paper);
  }
  .caption span {
    font-family: var(--font-performance-mono);
    font-size: 10px;
    letter-spacing: 0.12em;
    opacity: 0.6;
  }
  .caption p {
    font-size: 23px;
    line-height: 1.3;
    margin: 8px 0 0;
  }
  .transport {
    margin-top: 16px;
    font-size: 12px;
  }
  .transport input {
    min-height: 44px;
    flex: 1;
    min-width: 70px;
    accent-color: var(--color-performance-ink);
  }
  .transport output {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .reason {
    min-height: 2.8em;
    line-height: 1.5;
  }
  .transport label {
    position: absolute;
    clip-path: inset(50%);
  }
  @media (max-width: 650px) {
    .motion-tools {
      align-items: flex-start;
      flex-direction: column;
    }
    .transport {
      gap: 8px;
    }
  }
</style>
