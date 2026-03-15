<script lang="ts">
	/**
	 * Founding Members Page - The Stack Indoor Pickleball
	 *
	 * Dedicated landing page for the First 100 Founding Members offer.
	 * All CTAs point here for conversion.
	 */

	import { inview } from '$lib/actions/inview';
	import Button from '$lib/components/Button.svelte';
	import BottomCTA from '$lib/components/BottomCTA.svelte';
	import { PRICING, MEMBERSHIP_BENEFITS, CONTACT, formatPrice } from '$lib/data/pricing';

	const { founding } = PRICING;

	const tiers = [
		{ label: 'Single', price: founding.single, description: '1 member' },
		{ label: 'Couple', price: founding.couples, description: '2 members' },
		{ label: 'Family', price: founding.family, description: 'Up to 4 members' }
	];

	const exclusivePerks = [
		{
			icon: 'lock',
			title: 'Price Lock Guarantee',
			description: 'Your founding rate is locked in forever—as long as you remain a member. No price increases, ever.'
		},
		{
			icon: 'tag',
			title: 'STACK Bag Tag',
			description: 'Receive an exclusive founding member bag tag—a mark of being part of our original 100.'
		},
		{
			icon: 'gift',
			title: 'Prize Drawing Entry',
			description: 'Automatic entry into exclusive founding member prize drawings and giveaways.'
		},
		{
			icon: 'combine',
			title: 'Mix & Match',
			description: 'Combine any membership type. Single + Couple? Family + Single? Whatever works for your group.'
		}
	];
</script>

<svelte:head>
	<title>Founding Members - First 100 Only | The Stack Indoor Pickleball</title>
	<meta
		name="description"
		content="Join the first 100 Founding Members at The Stack Indoor Pickleball. Lock in special pricing forever, receive exclusive perks, and be part of Burleson's premier pickleball community."
	/>
</svelte:head>

<!-- Hero Section -->
<section class="section is-hero background-color-black" use:inview>
	<div class="container-large">
		<div class="hero-content text-center">
			<p class="eyebrow text-color-green reveal-element">Limited Opportunity</p>
			<h1 class="hero-title">
				<span class="is-word is-1">Founding</span>
				<span class="is-word is-2">Members</span>
			</h1>
			<p class="hero-badge">— First {founding.limit} Only —</p>
			<p class="hero-subtitle reveal-element">
				Be part of the original 100. Lock in exclusive pricing forever and help shape the future of indoor pickleball in Burleson.
			</p>
		</div>
	</div>
</section>

