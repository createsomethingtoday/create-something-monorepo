<script lang="ts">
	/**
	 * OUTERFIELDS Featured Videos
	 *
	 * Interactive video section showing sample content with play functionality
	 * Uses global VideoModal (controlled via videoPlayer store) for player UI
	 * Shows live view counts via Cloudflare KV
	 * 
	 * All content freely accessible as portfolio showcase (PCN services model)
	 */
	import { Play, Eye } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { videoPlayer, type Video } from '$lib/stores/videoPlayer';
	import { videoStats } from '$lib/stores/videoStats';
	import { fetchVideoPlayback } from '$lib/client/video-playback';

	// Cloudflare R2 CDN base URL
	const CDN_BASE = 'https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev';

	interface FeaturedCard extends Video {
	}

	let videos = $state<FeaturedCard[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	function formatClock(totalSeconds: number): string {
		const seconds = Math.max(0, Math.floor(totalSeconds));
		const hours = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		if (hours > 0) {
			return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		}
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function getThumbnailPath(path: string): string {
		if (path.startsWith('/thumbnails/')) return path;
		return `/thumbnails${path.startsWith('/') ? '' : '/'}${path}`;
	}

	function toLegacyAssetUrl(path: string): string {
		if (path.startsWith('http://') || path.startsWith('https://')) return path;
		return `${CDN_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
	}

	interface FeaturedCatalogEntry {
		seriesTitle: string | null;
		seriesSlug: string | null;
		video: {
			id: string;
			title: string;
			tier: 'free' | 'preview' | 'gated';
			episode_number: number | null;
			duration_seconds: number | null;
			duration: number;
			thumbnail_path: string;
			series_id: string | null;
		};
	}

	function mapCatalogVideo(entry: FeaturedCatalogEntry): FeaturedCard {
		return {
			id: entry.video.id,
			title: entry.video.title,
			description: '',
			duration: formatClock(entry.video.duration_seconds ?? entry.video.duration),
			thumbnail: getThumbnailPath(entry.video.thumbnail_path),
			category: entry.seriesTitle || entry.seriesSlug || 'Featured',
			src: ''
		};
	}

	// Start polling for live stats on mount
	onMount(() => {
		videoStats.startPolling(10000); // Update every 10 seconds
		void loadFeaturedVideos();

		return () => {
			videoStats.stopPolling();
		};
	});

	async function loadFeaturedVideos() {
		try {
			isLoading = true;
			loadError = null;

			const response = await fetch('/api/v1/catalog/featured?limit=6');
			const payload = await response.json();
			if (!response.ok || !payload?.success) {
				throw new Error(payload?.error || 'Failed to load featured videos');
			}

			const rows = (payload.data?.videos || []) as FeaturedCatalogEntry[];
			videos = rows.map(mapCatalogVideo);
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Failed to load featured videos';
			videos = [];
		} finally {
			isLoading = false;
		}
	}

	async function playVideo(video: FeaturedCard) {
		try {
			const playback = await fetchVideoPlayback(video.id);
			let src: string | null = null;

			if (playback.status === 'ready' && playback.grant) {
				src = playback.grant.hlsUrl;
			}
			if (!src && playback.status === 'legacy' && playback.legacyAssetPath) {
				src = toLegacyAssetUrl(playback.legacyAssetPath);
			}

			if (!src) {
				loadError = playback.message || 'Playback is not ready yet.';
				return;
			}

			videoPlayer.play({
				id: video.id,
				title: video.title,
				description: video.description,
				duration: video.duration,
				thumbnail: video.thumbnail,
				category: video.category,
				src
			});
			videoStats.incrementView(video.id);
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Failed to start playback';
		}
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
			<span class="section-badge">Portfolio</span>
			<h2 class="section-title">Sample Productions</h2>
			<p class="section-description">
				Browse our work. Every PCN we build includes professional video production like this.
			</p>
		</div>

		<div class="videos-grid highlight-grid">
			{#if isLoading}
				<p class="empty-state">Loading featured videos…</p>
			{:else if loadError}
				<p class="empty-state">{loadError}</p>
			{:else if videos.length === 0}
				<p class="empty-state">No featured videos available.</p>
			{:else}
				{#each videos as video, index}
					<button
						class="video-card highlight-item"
						style="--index: {index}"
						onclick={() => playVideo(video)}
					>
						<div class="video-thumbnail">
							<img src={video.thumbnail} alt={video.title} loading="lazy" />
							<div class="video-overlay">
								<span class="play-button" aria-hidden="true">
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
			{/if}
		</div>
	</div>
</section>

<style>
	.videos-section {
		padding: 6rem 1.5rem;
		background: var(--color-bg-pure);
	}

	.videos-container {
		max-width: var(--container-max-width);
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

	.empty-state {
		grid-column: 1 / -1;
		text-align: center;
		color: var(--color-fg-muted);
		padding: 2rem;
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
		background: rgba(0, 0, 0, 0.35);
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
		line-clamp: 1;
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
		line-clamp: 1;
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

	/* Mobile: single column */
	@media (max-width: 640px) {
		.videos-section {
			padding: 4rem 1rem;
		}

		.section-header {
			margin-bottom: 2.5rem;
		}

		.section-description {
			font-size: 1rem;
		}

		.videos-grid {
			grid-template-columns: 1fr;
			gap: 1.25rem;
		}

		.video-info {
			padding: 1rem;
		}

		.video-title {
			font-size: 1rem;
		}
	}

	/* Tablet: 2 columns */
	@media (min-width: 641px) and (max-width: 1023px) {
		.videos-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	/* Desktop: 3 columns */
	@media (min-width: 1024px) {
		.videos-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
