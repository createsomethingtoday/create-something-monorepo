<script lang="ts">
	/**
	 * WatchPagePlayer Component
	 *
	 * Enhanced video player for the dedicated /watch/[id] page.
	 * Features:
	 * - Full-width responsive player
	 * - Engagement heatmap ("Most Replayed")
	 * - Keyboard shortcuts (space, arrows, f)
	 * - Theater mode toggle
	 * - Playback speed controls
	 * - Fullscreen support
	 */
	import {
		Play,
		Pause,
		Volume2,
		VolumeX,
		Maximize2,
		Minimize2,
		Settings,
		MonitorPlay
	} from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';
	import { engagementStats } from '$lib/stores/engagementStats';
	import { browser } from '$app/environment';

	interface Props {
		videoId: string;
		src: string;
		poster?: string;
		title: string;
		autoplay?: boolean;
		onTimeUpdate?: (currentTime: number, duration: number) => void;
	}

	let {
		videoId,
		src,
		poster,
		title,
		autoplay = false,
		onTimeUpdate
	}: Props = $props();

	// Player state
	let videoElement: HTMLVideoElement | null = $state(null);
	let playerContainer: HTMLDivElement | null = $state(null);
	let isPlaying = $state(false);
	let currentTime = $state(0);
	let duration = $state(0);
	let volume = $state(1);
	let isMuted = $state(false);
	let isFullscreen = $state(false);
	let isTheaterMode = $state(false);
	let playbackRate = $state(1);
	let showControls = $state(true);
	let showSettingsMenu = $state(false);
	let progressPercent = $state(0);

	// Engagement heatmap state
	let showEngagementTooltip = $state(false);
	let engagementTooltipX = $state(0);
	let engagementTooltipValue = $state(0);

	// Control visibility timer
	let controlsTimer: ReturnType<typeof setTimeout> | null = null;

	const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

	// Generate SVG path for engagement heatmap
	function generateEngagementPath(data: number[]): string {
		if (data.length === 0) return '';
		const width = 100;
		const height = 100;
		const step = width / (data.length - 1 || 1);

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
		return $engagementStats.data[videoId] || [];
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

	function handleProgressClick(e: MouseEvent) {
		const bar = e.currentTarget as HTMLElement;
		const rect = bar.getBoundingClientRect();
		const percent = (e.clientX - rect.left) / rect.width;
		if (videoElement && Number.isFinite(videoElement.duration)) {
			const newTime = percent * videoElement.duration;
			const oldTime = videoElement.currentTime;

			// Track replay if seeking backwards
			if (newTime < oldTime - 2) {
				engagementStats.trackReplay(videoId, newTime, videoElement.duration);
			}

			videoElement.currentTime = newTime;
		}
	}

	function handleTimeUpdate() {
		if (videoElement) {
			currentTime = videoElement.currentTime;
			duration = videoElement.duration || 0;
			progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

			// Track engagement during playback
			if (duration > 0 && isPlaying) {
				engagementStats.trackWatch(videoId, currentTime, duration);
			}

			onTimeUpdate?.(currentTime, duration);
		}
	}

	function handleLoadedMetadata() {
		if (videoElement) {
			duration = videoElement.duration;
		}
	}

	function togglePlay() {
		if (videoElement) {
			if (isPlaying) {
				videoElement.pause();
			} else {
				videoElement.play().catch(() => {});
			}
		}
	}

	function toggleMute() {
		if (videoElement) {
			isMuted = !isMuted;
			videoElement.muted = isMuted;
		}
	}

	function setVolume(newVolume: number) {
		if (videoElement) {
			volume = Math.max(0, Math.min(1, newVolume));
			videoElement.volume = volume;
			isMuted = volume === 0;
		}
	}

	function setPlaybackSpeed(speed: number) {
		if (videoElement) {
			playbackRate = speed;
			videoElement.playbackRate = speed;
		}
		showSettingsMenu = false;
	}

	async function toggleFullscreen() {
		if (!playerContainer) return;

		if (document.fullscreenElement) {
			await document.exitFullscreen();
		} else {
			await playerContainer.requestFullscreen();
		}
	}

	function toggleTheaterMode() {
		isTheaterMode = !isTheaterMode;
	}

	function seekRelative(delta: number) {
		if (videoElement) {
			const newTime = Math.max(0, Math.min(duration, currentTime + delta));
			videoElement.currentTime = newTime;
		}
	}

	function formatTime(seconds: number): string {
		if (!Number.isFinite(seconds)) return '0:00';
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		if (hrs > 0) {
			return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		}
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function resetControlsTimer() {
		showControls = true;
		if (controlsTimer) clearTimeout(controlsTimer);
		controlsTimer = setTimeout(() => {
			if (isPlaying) showControls = false;
		}, 3000);
	}

	function handleKeydown(e: KeyboardEvent) {
		// Don't handle if user is typing in an input
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

		switch (e.key) {
			case ' ':
			case 'k':
				e.preventDefault();
				togglePlay();
				break;
			case 'ArrowLeft':
			case 'j':
				e.preventDefault();
				seekRelative(-10);
				break;
			case 'ArrowRight':
			case 'l':
				e.preventDefault();
				seekRelative(10);
				break;
			case 'ArrowUp':
				e.preventDefault();
				setVolume(volume + 0.1);
				break;
			case 'ArrowDown':
				e.preventDefault();
				setVolume(volume - 0.1);
				break;
			case 'f':
				e.preventDefault();
				toggleFullscreen();
				break;
			case 't':
				e.preventDefault();
				toggleTheaterMode();
				break;
			case 'm':
				e.preventDefault();
				toggleMute();
				break;
			case 'Escape':
				if (showSettingsMenu) {
					showSettingsMenu = false;
				}
				break;
		}
	}

	function handleFullscreenChange() {
		isFullscreen = !!document.fullscreenElement;
	}

	// Fetch engagement data on mount
	onMount(() => {
		engagementStats.fetchEngagement(videoId);
		engagementStats.resetTracking(videoId);

		if (browser) {
			document.addEventListener('keydown', handleKeydown);
			document.addEventListener('fullscreenchange', handleFullscreenChange);
		}
	});

	onDestroy(() => {
		if (controlsTimer) clearTimeout(controlsTimer);
		if (browser) {
			document.removeEventListener('keydown', handleKeydown);
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
		}
		// Flush any pending engagement events
		engagementStats.flushEvents();
	});

	// Sync play state with video element
	$effect(() => {
		if (videoElement) {
			videoElement.onplay = () => (isPlaying = true);
			videoElement.onpause = () => (isPlaying = false);
		}
	});
</script>

<div
	bind:this={playerContainer}
	class="watch-player"
	class:theater-mode={isTheaterMode}
	class:fullscreen={isFullscreen}
	onmousemove={resetControlsTimer}
	onmouseleave={() => isPlaying && (showControls = false)}
	role="application"
	aria-label="Video player for {title}"
>
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		bind:this={videoElement}
		{src}
		poster={poster}
		ontimeupdate={handleTimeUpdate}
		onloadedmetadata={handleLoadedMetadata}
		onended={() => (isPlaying = false)}
		onclick={togglePlay}
		autoplay={autoplay}
		playsinline
		class="video-element"
	>
		<track kind="captions" />
	</video>

	<!-- Play/Pause overlay button -->
	<button
		class="center-play-button"
		class:visible={!isPlaying}
		onclick={togglePlay}
		aria-label={isPlaying ? 'Pause' : 'Play'}
	>
		{#if isPlaying}
			<Pause size={48} />
		{:else}
			<Play size={48} />
		{/if}
	</button>

	<!-- Controls overlay -->
	<div class="controls-overlay" class:visible={showControls || !isPlaying}>
		<!-- Progress bar -->
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class="progress-bar-container"
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
							id="watchEngagementGradient"
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
						fill="url(#watchEngagementGradient)"
					/>
				</svg>
			{/if}
			<div class="progress-bar">
				<div class="progress-fill" style="width: {progressPercent}%"></div>
			</div>
			{#if showEngagementTooltip}
				<div class="engagement-tooltip" style="left: {engagementTooltipX}%">
					<span class="tooltip-label">Most Replayed</span>
					<span class="tooltip-value">{engagementTooltipValue}% of viewers watched this</span>
				</div>
			{/if}
		</div>

		<!-- Controls bar -->
		<div class="controls-bar">
			<div class="controls-left">
				<button class="control-btn" onclick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
					{#if isPlaying}
						<Pause size={24} />
					{:else}
						<Play size={24} />
					{/if}
				</button>

				<button class="control-btn" onclick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
					{#if isMuted || volume === 0}
						<VolumeX size={24} />
					{:else}
						<Volume2 size={24} />
					{/if}
				</button>

				<input
					type="range"
					class="volume-slider"
					min="0"
					max="1"
					step="0.1"
					value={isMuted ? 0 : volume}
					oninput={(e) => setVolume(parseFloat(e.currentTarget.value))}
					aria-label="Volume"
				/>

				<span class="time-display">
					{formatTime(currentTime)} / {formatTime(duration)}
				</span>
			</div>

			<div class="controls-right">
				<!-- Settings menu -->
				<div class="settings-wrapper">
					<button
						class="control-btn"
						onclick={() => (showSettingsMenu = !showSettingsMenu)}
						aria-label="Settings"
					>
						<Settings size={20} />
						{#if playbackRate !== 1}
							<span class="speed-indicator">{playbackRate}x</span>
						{/if}
					</button>

					{#if showSettingsMenu}
						<div class="settings-menu">
							<div class="settings-section">
								<span class="settings-label">Playback Speed</span>
								<div class="speed-options">
									{#each playbackSpeeds as speed}
										<button
											class="speed-option"
											class:active={playbackRate === speed}
											onclick={() => setPlaybackSpeed(speed)}
										>
											{speed}x
										</button>
									{/each}
								</div>
							</div>
						</div>
					{/if}
				</div>

				<button
					class="control-btn"
					onclick={toggleTheaterMode}
					aria-label={isTheaterMode ? 'Exit theater mode' : 'Theater mode'}
					title="Theater mode (t)"
				>
					<MonitorPlay size={20} />
				</button>

				<button
					class="control-btn"
					onclick={toggleFullscreen}
					aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
					title="Fullscreen (f)"
				>
					{#if isFullscreen}
						<Minimize2 size={20} />
					{:else}
						<Maximize2 size={20} />
					{/if}
				</button>
			</div>
		</div>
	</div>

	<!-- Keyboard shortcuts hint (shown briefly) -->
	<div class="keyboard-hint" class:visible={showControls && !isPlaying}>
		<span>Space to play • ← → to seek • F for fullscreen</span>
	</div>
</div>

<style>
	.watch-player {
		position: relative;
		width: 100%;
		background: #000;
		border-radius: var(--radius-lg);
		overflow: hidden;
		aspect-ratio: 16 / 9;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.watch-player.theater-mode {
		border-radius: 0;
		max-width: none;
	}

	.watch-player.fullscreen {
		border-radius: 0;
		position: fixed;
		inset: 0;
		z-index: 9999;
		aspect-ratio: unset;
	}

	.video-element {
		width: 100%;
		height: 100%;
		object-fit: contain;
		cursor: pointer;
	}

	/* Center play button */
	.center-play-button {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%) scale(0.9);
		width: 80px;
		height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(8px);
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		color: white;
		cursor: pointer;
		opacity: 0;
		transition: all var(--duration-micro) var(--ease-standard);
		z-index: 5;
	}

	.center-play-button.visible {
		opacity: 1;
		transform: translate(-50%, -50%) scale(1);
	}

	.center-play-button:hover {
		background: rgba(0, 0, 0, 0.8);
		border-color: rgba(255, 255, 255, 0.5);
		transform: translate(-50%, -50%) scale(1.05);
	}

	/* Controls overlay */
	.controls-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 2rem 1rem 1rem;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, transparent 100%);
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
		z-index: 10;
	}

	.controls-overlay.visible {
		opacity: 1;
	}

	/* Progress bar */
	.progress-bar-container {
		position: relative;
		height: 32px;
		margin-bottom: 0.75rem;
		cursor: pointer;
	}

	.engagement-heatmap {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		border-radius: 4px;
	}

	.progress-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 4px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 2px;
		transition: height var(--duration-micro) var(--ease-standard);
	}

	.progress-bar-container:hover .progress-bar {
		height: 6px;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-fg-primary);
		border-radius: 2px;
		transition: width 0.1s linear;
	}

	.engagement-tooltip {
		position: absolute;
		bottom: calc(100% + 8px);
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.95);
		border: 1px solid var(--color-border-default);
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
		white-space: nowrap;
		z-index: 20;
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
		border-top-color: rgba(0, 0, 0, 0.95);
	}

	.tooltip-label {
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--color-brand);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.tooltip-value {
		font-size: 0.75rem;
		color: var(--color-fg-primary);
	}

	/* Controls bar */
	.controls-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.controls-left,
	.controls-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.control-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.5rem;
		background: none;
		border: none;
		color: var(--color-fg-primary);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.control-btn:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.speed-indicator {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.125rem 0.25rem;
		background: var(--color-brand);
		border-radius: 2px;
	}

	.volume-slider {
		width: 80px;
		height: 4px;
		accent-color: var(--color-fg-primary);
		cursor: pointer;
	}

	.time-display {
		font-size: 0.8125rem;
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		margin-left: 0.5rem;
	}

	/* Settings menu */
	.settings-wrapper {
		position: relative;
	}

	.settings-menu {
		position: absolute;
		bottom: calc(100% + 0.5rem);
		right: 0;
		background: rgba(0, 0, 0, 0.95);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: 0.75rem;
		min-width: 180px;
		z-index: 30;
	}

	.settings-label {
		display: block;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}

	.speed-options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.speed-option {
		padding: 0.375rem 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.speed-option:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.speed-option.active {
		background: var(--color-fg-primary);
		border-color: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	/* Keyboard hint */
	.keyboard-hint {
		position: absolute;
		bottom: 5rem;
		left: 50%;
		transform: translateX(-50%);
		padding: 0.5rem 1rem;
		background: rgba(0, 0, 0, 0.8);
		border-radius: var(--radius-md);
		font-size: 0.75rem;
		color: var(--color-fg-muted);
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard);
		pointer-events: none;
		z-index: 5;
	}

	.keyboard-hint.visible {
		opacity: 1;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.controls-overlay {
			padding: 1.5rem 0.75rem 0.75rem;
		}

		.volume-slider {
			display: none;
		}

		.time-display {
			font-size: 0.75rem;
		}

		.keyboard-hint {
			display: none;
		}

		.center-play-button {
			width: 64px;
			height: 64px;
		}
	}

	@media (max-width: 480px) {
		.controls-bar {
			gap: 0.5rem;
		}

		.control-btn {
			padding: 0.375rem;
		}
	}
</style>
