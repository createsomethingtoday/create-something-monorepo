<script lang="ts">
	/**
	 * OUTERFIELDS Mini Player
	 *
	 * Persistent video player that shows in bottom-right corner
	 * when user navigates away from fullscreen video
	 */
	import { Play, Pause, X, Maximize2, Volume2, VolumeX } from 'lucide-svelte';
	import { videoPlayer } from '$lib/stores/videoPlayer';

	let videoElement: HTMLVideoElement | null = $state(null);
	let progressPercent = $state(0);

	// Sync video element with store state
	$effect(() => {
		if (videoElement && $videoPlayer.activeVideo) {
			if ($videoPlayer.isPlaying) {
				videoElement.play().catch(() => {
					// Autoplay blocked, user needs to interact
				});
			} else {
				videoElement.pause();
			}
		}
	});

	$effect(() => {
		if (videoElement) {
			videoElement.volume = $videoPlayer.volume;
			videoElement.muted = $videoPlayer.muted;
		}
	});

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
</script>

{#if $videoPlayer.mode === 'mini' && $videoPlayer.activeVideo}
	<div class="mini-player">
		<div class="mini-video-container">
			<video
				bind:this={videoElement}
				src={$videoPlayer.activeVideo.src}
				ontimeupdate={handleTimeUpdate}
				onloadedmetadata={handleLoadedMetadata}
				onended={() => videoPlayer.pause()}
				playsinline
			>
				<track kind="captions" />
			</video>
		</div>

		<div class="mini-controls">
			<div class="mini-info">
				<span class="mini-title">{$videoPlayer.activeVideo.title}</span>
				<span class="mini-time">
					{formatTime($videoPlayer.currentTime)} / {formatTime($videoPlayer.duration)}
				</span>
			</div>

			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div class="mini-progress" onclick={handleProgressClick}>
				<div class="mini-progress-fill" style="width: {progressPercent}%"></div>
			</div>

			<div class="mini-buttons">
				<button
					class="mini-btn"
					onclick={() => videoPlayer.togglePlay()}
					aria-label={$videoPlayer.isPlaying ? 'Pause' : 'Play'}
				>
					{#if $videoPlayer.isPlaying}
						<Pause size={16} />
					{:else}
						<Play size={16} />
					{/if}
				</button>

				<button
					class="mini-btn"
					onclick={() => videoPlayer.toggleMute()}
					aria-label={$videoPlayer.muted ? 'Unmute' : 'Mute'}
				>
					{#if $videoPlayer.muted}
						<VolumeX size={16} />
					{:else}
						<Volume2 size={16} />
					{/if}
				</button>

				<button
					class="mini-btn"
					onclick={() => videoPlayer.maximize()}
					aria-label="Expand video"
				>
					<Maximize2 size={16} />
				</button>

				<button
					class="mini-btn close"
					onclick={() => videoPlayer.close()}
					aria-label="Close video"
				>
					<X size={16} />
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.mini-player {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: 1000;
		width: 320px;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
		overflow: hidden;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
		animation: slideIn var(--duration-standard) var(--ease-standard);
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.mini-video-container {
		position: relative;
		aspect-ratio: 16 / 9;
		background: #000;
	}

	.mini-video-container video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.mini-controls {
		padding: 0.75rem;
		background: var(--color-bg-surface);
	}

	.mini-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.mini-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 180px;
	}

	.mini-time {
		font-size: 0.625rem;
		color: var(--color-fg-muted);
		font-variant-numeric: tabular-nums;
	}

	.mini-progress {
		height: 3px;
		background: var(--color-border-default);
		border-radius: 2px;
		margin-bottom: 0.5rem;
		cursor: pointer;
	}

	.mini-progress-fill {
		height: 100%;
		background: var(--color-primary);
		border-radius: 2px;
		transition: width 0.1s linear;
	}

	.mini-buttons {
		display: flex;
		gap: 0.25rem;
	}

	.mini-btn {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.mini-btn:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.mini-btn.close {
		margin-left: auto;
	}

	.mini-btn.close:hover {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	@media (max-width: 480px) {
		.mini-player {
			width: calc(100% - 2rem);
			left: 1rem;
			right: 1rem;
			bottom: 1rem;
		}
	}
</style>
