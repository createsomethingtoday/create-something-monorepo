<script lang="ts">
	/**
	 * RudolfHero - Direct replication of Rudolf template hero section
	 *
	 * Layout: Full-height with background image, centered content, dual CTAs
	 * Typography: Large headline with subtitle
	 * Animation: Smooth scroll indicator
	 */

	import { siteConfig } from '$lib/config/context';

	interface Props {
		image?: string;
		alt?: string;
		headline?: string;
		subhead?: string;
	}

	let { image, alt, headline, subhead }: Props = $props();

	const effectiveImage = $derived(image ?? $siteConfig.hero.image);
	const effectiveAlt = $derived(alt ?? $siteConfig.hero.alt);
	const effectiveHeadline = $derived(headline ?? $siteConfig.name);
	const effectiveSubhead = $derived(subhead ?? $siteConfig.tagline);
</script>

<header class="section-hero">
	<div class="hero-component">
		<div class="hero-background">
			<img src={effectiveImage} alt={effectiveAlt} class="hero-image" />
			<div class="hero-overlay"></div>
		</div>
		<div class="hero-content-wrapper">
			<div class="hero-content">
				<div class="container">
					<div class="hero-content-block">
						<h1 class="hero-heading">
							{effectiveHeadline}
						</h1>
						<p class="hero-subheading">
							{effectiveSubhead}
						</p>
						<div class="hero-cta-wrapper">
							<a href="#contact" class="button primary">
								<span class="button-text">Start a Project</span>
							</a>
							<a href="#projects" class="button secondary">
								<span class="button-text">View Work</span>
							</a>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="hero-scroll-indicator">
			<div class="scroll-arrow"></div>
		</div>
	</div>
</header>

<style>
	.section-hero {
		position: relative;
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		background: var(--color-bg-pure);
	}

	.hero-component {
		position: relative;
		width: 100%;
		height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hero-background {
		position: absolute;
		inset: 0;
		z-index: 1;
	}

	.hero-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
	}

	.hero-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			rgba(0, 0, 0, 0.3) 0%,
			rgba(0, 0, 0, 0.5) 100%
		);
	}

	.hero-content-wrapper {
		position: relative;
		z-index: 2;
		width: 100%;
		padding: var(--space-2xl) var(--space-lg);
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
	}

	.hero-content-block {
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-lg);
	}

	.hero-heading {
		font-size: clamp(3rem, 8vw, 7rem);
		font-weight: 700;
		line-height: 1.1;
		color: var(--color-fg-primary);
		margin: 0;
		letter-spacing: -0.02em;
		text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
	}

	.hero-subheading {
		font-size: clamp(1.125rem, 2vw, 1.5rem);
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.9);
		max-width: 600px;
		margin: 0;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
	}

	.hero-cta-wrapper {
		display: flex;
		gap: var(--space-md);
		flex-wrap: wrap;
		justify-content: center;
		margin-top: var(--space-md);
	}

	.button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-md) var(--space-2xl);
		border-radius: var(--radius-full);
		font-size: var(--text-body);
		font-weight: 600;
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
		cursor: pointer;
		border: 1px solid transparent;
	}

	.button.primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-color: var(--color-fg-primary);
	}

	.button.primary:hover {
		background: rgba(255, 255, 255, 0.9);
		transform: translateY(-2px);
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
	}

	.button.secondary {
		background: transparent;
		color: var(--color-fg-primary);
		border-color: var(--color-border-emphasis);
	}

	.button.secondary:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: var(--color-fg-primary);
		transform: translateY(-2px);
	}

	.hero-scroll-indicator {
		position: absolute;
		bottom: var(--space-2xl);
		left: 50%;
		transform: translateX(-50%);
		z-index: 3;
	}

	.scroll-arrow {
		width: 24px;
		height: 40px;
		border: 2px solid rgba(255, 255, 255, 0.6);
		border-radius: 12px;
		position: relative;
		animation: scroll-bounce 2s infinite;
	}

	.scroll-arrow::after {
		content: '';
		position: absolute;
		top: 8px;
		left: 50%;
		transform: translateX(-50%);
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.8);
		animation: scroll-dot 2s infinite;
	}

	@keyframes scroll-bounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(10px);
		}
	}

	@keyframes scroll-dot {
		0% {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
		50%,
		100% {
			opacity: 0;
			transform: translateX(-50%) translateY(20px);
		}
	}

	@media (max-width: 768px) {
		.hero-cta-wrapper {
			flex-direction: column;
			width: 100%;
			max-width: 300px;
		}

		.button {
			width: 100%;
		}
	}
</style>
