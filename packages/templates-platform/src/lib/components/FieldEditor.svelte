<!--
  FieldEditor

  Generic field renderer for different input types.
  Heideggerian: The field type determines the interaction,
  not the user choosing an interaction mode.
-->
<script lang="ts">
  import type { ConfigField } from '$lib/types';
  import ImageUploader from './ImageUploader.svelte';
  import ArrayEditor from './ArrayEditor.svelte';

  interface Props {
    field: ConfigField;
    value: unknown;
    onchange: (value: unknown) => void;
  }

  let { field, value, onchange }: Props = $props();

  // Coerce value to appropriate type
  let stringValue = $derived(typeof value === 'string' ? value : '');
  let arrayValue = $derived(Array.isArray(value) ? value : []);

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    onchange(target.value);
  }

  function handleArrayChange(newArray: unknown[]) {
    onchange(newArray);
  }

  function handleImageChange(url: string) {
    onchange(url);
  }
</script>

<div class="field-editor">
  <label class="field-label" for={field.key}>
    {field.label}
    {#if field.description}
      <span class="field-hint">{field.description}</span>
    {/if}
  </label>

  {#if field.type === 'text'}
    <input
      type="text"
      id={field.key}
      class="input"
      value={stringValue}
      placeholder={field.placeholder}
      oninput={handleInput}
    />

  {:else if field.type === 'textarea'}
    <textarea
      id={field.key}
      class="input textarea"
      value={stringValue}
      placeholder={field.placeholder}
      oninput={handleInput}
      rows="4"
    ></textarea>

  {:else if field.type === 'email'}
    <input
      type="email"
      id={field.key}
      class="input"
      value={stringValue}
      placeholder={field.placeholder}
      oninput={handleInput}
    />

  {:else if field.type === 'url'}
    <input
      type="url"
      id={field.key}
      class="input"
      value={stringValue}
      placeholder={field.placeholder}
      oninput={handleInput}
    />

  {:else if field.type === 'image'}
    <ImageUploader
      value={stringValue}
      onchange={handleImageChange}
    />

  {:else if field.type === 'array' && field.schema}
    <ArrayEditor
      items={arrayValue}
      schema={field.schema}
      onchange={handleArrayChange}
    />

  {:else if field.type === 'color'}
    <div class="color-input-wrapper">
      <input
        type="color"
        id={field.key}
        class="color-input"
        value={stringValue || '#000000'}
        oninput={handleInput}
      />
      <input
        type="text"
        class="input color-text"
        value={stringValue}
        placeholder="#000000"
        oninput={handleInput}
      />
    </div>

  {:else}
    <input
      type="text"
      id={field.key}
      class="input"
      value={stringValue}
      placeholder={field.placeholder}
      oninput={handleInput}
    />
  {/if}
</div>

<style>
  .field-editor {
    margin-bottom: var(--space-md);
  }

  .field-label {
    display: block;
    font-size: var(--text-body-sm);
    font-weight: 500;
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-xs);
  }

  .field-hint {
    display: block;
    font-weight: 400;
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
    margin-top: 2px;
  }

  .textarea {
    resize: vertical;
    min-height: 100px;
  }

  .color-input-wrapper {
    display: flex;
    gap: var(--space-xs);
    align-items: center;
  }

  .color-input {
    width: 44px;
    height: 44px;
    padding: 2px;
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    background: var(--color-bg-surface);
    cursor: pointer;
  }

  .color-text {
    flex: 1;
    font-family: monospace;
  }
</style>
