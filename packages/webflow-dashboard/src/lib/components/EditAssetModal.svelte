<script lang="ts">
	import { Button, Card, CardHeader, CardTitle, CardContent, Input, Label, Textarea } from './ui';
	import ImageUploader from './ImageUploader.svelte';
	import CarouselUploader from './CarouselUploader.svelte';
	import SecondaryThumbnailUploader from './SecondaryThumbnailUploader.svelte';
	import type { Asset } from '$lib/server/airtable';
	import { toast } from '$lib/stores/toast';

	interface Props {
		asset: Asset;
		onClose: () => void;
		onSave: (data: AssetUpdateData) => Promise<void>;
		onArchive?: () => Promise<void>;
	}

	interface AssetUpdateData {
		name?: string;
		descriptionShort?: string;
		descriptionLongHtml?: string;
		websiteUrl?: string;
		previewUrl?: string;
		thumbnailUrl?: string | null;
		secondaryThumbnailUrl?: string | null;
		secondaryThumbnails?: string[];
		carouselImages?: string[];
	}

	let { asset, onClose, onSave, onArchive }: Props = $props();

	// Form state
	let formData = $state({
		name: asset.name,
		descriptionShort: asset.descriptionShort || '',
		descriptionLongHtml: asset.descriptionLongHtml || asset.description || '',
		websiteUrl: asset.websiteUrl || '',
		previewUrl: asset.previewUrl || ''
	});

	// Keep form state in sync when editing a different asset without remounting the component
	let lastAssetId = $state(asset.id);
	$effect(() => {
		if (asset.id !== lastAssetId) {
			lastAssetId = asset.id;

			formData = {
				name: asset.name,
				descriptionShort: asset.descriptionShort || '',
				descriptionLongHtml: asset.descriptionLongHtml || asset.description || '',
				websiteUrl: asset.websiteUrl || '',
				previewUrl: asset.previewUrl || ''
			};

			thumbnailUrl = asset.thumbnailUrl || null;
			secondaryThumbnailUrl = asset.secondaryThumbnailUrl || null;
			secondaryThumbnails = asset.secondaryThumbnails || (asset.secondaryThumbnailUrl ? [asset.secondaryThumbnailUrl] : []);
			carouselImages = asset.carouselImages || [];

			error = null;
			nameError = null;
			isCheckingName = false;
		}
	});

	// Image state
	let thumbnailUrl = $state<string | null>(asset.thumbnailUrl || null);
	let secondaryThumbnailUrl = $state<string | null>(asset.secondaryThumbnailUrl || null);
	let secondaryThumbnails = $state<string[]>(
		asset.secondaryThumbnails || (asset.secondaryThumbnailUrl ? [asset.secondaryThumbnailUrl] : [])
	);
	let carouselImages = $state<string[]>(asset.carouselImages || []);

	// UI state
	let isLoading = $state(false);
	let isArchiving = $state(false);
	let error = $state<string | null>(null);
	let nameError = $state<string | null>(null);
	let isCheckingName = $state(false);
	let nameCheckTimeout: ReturnType<typeof setTimeout> | null = null;

	let modalRef: HTMLDivElement | undefined = $state();

	// Original name for comparison
	const originalName = asset.name;

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

	// Debounced name uniqueness check
	async function checkNameUniqueness(name: string) {
		if (name === originalName) {
			nameError = null;
			return;
		}

		if (!name.trim()) {
			nameError = 'Name is required';
			return;
		}

		isCheckingName = true;
		try {
			const response = await fetch('/api/assets/check-name', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: name.trim(), excludeId: asset.id })
			});

			if (!response.ok) {
				throw new Error('Failed to check name');
			}

			const data = (await response.json()) as { available: boolean };
			if (!data.available) {
				nameError = 'An asset with this name already exists';
			} else {
				nameError = null;
			}
		} catch {
			// Don't block on check failure, validation will happen server-side
			nameError = null;
		} finally {
			isCheckingName = false;
		}
	}

	function handleNameChange(event: Event) {
		const target = event.target as HTMLInputElement;
		formData.name = target.value;

		// Clear any pending check
		if (nameCheckTimeout) {
			clearTimeout(nameCheckTimeout);
		}

		// Debounce the check
		nameCheckTimeout = setTimeout(() => {
			checkNameUniqueness(target.value);
		}, 500);
	}

	function handleThumbnailChange(url: string | null) {
		thumbnailUrl = url;
	}

	function handleSecondaryThumbnailsChange(urls: string[]) {
		secondaryThumbnails = urls;
	}

	function handleCarouselImagesChange(urls: string[]) {
		carouselImages = urls;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;

		// Validate name
		if (!formData.name.trim()) {
			error = 'Name is required';
			return;
		}

		if (nameError) {
			error = nameError;
			return;
		}

		isLoading = true;

		try {
			// Create version snapshot before saving changes
			const changedFields: string[] = [];
			if (formData.name !== asset.name) changedFields.push('name');
			if (formData.descriptionShort !== (asset.descriptionShort || '')) changedFields.push('short description');
			if (formData.descriptionLongHtml !== (asset.descriptionLongHtml || asset.description || '')) changedFields.push('long description');
			if (formData.websiteUrl !== (asset.websiteUrl || '')) changedFields.push('website URL');
			if (formData.previewUrl !== (asset.previewUrl || '')) changedFields.push('preview URL');
			if (thumbnailUrl !== asset.thumbnailUrl) changedFields.push('thumbnail');
			if (JSON.stringify(secondaryThumbnails) !== JSON.stringify(asset.secondaryThumbnails || [])) changedFields.push('secondary thumbnails');
			if (JSON.stringify(carouselImages) !== JSON.stringify(asset.carouselImages || [])) changedFields.push('carousel images');

			if (changedFields.length > 0) {
				// Create version before saving
				const changesDescription = `Updated ${changedFields.join(', ')}`;
				await fetch(`/api/assets/${asset.id}/versions`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ changes: changesDescription })
				});
			}

			await onSave({
				name: formData.name.trim(),
				descriptionShort: formData.descriptionShort,
				descriptionLongHtml: formData.descriptionLongHtml,
				websiteUrl: formData.websiteUrl,
				previewUrl: formData.previewUrl,
				thumbnailUrl,
				secondaryThumbnailUrl: secondaryThumbnails[0] || null, // Backward compatibility
				secondaryThumbnails,
				carouselImages
			});
			toast.success('Asset updated successfully');
			onClose();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to save changes';
			error = message;
			toast.error(message);
		} finally {
			isLoading = false;
		}
	}

	async function handleArchive() {
		if (!onArchive || isArchiving) return;

		// Confirm before archiving
		if (!confirm('Are you sure you want to archive this asset? This action cannot be undone.')) {
			return;
		}

		isArchiving = true;
		error = null;

		try {
			await onArchive();
			toast.success('Asset archived successfully');
			onClose();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to archive asset';
			error = message;
			toast.error(message);
		} finally {
			isArchiving = false;
		}
	}

	$effect(() => {
		document.addEventListener('keydown', handleEscape);
		return () => {
			document.removeEventListener('keydown', handleEscape);
			if (nameCheckTimeout) {
				clearTimeout(nameCheckTimeout);
			}
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
				<p class="modal-description">Update your asset information and media.</p>
			</CardHeader>
			<CardContent>
				<form onsubmit={handleSubmit} class="form">
					{#if error}
						<div class="error-message">
							{error}
						</div>
					{/if}

					<!-- Text Fields -->
					<div class="form-section">
						<h3 class="section-title">Basic Information</h3>
						<div class="form-field">
							<Label for="name">Name *</Label>
							<Input
								id="name"
								type="text"
								value={formData.name}
								oninput={handleNameChange}
								placeholder="Asset name"
								required
							/>
							{#if isCheckingName}
								<span class="field-hint checking">Checking availability...</span>
							{:else if nameError}
								<span class="field-hint error">{nameError}</span>
							{:else if formData.name !== originalName && formData.name.trim()}
								<span class="field-hint success">Name is available</span>
							{/if}
						</div>

						<div class="form-field">
							<Label for="descriptionShort">Short Description</Label>
							<Input
								id="descriptionShort"
								type="text"
								bind:value={formData.descriptionShort}
								placeholder="Brief description (appears in search results)"
							/>
						</div>

						<div class="form-field">
							<Label for="descriptionLongHtml">Long Description</Label>
							<Textarea
								id="descriptionLongHtml"
								bind:value={formData.descriptionLongHtml}
								placeholder="Detailed description"
								rows={4}
							/>
						</div>

						<div class="form-row">
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
						</div>
					</div>

					<!-- Image Fields -->
					<div class="form-section">
						<h3 class="section-title">Images</h3>
						<div class="image-field">
							<ImageUploader
								value={thumbnailUrl}
								onchange={handleThumbnailChange}
								label="Primary Thumbnail"
								description="Main thumbnail for your asset"
								aspectRatio={{ width: 7, height: 9 }}
							/>
						</div>

						<div class="carousel-field">
							<CarouselUploader
								value={carouselImages}
								onchange={handleCarouselImagesChange}
								minImages={3}
								maxImages={8}
								aspectRatio={{ width: 16, height: 10 }}
								disabled={isLoading}
							/>
						</div>

						<div class="secondary-field">
							<SecondaryThumbnailUploader
								value={secondaryThumbnails}
								onchange={handleSecondaryThumbnailsChange}
								maxImages={2}
								disabled={isLoading}
							/>
						</div>
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
							{isArchiving ? 'Archiving...' : 'Archive Asset'}
						</Button>
					{/if}
				</div>
				<div class="footer-right">
					<Button variant="secondary" onclick={onClose} disabled={isLoading}>
						Cancel
					</Button>
					<Button
						variant="default"
						onclick={handleSubmit}
						disabled={isLoading || !!nameError || isCheckingName}
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
		max-width: 56rem;
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
		gap: var(--space-lg);
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.section-title {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
	}

	@media (max-width: 640px) {
		.form-row {
			grid-template-columns: 1fr;
		}
	}

	.field-hint {
		font-size: var(--text-caption);
	}

	.field-hint.checking {
		color: var(--color-fg-muted);
	}

	.field-hint.error {
		color: var(--color-error);
	}

	.field-hint.success {
		color: var(--color-success);
	}

	.error-message {
		padding: var(--space-sm);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
		color: var(--color-error);
		font-size: var(--text-body-sm);
	}

	.image-field,
	.carousel-field,
	.secondary-field {
		/* Field containers */
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
