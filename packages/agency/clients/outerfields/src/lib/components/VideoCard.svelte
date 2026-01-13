<script lang="ts">
	/**
	 * VideoCard Component
	 * Displays a video thumbnail with metadata for horizontal category rows.
	 * Shows lock icon for gated content, FREE badge for preview content.
	 */
	import { Lock } from 'lucide-svelte';

	interface Props {
		id: string;
		title: string;
		thumbnail: string;
		duration: string;
		tier: 'free' | 'preview' | 'gated';
		category: string;
		episodeNumber?: number;
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
		onClick
	}: Props = $props();

	// Determine if this video should show as locked
	const isLocked = tier === 'gated';
	const isFree = tier === 'free';
</script>

<button
	class="video-card"
	onclick={onClick}
	aria-label={`Play ${title}`}
>
	<div class="thumbnail-container">
		<img
			src={thumbnail}
			alt={title}
			class="thumbnail"
			loading="lazy"
		/>

		<!-- Duration badge -->
		<div class="duration-badge">
			{duration}
		</div>

		<!-- Lock icon for gated content -->
		{#if isLocked}
			<div class="lock-badge">
				<Lock size={20} />
			</div>
		{/if}

		<!-- FREE badge -->
		{#if isFree}
			<div class="free-badge">
				FREE
			</div>
		{/if}

		<!-- Play overlay on hover -->
		<div class="play-overlay">
			<div class="play-icon">▶</div>
		</div>
	</div>

	<div class="card-info">
		<h3 class="card-title">{title}</h3>
		{#if episodeNumber}
			<p class="episode-number">Episode {episodeNumber}</p>
		{/if}
	</div>
</button>

<style>
	.video-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		min-width: 280px;
		max-width: 320px;
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.video-card:hover {
		transform: scale(1.02);
	}

	.thumbnail-container {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.thumbnail {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.duration-badge {
		position: absolute;
		bottom: var(--space-xs);
		right: var(--space-xs);
		padding: 4px 8px;
		background: rgba(0, 0, 0, 0.8);
		color: var(--color-fg-primary);
		font-size: var(--text-caption);
		border-radius: var(--radius-sm);
		backdrop-filter: blur(8px);
	}

	.lock-badge {
		position: absolute;
		top: var(--space-xs);
		right: var(--space-xs);
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.8);
		color: var(--color-fg-primary);
		border-radius: 50%;
		backdrop-filter: blur(8px);
	}

	.free-badge {
		position: absolute;
		top: var(--space-xs);
		left: var(--space-xs);
		padding: 4px 12px;
		background: var(--color-success);
		color: var(--color-fg-primary);
		font-size: var(--text-caption);
		font-weight: 700;
		border-radius: var(--radius-sm);
		letter-spacing: 0.05em;
	}

	.play-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.4);
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.video-card:hover .play-overlay {
		opacity: 1;
	}

	.play-icon {
		width: 60px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.2);
		color: var(--color-fg-primary);
		font-size: var(--text-h3);
		border-radius: 50%;
		backdrop-filter: blur(8px);
		border: 2px solid var(--color-border-emphasis);
	}

	.card-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 0 var(--space-xs);
	}

	.card-title {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		text-align: left;
	}

	.episode-number {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0;
		text-align: left;
	}

	/* Responsive sizing */
	@media (max-width: 768px) {
		.video-card {
			min-width: 240px;
			max-width: 280px;
		}
	}

	@media (max-width: 480px) {
		.video-card {
			min-width: 200px;
			max-width: 240px;
		}

		.play-icon {
			width: 48px;
			height: 48px;
		}
	}
</style>
