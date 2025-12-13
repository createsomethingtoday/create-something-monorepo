<script lang="ts">
	/**
	 * HeroSection - Personal Injury Boutique
	 *
	 * Emphasizes:
	 * - "No Fee Unless We Win" trust signal
	 * - 24/7 availability with pulse indicator
	 * - Total recovered stat for credibility
	 * - Dual CTAs: Free Case Review + Emergency call
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';
	import { Phone } from 'lucide-svelte';

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

	// Format phone for tel: link
	const phoneNumber = siteConfig.emergencyPhone || siteConfig.phone;
	const telLink = `tel:${phoneNumber.replace(/[^0-9+]/g, '')}`;

	// Get total recovered from statistics (combine prefix + value + suffix)
	const recoveredStat = siteConfig.statistics?.find(s => s.label.toLowerCase().includes('recovered'));
	const totalRecovered = recoveredStat
		? `${recoveredStat.prefix || ''}${recoveredStat.value}${recoveredStat.suffix || ''}`
		: '$500M+';
</script>

<section class="hero">
	<!-- Full-bleed image container -->
	<div class="hero-image-container">
		<div class="hero-image-placeholder"></div>
		<img
			src={image}
			{alt}
			class="hero-image"
			loading="eager"
		/>
		<div class="hero-overlay"></div>
	</div>

	<!-- Hero Content -->
	{#if showContent}
		<div class="hero-content">
			<!-- No Fee Badge -->
			{#if siteConfig.contingencyFee?.noWinNoFee}
				<div class="no-fee-badge">
					<span>No Fee Unless We Win</span>
				</div>
			{/if}

			<h1 class="firm-name">{siteConfig.name}</h1>
			<p class="firm-tagline">{siteConfig.tagline}</p>

			<!-- Stats Row -->
			<div class="hero-stats">
				<div class="stat-item">
					<span class="stat-value">{totalRecovered}</span>
					<span class="stat-label">Recovered for Clients</span>
				</div>
			</div>

			<!-- CTAs -->
			<div class="hero-actions">
				<a href="/free-case-review" class="hero-cta primary">
					Free Case Review
				</a>
				<a href={telLink} class="hero-cta emergency">
					<Phone size={18} />
					<span>{phoneNumber}</span>
				</a>
			</div>

			<!-- 24/7 Availability Badge - Integrated into content flow -->
			{#if siteConfig.available24_7}
				<div class="availability-badge">
					<span class="pulse-dot"></span>
					<span class="badge-text">Available 24/7</span>
				</div>
			{/if}

			<!-- Contingency Explainer -->
			<p class="fee-explainer">
				{siteConfig.contingencyFee?.explanation || 'You pay nothing until we win your case.'}
			</p>
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
		height: 100dvh;
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

	.hero-overlay {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(
				to bottom,
				rgba(0, 0, 0, 0.85) 0%,
				rgba(0, 0, 0, 0.7) 40%,
				rgba(0, 0, 0, 0.8) 100%
			),
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

	/* 24/7 Availability Badge - Inline with content flow */
	.availability-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		margin-top: var(--space-md);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-success);
		border-radius: var(--radius-full);
		opacity: 0;
		animation: content-fade 0.8s var(--ease-decelerate) 0.65s forwards;
	}

	.pulse-dot {
		width: 8px;
		height: 8px;
		background: var(--color-success);
		border-radius: var(--radius-full);
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
			box-shadow: 0 0 0 0 rgba(68, 170, 68, 0.7);
		}
		50% {
			opacity: 0.8;
			box-shadow: 0 0 0 6px rgba(68, 170, 68, 0);
		}
	}

	.badge-text {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		color: var(--color-success);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Hero Content */
	.hero-content {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 2;
		text-align: center;
		width: 90%;
		max-width: 900px;
	}

	/* No Fee Badge */
	.no-fee-badge {
		display: inline-block;
		padding: var(--space-xs) var(--space-md);
		margin-bottom: var(--space-md);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-full);
		opacity: 0;
		animation: content-fade 0.8s var(--ease-decelerate) 0.2s forwards;
	}

	.no-fee-badge span {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
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
		margin: 0 0 var(--space-md);
		text-shadow: 0 1px 10px rgba(0, 0, 0, 0.5);
		opacity: 0;
		animation: content-fade 0.8s var(--ease-decelerate) 0.4s forwards;
	}

	/* Hero Stats */
	.hero-stats {
		display: flex;
		justify-content: center;
		gap: var(--space-xl);
		margin-bottom: var(--space-lg);
		opacity: 0;
		animation: content-fade 0.8s var(--ease-decelerate) 0.5s forwards;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.stat-value {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	.stat-label {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	/* Hero Actions */
	.hero-actions {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
		margin-bottom: var(--space-md);
		opacity: 0;
		animation: content-fade 0.8s var(--ease-decelerate) 0.6s forwards;
	}

	.hero-cta {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
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
		transform: translateY(-2px);
	}

	.hero-cta.emergency {
		color: var(--color-fg-primary);
		background: rgba(68, 170, 68, 0.2);
		border: 1px solid var(--color-success);
	}

	.hero-cta.emergency:hover {
		background: rgba(68, 170, 68, 0.3);
	}

	/* Fee Explainer */
	.fee-explainer {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
		opacity: 0;
		animation: content-fade 0.8s var(--ease-decelerate) 0.7s forwards;
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

	/* Scroll indicator */
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
		to { opacity: 0.6; }
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

	/* Responsive */
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

		.stat-value {
			font-size: var(--text-h3);
		}

		.hero-actions {
			flex-direction: column;
			gap: var(--space-sm);
		}

		.hero-cta {
			justify-content: center;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.hero-image,
		.availability-badge,
		.no-fee-badge,
		.firm-name,
		.firm-tagline,
		.hero-stats,
		.hero-actions,
		.fee-explainer {
			animation: none;
			opacity: 1;
			transform: none;
		}

		.pulse-dot {
			animation: none;
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
