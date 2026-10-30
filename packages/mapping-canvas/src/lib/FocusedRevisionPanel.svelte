<script lang="ts">
  import { tick } from 'svelte';
  import type { CanvasDocument } from './document';
  import { prepareFocusedRevision, focusedRevisionIsCurrent, focusedRevisionPatch, focusedRevisionDiff, FocusedRevisionInputError, type FocusedRevision } from './focused-revision';
  let { document, selectedIds, disabled, execute }: { document: CanvasDocument; selectedIds: string[]; disabled: boolean; execute: (name: string, input: Record<string, unknown>) => Promise<Record<string, unknown>> } = $props();
  let open = $state(false), find = $state(''), replacement = $state(''), error = $state(''), message = $state(''), working = $state(false);
  let errorField = $state<'find' | 'replacement' | null>(null);
  let contextId = $state<string | null>(null);
  let proposal = $state<FocusedRevision | null>(null);
  let accepted = $state<{ documentId: string; changeId?: string } | null>(null);
  let trigger = $state<HTMLButtonElement>(), findInput = $state<HTMLInputElement>(), replacementInput = $state<HTMLInputElement>();
  let previewButton = $state<HTMLButtonElement>(), undoButton = $state<HTMLButtonElement>();
  const stale = $derived(proposal !== null && (!focusedRevisionIsCurrent(proposal, document, selectedIds) || proposal.find !== find || proposal.replacement !== replacement));
  const replacementCount = $derived.by(() => { const current = proposal; return current ? current.affected.reduce((count, change) => count + focusedRevisionDiff(change.before, current.find, current.replacement).count, 0) : 0; });
  const receiptAvailable = $derived(accepted?.documentId === document.id && Boolean(accepted?.changeId));
  $effect(() => {
    if (contextId !== null && contextId !== document.id) { open = false; proposal = null; accepted = null; find = ''; replacement = ''; error = ''; errorField = null; message = ''; }
    contextId = document.id;
  });
  function restoreFocus(origin: Element | null, documentId: string, target: HTMLButtonElement | undefined) {
    const active = window.document.activeElement;
    if (open && document.id === documentId && (active === origin || active === window.document.body)) target?.focus();
  }
  async function preview() {
    error = ''; errorField = null; message = '';
    try {
      proposal = prepareFocusedRevision(document, selectedIds, find, replacement);
      const count = proposal.affected.reduce((sum, change) => sum + focusedRevisionDiff(change.before, find, replacement).count, 0);
      message = `Preview ready: ${count} replacement${count === 1 ? '' : 's'} in ${proposal.affected.length} note${proposal.affected.length === 1 ? '' : 's'}. Review the changes before accepting.`;
    } catch (e) {
      proposal = null; error = e instanceof Error ? e.message : 'Could not preview revision.';
      errorField = e instanceof FocusedRevisionInputError ? e.field : null;
      await tick(); if (errorField === 'find') findInput?.focus(); else if (errorField === 'replacement') replacementInput?.focus();
    }
  }
  async function accept() {
    if (!proposal || working || disabled || stale) return;
    const submitted = proposal, origin = window.document.activeElement;
    working = true; error = ''; errorField = null; message = '';
    let applied = false;
    try {
      const input = focusedRevisionPatch(submitted, document, selectedIds);
      const result = await execute('draw_patch_objects', input);
      if (document.id !== submitted.documentId) return;
      accepted = { documentId: submitted.documentId, ...(typeof result.changeId === 'string' ? { changeId: result.changeId } : {}) };
      message = `Revision applied to ${submitted.affected.length} note${submitted.affected.length === 1 ? '' : 's'}. Other elements were retained.${accepted.changeId ? '' : ' Targeted Undo is unavailable for this receipt; do not replay the revision.'}`;
      proposal = null; applied = true;
    } catch (e) {
      if (document.id === submitted.documentId) error = `${e instanceof Error ? e.message : 'Revision outcome is unknown.'} No automatic retry; inspect the canvas before submitting again.`;
    } finally { working = false; if (applied) { await tick(); restoreFocus(origin, submitted.documentId, receiptAvailable ? undoButton : previewButton); } }
  }
  async function undoRevision() {
    if (!accepted?.changeId || !receiptAvailable || working || disabled) return;
    const submitted = accepted, origin = window.document.activeElement;
    working = true; error = ''; errorField = null; message = '';
    let undone = false;
    try {
      await execute('draw_revert_change', { changeId: submitted.changeId });
      if (document.id !== submitted.documentId) return;
      accepted = null; message = 'Revision undone. Unrelated later elements were retained.'; undone = true;
    } catch (e) {
      if (document.id !== submitted.documentId) return;
      const detail = e instanceof Error ? e.message : '';
      error = /changed since|layer order changed|depends on/.test(detail) ? 'Revised elements or their dependencies changed. Targeted Undo was not applied; keep later edits and review a new revision.' : /Unknown or expired/.test(detail) ? 'This Undo receipt is no longer available. Nothing was undone.' : 'Targeted Undo could not be verified. Inspect the canvas; no automatic retry.';
    } finally { working = false; if (undone) { await tick(); restoreFocus(origin, submitted.documentId, previewButton); } }
  }
  async function close() { if (working) return; open = false; proposal = null; error = ''; errorField = null; await tick(); trigger?.focus(); }
  async function show() { open = true; await tick(); findInput?.focus(); }
