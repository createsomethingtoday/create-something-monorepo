<script lang="ts">
  import { onMount } from 'svelte';
  let mounted = $state(false);
  onMount(() => { mounted = true; });
  import { webflowStages } from '$lib/data/webflowMarketplace';
  let { capture, chapters = false } = $props<{ capture: { label: string; scope: string; video: string; poster: string; captions: string }; chapters?: boolean }>();
  let video: HTMLVideoElement;
  let active = $state(0);
  let pendingTime = 0;
  function updateStage() {
    const match = webflowStages.findIndex(stage => video.currentTime + .00001 >= stage.start && video.currentTime + .00001 < stage.end);
    active = match < 0 ? webflowStages.length - 1 : match;
  }
  function seek(start: number) {
    pendingTime = start;
    if (video.readyState >= 1) video.currentTime = start;
    else video.load();
  }
</script>
<figure class="walkthrough">
  <video bind:this={video} controls playsinline preload="none" poster={capture.poster} aria-label={capture.label} ontimeupdate={updateStage} onloadedmetadata={() => { video.currentTime = pendingTime; }}>
    <source src={capture.video} type="video/mp4" />
    <track kind="captions" src={capture.captions} srclang="en" label="Visual guidance" />
    <a href={capture.video}>Open the recording</a>
  </video>
  <figcaption><strong>{capture.label}</strong><p>{capture.scope}</p><p>Silent recording · Select captions for visual guidance. <a href={capture.video}>Open the MP4 ↗</a></p></figcaption>
</figure>
{#if chapters}
  <nav class="chapters" aria-label="Walkthrough chapters">
    {#each webflowStages as stage, i}<button type="button" disabled={!mounted} onclick={() => seek(stage.start)} aria-current={i === active ? 'step' : undefined}><span>0{i + 1}</span><strong>{stage.label}</strong><small>{Math.floor(stage.start / 60)}:{String(Math.floor(stage.start % 60)).padStart(2, '0')}</small></button>{/each}
  </nav>
  <p class="stage-note">{webflowStages[active].evidence}</p>
{/if}
<style>
  .walkthrough{margin:0}.walkthrough video{display:block;width:100%;aspect-ratio:16/9;background:var(--color-performance-bg-pure);object-fit:contain}.walkthrough figcaption{padding-block:var(--space-performance-sm);font-size:13px;line-height:1.6;color:var(--color-performance-fg-secondary)}figcaption strong{color:var(--color-performance-fg-primary);font-weight:400}figcaption p{margin:6px 0}a{color:inherit;text-underline-offset:4px}.chapters{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-block:1px solid var(--color-performance-border-default)}button{display:grid;gap:8px;background:transparent;border:0;border-top:2px solid transparent;text-align:left;padding:var(--space-performance-sm);font:inherit;color:inherit;cursor:pointer;min-height:104px}button[aria-current=step],button:hover{border-top-color:var(--color-performance-signal);background:var(--color-performance-bg-elevated)}button span,button small{font:12px var(--font-performance-mono);color:var(--color-performance-fg-secondary)}button strong{font-weight:400}button:focus-visible,a:focus-visible{outline:2px solid var(--color-performance-signal);outline-offset:3px}.stage-note{font-size:13px;line-height:1.6;color:var(--color-performance-fg-secondary);min-height:3.2em;margin-top:var(--space-performance-sm)}@media(max-width:600px){.chapters{grid-template-columns:repeat(2,minmax(0,1fr))}button:last-child{grid-column:1/-1}button{min-height:88px}}
</style>
