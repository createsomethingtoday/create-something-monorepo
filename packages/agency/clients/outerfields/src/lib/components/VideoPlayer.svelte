<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import {
		shouldShowGate,
		DEFAULT_PREVIEW_DURATION,
		GATE_FADE_DURATION
	} from '$lib/utils/video-gating';

	interface Props {
		src: string;
		poster?: string;
		previewDuration?: number;
		onSubscribe?: () => void;
	}

	let {
		src,
		poster,
		previewDuration = DEFAULT_PREVIEW_DURATION,
		onSubscribe
	}: Props = $props();

	let videoElement: HTMLVideoElement | null = $state(null);
	let currentTime = $state(0);
	let showGate = $state(false);
	let gateVisible = $state(false);
	let timeCheckInterval: ReturnType<typeof setInterval> | null = null;

	// Subscribe to auth state
	const auth = $derived($authStore);
	const isMember = $derived(auth.user?.membership ?? false);

	// Check if gate should be shown
	const shouldGate = $derived(shouldShowGate(currentTime, isMember, previewDuration));

	// Update gate visibility when shouldGate changes
	$effect(() => {
		if (shouldGate && !showGate) {
			// Pause video
			if (videoElement) {
				videoElement.pause();
			}

			// Show gate with fade animation
			showGate = true;
			setTimeout(() => {
				gateVisible = true;
			}, 10);
		}
	});

	function handleTimeUpdate() {
		if (videoElement) {
			currentTime = videoElement.currentTime;
		}
	}

	function handleSubscribeClick() {
		if (onSubscribe) {
			onSubscribe();
		}
		// Default behavior: navigate to pricing section
		else {
			window.location.href = '/#pricing';
		}
	}

	// Resume playback after successful subscription
	$effect(() => {
		if (isMember && showGate) {
			// Member authenticated - hide gate and resume
			gateVisible = false;
			setTimeout(() => {
				showGate = false;
				if (videoElement) {
					videoElement.play();
				}
			}, GATE_FADE_DURATION);
		}
	});

	onMount(() => {
		// Set up time checking interval
		timeCheckInterval = setInterval(() => {
			if (videoElement && !videoElement.paused) {
				currentTime = videoElement.currentTime;
			}
		}, 100);
	});

	onDestroy(() => {
		if (timeCheckInterval) {
			clearInterval(timeCheckInterval);
		}
	});
</script>

<div class="video-player-container">
	<video
		bind:this={videoElement}
		{src}
		{poster}
		controls
		ontimeupdate={handleTimeUpdate}
		class="video-player"
	>
		<track kind="captions" />
	</video>

	{#if showGate}
		<div class="gate-overlay" class:visible={gateVisible}>
			<div class="gate-content">
				<h2 class="gate-title">Subscribe to continue watching</h2>
				<p class="gate-value">
					Join Outerfields for <strong>$99 lifetime access</strong> to:
				</p>
				<ul class="gate-benefits">
					<li>50+ hours of exclusive behind-the-scenes content</li>
					<li>Access to all 7 content categories</li>
					<li>New episodes added regularly</li>
					<li>Interactive analytics dashboard</li>
					<li>Direct creator engagement</li>
					<li>Founding member perks and merchandise</li>
				</ul>
				<button class="gate-cta" onclick={handleSubscribeClick}>
					Become a Founding Member - $99
				</button>
				<p class="gate-urgency">This price will NOT last forever</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.video-player-container {
		position: relative;
		width: 100%;
		background: var(--color-bg-pure);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.video-player {
		width: 100%;
		height: auto;
		display: block;
	}

	.gate-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.95);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard);
		pointer-events: all;
	}

	.gate-overlay.visible {
		opacity: 1;
	}

	.gate-content {
		max-width: 600px;
		padding: var(--space-xl);
		text-align: center;
	}

	.gate-title {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		font-weight: 700;
	}

	.gate-value {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
	}

	.gate-value strong {
		color: var(--color-fg-primary);
	}

	.gate-benefits {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-lg) 0;
		text-align: left;
	}

	.gate-benefits li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.gate-benefits li:last-child {
		border-bottom: none;
	}

	.gate-benefits li::before {
		content: '✓';
		color: var(--color-success);
		margin-right: var(--space-sm);
		font-weight: bold;
	}

	.gate-cta {
		width: 100%;
		padding: var(--space-md) var(--space-lg);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: var(--radius-lg);
		font-size: var(--text-body-lg);
		font-weight: 700;
		cursor: pointer;
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.gate-cta:hover {
		transform: scale(1.02);
	}

	.gate-cta:active {
		transform: scale(0.98);
	}

	.gate-urgency {
		margin-top: var(--space-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-style: italic;
	}

	@media (max-width: 768px) {
		.gate-content {
			padding: var(--space-lg);
		}

		.gate-title {
			font-size: var(--text-h3);
		}

		.gate-value {
			font-size: var(--text-body);
		}

		.gate-benefits li {
			font-size: var(--text-body-sm);
		}
	}
</style>