</script>
<section class="focused-revision" aria-label="Focused revision prototype">
  <button bind:this={trigger} aria-expanded={open} aria-controls="focused-revision-form" disabled={working} onkeydown={(e) => e.stopPropagation()} onclick={() => open ? void close() : void show()}>Revise selection</button>
  {#if open}
    <div id="focused-revision-form" aria-busy={working} oncopy={(e) => e.stopPropagation()} onpaste={(e) => e.stopPropagation()} onkeydown={(e) => { e.stopPropagation(); if (e.key === 'Escape' && !e.isComposing) { e.preventDefault(); void close(); } }} role="dialog" aria-modal="false" tabindex="-1" aria-label="Request selected-note revision">
      <h3>Local revision prototype</h3>
      <p>Replace text in selected plain notes. No AI or network request. Only Accept changes the canvas.</p>
      <p class="selection-summary">{selectedIds.length} selected element{selectedIds.length === 1 ? '' : 's'}. Rich notes, locked elements and annotation marks stay unchanged.</p>
      <label>Find exact text<input bind:this={findInput} bind:value={find} disabled={working} maxlength="500" aria-invalid={errorField === 'find'} aria-describedby={errorField === 'find' ? 'focused-revision-error' : 'focused-revision-literal-hint'} /></label>
      <label>Replace with<input bind:this={replacementInput} bind:value={replacement} disabled={working} maxlength="1000" aria-invalid={errorField === 'replacement'} aria-describedby={errorField === 'replacement' ? 'focused-revision-error' : 'focused-revision-literal-hint'} /></label>
      <p id="focused-revision-literal-hint" class="hint">Case-sensitive. Every exact match in the selected editable notes is replaced. Leave replacement empty to remove matched text.</p>
      <div class="request-actions"><button bind:this={previewButton} disabled={disabled || working} onclick={() => void preview()}>Preview revision</button><button disabled={working} onclick={() => void close()}>Cancel revision</button></div>
      {#if proposal}
        <div class="proposal" aria-label="Affected elements preview">
          <h3>{replacementCount} replacement{replacementCount === 1 ? '' : 's'} in {proposal.affected.length} note{proposal.affected.length === 1 ? '' : 's'}</h3>
          <p class="hint">Highlighted text is the change. The rest of each note is retained.</p>
          {#if proposal.replacement === ''}<p class="deletion-notice">Empty replacement: matched text will be removed.</p>{/if}
          {#each proposal.affected as change (change.id)}
            {@const diff = focusedRevisionDiff(change.before, proposal.find, proposal.replacement)}
            <article><strong>{change.name}</strong><small>ID: {change.id} · {diff.count} replacement{diff.count === 1 ? '' : 's'}</small><h4>Before</h4><p class="text" aria-label={`Before revision: ${change.name}`}>{#each diff.original as part}{#if part.changed}<mark class="before-change">{part.text}</mark>{:else}{part.text}{/if}{/each}</p><h4>After</h4><p class="text" aria-label={`After revision: ${change.name}`}>{#if change.after === ''}<em class="empty-note">Empty note</em>{:else}{#each diff.proposed as part}{#if part.changed && part.text}<mark class="after-change">{part.text}</mark>{:else}{part.text}{/if}{/each}{/if}</p></article>
          {/each}
          {#if proposal.excluded.length}<details><summary>{proposal.excluded.length} excluded and preserved</summary><ul>{#each proposal.excluded as item}<li>{item.id}: {item.reason}</li>{/each}</ul></details>{/if}
          <p>{proposal.unchangedSelectedIds.length} selected elements unchanged. Unselected elements and the current view are retained.</p>
          {#if stale}<p role="alert">Canvas, selection or request changed. This preview is stale; inspect the canvas before preparing another revision.</p>{/if}
          <button class="accept" disabled={disabled || working || stale} onclick={() => void accept()}>Accept revision</button>
        </div>
      {/if}
      {#if accepted?.documentId === document.id}<button bind:this={undoButton} disabled={disabled || working || !receiptAvailable} onclick={() => void undoRevision()}>Undo revision</button><p class="hint">Undo applies to the latest revision in this tab. Later edits to an affected note block it; unrelated annotations can remain.</p>{/if}
      {#if error}<p id="focused-revision-error" role="alert">{error}</p>{/if}
      <p role="status" aria-live="polite">{working ? 'Working…' : message}</p>
    </div>
  {/if}
</section>
<style>
  .focused-revision { padding:14px;border-block:1px solid var(--line); }
  button,input { font:inherit;color:inherit;background:var(--color-performance-shell-surface,#111);border:1px solid #777;border-radius:3px;min-height:44px;max-width:100%;padding:8px; }
  button { cursor:pointer;margin:4px 0;width:100%; }button:disabled { opacity:.45;cursor:default; }
  label { display:grid;gap:6px;margin:12px 0; }input { width:100%;min-width:0; }input[aria-invalid=true] { border-color:#fcaa2d; }
  .request-actions { display:grid;grid-template-columns:1fr 1fr;gap:6px; }.accept { border-color:#fcaa2d;font-weight:600; }
  h3 { font-size:14px;margin:12px 0 8px; }h4 { font-size:12px;margin:10px 0 4px; }p,li { line-height:1.5;overflow-wrap:anywhere; }small { display:block;overflow-wrap:anywhere;color:var(--color-performance-fg-secondary,#aaa); }ul { padding-left:18px; }.hint,.selection-summary { color:var(--color-performance-fg-secondary,#aaa);font-size:12px; }
  article { border-block:1px solid var(--line);padding:10px 0; }.text { white-space:pre-wrap;max-height:12rem;overflow:auto; }[role=alert],.deletion-notice { border-left:2px solid #fcaa2d;padding-left:8px; }
  mark { color:inherit;background:rgba(252,170,45,.14); }.before-change { text-decoration:line-through; }.after-change { border-bottom:1px solid #fcaa2d;font-weight:600; }.empty-note { color:var(--color-performance-fg-secondary,#aaa); }
  details { margin-top:12px; }summary { cursor:pointer;min-height:36px;display:list-item; }
  button:focus-visible,input:focus-visible,summary:focus-visible { outline:2px solid #fcaa2d;outline-offset:2px; }
</style>
