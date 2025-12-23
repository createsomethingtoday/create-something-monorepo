<!--
  CollectionGrid Component

  Displays a collection of taste references as a visual grid.
  Uses Canon tokens for consistent dark aesthetic.

  Philosophy: Taste is cultivated through visual exploration.
  Canon: "Tailwind for structure, Canon for aesthetics."
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface CollectionItem {
		id: string;
		reference_id: string;
		reference_type: 'example' | 'resource';
		position: number;
		note?: string;
		added_at?: string;
		// Joined data from examples/resources table
		title?: string;
		image_url?: string;
		url?: string;
		description?: string;
		year?: number;
	}

	interface Collection {
		id: string;
		name: string;
		description?: string;
		visibility: 'private' | 'public' | 'unlisted';
		item_count: number;
		items?: CollectionItem[];
	}

	interface Props {
		collection: Collection;
		items: CollectionItem[];
		isEditable?: boolean;
		columns?: 2 | 3 | 4;
		onItemClick?: (item: CollectionItem) => void;
		onItemRemove?: (item: CollectionItem) => void;
		onReorder?: (items: CollectionItem[]) => void;
		emptySlot?: Snippet;
	}

	let {
		collection,
		items,
		isEditable = false,
		columns = 3,
		onItemClick,
		onItemRemove,
		onReorder,
		emptySlot
	}: Props = $props();

	// Drag and drop state
	let draggedItem = $state<CollectionItem | null>(null);
	let dragOverIndex = $state<number | null>(null);

	function handleDragStart(e: DragEvent, item: CollectionItem) {
		if (!isEditable) return;
		draggedItem = item;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', item.id);
		}
	}

	function handleDragOver(e: DragEvent, index: number) {
		if (!isEditable || !draggedItem) return;
		e.preventDefault();
		dragOverIndex = index;
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	function handleDrop(e: DragEvent, targetIndex: number) {
		if (!isEditable || !draggedItem) return;
		e.preventDefault();

		const sourceIndex = items.findIndex(i => i.id === draggedItem!.id);
		if (sourceIndex === -1 || sourceIndex === targetIndex) {
			draggedItem = null;
			dragOverIndex = null;
			return;
		}

		// Reorder items
		const newItems = [...items];
		const [removed] = newItems.splice(sourceIndex, 1);
		newItems.splice(targetIndex, 0, removed);

		// Update positions
		const reorderedItems = newItems.map((item, idx) => ({
			...item,
			position: idx
		}));

		onReorder?.(reorderedItems);
		draggedItem = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		draggedItem = null;
		dragOverIndex = null;
	}

	function handleItemClick(item: CollectionItem) {
		onItemClick?.(item);
	}

	function handleRemove(e: MouseEvent, item: CollectionItem) {
		e.stopPropagation();
		onItemRemove?.(item);
	}

	// Keyboard navigation
	function handleKeyDown(e: KeyboardEvent, item: CollectionItem) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleItemClick(item);
		}
	}
</script>

