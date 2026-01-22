<script lang="ts">
	import ImageUploader from './ImageUploader.svelte';

	interface Props {
		value?: string[];
		onchange?: (urls: string[]) => void;
		maxImages?: number;
		disabled?: boolean;
	}

	let { value = [], onchange, maxImages = 2, disabled = false }: Props = $props();

	function handleImageChange(index: number, url: string | null) {
		if (url === null) {
			// Delete - remove from array
			const newUrls = value.filter((_, i) => i !== index);
			onchange?.(newUrls);
		} else {
			// Add/Update
			const newUrls = [...value];
			newUrls[index] = url;
			onchange?.(newUrls);
		}
	}
</script>

<div class="secondary-uploader">
	<label class="uploader-label">
		Secondary Thumbnails (Optional)
		<span class="label-hint">({value.length}/{maxImages} uploaded)</span>
	</label>
	<p class="description">
		Add up to {maxImages} promotional images with 150:199 aspect ratio (e.g., 750×995px)
	</p>

	<div class="thumbnail-grid">
		{#each Array(maxImages) as _, index}
			<div class="thumbnail-slot">
				<ImageUploader
					value={value[index] || null}
					onchange={(url) => handleImageChange(index, url)}
					uploadType="thumbnail"
					label="Thumbnail {index + 1}"
					description="150:199 aspect ratio (e.g., 750×995px)"
					{disabled}
				/>
			</div>
		{/each}
	</div>
</div>

<style>
	.secondary-uploader {
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

	.description {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.thumbnail-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	@media (max-width: 640px) {
		.thumbnail-grid {
			grid-template-columns: 1fr;
		}
	}

	.thumbnail-slot {
		/* Container for each ImageUploader instance */
	}
</style>
