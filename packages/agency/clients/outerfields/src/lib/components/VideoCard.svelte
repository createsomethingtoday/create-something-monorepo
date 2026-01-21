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

		<!-- Hover overlay with gradient and actions -->
		<div class="hover-overlay">
			<button class="watch-button">
				<Play size={14} />
				<span>WATCH</span>
			</button>
			<div class="overlay-meta">
				{#if isFree}
					<span class="quality-badge">FREE</span>
				{:else if isLocked}
					<span class="quality-badge locked"><Lock size={10} /> MEMBERS</span>
				{:else}
					<span class="quality-badge">HD</span>
				{/if}
				<span class="duration-badge">{duration}</span>
			</div>
		</div>

		<!-- Lock icon overlay for gated content -->
		{#if isLocked}
			<div class="lock-overlay">
				<Lock size={24} />
			</div>
		{/if}

		<!-- FREE badge (always visible) -->
		{#if isFree}
			<div class="free-badge">FREE</div>
		{/if}
	</div>

	<div class="card-info">
		<h3 class="card-title">{title}</h3>
		<p class="card-meta">
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
		transform: scale(1.05);
		box-shadow: 0 20px 40px rgba(124, 43, 238, 0.2);
	}

	.poster-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Hover overlay */
	.hover-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, transparent 50%, transparent 100%);
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		padding: var(--space-md);
	}

	.video-card:hover .hover-overlay {
		opacity: 1;
	}

	.watch-button {
		width: 100%;
		padding: var(--space-sm);
		background: var(--color-brand);
		border: none;
		border-radius: var(--radius-sm);
		color: white;
		font-size: var(--text-caption);
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		cursor: pointer;
		margin-bottom: var(--space-sm);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.watch-button:hover {
		background: var(--color-brand-hover);
	}

	.overlay-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 10px;
	}

	.quality-badge {
		padding: 2px 6px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: var(--radius-sm);
		color: white;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.quality-badge.locked {
		background: rgba(124, 43, 238, 0.4);
	}

	.duration-badge {
		color: var(--color-fg-muted);
	}

	/* Lock overlay for gated content */
	.lock-overlay {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.7);
		color: var(--color-fg-primary);
		border-radius: 50%;
		backdrop-filter: blur(4px);
		opacity: 0.8;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.video-card:hover .lock-overlay {
		opacity: 0;
	}

	/* FREE badge */
	.free-badge {
		position: absolute;
		top: var(--space-sm);
		left: var(--space-sm);
		padding: 2px 8px;
		background: var(--color-success);
		color: white;
		font-size: 10px;
		font-weight: 700;
		border-radius: var(--radius-sm);
		letter-spacing: 0.05em;
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

		.hover-overlay {
			padding: var(--space-sm);
		}

		.watch-button {
			padding: var(--space-xs);
			font-size: 9px;
		}
	}
</style>
