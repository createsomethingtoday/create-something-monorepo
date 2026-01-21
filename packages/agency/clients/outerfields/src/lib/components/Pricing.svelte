<script lang="ts">
	/**
	 * OUTERFIELDS Pricing
	 * Single $99 lifetime membership - Founding Member offer
	 */
	import { Check, Crown, Zap, Target, AlertTriangle, Lock } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	let loading = false;
	let errorMessage = '';

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

			// Redirect to Stripe Checkout
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
		<div class="section-header">
			<span class="section-badge">
				<Zap size={14} />
				Pre-Sale Phase - Limited Time
			</span>
			<h2 class="section-title">The Only Option: Founding Member - $99 Lifetime Access</h2>
			<p class="section-description">
				Get in now at founding member pricing. This price will <strong>NOT</strong> last forever.
				Once we launch, pricing increases significantly.
			</p>
		<div class="urgency-callout">
			<strong>
				<Target size={16} />
				Founding Member Status:
			</strong>
			<p class="urgency-callout-text">
				You're getting this at the lowest price we'll ever offer. Lock it in before it's gone.
			</p>
		</div>
		</div>

		<div class="pricing-card-wrapper">
			<div class="pricing-card">
				<span class="card-badge">Founding Member</span>

				<div class="card-header">
					<div class="card-icon">
						<Crown size={32} />
					</div>
					<h3 class="card-name">Lifetime Access</h3>
					<p class="card-description">
						One payment. Lifetime access. All features. No recurring fees. Ever.
					</p>
				</div>

				<div class="card-pricing">
					<span class="price-currency">$</span>
					<span class="price-amount">99</span>
					<span class="price-period">one-time</span>
				</div>

				<div class="urgency-message">
					<p>
						<strong>
							<AlertTriangle size={16} />
							This price will NOT last forever
						</strong>
					</p>
					<p>Lock in founding member pricing now before it increases</p>
					<p class="urgency-detail">
						Early adopters save 70%+ vs. post-launch pricing. Join the founding members today.
					</p>
				</div>

				<ul class="features-list">
					{#each benefits as benefit}
						<li class="feature-item">
							<Check size={16} />
							<span>{benefit}</span>
						</li>
					{/each}
				</ul>

				<button class="card-cta" on:click={handleCheckout} disabled={loading}>
					{#if loading}
						Redirecting to checkout...
					{:else}
						<Lock size={18} />
						Claim Your Lifetime Access - $99
					{/if}
				</button>

				{#if errorMessage}
					<div class="error-message">
						{errorMessage}
					</div>
				{/if}

				<div class="guarantee">
					<p>
						<strong>100% Satisfaction Guarantee</strong><br />
						Not satisfied? Full refund within 30 days, no questions asked.
					</p>
				</div>
			</div>
		</div>

		<div class="pricing-footer">
			<div class="trust-badges">
				<span class="trust-item">✓ Secure payment via Stripe</span>
				<span class="trust-divider">·</span>
				<span class="trust-item">✓ No hidden fees</span>
				<span class="trust-divider">·</span>
				<span class="trust-item">✓ 30-day guarantee</span>
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

	.section-header {
		text-align: center;
		margin-bottom: 4rem;
	}

	.section-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		background: var(--color-warning-muted);
		border: 1px solid var(--color-warning-border);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-warning);
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
		color: var(--color-fg-muted);
		max-width: 36rem;
		margin: 0 auto;
		line-height: 1.7;
	}

	.section-description strong {
		color: var(--color-warning);
	}

	.urgency-callout {
		margin-top: 1.5rem;
		padding: 1rem 1.5rem;
		background: var(--color-warning-muted);
		border: 2px solid var(--color-warning-border);
		border-radius: 0.75rem;
		font-size: 0.9375rem;
		color: var(--color-fg-secondary);
		text-align: center;
		max-width: 42rem;
		margin-left: auto;
		margin-right: auto;
	}

	.urgency-callout strong {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-warning);
		font-weight: 700;
	}

	.urgency-callout-text {
		margin: 0.5rem 0 0;
	}

	.urgency-message strong {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.pricing-card-wrapper {
		max-width: 32rem;
		margin: 0 auto 3rem;
	}

	.pricing-card {
		position: relative;
		background: var(--color-bg-surface);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 1rem;
		padding: 2.5rem;
		box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.05);
	}

	.card-badge {
		position: absolute;
		top: -0.75rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 1;
		padding: 0.375rem 1rem;
		/* Solid background to hide card border behind badge */
		background: var(--color-bg-pure, #000);
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 700;
		color: white;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.card-header {
		margin-bottom: 2rem;
		text-align: center;
	}

	.card-icon {
		width: 4rem;
		height: 4rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 1rem;
		color: var(--color-fg-primary);
		margin: 0 auto 1rem;
	}

	.card-name {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.card-description {
		font-size: 0.9375rem;
		color: var(--color-fg-muted);
		margin: 0;
		line-height: 1.6;
	}

	.card-pricing {
		display: flex;
		align-items: baseline;
		justify-content: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border-default);
	}

	.price-currency {
		font-size: 2rem;
		font-weight: 600;
		color: var(--color-fg-secondary);
		margin-right: 0.25rem;
	}

	.price-amount {
		font-size: 4rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		line-height: 1;
		letter-spacing: -0.02em;
	}

	.price-period {
		font-size: 1.125rem;
		color: var(--color-fg-muted);
		margin-left: 0.5rem;
	}

	.urgency-message {
		background: var(--color-warning-muted);
		border: 1px solid var(--color-warning-border);
		border-radius: 0.75rem;
		padding: 1rem;
		margin-bottom: 2rem;
		text-align: center;
	}

	.urgency-message p {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
		line-height: 1.5;
	}

	.urgency-message p:first-child {
		font-size: 1rem;
		margin-bottom: 0.25rem;
	}

	.urgency-message strong {
		color: var(--color-warning);
	}

	.urgency-detail {
		margin-top: 0.5rem !important;
		font-size: 0.8125rem !important;
		color: var(--color-fg-muted) !important;
		font-style: italic;
	}

	.features-list {
		list-style: none;
		padding: 0;
		margin: 0 0 2rem;
	}

	.feature-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem 0;
		font-size: 0.9375rem;
		color: var(--color-fg-secondary);
	}

	.feature-item :global(svg) {
		color: var(--color-success);
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.card-cta {
		width: 100%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1.125rem 1.5rem;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 0.75rem;
		font-size: 1.0625rem;
		font-weight: 700;
		color: white;
		cursor: pointer;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.card-cta:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.35);
		transform: translateY(-2px);
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
	}

	.card-cta:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error-message {
		margin-top: 1rem;
		padding: 0.75rem;
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-error);
		text-align: center;
	}

	.guarantee {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-border-default);
		text-align: center;
	}

	.guarantee p {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0;
		line-height: 1.6;
	}

	.guarantee strong {
		color: var(--color-fg-primary);
	}

	.pricing-footer {
		text-align: center;
	}

	.trust-badges {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		font-size: 0.875rem;
		color: var(--color-fg-muted);
	}

	.trust-item {
		color: var(--color-fg-muted);
	}

	.trust-divider {
		opacity: 0.5;
	}

	@media (max-width: 640px) {
		.pricing-section {
			padding: 4rem 1rem;
		}

		.pricing-card {
			padding: 2rem 1.5rem;
		}

		.price-amount {
			font-size: 3rem;
		}

		.trust-badges {
			flex-direction: column;
			gap: 0.5rem;
		}

		.trust-divider {
			display: none;
		}
	}
</style>
