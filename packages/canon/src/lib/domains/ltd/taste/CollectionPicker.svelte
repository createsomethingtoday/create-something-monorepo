<!--
  CollectionPicker Component

  Modal dialog for adding a taste reference to one or more collections.
  Supports creating new collections inline.

  Philosophy: The tool recedes; curation emerges.
  Canon: "Tailwind for structure, Canon for aesthetics."
-->
<script lang="ts">
	interface Collection {
		id: string;
		name: string;
		description?: string;
		visibility: 'private' | 'public' | 'unlisted';
		item_count: number;
	}

	interface Reference {
		id: string;
		type: 'example' | 'resource';
		title?: string;
		image_url?: string;
	}

	interface Props {
		isOpen: boolean;
		reference: Reference;
		collections: Collection[];
		selectedIds?: string[];
		onClose: () => void;
		onSave: (collectionIds: string[], note?: string) => void;
		onCreate?: (name: string) => Promise<Collection>;
	}

	let {
		isOpen,
		reference,
		collections,
		selectedIds = [],
		onClose,
		onSave,
		onCreate
	}: Props = $props();

	// Local state
	let selected = $state<Set<string>>(new Set(selectedIds));
	let note = $state('');
	let isCreating = $state(false);
	let newCollectionName = $state('');
	let createError = $state('');
	let isSaving = $state(false);

	// Reset state when modal opens
	$effect(() => {
		if (isOpen) {
			selected = new Set(selectedIds);
			note = '';
			isCreating = false;
			newCollectionName = '';
			createError = '';
			isSaving = false;
		}
	});

	function toggleCollection(id: string) {
		const newSelected = new Set(selected);
		if (newSelected.has(id)) {
			newSelected.delete(id);
		} else {
			newSelected.add(id);
		}
		selected = newSelected;
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	async function handleCreate() {
		if (!newCollectionName.trim() || !onCreate) return;

		createError = '';
		try {
			const newCollection = await onCreate(newCollectionName.trim());
			// Add the new collection to selected
			selected = new Set([...selected, newCollection.id]);
			newCollectionName = '';
			isCreating = false;
		} catch (err) {
			createError = err instanceof Error ? err.message : 'Failed to create collection';
		}
	}

	function handleSave() {
		if (selected.size === 0) return;
		isSaving = true;
		onSave(Array.from(selected), note.trim() || undefined);
	}

	function handleKeydownInput(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleCreate();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="backdrop" onclick={handleBackdropClick}>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="picker-title">
			<!-- Header -->
			<header class="modal-header">
				<h2 id="picker-title" class="modal-title">Add to Collection</h2>
				<button
					type="button"
					class="close-button"
					onclick={onClose}
					aria-label="Close"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
				</button>
			</header>

			<!-- Reference preview -->
			<div class="reference-preview">
				{#if reference.type === 'example' && reference.image_url}
					<img
						src={reference.image_url}
						alt={reference.title || 'Reference'}
						class="preview-image"
					/>
				{:else}
					<div class="preview-placeholder">
						<span class="preview-type">{reference.type}</span>
					</div>
				{/if}
				<div class="preview-info">
					<span class="preview-title">{reference.title || 'Untitled'}</span>
					<span class="preview-type-label">{reference.type}</span>
				</div>
			</div>

			<!-- Collection list -->
			<div class="collections-section">
				<div class="section-header">
					<span class="section-label">Your Collections</span>
					{#if onCreate && !isCreating}
						<button
							type="button"
							class="new-collection-btn"
							onclick={() => (isCreating = true)}
						>
							+ New Collection
						</button>
					{/if}
				</div>

				{#if isCreating}
					<div class="create-form">
						<input
							type="text"
							class="create-input"
							placeholder="Collection name..."
							bind:value={newCollectionName}
							onkeydown={handleKeydownInput}
						/>
						<div class="create-actions">
							<button
								type="button"
								class="btn-secondary"
								onclick={() => {
									isCreating = false;
									newCollectionName = '';
									createError = '';
								}}
							>
								Cancel
							</button>
							<button
								type="button"
								class="btn-primary"
								onclick={handleCreate}
								disabled={!newCollectionName.trim()}
							>
								Create
							</button>
						</div>
						{#if createError}
							<p class="error-message">{createError}</p>
						{/if}
					</div>
				{/if}

				<div class="collections-list" role="listbox" aria-multiselectable="true">
					{#if collections.length === 0}
						<p class="empty-message">No collections yet. Create your first one above.</p>
					{:else}
						{#each collections as collection (collection.id)}
							<button
								type="button"
								class="collection-option"
								class:selected={selected.has(collection.id)}
								role="option"
								aria-selected={selected.has(collection.id)}
								onclick={() => toggleCollection(collection.id)}
							>
								<div class="option-checkbox">
									{#if selected.has(collection.id)}
										<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
											<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
										</svg>
									{/if}
								</div>
								<div class="option-content">
									<span class="option-name">{collection.name}</span>
									<span class="option-count">{collection.item_count} items</span>
								</div>
								{#if collection.visibility !== 'private'}
									<span class="option-visibility">{collection.visibility}</span>
								{/if}
							</button>
						{/each}
					{/if}
				</div>
			</div>

			<!-- Note field -->
			<div class="note-section">
				<label for="item-note" class="note-label">Add a note (optional)</label>
				<textarea
					id="item-note"
					class="note-input"
					placeholder="Why this reference resonates with you..."
					bind:value={note}
					rows="2"
				></textarea>
			</div>

			<!-- Footer -->
			<footer class="modal-footer">
				<button type="button" class="btn-secondary" onclick={onClose}>
					Cancel
				</button>
				<button
					type="button"
					class="btn-primary"
					onclick={handleSave}
					disabled={selected.size === 0 || isSaving}
				>
					{#if isSaving}
						Saving...
					{:else}
						Add to {selected.size} collection{selected.size !== 1 ? 's' : ''}
					{/if}
				</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	/* Backdrop */
	.backdrop {
		position: fixed;
		inset: 0;
		background: var(--color-overlay-heavy);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-md);
		z-index: var(--z-modal);
		animation: fadeIn var(--duration-micro) var(--ease-standard);
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	/* Modal */
	.modal {
		width: 100%;
		max-width: 28rem;
		max-height: calc(100vh - var(--space-xl));
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		animation: slideIn var(--duration-standard) var(--ease-standard);
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Header */
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.modal-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: transparent;
		border: none;
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.close-button:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	/* Reference preview */
	.reference-preview {
		display: flex;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-subtle);
		border-bottom: 1px solid var(--color-border-default);
	}

	.preview-image {
		width: 48px;
		height: 48px;
		object-fit: cover;
		border: 1px solid var(--color-border-default);
		flex-shrink: 0;
	}

	.preview-placeholder {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		flex-shrink: 0;
	}

	.preview-type {
		font-size: var(--text-caption);
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	.preview-info {
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-width: 0;
	}

	.preview-title {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.preview-type-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: capitalize;
	}

	/* Collections section */
	.collections-section {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-md);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-sm);
	}

	.section-label {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-secondary);
	}

	.new-collection-btn {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.new-collection-btn:hover {
		opacity: 0.7;
	}

	/* Create form */
	.create-form {
		margin-bottom: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.create-input {
		width: 100%;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		outline: none;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.create-input::placeholder {
		color: var(--color-fg-muted);
	}

	.create-input:focus {
		border-color: var(--color-focus);
	}

	.create-actions {
		display: flex;
		gap: var(--space-xs);
		justify-content: flex-end;
		margin-top: var(--space-xs);
	}

	.error-message {
		font-size: var(--text-caption);
		color: var(--color-error);
		margin-top: var(--space-xs);
	}

	/* Collections list */
	.collections-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.empty-message {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-align: center;
		padding: var(--space-md);
	}

	.collection-option {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		text-align: left;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.collection-option:hover {
		background: var(--color-hover);
	}

	.collection-option.selected {
		background: var(--color-success-muted);
		border-color: var(--color-success-border);
	}

	.option-checkbox {
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--color-border-emphasis);
		border-radius: 3px;
		background: var(--color-bg-surface);
		flex-shrink: 0;
	}

	.collection-option.selected .option-checkbox {
		background: var(--color-success);
		border-color: var(--color-success);
		color: var(--color-bg-pure);
	}

	.option-content {
		flex: 1;
		min-width: 0;
	}

	.option-name {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
		display: block;
	}

	.option-count {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.option-visibility {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-fg-muted);
		padding: 0.125rem 0.375rem;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
	}

	/* Note section */
	.note-section {
		padding: 0 var(--space-md) var(--space-md);
	}

	.note-label {
		display: block;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: 0.25rem;
	}

	.note-input {
		width: 100%;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		font-family: inherit;
		color: var(--color-fg-primary);
		resize: vertical;
		outline: none;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.note-input::placeholder {
		color: var(--color-fg-muted);
	}

	.note-input:focus {
		border-color: var(--color-focus);
	}

	/* Footer */
	.modal-footer {
		display: flex;
		gap: var(--space-sm);
		justify-content: flex-end;
		padding: var(--space-md);
		border-top: 1px solid var(--color-border-default);
		background: var(--color-bg-subtle);
	}

	/* Buttons */
	.btn-secondary,
	.btn-primary {
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-body-sm);
		font-weight: 500;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-secondary {
		background: transparent;
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
	}

	.btn-secondary:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.btn-primary {
		background: var(--color-fg-primary);
		border: 1px solid var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
