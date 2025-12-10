<!--
  ImageUploader

  Drag-drop image upload to R2.
  Shows preview, allows URL input, handles upload state.
  Heideggerian: Direct manipulation of images, not file management.
-->
<script lang="ts">
  interface Props {
    value: string;
    onchange: (url: string) => void;
    accept?: string;
  }

  let { value, onchange, accept = 'image/*' }: Props = $props();

  let isDragging = $state(false);
  let isUploading = $state(false);
  let error = $state<string | null>(null);
  let inputMode = $state<'url' | 'upload'>('upload');

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  }

  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      await uploadFile(input.files[0]);
    }
  }

  async function uploadFile(file: File) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      error = 'Please select an image file';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      error = 'Image must be less than 5MB';
      return;
    }

    error = null;
    isUploading = true;

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload to R2 via API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onchange(data.url);
    } catch (e) {
      error = 'Failed to upload image';
      // For development, use a data URL
      const reader = new FileReader();
      reader.onload = () => {
        onchange(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      isUploading = false;
    }
  }

  function handleUrlInput(event: Event) {
    const input = event.target as HTMLInputElement;
    onchange(input.value);
  }

  function clearImage() {
    onchange('');
  }
</script>

<div class="image-uploader">
  {#if value}
    <!-- Preview existing image -->
    <div class="image-preview">
      <img src={value} alt="Preview" />
      <div class="preview-overlay">
        <button class="overlay-btn" onclick={clearImage} type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Remove
        </button>
      </div>
    </div>
  {:else}
    <!-- Upload area -->
    <div class="upload-tabs">
      <button
        class="tab"
        class:active={inputMode === 'upload'}
        onclick={() => inputMode = 'upload'}
        type="button"
      >
        Upload
      </button>
      <button
        class="tab"
        class:active={inputMode === 'url'}
        onclick={() => inputMode = 'url'}
        type="button"
      >
        URL
      </button>
    </div>

    {#if inputMode === 'upload'}
      <div
        class="drop-zone"
        class:dragging={isDragging}
        class:uploading={isUploading}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        role="button"
        tabindex="0"
      >
        {#if isUploading}
          <div class="upload-spinner"></div>
          <span>Uploading...</span>
        {:else}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Drop image here or click to browse</span>
        {/if}

        <input
          type="file"
          {accept}
          onchange={handleFileSelect}
          class="file-input"
          disabled={isUploading}
        />
      </div>
    {:else}
      <div class="url-input-wrapper">
        <input
          type="url"
          class="input"
          placeholder="https://example.com/image.jpg"
          value={value}
          oninput={handleUrlInput}
        />
      </div>
    {/if}

    {#if error}
      <p class="error-message">{error}</p>
    {/if}
  {/if}
</div>

<style>
  .image-uploader {
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: var(--color-bg-elevated);
  }

  .image-preview {
    position: relative;
    aspect-ratio: 16/9;
  }

  .image-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .preview-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity var(--duration-micro) var(--ease-standard);
  }

  .image-preview:hover .preview-overlay {
    opacity: 1;
  }

  .overlay-btn {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-md);
    color: white;
    cursor: pointer;
    font-size: var(--text-body-sm);
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .overlay-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .upload-tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border-default);
  }

  .tab {
    flex: 1;
    padding: var(--space-xs) var(--space-sm);
    border: none;
    background: none;
    color: var(--color-fg-muted);
    cursor: pointer;
    font-size: var(--text-body-sm);
    font-weight: 500;
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .tab.active {
    color: var(--color-fg-primary);
    background: var(--color-bg-surface);
  }

  .tab:hover:not(.active) {
    color: var(--color-fg-secondary);
  }

  .drop-zone {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    padding: var(--space-xl) var(--space-lg);
    color: var(--color-fg-muted);
    cursor: pointer;
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .drop-zone:hover,
  .drop-zone.dragging {
    background: var(--color-hover);
    color: var(--color-fg-secondary);
  }

  .drop-zone.uploading {
    cursor: wait;
  }

  .drop-zone span {
    font-size: var(--text-body-sm);
  }

  .file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .url-input-wrapper {
    padding: var(--space-sm);
  }

  .upload-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--color-border-emphasis);
    border-top-color: var(--color-accent);
    border-radius: var(--radius-full);
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-message {
    margin: 0;
    padding: var(--space-xs) var(--space-sm);
    font-size: var(--text-caption);
    color: var(--color-error);
    background: rgba(239, 68, 68, 0.1);
  }
</style>
