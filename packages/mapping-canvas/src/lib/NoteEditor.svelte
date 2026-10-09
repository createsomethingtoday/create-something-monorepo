<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import RichNote from './RichNote.svelte';
  import { NOTE_BLOCK_TYPES, normalizeNoteContent, type NoteContent, type NoteBlockType } from './note-content';
  import { replaceRunText, runsText, toggleRunMark, setRunLink, type NoteMark } from './note-editing';
  let { content, width, onsave, oncancel }: { content: NoteContent; width: number; onsave: (content: NoteContent, height?: number) => void; oncancel: () => void } = $props();
  let draft = $state<NoteContent>(JSON.parse(JSON.stringify(untrack(() => content))));
  let dialog: HTMLDialogElement;
  let measurement: HTMLDivElement;
  let fit = $state(true);
  let active = $state(0), start = $state(0), end = $state(0), error = $state('');
  const labels: Record<NoteBlockType, string> = { paragraph: 'Body', heading1: 'Title', heading2: 'Heading', heading3: 'Subheading', bullet: 'Bullet', numbered: 'Numbered', quote: 'Quote' };
  onMount(() => { dialog.showModal(); return () => dialog.close(); });
  function selection(index: number, field: HTMLTextAreaElement) { active = index; start = field.selectionStart; end = field.selectionEnd; }
  function mark(value: NoteMark) {
    const block = draft.blocks[active];
    block.runs = toggleRunMark(block.runs, start === end ? 0 : start, start === end ? runsText(block.runs).length : end, value);
  }
  function link() {
    const url = prompt('Link selected text (https:// or mailto:). Leave empty to remove the link.');
    if (url === null) return;
    const block = draft.blocks[active];
    const runs = setRunLink(block.runs, start === end ? 0 : start, start === end ? runsText(block.runs).length : end, url);
    if (!normalizeNoteContent(JSON.parse(JSON.stringify({ blocks: [{ type: block.type, runs }] })))) { error = 'Links must use a complete https:// or mailto: address.'; return; }
    block.runs = runs; error = '';
  }
  function save() { const normalized = normalizeNoteContent(JSON.parse(JSON.stringify(draft))); if (!normalized) { error = 'This note exceeds the text or formatting limits. Shorten it before saving.'; return; } onsave(normalized, fit ? Math.ceil(measurement.scrollHeight + 32) : undefined); }
  function key(event: KeyboardEvent) { event.stopPropagation(); if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); save(); } }
</script>

<dialog bind:this={dialog} oncancel={(event) => { event.preventDefault(); oncancel(); }} onkeydown={key} aria-labelledby="note-editor-title">
  <header><div><h2 id="note-editor-title">Edit note</h2><p>Give each block a role. Select words for emphasis.</p></div><button aria-label="Close note editor" onclick={oncancel}>×</button></header>
  <div class="workspace">
    <section aria-label="Note content">
      <div class="marks" role="toolbar" aria-label="Text emphasis">{#each ['bold', 'italic', 'underline', 'code'] as value}<button onclick={() => mark(value as NoteMark)}>{value[0].toUpperCase() + value.slice(1)}</button>{/each}<button onclick={link}>Link</button><span>No selection applies to the current block</span></div>
      {#each draft.blocks as block, index}
        <div class="block">
          <div class="block-controls"><label>Block {index + 1}<select aria-label={`Block ${index + 1} style`} bind:value={block.type}>{#each NOTE_BLOCK_TYPES as type}<option value={type}>{labels[type]}</option>{/each}</select></label><button aria-label={`Remove block ${index + 1}`} disabled={draft.blocks.length === 1} onclick={() => { draft.blocks.splice(index, 1); active = 0; start = end = 0; }}>Remove</button></div>
          <textarea aria-label={`Block ${index + 1} text`} value={runsText(block.runs)} rows={Math.min(8, Math.max(2, runsText(block.runs).split('\n').length))} onfocus={(event) => selection(index, event.currentTarget)} onselect={(event) => selection(index, event.currentTarget)} oninput={(event) => { block.runs = replaceRunText(block.runs, event.currentTarget.value); selection(index, event.currentTarget); }}></textarea>
        </div>
      {/each}
      <button disabled={draft.blocks.length >= 100} onclick={() => { draft.blocks.push({ type: 'paragraph', runs: [{ text: ' ' }] }); }}>+ Add block</button>
    </section>
    <section class="preview" aria-label="Note preview"><h3>Preview</h3><RichNote content={draft} /></section>
  </div>
  {#if error}<p role="alert">{error}</p>{/if}
  <div class="measure" style:width={`${Math.max(1, width - 32)}px`} bind:this={measurement} aria-hidden="true"><RichNote content={draft} /></div>
  <label class="fit"><input type="checkbox" bind:checked={fit} /> Fit note height to text</label>
  <footer><span>⌘ / Ctrl + Enter to save</span><button onclick={oncancel}>Cancel</button><button class="save" onclick={save}>Save note</button></footer>
</dialog>

<style>
  .measure{position:fixed;left:-100000px;pointer-events:none;visibility:hidden}.measure :global(.rich-note){height:auto;overflow:visible}.fit{margin-top:16px}
  dialog{color:#eee;background:#111;border:1px solid var(--line,#444);border-radius:8px;padding:20px;width:min(900px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;font:14px/1.5 var(--font-performance-sans,Arial,sans-serif)}dialog::backdrop{background:rgb(0 0 0 / .7)}header,footer,.block-controls,.marks{display:flex;align-items:center;gap:8px}header{justify-content:space-between}h2{font-size:22px;margin:0}p{color:#aaa;margin:6px 0 18px}button,select{color:#eee;background:#222;border:1px solid var(--line,#444);border-radius:4px;padding:7px 10px;font:inherit}button{cursor:pointer}button:disabled{opacity:.4;cursor:default}button:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--amber,#fcaa2d);outline-offset:2px}.workspace{display:grid;grid-template-columns:1.2fr 1fr;gap:24px}.marks{flex-wrap:wrap;margin-bottom:14px}.marks button{text-transform:capitalize}.marks span{font-size:12px;color:#999}.block{margin-bottom:14px}.block-controls{justify-content:space-between;margin-bottom:6px}label{display:flex;gap:10px;align-items:center;color:#aaa}textarea{display:block;width:100%;height:auto;min-height:70px;resize:vertical;background:#080808;border:1px solid var(--line,#444);border-radius:4px;color:#eee;padding:10px;font:16px/1.5 var(--font-performance-sans,Arial,sans-serif);box-sizing:border-box}.preview{padding:16px;background:#080808;border-radius:4px}.preview h3{margin:0 0 18px;color:#888;font:11px monospace;text-transform:uppercase;letter-spacing:.1em}.preview :global(.rich-note){height:auto;overflow:visible}footer{margin-top:20px;justify-content:flex-end}footer span{margin-right:auto;color:#999;font-size:12px}.save{background:var(--amber,#fcaa2d);color:#111;border-color:var(--amber,#fcaa2d);font-weight:bold}@media(max-width:600px){.workspace{grid-template-columns:1fr}.preview{min-height:120px}dialog{padding:14px}footer span{display:none}}
</style>
