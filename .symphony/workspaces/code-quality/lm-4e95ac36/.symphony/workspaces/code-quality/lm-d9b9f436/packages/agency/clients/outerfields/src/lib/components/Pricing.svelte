<script lang="ts">
	/**
	 * OUTERFIELDS Pricing
	 * PCN Creation Services - Starting at $19,999
	 * CTA: Get Your Custom Quote → Discovery Call (Calendly)
	 */
	import { Zap } from 'lucide-svelte';

	function bookDiscoveryCall() {
		window.open('https://calendly.com/outerfields/discovery-call', '_blank');
	}
</script>

<section class="pricing-section" id="pricing">
	<div class="pricing-container">
		<!-- Section Header -->
		<div class="section-header">
			<span class="section-badge">
				<Zap size={14} />
				Full-Service PCN Creation
			</span>
			<h2 class="section-title">Investment</h2>
			<p class="section-description">
				Every Private Content Network is custom-built for your brand, audience, and goals.
			</p>
		</div>

		<div class="pricing-card">
			<!-- Left: Pricing info -->
			<div class="pricing-left">
				<div class="pricing-header">
					<span class="badge">Starting At</span>
					<div class="price-row">
						<span class="price-currency">$</span>
						<span class="price-amount">19,999</span>
					</div>
				</div>

			<p class="pricing-tagline">
				Start partnering with us for as little as $19,999.
			</p>

			<p class="pricing-note">
				Final pricing based on content scope, features, and integration requirements.
			</p>

				<div class="pricing-cta">
					<button class="cta-button" onclick={bookDiscoveryCall}>
						Book Your Discovery Call
					</button>
					<p class="cta-subtext">Receive a Free Audit</p>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.pricing-section {
		padding: 6rem 1.5rem;
		background: var(--color-bg-pure);
	}

	.pricing-container {
		max-width: var(--container-max-width);
		margin: 0 auto;
	}

	/* Section Header */
	.section-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.section-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		background: var(--color-primary-muted);
		border: 1px solid rgba(244, 81, 38, 0.3);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-sun);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1rem;
	}

	.section-title {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
	}

	.section-description {
		font-size: 1.125rem;
		color: var(--color-slate);
		max-width: 36rem;
		margin: 0 auto;
		line-height: 1.6;
	}

	.pricing-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		padding: 3rem;
	}

	/* Left column - Pricing */
	.pricing-left {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.pricing-header {
		margin-bottom: 0.5rem;
	}

	.badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		background: rgba(244, 81, 38, 0.15);
		border: 1px solid rgba(244, 81, 38, 0.3);
		border-radius: 9999px;
		font-size: 0.6875rem;
		font-weight: 700;
		color: var(--color-sun);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1rem;
	}

	.price-row {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		gap: 0.25rem;
	}

	.price-currency {
		font-size: 2rem;
		font-weight: 600;
		color: var(--color-sun);
		margin-top: 0.5rem;
	}

	.price-amount {
		font-size: clamp(4rem, 8vw, 6rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		line-height: 1;
		letter-spacing: -0.03em;
	}

	.pricing-tagline {
		font-size: 1.125rem;
		color: var(--color-fg-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.pricing-note {
		font-size: 0.875rem;
		color: var(--color-slate);
		margin: 0;
		line-height: 1.5;
	}

	.pricing-cta {
		margin-top: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.cta-subtext {
		font-size: 0.875rem;
		color: var(--color-sun);
		font-weight: 500;
		margin: 0;
	}

	.cta-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 1rem 2rem;
		margin-top: 0.5rem;
		background: var(--color-sun);
		border: none;
		border-radius: 0.5rem;
		font-size: 1.125rem;
		font-weight: 700;
		color: white;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.cta-button:hover {
		background: var(--color-primary-hover);
		transform: scale(1.02);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.pricing-section {
			padding: 4rem 1rem;
		}

		.pricing-card {
			padding: 2rem;
		}

		.price-amount {
			font-size: 4rem;
		}
	}
</style>
