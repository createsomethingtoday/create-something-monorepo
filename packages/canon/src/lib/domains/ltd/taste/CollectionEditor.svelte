<!--
  CollectionEditor Component

  Modal dialog for creating or editing collection metadata.
  Supports name, description, visibility, and tags.

  Philosophy: Collections are personal canons—curated taste made manifest.
  Canon: "Tailwind for structure, Canon for aesthetics."
-->
<script lang="ts">
	type Visibility = 'private' | 'public' | 'unlisted';

	interface Collection {
		id?: string;
		name: string;
		description?: string;
		visibility: Visibility;
		tags?: string[];
	}

	interface Props {
		isOpen: boolean;
		collection?: Collection;
		onClose: () => void;
		onSave: (collection: Collection) => void;
		onDelete?: (id: string) => void;
	}

	let {
		isOpen,
		collection,
		onClose,
		onSave,
		onDelete
	}: Props = $props();

	// Form state
	let name = $state('');
	let description = $state('');
	let visibility = $state<Visibility>('private');
	let tags = $state<string[]>([]);
	let tagInput = $state('');
	let errors = $state<{ name?: string }>({});
	let isSaving = $state(false);
	let showDeleteConfirm = $state(false);

	// Track if this is edit mode
	const isEditing = $derived(!!collection?.id);

	// Reset form when modal opens or collection changes
	$effect(() => {
		if (isOpen) {
			if (collection) {
				name = collection.name;
				description = collection.description || '';
				visibility = collection.visibility;
				tags = collection.tags ? [...collection.tags] : [];
			} else {
				name = '';
				description = '';
				visibility = 'private';
				tags = [];
			}
			tagInput = '';
			errors = {};
			isSaving = false;
			showDeleteConfirm = false;
		}
	});

	function validate(): boolean {
		const newErrors: { name?: string } = {};

		if (!name.trim()) {
			newErrors.name = 'Name is required';
		} else if (name.trim().length > 100) {
			newErrors.name = 'Name must be 100 characters or less';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!validate()) return;

		isSaving = true;
		onSave({
			id: collection?.id,
			name: name.trim(),
			description: description.trim() || undefined,
			visibility,
			tags: tags.length > 0 ? tags : undefined
		});
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (showDeleteConfirm) {
				showDeleteConfirm = false;
			} else {
				onClose();
			}
		}
	}

	function addTag() {
		const trimmed = tagInput.trim().toLowerCase();
		if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
			tags = [...tags, trimmed];
			tagInput = '';
		}
	}

	function removeTag(tag: string) {
		tags = tags.filter(t => t !== tag);
	}

	function handleTagKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			addTag();
		} else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
			tags = tags.slice(0, -1);
		}
	}

	function handleDelete() {
		if (collection?.id && onDelete) {
			onDelete(collection.id);
		}
	}

	const visibilityOptions: { value: Visibility; label: string; description: string }[] = [
		{
			value: 'private',
			label: 'Private',
			description: 'Only you can see this collection'
		},
		{
			value: 'unlisted',
			label: 'Unlisted',
			description: 'Anyone with the link can view'
		},
		{
			value: 'public',
			label: 'Public',
			description: 'Visible on your profile and discoverable'
		}
	];
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="backdrop" onclick={handleBackdropClick}>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
			<form onsubmit={handleSubmit}>
				<!-- Header -->
				<header class="modal-header">
					<h2 id="editor-title" class="modal-title">
						{isEditing ? 'Edit Collection' : 'New Collection'}
					</h2>
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

				<!-- Form content -->
				<div class="modal-content">
					<!-- Name -->
					<div class="form-group">
						<label for="collection-name" class="form-label">
							Name <span class="required">*</span>
						</label>
						<input
							id="collection-name"
							type="text"
							class="form-input"
							class:error={errors.name}
							placeholder="My Design Inspiration"
							bind:value={name}
							maxlength="100"
						/>
						{#if errors.name}
							<p class="error-text">{errors.name}</p>
						{/if}
					</div>

					<!-- Description -->
					<div class="form-group">
						<label for="collection-description" class="form-label">
							Description
						</label>
						<textarea
							id="collection-description"
							class="form-textarea"
							placeholder="What does this collection represent?"
							bind:value={description}
							rows="3"
							maxlength="500"
						></textarea>
						<p class="char-count">{description.length}/500</p>
					</div>

					<!-- Visibility -->
					<div class="form-group">
						<span class="form-label">Visibility</span>
						<div class="visibility-options" role="radiogroup" aria-label="Collection visibility">
							{#each visibilityOptions as option (option.value)}
								<label class="visibility-option" class:selected={visibility === option.value}>
									<input
										type="radio"
										name="visibility"
										value={option.value}
										bind:group={visibility}
										class="visually-hidden"
									/>
									<span class="option-radio">
										{#if visibility === option.value}
											<span class="radio-dot"></span>
										{/if}
									</span>
									<div class="option-text">
										<span class="option-label">{option.label}</span>
										<span class="option-description">{option.description}</span>
									</div>
								</label>
							{/each}
						</div>
					</div>

					<!-- Tags -->
					<div class="form-group">
						<label for="collection-tags" class="form-label">
							Tags <span class="optional">(up to 10)</span>
						</label>
						<div class="tags-input">
							{#each tags as tag (tag)}
								<span class="tag">
									{tag}
									<button
										type="button"
										class="tag-remove"
										onclick={() => removeTag(tag)}
										aria-label="Remove tag {tag}"
									>
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M18 6L6 18M6 6l12 12" />
										</svg>
									</button>
								</span>
							{/each}
							{#if tags.length < 10}
								<input
									id="collection-tags"
									type="text"
									class="tag-input"
									placeholder={tags.length === 0 ? 'Add tags...' : ''}
									bind:value={tagInput}
									onkeydown={handleTagKeydown}
									onblur={addTag}
								/>
							{/if}
						</div>
						<p class="input-hint">Press Enter or comma to add</p>
					</div>
				</div>

				<!-- Footer -->
				<footer class="modal-footer">
					{#if isEditing && onDelete}
						{#if showDeleteConfirm}
							<div class="delete-confirm">
								<span class="confirm-text">Delete this collection?</span>
								<button
									type="button"
									class="btn-danger"
									onclick={handleDelete}
								>
									Yes, delete
								</button>
								<button
									type="button"
									class="btn-secondary"
									onclick={() => (showDeleteConfirm = false)}
								>
									Cancel
								</button>
							</div>
						{:else}
							<button
								type="button"
								class="btn-text-danger"
								onclick={() => (showDeleteConfirm = true)}
							>
								Delete Collection
							</button>
						{/if}
					{/if}

					<div class="footer-actions">
						<button type="button" class="btn-secondary" onclick={onClose}>
							Cancel
						</button>
						<button
							type="submit"
							class="btn-primary"
							disabled={isSaving}
						>
							{#if isSaving}
								Saving...
							{:else}
								{isEditing ? 'Save Changes' : 'Create Collection'}
							{/if}
						</button>
					</div>
				</footer>
			</form>
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
		max-width: 32rem;
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

	/* Content */
	.modal-content {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-md);
	}

	/* Form groups */
	.form-group {
		margin-bottom: var(--space-md);
	}

	.form-group:last-child {
		margin-bottom: 0;
	}

	.form-label {
		display: block;
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-secondary);
		margin-bottom: 0.25rem;
	}

	.required {
		color: var(--color-error);
	}

	.optional {
		color: var(--color-fg-muted);
		font-weight: 400;
	}

	.form-input,
	.form-textarea {
		width: 100%;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-body);
		font-family: inherit;
		color: var(--color-fg-primary);
		outline: none;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.form-input::placeholder,
	.form-textarea::placeholder {
		color: var(--color-fg-muted);
	}

	.form-input:focus,
	.form-textarea:focus {
		border-color: var(--color-focus);
	}

	.form-input.error {
		border-color: var(--color-error);
	}

	.form-textarea {
		resize: vertical;
		min-height: 4rem;
	}

	.error-text {
		font-size: var(--text-caption);
		color: var(--color-error);
		margin-top: 0.25rem;
	}

	.char-count {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-align: right;
		margin-top: 0.25rem;
	}

	.input-hint {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: 0.25rem;
	}

	/* Visibility options */
	.visibility-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.visibility-option {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.visibility-option:hover {
		background: var(--color-hover);
	}

	.visibility-option.selected {
		background: var(--color-active);
		border-color: var(--color-border-emphasis);
	}

	.option-radio {
		width: 16px;
		height: 16px;
		border: 1px solid var(--color-border-emphasis);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.visibility-option.selected .option-radio {
		border-color: var(--color-fg-primary);
	}

	.radio-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-fg-primary);
	}

	.option-text {
		display: flex;
		flex-direction: column;
	}

	.option-label {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
	}

	.option-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* Tags input */
	.tags-input {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		padding: var(--space-xs);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		min-height: 2.5rem;
	}

	.tags-input:focus-within {
		border-color: var(--color-focus);
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}

	.tag-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		background: transparent;
		border: none;
		border-radius: 50%;
		color: var(--color-fg-muted);
		cursor: pointer;
		padding: 0;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.tag-remove:hover {
		color: var(--color-error);
	}

	.tag-input {
		flex: 1;
		min-width: 80px;
		padding: 0.125rem 0.25rem;
		background: transparent;
		border: none;
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		outline: none;
	}

	.tag-input::placeholder {
		color: var(--color-fg-muted);
	}

	/* Footer */
	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md);
		border-top: 1px solid var(--color-border-default);
		background: var(--color-bg-subtle);
		gap: var(--space-sm);
	}

	.footer-actions {
		display: flex;
		gap: var(--space-sm);
		margin-left: auto;
	}

	.delete-confirm {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.confirm-text {
		font-size: var(--text-body-sm);
		color: var(--color-error);
	}

	/* Buttons */
	.btn-secondary,
	.btn-primary,
	.btn-danger,
	.btn-text-danger {
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

	.btn-danger {
		background: var(--color-error);
		border: 1px solid var(--color-error);
		color: var(--color-fg-primary);
	}

	.btn-danger:hover {
		opacity: 0.9;
	}

	.btn-text-danger {
		background: transparent;
		border: none;
		color: var(--color-error);
		padding: var(--space-xs) 0;
	}

	.btn-text-danger:hover {
		opacity: 0.7;
	}
</style>
