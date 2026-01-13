<script lang="ts">
	/**
	 * OUTERFIELDS Hero Section
	 *
	 * Reuses the Sketchfab 3D embed from the demo page.
	 * Shows title "Building Outerfields: The Odyssey" with centered play button.
	 */
	function handlePlayClick() {
		window.location.href = '/videos/outerfields-trailer';
	}
</script>

<section class="hero">
	<div class="hero-backdrop">
		<!-- Reuse Sketchfab 3D embed from demo page -->
		<iframe
			title="OUTERFIELDS 3D Experience"
			class="sketchfab-embed"
			frameborder="0"
			allowfullscreen
			mozallowfullscreen="true"
			webkitallowfullscreen="true"
			allow="autoplay; fullscreen; xr-spatial-tracking"
			xr-spatial-tracking
			execution-while-out-of-viewport
			execution-while-not-rendered
			web-share
			src="https://sketchfab.com/models/d6521362b37b48e3a82bce4911409303/embed?autospin=0.2&autostart=1&preload=1&ui_infos=0&ui_stop=0&ui_inspector=0&ui_watermark_link=0&ui_watermark=0&ui_hint=0&ui_ar=1&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0&ui_theme=dark&dnt=1"
		></iframe>
		<div class="hero-gradient"></div>
	</div>

	<div class="hero-content">
		<h1 class="hero-title">Building Outerfields: The Odyssey</h1>

		<button class="play-button" onclick={handlePlayClick} aria-label="Play trailer">
			<svg class="play-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
			</svg>
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
			transparent 0%,
			rgba(0, 0, 0, 0.3) 50%,
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

	.hero-title {
		font-size: var(--text-display);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xl);
		text-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);
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

	.play-icon {
		width: 48px;
		height: 48px;
		color: var(--color-fg-primary);
		margin-left: 8px;
	}

	@media (max-width: 768px) {
		.hero {
			min-height: 500px;
			max-height: 700px;
		}

		.hero-title {
			font-size: var(--text-h1);
		}

		.play-button {
			width: 90px;
			height: 90px;
		}

		.play-icon {
			width: 36px;
			height: 36px;
		}
	}

	@media (max-width: 480px) {
		.hero {
			min-height: 400px;
			max-height: 600px;
		}

		.hero-title {
			font-size: var(--text-h2);
		}

		.play-button {
			width: 75px;
			height: 75px;
		}

		.play-icon {
			width: 30px;
			height: 30px;
		}
	}
</style>
