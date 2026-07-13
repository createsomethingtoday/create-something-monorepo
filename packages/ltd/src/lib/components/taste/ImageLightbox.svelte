<script lang="ts">
	import type { Example } from '$lib/types';

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

	function handleBackdropKeydown(event: KeyboardEvent) {
		if (event.target !== event.currentTarget) return;
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onClose();
		}
	}

	function handlePrevious() {
		if (hasPrevious) onNavigate(currentIndex - 1);
	}

	function handleNext() {
		if (hasNext) onNavigate(currentIndex + 1);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && currentImage}
	<div
		class="lightbox-backdrop"
		role="button"
		tabindex="0"
		aria-label="Close image viewer"
		onclick={handleBackdropClick}
		onkeydown={handleBackdropKeydown}
	>
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
				<img
					src={currentImage.image_url}
					alt={currentImage.title || 'Visual reference'}
					class="lightbox-image"
				/>

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
		background: var(--color-performance-overlay-heavy);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fadeIn var(--duration-performance-standard) var(--ease-performance-standard);
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
		animation: scaleIn var(--duration-performance-standard) var(--ease-performance-standard);
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
		background: var(--color-performance-bg-surface);
	}

	.lightbox-info {
		margin-top: var(--space-performance-sm);
		text-align: center;
		max-width: 600px;
		padding: 0 var(--space-performance-sm);
	}

	.info-title {
		font-size: var(--text-performance-body-lg);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin-bottom: 0.25rem;
	}

	.info-year {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		margin-bottom: 0.5rem;
	}

	.info-description {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		line-height: 1.5;
	}

	/* Close button */
	.close-button {
		position: fixed;
		top: var(--space-performance-md);
		right: var(--space-performance-md);
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-performance-bg-surface);
		color: var(--color-performance-fg-primary);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.close-button:hover {
		background: var(--color-performance-hover);
		border-color: var(--color-performance-border-emphasis);
	}

	.close-button:focus-visible {
		outline: 2px solid var(--color-performance-focus);
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
		background: var(--color-performance-bg-surface);
		color: var(--color-performance-fg-primary);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.nav-button:hover {
		background: var(--color-performance-hover);
		border-color: var(--color-performance-border-emphasis);
	}

	.nav-button:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 2px;
	}

	.nav-previous {
		left: var(--space-performance-md);
	}

	.nav-next {
		right: var(--space-performance-md);
	}

	/* Counter */
	.image-counter {
		position: fixed;
		bottom: var(--space-performance-md);
		left: 50%;
		transform: translateX(-50%);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		background: var(--color-performance-bg-surface);
		padding: var(--space-performance-xs) var(--space-performance-sm);
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
			left: var(--space-performance-xs);
		}

		.nav-next {
			right: var(--space-performance-xs);
		}

		.close-button {
			top: var(--space-performance-sm);
			right: var(--space-performance-sm);
			width: 40px;
			height: 40px;
		}
	}
</style>
