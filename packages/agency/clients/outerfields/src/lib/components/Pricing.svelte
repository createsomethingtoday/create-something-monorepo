<script lang="ts">
	/**
	 * OUTERFIELDS Pricing
	 * Single $99 lifetime membership - Founding Member offer
	 * Tufte-inspired: horizontal layout, high data-ink ratio, no redundancy
	 * 
	 * Balance updates (2026-01):
	 * - CTA moved to right column for better visual weight distribution
	 * - Price enlarged (140px) to anchor left side
	 * - "$" positioned at top of price (superscript style)
	 * - Golden ratio column split (~0.39:0.61)
	 */
	import { Check, Crown, Lock, AlertTriangle } from 'lucide-svelte';

	let loading = $state(false);
	let errorMessage = $state('');

	const benefits = [
		'Lifetime access to all platform content (50+ videos)',
		'Behind-the-scenes exclusive content',
		'Educational resources and training materials',
		'Member-only resource library',
		'Included 1-on-1 discovery call',
		'Exclusive Outerfields merchandise'
	];

	async function handleCheckout() {
		loading = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/stripe/checkout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || 'Failed to create checkout session');
			}

			if (result.data.url) {
				window.location.href = result.data.url;
			}
		} catch (err) {
			console.error('Checkout error:', err);
			errorMessage = err instanceof Error ? err.message : 'Something went wrong';
			loading = false;
		}
	}
</script>

<section class="pricing-section" id="pricing">
	<div class="pricing-container">
		<div class="pricing-card">
			<!-- Left: Pricing info (the "hook") -->
			<div class="pricing-left">
				<div class="pricing-header">
					<span class="badge">Founding Member</span>
					<div class="price-row">
						<span class="price-currency">$</span>
						<span class="price-amount">99</span>
						<span class="price-meta">
							<span class="price-period">one-time</span>
							<span class="price-note">lifetime access</span>
						</span>
					</div>
				</div>

				<p class="pricing-tagline">
					One payment. All features. No recurring fees. Ever.
				</p>

				<div class="urgency-strip">
					<AlertTriangle size={14} />
					<span>Founding member pricing — <strong>70%+ savings</strong> vs. post-launch</span>
				</div>
			</div>

			<!-- Right: Benefits + CTA (the "value + action") -->
			<div class="pricing-right">
				<h3 class="benefits-title">What's included</h3>
				<ul class="benefits-grid">
					{#each benefits as benefit}
						<li class="benefit-item">
							<Check size={16} />
							<span>{benefit}</span>
						</li>
					{/each}
				</ul>

				<button class="cta-button" onclick={handleCheckout} disabled={loading}>
					{#if loading}
						Redirecting to checkout...
					{:else}
						<Lock size={18} />
						<span>Get Lifetime Access</span>
					{/if}
				</button>

				{#if errorMessage}
					<div class="error-message">{errorMessage}</div>
				{/if}

				<p class="guarantee">30-day money-back guarantee · Secure payment via Stripe</p>
			</div>
		</div>
	</div>
</section>

<style>
	.pricing-section {
		padding: 4rem 1.5rem;
		background: var(--color-bg-pure);
	}

	.pricing-container {
		max-width: var(--container-max-width);
		margin: 0 auto;
	}

	.pricing-card {
		display: grid;
		grid-template-columns: 2fr 3fr; /* ~0.4:0.6, approximates golden ratio */
		gap: 3rem;
		align-items: start; /* Top-align for stronger visual anchoring */
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		padding: 3rem;
	}

	/* Left column - Pricing */
	.pricing-left {
		display: flex;
		flex-direction: column;
	}

	.pricing-header {
		margin-bottom: 1rem;
	}

	.badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 9999px;
		font-size: 0.6875rem;
		font-weight: 700;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1rem;
	}

	.price-row {
		display: flex;
		align-items: flex-start; /* "$" at top of price (superscript style) */
		gap: 0.25rem;
	}

	.price-currency {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-fg-muted);
	}

	.price-amount {
		font-size: 8.75rem; /* 140px - larger for visual weight balance */
		font-weight: 700;
		color: var(--color-fg-primary);
		line-height: 1;
		letter-spacing: -0.03em;
	}

	.price-meta {
		display: flex;
		flex-direction: column;
		justify-content: flex-end; /* Align to bottom of price */
		margin-left: 0.5rem;
		height: 100%;
		padding-bottom: 0.5rem;
	}

	.price-period {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-fg-secondary);
	}

	.price-note {
		font-size: 0.8125rem;
		color: var(--color-fg-muted);
	}

	.pricing-tagline {
		font-size: 1.125rem;
		color: var(--color-fg-secondary);
		margin: 0 0 1.5rem;
		line-height: 1.5;
	}

	.urgency-strip {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		color: var(--color-fg-muted);
		/* No bottom margin - urgency is last element in left column */
	}

	.urgency-strip :global(svg) {
		color: var(--color-warning);
		flex-shrink: 0;
	}

	.urgency-strip strong {
		color: var(--color-warning);
		font-weight: 600;
	}

	.cta-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%; /* Full width in right column for visual anchor */
		padding: 1rem 2rem;
		margin-top: 0.5rem;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 700;
		color: white;
		cursor: pointer;
		backdrop-filter: blur(12px);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.cta-button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.35);
		transform: translateY(-1px);
	}

	.cta-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error-message {
		padding: 0.75rem;
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-error);
	}

	.guarantee {
		font-size: 0.8125rem;
		color: var(--color-fg-muted);
		text-align: center;
	}

	/* Right column - Benefits + CTA */
	.pricing-right {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		border-left: 1px solid var(--color-border-default);
		padding-left: 3rem;
	}

	.benefits-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}

	.benefits-grid {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem 3rem; /* Increased gap for better breathing room */
	}

	.benefit-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		font-size: 0.9375rem;
		color: var(--color-fg-secondary);
		line-height: 1.4;
	}

	.benefit-item :global(svg) {
		color: var(--color-success);
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	/* Responsive */
	@media (max-width: 900px) {
		.benefits-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.pricing-section {
			padding: 3rem 1rem;
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
			font-size: 6rem; /* Scale down from 8.75rem but still prominent */
		}

		.benefits-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}
</style>
