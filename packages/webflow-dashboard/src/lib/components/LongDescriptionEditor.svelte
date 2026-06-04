<script lang="ts">
  import { Bold, Image, Italic, Link, List, ListOrdered } from 'lucide-svelte';
  import { sanitizeLongDescriptionHtml } from '@create-something/webflow-dashboard-core/long-description';

  interface Props {
    value: string;
    onchange: (value: string) => void;
    id?: string;
    disabled?: boolean;
    placeholder?: string;
  }

  let {
    value,
    onchange,
    id = 'long-description-editor',
    disabled = false,
    placeholder = ''
  }: Props = $props();

  let editorEl: HTMLDivElement | null = null;
  let lastExternalValue = $state('');

  $effect(() => {
    if (!editorEl) return;

    const sanitizedValue = sanitizeLongDescriptionHtml(value);
    if (value !== lastExternalValue || editorEl.innerHTML === '') {
      editorEl.innerHTML = sanitizedValue;
      lastExternalValue = value;
    }
  });

  function emitChange() {
    if (!editorEl) return;

    const sanitizedValue = sanitizeLongDescriptionHtml(editorEl.innerHTML);
    lastExternalValue = sanitizedValue;
    onchange(sanitizedValue);
  }

  function sanitizeEditorHtml() {
    if (!editorEl) return;

    const sanitizedValue = sanitizeLongDescriptionHtml(editorEl.innerHTML);
    editorEl.innerHTML = sanitizedValue;
    lastExternalValue = sanitizedValue;
    onchange(sanitizedValue);
  }

  function focusEditor() {
    editorEl?.focus();
  }

  function runCommand(command: string, commandValue?: string) {
    if (disabled) return;

    focusEditor();
    document.execCommand(command, false, commandValue);
    emitChange();
  }

  function setBlock(event: Event) {
    const select = event.target as HTMLSelectElement;
    const tagName = select.value || 'p';
    runCommand('formatBlock', tagName);
  }

  function addLink() {
    if (disabled) return;

    const rawUrl = window.prompt('Link URL');
    const url = normalizeLinkUrl(rawUrl || '');
    if (!url) return;

    runCommand('createLink', url);
  }

  function addImage() {
    if (disabled) return;

    const rawUrl = window.prompt('Image URL');
    const url = normalizeImageUrl(rawUrl || '');
    if (!url) return;

    focusEditor();
    document.execCommand('insertImage', false, url);

    window.setTimeout(() => {
      const image = Array.from(editorEl?.querySelectorAll('img') || []).find(
        (candidate) => candidate.getAttribute('src') === url || candidate.src === url
      );
      image?.setAttribute('alt', window.prompt('Alt text')?.trim() || '');
      image?.setAttribute('loading', 'lazy');
      sanitizeEditorHtml();
    }, 0);
  }

  function normalizeLinkUrl(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';

    try {
      const url = new URL(trimmed);
      if (url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'mailto:') {
        return url.toString();
      }
    } catch {
      return '';
    }

    return '';
  }

  function normalizeImageUrl(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';

    try {
      const url = new URL(trimmed);
      if (url.protocol !== 'https:') return '';
      if (url.username || url.password) return '';
      return url.toString();
    } catch {
      return '';
    }
  }
</script>

<div class="long-description-editor">
  <div class="long-description-toolbar" aria-controls={id}>
    <select
      class="toolbar-select"
      onchange={setBlock}
      {disabled}
      aria-label="Text style"
      title="Text style"
    >
      <option value="p">P</option>
      <option value="h3">H3</option>
      <option value="h4">H4</option>
      <option value="h5">H5</option>
      <option value="h6">H6</option>
    </select>
    <button
      type="button"
      class="toolbar-button"
      onclick={() => runCommand('bold')}
      {disabled}
      aria-label="Bold"
      title="Bold"
    >
      <Bold size={16} />
    </button>
    <button
      type="button"
      class="toolbar-button"
      onclick={() => runCommand('italic')}
      {disabled}
      aria-label="Italic"
      title="Italic"
    >
      <Italic size={16} />
    </button>
    <button
      type="button"
      class="toolbar-button"
      onclick={() => runCommand('insertUnorderedList')}
      {disabled}
      aria-label="Bulleted list"
      title="Bulleted list"
    >
      <List size={16} />
    </button>
    <button
      type="button"
      class="toolbar-button"
      onclick={() => runCommand('insertOrderedList')}
      {disabled}
      aria-label="Numbered list"
      title="Numbered list"
    >
      <ListOrdered size={16} />
    </button>
    <button
      type="button"
      class="toolbar-button"
      onclick={addLink}
      {disabled}
      aria-label="Add link"
      title="Add link"
    >
      <Link size={16} />
    </button>
    <button
      type="button"
      class="toolbar-button"
      onclick={addImage}
      {disabled}
      aria-label="Add image URL"
      title="Add image URL"
    >
      <Image size={16} />
    </button>
  </div>

  <div
    bind:this={editorEl}
    {id}
    class="long-description-surface marketplace-long-description"
    contenteditable={!disabled}
    role="textbox"
    aria-multiline="true"
    data-placeholder={placeholder}
    oninput={emitChange}
    onblur={sanitizeEditorHtml}
  ></div>
</div>

<style>
  .long-description-editor {
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--color-bg-surface);
  }

  .long-description-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.4rem;
    border-bottom: 1px solid var(--color-border-default);
    background: var(--color-bg-subtle);
  }

  .toolbar-select,
  .toolbar-button {
    height: 2rem;
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
  }

  .toolbar-select {
    min-width: 4rem;
    padding: 0 0.45rem;
  }

  .toolbar-button {
    width: 2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .toolbar-button:disabled,
  .toolbar-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .long-description-surface {
    min-height: 12rem;
    padding: 0.85rem;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    line-height: 1.5;
    outline: none;
  }

  .long-description-surface:focus {
    box-shadow: inset 0 0 0 3px rgba(20, 110, 245, 0.16);
  }

  .long-description-surface:empty::before {
    content: attr(data-placeholder);
    color: var(--color-fg-muted);
  }

  .long-description-surface :global(h3),
  .long-description-surface :global(h4),
  .long-description-surface :global(h5),
  .long-description-surface :global(h6) {
    margin: var(--space-lg) 0 var(--space-sm);
    color: var(--color-fg-primary);
    line-height: 1.25;
  }

  .long-description-surface :global(h3) {
    font-size: var(--text-body-lg);
  }

  .long-description-surface :global(h4),
  .long-description-surface :global(h5),
  .long-description-surface :global(h6) {
    font-size: var(--text-body);
  }

  .long-description-surface :global(p),
  .long-description-surface :global(ul),
  .long-description-surface :global(ol),
  .long-description-surface :global(figure),
  .long-description-surface :global(blockquote),
  .long-description-surface :global(pre) {
    margin: 0 0 var(--space-md);
  }

  .long-description-surface :global(ul),
  .long-description-surface :global(ol) {
    padding-left: 1.35rem;
  }

  .long-description-surface :global(li + li) {
    margin-top: var(--space-xs);
  }

  .long-description-surface :global(a) {
    color: var(--color-info);
  }

  .long-description-surface :global(img) {
    display: block;
    max-width: 100%;
    max-height: 24rem;
    width: auto;
    height: auto;
    margin: var(--space-md) 0;
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    object-fit: contain;
    background: var(--color-bg-subtle);
  }

  .long-description-surface :global(figure img) {
    margin-bottom: var(--space-sm);
  }

  .long-description-surface :global(figcaption) {
    margin-top: calc(var(--space-sm) * -1);
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
    line-height: 1.4;
  }
</style>
