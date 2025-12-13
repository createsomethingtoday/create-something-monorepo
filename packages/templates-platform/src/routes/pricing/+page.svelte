<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	interface Plan {
		id: 'free' | 'pro' | 'agency';
		name: string;
		price: number;
		priceId?: string;
		period: string;
		description: string;
		features: string[];
		cta: string;
		highlighted?: boolean;
	}

	const plans: Plan[] = [
		{
			id: 'free',
			name: 'Free',
			price: 0,
			period: 'forever',
			description: 'Perfect for trying out the platform',
			features: [
				'1 active site',
				'All templates included',
				'*.createsomething.space subdomain',
				'Community support',
				'Basic analytics'
			],
			cta: 'Get Started'
		},
		{
			id: 'pro',
			name: 'Pro',
			price: 29,
			priceId: 'price_pro', // Replace with actual Stripe Price ID
			period: 'month',
			description: 'For professionals and small teams',
			features: [
				'10 active sites',
				'All templates included',
				'Custom domain support',
				'Email support',
				'Advanced analytics',
				'Priority updates',
				'Remove branding'
			],
			cta: 'Upgrade to Pro',
			highlighted: true
		},
		{
			id: 'agency',
			name: 'Agency',
			price: 99,
			priceId: 'price_agency', // Replace with actual Stripe Price ID
			period: 'month',
			description: 'For agencies managing multiple clients',
			features: [
				'100 active sites',
				'All templates included',
				'Custom domain support',
				'Priority support',
				'White-label options',
				'Advanced analytics',
				'Client billing pass-through',
				'Dedicated account manager'
			],
			cta: 'Upgrade to Agency'
		}
	];

	let isLoading = false;
	let error = '';

	async function handleUpgrade(plan: Plan) {
		if (plan.id === 'free') {
			goto('/signup');
			return;
		}

		if (!plan.priceId) {
			error = 'Invalid price configuration';
			return;
		}

		isLoading = true;
		error = '';

		try {
			const response = await fetch('/api/billing/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ priceId: plan.priceId })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to create checkout session');
			}

			if (data.url) {
				window.location.href = data.url;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong';
			isLoading = false;
		}
	}

	// Check for checkout query params
	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const checkout = params.get('checkout');

		if (checkout === 'canceled') {
			error = 'Checkout was canceled. Try again when ready.';
		}
	});
</script>

<svelte:head>
	<title>Pricing - Templates Platform</title>
	<meta
		name="description"
		content="Simple, transparent pricing for professional website templates"
	/>
</svelte:head>

