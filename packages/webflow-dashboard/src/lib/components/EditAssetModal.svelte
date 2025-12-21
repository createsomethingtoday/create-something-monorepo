<script lang="ts">
	import { Button, Card, CardHeader, CardTitle, CardContent, Input, Label, Textarea } from './ui';
	import type { Asset } from '$lib/server/airtable';

	interface Props {
		asset: Asset;
		onClose: () => void;
		onSave: (data: Partial<Asset>) => Promise<void>;
		onArchive?: () => Promise<void>;
	}

	let { asset, onClose, onSave, onArchive }: Props = $props();

	let formData = $state({
		name: asset.name,
		description: asset.description || '',
		descriptionShort: asset.descriptionShort || '',
		websiteUrl: asset.websiteUrl || '',
		previewUrl: asset.previewUrl || ''
	});

	let isLoading = $state(false);
	let isArchiving = $state(false);
	let error = $state<string | null>(null);

	let modalRef: HTMLDivElement | undefined = $state();

	// Can archive if not already delisted
	const canArchive = !asset.status.includes('Delisted');

	function handleClickOutside(event: MouseEvent) {
		if (modalRef && !modalRef.contains(event.target as Node)) {
			onClose();
		}
	}

	function handleEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;
		isLoading = true;

		try {
			await onSave({
				name: formData.name,
				description: formData.description,
				descriptionShort: formData.descriptionShort,
				websiteUrl: formData.websiteUrl,
				previewUrl: formData.previewUrl
			});
			onClose();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save changes';
		} finally {
			isLoading = false;
		}
	}

	async function handleArchive() {
		if (!onArchive || isArchiving) return;
		isArchiving = true;
		error = null;

		try {
			await onArchive();
			onClose();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to archive asset';
		} finally {
			isArchiving = false;
		}
	}

	$effect(() => {
		document.addEventListener('keydown', handleEscape);
		return () => {
			document.removeEventListener('keydown', handleEscape);
		};
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-overlay" onclick={handleClickOutside}>
	<div class="modal-container" bind:this={modalRef}>
		<Card class="modal-card">
			<CardHeader>
				<CardTitle>Edit Asset</CardTitle>
				<p class="modal-description">Update your asset information.</p>
			</CardHeader>
			<CardContent>
				<form onsubmit={handleSubmit} class="form">
					{#if error}
						<div class="error-message">
							{error}
						</div>
					{/if}

					<div class="form-field">
						<Label for="name">Name</Label>
						<Input
							id="name"
							type="text"
							bind:value={formData.name}
							placeholder="Asset name"
							required
						/>
					</div>

					<div class="form-field">
						<Label for="descriptionShort">Short Description</Label>
						<Input
							id="descriptionShort"
							type="text"
							bind:value={formData.descriptionShort}
							placeholder="Brief description"
						/>
					</div>

					<div class="form-field">
						<Label for="description">Description</Label>
						<Textarea
							id="description"
							bind:value={formData.description}
							placeholder="Detailed description"
							rows={4}
						/>
					</div>

					<div class="form-field">
						<Label for="websiteUrl">Website URL</Label>
						<Input
							id="websiteUrl"
							type="url"
							bind:value={formData.websiteUrl}
							placeholder="https://example.com"
						/>
					</div>

					<div class="form-field">
						<Label for="previewUrl">Preview URL</Label>
						<Input
							id="previewUrl"
							type="url"
							bind:value={formData.previewUrl}
							placeholder="https://preview.example.com"
						/>
					</div>
				</form>
			</CardContent>
			<div class="modal-footer">
				<div class="footer-left">
					{#if canArchive && onArchive}
						<Button
							variant="destructive"
							onclick={handleArchive}
							disabled={isArchiving}
						>
							{isArchiving ? 'Archiving...' : 'Archive'}
						</Button>
					{/if}
				</div>
				<div class="footer-right">
					<Button variant="secondary" onclick={onClose}>
						Cancel
					</Button>
					<Button
						variant="default"
						onclick={handleSubmit}
						disabled={isLoading}
					>
						{isLoading ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</div>
		</Card>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: var(--color-overlay);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: var(--space-md);
	}

	.modal-container {
		width: 100%;
		max-width: 40rem;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-card {
		/* Card styles from ui */
	}

	.modal-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: var(--space-xs) 0 0;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.error-message {
		padding: var(--space-sm);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
		color: var(--color-error);
		font-size: var(--text-body-sm);
	}

	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.footer-left,
	.footer-right {
		display: flex;
		gap: var(--space-sm);
	}
</style>
