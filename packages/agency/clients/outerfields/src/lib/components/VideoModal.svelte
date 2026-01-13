<script lang="ts">
	/**
	 * OUTERFIELDS Video Modal
	 *
	 * Shared video player modal with full controls, mini-player (PiP),
	 * and LIVE engagement heatmap visualization ("Most Replayed").
	 *
	 * Usage:
	 *   <VideoModal />
	 *
	 * Control via videoPlayer store:
	 *   videoPlayer.play(video) - Open modal with video
	 *   videoPlayer.minimize() - Switch to mini-player
	 *   videoPlayer.close() - Close player
	 *
	 * Engagement tracking:
	 *   - Automatically tracks watch events during playback
	 *   - Tracks replay events when user seeks backwards
	 *   - Fetches and displays live aggregated data
	 */
	import { Play, Pause, X, Volume2, VolumeX, Minimize2, Maximize2 } from 'lucide-svelte';
	import { videoPlayer } from '$lib/stores/videoPlayer';
	import { engagementStats } from '$lib/stores/engagementStats';

	let videoElement: HTMLVideoElement | null = $state(null);
	let playerContainer: HTMLDivElement | null = $state(null);
	let progressPercent = $state(0);
	let showEngagementTooltip = $state(false);
	let engagementTooltipX = $state(0);
	let engagementTooltipValue = $state(0);
	let lastSeekTime = $state(0); // Track for replay detection

	// Generate SVG path for engagement heatmap
	function generateEngagementPath(data: number[]): string {
		const width = 100;
		const height = 100;
		const step = width / (data.length - 1);

		let path = `M 0 ${height}`;

		data.forEach((value, i) => {
			const x = i * step;
			const y = height - value * height * 0.8;

			if (i === 0) {
				path += ` L ${x} ${y}`;
			} else {
				path += ` Q ${(i - 1) * step + step / 2} ${y} ${x} ${y}`;
			}
		});

		path += ` L ${width} ${height} L 0 ${height} Z`;
		return path;
	}

	function getCurrentEngagementData(): number[] {
		const videoId = $videoPlayer.activeVideo?.id;
		return videoId ? $engagementStats.data[videoId] || [] : [];
	}

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

	// Fetch engagement data when a video is opened
	$effect(() => {
		const videoId = $videoPlayer.activeVideo?.id;
		if (videoId && $videoPlayer.mode !== 'hidden') {
			// Fetch live engagement data for this video
			engagementStats.fetchEngagement(videoId);
			engagementStats.resetTracking(videoId);
		}
	});

	// Sync video element with store state
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

	function closePlayer() {
		videoPlayer.close();
	}

	function handleTimeUpdate() {
		if (videoElement) {
			const currentTime = videoElement.currentTime;
			const duration = videoElement.duration;

			videoPlayer.updateTime(currentTime);
			progressPercent = (currentTime / duration) * 100;

			// Track engagement during playback
			const videoId = $videoPlayer.activeVideo?.id;
			if (videoId && duration > 0 && $videoPlayer.isPlaying) {
				engagementStats.trackWatch(videoId, currentTime, duration);
			}
		}
	}

	function handleLoadedMetadata() {
		if (videoElement) {
			videoPlayer.setDuration(videoElement.duration);
			if ($videoPlayer.currentTime > 0) {
				videoElement.currentTime = $videoPlayer.currentTime;
			}
		}
	}

	function handleProgressClick(e: MouseEvent) {
		const bar = e.currentTarget as HTMLElement;
		const rect = bar.getBoundingClientRect();
		const percent = (e.clientX - rect.left) / rect.width;
		if (videoElement && Number.isFinite(videoElement.duration)) {
			const newTime = percent * videoElement.duration;
			const oldTime = videoElement.currentTime;

			// Track replay if seeking backwards
			const videoId = $videoPlayer.activeVideo?.id;
			if (videoId && newTime < oldTime - 2) {
				// Seeked back more than 2 seconds = replay
				engagementStats.trackReplay(videoId, newTime, videoElement.duration);
			}

			videoElement.currentTime = newTime;
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

{#if ($videoPlayer.mode === 'modal' || $videoPlayer.mode === 'fullscreen') && $videoPlayer.activeVideo}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="video-player-overlay"
		class:is-fullscreen={$videoPlayer.mode === 'fullscreen'}
		onclick={(e) => e.target === e.currentTarget && closePlayer()}
		onkeydown={(e) => e.key === 'Escape' && closePlayer()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
		<div
			bind:this={playerContainer}
			class="video-player"
			class:is-fullscreen={$videoPlayer.mode === 'fullscreen'}
		>
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
								{#if getCurrentEngagementData().length > 0}
									<svg
										class="engagement-heatmap"
										viewBox="0 0 100 100"
										preserveAspectRatio="none"
									>
										<defs>
											<linearGradient
												id="engagementGradient"
												x1="0%"
												y1="100%"
												x2="0%"
												y2="0%"
											>
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
								{#if showEngagementTooltip}
									<div class="engagement-tooltip" style="left: {engagementTooltipX}%">
										<span class="tooltip-label">Most Replayed</span>
										<span class="tooltip-value"
											>{engagementTooltipValue}% of viewers watched this</span
										>
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
								aria-label={$videoPlayer.mode === 'fullscreen'
									? 'Exit fullscreen'
									: 'Enter fullscreen'}
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
				<button class="mini-action-button" onclick={closePlayer} aria-label="Close video">
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
		.video-player-overlay {
			padding: 1rem;
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