<!-- Pricing Section -->
<section class="section is-pricing background-color-black" use:inview>
	<div class="container-large">
		<div class="gold-rule"></div>

		<div class="pricing-grid">
			{#each tiers as tier}
				<div class="pricing-card reveal-element">
					<p class="card-label">{tier.label}</p>
					<p class="card-description">{tier.description}</p>
					<p class="card-price">
						<span class="price-currency">$</span>{tier.price}<span class="price-period">/month</span>
					</p>
					<p class="price-note">Locked in forever</p>
				</div>
			{/each}
		</div>

		<div class="pricing-comparison reveal-element">
			<p class="comparison-label">Compare to regular monthly rates:</p>
			<p class="comparison-text">
				Individual ${PRICING.memberships.monthly.individual}/mo · 
				Couple ${PRICING.memberships.monthly.couple}/mo · 
				Family ${PRICING.memberships.monthly.family}/mo
			</p>
		</div>

		<div class="gold-rule"></div>
	</div>
</section>

<!-- Benefits Section -->
<section class="section is-benefits background-color-white" use:inview>
	<div class="container-large">
		<div class="section-header text-center">
			<h2 class="heading-style-h2">
				<span class="is-word is-1">Exclusive</span>
				<span class="is-word is-2">Perks</span>
			</h2>
			<p class="section-subtitle reveal-element">
				Founding members receive benefits beyond our standard membership
			</p>
		</div>

		<div class="perks-grid">
			{#each exclusivePerks as perk}
				<div class="perk-card reveal-element">
					<div class="perk-icon">
						{#if perk.icon === 'lock'}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
								<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
							</svg>
						{:else if perk.icon === 'tag'}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
								<line x1="7" y1="7" x2="7.01" y2="7"></line>
							</svg>
						{:else if perk.icon === 'gift'}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="20 12 20 22 4 22 4 12"></polyline>
								<rect x="2" y="7" width="20" height="5"></rect>
								<line x1="12" y1="22" x2="12" y2="7"></line>
								<path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
								<path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
							</svg>
						{:else if perk.icon === 'combine'}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<rect x="2" y="2" width="8" height="8" rx="2"></rect>
								<rect x="14" y="2" width="8" height="8" rx="2"></rect>
								<rect x="2" y="14" width="8" height="8" rx="2"></rect>
								<rect x="14" y="14" width="8" height="8" rx="2"></rect>
							</svg>
						{/if}
					</div>
					<h3 class="perk-title">{perk.title}</h3>
					<p class="perk-description">{perk.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Membership Includes Section -->
<section class="section is-includes background-color-black" use:inview>
	<div class="container-large">
		<div class="section-header text-center">
			<h2 class="heading-style-h2 text-color-white">
				<span class="is-word is-1">What's</span>
				<span class="is-word is-2">Included</span>
			</h2>
			<p class="section-subtitle text-color-lightgrey reveal-element">
				All founding memberships include full access
			</p>
		</div>

		<ul class="benefits-list reveal-element">
			{#each MEMBERSHIP_BENEFITS as benefit}
				<li class="benefit-item">
					<svg class="benefit-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
					{benefit}
				</li>
			{/each}
		</ul>
	</div>
</section>

<!-- CTA Section -->
<section class="section is-cta background-color-black" use:inview>
	<div class="container-large">
		<div class="cta-content text-center">
			<h2 class="cta-title reveal-element">Ready to Join?</h2>
			<p class="cta-subtitle reveal-element">
				Contact us to secure your founding membership before all {founding.limit} spots are taken.
			</p>
			<div class="cta-buttons reveal-element">
				<Button href="/contact" variant="primary" showArrow>Get Started</Button>
				<Button href="tel:{CONTACT.phone.replace(/[^0-9]/g, '')}" variant="secondary">
					Call {CONTACT.phone}
				</Button>
			</div>
			<p class="cta-note reveal-element">
				Questions? Email us at <a href="mailto:{CONTACT.email}" class="text-link">{CONTACT.email}</a>
			</p>
		</div>
	</div>
</section>

<!-- Bottom CTA -->
<BottomCTA />

<style>
	/* Hero */
	.section.is-hero {
		padding-top: 10rem;
		padding-bottom: 4rem;
	}

	.hero-content {
		max-width: 52rem;
		margin: 0 auto;
	}

	.eyebrow {
		font-family: var(--font-coolvetica);
		font-size: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		margin-bottom: 1rem;
	}

	.hero-title {
		font-family: var(--font-coolvetica);
		font-size: clamp(3rem, 10vw, 7rem);
		line-height: 0.95;
		text-transform: uppercase;
		color: var(--white);
		margin-bottom: 1rem;
	}

	.hero-title .is-word {
		display: inline-block;
		opacity: 0;
		transform: translateY(0.5em);
		animation: wordReveal 0.8s var(--ease-stack) forwards;
	}

	.hero-title .is-word.is-1 {
		animation-delay: 0.1s;
	}

	.hero-title .is-word.is-2 {
		animation-delay: 0.2s;
	}

	.hero-badge {
		font-family: var(--font-coolvetica);
		font-size: clamp(1.25rem, 3vw, 1.75rem);
		color: var(--green);
		text-transform: uppercase;
		margin-bottom: 1.5rem;
	}

	.hero-subtitle {
		font-family: var(--font-satoshi);
		font-size: var(--text-body-lg);
		color: var(--light-grey);
		max-width: 36rem;
		margin: 0 auto;
	}

	/* Pricing */
	.section.is-pricing {
		padding-top: 0;
		padding-bottom: 4rem;
	}

	.gold-rule {
		height: 2px;
		background: linear-gradient(90deg, transparent, var(--green), transparent);
		margin-bottom: 3rem;
	}

	.gold-rule:last-child {
		margin-bottom: 0;
		margin-top: 3rem;
	}

	.pricing-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
		max-width: 56rem;
		margin: 0 auto 2rem;
	}

	.pricing-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(150, 110, 68, 0.3);
		border-radius: 1rem;
		padding: 2rem 1.5rem;
		text-align: center;
		transition: border-color 0.3s var(--ease-stack), background-color 0.3s var(--ease-stack);
	}

	.pricing-card:hover {
		border-color: var(--green);
		background: rgba(150, 110, 68, 0.08);
	}

	.card-label {
		font-family: var(--font-coolvetica);
		font-size: 1.5rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--white);
		margin-bottom: 0.25rem;
	}

	.card-description {
		font-family: var(--font-satoshi);
		font-size: 0.875rem;
		color: var(--light-grey);
		margin-bottom: 1rem;
	}

	.card-price {
		font-family: var(--font-coolvetica);
		font-size: clamp(2.5rem, 6vw, 3.5rem);
		color: var(--white);
		line-height: 1;
		margin-bottom: 0.5rem;
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

	.price-note {
		font-family: var(--font-satoshi);
		font-size: 0.875rem;
		color: var(--green);
	}

	.pricing-comparison {
		text-align: center;
		margin-bottom: 2rem;
	}

	.comparison-label {
		font-family: var(--font-satoshi);
		font-size: 0.875rem;
		color: var(--light-grey);
		margin-bottom: 0.25rem;
	}

	.comparison-text {
		font-family: var(--font-satoshi);
		font-size: 0.875rem;
		color: var(--medium-grey);
		text-decoration: line-through;
	}

	/* Benefits / Perks */
	.section.is-benefits {
		padding-top: 6rem;
		padding-bottom: 6rem;
	}

	.section-header {
		margin-bottom: 3rem;
	}

	.heading-style-h2 {
		font-family: var(--font-coolvetica);
		font-size: clamp(2rem, 5vw, 3.5rem);
		text-transform: uppercase;
		color: var(--black);
		margin-bottom: 1rem;
		line-height: 1.1;
	}

	.heading-style-h2 .is-word {
		display: inline-block;
		opacity: 0;
		transform: translateY(0.5em);
		animation: wordReveal 0.8s var(--ease-stack) forwards;
	}

	.heading-style-h2 .is-word.is-1 {
		animation-delay: 0.1s;
	}

	.heading-style-h2 .is-word.is-2 {
		animation-delay: 0.2s;
	}

	.section-subtitle {
		font-family: var(--font-satoshi);
		font-size: var(--text-body-lg);
		color: var(--dark-grey);
	}

	.perks-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 2rem;
		max-width: 56rem;
		margin: 0 auto;
	}

	.perk-card {
		padding: 2rem;
		background: var(--off-white);
		border-radius: 1rem;
	}

	.perk-icon {
		width: 3rem;
		height: 3rem;
		margin-bottom: 1rem;
		color: var(--green);
	}

	.perk-icon svg {
		width: 100%;
		height: 100%;
	}

	.perk-title {
		font-family: var(--font-coolvetica);
		font-size: 1.25rem;
		text-transform: uppercase;
		color: var(--black);
		margin-bottom: 0.5rem;
	}

	.perk-description {
		font-family: var(--font-satoshi);
		font-size: var(--text-body);
		color: var(--dark-grey);
		line-height: 1.6;
	}

	/* Includes */
	.section.is-includes {
		padding-top: 6rem;
		padding-bottom: 6rem;
	}

	.benefits-list {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem 2rem;
		max-width: 48rem;
		margin: 0 auto;
		list-style: none;
		padding: 0;
	}

	.benefit-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		font-family: var(--font-satoshi);
		font-size: var(--text-body);
		color: var(--light-grey);
	}

	.benefit-check {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--green);
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	/* CTA */
	.section.is-cta {
		padding-top: 4rem;
		padding-bottom: 6rem;
	}

	.cta-content {
		max-width: 36rem;
		margin: 0 auto;
	}

	.cta-title {
		font-family: var(--font-coolvetica);
		font-size: clamp(2rem, 5vw, 3rem);
		text-transform: uppercase;
		color: var(--white);
		margin-bottom: 1rem;
	}

	.cta-subtitle {
		font-family: var(--font-satoshi);
		font-size: var(--text-body-lg);
		color: var(--light-grey);
		margin-bottom: 2rem;
	}

	.cta-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
		margin-bottom: 2rem;
	}

	.cta-note {
		font-family: var(--font-satoshi);
		font-size: var(--text-body-sm);
		color: var(--medium-grey);
	}

	.text-link {
		color: var(--green);
		text-decoration: none;
		transition: opacity 0.2s;
	}

	.text-link:hover {
		opacity: 0.8;
	}

	/* Utilities */
	.text-center {
		text-align: center;
	}

	.text-color-white {
		color: var(--white);
	}

	.text-color-green {
		color: var(--green);
	}

	.text-color-lightgrey {
		color: var(--light-grey);
	}

	.reveal-element {
		opacity: 0;
		transform: translateY(1rem);
		animation: fadeUp 0.6s var(--ease-stack) 0.3s forwards;
	}

	@keyframes wordReveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes fadeUp {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Responsive */
	@media (max-width: 767px) {
		.pricing-grid {
			grid-template-columns: 1fr;
			max-width: 20rem;
		}

		.perks-grid {
			grid-template-columns: 1fr;
		}

		.benefits-list {
			grid-template-columns: 1fr;
		}

		.section.is-hero {
			padding-top: 8rem;
		}
	}

	@media (max-width: 479px) {
		.cta-buttons {
			flex-direction: column;
			align-items: center;
		}
	}
</style>
