<script lang="ts">
	/**
	 * OUTERFIELDS Hero Section
	 *
	 * Cinematic hero with single CTA to explore the platform
	 */
	import { Target, ArrowDown } from 'lucide-svelte';

	function scrollToJourney() {
		document.getElementById('journey')?.scrollIntoView({ behavior: 'smooth' });
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

		<h1 class="hero-title">Building Outerfields:<br /><span class="title-accent">The Odyssey</span></h1>

		<p class="hero-subtitle">
			A premium content network built in public. Browse like Netflix—trailers and first episodes are free.
			Founding members get full behind-the-scenes access for <strong>$99 lifetime</strong>.
		</p>

		<button class="cta-button" onclick={scrollToJourney}>
			<span>See How It Works</span>
			<ArrowDown size={20} />
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
		line-height: 1.1;
	}

	.hero-title :global(.title-accent) {
		font-style: italic;
		font-weight: 400;
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

	.cta-button {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 2rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: var(--radius-md);
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		transition: all var(--duration-standard) var(--ease-standard);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.cta-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 32px rgba(255, 255, 255, 0.2);
	}

	.cta-button:active {
		transform: translateY(0);
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

		.cta-button {
			padding: 0.875rem 1.5rem;
			font-size: 0.875rem;
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

		.cta-button {
			padding: 0.75rem 1.25rem;
			font-size: 0.8125rem;
		}
	}
</style>
