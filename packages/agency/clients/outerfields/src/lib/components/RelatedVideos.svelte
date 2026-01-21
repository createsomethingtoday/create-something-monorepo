<script lang="ts">
	/**
	 * RelatedVideos Component
	 *
	 * Displays related videos on the watch page.
	 * - Sidebar layout on desktop
	 * - Horizontal scroll on mobile
	 * - Shows tier badges (FREE, MEMBERS ONLY)
	 * - Links to /watch/[id] routes
	 */
	import { Lock, Play, Clock } from 'lucide-svelte';
	import { authStore } from '$lib/stores/auth';

	interface RelatedVideo {
		id: string;
		title: string;
		thumbnail: string;
		duration: string;
		tier: 'free' | 'preview' | 'gated';
		category: string;
		episodeNumber?: number;
	}

	interface Props {
		videos: RelatedVideo[];
		currentVideoId: string;
		title?: string;
		layout?: 'sidebar' | 'horizontal';
	}

	let {
		videos,
		currentVideoId,
		title = 'Up Next',
		layout = 'sidebar'
	}: Props = $props();

	const isMember = $derived($authStore.user?.membership ?? false);

	// Filter out current video and limit to reasonable number
	const displayVideos = $derived(
		videos.filter((v) => v.id !== currentVideoId).slice(0, 20)
	);

	function getTierBadge(tier: RelatedVideo['tier']): { text: string; class: string } | null {
		if (tier === 'free') {
			return { text: 'FREE', class: 'badge-free' };
		}
		if ((tier === 'preview' || tier === 'gated') && !isMember) {
			return { text: 'MEMBERS', class: 'badge-locked' };
		}
		return null;
	}

	function isLocked(tier: RelatedVideo['tier']): boolean {
		return (tier === 'preview' || tier === 'gated') && !isMember;
	}

	function getCategoryLabel(category: string): string {
		const labels: Record<string, string> = {
			'crew-call': 'Crew Call',
			'reconnecting-relationships': 'Reconnecting',
			'kodiak': 'Kodiak',
			'lincoln-manufacturing': 'Lincoln Mfg',
			'guns-out-tv': 'Guns Out TV',
			'films': 'Films',
			'coming-soon': 'Coming Soon'
		};
		return labels[category] || category;
	}
</script>

