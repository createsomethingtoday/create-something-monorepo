<script lang="ts">
  import type { CanvasDocument, CanvasObject } from './document';
  import { editBounds, transformRoots, isLayerLocked, type EditCommand } from './editing';
  let {
    document,
    selectedIds,
    select,
    edit,
    disabled = false
  } = $props<{
    document: CanvasDocument;
    selectedIds: string[];
    select: (ids: string[]) => void;
    edit: (commands: EditCommand[]) => void;
    disabled?: boolean;
  }>();
  let search = $state('');
  const selected = $derived(
    document.objects.filter((o: CanvasObject) => selectedIds.includes(o.id))
  );
  const roots = $derived(transformRoots(document, selectedIds));
  const bounds = $derived(editBounds(roots));
  const first = $derived(selected[0]);
  const locked = $derived(selected.some((o: CanvasObject) => isLayerLocked(document, o.id)));
  const inheritedLock = $derived(selected.some((o:CanvasObject)=>!o.locked && isLayerLocked(document,o.id)));
  const marks = $derived(
    selected.length > 0 &&
      selected.every((o: CanvasObject) =>
        ['stroke', 'rectangle', 'ellipse', 'arrow'].includes(o.kind)
      )
  );
  const layers = $derived(
    [...document.objects]
      .reverse()
      .filter((o: CanvasObject) =>
        (o.name || ('label' in o ? o.label : 'text' in o ? o.text : o.kind))
          .toLowerCase()
          .includes(search.toLowerCase())
      )
  );
  function geometry(key: 'x' | 'y' | 'width' | 'height' | 'rotation', value: string) {
    edit([{ type: 'transform', ids: selectedIds, [key]: Number(value) }]);
  }
</script>

