<script lang="ts">
	/**
	 * OUTERFIELDS Hero Section
	 *
	 * PCN Services sales page - "We Build Private Content Networks"
	 * CTA: Book a Discovery Call (Calendly)
	 */
	import { Play } from 'lucide-svelte';
	import { videoPlayer, type Video } from '$lib/stores/videoPlayer';

	// PCN Overview video
	const overviewVideo: Video = {
		id: 'pcn-overview',
		title: 'What is a Private Content Network?',
		description: 'See how we build custom Private Content Networks for creators and brands.',
		duration: '2:30',
		thumbnail: '/thumbnails/pcn-overview.jpg',
		category: 'Overview',
		src: 'https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev/trailers/pcn-trailer.mp4'
	};

	function playOverview() {
		videoPlayer.play(overviewVideo);
	}

	function bookDiscoveryCall() {
		// TODO: Replace with actual Calendly URL when provided
		window.open('https://calendly.com/outerfields/discovery-call', '_blank');
	}
</script>

<section class="hero">
	<!-- Background with 3D galaxy embed -->
	<div class="hero-backdrop">
		<iframe
			title="OUTERFIELDS 3D Experience"
			class="sketchfab-embed"
			frameborder="0"
			allow="autoplay; fullscreen"
			src="https://sketchfab.com/models/d6521362b37b48e3a82bce4911409303/embed?autospin=0.2&autostart=1&preload=1&ui_infos=0&ui_stop=0&ui_inspector=0&ui_watermark_link=0&ui_watermark=0&ui_hint=0&ui_ar=1&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0&ui_theme=dark&dnt=1"
		></iframe>
		<div class="hero-gradient"></div>
	</div>

	<!-- Centered play button overlay -->
	<button class="play-overlay" onclick={playOverview} aria-label="Play overview video">
		<div class="play-button-pulse">
			<Play size={32} />
		</div>
	</button>

	<!-- Container for alignment -->
	<div class="hero-container">
		<div class="hero-content">
			<!-- Main Title -->
			<h1 class="hero-title">Outerfields</h1>

			<!-- Subheadline -->
			<p class="hero-subheadline">We Build Private Content Networks</p>

			<!-- Supporting Text -->
			<p class="hero-supporting">
				Full-service PCN creation for creators and brands ready to own their platform
			</p>

			<!-- CTA Button -->
			<div class="hero-actions">
				<button class="btn-cta" onclick={bookDiscoveryCall}>
					Book a Discovery Call
				</button>
			</div>
		</div>
	</div>
</section>

<style>
	.hero {
		position: relative;
		height: 100vh;
		min-height: 600px;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 1.5rem;
		overflow: hidden;
	}

	.hero-container {
		width: 100%;
		max-width: var(--container-max-width);
		margin: 0 auto;
		text-align: center;
	}

	.hero-backdrop {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	.hero-backdrop :global(.sketchfab-embed) {
		width: 100%;
		height: 120%;
		border: none;
		pointer-events: none;
		transform: scale(1.1);
		transform-origin: center center;
	}

	/* Gradient overlay for readability */
	.hero-gradient {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			0deg,
			var(--color-bg-pure) 0%,
			var(--color-bg-pure) 5%,
			rgba(30, 30, 30, 0.85) 40%,
			rgba(30, 30, 30, 0.6) 70%,
			rgba(30, 30, 30, 0.7) 100%
		);
	}

	/* Centered pulsing play button */
	.play-overlay {
		position: absolute;
		top: 40%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 15;
		background: transparent;
		border: none;
		cursor: pointer;
	}

	.play-button-pulse {
		width: 5rem;
		height: 5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		color: white;
		backdrop-filter: blur(8px);
		animation: pulse-scale 2s ease-in-out infinite;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.play-button-pulse:hover {
		background: rgba(244, 81, 38, 0.2);
		border-color: var(--color-sun);
		transform: scale(1.1);
	}

	@keyframes pulse-scale {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.05);
		}
	}

	.hero-content {
		position: relative;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		margin-top: 15vh;
	}

	/* Main Title - Space Grotesk Bold, 72px equivalent */
	.hero-title {
		font-size: clamp(3rem, 8vw, 4.5rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		line-height: 1;
		letter-spacing: -0.02em;
		text-shadow: 0 4px 40px rgba(0, 0, 0, 0.5);
		margin: 0;
	}

	/* Subheadline - Space Grotesk Regular, 24px */
	.hero-subheadline {
		font-size: clamp(1.25rem, 3vw, 1.5rem);
		font-weight: 400;
		color: var(--color-fg-primary);
		line-height: 1.3;
		margin: 0;
	}

	/* Supporting text - 18px, Slate Metal color */
	.hero-supporting {
		font-size: clamp(1rem, 2vw, 1.125rem);
		color: var(--color-slate);
		line-height: 1.5;
		max-width: 32rem;
		margin: 0;
	}

	/* CTA Button - Sun color */
	.hero-actions {
		margin-top: var(--space-lg);
	}

	.btn-cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 1rem 2.5rem;
		background: var(--color-sun);
		color: white;
		font-size: 1.125rem;
		font-weight: 700;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
		min-width: 180px;
	}

	.btn-cta:hover {
		background: var(--color-primary-hover);
		transform: scale(1.02);
	}

	.btn-cta:active {
		transform: scale(0.98);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero {
			height: 90vh;
			min-height: 550px;
			padding: 0 1rem;
		}

		.hero-content {
			margin-top: 20vh;
		}

		.play-button-pulse {
			width: 4rem;
			height: 4rem;
		}

		.hero-title {
			font-size: clamp(2.5rem, 10vw, 3.5rem);
		}

		.hero-subheadline {
			font-size: 1.25rem;
		}

		.hero-supporting {
			font-size: 1rem;
			padding: 0 1rem;
		}

		.btn-cta {
			width: 100%;
			max-width: 300px;
		}
	}

	@media (max-width: 480px) {
		.hero {
			height: 85vh;
			min-height: 500px;
		}

		.hero-content {
			gap: var(--space-sm);
		}

		.hero-title {
			font-size: clamp(2rem, 12vw, 2.5rem);
		}

		.hero-subheadline {
			font-size: 1.125rem;
		}

		.btn-cta {
			padding: 0.875rem 2rem;
			font-size: 1rem;
		}
	}
</style>
