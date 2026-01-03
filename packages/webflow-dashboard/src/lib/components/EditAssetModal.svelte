<script lang="ts">
	import { Button, Card, CardHeader, CardTitle, CardContent, Input, Label, Textarea } from './ui';
	import ImageUploader from './ImageUploader.svelte';
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
		description?: string;
		descriptionShort?: string;
		websiteUrl?: string;
		previewUrl?: string;
		thumbnailUrl?: string | null;
		secondaryThumbnailUrl?: string | null;
		carouselImages?: string[];
	}

	let { asset, onClose, onSave, onArchive }: Props = $props();

	// Form state
	let formData = $state({
		name: asset.name,
		description: asset.description || '',
		descriptionShort: asset.descriptionShort || '',
		websiteUrl: asset.websiteUrl || '',
		previewUrl: asset.previewUrl || ''
	});

	// Image state
	let thumbnailUrl = $state<string | null>(asset.thumbnailUrl || null);
	let secondaryThumbnailUrl = $state<string | null>(asset.secondaryThumbnailUrl || null);
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

	function handleSecondaryThumbnailChange(url: string | null) {
		secondaryThumbnailUrl = url;
	}

	function handleCarouselImageAdd(url: string | null) {
		if (url && carouselImages.length < 5) {
			carouselImages = [...carouselImages, url];
		}
	}

	function handleCarouselImageRemove(index: number) {
		carouselImages = carouselImages.filter((_, i) => i !== index);
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
			await onSave({
				name: formData.name.trim(),
				description: formData.description,
				descriptionShort: formData.descriptionShort,
				websiteUrl: formData.websiteUrl,
				previewUrl: formData.previewUrl,
				thumbnailUrl,
				secondaryThumbnailUrl,
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
							<Label for="description">Description</Label>
							<Textarea
								id="description"
								bind:value={formData.description}
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
						<div class="image-grid">
							<div class="image-field">
								<ImageUploader
									value={thumbnailUrl}
									onchange={handleThumbnailChange}
									label="Primary Thumbnail"
									description="7:9 aspect ratio recommended"
									aspectRatio={{ width: 7, height: 9 }}
								/>
							</div>

							<div class="image-field">
								<ImageUploader
									value={secondaryThumbnailUrl}
									onchange={handleSecondaryThumbnailChange}
									label="Secondary Thumbnail"
									description="16:10 aspect ratio recommended"
									aspectRatio={{ width: 16, height: 10 }}
								/>
							</div>
						</div>

						<div class="carousel-section">
							<Label>Carousel Images (max 5)</Label>
							<p class="carousel-hint">
								{carouselImages.length}/5 images uploaded. 16:10 aspect ratio recommended.
							</p>
							<div class="carousel-grid">
								{#each carouselImages as image, index}
									<div class="carousel-item">
										<img src={image} alt="Carousel {index + 1}" class="carousel-preview" />
										<button
											type="button"
											class="carousel-remove"
											aria-label="Remove carousel image {index + 1}"
											onclick={() => handleCarouselImageRemove(index)}
										>
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path d="M18 6L6 18M6 6l12 12" />
											</svg>
										</button>
									</div>
								{/each}
								{#if carouselImages.length < 5}
									<div class="carousel-add">
										<ImageUploader
											value={null}
											onchange={handleCarouselImageAdd}
											label=""
											description="Add image"
											aspectRatio={{ width: 16, height: 10 }}
										/>
									</div>
								{/if}
							</div>
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

	.image-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
	}

	@media (max-width: 640px) {
		.image-grid {
			grid-template-columns: 1fr;
		}
	}

	.image-field {
		/* Image uploader container */
	}

	.carousel-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.carousel-hint {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.carousel-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: var(--space-sm);
	}

	.carousel-item {
		position: relative;
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 1px solid var(--color-border-default);
	}

	.carousel-preview {
		width: 100%;
		aspect-ratio: 16/10;
		object-fit: cover;
		display: block;
	}

	.carousel-remove {
		position: absolute;
		top: var(--space-xs);
		right: var(--space-xs);
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.carousel-remove:hover {
		background: var(--color-error-muted);
		border-color: var(--color-error-border);
		color: var(--color-error);
	}

	.carousel-add {
		min-height: 80px;
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