<aside class="workbench-panel" aria-label="Layers and properties">
  <section class="properties">
    <header>
      <h2>Properties</h2>
      <span>{selected.length ? `${selected.length} selected` : 'No selection'}</span>
    </header>
    {#if first}
      <label
        >Name<input
          aria-label="Layer name"
          value={first.name || ('label' in first ? first.label : first.kind)}
          {disabled}
          onchange={(e) => edit([{ type: 'layer', ids: [first.id], name: e.currentTarget.value }])}
        /></label
      >
      {#if selected.some((o: CanvasObject) => o.kind !== 'connector')}
        <div class="fields">
          {#each ['x', 'y', 'width', 'height'] as key}
            <label
              >{key === 'width' ? 'W' : key === 'height' ? 'H' : key.toUpperCase()}<input
                type="number"
                step="1"
                aria-label={`Selection ${key}`}
                value={Math.round(bounds[key as keyof typeof bounds] * 100) / 100}
                disabled={disabled || locked}
                onchange={(e) =>
                  geometry(key as 'x' | 'y' | 'width' | 'height', e.currentTarget.value)}
              /></label
            >
          {/each}
          <label
            >Rotation<input
              type="number"
              aria-label="Selection rotation"
              value={roots[0]?.rotation || 0}
              disabled={disabled || locked}
              onchange={(e) => geometry('rotation', e.currentTarget.value)}
            /></label
          >
        </div>
      {/if}
      {#if marks}
        <div class="fields">
          <label
            >Stroke<input
              type="color"
              aria-label="Selection stroke color"
              value={'color' in first ? first.color : '#ffffff'}
              disabled={disabled || locked}
              onchange={(e) =>
                edit([{ type: 'style', ids: selectedIds, color: e.currentTarget.value }])}
            /></label
          >
          <label
            >Weight<input
              type="number"
              min="0.1"
              max="100"
              step="0.5"
              aria-label="Selection stroke width"
              value={first.kind === 'stroke' ? first.width : first.strokeWidth || 2}
              disabled={disabled || locked}
              onchange={(e) =>
                edit([
                  { type: 'style', ids: selectedIds, strokeWidth: Number(e.currentTarget.value) }
                ])}
            /></label
          >
          <label
            >Fill<input
              type="color"
              aria-label="Selection fill"
              value={first.fill && first.fill !== 'none' ? first.fill : '#ffffff'}
              disabled={disabled || locked}
              onchange={(e) =>
                edit([{ type: 'style', ids: selectedIds, fill: e.currentTarget.value }])}
            /></label
          >
          <button
            disabled={disabled || locked}
            onclick={() => edit([{ type: 'style', ids: selectedIds, fill: 'none' }])}
            >No fill</button
          >
        </div>
      {/if}
      <div class="actions">
        <button
          disabled={disabled || locked}
          onclick={() => edit([{ type: 'duplicate', ids: selectedIds }])}>Duplicate</button
        ><button
          disabled={disabled || inheritedLock}
          onclick={() => edit([{ type: 'layer', ids: selectedIds, locked: !locked }])}
          >{inheritedLock ? 'Locked by group' : locked ? 'Unlock' : 'Lock'}</button
        >
      </div>
      <div class="actions">
        <button
          disabled={disabled || locked}
          onclick={() => edit([{ type: 'arrange', ids: selectedIds, position: 'forward' }])}
          >Forward</button
        ><button
          disabled={disabled || locked}
          onclick={() => edit([{ type: 'arrange', ids: selectedIds, position: 'backward' }])}
          >Backward</button
        >
      </div>
      {#if selected.length > 1}<h3>Align & distribute</h3>
        <div class="align-actions">
          {#each ['left', 'center', 'right', 'top', 'middle', 'bottom', 'horizontal', 'vertical'] as axis}<button
              disabled={disabled || locked}
              onclick={() => edit([{ type: 'align', ids: selectedIds, axis: axis as 'left' }])}
              >{axis}</button
            >{/each}
        </div>{/if}
    {:else}<p>Select artwork to edit its position, appearance, and layer.</p>{/if}
  </section>
  <section class="layers">
    <header>
      <h2>Layers</h2>
      <span>{document.objects.length}</span>
    </header>
    <input
      class="search"
      aria-label="Search layers"
      placeholder="Find a layer…"
      bind:value={search}
    />
    <div class="layer-list">
      {#each layers as object (object.id)}<div
          class="layer"
          class:active={selectedIds.includes(object.id)}
        >
          <button
            class="layer-select"
            aria-pressed={selectedIds.includes(object.id)}
            onclick={(e) =>
              select(e.shiftKey ? [...new Set([...selectedIds, object.id])] : [object.id])}
            ><small>{object.kind}</small><span
              >{object.name ||
                ('label' in object ? object.label : 'text' in object ? object.text : object.kind) ||
                object.kind}</span
            ></button
          >
          <button
            class="layer-toggle"
            aria-label={`${object.hidden ? 'Show' : 'Hide'} layer ${object.name || object.id}`}
            {disabled}
            onclick={() => edit([{ type: 'layer', ids: [object.id], hidden: !object.hidden }])}
            >{object.hidden ? '○' : '●'}</button
          >
          <button
            class="layer-toggle"
            aria-label={`${object.locked ? 'Unlock' : 'Lock'} layer ${object.name || object.id}`}
            {disabled}
            onclick={() => edit([{ type: 'layer', ids: [object.id], locked: !object.locked }])}
            >{object.locked ? 'L' : '·'}</button
          >
        </div>{/each}
    </div>
  </section>
</aside>

<style>
  .workbench-panel {
    width: 248px;
    min-height: 0;
    overflow: auto;
    border-left: 1px solid var(--line);
    background: var(--color-performance-shell-surface, #0d0d0d);
    color: var(--color-performance-fg-primary, #fff);
    font: 12px var(--font-performance-sans, Arial, sans-serif);
  }
  section {
    padding: 14px;
    border-bottom: 1px solid var(--line);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  h2 {
    margin: 0;
    font-size: 12px;
  }
  header span,
  small,
  p {
    color: var(--color-performance-fg-muted, #999);
  }
  header span {
    font-size: 10px;
  }
  p {
    line-height: 1.6;
  }
  h3 {
    font-size: 11px;
    margin: 16px 0 8px;
  }
  label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    margin-bottom: 8px;
  }
  input {
    min-width: 0;
    width: 100%;
    height: 32px;
    border: 1px solid var(--line);
    border-radius: 3px;
    padding: 4px 6px;
    background: var(--color-performance-shell-surface, #111);
    color: inherit;
    font: inherit;
  }
  input[type='color'] {
    padding: 3px;
  }
  .fields,
  .actions,
  .align-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .fields {
    margin-top: 12px;
  }
  .fields label {
    display: grid;
    gap: 4px;
  }
  .actions {
    margin-top: 6px;
  }
  button {
    min-height: 32px;
    border: 1px solid var(--line);
    border-radius: 3px;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  button:hover {
    border-color: var(--amber);
  }
  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  :focus-visible {
    outline: 2px solid var(--amber);
    outline-offset: 2px;
  }
  .align-actions button {
    text-transform: capitalize;
    font-size: 10px;
  }
  .layer-list {
    margin-top: 10px;
  }
  .layer {
    display: flex;
    align-items: center;
    border: 1px solid transparent;
    border-radius: 3px;
    margin-bottom: 3px;
  }
  .layer.active {
    border-color: var(--amber);
    background: color-mix(in srgb, var(--amber) 8%, transparent);
  }
  .layer-select {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    flex: 1;
    min-width: 0;
    border: 0;
    padding: 8px;
    text-align: left;
  }
  .layer-select span {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .layer-select small {
    font-size: 9px;
  }
  .layer-toggle {
    width: 26px;
    flex: 0 0 26px;
    border: 0;
  }
  @media (max-width: 820px) {
    .workbench-panel {
      width: min(280px, calc(100vw - 24px));
      max-height: calc(100dvh - 260px);
      border: 1px solid var(--line);
      box-shadow: 0 12px 30px #0008;
    }
    input,
    button {
      min-height: 40px;
    }
  }
</style>
