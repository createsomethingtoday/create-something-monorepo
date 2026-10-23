<script lang="ts">
  import { tick } from 'svelte';
  import type { CanvasDocument } from './document';
  import { prepareFocusedRevision, focusedRevisionIsCurrent, focusedRevisionPatch, type FocusedRevision } from './focused-revision';
  let { document, selectedIds, disabled, execute }: { document: CanvasDocument; selectedIds: string[]; disabled: boolean; execute: (name: string, input: Record<string, unknown>) => Promise<Record<string, unknown>> } = $props();
  let open = $state(false), find = $state(''), replacement = $state(''), error = $state(''), message = $state(''), working = $state(false);
  let proposal = $state<FocusedRevision | null>(null);
  let accepted = $state<{ documentId: string; changeId?: string } | null>(null);
  let trigger = $state<HTMLButtonElement>();
  let findInput = $state<HTMLInputElement>();
  let previewButton = $state<HTMLButtonElement>();
  let undoButton = $state<HTMLButtonElement>();
  const stale = $derived(proposal !== null && (!focusedRevisionIsCurrent(proposal, document, selectedIds) || proposal.find !== find || proposal.replacement !== replacement));
  $effect(() => { if (accepted && accepted.documentId !== document.id) accepted = null; });
  const receiptAvailable = $derived(accepted?.documentId === document.id && Boolean(accepted?.changeId));
  function preview() {
    error = ''; message = '';
    try { proposal = prepareFocusedRevision(document, selectedIds, find, replacement); }
    catch (e) { proposal = null; error = e instanceof Error ? e.message : 'Could not preview revision.'; }
  }
  async function accept() {
    if (!proposal || working || disabled || stale) return;
    working = true; error = ''; message = '';
    let applied = false;
    try {
      const input = focusedRevisionPatch(proposal, document, selectedIds);
      const result = await execute('draw_patch_objects', input);
      accepted = { documentId: document.id, ...(typeof result.changeId === 'string' ? { changeId: result.changeId } : {}) };
      message = `Revision applied to ${proposal.affected.length} note${proposal.affected.length === 1 ? '' : 's'}. Other elements were retained.${accepted.changeId ? '' : ' Targeted Undo is unavailable for this receipt; do not replay the revision.'}`;
      proposal = null; applied = true;
    } catch (e) { error = `${e instanceof Error ? e.message : 'Revision outcome is unknown.'} No automatic retry; inspect the canvas before submitting again.`; }
    finally { working = false; if (applied) { await tick(); if (receiptAvailable) undoButton?.focus(); else previewButton?.focus(); } }
  }
  async function undoRevision() {
    if (!accepted?.changeId || !receiptAvailable || working || disabled) return;
    working = true; error = ''; message = '';
    let undone = false;
    try { await execute('draw_revert_change', { changeId: accepted.changeId }); accepted = null; message = 'Revision undone. Unrelated later elements were retained.'; undone = true; }
    catch (e) {
      const detail = e instanceof Error ? e.message : '';
      error = /changed since|layer order changed|depends on/.test(detail) ? 'Revised elements or their dependencies changed. Targeted Undo was not applied; keep later edits and review a new revision.' : /Unknown or expired/.test(detail) ? 'This Undo receipt is no longer available. Nothing was undone.' : 'Targeted Undo could not be verified. Inspect the canvas; no automatic retry.';
    }
    finally { working = false; if (undone) { await tick(); previewButton?.focus(); } }
  }
  async function close() { if (working) return; open = false; proposal = null; error = ''; await tick(); trigger?.focus(); }
  async function show() { open = true; await tick(); findInput?.focus(); }
</script>
<section class="focused-revision" aria-label="Focused revision prototype">
  <button bind:this={trigger} aria-expanded={open} aria-controls="focused-revision-form" onkeydown={(e) => e.stopPropagation()} onclick={() => open ? void close() : void show()}>Revise selection</button>
  {#if open}
    <div id="focused-revision-form" oncopy={(e) => e.stopPropagation()} onpaste={(e) => e.stopPropagation()} onkeydown={(e) => { e.stopPropagation(); if (e.key === 'Escape' && !e.isComposing) { e.stopPropagation(); e.preventDefault(); void close(); } }} role="dialog" aria-modal="false" tabindex="-1" aria-label="Request selected-note revision">
      <h3>Local revision prototype</h3>
      <p>Exact text replacement in selected plain notes. No AI or network request. Preview first; only Accept changes the canvas.</p>
      <p>{selectedIds.length} selected element{selectedIds.length === 1 ? '' : 's'}. Rich notes, locked elements and annotation marks stay unchanged.</p>
      <label>Find exact text<input bind:this={findInput} bind:value={find} disabled={working} maxlength="500" /></label>
      <label>Replace with<input bind:value={replacement} disabled={working} maxlength="1000" /></label>
      <button bind:this={previewButton} disabled={disabled || working} onclick={preview}>Preview revision</button>
      <button disabled={working} onclick={() => void close()}>Cancel revision</button>
      {#if proposal}
        <div class="proposal" aria-label="Affected elements preview">
          <h3>{proposal.affected.length} affected note{proposal.affected.length === 1 ? '' : 's'}</h3>
          {#each proposal.affected as change (change.id)}
            <article><strong>{change.name}</strong><small>ID: {change.id}</small><h4>Before</h4><p class="text">{change.before}</p><h4>After</h4><p class="text">{change.after}</p></article>
          {/each}
          {#if proposal.excluded.length}<h4>Excluded and preserved</h4><ul>{#each proposal.excluded as item}<li>{item.id}: {item.reason}</li>{/each}</ul>{/if}
          <p>{proposal.unchangedSelectedIds.length} selected elements unchanged. Unselected elements and the current view are retained.</p>
          {#if stale}<p role="alert">Canvas, selection or request changed. This preview is stale; inspect the canvas before preparing another revision.</p>{/if}
          <button disabled={disabled || working || stale} onclick={() => void accept()}>Accept revision</button>
        </div>
      {/if}
      {#if accepted?.documentId === document.id}<button bind:this={undoButton} disabled={disabled || working || !receiptAvailable} onclick={() => void undoRevision()}>Undo revision</button><p>Targeted Undo lasts in this tab until its receipt expires. Later edits to an affected note block Undo; unrelated annotations can remain.</p>{/if}
      {#if error}<p role="alert">{error}</p>{/if}
      <p role="status" aria-live="polite">{working ? 'Working…' : message}</p>
    </div>
  {/if}
</section>
<style>
  .focused-revision { padding:14px;border-block:1px solid var(--line); }
  button,input { font:inherit;color:inherit;background:var(--color-performance-shell-surface,#111);border:1px solid #777;border-radius:3px;min-height:44px;max-width:100%;padding:8px; }
  button { cursor:pointer;margin:4px 0;width:100%; }button:disabled { opacity:.45;cursor:default; }
  label { display:grid;gap:6px;margin:12px 0; }input { width:100%;min-width:0; }
  h3 { font-size:14px;margin:12px 0 8px; }h4 { font-size:12px;margin:10px 0 4px; }p,li { line-height:1.5;overflow-wrap:anywhere; }small { display:block;overflow-wrap:anywhere; }ul { padding-left:18px; }
  article { border-block:1px solid var(--line);padding:10px 0; }.text { white-space:pre-wrap;max-height:12rem;overflow:auto; }[role=alert] { border-left:2px solid #fcaa2d;padding-left:8px; }
  button:focus-visible,input:focus-visible { outline:2px solid #fcaa2d;outline-offset:2px; }
</style>
