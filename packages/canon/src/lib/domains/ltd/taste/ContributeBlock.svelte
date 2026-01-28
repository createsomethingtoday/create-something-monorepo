<!--
  Are.na Block Contribution Form

  Authenticated users can submit new taste references to curated channels.
  Supports images (URL), links (URL), and text blocks (markdown).
-->
<script lang="ts">
	interface Props {
		onSuccess?: (blockId: number) => void;
	}

	let { onSuccess }: Props = $props();

	// Form state
	let isOpen = $state(false);
	let isSubmitting = $state(false);
	let error = $state('');
	let success = $state('');

	// Form fields
	let channel = $state('canon-minimalism');
	let contentType = $state<'source' | 'content'>('source');
	let source = $state('');
	let content = $state('');
	let title = $state('');
	let description = $state('');

	const channels = [
		{ value: 'canon-minimalism', label: 'Canon Minimalism', desc: 'Rams\' visual vocabulary' },
		{ value: 'motion-language-4hbfmugttwe', label: 'Motion Language', desc: 'Animation/transition examples' },
		{ value: 'claude-code-puz_2pgfxky', label: 'Claude Code', desc: 'Human-AI partnership patterns' }
	];

	function openModal() {
		isOpen = true;
		resetForm();
	}

	function closeModal() {
		isOpen = false;
		resetForm();
	}

	function resetForm() {
		contentType = 'source';
		source = '';
		content = '';
		title = '';
		description = '';
		error = '';
		success = '';
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isSubmitting = true;
		error = '';
		success = '';

		try {
			const body: Record<string, string> = { channel };

			if (contentType === 'source') {
				if (!source) {
					throw new Error('URL is required for image/link blocks');
				}
				body.source = source;
			} else {
				if (!content) {
					throw new Error('Content is required for text blocks');
				}
				body.content = content;
			}

			if (title) body.title = title;
			if (description) body.description = description;

			const response = await fetch('/api/arena/blocks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || result.error || 'Failed to create block');
			}

			success = `Block created successfully! View on Are.na: ${result.block.url}`;
			if (onSuccess) {
				onSuccess(result.block.id);
			}

			// Reset form after short delay
			setTimeout(() => {
				closeModal();
			}, 2000);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error occurred';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<!-- Trigger Button -->
<button class="contribute-btn" onclick={openModal}> + Contribute Reference </button>

<!-- Modal -->
{#if isOpen}
	<div class="modal-overlay" onclick={closeModal}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2 class="modal-title">Contribute to Are.na</h2>
				<button class="close-btn" onclick={closeModal} aria-label="Close">×</button>
			</div>

			<form onsubmit={handleSubmit} class="contribute-form">
				<!-- Channel Selection -->
				<div class="form-group">
					<label for="channel" class="form-label">Channel</label>
					<select id="channel" bind:value={channel} class="form-select">
						{#each channels as ch}
							<option value={ch.value}>{ch.label}</option>
						{/each}
					</select>
					<p class="form-hint">
						{channels.find((c) => c.value === channel)?.desc}
					</p>
				</div>

				<!-- Content Type Selection -->
				<div class="form-group">
					<label class="form-label">Block Type</label>
					<div class="radio-group">
						<label class="radio-label">
							<input type="radio" bind:group={contentType} value="source" />
							<span>Image / Link (URL)</span>
						</label>
						<label class="radio-label">
							<input type="radio" bind:group={contentType} value="content" />
							<span>Text (Markdown)</span>
						</label>
					</div>
				</div>

				<!-- Source URL -->
				{#if contentType === 'source'}
					<div class="form-group">
						<label for="source" class="form-label">URL</label>
						<input
							id="source"
							type="url"
							bind:value={source}
							placeholder="https://example.com/image.jpg"
							required
							class="form-input"
						/>
						<p class="form-hint">Direct link to an image or web page</p>
					</div>
				{/if}

				<!-- Text Content -->
				{#if contentType === 'content'}
					<div class="form-group">
						<label for="content" class="form-label">Content</label>
						<textarea
							id="content"
							bind:value={content}
							placeholder="Your text content (supports markdown)"
							required
							rows="4"
							class="form-textarea"
						></textarea>
						<p class="form-hint">GitHub Flavored Markdown supported</p>
					</div>
				{/if}

				<!-- Optional Title -->
				<div class="form-group">
					<label for="title" class="form-label">Title (optional)</label>
					<input id="title" type="text" bind:value={title} placeholder="Block title" class="form-input" />
				</div>

				<!-- Optional Description -->
				<div class="form-group">
					<label for="description" class="form-label">Description (optional)</label>
					<textarea
						id="description"
						bind:value={description}
						placeholder="Additional context or notes (markdown)"
						rows="2"
						class="form-textarea"
					></textarea>
				</div>

				<!-- Error Message -->
				{#if error}
					<div class="error-message">{error}</div>
				{/if}

				<!-- Success Message -->
				{#if success}
					<div class="success-message">{success}</div>
				{/if}

				<!-- Submit Button -->
				<div class="form-actions">
					<button type="button" onclick={closeModal} class="btn-secondary" disabled={isSubmitting}>
						Cancel
					</button>
					<button type="submit" class="btn-primary" disabled={isSubmitting}>
						{isSubmitting ? 'Creating...' : 'Create Block'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	/* Trigger Button */
	.contribute-btn {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		padding: var(--space-xs) var(--space-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.contribute-btn:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	/* Modal Overlay */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: var(--color-overlay);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: var(--space-md);
	}

	.modal-content {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		max-width: 600px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
	}

	/* Modal Header */
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.modal-title {
		font-size: var(--text-h3);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.close-btn {
		font-size: 2rem;
		line-height: 1;
		color: var(--color-fg-tertiary);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.close-btn:hover {
		color: var(--color-fg-primary);
	}

	/* Form */
	.contribute-form {
		padding: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.form-label {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
	}

	.form-input,
	.form-select,
	.form-textarea {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		padding: var(--space-xs) var(--space-sm);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.form-input:focus,
	.form-select:focus,
	.form-textarea:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.form-textarea {
		resize: vertical;
		font-family: inherit;
	}

	.form-hint {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Radio Group */
	.radio-group {
		display: flex;
		gap: var(--space-md);
	}

	.radio-label {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		cursor: pointer;
	}

	.radio-label input[type='radio'] {
		accent-color: var(--color-fg-primary);
	}

	/* Messages */
	.error-message {
		font-size: var(--text-body-sm);
		color: var(--color-error);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		padding: var(--space-sm);
	}

	.success-message {
		font-size: var(--text-body-sm);
		color: var(--color-success);
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		padding: var(--space-sm);
	}

	/* Action Buttons */
	.form-actions {
		display: flex;
		gap: var(--space-sm);
		justify-content: flex-end;
	}

	.btn-secondary,
	.btn-primary {
		font-size: var(--text-body-sm);
		font-weight: 500;
		padding: var(--space-xs) var(--space-md);
		border: 1px solid var(--color-border-default);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-secondary {
		color: var(--color-fg-secondary);
		background: var(--color-bg-surface);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--color-hover);
	}

	.btn-primary {
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
		border-color: var(--color-border-emphasis);
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-hover);
	}

	.btn-secondary:disabled,
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
