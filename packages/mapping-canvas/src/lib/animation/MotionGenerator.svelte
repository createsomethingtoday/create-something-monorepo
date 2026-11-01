<script lang="ts">
  import { onMount } from 'svelte';
  import { compileProposal, generationContext, assertProposalCurrent, type MotionProposal } from './generation';
  import type { Project, Drawing } from './model';
  import { Renderer } from './render';

  let { project, selectedId, disabled, apply } = $props<{
    project: Project; selectedId: string; disabled: boolean; apply: (proposal: MotionProposal) => Promise<void>;
  }>();
  let available = $state(false), prompt = $state(''), allowEdit = $state(false);
  let generating = $state(false), applying = $state(false), message = $state('Checking local generation…');
  let proposal = $state.raw<MotionProposal | null>(null), receipt = $state('');
  let time = $state(0), playing = $state(false), prepared = $state(false);
  let dialog = $state<HTMLDialogElement>(), canvas = $state<HTMLCanvasElement>();
  let controller: AbortController | undefined, raf = 0;
  const renderer = new Renderer();
  const selected = $derived(project.drawings.find((d: Drawing) => d.id === selectedId && d.kind !== 'image'));
  const stale = $derived(!!proposal && (proposal.projectId !== project.id || proposal.baseRevision !== project.revision));

  onMount(() => {
    let active = true;
    void fetch('/api/motion/proposals').then(r => r.json()).then(data => {
      if (!active) return;
      available = data.available === true;
      message = available ? '' : 'Generation is not configured on this local server. See the prototype setup guide.';
    }).catch(() => { if (active) message = 'Could not reach the local generation server.'; });
    return () => { active = false; controller?.abort(); cancelAnimationFrame(raf); };
  });
  $effect(() => {
    if (!selected) allowEdit = false;
  });
  $effect(() => {
    if (proposal && dialog && !dialog.open) dialog.showModal();
  });
  $effect(() => {
    const current = proposal;
    prepared = false;
    let active = true;
    if (current) void renderer.prepare(current.project.assets).then(() => {
      if (active) prepared = true;
    }).catch(() => { if (active) message = 'Preview assets could not load. Discard and try again.'; });
    return () => { active = false; };
  });
  $effect(() => {
    if (proposal && canvas && prepared) renderer.paint(canvas.getContext('2d')!, proposal.project, time, { ghosts: 0, selected: '' });
  });
  function stop() { playing = false; cancelAnimationFrame(raf); }
  function play() {
    if (!proposal) return;
    if (playing) { stop(); return; }
    if (time >= proposal.project.duration) time = 0;
    playing = true;
    const start = performance.now() - time * 1000;
    const tick = (now: number) => {
      if (!proposal || !playing) return;
      time = Math.min(proposal.project.duration, (now - start) / 1000);
      if (time >= proposal.project.duration) stop(); else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  function discard() { if (applying) return; stop(); dialog?.close(); proposal = null; message = 'Preview discarded. Your project is unchanged.'; }
  async function generate() {
    if (!available || generating || disabled || !prompt.trim()) return;
    const initial = structuredClone(project), ids = allowEdit && selected ? [selected.id] : [];
    const abort = new AbortController(); controller = abort;
    generating = true; message = 'Generating a proposal. Your project stays unchanged…';
    try {
      const response = await fetch('/api/motion/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: abort.signal,
        body: JSON.stringify({ project: generationContext(initial), prompt, editableIds: ids }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed.');
      if (abort.signal.aborted) return;
      const next = compileProposal(initial, data.intent, ids, crypto.randomUUID());
      assertProposalCurrent(next, project);
      receipt = `Kimi K2.7 Code · ${data.seconds}s · ${next.operations.length} drawing changes`;
      time = 0; proposal = next; message = 'Review the animation before applying it.';
    } catch (error) {
      message = abort.signal.aborted ? 'Generation cancelled. Your project is unchanged.' : error instanceof Error ? error.message : 'Generation failed. Your project is unchanged.';
    } finally { generating = false; if (controller === abort) controller = undefined; }
  }
  async function accept() {
    if (!proposal || applying || !prepared) return;
    applying = true; stop();
    try {
      assertProposalCurrent(proposal, project);
      await apply(proposal);
      dialog?.close(); proposal = null; message = 'Applied as one change. Use Undo to restore the previous scene.';
    } catch (error) { message = error instanceof Error ? error.message : 'Could not apply the proposal.'; }
    finally { applying = false; }
  }
</script>

<section class="generation" aria-label="Generate motion">
  <h2>Generate motion <span>Local prototype</span></h2>
  <label for="motion-request">Describe the motion</label>
  <textarea id="motion-request" aria-label="Motion request" bind:value={prompt} maxlength="3000" rows="4" disabled={generating || applying}
    placeholder="Draw a curved arrow moving beneath the title…"></textarea>
  <label class="scope"><input type="checkbox" bind:checked={allowEdit} disabled={!selected || generating || applying} />
    {selected ? `Allow timing and motion edits to “${selected.name}”` : 'Select artwork to allow timing and motion edits'}
  </label>
  <p class="disclosure">Sends your request and vector/text scene to Cloudflare. Image pixels stay here. Existing artwork is preserved unless selected above.</p>
  <div class="actions">
    <button class="primary" onclick={generate} disabled={!available || disabled || generating || applying || !prompt.trim()}>Generate preview</button>
    {#if generating}<button onclick={() => controller?.abort()}>Cancel generation</button>{/if}
  </div>
  <p role="status" aria-live="polite">{message}</p>
</section>

{#if proposal}
  <dialog bind:this={dialog} aria-label="Review generated motion" oncancel={(event) => { event.preventDefault(); discard(); }}>
    <div class="review-heading"><h2>Review generated motion</h2><button onclick={discard} disabled={applying}>Discard preview</button></div>
    <p>{proposal.summary}</p><p class="receipt">{receipt}</p>
    <canvas bind:this={canvas} width={proposal.project.width} height={proposal.project.height} aria-label="Generated motion preview"></canvas>
    <div class="playback">
      <button onclick={play} disabled={!prepared || applying}>{playing ? 'Pause preview' : 'Play preview'}</button>
      <input aria-label="Preview time" type="range" min="0" max={proposal.project.duration} step="0.01" bind:value={time} oninput={stop} />
      <output>{time.toFixed(1)} / {proposal.project.duration}s</output>
    </div>
    {#if stale}<p role="alert">The project changed. Discard this preview and generate again.</p>{/if}
    <p role="status">{message}</p>
    <div class="actions"><button class="primary" onclick={accept} disabled={stale || applying || !prepared || disabled}>{applying ? 'Applying…' : 'Apply to project'}</button><span>One undoable change</span></div>
  </dialog>
{/if}

<style>
  .generation { border-bottom: 1px solid var(--color-border-default, #333); margin-bottom: 16px; padding-bottom: 12px; }
  h2 { font-size: 14px; margin: 0 0 12px; }
  h2 span { display: block; font-size: 11px; font-weight: normal; margin-top: 4px; color: var(--color-fg-muted, #aaa); }
  label, p { font-size: 12px; line-height: 1.5; }
  textarea { margin-top: 6px; resize: vertical; }
  .scope { display: flex; gap: 8px; align-items: start; margin-top: 10px; }
  .scope input { width: auto; flex: none; margin-top: 3px; }
  .disclosure, .receipt { color: var(--color-fg-muted, #aaa); }
  .actions, .review-heading, .playback { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .actions span { font-size: 12px; }
  dialog { width: min(1000px, 94vw); max-height: 94dvh; padding: 20px; color: inherit; background: var(--color-bg-surface, #171717); border: 1px solid var(--color-border-default, #444); border-radius: 6px; overflow: auto; }
  dialog::backdrop { background: rgb(0 0 0 / 75%); }
  .review-heading { justify-content: space-between; }
  .review-heading h2 { margin: 0; }
  canvas { display: block; width: 100%; max-height: 58dvh; object-fit: contain; margin: 12px 0; }
  .playback input { flex: 1; width: auto; min-width: 100px; }
  output { font-size: 12px; font-variant-numeric: tabular-nums; }
  @media (max-width: 600px) { dialog { padding: 12px; } .actions button { min-height: 44px; } }
</style>