<div class="collection-grid-wrapper">
	<!-- Collection header -->
	<header class="collection-header">
		<div class="header-content">
			<h2 class="collection-name">{collection.name}</h2>
			{#if collection.description}
				<p class="collection-description">{collection.description}</p>
			{/if}
		</div>
		<div class="header-meta">
			<span class="item-count">{items.length} items</span>
			<span class="visibility-badge" class:public={collection.visibility === 'public'}>
				{collection.visibility}
			</span>
		</div>
	</header>

	<!-- Grid or empty state -->
	{#if items.length === 0}
		<div class="empty-state">
			{#if emptySlot}
				{@render emptySlot()}
			{:else}
				<p class="empty-text">This collection is empty</p>
				<p class="empty-hint">Add references from the Taste library to build your collection</p>
			{/if}
		</div>
	{:else}
		<div
			class="collection-grid columns-{columns}"
			role="list"
			aria-label="{collection.name} collection"
		>
			{#each items as item, index (item.id)}
				<div
					class="grid-item"
					class:dragging={draggedItem?.id === item.id}
					class:drag-over={dragOverIndex === index}
					class:editable={isEditable}
					role="listitem"
					tabindex="0"
					draggable={isEditable}
					onclick={() => handleItemClick(item)}
					onkeydown={(e) => handleKeyDown(e, item)}
					ondragstart={(e) => handleDragStart(e, item)}
					ondragover={(e) => handleDragOver(e, index)}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, index)}
					ondragend={handleDragEnd}
				>
					{#if item.reference_type === 'example' && item.image_url}
						<div class="item-image-wrapper">
							<img
								src={item.image_url}
								alt={item.title || 'Visual reference'}
								class="item-image"
								loading="lazy"
							/>
							<div class="item-overlay">
								<div class="item-info">
									{#if item.title}
										<span class="item-title">{item.title}</span>
									{/if}
									{#if item.year}
										<span class="item-year">{item.year}</span>
									{/if}
								</div>
							</div>
						</div>
					{:else}
						<div class="item-text">
							<span class="item-type">{item.reference_type}</span>
							<span class="item-title">{item.title || 'Untitled'}</span>
							{#if item.description}
								<span class="item-description">{item.description}</span>
							{/if}
						</div>
					{/if}

					{#if item.note}
						<div class="item-note">
							<span class="note-icon">*</span>
							<span class="note-text">{item.note}</span>
						</div>
					{/if}

					{#if isEditable}
						<button
							type="button"
							class="remove-button"
							onclick={(e) => handleRemove(e, item)}
							aria-label="Remove from collection"
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M18 6L6 18M6 6l12 12" />
							</svg>
						</button>
						<div class="drag-handle" aria-hidden="true">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
								<circle cx="9" cy="5" r="2" />
								<circle cx="9" cy="12" r="2" />
								<circle cx="9" cy="19" r="2" />
								<circle cx="15" cy="5" r="2" />
								<circle cx="15" cy="12" r="2" />
								<circle cx="15" cy="19" r="2" />
							</svg>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* Wrapper */
	.collection-grid-wrapper {
		width: 100%;
	}

	/* Header */
	.collection-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.header-content {
		flex: 1;
		min-width: 0;
	}

	.collection-name {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.collection-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-top: 0.25rem;
	}

	.header-meta {
		display: flex;
		gap: var(--space-sm);
		align-items: center;
		flex-shrink: 0;
	}

	.item-count {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.visibility-badge {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.25rem 0.5rem;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-muted);
	}

	.visibility-badge.public {
		background: var(--color-success-muted);
		border-color: var(--color-success-border);
		color: var(--color-success);
	}

	/* Empty state */
	.empty-state {
		text-align: center;
		padding: var(--space-xl);
		border: 1px dashed var(--color-border-default);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
	}

	.empty-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: 0.25rem;
	}

	.empty-hint {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Grid layout */
	.collection-grid {
		display: grid;
		gap: 1rem;
	}

	.columns-2 {
		grid-template-columns: repeat(2, 1fr);
	}

	.columns-3 {
		grid-template-columns: repeat(3, 1fr);
	}

	.columns-4 {
		grid-template-columns: repeat(4, 1fr);
	}

	@media (max-width: 768px) {
		.columns-3,
		.columns-4 {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 480px) {
		.columns-2,
		.columns-3,
		.columns-4 {
			grid-template-columns: 1fr;
		}
	}

	/* Grid item */
	.grid-item {
		position: relative;
		overflow: hidden;
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-surface);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.grid-item:hover {
		border-color: var(--color-border-emphasis);
	}

	.grid-item:focus {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.grid-item.editable {
		cursor: grab;
	}

	.grid-item.editable:active {
		cursor: grabbing;
	}

	.grid-item.dragging {
		opacity: 0.5;
	}

	.grid-item.drag-over {
		border-color: var(--color-fg-primary);
		border-style: dashed;
	}

	/* Image items */
	.item-image-wrapper {
		position: relative;
		aspect-ratio: 1;
		overflow: hidden;
	}

	.item-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.grid-item:hover .item-image {
		transform: scale(1.05);
	}

	.item-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent 50%);
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.grid-item:hover .item-overlay,
	.grid-item:focus .item-overlay {
		opacity: 1;
	}

	.item-info {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: var(--space-sm);
	}

	.item-title {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-year {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		display: block;
		margin-top: 0.125rem;
	}

	/* Text items (resources) */
	.item-text {
		padding: var(--space-sm);
		min-height: 8rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.item-type {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-fg-muted);
	}

	.item-text .item-title {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.item-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* Notes */
	.item-note {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 0.25rem var(--space-sm);
		background: var(--color-info-muted);
		border-top: 1px solid var(--color-info-border);
		display: flex;
		gap: 0.25rem;
		align-items: flex-start;
	}

	.note-icon {
		color: var(--color-info);
		font-weight: bold;
		flex-shrink: 0;
	}

	.note-text {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Remove button */
	.remove-button {
		position: absolute;
		top: var(--space-xs);
		right: var(--space-xs);
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		cursor: pointer;
		opacity: 0;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.grid-item:hover .remove-button,
	.grid-item:focus .remove-button {
		opacity: 1;
	}

	.remove-button:hover {
		background: var(--color-error-muted);
		border-color: var(--color-error-border);
		color: var(--color-error);
	}

	/* Drag handle */
	.drag-handle {
		position: absolute;
		top: var(--space-xs);
		left: var(--space-xs);
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-fg-muted);
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.grid-item:hover .drag-handle,
	.grid-item:focus .drag-handle {
		opacity: 0.6;
	}
</style>
