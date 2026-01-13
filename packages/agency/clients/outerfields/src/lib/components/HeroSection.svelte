<script lang="ts">
	/**
	 * OUTERFIELDS Hero Section
	 *
	 * Reuses the Sketchfab 3D embed from the demo page.
	 * Shows title with centered play button that opens Texas State Fair video.
	 */
	import { Target, Play } from 'lucide-svelte';
	import { videoPlayer, type Video } from '$lib/stores/videoPlayer';

	// Cloudflare R2 CDN base URL
	const CDN_BASE = 'https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev';

	// Hero video: STACCATO Prairie Fire Gun Range Promo
	const heroVideo: Video = {
		id: 'hero-staccato',
		title: 'STACCATO Prairie Fire Gun Range Promo',
		description: 'Prairie Fire Gun Range promotional trailer',
		duration: '1:16',
		thumbnail: `${CDN_BASE}/thumbnails/staccato-promo.jpg`,
		category: 'Promo',
		src: `${CDN_BASE}/videos/staccato-promo.mp4`
	};

	function handlePlayClick() {
		videoPlayer.play(heroVideo);
	}
</script>

<section class="hero">
	<div class="hero-backdrop">
		<!-- Reuse Sketchfab 3D embed from demo page -->
		<iframe
			title="OUTERFIELDS 3D Experience"
			class="sketchfab-embed"
			frameborder="0"
			allow="autoplay; fullscreen"
			src="https://sketchfab.com/models/d6521362b37b48e3a82bce4911409303/embed?autospin=0.2&autostart=1&preload=1&ui_infos=0&ui_stop=0&ui_inspector=0&ui_watermark_link=0&ui_watermark=0&ui_hint=0&ui_ar=1&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0&ui_theme=dark&dnt=1"
		></iframe>
		<div class="hero-gradient"></div>
	</div>

	<div class="hero-content">
		<div class="hero-badge">
			<span class="badge-text">
				<Target size={16} />
				Founding Member Pre-Sale - Limited Time Only
			</span>
		</div>

		<h1 class="hero-title">OUTERFIELDS</h1>

		<p class="hero-subtitle">
			A premium content network experience. Browse the preview like Netflix—most content and tools are
			members-only. Founding members get lifetime access for <strong>$99</strong>.
		</p>

		<button class="play-button" onclick={handlePlayClick} aria-label="Play trailer">
			<Play class="play-icon" />
		</button>
	</div>
</section>

<style>
	.hero {
		position: relative;
		height: 100vh;
		min-height: 600px;
		max-height: 900px;
		margin-bottom: 2rem;
		overflow: hidden;
		background: var(--color-bg-pure);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hero-backdrop {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}

	.hero-backdrop :global(.sketchfab-embed) {
		width: 100%;
		height: 120%;
		border: none;
		pointer-events: none;
		transform: scale(1.1);
		transform-origin: center center;
	}

	.hero-gradient {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0.55) 0%,
			rgba(0, 0, 0, 0.65) 45%,
			rgba(0, 0, 0, 0.75) 70%,
			var(--color-bg-pure) 100%
		);
	}

	.hero-content {
		position: relative;
		z-index: 10;
		text-align: center;
		max-width: 800px;
		padding: var(--space-lg);
	}

	.hero-badge {
		margin-bottom: var(--space-md);
	}

	.badge-text {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(170, 136, 68, 0.2);
		border: 1px solid var(--color-warning-border);
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-warning);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		backdrop-filter: blur(10px);
	}

	.hero-title {
		font-size: var(--text-display);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		text-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);
	}

	.hero-subtitle {
		font-size: 1.25rem;
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xl);
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
		line-height: 1.6;
	}

	.hero-subtitle strong {
		color: var(--color-warning);
		font-weight: 700;
	}

	.play-button {
		width: 120px;
		height: 120px;
		border-radius: var(--radius-full);
		background: rgba(255, 255, 255, 0.1);
		border: 3px solid var(--color-fg-primary);
		cursor: pointer;
		transition: all var(--duration-standard) var(--ease-standard);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto;
		backdrop-filter: blur(10px);
	}

	.play-button:hover {
		transform: scale(1.1);
		background: rgba(255, 255, 255, 0.2);
		border-color: var(--color-fg-secondary);
		box-shadow: 0 0 40px rgba(255, 255, 255, 0.3);
	}

	.play-button:active {
		transform: scale(1.05);
	}

	:global(.play-icon) {
		width: 48px;
		height: 48px;
		color: var(--color-fg-primary);
	}

	@media (max-width: 768px) {
		.hero {
			min-height: 500px;
			max-height: 700px;
		}

		.badge-text {
			font-size: 0.75rem;
			padding: 0.375rem 0.75rem;
		}

		.hero-title {
			font-size: var(--text-h1);
		}

		.hero-subtitle {
			font-size: 1.125rem;
		}

		.play-button {
			width: 90px;
			height: 90px;
		}

		:global(.play-icon) {
			width: 36px;
			height: 36px;
		}
	}

	@media (max-width: 480px) {
		.hero {
			min-height: 400px;
			max-height: 600px;
		}

		.badge-text {
			font-size: 0.6875rem;
		}

		.hero-title {
			font-size: var(--text-h2);
		}

		.hero-subtitle {
			font-size: 1rem;
		}

		.play-button {
			width: 75px;
			height: 75px;
		}

		:global(.play-icon) {
			width: 30px;
			height: 30px;
		}
	}
</style>
