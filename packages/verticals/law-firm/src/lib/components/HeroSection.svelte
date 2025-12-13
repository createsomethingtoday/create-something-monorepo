<script lang="ts">
	/**
	 * HeroSection - Law Firm Hero
	 *
	 * Professional hero with firm name, tagline, and CTA.
	 * Image provides atmosphere, text provides trust.
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';

	const siteConfig = getSiteConfigFromContext();

	interface Props {
		image?: string;
		alt?: string;
		showContent?: boolean;
	}

	let {
		image = siteConfig.hero.image,
		alt = siteConfig.hero.alt,
		showContent = true
	}: Props = $props();
</script>

<section class="hero">
	<!-- Full-bleed image container -->
	<div class="hero-image-container">
		<!-- Placeholder for when image loads -->
		<div class="hero-image-placeholder"></div>
		<img
			src={image}
			{alt}
			class="hero-image"
			loading="eager"
		/>
		<!-- Overlay for text legibility -->
		<div class="hero-overlay"></div>
	</div>

	<!-- Firm identity -->
	{#if showContent}
		<div class="hero-content">
			<h1 class="firm-name">{siteConfig.name}</h1>
			<p class="firm-tagline">{siteConfig.tagline}</p>
			<div class="hero-actions">
				<a href="/contact" class="hero-cta primary">Free Consultation</a>
				<a href="tel:{siteConfig.phone}" class="hero-cta secondary">{siteConfig.phone}</a>
			</div>
		</div>
	{/if}

	<!-- Scroll indicator -->
	<div class="scroll-indicator" aria-hidden="true">
		<span class="scroll-line"></span>
	</div>
</section>

<style>
	.hero {
		position: relative;
		width: 100%;
		height: 100vh;
		height: 100dvh; /* Dynamic viewport height for mobile */
		overflow: hidden;
		background: var(--color-bg-pure);
	}

	.hero-image-container {
		position: absolute;
		inset: 0;
	}

	.hero-image-placeholder {
		position: absolute;
		inset: 0;
		background: var(--color-bg-elevated);
	}

	/* CREATE SOMETHING dark overlay treatment
	 * Philosophy: Image recedes, content emerges
	 * The overlay creates depth while maintaining the pure black brand identity
	 */
	.hero-overlay {
		position: absolute;
		inset: 0;
		background:
			/* Primary dark wash - CREATE SOMETHING signature */
			linear-gradient(
				to bottom,
				rgba(0, 0, 0, 0.8) 0%,
				rgba(0, 0, 0, 0.65) 40%,
				rgba(0, 0, 0, 0.75) 100%
			),
			/* Vignette for depth */
			radial-gradient(
				ellipse at center,
				transparent 10%,
				rgba(0, 0, 0, 0.5) 100%
			);
		pointer-events: none;
		z-index: 1;
	}

	.hero-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		animation: image-reveal 1.2s var(--ease-decelerate) 0.3s forwards;
	}

	@keyframes image-reveal {
		from {
			opacity: 0;
			transform: scale(1.02);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* Hero content - firm identity */
	.hero-content {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 2;
		text-align: center;
		width: 90%;
		max-width: 800px;
	}

	.firm-name {
		font-size: var(--text-display);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
		text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
		opacity: 0;
		animation: content-fade 0.8s var(--ease-decelerate) 0.3s forwards;
	}

	.firm-tagline {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-lg);
		text-shadow: 0 1px 10px rgba(0, 0, 0, 0.5);
		opacity: 0;
		animation: content-fade 0.8s var(--ease-decelerate) 0.5s forwards;
	}

	.hero-actions {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
		opacity: 0;
		animation: content-fade 0.8s var(--ease-decelerate) 0.7s forwards;
	}

	.hero-cta {
		padding: var(--space-sm) var(--space-lg);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.hero-cta.primary {
		color: var(--color-bg-pure);
		background: var(--color-fg-primary);
	}

	.hero-cta.primary:hover {
		background: var(--color-fg-secondary);
	}

	.hero-cta.secondary {
		color: var(--color-fg-primary);
		background: transparent;
		border: 1px solid var(--color-fg-secondary);
	}

	.hero-cta.secondary:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	@keyframes content-fade {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Scroll indicator - centered at bottom */
	.scroll-indicator {
		position: absolute;
		bottom: var(--space-xl);
		left: 50%;
		transform: translateX(-50%);
		z-index: 1;
		opacity: 0;
		animation: indicator-fade 0.8s var(--ease-decelerate) 1.5s forwards;
	}

	@keyframes indicator-fade {
		to {
			opacity: 0.6;
		}
	}

	.scroll-line {
		display: block;
		width: 1px;
		height: var(--space-lg);
		background: linear-gradient(
			to bottom,
			var(--color-fg-primary) 0%,
			transparent 100%
		);
		animation: scroll-pulse 2.5s var(--ease-standard) infinite;
		animation-delay: 2s;
	}

	@keyframes scroll-pulse {
		0%, 100% {
			opacity: 0.3;
			transform: scaleY(1);
		}
		50% {
			opacity: 0.8;
			transform: scaleY(1.3);
		}
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.hero-content {
			width: 95%;
		}

		.firm-name {
			font-size: var(--text-h1);
		}

		.firm-tagline {
			font-size: var(--text-body-lg);
		}

		.hero-actions {
			flex-direction: column;
			gap: var(--space-sm);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.hero-image {
			animation: none;
			opacity: 1;
			transform: none;
		}

		.firm-name,
		.firm-tagline,
		.hero-actions {
			animation: none;
			opacity: 1;
			transform: none;
		}

		.scroll-indicator {
			animation: none;
			opacity: 0.6;
		}

		.scroll-line {
			animation: none;
		}
	}
</style>
