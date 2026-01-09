<script lang="ts">
	/**
	 * OUTERFIELDS Featured Videos
	 *
	 * Interactive video section showing sample content with play functionality
	 * Integrates with videoPlayer store for persistent mini-player support
	 * Shows live view counts via Cloudflare KV
	 */
	import { Play, Pause, X, Volume2, VolumeX, Minimize2, Maximize2, Eye } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { videoPlayer, type Video } from '$lib/stores/videoPlayer';
	import { videoStats } from '$lib/stores/videoStats';

	// Cloudflare R2 CDN base URL
	const CDN_BASE = 'https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev';

	// Engagement data: normalized values (0-1) for heatmap visualization
	// Simulates "Most Replayed" data showing where viewers watch most
	const engagementData: Record<string, number[]> = {
		v1: [0.3, 0.4, 0.5, 0.7, 0.9, 1.0, 0.95, 0.85, 0.7, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.1],
		v2: [0.2, 0.3, 0.5, 0.6, 0.65, 0.7, 0.8, 0.95, 1.0, 0.9, 0.75, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.2, 0.15, 0.1],
		v3: [0.4, 0.35, 0.3, 0.35, 0.5, 0.7, 0.85, 1.0, 0.9, 0.7, 0.5, 0.4, 0.5, 0.7, 0.9, 0.95, 0.8, 0.5, 0.3, 0.2],
		v4: [0.2, 0.4, 0.6, 0.8, 1.0, 0.95, 0.85, 0.7, 0.55, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.12, 0.1, 0.08, 0.05],
		v5: [0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.75, 0.9, 1.0, 0.95, 0.85, 0.7, 0.55, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1, 0.1],
		v6: [0.5, 0.6, 0.7, 0.85, 1.0, 0.9, 0.75, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.05, 0.05]
	};

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

	// Generate SVG path for engagement heatmap
	function generateEngagementPath(data: number[]): string {
		const width = 100;
		const height = 100;
		const step = width / (data.length - 1);

		// Start from bottom-left
		let path = `M 0 ${height}`;

		// Draw the curve
		data.forEach((value, i) => {
			const x = i * step;
			const y = height - (value * height * 0.8); // Scale to 80% of height

			if (i === 0) {
				path += ` L ${x} ${y}`;
			} else {
				// Smooth curve using quadratic bezier
				const prevX = (i - 1) * step;
				const midX = (prevX + x) / 2;
				path += ` Q ${prevX + step/2} ${y} ${x} ${y}`;
			}
		});

		// Close path back to bottom-right and bottom-left
		path += ` L ${width} ${height} L 0 ${height} Z`;

		return path;
	}

	// Get current video's engagement data
	function getCurrentEngagementData(): number[] {
		const videoId = $videoPlayer.activeVideo?.id;
		return videoId ? (engagementData[videoId] || []) : [];
	}

	let showEngagementTooltip = $state(false);
	let engagementTooltipX = $state(0);
	let engagementTooltipValue = $state(0);

	function handleProgressHover(e: MouseEvent) {
		const bar = e.currentTarget as HTMLElement;
		const rect = bar.getBoundingClientRect();
		const percent = (e.clientX - rect.left) / rect.width;
		const data = getCurrentEngagementData();

		if (data.length > 0) {
			const index = Math.min(Math.floor(percent * data.length), data.length - 1);
			engagementTooltipX = percent * 100;
			engagementTooltipValue = Math.round(data[index] * 100);
			showEngagementTooltip = true;
		}
	}

	function handleProgressLeave() {
		showEngagementTooltip = false;
	}

	let videoElement: HTMLVideoElement | null = $state(null);
	let playerContainer: HTMLDivElement | null = $state(null);
	let progressPercent = $state(0);

	// Sync video element with store state when player is active
	$effect(() => {
		if (videoElement && $videoPlayer.mode !== 'hidden') {
			if ($videoPlayer.isPlaying) {
				videoElement.play().catch(() => {});
			} else {
				videoElement.pause();
			}
		}
	});

	// Handle native fullscreen changes
	$effect(() => {
		function handleFullscreenChange() {
			if (!document.fullscreenElement && $videoPlayer.mode === 'fullscreen') {
				videoPlayer.exitFullscreen();
			}
		}
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
	});

	$effect(() => {
		if (videoElement) {
			videoElement.volume = $videoPlayer.volume;
			videoElement.muted = $videoPlayer.muted;
		}
	});

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

	function closePlayer() {
		videoPlayer.close();
	}

	function handleTimeUpdate() {
		if (videoElement) {
			videoPlayer.updateTime(videoElement.currentTime);
			progressPercent = (videoElement.currentTime / videoElement.duration) * 100;
		}
	}

	function handleLoadedMetadata() {
		if (videoElement) {
			videoPlayer.setDuration(videoElement.duration);
			// Resume from previous position if available
			if ($videoPlayer.currentTime > 0) {
				videoElement.currentTime = $videoPlayer.currentTime;
			}
		}
	}

	function handleProgressClick(e: MouseEvent) {
		const bar = e.currentTarget as HTMLElement;
		const rect = bar.getBoundingClientRect();
		const percent = (e.clientX - rect.left) / rect.width;
		if (videoElement) {
			videoElement.currentTime = percent * videoElement.duration;
		}
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	async function toggleFullscreen() {
		if (!playerContainer) return;

		if (document.fullscreenElement) {
			await document.exitFullscreen();
			videoPlayer.exitFullscreen();
		} else {
			await playerContainer.requestFullscreen();
			videoPlayer.enterFullscreen();
		}
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

		<div class="videos-grid">
			{#each videos as video}
				<button class="video-card" onclick={() => playVideo(video)}>
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

{#if ($videoPlayer.mode === 'modal' || $videoPlayer.mode === 'fullscreen') && $videoPlayer.activeVideo}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="video-player-overlay"
		class:is-fullscreen={$videoPlayer.mode === 'fullscreen'}
		onclick={closePlayer}
		onkeydown={(e) => e.key === 'Escape' && closePlayer()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
		<div bind:this={playerContainer} class="video-player" class:is-fullscreen={$videoPlayer.mode === 'fullscreen'} onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="document">
			<div class="player-header">
				<button
					class="header-button"
					onclick={() => videoPlayer.minimize()}
					aria-label="Minimize to mini-player"
				>
					<Minimize2 size={18} />
				</button>
				<button class="header-button close" onclick={closePlayer} aria-label="Close video">
					<X size={18} />
				</button>
			</div>
			<div class="player-content">
				<div class="player-video">
					<video
						bind:this={videoElement}
						src={$videoPlayer.activeVideo.src}
						ontimeupdate={handleTimeUpdate}
						onloadedmetadata={handleLoadedMetadata}
						onended={() => videoPlayer.pause()}
						autoplay
						playsinline
					>
						<track kind="captions" />
					</video>
					<div class="player-controls">
						<div class="controls-bar">
							<button
								class="control-button"
								onclick={() => videoPlayer.togglePlay()}
								aria-label={$videoPlayer.isPlaying ? 'Pause' : 'Play'}
							>
								{#if $videoPlayer.isPlaying}
									<Pause size={24} />
								{:else}
									<Play size={24} />
								{/if}
							</button>
							<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
							<div
								class="progress-bar"
								onclick={handleProgressClick}
								onmousemove={handleProgressHover}
								onmouseleave={handleProgressLeave}
							>
								<!-- Engagement heatmap visualization -->
								{#if getCurrentEngagementData().length > 0}
									<svg class="engagement-heatmap" viewBox="0 0 100 100" preserveAspectRatio="none">
										<defs>
											<linearGradient id="engagementGradient" x1="0%" y1="100%" x2="0%" y2="0%">
												<stop offset="0%" stop-color="rgba(124, 43, 238, 0)" />
												<stop offset="50%" stop-color="rgba(124, 43, 238, 0.4)" />
												<stop offset="100%" stop-color="rgba(124, 43, 238, 0.8)" />
											</linearGradient>
										</defs>
										<path
											d={generateEngagementPath(getCurrentEngagementData())}
											fill="url(#engagementGradient)"
										/>
									</svg>
								{/if}
								<div class="progress-fill" style="width: {progressPercent}%"></div>
								<!-- Engagement tooltip -->
								{#if showEngagementTooltip}
									<div class="engagement-tooltip" style="left: {engagementTooltipX}%">
										<span class="tooltip-label">Most Replayed</span>
										<span class="tooltip-value">{engagementTooltipValue}% of viewers watched this</span>
									</div>
								{/if}
							</div>
							<span class="time-display">
								{formatTime($videoPlayer.currentTime)} / {formatTime($videoPlayer.duration)}
							</span>
							<button
								class="control-button"
								onclick={() => videoPlayer.toggleMute()}
								aria-label={$videoPlayer.muted ? 'Unmute' : 'Mute'}
							>
								{#if $videoPlayer.muted}
									<VolumeX size={24} />
								{:else}
									<Volume2 size={24} />
								{/if}
							</button>
							<button
								class="control-button"
								onclick={() => videoPlayer.minimize()}
								aria-label="Minimize video"
							>
								<Minimize2 size={24} />
							</button>
							<button
								class="control-button"
								onclick={toggleFullscreen}
								aria-label={$videoPlayer.mode === 'fullscreen' ? 'Exit fullscreen' : 'Enter fullscreen'}
							>
								<Maximize2 size={24} />
							</button>
						</div>
					</div>
				</div>
				<div class="player-info">
					<span class="player-category">{$videoPlayer.activeVideo.category}</span>
					<h3 class="player-title">{$videoPlayer.activeVideo.title}</h3>
					<p class="player-description">{$videoPlayer.activeVideo.description}</p>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if $videoPlayer.mode === 'mini' && $videoPlayer.activeVideo}
	<div class="mini-player">
		<div class="mini-player-video">
			<video
				bind:this={videoElement}
				src={$videoPlayer.activeVideo.src}
				ontimeupdate={handleTimeUpdate}
				onloadedmetadata={handleLoadedMetadata}
				onended={() => videoPlayer.pause()}
				autoplay
				playsinline
				muted={$videoPlayer.muted}
			>
				<track kind="captions" />
			</video>
			<div class="mini-player-overlay">
				<button
					class="mini-control-button"
					onclick={() => videoPlayer.togglePlay()}
					aria-label={$videoPlayer.isPlaying ? 'Pause' : 'Play'}
				>
					{#if $videoPlayer.isPlaying}
						<Pause size={20} />
					{:else}
						<Play size={20} />
					{/if}
				</button>
			</div>
		</div>
		<div class="mini-player-info">
			<span class="mini-player-title">{$videoPlayer.activeVideo.title}</span>
			<div class="mini-player-actions">
				<button
					class="mini-action-button"
					onclick={() => videoPlayer.maximize()}
					aria-label="Expand video"
				>
					<Maximize2 size={16} />
				</button>
				<button
					class="mini-action-button"
					onclick={closePlayer}
					aria-label="Close video"
				>
					<X size={16} />
				</button>
			</div>
		</div>
		<div class="mini-progress-bar">
			<div class="mini-progress-fill" style="width: {progressPercent}%"></div>
		</div>
	</div>
{/if}

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
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.video-card:hover {
		border-color: var(--color-border-strong);
		transform: translateY(-4px);
	}

	.video-card:hover .play-button {
		transform: scale(1.1);
		background: var(--color-fg-primary);
	}

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

	.play-button {
		width: 4rem;
		height: 4rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.9);
		border-radius: 50%;
		color: var(--color-bg-pure);
		transition: all var(--duration-micro) var(--ease-standard);
	}

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
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	/* Video Player Overlay */
	.video-player-overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.9);
		padding: 2rem;
	}

	.video-player {
		position: relative;
		width: 100%;
		max-width: 56rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		overflow: hidden;
	}

	.player-header {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 10;
		display: flex;
		gap: 0.5rem;
	}

	.header-button {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		border: none;
		border-radius: 50%;
		color: var(--color-fg-primary);
		cursor: pointer;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.header-button:hover {
		background: rgba(0, 0, 0, 0.8);
	}

	.header-button.close:hover {
		background: var(--color-error-muted);
	}

	.player-content {
		display: flex;
		flex-direction: column;
	}

	.player-video {
		position: relative;
		aspect-ratio: 16 / 9;
		background: var(--color-bg-pure);
	}

	.player-video video {
		width: 100%;
		height: 100%;
		object-fit: contain;
		background: #000;
	}

	.player-controls {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 1rem;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
	}

	.controls-bar {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.control-button {
		background: none;
		border: none;
		color: var(--color-fg-primary);
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.control-button:hover {
		opacity: 0.8;
	}

	.progress-bar {
		flex: 1;
		height: 24px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		cursor: pointer;
		position: relative;
		overflow: visible;
	}

	.progress-bar:hover {
		height: 28px;
	}

	.engagement-heatmap {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border-radius: 4px;
		pointer-events: none;
	}

	.progress-fill {
		position: absolute;
		bottom: 0;
		left: 0;
		height: 3px;
		background: var(--color-primary);
		border-radius: 2px;
		transition: width 0.1s linear;
		z-index: 2;
	}

	.engagement-tooltip {
		position: absolute;
		bottom: calc(100% + 8px);
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.9);
		border: 1px solid var(--color-border-default);
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
		white-space: nowrap;
		z-index: 10;
		pointer-events: none;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.engagement-tooltip::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 6px solid transparent;
		border-top-color: rgba(0, 0, 0, 0.9);
	}

	.tooltip-label {
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--color-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.tooltip-value {
		font-size: 0.75rem;
		color: var(--color-fg-primary);
	}

	.time-display {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.player-info {
		padding: 1.5rem;
	}

	.player-category {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
	}

	.player-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.player-description {
		font-size: 1rem;
		color: var(--color-fg-muted);
		margin: 0;
		line-height: 1.6;
	}

	@media (max-width: 768px) {
		.videos-grid {
			grid-template-columns: 1fr;
		}

		.video-player-overlay {
			padding: 1rem;
		}
	}

	@media (min-width: 1024px) {
		.videos-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	/* Native fullscreen mode */
	.video-player-overlay.is-fullscreen {
		background: #000;
		padding: 0;
	}

	.video-player.is-fullscreen {
		max-width: none;
		width: 100%;
		height: 100%;
		border: none;
		border-radius: 0;
		display: flex;
		flex-direction: column;
	}

	.video-player.is-fullscreen .player-content {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.video-player.is-fullscreen .player-video {
		flex: 1;
		aspect-ratio: unset;
	}

	.video-player.is-fullscreen .player-info {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
		padding: 3rem 2rem 2rem;
		transform: translateY(100%);
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.video-player.is-fullscreen:hover .player-info {
		transform: translateY(0);
	}

	/* Mini-player (picture-in-picture style) */
	.mini-player {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: 1000;
		width: 320px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
		overflow: hidden;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	.mini-player-video {
		position: relative;
		aspect-ratio: 16 / 9;
		background: #000;
	}

	.mini-player-video video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.mini-player-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.3);
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.mini-player:hover .mini-player-overlay {
		opacity: 1;
	}

	.mini-control-button {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.9);
		border: none;
		border-radius: 50%;
		color: var(--color-bg-pure);
		cursor: pointer;
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.mini-control-button:hover {
		transform: scale(1.1);
	}

	.mini-player-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		gap: 0.75rem;
	}

	.mini-player-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
	}

	.mini-player-actions {
		display: flex;
		gap: 0.5rem;
	}

	.mini-action-button {
		width: 1.75rem;
		height: 1.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: var(--color-fg-muted);
		cursor: pointer;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.mini-action-button:hover {
		color: var(--color-fg-primary);
	}

	.mini-progress-bar {
		height: 3px;
		background: rgba(255, 255, 255, 0.2);
	}

	.mini-progress-fill {
		height: 100%;
		background: var(--color-primary);
		transition: width 0.1s linear;
	}

	@media (max-width: 480px) {
		.mini-player {
			width: calc(100% - 2rem);
			left: 1rem;
			right: 1rem;
		}
	}
</style>
