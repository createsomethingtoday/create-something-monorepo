<!--
  ArrayEditor

  Manages arrays of items (projects, team members, services).
  Supports add, remove, and reorder with drag-drop.
  Heideggerian: Direct manipulation, no intermediate states.
-->
<script lang="ts">
  import type { ConfigField } from '$lib/types';
  import FieldEditor from './FieldEditor.svelte';

  interface Props {
    items: unknown[];
    schema: ConfigField[];
    onchange: (items: unknown[]) => void;
  }

  let { items, schema, onchange }: Props = $props();

  // Track which item is expanded for editing
  let expandedIndex = $state<number | null>(null);

  function addItem() {
    // Create empty item from schema
    const newItem: Record<string, unknown> = {};
    for (const field of schema) {
      newItem[field.key] = field.default ?? '';
    }
    onchange([...items, newItem]);
    expandedIndex = items.length; // Expand the new item
  }

  function removeItem(index: number) {
    const newItems = [...items];
    newItems.splice(index, 1);
    onchange(newItems);
    if (expandedIndex === index) {
      expandedIndex = null;
    }
  }

  function updateItem(index: number, key: string, value: unknown) {
    const newItems = [...items];
    newItems[index] = { ...(newItems[index] as object), [key]: value };
    onchange(newItems);
  }

  function toggleExpand(index: number) {
    expandedIndex = expandedIndex === index ? null : index;
  }

  function moveItem(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= items.length) return;
    const newItems = [...items];
    const [removed] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, removed);
    onchange(newItems);
    expandedIndex = toIndex;
  }

  // Get display title for an item
  function getItemTitle(item: unknown, index: number): string {
    if (typeof item !== 'object' || item === null) {
      return `Item ${index + 1}`;
    }
    const obj = item as Record<string, unknown>;
    // Try common title fields
    const titleField = obj.title || obj.name || obj.client || obj.label;
    return typeof titleField === 'string' && titleField
      ? titleField
      : `Item ${index + 1}`;
  }
</script>

<div class="array-editor">
  {#if items.length === 0}
    <div class="empty-array">
      <p>No items yet</p>
    </div>
  {:else}
    <div class="items-list">
      {#each items as item, index}
        <div class="item" class:expanded={expandedIndex === index}>
          <!-- Item header (always visible) -->
          <div class="item-header">
            <button class="item-toggle" onclick={() => toggleExpand(index)} type="button">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class:rotated={expandedIndex === index}
              >
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              <span class="item-title">{getItemTitle(item, index)}</span>
            </button>

            <div class="item-actions">
              <button
                class="action-btn"
                onclick={() => moveItem(index, index - 1)}
                disabled={index === 0}
                title="Move up"
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
              </button>
              <button
                class="action-btn"
                onclick={() => moveItem(index, index + 1)}
                disabled={index === items.length - 1}
                title="Move down"
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <button
                class="action-btn danger"
                onclick={() => removeItem(index)}
                title="Remove"
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Item fields (expanded) -->
          {#if expandedIndex === index}
            <div class="item-fields">
              {#each schema as field}
                <FieldEditor
                  {field}
                  value={(item as Record<string, unknown>)[field.key]}
                  onchange={(value) => updateItem(index, field.key, value)}
                />
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <button class="add-btn" onclick={addItem} type="button">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
    Add Item
  </button>
</div>

<style>
  .array-editor {
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    background: var(--color-bg-elevated);
    overflow: hidden;
  }

  .empty-array {
    padding: var(--space-lg);
    text-align: center;
    color: var(--color-fg-muted);
  }

  .empty-array p {
    margin: 0;
    font-size: var(--text-body-sm);
  }

  .items-list {
    border-bottom: 1px solid var(--color-border-default);
  }

  .item {
    border-bottom: 1px solid var(--color-border-default);
  }

  .item:last-child {
    border-bottom: none;
  }

  .item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm) var(--space-md);
  }

  .item.expanded .item-header {
    border-bottom: 1px solid var(--color-border-default);
    background: var(--color-bg-surface);
  }

  .item-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    background: none;
    border: none;
    color: var(--color-fg-primary);
    cursor: pointer;
    padding: 0;
    font-size: var(--text-body);
    font-weight: 500;
  }

  .item-toggle svg {
    color: var(--color-fg-muted);
    transition: transform var(--duration-micro) var(--ease-standard);
  }

  .item-toggle svg.rotated {
    transform: rotate(90deg);
  }

  .item-actions {
    display: flex;
    gap: 4px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: none;
    color: var(--color-fg-muted);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .action-btn:hover:not(:disabled) {
    background: var(--color-hover);
    color: var(--color-fg-primary);
  }

  .action-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .action-btn.danger:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.1);
    color: var(--color-error);
  }

  .item-fields {
    padding: var(--space-md);
    background: var(--color-bg-subtle);
  }

  .add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    width: 100%;
    padding: var(--space-sm);
    border: none;
    background: none;
    color: var(--color-fg-secondary);
    cursor: pointer;
    font-size: var(--text-body-sm);
    font-weight: 500;
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .add-btn:hover {
    background: var(--color-hover);
    color: var(--color-fg-primary);
  }
</style>
