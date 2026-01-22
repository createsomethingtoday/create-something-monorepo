<script lang="ts">
	/**
	 * OUTERFIELDS Pricing
	 * PCN Creation Services - Starting at $19,999
	 * CTA: Get Your Custom Quote → Discovery Call (Calendly)
	 */
	import { Check, Zap } from 'lucide-svelte';

	const deliverables = [
		'Custom Private Content Network platform',
		'Professional video production',
		'Content strategy & organization',
		'Subscription & payment integration',
		'Comprehensive analytics dashboard',
		'Multi-platform marketing setup',
		'AI-powered chatbot assistant',
		'Ongoing support & development'
	];

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
					Full-service PCN creation. Production, platform, and ongoing support included.
				</p>

				<p class="pricing-note">
					Final pricing based on content scope, features, and integration requirements.
				</p>
			</div>

			<!-- Right: Deliverables + CTA -->
			<div class="pricing-right">
				<h3 class="deliverables-title">What's Included</h3>
				<ul class="deliverables-grid">
					{#each deliverables as item}
						<li class="deliverable-item">
							<Check size={16} />
							<span>{item}</span>
						</li>
					{/each}
				</ul>

				<button class="cta-button" onclick={bookDiscoveryCall}>
					Get Your Custom Quote
				</button>

				<p class="cta-note">Free discovery call · No commitment required</p>
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
		display: grid;
		grid-template-columns: 1fr 1.5fr;
		gap: 3rem;
		align-items: start;
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

	/* Right column - Deliverables + CTA */
	.pricing-right {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		border-left: 1px solid var(--color-border-default);
		padding-left: 3rem;
	}

	.deliverables-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-slate);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}

	.deliverables-grid {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem 2rem;
	}

	.deliverable-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		font-size: 0.9375rem;
		color: var(--color-fg-secondary);
		line-height: 1.4;
	}

	.deliverable-item :global(svg) {
		color: var(--color-sun);
		flex-shrink: 0;
		margin-top: 0.125rem;
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

	.cta-note {
		font-size: 0.8125rem;
		color: var(--color-slate);
		text-align: center;
		margin: 0;
	}

	/* Responsive */
	@media (max-width: 900px) {
		.deliverables-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.pricing-section {
			padding: 4rem 1rem;
		}

		.pricing-card {
			grid-template-columns: 1fr;
			gap: 2rem;
			padding: 2rem;
		}

		.pricing-right {
			border-left: none;
			border-top: 1px solid var(--color-border-default);
			padding-left: 0;
			padding-top: 2rem;
		}

		.price-amount {
			font-size: 4rem;
		}

		.deliverables-grid {
			grid-template-columns: 1fr;
			gap: 0.875rem;
		}
	}
</style>