<section class="related-videos" class:horizontal={layout === 'horizontal'}>
	<h3 class="section-title">{title}</h3>

	<div class="videos-list" class:horizontal={layout === 'horizontal'}>
		{#each displayVideos as video (video.id)}
			{@const badge = getTierBadge(video.tier)}
			{@const locked = isLocked(video.tier)}

			<a
				href={locked ? '#pricing' : `/watch/${video.id}`}
				class="video-item"
				class:locked
				aria-label={locked ? `${video.title} - Members only` : video.title}
			>
				<div class="thumbnail-wrapper">
					<img
						src={video.thumbnail}
						alt=""
						class="thumbnail"
						loading="lazy"
					/>
					<div class="thumbnail-overlay">
						{#if locked}
							<span class="lock-icon">
								<Lock size={20} />
							</span>
						{:else}
							<span class="play-icon">
								<Play size={20} />
							</span>
						{/if}
					</div>
					<span class="duration-badge">
						<Clock size={10} />
						{video.duration}
					</span>
					{#if badge}
						<span class="tier-badge {badge.class}">{badge.text}</span>
					{/if}
				</div>

				<div class="video-info">
					<h4 class="video-title">{video.title}</h4>
					<div class="video-meta">
						<span class="category">{getCategoryLabel(video.category)}</span>
						{#if video.episodeNumber}
							<span class="episode">Ep. {video.episodeNumber}</span>
						{/if}
					</div>
				</div>
			</a>
		{/each}
	</div>

	{#if displayVideos.length === 0}
		<p class="empty-state">No related videos available</p>
	{/if}
</section>

<style>
	.related-videos {
		width: 100%;
	}

	.section-title {
		font-size: var(--text-h3);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md) 0;
	}

	/* Sidebar layout (default) */
	.videos-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	/* Horizontal layout */
	.videos-list.horizontal {
		flex-direction: row;
		overflow-x: auto;
		overflow-y: hidden;
		scroll-snap-type: x mandatory;
		-webkit-overflow-scrolling: touch;
		padding-bottom: var(--space-sm);
		gap: var(--space-md);
	}

	.videos-list.horizontal::-webkit-scrollbar {
		height: 4px;
	}

	.videos-list.horizontal::-webkit-scrollbar-track {
		background: var(--color-bg-surface);
		border-radius: 2px;
	}

	.videos-list.horizontal::-webkit-scrollbar-thumb {
		background: var(--color-border-emphasis);
		border-radius: 2px;
	}

	/* Video item */
	.video-item {
		display: flex;
		gap: var(--space-sm);
		padding: var(--space-xs);
		border-radius: var(--radius-md);
		text-decoration: none;
		color: inherit;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.video-item:hover {
		background: var(--color-bg-surface);
	}

	.video-item.locked {
		opacity: 0.85;
	}

	.video-item.locked:hover {
		opacity: 1;
	}

	/* Horizontal layout video item */
	.videos-list.horizontal .video-item {
		flex-direction: column;
		flex-shrink: 0;
		width: 200px;
		scroll-snap-align: start;
		padding: 0;
	}

	/* Thumbnail */
	.thumbnail-wrapper {
		position: relative;
		flex-shrink: 0;
		width: 160px;
		aspect-ratio: 16 / 9;
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--color-bg-surface);
	}

	.videos-list.horizontal .thumbnail-wrapper {
		width: 100%;
	}

	.thumbnail {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.video-item:hover .thumbnail {
		transform: scale(1.05);
	}

	.thumbnail-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.4);
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.video-item:hover .thumbnail-overlay {
		opacity: 1;
	}

	.play-icon,
	.lock-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 50%;
		color: white;
	}

	.lock-icon {
		background: rgba(0, 0, 0, 0.6);
	}

	.duration-badge {
		position: absolute;
		bottom: var(--space-xs);
		right: var(--space-xs);
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.375rem;
		background: rgba(0, 0, 0, 0.85);
		border-radius: 2px;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--color-fg-primary);
	}

	.tier-badge {
		position: absolute;
		top: var(--space-xs);
		left: var(--space-xs);
		padding: 0.125rem 0.375rem;
		border-radius: 2px;
		font-size: 0.5625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.badge-free {
		background: var(--color-success);
		color: white;
	}

	.badge-locked {
		background: rgba(255, 255, 255, 0.15);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.25);
	}

	/* Video info */
	.video-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.video-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.video-meta {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	.category {
		color: var(--color-fg-subtle);
	}

	.episode {
		color: var(--color-fg-muted);
	}

	.episode::before {
		content: '•';
		margin-right: var(--space-xs);
	}

	.empty-state {
		text-align: center;
		color: var(--color-fg-muted);
		padding: var(--space-lg);
		font-size: 0.875rem;
	}

	/* Responsive - iPad and tablets */
	@media (max-width: 1100px) {
		.related-videos {
			max-width: 100%;
			overflow: hidden;
		}

		.related-videos:not(.horizontal) .videos-list {
			flex-direction: row;
			overflow-x: auto;
			overflow-y: hidden;
			scroll-snap-type: x mandatory;
			-webkit-overflow-scrolling: touch;
			padding-bottom: var(--space-sm);
			gap: var(--space-md);
			max-width: 100%;
		}

		.related-videos:not(.horizontal) .video-item {
			flex-direction: column;
			flex-shrink: 0;
			width: 180px;
			scroll-snap-align: start;
			padding: 0;
		}

		.related-videos:not(.horizontal) .thumbnail-wrapper {
			width: 100%;
		}
	}

	@media (max-width: 768px) {
		.section-title {
			font-size: var(--text-body-lg);
		}

		.thumbnail-wrapper {
			width: 140px;
		}

		.video-title {
			font-size: 0.8125rem;
		}

		.video-meta {
			font-size: 0.6875rem;
		}

		.related-videos:not(.horizontal) .video-item,
		.videos-list.horizontal .video-item {
			width: 160px;
		}
	}

	@media (max-width: 480px) {
		.related-videos:not(.horizontal) .video-item,
		.videos-list.horizontal .video-item {
			width: 140px;
		}
	}
</style>
