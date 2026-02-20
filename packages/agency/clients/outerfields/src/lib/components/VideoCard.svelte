<script lang="ts">
	/**
	 * VideoCard Component
	 * StreamVerse-inspired poster-style card with 2/3 aspect ratio.
	 * Shows lock icon for gated content, FREE badge for preview content.
	 * Hover reveals gradient overlay with watch button.
	 */
	import { Lock, Play } from 'lucide-svelte';

	interface Props {
		id: string;
		title: string;
		thumbnail: string;
		duration: string;
		tier: 'free' | 'preview' | 'gated';
		category: string;
		episodeNumber?: number;
		href?: string;
		onClick?: () => void;
	}

	let {
		id,
		title,
		thumbnail,
		duration,
		tier,
		category,
		episodeNumber,
		href,
		onClick
	}: Props = $props();

	// Determine if this video should show as locked
	const isLocked = $derived(tier === 'gated');
	const isFree = $derived(tier === 'free');

	// Use link if href provided and no onClick, otherwise use button
	const useLink = $derived(!!href && !onClick);
	const FALLBACK_THUMBNAIL = '/thumbnails/films/featured.jpg';

	let imageSrc = $state(FALLBACK_THUMBNAIL);
	let imageUnavailable = $state(false);

	$effect(() => {
		imageSrc = thumbnail || FALLBACK_THUMBNAIL;
		imageUnavailable = false;
	});

	function handleImageError() {
		if (imageSrc !== FALLBACK_THUMBNAIL) {
			imageSrc = FALLBACK_THUMBNAIL;
			return;
		}
		imageUnavailable = true;
	}

	function handleClick(e: MouseEvent) {
		if (onClick) {
			e.preventDefault();
			onClick();
		}
	}
</script>

{#snippet cardContent()}
	<div class="poster-container" class:image-unavailable={imageUnavailable}>
		<img
			src={imageSrc}
			alt={title}
			class="poster-image"
			loading="lazy"
			onerror={handleImageError}
		/>

		<div class="poster-fallback" aria-hidden={!imageUnavailable}>
			<span>{category}</span>
		</div>

		<div class="poster-gradient"></div>

		<div class="hover-overlay">
			<div class="play-indicator">
				<Play size={24} />
			</div>
		</div>

		{#if isLocked}
			<div class="lock-overlay">
				<Lock size={18} />
			</div>
		{/if}
	</div>

	<div class="card-info">
		<h3 class="card-title">{title}</h3>
		<p class="card-meta">
			{#if isFree}
				<span class="free-indicator">Free</span>
				<span class="meta-dot">•</span>
			{/if}
			{#if episodeNumber}
				<span>Ep {episodeNumber}</span>
				<span class="meta-dot">•</span>
			{/if}
			<span>{category}</span>
			<span class="meta-dot">•</span>
			<span>{duration}</span>
		</p>
	</div>
{/snippet}

{#if useLink}
	<a
		href={href}
		class="video-card"
		data-video-id={id}
		aria-label={`Watch ${title}`}
	>
		{@render cardContent()}
	</a>
{:else}
	<button
		class="video-card"
		onclick={handleClick}
		data-video-id={id}
		aria-label={`Play ${title}`}
	>
		{@render cardContent()}
	</button>
{/if}

<style>
	.video-card {
		display: flex;
		flex-direction: column;
		min-width: 200px;
		max-width: 280px;
		background: linear-gradient(155deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.015) 55%);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 0.95rem;
		padding: 0.35rem 0.35rem 0.45rem;
		cursor: pointer;
		text-decoration: none;
		color: inherit;
		font-family: var(--font-sans);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.video-card:hover {
		transform: translateY(-2px);
		border-color: rgba(255, 255, 255, 0.22);
		background: linear-gradient(160deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03) 56%);
	}

	.poster-container {
		position: relative;
		width: 100%;
		aspect-ratio: 4 / 3;
		background: linear-gradient(150deg, rgba(42, 42, 42, 1), rgba(22, 22, 22, 1));
		border-radius: var(--radius-md);
		overflow: hidden;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.video-card:hover .poster-container {
		transform: scale(1.02);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
	}

	.poster-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.video-card:hover .poster-image {
		transform: scale(1.05);
	}

	.poster-gradient {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.58), rgba(0, 0, 0, 0.05) 56%);
	}

	.poster-fallback {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 0.8rem;
		text-align: center;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: rgba(255, 255, 255, 0.75);
		background: linear-gradient(
			145deg,
			rgba(244, 81, 38, 0.2) 0%,
			rgba(255, 255, 255, 0.08) 45%,
			rgba(218, 191, 255, 0.2) 100%
		);
		opacity: 0;
	}

	.poster-container.image-unavailable .poster-fallback {
		opacity: 1;
	}

	.hover-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.42), rgba(0, 0, 0, 0.18));
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.video-card:hover .hover-overlay {
		opacity: 1;
	}

	.play-indicator {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		color: var(--color-fg-primary);
		backdrop-filter: blur(4px);
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.video-card:hover .play-indicator {
		transform: scale(1.1);
	}

	.lock-overlay {
		position: absolute;
		top: var(--space-xs);
		right: var(--space-xs);
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.62);
		color: var(--color-fg-tertiary);
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.2);
		transition: opacity var(--duration-micro) var(--ease-standard), transform var(--duration-micro) var(--ease-standard);
	}

	.video-card:hover .lock-overlay {
		opacity: 0;
		transform: scale(0.9);
	}

	.free-indicator {
		color: var(--color-sun);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.card-info {
		padding: 0.65rem 0.4rem 0;
	}

	.card-title {
		font-family: var(--font-sans);
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: left;
		line-height: 1.3;
	}

	.card-meta {
		font-family: var(--font-sans);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0.32rem 0 0 0;
		text-align: left;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.meta-dot {
		color: var(--color-fg-subtle);
		opacity: 0.5;
	}

	@media (min-width: 768px) {
		.video-card {
			min-width: 240px;
			max-width: 300px;
		}
	}

	@media (min-width: 1024px) {
		.video-card {
			min-width: 260px;
			max-width: 320px;
		}
	}

	@media (max-width: 480px) {
		.video-card {
			min-width: 180px;
			max-width: 220px;
			padding: 0.3rem 0.3rem 0.35rem;
		}

		.play-indicator {
			width: 40px;
			height: 40px;
		}

		.play-indicator :global(svg) {
			width: 20px;
			height: 20px;
		}
	}
</style>
