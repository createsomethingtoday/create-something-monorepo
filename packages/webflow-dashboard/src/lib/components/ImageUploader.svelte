<script lang="ts">
	import { Button } from './ui';

	interface Props {
		value?: string | null;
		onchange?: (url: string | null) => void;
		accept?: string;
		maxSize?: number;
		aspectRatio?: { width: number; height: number } | null;
		label?: string;
		description?: string;
		disabled?: boolean;
	}

	let {
		value = null,
		onchange,
		accept = 'image/webp',
		maxSize = 10 * 1024 * 1024,
		aspectRatio = null,
		label = 'Image',
		description = 'Only WebP images are accepted',
		disabled = false
	}: Props = $props();

	let isDragOver = $state(false);
	let isUploading = $state(false);
	let error = $state<string | null>(null);
	let uploadProgress = $state(0);
	let fileInput: HTMLInputElement;

	async function validateAspectRatio(file: File): Promise<boolean> {
		if (!aspectRatio) return true;

		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => {
				const actualRatio = img.width / img.height;
				const expectedRatio = aspectRatio.width / aspectRatio.height;
				// Allow 5% tolerance
				const tolerance = 0.05;
				const isValid = Math.abs(actualRatio - expectedRatio) / expectedRatio < tolerance;
				URL.revokeObjectURL(img.src);
				resolve(isValid);
			};
			img.onerror = () => {
				URL.revokeObjectURL(img.src);
				resolve(false);
			};
			img.src = URL.createObjectURL(file);
		});
	}

	async function uploadFile(file: File) {
		error = null;

		// Validate file type
		if (!file.type.match(accept.replace('*', '.*'))) {
			error = `Invalid file type. Expected ${accept}`;
			return;
		}

		// Validate file size
		if (file.size > maxSize) {
			error = `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`;
			return;
		}

		// Validate aspect ratio if specified
		if (aspectRatio) {
			const isValidRatio = await validateAspectRatio(file);
			if (!isValidRatio) {
				error = `Invalid aspect ratio. Expected ${aspectRatio.width}:${aspectRatio.height}`;
				return;
			}
		}

		isUploading = true;
		uploadProgress = 0;

		try {
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch('/api/upload', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.message || 'Upload failed');
			}

			const data = await response.json();
			uploadProgress = 100;
			onchange?.(data.url);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			isUploading = false;
		}
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			uploadFile(file);
		}
		// Reset input so same file can be selected again
		input.value = '';
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (!disabled) {
			isDragOver = true;
		}
	}

	function handleDragLeave() {
		isDragOver = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;

		if (disabled) return;

		const file = event.dataTransfer?.files[0];
		if (file) {
			uploadFile(file);
		}
	}

	function handleRemove() {
		onchange?.(null);
		error = null;
	}

	function handleClick() {
		if (!disabled && !isUploading) {
			fileInput?.click();
		}
	}
</script>

<div class="image-uploader">
	<label class="uploader-label">{label}</label>

	{#if value}
		<div class="preview-container">
			<img src={value} alt="Uploaded preview" class="preview-image" />
			<div class="preview-actions">
				<Button variant="ghost" size="sm" onclick={handleRemove} {disabled}>Remove</Button>
			</div>
		</div>
	{:else}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="dropzone"
			class:drag-over={isDragOver}
			class:disabled
			class:uploading={isUploading}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			onclick={handleClick}
		>
			<input
				bind:this={fileInput}
				type="file"
				{accept}
				onchange={handleFileSelect}
				{disabled}
				class="file-input"
			/>

			{#if isUploading}
				<div class="upload-progress">
					<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" stroke-opacity="0.2" />
						<path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round" />
					</svg>
					<span>Uploading...</span>
				</div>
			{:else}
				<svg
					class="upload-icon"
					width="32"
					height="32"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="17 8 12 3 7 8" />
					<line x1="12" y1="3" x2="12" y2="15" />
				</svg>
				<p class="dropzone-text">
					{isDragOver ? 'Drop image here' : 'Drag & drop or click to upload'}
				</p>
				<p class="dropzone-hint">{description}</p>
			{/if}
		</div>
	{/if}

	{#if error}
		<p class="error-message">{error}</p>
	{/if}
</div>

<style>
	.image-uploader {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.uploader-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.dropzone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
		border: 2px dashed var(--color-border-default);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.dropzone:hover:not(.disabled):not(.uploading) {
		border-color: var(--color-border-emphasis);
		background: var(--color-hover);
	}

	.dropzone.drag-over {
		border-color: var(--webflow-blue);
		background: rgba(68, 111, 230, 0.1);
	}

	.dropzone.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.dropzone.uploading {
		cursor: wait;
	}

	.file-input {
		display: none;
	}

	.upload-icon {
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.dropzone-text {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.dropzone-hint {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: var(--space-xs) 0 0;
	}

	.upload-progress {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--color-fg-secondary);
	}

	.spinner {
		width: 24px;
		height: 24px;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.preview-container {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
	}

	.preview-image {
		width: 64px;
		height: 64px;
		object-fit: cover;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
	}

	.preview-actions {
		margin-left: auto;
	}

	.error-message {
		font-size: var(--text-body-sm);
		color: var(--color-error);
		margin: 0;
	}
</style>
