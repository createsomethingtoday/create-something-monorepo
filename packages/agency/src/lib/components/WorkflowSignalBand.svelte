<script lang="ts">
  import { onMount } from 'svelte';
  import { reducedFilmMotion } from '$lib/motion/filmPlayback';
  import AgencyWayfindingSign from './AgencyWayfindingSign.svelte';

  export let showContinuation = true;

  let canvas: HTMLCanvasElement;
  let field: HTMLElement;

  onMount(() => {
    const context = canvas.getContext('2d');
    if (!context) return;

    const glyphs = ['.', ':', '+', '/', '=', '#'];
    let width = 0;
    let height = 0;
    let visible = false;
    let userReduced = false;
    let timer = 0;

    const hash = (x: number, y: number) => {
      const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return value - Math.floor(value);
    };

    const paint = (time = 0) => {
      if (!width || !height) return;
      const styles = getComputedStyle(field);
      const quiet = styles.getPropertyValue('--color-performance-fg-subtle').trim();
      const trace = styles.getPropertyValue('--color-performance-fg-muted').trim();
      const signal = styles.getPropertyValue('--color-performance-signal-soft').trim();
      const cellWidth = 14;
      const cellHeight = 17;
      const columns = Math.ceil(width / cellWidth);
      const rows = Math.ceil(height / cellHeight);
      const phase = userReduced ? 0.16 : (time / 11000) % 1;

      context.clearRect(0, 0, width, height);
      context.font = `11px ${styles.getPropertyValue('--font-performance-mono').trim() || 'monospace'}`;
      context.textBaseline = 'middle';

      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const x = column / Math.max(1, columns - 1);
          const y = row / Math.max(1, rows - 1);
          const noise = hash(column, row);
          const route = 0.5 + Math.sin(x * Math.PI * 2.3) * 0.15;
          const distance = Math.abs(y - route);
          const onRoute = distance < 0.1;
          if (!onRoute && noise < 0.79) continue;

          const packet = onRoute && Math.abs(x - phase) < 0.045;
          context.fillStyle = packet ? signal : onRoute ? trace : quiet;
          context.fillText(glyphs[Math.floor(hash(column + 7, row + 19) * glyphs.length)], column * cellWidth, row * cellHeight + 8);
        }
      }
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint(performance.now());
    };

    const animate = () => {
      if (!visible || userReduced || document.hidden) return;
      paint(performance.now());
      timer = window.setTimeout(animate, 140);
    };

    const syncMotion = () => {
      clearTimeout(timer);
      paint(userReduced ? 0 : performance.now());
      if (visible && !userReduced && !document.hidden) timer = window.setTimeout(animate, 140);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncMotion();
    });
    const resizeObserver = new ResizeObserver(resize);
    observer.observe(field);
    resizeObserver.observe(canvas);
    document.addEventListener('visibilitychange', syncMotion);
    const unsubscribe = reducedFilmMotion.subscribe((value) => {
      userReduced = value;
      syncMotion();
    });
    resize();

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', syncMotion);
      unsubscribe();
    };
  });
</script>

<section class="signal-band" bind:this={field} aria-labelledby="signal-band-title">
  <div class="signal-heading">
    <p class="eyebrow">THE OPERATING LOOP / 01—03</p>
    <h2 id="signal-band-title">Work moves with a receipt.</h2>
  </div>
  <canvas bind:this={canvas} aria-hidden="true"></canvas>
  <ol class="stages">
    <li><span>01 / Signal</span><small>Read the work and its source.</small></li>
    <li><span>02 / Decision</span><small>Apply the rule or ask a person.</small></li>
    <li><span>03 / Proof</span><small>Keep the result and how it was checked.</small></li>
  </ol>
  {#if showContinuation}
  <div class="signal-continuation">
    <AgencyWayfindingSign kind="proof" label="Inspect the work" detail="See the examples and their source records." href="#built-work" direction="down" />
    <AgencyWayfindingSign kind="map" label="Choose a path" detail="Compare Map, Build, and Control." href="/products#choose-product" />
  </div>
  {/if}
</section>

<style>
  .signal-continuation { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-performance-sm); padding: var(--space-performance-sm) 7vw var(--space-performance-md); }
  @media (max-width: 640px) { .signal-continuation { grid-template-columns: 1fr; } }
  .signal-band { padding: 0; background: var(--color-performance-mode-campaign-surface); color: var(--color-performance-mode-campaign-ink); border-block: 1px solid var(--color-performance-shell-border-default); overflow: hidden; }
  .signal-heading { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: var(--space-performance-sm); padding: var(--space-performance-md) 7vw 0; }
  .eyebrow, .stages span { font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); letter-spacing: .04em; text-transform: uppercase; }
  .eyebrow { color: var(--color-performance-fg-tertiary); margin: 0; }
  h2 { font: var(--font-performance-medium) var(--text-performance-body)/1.3 var(--font-performance-interface); margin: 0; }
  canvas { display: block; width: 100%; height: 145px; }
  .stages { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); list-style: none; margin: 0; padding: 0 7vw; border-top: 1px solid var(--color-performance-shell-border-default); }
  .stages li { display: flex; flex-direction: column; gap: var(--space-performance-xs); min-width: 0; padding: var(--space-performance-sm) var(--space-performance-md); border-left: 1px solid var(--color-performance-shell-border-default); }
  .stages li:last-child { border-right: 1px solid var(--color-performance-shell-border-default); }
  .stages small { color: var(--color-performance-fg-tertiary); font-size: var(--text-performance-caption); line-height: 1.45; }
  @media (max-width: 640px) {
    .signal-heading { display: block; }
    h2 { margin-top: var(--space-performance-xs); }
    canvas { height: 108px; }
    .stages { grid-template-columns: 1fr; padding-inline: 7vw; }
    .stages li { display: grid; grid-template-columns: minmax(8rem, .85fr) minmax(0, 1.15fr); align-items: baseline; gap: var(--space-performance-sm); padding: var(--space-performance-sm) 0; border-left: 0; border-bottom: 1px solid var(--color-performance-shell-border-default); }
    .stages li:last-child { border-right: 0; border-bottom: 0; }
    .stages span, .stages small { font-size: var(--text-performance-caption); }
  }
</style>
