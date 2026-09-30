<script lang="ts">
  import { onMount } from 'svelte';
  import { reducedFilmMotion } from '$lib/motion/filmPlayback';

  type MotionTimeline = {
    pause: (at?: number) => MotionTimeline;
    play: (at?: number) => MotionTimeline;
    eventCallback: (name: string, callback: (() => void) | null) => MotionTimeline;
  };
  let frame: HTMLIFrameElement;
  let timeline: MotionTimeline | undefined;
  let playing = false;
  let started = false;
  let finished = false;

  function frameReady() {
    timeline = (frame.contentWindow as (Window & { __timelines?: Record<string, MotionTimeline> }) | null)?.__timelines?.['dfw-support'];
    timeline?.pause(12);
    playing = false;
    started = false;
    finished = false;
    timeline?.eventCallback('onComplete', () => { playing = false; finished = true; });
  }
  function togglePlayback() {
    if (!timeline) return;
    if (playing) { timeline.pause(); playing = false; return; }
    if ($reducedFilmMotion) reducedFilmMotion.set(false);
    timeline.play(!started || finished ? 0 : undefined);
    started = true;
    finished = false;
    playing = true;
  }
  function reduceMotion() {
    reducedFilmMotion.set(true);
    timeline?.pause(12);
    playing = false;
    started = false;
  }
  onMount(() => {
    const unsubscribe = reducedFilmMotion.subscribe(reduced => {
      if (reduced) { timeline?.pause(12); playing = false; started = false; }
    });
    const pauseHidden = () => { if (document.hidden) { timeline?.pause(); playing = false; } };
    document.addEventListener('visibilitychange', pauseHidden);
    return () => { unsubscribe(); timeline?.pause(); timeline?.eventCallback('onComplete', null); document.removeEventListener('visibilitychange', pauseHidden); };
  });
</script>

<figure class="support-study" aria-labelledby="support-study-caption">
  <iframe bind:this={frame} src="/motion/dfw-support/index.html" title="CREATE SOMETHING: an illustrative scoped software repair" tabindex="-1" onload={frameReady}></iframe>
  <figcaption id="support-study-caption">
    <div class="study-heading"><span>Recovery study / 01</span><span>Illustrative · no client data</span></div>
    <p>A broken form handoff stops at a failure. An owner approves the scope before a repair reaches the CRM and leaves an acceptance receipt.</p>
    <div class="study-controls">
      <button type="button" onclick={togglePlayback} disabled={!timeline} aria-pressed={playing}>{playing ? 'Pause sequence' : finished ? 'Replay sequence' : started ? 'Resume sequence' : 'Play 12-second sequence'} <span aria-hidden="true">{playing ? 'Ⅱ' : '→'}</span></button>
      {#if !$reducedFilmMotion}<button class="quiet-control" type="button" onclick={reduceMotion}>Reduce motion</button>{/if}
    </div>
  </figcaption>
</figure>

<style>
  .support-study { margin:0; min-width:0; border:1px solid var(--color-performance-shell-border-strong); background:var(--color-performance-mode-campaign-surface); color:var(--color-performance-mode-campaign-ink); }
  iframe { display:block; width:100%; aspect-ratio:4/3; border:0; }
  figcaption { padding:var(--space-performance-md); border-top:1px solid var(--color-performance-shell-border-default); }
  .study-heading { display:flex; flex-wrap:wrap; justify-content:space-between; gap:var(--space-performance-xs); font:var(--text-performance-operator-label)/1.5 var(--font-performance-mono); }
  p { margin:var(--space-performance-sm) 0; color:var(--color-performance-fg-secondary); font-size:var(--text-performance-caption); line-height:1.6; }
  .study-controls { display:flex; flex-wrap:wrap; align-items:center; gap:var(--space-performance-sm); }
  button { display:inline-flex; align-items:center; gap:var(--space-performance-sm); min-height:44px; padding:var(--space-performance-xs) var(--space-performance-sm); border:1px solid var(--color-performance-shell-border-strong); background:var(--color-performance-paper); color:var(--color-performance-ink); font:inherit; font-size:var(--text-performance-caption); cursor:pointer; }
  button:disabled { opacity:.55; cursor:wait; }
  .quiet-control { color:inherit; background:transparent; }
  button:focus-visible { outline:2px solid var(--color-performance-focus); outline-offset:3px; }
</style>
