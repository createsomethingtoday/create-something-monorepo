<script lang="ts">
	import { Button } from './ui';
	import { toast } from '$lib/stores/toast';
	import {
		validateWebP,
		validateFileSize,
		validateMimeType,
		getImageDimensions
	} from '$lib/utils/upload-validation';

	interface Props {
		value?: string[];
		onchange?: (urls: string[]) => void;
		minImages?: number;
		maxImages?: number;
		disabled?: boolean;
		aspectRatio?: { width: number; height: number } | null;
	}

	interface UploadItem {
		file: File;
		status: 'pending' | 'uploading' | 'complete' | 'error';
		progress: number;
		url?: string;
		error?: string;
	}

	let {
		value = [],
		onchange,
		minImages = 3,
		maxImages = 8,
		disabled = false,
		aspectRatio = null
	}: Props = $props();

	let uploadQueue = $state<UploadItem[]>([]);
	let isDragOver = $state(false);
	let fileInput: HTMLInputElement;

	/**
	 * Validate file on the client side before uploading.
	 */
	async function validateFile(file: File): Promise<string | null> {
		// Validate file type
		if (!validateMimeType(file.type)) {
			return 'Invalid file type. Only WebP images are accepted';
		}

		// Validate file size (10MB)
		if (!validateFileSize(file.size, 10 * 1024 * 1024)) {
			return 'File too large. Maximum size is 10MB';
		}

		// Deep WebP validation - check magic bytes
		try {
			const buffer = await file.arrayBuffer();
			if (!validateWebP(buffer)) {
				return 'Invalid WebP file format';
			}
		} catch {
			return 'Failed to read file';
		}

		// Get image dimensions for aspect ratio validation if needed
		if (aspectRatio) {
			const dimensions = await getImageDimensions(file);
			if (!dimensions) {
				return 'Failed to read image dimensions';
			}

			const actualRatio = dimensions.width / dimensions.height;
			const expectedRatio = aspectRatio.width / aspectRatio.height;
			const tolerance = 0.02; // 2% tolerance

			if (Math.abs(actualRatio - expectedRatio) > tolerance) {
				return `Invalid aspect ratio. Expected ${aspectRatio.width}:${aspectRatio.height}`;
			}
		}

		return null;
	}

	/**
	 * Upload a single file with progress tracking
	 */
	async function uploadSingleImage(item: UploadItem): Promise<void> {
		item.status = 'uploading';

		// Client-side validation
		const validationError = await validateFile(item.file);
		if (validationError) {
			item.status = 'error';
			item.error = validationError;
			return;
		}

		try {
			// Get dimensions for server-side validation
			const dimensions = await getImageDimensions(item.file);

			const formData = new FormData();
			formData.append('file', item.file);
			formData.append('type', 'carousel');

			if (dimensions) {
				formData.append('width', dimensions.width.toString());
				formData.append('height', dimensions.height.toString());
			}

			// Simulate progress for better UX
			const progressInterval = setInterval(() => {
				if (item.progress < 90) {
					item.progress += 10;
				}
			}, 100);

			const response = await fetch('/api/upload', {
				method: 'POST',
				body: formData
			});

			clearInterval(progressInterval);

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({}))) as { message?: string };
				throw new Error(errorData.message || 'Upload failed');
			}

			const data = (await response.json()) as { url: string; key: string; size: number };
			item.progress = 100;
			item.status = 'complete';
			item.url = data.url;

			// Add to value array
			onchange?.([...value, data.url]);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Upload failed';
			item.status = 'error';
			item.error = message;
		}
	}

	/**
	 * Process upload queue in parallel batches
	 */
	async function processUploadQueue(): Promise<void> {
		const concurrent = 3;
		const pendingItems = uploadQueue.filter((i) => i.status === 'pending');

		// Process in chunks of 3
		for (let i = 0; i < pendingItems.length; i += concurrent) {
			const chunk = pendingItems.slice(i, i + concurrent);
			await Promise.all(chunk.map((item) => uploadSingleImage(item)));
		}

		// Remove completed items after a delay
		setTimeout(() => {
			uploadQueue = uploadQueue.filter((i) => i.status !== 'complete');
		}, 1000);
	}

	/**
	 * Handle multiple files selection
	 */
	async function handleMultipleFiles(files: File[]): Promise<void> {
		// Validate count
		if (value.length + files.length > maxImages) {
			toast.error(`Maximum ${maxImages} images allowed`);
			return;
		}

		// Add to queue
		const newItems: UploadItem[] = files.map((file) => ({
			file,
			status: 'pending',
			progress: 0,
			error: undefined
		}));

		uploadQueue = [...uploadQueue, ...newItems];

		// Process queue
		await processUploadQueue();
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = Array.from(input.files || []);
		if (files.length > 0) {
			handleMultipleFiles(files);
		}
		// Reset input so same files can be selected again
		input.value = '';
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (!disabled && value.length < maxImages) {
			isDragOver = true;
		}
	}

	function handleDragLeave() {
		isDragOver = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;

		if (disabled || value.length >= maxImages) return;

		const files = Array.from(event.dataTransfer?.files || []);
		if (files.length > 0) {
			handleMultipleFiles(files);
		}
	}

	function handleRemove(index: number) {
		const newUrls = value.filter((_, i) => i !== index);
		onchange?.(newUrls);
		toast.info('Image removed');
	}

	function handleClick() {
		if (!disabled && value.length < maxImages && uploadQueue.length === 0) {
			fileInput?.click();
		}
	}
