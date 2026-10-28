<script lang="ts">
  import HyperframesExport from '$lib/composition/HyperframesExport.svelte';
  import { onMount } from 'svelte';
  import MotionView from '$lib/composition/MotionView.svelte';
  import { parseHandoff, type Sequence } from '$lib/composition/motion';
  import type { Document } from '$lib/composition/model';
  import '../../../../../agency/canon-overlay/theme.css';
  let ready = $state(false);
  onMount(() => {
    ready = true;
  });
  let packet = $state<{
      composition: Document;
      sequences: Sequence[];
      compositionSha256: string;
    } | null>(null),
    error = $state('');
  async function load(e: Event) {
    const input = e.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 60000) throw Error('Handoff too large.');
      const next = await parseHandoff(await file.text());
      packet = next;
      error = '';
    } catch (e) {
      error = (e as Error).message;
    } finally {
      input.value = '';
    }
  }
</script>

<svelte:head
  ><title>Render handoff · Draw local proof</title><meta
    name="robots"
    content="noindex,nofollow"
  /></svelte:head
>
<main data-ready={ready}>
  <header>
    <a href="/compose">← Compose</a>
    <h1>Render handoff</h1>
    <p>Canon DOM renderer v1 · offline HyperFrames HTML export</p>
    <label
      >Open validated handoff <input
        disabled={!ready}
        type="file"
        accept=".json"
        aria-label="Open render handoff"
        onchange={load}
      /></label
    >
  </header>
  {#if error}<p role="alert">{error} The previous render is retained.</p>{/if}
  {#if packet}<MotionView doc={packet.composition} tracks={packet.sequences} /><HyperframesExport doc={packet.composition} tracks={packet.sequences} />
    <p class="digest">Composition SHA-256: {packet.compositionSha256}</p>{/if}
</main>

<style>
  :global(body) {
    margin: 0;
    background: var(--color-performance-paper);
    color: var(--color-performance-ink);
    font-family: var(--font-performance-sans);
    color-scheme: light;
  }
  main {
    max-width: 1200px;
    margin: auto;
    padding: 24px;
  }
  header {
    margin-bottom: 28px;
  }
  h1 {
    font-size: 24px;
    font-weight: 500;
  }
  p,
  label,
  a {
    font-size: 13px;
    color: inherit;
  }
  label {
    display: block;
    margin: 20px 0;
  }
  input {
    margin-left: 16px;
  }
  .digest {
    font-size: 11px;
    overflow-wrap: anywhere;
  }
</style>
