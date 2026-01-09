<script lang="ts">
	/**
	 * OUTERFIELDS Featured Videos
	 *
	 * Interactive video section showing sample content with play functionality
	 * Uses shared VideoModal component for player UI
	 * Shows live view counts via Cloudflare KV
	 */
	import { Play, Eye } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { videoPlayer, type Video } from '$lib/stores/videoPlayer';
	import { videoStats } from '$lib/stores/videoStats';
	import VideoModal from './VideoModal.svelte';

	// Cloudflare R2 CDN base URL
	const CDN_BASE = 'https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev';

	const videos: Video[] = [
		{
			id: 'v1',
			title: 'Weatherford, TX Promo',
			description: 'Showcasing the best of Weatherford, Texas',
			duration: '0:57',
			thumbnail: `${CDN_BASE}/thumbnails/weatherford-promo.jpg`,
			category: 'Promo',
			src: `${CDN_BASE}/videos/weatherford-promo.mp4`
		},
		{
			id: 'v2',
			title: 'Outerfields Takes on the Texas State Fair',
			description: 'Experience the Texas State Fair with Outerfields',
			duration: '0:57',
			thumbnail: `${CDN_BASE}/thumbnails/texas-state-fair.jpg`,
			category: 'Event',
			src: `${CDN_BASE}/videos/texas-state-fair.mp4`
		},
		{
			id: 'v3',
			title: 'GOTV USCCA POD Jerry Yanis',
			description: 'Jerry Yanis discusses GOTV with USCCA',
			duration: '12:19',
			thumbnail: `${CDN_BASE}/thumbnails/gotv-uscca.jpg`,
			category: 'Podcast',
			src: `${CDN_BASE}/videos/gotv-uscca.mp4`
		},
		{
			id: 'v4',
			title: 'Hilti Cast In Anchors',
			description: 'Professional product showcase for Hilti anchors',
			duration: '0:57',
			thumbnail: `${CDN_BASE}/thumbnails/hilti-anchors.jpg`,
			category: 'Product',
			src: `${CDN_BASE}/videos/hilti-anchors.mp4`
		},
		{
			id: 'v5',
			title: 'STACCATO Prairie Fire Gun Range Promo',
			description: 'Prairie Fire Gun Range promotional trailer',
			duration: '1:16',
			thumbnail: `${CDN_BASE}/thumbnails/staccato-promo.jpg`,
			category: 'Promo',
			src: `${CDN_BASE}/videos/staccato-promo.mp4`
		},
		{
			id: 'v6',
			title: 'USCCA Expo Promo Tim Kennedy',
			description: 'Tim Kennedy at the USCCA Expo',
			duration: '0:42',
			thumbnail: `${CDN_BASE}/thumbnails/uscca-expo-promo.jpg`,
			category: 'Promo',
			src: `${CDN_BASE}/videos/uscca-expo-promo.mp4`
		}
	];

	// Start polling for live stats on mount
	onMount(() => {
		videoStats.startPolling(10000); // Update every 10 seconds

		return () => {
			videoStats.stopPolling();
		};
	});

	function playVideo(video: Video) {
		videoPlayer.play(video);
		// Increment view count
		videoStats.incrementView(video.id);
	}

	function formatViews(views: number): string {
		if (views >= 1000000) {
			return `${(views / 1000000).toFixed(1)}M`;
		}
		if (views >= 1000) {
			return `${(views / 1000).toFixed(1)}K`;
		}
		return views.toLocaleString();
	}
</script>

<section class="videos-section" id="videos">
	<div class="videos-container">
		<div class="section-header">
			<span class="section-badge">Sample Content</span>
			<h2 class="section-title">Experience the Platform</h2>
			<p class="section-description">
				See how your content looks to subscribers. Click any video to preview the viewing experience.
			</p>
		</div>

		<div class="videos-grid highlight-grid">
			{#each videos as video, index}
				<button class="video-card highlight-item" style="--index: {index}" onclick={() => playVideo(video)}>
					<div class="video-thumbnail">
						<img src={video.thumbnail} alt={video.title} loading="lazy" />
						<div class="video-overlay">
							<span class="play-button">
								<Play size={32} />
							</span>
						</div>
						<span class="video-duration">{video.duration}</span>
					</div>
					<div class="video-info">
						<span class="video-category">{video.category}</span>
						<h3 class="video-title">{video.title}</h3>
						<p class="video-description">{video.description}</p>
						{#if $videoStats.views[video.id] !== undefined}
							<div class="video-views">
								<Eye size={14} />
								<span>{formatViews($videoStats.views[video.id])} views</span>
								{#if $videoStats.isLive}
									<span class="live-indicator" title="Real-time data from Cloudflare"></span>
								{/if}
							</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	</div>
</section>

<!-- Shared video modal component (engagement data fetched from KV) -->
<VideoModal />

<style>
	.videos-section {
		padding: 6rem 1.5rem;
		background: var(--color-bg-pure);
	}

	.videos-container {
		max-width: 72rem;
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: 4rem;
	}

	.section-badge {
		display: inline-block;
		padding: 0.375rem 0.75rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1rem;
	}

	.section-title {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
	}

	.section-description {
		font-size: 1.125rem;
		color: var(--color-fg-muted);
		max-width: 36rem;
		margin: 0 auto;
		line-height: 1.7;
	}

	.videos-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
	}

	.video-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		overflow: hidden;
		cursor: pointer;
		text-align: left;
		transition: all var(--duration-micro) var(--ease-standard),
			opacity var(--duration-standard) var(--ease-standard),
			transform var(--duration-micro) var(--ease-standard);
		transition-delay: calc(var(--cascade-step, 50ms) * var(--index, 0));
	}

	.video-card:hover {
		border-color: var(--color-border-strong);
		transform: translateY(-4px) scale(1.02);
		opacity: 1 !important; /* Override highlight-grid opacity dimming */
	}

	/* Play button hover styles are global in app.css */

	.video-thumbnail {
		position: relative;
		aspect-ratio: 16 / 9;
		overflow: hidden;
		background: #000;
	}

	.video-thumbnail img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		/* Scale up slightly to crop out any letterboxing in source images */
		transform: scale(1.15);
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.video-card:hover .video-thumbnail img {
		transform: scale(1.2);
	}

	.video-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.3);
	}

	/* Play button base styles are global in app.css */

	.video-duration {
		position: absolute;
		bottom: 0.75rem;
		right: 0.75rem;
		padding: 0.25rem 0.5rem;
		background: rgba(0, 0, 0, 0.8);
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-fg-primary);
	}

	.video-info {
		padding: 1.25rem;
	}

	.video-category {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 0.25rem;
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
	}

	.video-title {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
		/* Prevent multi-line titles from causing uneven card heights */
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.video-description {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0;
		line-height: 1.5;
		/* Truncate to one line for consistent card heights */
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.video-views {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0.75rem;
		font-size: 0.75rem;
		color: var(--color-fg-subtle);
	}

	.video-views :global(svg) {
		opacity: 0.7;
	}

	.live-indicator {
		width: 6px;
		height: 6px;
		background: var(--color-success);
		border-radius: 50%;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	@media (max-width: 768px) {
		.videos-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (min-width: 1024px) {
		.videos-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