</script>

<div class="carousel-uploader">
	<label class="uploader-label">
		Carousel Images
		{#if minImages > 0}
			<span class="label-hint">({value.length}/{maxImages} uploaded, min {minImages})</span>
		{:else}
			<span class="label-hint">({value.length}/{maxImages} uploaded)</span>
		{/if}
	</label>

	{#if uploadQueue.length > 0}
		<div class="upload-queue">
			{#each uploadQueue as item}
				<div class="upload-item" class:error={item.status === 'error'}>
					<div class="upload-info">
						<span class="upload-filename">{item.file.name}</span>
						{#if item.status === 'uploading'}
							<div class="progress-bar-container">
								<div class="progress-bar" style="width: {item.progress}%"></div>
							</div>
						{:else if item.status === 'error'}
							<span class="upload-error">{item.error}</span>
						{:else if item.status === 'complete'}
							<span class="upload-success">✓ Uploaded</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if value.length > 0}
		<div class="image-grid">
			{#each value as url, index}
				<div class="image-card">
					<img src={url} alt="Carousel {index + 1}" class="image-preview" />
					<button
						type="button"
						class="image-remove"
						aria-label="Remove image {index + 1}"
						onclick={() => handleRemove(index)}
						disabled={disabled}
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M18 6L6 18M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/each}
		</div>
	{/if}

	{#if value.length < maxImages}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="dropzone"
			class:drag-over={isDragOver}
			class:disabled
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			onclick={handleClick}
		>
			<input
				bind:this={fileInput}
				type="file"
				accept="image/webp"
				multiple
				onchange={handleFileSelect}
				disabled={disabled}
				class="file-input"
			/>

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
				{isDragOver ? 'Drop images here' : 'Drag & drop or click to upload'}
			</p>
			<p class="dropzone-hint">
				WebP images only • Max {maxImages} images • 10MB per image
			</p>
		</div>
	{/if}

	{#if value.length < minImages}
		<p class="requirement-hint">
			{minImages - value.length} more image(s) required
		</p>
	{/if}
</div>

<style>
	.carousel-uploader {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.uploader-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.label-hint {
		font-size: var(--text-caption);
		font-weight: var(--font-normal);
		color: var(--color-fg-muted);
	}

	.upload-queue {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.upload-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-sm);
	}

	.upload-item.error {
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
	}

	.upload-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.upload-filename {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.progress-bar-container {
		width: 100%;
		height: 4px;
		background: var(--color-border-default);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		background: var(--color-fg-primary);
		border-radius: var(--radius-full);
		transition: width var(--duration-micro) var(--ease-standard);
	}

	.upload-error {
		font-size: var(--text-caption);
		color: var(--color-error);
	}

	.upload-success {
		font-size: var(--text-caption);
		color: var(--color-success);
	}

	.image-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: var(--space-sm);
	}

	.image-card {
		position: relative;
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-surface);
	}

	.image-preview {
		width: 100%;
		aspect-ratio: 16/10;
		object-fit: cover;
		display: block;
	}

	.image-remove {
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

	.image-remove:hover:not(:disabled) {
		background: var(--color-error-muted);
		border-color: var(--color-error-border);
		color: var(--color-error);
	}

	.image-remove:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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

	.dropzone:hover:not(.disabled) {
		border-color: var(--color-border-emphasis);
		background: var(--color-hover);
	}

	.dropzone.drag-over {
		border-color: var(--color-border-strong);
		background: var(--color-active);
	}

	.dropzone.disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
		text-align: center;
	}

	.requirement-hint {
		font-size: var(--text-body-sm);
		color: var(--color-warning);
		margin: 0;
		text-align: center;
	}
</style>