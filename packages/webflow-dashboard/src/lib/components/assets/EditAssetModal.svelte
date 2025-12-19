<script lang="ts">
	import type { Asset } from '$lib/types';

	interface Props {
		asset: Asset;
		open: boolean;
		onclose: () => void;
		onsave: (asset: Asset) => void;
	}

	let { asset, open, onclose, onsave }: Props = $props();

	let name = $state(asset.name);
	let description = $state(asset.description || '');
	let descriptionShort = $state(asset.descriptionShort || '');
	let websiteUrl = $state(asset.websiteUrl || '');
	let previewUrl = $state(asset.previewUrl || '');

	let saving = $state(false);
	let errorMessage = $state('');
	let nameError = $state('');

	// Reset form when asset changes
	$effect(() => {
		name = asset.name;
		description = asset.description || '';
		descriptionShort = asset.descriptionShort || '';
		websiteUrl = asset.websiteUrl || '';
		previewUrl = asset.previewUrl || '';
		errorMessage = '';
		nameError = '';
	});

	// Debounced name uniqueness check
	let nameCheckTimeout: ReturnType<typeof setTimeout> | null = null;

	async function checkNameUniqueness(newName: string) {
		if (nameCheckTimeout) {
			clearTimeout(nameCheckTimeout);
		}

		if (!newName.trim() || newName.trim() === asset.name) {
			nameError = '';
			return;
		}

		nameCheckTimeout = setTimeout(async () => {
			try {
				const response = await fetch(
					`/api/asset/checkName?name=${encodeURIComponent(newName)}&excludeId=${asset.id}`
				);
				const data = await response.json();
				if (!data.unique) {
					nameError = 'An asset with this name already exists';
				} else {
					nameError = '';
				}
			} catch {
				// Silently fail - server will validate on save
			}
		}, 300);
	}

	function handleNameInput(event: Event) {
		const target = event.target as HTMLInputElement;
		name = target.value;
		checkNameUniqueness(target.value);
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		errorMessage = '';

		try {
			const response = await fetch(`/api/asset/update/${asset.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					description,
					descriptionShort,
					websiteUrl: websiteUrl || undefined,
					previewUrl: previewUrl || undefined
				})
			});

			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Failed to update asset';
				return;
			}

			onsave(data.asset);
		} catch {
			errorMessage = 'Network error. Please try again.';
		} finally {
			saving = false;
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onclose();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onclose();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<div class="modal-content">
			<header class="modal-header">
				<h2 id="modal-title" class="modal-title">Edit Asset</h2>
				<button type="button" class="close-button" onclick={onclose} aria-label="Close">
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
						<path
							d="M15 5L5 15M5 5L15 15"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			</header>

			<form onsubmit={handleSubmit}>
				<div class="form-body">
					<div class="form-group">
						<label for="name" class="form-label">Name</label>
						<input
							type="text"
							id="name"
							class="form-input"
							class:has-error={nameError}
							value={name}
							oninput={handleNameInput}
							required
							maxlength="100"
							disabled={saving}
						/>
						{#if nameError}
							<span class="field-error">{nameError}</span>
						{/if}
					</div>

					<div class="form-group">
						<label for="descriptionShort" class="form-label">Short Description</label>
						<input
							type="text"
							id="descriptionShort"
							class="form-input"
							bind:value={descriptionShort}
							maxlength="500"
							placeholder="Brief summary of your template"
							disabled={saving}
						/>
						<span class="field-hint">{descriptionShort.length}/500 characters</span>
					</div>

					<div class="form-group">
						<label for="description" class="form-label">Full Description</label>
						<textarea
							id="description"
							class="form-textarea"
							bind:value={description}
							rows="5"
							placeholder="Detailed description of your template"
							disabled={saving}
						></textarea>
					</div>

					<div class="form-group">
						<label for="websiteUrl" class="form-label">Website URL</label>
						<input
							type="url"
							id="websiteUrl"
							class="form-input"
							bind:value={websiteUrl}
							placeholder="https://example.com"
							disabled={saving}
						/>
					</div>

					<div class="form-group">
						<label for="previewUrl" class="form-label">Preview URL</label>
						<input
							type="url"
							id="previewUrl"
							class="form-input"
							bind:value={previewUrl}
							placeholder="https://preview.example.com"
							disabled={saving}
						/>
					</div>

					{#if errorMessage}
						<div class="error-message">{errorMessage}</div>
					{/if}
				</div>

				<footer class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={onclose} disabled={saving}>
						Cancel
					</button>
					<button
						type="submit"
						class="btn btn-primary"
						disabled={saving || !!nameError || !name.trim()}
					>
						{#if saving}
							Saving...
						{:else}
							Save Changes
						{/if}
					</button>
				</footer>
			</form>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal-content {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		width: 100%;
		max-width: 560px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--color-border-default);
	}

	.modal-title {
		font-size: var(--text-h4);
		font-weight: var(--font-semibold);
		margin: 0;
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: none;
		border: none;
		color: var(--color-fg-muted);
		cursor: pointer;
		border-radius: var(--radius-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.close-button:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.form-body {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
	}

	.form-input,
	.form-textarea {
		width: 100%;
		padding: 0.625rem 0.875rem;
		font-size: var(--text-body);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.form-input:focus,
	.form-textarea:focus {
		outline: none;
		border-color: var(--webflow-blue);
	}

	.form-input:disabled,
	.form-textarea:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.form-input.has-error {
		border-color: var(--color-error);
	}

	.form-input::placeholder,
	.form-textarea::placeholder {
		color: var(--color-fg-muted);
	}

	.form-textarea {
		resize: vertical;
		min-height: 100px;
	}

	.field-error {
		font-size: var(--text-body-sm);
		color: var(--color-error);
	}

	.field-hint {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.error-message {
		padding: 0.75rem 1rem;
		font-size: var(--text-body-sm);
		color: var(--color-error);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--color-border-default);
	}

	.btn {
		padding: 0.625rem 1rem;
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--color-active);
	}

	.btn-primary {
		background: var(--webflow-blue);
		color: #ffffff;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--webflow-blue-dark);
	}
</style>
