<script lang="ts">
	/**
	 * FileUpload Component
	 *
	 * Drag-and-drop file upload with preview support.
	 * Handles images, documents, and multiple files.
	 *
	 * Canon principle: File upload should feel effortless.
	 *
	 * @example
	 * <FileUpload
	 *   bind:files={uploadedFiles}
	 *   accept="image/*"
	 *   multiple
	 *   maxSize={5 * 1024 * 1024}
	 * />
	 */

	interface UploadedFile {
		file: File;
		preview?: string;
		progress?: number;
		error?: string;
	}

	interface Props {
		/** Uploaded files (bindable) */
		files?: UploadedFile[];
		/** Accepted file types (e.g., "image/*", ".pdf,.doc") */
		accept?: string;
		/** Allow multiple files */
		multiple?: boolean;
		/** Maximum file size in bytes */
		maxSize?: number;
		/** Maximum number of files */
		maxFiles?: number;
		/** Disabled state */
		disabled?: boolean;
		/** Custom label text */
		label?: string;
		/** Helper text */
		hint?: string;
		/** Called when files change */
		onchange?: (files: UploadedFile[]) => void;
		/** Called when a file is rejected */
		onreject?: (file: File, reason: string) => void;
	}

	let {
		files = $bindable([]),
		accept,
		multiple = false,
		maxSize,
		maxFiles,
		disabled = false,
		label = 'Drop files here or click to upload',
		hint,
		onchange,
		onreject
	}: Props = $props();

	let isDragging = $state(false);
	let inputRef: HTMLInputElement | undefined = $state();

	// Format file size for display
	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Check if file type is accepted
	function isAcceptedType(file: File): boolean {
		if (!accept) return true;

		const acceptedTypes = accept.split(',').map((t) => t.trim().toLowerCase());

		for (const type of acceptedTypes) {
			// Wildcard match (e.g., "image/*")
			if (type.endsWith('/*')) {
				const category = type.slice(0, -2);
				if (file.type.startsWith(category + '/')) return true;
			}
			// Extension match (e.g., ".pdf")
			else if (type.startsWith('.')) {
				if (file.name.toLowerCase().endsWith(type)) return true;
			}
			// MIME type match
			else if (file.type.toLowerCase() === type) {
				return true;
			}
		}

		return false;
	}

	// Create preview for image files
	function createPreview(file: File): Promise<string | undefined> {
		return new Promise((resolve) => {
			if (!file.type.startsWith('image/')) {
				resolve(undefined);
				return;
			}

			const reader = new FileReader();
			reader.onload = (e) => resolve(e.target?.result as string);
			reader.onerror = () => resolve(undefined);
			reader.readAsDataURL(file);
		});
	}

	// Process and validate files
	async function processFiles(fileList: FileList | File[]) {
		const newFiles: UploadedFile[] = [];

		for (const file of fileList) {
			// Check file type
			if (!isAcceptedType(file)) {
				onreject?.(file, 'File type not accepted');
				continue;
			}

			// Check file size
			if (maxSize && file.size > maxSize) {
				onreject?.(file, `File exceeds maximum size of ${formatSize(maxSize)}`);
				continue;
			}

			// Check max files
			if (maxFiles && files.length + newFiles.length >= maxFiles) {
				onreject?.(file, `Maximum ${maxFiles} files allowed`);
				continue;
			}

			// Create preview for images
			const preview = await createPreview(file);

			newFiles.push({
				file,
				preview,
				progress: undefined,
				error: undefined
			});

			// Stop if not multiple
			if (!multiple) break;
		}

		if (newFiles.length > 0) {
			if (multiple) {
				files = [...files, ...newFiles];
			} else {
				files = newFiles;
			}
			onchange?.(files);
		}
	}

	// Handle file input change
	function handleInputChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files?.length) {
			processFiles(input.files);
		}
		// Reset input so same file can be selected again
		input.value = '';
	}

	// Handle drag events
	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		if (!disabled) isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;

		if (disabled) return;

		const items = event.dataTransfer?.files;
		if (items?.length) {
			processFiles(items);
		}
	}

	// Remove a file
	function removeFile(index: number) {
		files = files.filter((_, i) => i !== index);
		onchange?.(files);
	}

	// Open file picker
	function openPicker() {
		if (!disabled && inputRef) {
			inputRef.click();
		}
	}

	// Get file icon based on type
	function getFileIcon(file: File): string {
		if (file.type.startsWith('image/')) return '🖼️';
		if (file.type.startsWith('video/')) return '🎬';
		if (file.type.startsWith('audio/')) return '🎵';
		if (file.type.includes('pdf')) return '📄';
		if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) return '📝';
		if (file.type.includes('excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) return '📊';
		return '📎';
	}
</script>

<div class="file-upload" class:disabled>
	<!-- Drop Zone -->
	<div
		class="drop-zone"
		class:dragging={isDragging}
		ondragenter={handleDragEnter}
		ondragleave={handleDragLeave}
		ondragover={handleDragOver}
		ondrop={handleDrop}
		onclick={openPicker}
		onkeydown={(e) => e.key === 'Enter' && openPicker()}
		role="button"
		tabindex={disabled ? -1 : 0}
		aria-label={label}
	>
		<input
			bind:this={inputRef}
			type="file"
			{accept}
			{multiple}
			{disabled}
			onchange={handleInputChange}
			class="file-input"
			aria-hidden="true"
			tabindex="-1"
		/>

		<div class="drop-zone-content">
			<svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
				<polyline points="17 8 12 3 7 8" />
				<line x1="12" y1="3" x2="12" y2="15" />
			</svg>

			<p class="drop-zone-label">{label}</p>

			{#if hint}
				<p class="drop-zone-hint">{hint}</p>
			{:else if accept || maxSize}
				<p class="drop-zone-hint">
					{#if accept}
						{accept.replace(/,/g, ', ')}
					{/if}
					{#if accept && maxSize}
						{' • '}
					{/if}
					{#if maxSize}
						Max {formatSize(maxSize)}
					{/if}
				</p>
			{/if}
		</div>
	</div>

	<!-- File List -->
	{#if files.length > 0}
		<ul class="file-list">
			{#each files as uploadedFile, index}
				<li class="file-item">
					{#if uploadedFile.preview}
						<img src={uploadedFile.preview} alt={uploadedFile.file.name} class="file-preview" />
					{:else}
						<span class="file-icon">{getFileIcon(uploadedFile.file)}</span>
					{/if}

					<div class="file-info">
						<span class="file-name">{uploadedFile.file.name}</span>
						<span class="file-size">{formatSize(uploadedFile.file.size)}</span>
					</div>

					{#if uploadedFile.progress !== undefined && uploadedFile.progress < 100}
						<div class="file-progress">
							<div class="progress-bar" style:width="{uploadedFile.progress}%"></div>
						</div>
					{:else if uploadedFile.error}
						<span class="file-error">{uploadedFile.error}</span>
					{:else}
						<button
							type="button"
							class="file-remove"
							onclick={() => removeFile(index)}
							aria-label="Remove {uploadedFile.file.name}"
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M18 6L6 18M6 6l12 12" />
							</svg>
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.file-upload {
		display: flex;
		flex-direction: column;
		gap: var(--space-md, 1.618rem);
	}

	.file-upload.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.drop-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-xl, 4.236rem) var(--space-lg, 2.618rem);
		background: var(--color-bg-surface, #111);
		border: 2px dashed var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-lg, 12px);
		cursor: pointer;
		transition: all var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.drop-zone:hover {
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
		background: var(--color-bg-subtle, #1a1a1a);
	}

	.drop-zone:focus-visible {
		outline: none;
		border-color: var(--color-border-strong, rgba(255, 255, 255, 0.3));
		box-shadow: 0 0 0 3px var(--color-focus, rgba(255, 255, 255, 0.5));
	}

	.drop-zone.dragging {
		border-color: var(--color-info, #5082b9);
		background: var(--color-info-muted, rgba(80, 130, 185, 0.2));
	}

	.file-input {
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

	.drop-zone-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm, 1rem);
		text-align: center;
	}

	.upload-icon {
		width: 48px;
		height: 48px;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.drop-zone-label {
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-primary, #fff);
		margin: 0;
	}

	.drop-zone-hint {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		margin: 0;
	}

	/* File List */
	.file-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs, 0.5rem);
	}

	.file-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm, 1rem);
		padding: var(--space-sm, 1rem);
		background: var(--color-bg-surface, #111);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-md, 8px);
	}

	.file-preview {
		width: 40px;
		height: 40px;
		object-fit: cover;
		border-radius: var(--radius-sm, 6px);
		flex-shrink: 0;
	}

	.file-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 24px;
		flex-shrink: 0;
	}

	.file-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.file-name {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-primary, #fff);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.file-size {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.file-progress {
		width: 60px;
		height: 4px;
		background: var(--color-bg-subtle, #1a1a1a);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		background: var(--color-info, #5082b9);
		transition: width var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.file-error {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-error, #d44d4d);
	}

	.file-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: transparent;
		border: none;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		cursor: pointer;
		border-radius: var(--radius-sm, 6px);
		flex-shrink: 0;
		transition: all var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.file-remove:hover {
		background: var(--color-error-muted, rgba(212, 77, 77, 0.2));
		color: var(--color-error, #d44d4d);
	}

	.file-remove:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	.file-remove svg {
		width: 16px;
		height: 16px;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.drop-zone,
		.progress-bar,
		.file-remove {
			transition: none;
		}
	}
</style>
