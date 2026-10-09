<script lang="ts">
  import { tick } from 'svelte';
  import MotionView from './MotionView.svelte';
  import { type Document } from './model';
  import { handoff, parseHandoff, type Sequence } from './motion';
  import { captureCanonFrame, exportHyperframesBundle } from './hyperframes';
  let { doc, tracks }: { doc: Document; tracks?: Sequence[] } = $props();
  let capture = $state<{ composition: Document; sequence: Sequence; text: string } | null>(null);
  let busy = $state(false), message = $state(''), failed = $state(false);
  let stage = $state<HTMLDivElement>();
  async function save(id: 'context' | 'detail') {
    if (busy) return;
    busy = true; failed = false; message = 'Preparing the scripted Canon frames…';
    const before = doc;
    try {
      const packet = await handoff(before);
      if (tracks) packet.sequences = tracks;
      const text = JSON.stringify(packet);
      await parseHandoff(text);
      const sequence = packet.sequences.find((s: Sequence) => s.id === id)!;
      capture = { composition: packet.composition, sequence, text };
      await tick();
      // MotionView resolves instance bounds after Svelte's DOM update. Two
      // frames settle the measured camera without running wall-clock playback.
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await tick();
      const views = [...stage!.querySelectorAll<HTMLElement>('.viewport')];
      const frames = views.map((view, index) => captureCanonFrame(view, sequence.beats[index].state));
      const bundle = await exportHyperframesBundle(text, id, frames);
      if (before !== doc) throw Error('Composition changed during export. Try again.');
      const url = URL.createObjectURL(new Blob([new Uint8Array(bundle)], { type: 'application/zip' }));
      const link = window.document.createElement('a');
      link.href = url; link.download = `draw-${id}-hyperframes.zip`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      message = `Exported ${id}: offline HyperFrames ZIP with scripted Canon states and camera cuts. No live form entries or encoded video.`;
    } catch (error) {
      failed = true; message = `Export failed: ${(error as Error).message}`;
    } finally { capture = null; busy = false; }
  }
</script>

<section class="handoff-export" aria-label="HyperFrames handoff">
  <p>Offline HyperFrames handoff · actual Canon rendering, scripted states, camera cuts.</p>
  <div><button disabled={busy} onclick={() => void save('context')}>Export Context ZIP</button><button disabled={busy} onclick={() => void save('detail')}>Export Detail ZIP</button></div>
  {#if message}<p role={failed ? 'alert' : 'status'}>{message}</p>{/if}
</section>
{#if capture}
  <div class="capture-stage" bind:this={stage!} aria-hidden="true" inert>
    {#each capture.sequence.beats as beat}
      <MotionView doc={capture.composition} renderSequence={capture.sequence} renderTime={beat.time} exportOnly />
    {/each}
  </div>
{/if}

<style>
  .handoff-export { margin-top:24px; padding-top:16px; border-top:1px solid var(--color-performance-line); }
  .handoff-export p { font-size:12px; line-height:1.6; color:var(--color-performance-muted); }
  .handoff-export div { display:flex; flex-wrap:wrap; gap:8px; }
  button { font:inherit; font-size:12px; padding:12px; border:1px solid var(--color-performance-line); background:var(--color-performance-panel); color:var(--color-performance-ink); cursor:pointer; }
  button:disabled { opacity:.5; cursor:wait; }
  .capture-stage { position:fixed; left:-100000px; top:0; width:1200px; pointer-events:none; }
</style>
