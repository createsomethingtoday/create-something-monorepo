<script lang="ts">
	/**
	 * VideoCard Component
	 * StreamVerse-inspired poster-style card with 2/3 aspect ratio.
	 * Shows lock icon for gated content, FREE badge for preview content.
	 * Hover reveals gradient overlay with watch button.
	 */
	import { Lock, Play, Star } from 'lucide-svelte';

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
	const isLocked = tier === 'gated';
	const isFree = tier === 'free';

	// Use link if href provided and no onClick, otherwise use button
	const useLink = $derived(!!href && !onClick);

	function handleClick(e: MouseEvent) {
		if (onClick) {
			e.preventDefault();
			onClick();
		}
	}
</script>

{#snippet cardContent()}
	<div class="poster-container">
		<img
			src={thumbnail}
			alt={title}
			class="poster-image"
			loading="lazy"
		/>

		<!-- Tufte-inspired: minimal hover overlay with centered play icon -->
		<div class="hover-overlay">
			<div class="play-indicator">
				<Play size={24} />
			</div>
		</div>

		<!-- Lock icon overlay for gated content -->
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
		aria-label={`Watch ${title}`}
	>
		{@render cardContent()}
	</a>
{:else}
	<button
		class="video-card"
		onclick={handleClick}
		aria-label={`Play ${title}`}
	>
		{@render cardContent()}
	</button>
{/if}

<style>
	.video-card {
		display: flex;
		flex-direction: column;
		min-width: 160px;
		max-width: 200px;
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		text-decoration: none;
		color: inherit;
	}

	.poster-container {
		position: relative;
		width: 100%;
		aspect-ratio: 2 / 3;
		background: var(--color-card-dark);
		border-radius: var(--radius-lg);
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
	}

	/* Tufte-inspired: minimal hover overlay */
	.hover-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.video-card:hover .hover-overlay {
		opacity: 1;
	}

	/* Simple centered play indicator */
	.play-indicator {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		color: white;
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.video-card:hover .play-indicator {
		transform: scale(1.1);
	}

	/* Lock overlay for gated content - subtle corner indicator */
	.lock-overlay {
		position: absolute;
		top: var(--space-xs);
		right: var(--space-xs);
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		color: var(--color-fg-muted);
		border-radius: 50%;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.video-card:hover .lock-overlay {
		opacity: 0;
	}

	/* Tufte-inspired: Free as inline text, not a badge */
	.free-indicator {
		color: var(--color-fg-secondary);
	}

	/* Card info below poster */
	.card-info {
		padding: var(--space-sm) 0 0 0;
	}

	.card-title {
		font-size: var(--text-body-sm);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: left;
	}

	.card-meta {
		font-size: 10px;
		color: var(--color-fg-subtle);
		margin: var(--space-xs) 0 0 0;
		text-align: left;
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.meta-dot {
		color: var(--color-fg-subtle);
	}

	/* Responsive sizing */
	@media (min-width: 768px) {
		.video-card {
			min-width: 180px;
			max-width: 220px;
		}
	}

	@media (min-width: 1024px) {
		.video-card {
			min-width: 200px;
			max-width: 240px;
		}
	}

	@media (max-width: 480px) {
		.video-card {
			min-width: 140px;
			max-width: 160px;
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
