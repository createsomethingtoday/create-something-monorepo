<script lang="ts">
	/**
	 * OUTERFIELDS Pricing
	 *
	 * Clear, honest pricing. No hidden fees, no gotchas.
	 * "Nicely said" — straightforward value propositions.
	 */
	import { Check, Zap, Crown, Building2 } from 'lucide-svelte';

	interface PricingTier {
		name: string;
		price: number;
		period: string;
		description: string;
		icon: typeof Check;
		features: string[];
		highlight?: boolean;
		cta: string;
		note?: string;
	}

	const tiers: PricingTier[] = [
		{
			name: 'Creator',
			price: 49,
			period: '/month',
			description: 'Everything you need to launch your content library.',
			icon: Zap,
			features: [
				'Up to 100 videos',
				'1,000 subscribers',
				'Basic analytics',
				'Custom domain',
				'Email support',
				'No transaction fees on first $5K/mo'
			],
			cta: 'Start Creating',
			note: '14-day free trial'
		},
		{
			name: 'Professional',
			price: 149,
			period: '/month',
			description: 'For creators ready to grow their audience.',
			icon: Crown,
			features: [
				'Unlimited videos',
				'10,000 subscribers',
				'Advanced analytics & cohorts',
				'White-label mobile apps',
				'Priority support',
				'Community features',
				'No transaction fees on first $25K/mo'
			],
			highlight: true,
			cta: 'Go Professional',
			note: 'Most popular'
		},
		{
			name: 'Business',
			price: 399,
			period: '/month',
			description: 'Full platform control for serious operations.',
			icon: Building2,
			features: [
				'Everything in Professional',
				'Unlimited subscribers',
				'API access & webhooks',
				'SSO & team management',
				'Dedicated account manager',
				'Custom integrations',
				'No transaction fees'
			],
			cta: 'Contact Sales'
		}
	];

	const transactionFee = '2.9% + 30¢';
</script>

<section class="pricing-section" id="pricing">
	<div class="pricing-container">
		<div class="section-header">
			<span class="section-badge">Simple Pricing</span>
			<h2 class="section-title">Honest pricing. No surprises.</h2>
			<p class="section-description">
				Choose a plan that fits your stage. Scale up as you grow.
				Cancel anytime—we don't believe in lock-ins.
			</p>
		</div>

		<div class="pricing-grid">
			{#each tiers as tier}
				<div class="pricing-card" class:highlight={tier.highlight}>
					{#if tier.note}
						<span class="card-badge" class:popular={tier.highlight}>{tier.note}</span>
					{/if}

					<div class="card-header">
						<div class="card-icon">
							<svelte:component this={tier.icon} size={24} />
						</div>
						<h3 class="card-name">{tier.name}</h3>
						<p class="card-description">{tier.description}</p>
					</div>

					<div class="card-pricing">
						<span class="price-currency">$</span>
						<span class="price-amount">{tier.price}</span>
						<span class="price-period">{tier.period}</span>
					</div>

					<ul class="features-list">
						{#each tier.features as feature}
							<li class="feature-item">
								<Check size={16} />
								<span>{feature}</span>
							</li>
						{/each}
					</ul>

					<a
						href={tier.name === 'Business' ? '/contact' : '/signup'}
						class="card-cta"
						class:primary={tier.highlight}
					>
						{tier.cta}
					</a>
				</div>
			{/each}
		</div>

		<div class="pricing-footer">
			<p class="transaction-note">
				Payment processing: <strong>{transactionFee}</strong> per transaction (Stripe).
				That's it. You keep the rest.
			</p>
			<div class="trust-badges">
				<span class="trust-item">No setup fees</span>
				<span class="trust-divider">·</span>
				<span class="trust-item">No hidden costs</span>
				<span class="trust-divider">·</span>
				<span class="trust-item">Cancel anytime</span>
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
		max-width: 72rem;
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: 4rem;
	}

	.section-badge {
		display: inline-block;
		padding: 0.375rem 0.75rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-fg-secondary);
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

	.pricing-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
		margin-bottom: 3rem;
	}

	.pricing-card {
		position: relative;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.pricing-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-4px);
	}

	.pricing-card.highlight {
		border-color: var(--color-brand);
		background: linear-gradient(
			to bottom,
			var(--color-brand-muted),
			var(--color-bg-surface)
		);
	}

	.card-badge {
		position: absolute;
		top: -0.75rem;
		left: 50%;
		transform: translateX(-50%);
		padding: 0.25rem 0.75rem;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: 9999px;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
	}

	.card-badge.popular {
		background: var(--color-brand);
		border-color: var(--color-brand);
		color: white;
	}

	.card-header {
		margin-bottom: 1.5rem;
	}

	.card-icon {
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
		color: var(--color-fg-secondary);
		margin-bottom: 1rem;
	}

	.highlight .card-icon {
		background: var(--color-brand-muted);
		border-color: var(--color-brand-glow);
		color: var(--color-brand);
	}

	.card-name {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.card-description {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0;
		line-height: 1.5;
	}

	.card-pricing {
		display: flex;
		align-items: baseline;
		margin-bottom: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border-default);
	}

	.price-currency {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-fg-secondary);
		margin-right: 0.125rem;
	}

	.price-amount {
		font-size: 3rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		line-height: 1;
		letter-spacing: -0.02em;
	}

	.price-period {
		font-size: 1rem;
		color: var(--color-fg-muted);
		margin-left: 0.25rem;
	}

	.features-list {
		list-style: none;
		padding: 0;
		margin: 0 0 2rem;
		flex: 1;
	}

	.feature-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.5rem 0;
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
	}

	.feature-item :global(svg) {
		color: var(--color-success);
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.card-cta {
		display: block;
		width: 100%;
		padding: 0.875rem 1.5rem;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		text-align: center;
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.card-cta:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.card-cta.primary {
		background: var(--color-brand);
		border-color: var(--color-brand);
		color: white;
	}

	.card-cta.primary:hover {
		background: var(--color-brand-hover);
		transform: translateY(-1px);
	}

	.pricing-footer {
		text-align: center;
	}

	.transaction-note {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0 0 1rem;
	}

	.transaction-note strong {
		color: var(--color-fg-secondary);
	}

	.trust-badges {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		font-size: 0.8125rem;
		color: var(--color-fg-subtle);
	}

	.trust-item {
		color: var(--color-fg-muted);
	}

	.trust-divider {
		opacity: 0.5;
	}

	@media (max-width: 1024px) {
		.pricing-grid {
			grid-template-columns: 1fr;
			max-width: 28rem;
			margin-left: auto;
			margin-right: auto;
		}

		.pricing-card.highlight {
			order: -1;
		}
	}

	@media (max-width: 640px) {
		.pricing-section {
			padding: 4rem 1rem;
		}

		.trust-badges {
			flex-wrap: wrap;
		}
	}
</style>