<main class="pricing-page">
	<div class="container">
		<!-- Header -->
		<header class="header">
			<h1 class="title">Simple, transparent pricing</h1>
			<p class="subtitle">Choose the plan that fits your needs. Upgrade or downgrade anytime.</p>
		</header>

		<!-- Error Message -->
		{#if error}
			<div class="error-banner">
				<p>{error}</p>
			</div>
		{/if}

		<!-- Pricing Grid -->
		<div class="pricing-grid">
			{#each plans as plan}
				<div class="plan-card" class:highlighted={plan.highlighted}>
					{#if plan.highlighted}
						<div class="badge">Most Popular</div>
					{/if}

					<div class="plan-header">
						<h2 class="plan-name">{plan.name}</h2>
						<div class="plan-price">
							<span class="price-amount">${plan.price}</span>
							<span class="price-period">/{plan.period}</span>
						</div>
						<p class="plan-description">{plan.description}</p>
					</div>

					<ul class="features-list">
						{#each plan.features as feature}
							<li class="feature-item">
								<svg class="check-icon" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
								<span>{feature}</span>
							</li>
						{/each}
					</ul>

					<button
						class="cta-button"
						class:primary={plan.highlighted}
						disabled={isLoading}
						onclick={() => handleUpgrade(plan)}
					>
						{isLoading ? 'Loading...' : plan.cta}
					</button>
				</div>
			{/each}
		</div>

		<!-- FAQ Section -->
		<section class="faq-section">
			<h2 class="faq-title">Frequently Asked Questions</h2>

			<div class="faq-grid">
				<div class="faq-item">
					<h3 class="faq-question">Can I change plans later?</h3>
					<p class="faq-answer">
						Yes, you can upgrade or downgrade your plan at any time. Changes take effect
						immediately, and we'll prorate any billing adjustments.
					</p>
				</div>

				<div class="faq-item">
					<h3 class="faq-question">What happens to my sites if I downgrade?</h3>
					<p class="faq-answer">
						Your sites will remain active, but you won't be able to create new sites beyond your
						plan's limit. Existing sites continue to function normally.
					</p>
				</div>

				<div class="faq-item">
					<h3 class="faq-question">Do you offer refunds?</h3>
					<p class="faq-answer">
						We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied,
						contact support for a full refund.
					</p>
				</div>

				<div class="faq-item">
					<h3 class="faq-question">Can I use my own domain?</h3>
					<p class="faq-answer">
						Custom domains are available on Pro and Agency plans. We'll guide you through the DNS
						setup process.
					</p>
				</div>
			</div>
		</section>
	</div>
</main>

<style>
	.pricing-page {
		min-height: 100vh;
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
		padding: var(--space-2xl) var(--space-md);
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
	}

	/* Header */
	.header {
		text-align: center;
		margin-bottom: var(--space-2xl);
	}

	.title {
		font-size: var(--text-h1);
		font-weight: 600;
		margin-bottom: var(--space-sm);
		color: var(--color-fg-primary);
	}

	.subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		max-width: 600px;
		margin: 0 auto;
	}

	/* Error Banner */
	.error-banner {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		margin-bottom: var(--space-xl);
		text-align: center;
	}

	.error-banner p {
		color: var(--color-error);
		margin: 0;
	}

	/* Pricing Grid */
	.pricing-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-lg);
		margin-bottom: var(--space-2xl);
	}

	.plan-card {
		position: relative;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
		display: flex;
		flex-direction: column;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.plan-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-4px);
	}

	.plan-card.highlighted {
		border-color: var(--color-fg-primary);
		background: var(--color-bg-elevated);
	}

	.badge {
		position: absolute;
		top: var(--space-md);
		right: var(--space-md);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Plan Header */
	.plan-header {
		margin-bottom: var(--space-lg);
	}

	.plan-name {
		font-size: var(--text-h3);
		font-weight: 600;
		margin-bottom: var(--space-sm);
		color: var(--color-fg-primary);
	}

	.plan-price {
		margin-bottom: var(--space-md);
	}

	.price-amount {
		font-size: var(--text-display);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.price-period {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
	}

	.plan-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	/* Features List */
	.features-list {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-xl) 0;
		flex: 1;
	}

	.feature-item {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.check-icon {
		width: 20px;
		height: 20px;
		color: var(--color-success);
		flex-shrink: 0;
		margin-top: 2px;
	}

	/* CTA Button */
	.cta-button {
		width: 100%;
		padding: var(--space-md) var(--space-lg);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-md);
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		font-weight: 600;
		cursor: pointer;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.cta-button:hover:not(:disabled) {
		background: var(--color-hover);
		border-color: var(--color-fg-primary);
	}

	.cta-button.primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-color: var(--color-fg-primary);
	}

	.cta-button.primary:hover:not(:disabled) {
		background: var(--color-fg-secondary);
		border-color: var(--color-fg-secondary);
	}

	.cta-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* FAQ Section */
	.faq-section {
		border-top: 1px solid var(--color-border-default);
		padding-top: var(--space-2xl);
	}

	.faq-title {
		font-size: var(--text-h2);
		font-weight: 600;
		text-align: center;
		margin-bottom: var(--space-xl);
		color: var(--color-fg-primary);
	}

	.faq-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-lg);
	}

	.faq-item {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.faq-question {
		font-size: var(--text-body-lg);
		font-weight: 600;
		margin-bottom: var(--space-sm);
		color: var(--color-fg-primary);
	}

	.faq-answer {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.pricing-page {
			padding: var(--space-xl) var(--space-md);
		}

		.pricing-grid {
			grid-template-columns: 1fr;
		}

		.faq-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
