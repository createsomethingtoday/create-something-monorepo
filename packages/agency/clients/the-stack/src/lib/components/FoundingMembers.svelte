<script lang="ts">
	/**
	 * FoundingMembers Component
	 *
	 * Prominent promotional section for the First 100 Founding Members offer.
	 * Positioned after VideoHero on homepage - second thing visitors see.
	 */

	import { PRICING } from '$lib/data/pricing';
	import Button from './Button.svelte';
	import { inview } from '$lib/actions/inview';

	const { founding } = PRICING;

	const tiers = [
		{ label: 'Single', price: founding.single },
		{ label: 'Couple', price: founding.couples },
		{ label: 'Family', price: founding.family }
	];
</script>

<section class="section is-founding background-color-black" use:inview>
	<div class="container-large">
		<!-- Gold Rule Top -->
		<div class="gold-rule"></div>

		<!-- Header -->
		<div class="founding-header">
			<h2 class="founding-title">
				<span class="is-word is-1">Founding Members</span>
				<span class="is-word is-2 founding-badge">— First {founding.limit} Only —</span>
			</h2>
			<p class="founding-subtitle reveal-element">
				Available in any combination · Pricing locked in as long as you remain a member
			</p>
		</div>

		<!-- Pricing Cards -->
		<div class="founding-grid">
			{#each tiers as tier}
				<div class="founding-card reveal-element">
					<p class="tier-label">{tier.label}</p>
					<p class="tier-price">
						<span class="price-currency">$</span>{tier.price}<span class="price-period">/month</span>
					</p>
				</div>
			{/each}
		</div>

		<!-- Benefits List -->
		<ul class="founding-perks reveal-element">
			{#each founding.perks as perk}
				<li class="perk-item">
					<svg class="perk-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
					{perk}
				</li>
			{/each}
		</ul>

		<!-- CTA Button -->
		<div class="founding-cta reveal-element">
			<Button href="/contact" variant="primary" showArrow>Become a Founding Member</Button>
		</div>

		<!-- Gold Rule Bottom -->
		<div class="gold-rule"></div>
	</div>
</section>

<style>
	.section.is-founding {
		padding-top: 5rem;
		padding-bottom: 5rem;
	}

	/* Gold horizontal rules */
	.gold-rule {
		height: 2px;
		background: linear-gradient(90deg, transparent, var(--green), transparent);
		margin-bottom: 3rem;
	}

	.gold-rule:last-child {
		margin-bottom: 0;
		margin-top: 3rem;
	}

	/* Header */
	.founding-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.founding-title {
		font-family: var(--font-coolvetica);
		font-size: clamp(2rem, 5vw, 3.5rem);
		text-transform: uppercase;
		color: var(--white);
		margin-bottom: 1rem;
		line-height: 1.1;
	}

	.founding-badge {
		color: var(--green);
		display: block;
		font-size: clamp(1.25rem, 3vw, 1.75rem);
		margin-top: 0.5rem;
	}

	.founding-subtitle {
		font-family: var(--font-satoshi);
		font-size: var(--text-body-lg);
		color: var(--light-grey);
		max-width: 32rem;
		margin: 0 auto;
	}

	/* Pricing Grid */
	.founding-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
		max-width: 56rem;
		margin: 0 auto 3rem;
	}

	.founding-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(150, 110, 68, 0.3);
		border-radius: 1rem;
		padding: 2rem 1.5rem;
		text-align: center;
		transition: border-color 0.3s var(--ease-stack), background-color 0.3s var(--ease-stack);
	}

	.founding-card:hover {
		border-color: var(--green);
		background: rgba(150, 110, 68, 0.08);
	}

	.tier-label {
		font-family: var(--font-coolvetica);
		font-size: 1.25rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--light-grey);
		margin-bottom: 0.75rem;
	}

	.tier-price {
		font-family: var(--font-coolvetica);
		font-size: clamp(2.5rem, 6vw, 3.5rem);
		color: var(--white);
		line-height: 1;
	}

	.price-currency {
		font-size: 0.5em;
		vertical-align: super;
		color: var(--green);
	}

	.price-period {
		font-family: var(--font-satoshi);
		font-size: 0.35em;
		color: var(--light-grey);
		margin-left: 0.25rem;
	}

	/* Benefits List */
	.founding-perks {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem 2rem;
		max-width: 48rem;
		margin: 0 auto 2.5rem;
		list-style: none;
		padding: 0;
	}

	.perk-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-satoshi);
		font-size: var(--text-body);
		color: var(--light-grey);
	}

	.perk-check {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--green);
		flex-shrink: 0;
	}

	/* CTA */
	.founding-cta {
		display: flex;
		justify-content: center;
		margin-bottom: 3rem;
	}

	/* Responsive */
	@media (max-width: 767px) {
		.founding-grid {
			grid-template-columns: 1fr;
			max-width: 20rem;
		}

		.founding-perks {
			flex-direction: column;
			align-items: center;
			gap: 0.75rem;
		}

		.section.is-founding {
			padding-top: 4rem;
			padding-bottom: 4rem;
		}
	}

	@media (max-width: 479px) {
		.founding-header {
			margin-bottom: 2rem;
		}

		.founding-card {
			padding: 1.5rem 1rem;
		}
	}
</style>
