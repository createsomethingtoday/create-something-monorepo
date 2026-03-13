<script lang="ts">
	/**
	 * VideoLightbox Component
	 *
	 * Modal video player with YouTube/Vimeo support.
	 * Click thumbnail to open fullscreen player.
	 *
	 * Canon principle: Video should be accessible without visual noise.
	 *
	 * @example
	 * <VideoLightbox
	 *   videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
	 *   thumbnailUrl="/video-thumbnail.jpg"
	 *   title="Product Demo"
	 * />
	 */

	import { onMount } from 'svelte';

	interface Props {
		/** YouTube or Vimeo video URL */
		videoUrl: string;
		/** Thumbnail image URL */
		thumbnailUrl?: string;
		/** Video title for accessibility */
		title?: string;
		/** Aspect ratio for thumbnail */
		aspectRatio?: '16/9' | '4/3' | '1/1';
		/** Play button size */
		playButtonSize?: 'sm' | 'md' | 'lg';
	}

	let {
		videoUrl,
		thumbnailUrl,
		title = 'Video',
		aspectRatio = '16/9',
		playButtonSize = 'md'
	}: Props = $props();

	let open = $state(false);
	let embedUrl = $state('');

	// Parse video URL to get embed URL
	function getEmbedUrl(url: string): string {
		// YouTube
		const youtubeMatch = url.match(
			/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
		);
		if (youtubeMatch) {
			return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&rel=0`;
		}

		// Vimeo
		const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
		if (vimeoMatch) {
			return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
		}

		// Direct video URL
		return url;
	}

	function openLightbox() {
		embedUrl = getEmbedUrl(videoUrl);
		open = true;
	}

	function closeLightbox() {
		open = false;
		embedUrl = '';
	}

	function handleKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			event.preventDefault();
			closeLightbox();
		}
	}

	// Lock body scroll when open
	$effect(() => {
		if (typeof document !== 'undefined') {
			if (open) {
				document.body.style.overflow = 'hidden';
			} else {
				document.body.style.overflow = '';
			}
		}
	});

	onMount(() => {
		return () => {
			if (typeof document !== 'undefined') {
				document.body.style.overflow = '';
			}
		};
	});

	const playButtonSizes = {
		sm: 48,
		md: 64,
		lg: 80
	};
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Thumbnail Trigger -->
<button
	class="thumbnail"
	onclick={openLightbox}
	aria-label={`Play ${title}`}
	style:aspect-ratio={aspectRatio}
>
	{#if thumbnailUrl}
		<img src={thumbnailUrl} alt={title} class="thumbnail-image" />
	{:else}
		<div class="thumbnail-placeholder"></div>
	{/if}

	<div class="play-button" style:--size="{playButtonSizes[playButtonSize]}px">
		<svg viewBox="0 0 24 24" fill="currentColor">
			<path d="M8 5v14l11-7z" />
		</svg>
	</div>
</button>

<!-- Lightbox Modal -->
{#if open}
	<div
		class="lightbox-overlay"
		onclick={closeLightbox}
		onkeydown={(e) => e.key === 'Enter' && closeLightbox()}
		role="button"
		tabindex="-1"
		aria-label="Close video"
	>
		<div
			class="lightbox-content"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-label={title}
		>
			<button class="close-button" onclick={closeLightbox} aria-label="Close video">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M18 6L6 18M6 6l12 12" />
				</svg>
			</button>

			{#if embedUrl.includes('youtube.com') || embedUrl.includes('vimeo.com')}
				<iframe
					src={embedUrl}
					{title}
					frameborder="0"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowfullscreen
				></iframe>
			{:else}
				<video src={embedUrl} controls autoplay>
					<track kind="captions" />
				</video>
			{/if}
		</div>
	</div>
{/if}

<style>
	.thumbnail {
		position: relative;
		width: 100%;
		background: var(--color-bg-surface, #111);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-lg, 12px);
		overflow: hidden;
		cursor: pointer;
		transition: all var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.thumbnail:hover {
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
	}

	.thumbnail:hover .play-button {
		transform: translate(-50%, -50%) scale(1.1);
		background: var(--color-fg-primary, #fff);
	}

	.thumbnail:hover .play-button svg {
		color: var(--color-bg-pure, #000);
	}

	.thumbnail:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	.thumbnail-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.thumbnail-placeholder {
		width: 100%;
		height: 100%;
		background: linear-gradient(
			135deg,
			var(--color-bg-surface, #111) 0%,
			var(--color-bg-subtle, #1a1a1a) 100%
		);
	}

	.play-button {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: var(--size);
		height: var(--size);
		background: rgba(0, 0, 0, 0.7);
		border: 2px solid var(--color-fg-primary, #fff);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.play-button svg {
		width: 40%;
		height: 40%;
		color: var(--color-fg-primary, #fff);
		margin-left: 4px; /* Visual centering for play icon */
		transition: color var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	/* Lightbox */
	.lightbox-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: var(--color-overlay-heavy, rgba(0, 0, 0, 0.9));
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-md, 1.618rem);
		animation: fadeIn var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.lightbox-content {
		position: relative;
		width: 100%;
		max-width: 1200px;
		aspect-ratio: 16/9;
		background: var(--color-bg-pure, #000);
		border-radius: var(--radius-lg, 12px);
		overflow: hidden;
		animation: scaleIn var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.lightbox-content iframe,
	.lightbox-content video {
		width: 100%;
		height: 100%;
	}

	.close-button {
		position: absolute;
		top: -48px;
		right: 0;
		width: 40px;
		height: 40px;
		background: transparent;
		border: none;
		color: var(--color-fg-primary, #fff);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm, 6px);
		transition: background var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.close-button:hover {
		background: var(--color-hover, rgba(255, 255, 255, 0.05));
	}

	.close-button:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	.close-button svg {
		width: 24px;
		height: 24px;
	}

	/* Animations */
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
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

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.thumbnail,
		.play-button,
		.play-button svg,
		.lightbox-overlay,
		.lightbox-content,
		.close-button {
			animation: none;
			transition: none;
		}
	}
</style>
