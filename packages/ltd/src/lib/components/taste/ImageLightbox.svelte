<script lang="ts">
	import type { Example } from '$lib/types';
	import { toTasteImageProxyUrl } from '$lib/taste/image';

	interface Props {
		images: Example[];
		currentIndex: number;
		isOpen: boolean;
		onClose: () => void;
		onNavigate: (index: number) => void;
	}

	let { images, currentIndex, isOpen, onClose, onNavigate }: Props = $props();

	// Derived state
	let currentImage = $derived(images[currentIndex]);
	let hasPrevious = $derived(currentIndex > 0);
	let hasNext = $derived(currentIndex < images.length - 1);
	let hasCurrentImageUrl = $derived(Boolean(currentImage?.image_url));
	let failedImageIds = $state<Set<string>>(new Set());
	let isCurrentImageFailed = $derived(
		currentImage ? failedImageIds.has(currentImage.id) : false
	);

	function handleKeydown(event: KeyboardEvent) {
		if (!isOpen) return;

		switch (event.key) {
			case 'Escape':
				onClose();
				break;
			case 'ArrowLeft':
				if (hasPrevious) onNavigate(currentIndex - 1);
				break;
			case 'ArrowRight':
				if (hasNext) onNavigate(currentIndex + 1);
				break;
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function handlePrevious() {
		if (hasPrevious) onNavigate(currentIndex - 1);
	}

	function handleNext() {
		if (hasNext) onNavigate(currentIndex + 1);
	}

	function markImageLoadFailure(imageId: string) {
		const next = new Set(failedImageIds);
		next.add(imageId);
		failedImageIds = next;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && currentImage}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="lightbox-backdrop" onclick={handleBackdropClick}>
		<div class="lightbox-container" role="dialog" aria-modal="true" aria-label="Image viewer">
			<!-- Close button -->
			<button class="close-button" onclick={onClose} aria-label="Close viewer">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M18 6L6 18M6 6l12 12" />
				</svg>
			</button>

			<!-- Navigation: Previous -->
			{#if hasPrevious}
				<button class="nav-button nav-previous" onclick={handlePrevious} aria-label="Previous image">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M15 18l-6-6 6-6" />
					</svg>
				</button>
			{/if}

			<!-- Main image -->
			<figure class="lightbox-content">
				{#if hasCurrentImageUrl && !isCurrentImageFailed}
					<img
						src={toTasteImageProxyUrl(currentImage.image_url) ?? currentImage.image_url}
						alt={currentImage.title || 'Visual reference'}
						class="lightbox-image"
						decoding="async"
						referrerpolicy="no-referrer"
						onerror={() => markImageLoadFailure(currentImage.id)}
					/>
				{:else}
					<div class="lightbox-fallback" role="img" aria-label="Image unavailable">
						<span>Image unavailable</span>
					</div>
				{/if}

				<!-- Image info -->
				{#if currentImage.title || currentImage.year || currentImage.description}
					<figcaption class="lightbox-info">
						{#if currentImage.title}
							<h3 class="info-title">{currentImage.title}</h3>
						{/if}
						{#if currentImage.year}
							<p class="info-year">{currentImage.year}</p>
						{/if}
						{#if currentImage.description}
							<p class="info-description">{currentImage.description}</p>
						{/if}
					</figcaption>
				{/if}
			</figure>

			<!-- Navigation: Next -->
			{#if hasNext}
				<button class="nav-button nav-next" onclick={handleNext} aria-label="Next image">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M9 18l6-6-6-6" />
					</svg>
				</button>
			{/if}

			<!-- Counter -->
			<div class="image-counter">
				{currentIndex + 1} / {images.length}
			</div>
		</div>
	</div>
{/if}

<style>
	.lightbox-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1000;
		background: var(--color-overlay-heavy);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fadeIn var(--duration-standard) var(--ease-standard);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.lightbox-container {
		position: relative;
		max-width: 90vw;
		max-height: 90vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.lightbox-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		animation: scaleIn var(--duration-standard) var(--ease-standard);
	}

	@keyframes scaleIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.lightbox-image {
		max-width: 85vw;
		max-height: 75vh;
		object-fit: contain;
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-surface);
	}

	.lightbox-fallback {
		width: min(85vw, 900px);
		height: min(75vh, 600px);
		min-height: 14rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-subtle);
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.lightbox-info {
		margin-top: var(--space-sm);
		text-align: center;
		max-width: 600px;
		padding: 0 var(--space-sm);
	}

	.info-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 0.25rem;
	}

	.info-year {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: 0.5rem;
	}

	.info-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.5;
	}

	/* Close button */
	.close-button {
		position: fixed;
		top: var(--space-md);
		right: var(--space-md);
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-primary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.close-button:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.close-button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	/* Navigation buttons */
	.nav-button {
		position: fixed;
		top: 50%;
		transform: translateY(-50%);
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-primary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.nav-button:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.nav-button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.nav-previous {
		left: var(--space-md);
	}

	.nav-next {
		right: var(--space-md);
	}

	/* Counter */
	.image-counter {
		position: fixed;
		bottom: var(--space-md);
		left: 50%;
		transform: translateX(-50%);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		padding: var(--space-xs) var(--space-sm);
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.lightbox-backdrop,
		.lightbox-content {
			animation: none;
		}
	}

	/* Mobile adjustments */
	@media (max-width: 768px) {
		.lightbox-image {
			max-width: 95vw;
			max-height: 70vh;
		}

		.nav-button {
			width: 40px;
			height: 40px;
		}

		.nav-previous {
			left: var(--space-xs);
		}

		.nav-next {
			right: var(--space-xs);
		}

		.close-button {
			top: var(--space-sm);
			right: var(--space-sm);
			width: 40px;
			height: 40px;
		}
	}
</style>
