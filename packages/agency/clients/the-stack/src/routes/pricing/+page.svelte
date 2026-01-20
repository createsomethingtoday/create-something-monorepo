<script lang="ts">
	/**
	 * Pricing Page - The Stack Indoor Pickleball
	 *
	 * Complete pricing information imported from centralized data.
	 * All values from $lib/data/pricing.ts for DRY maintenance.
	 */

	import { inview } from '$lib/actions/inview';
	import Button from '$lib/components/Button.svelte';
	import BottomCTA from '$lib/components/BottomCTA.svelte';
	import FoundingMembers from '$lib/components/FoundingMembers.svelte';
	import {
		PRICING,
		MEMBERSHIP_BENEFITS,
		PASS_BENEFITS,
		POLICIES,
		formatPrice
	} from '$lib/data/pricing';

	const { memberships, walkIn, happyHours, passes, addOns, sponsorship } = PRICING;
</script>

<svelte:head>
	<title>Pricing & Memberships - The Stack Indoor Pickleball</title>
	<meta
		name="description"
		content="View membership options, court rates, and passes at The Stack Indoor Pickleball in Burleson, Texas. Founding member pricing available."
	/>
</svelte:head>

<!-- Hero Section -->
<section class="section is-pricing-hero background-color-black" use:inview>
	<div class="container-large">
		<div class="pricing-hero-content text-center">
			<div class="margin-bottom-16">
				<h1 class="heading-style-h1">
					<span class="is-word is-1">Pricing</span>
				</h1>
			</div>
			<p class="text-size-medium text-color-lightgrey reveal-element">
				Play More. Stay Cool. Play Year-Round.
			</p>
		</div>
	</div>
</section>

<!-- Founding Members Section (shared component) -->
<FoundingMembers />

<!-- Monthly Memberships Section -->
<section class="section background-color-white" use:inview>
	<div class="container-large">
		<div class="section-header text-center">
			<h2 class="heading-style-h2">
				<span class="is-word is-1">Monthly</span>
				<span class="is-word is-2">Memberships</span>
			</h2>
			<p class="text-size-eyebrow text-color-darkgrey reveal-element">Recurring month-to-month</p>
		</div>

		<div class="pricing-grid">
			<div class="pricing-card reveal-element">
				<p class="card-label">Individual</p>
				<p class="card-price">{formatPrice(memberships.monthly.individual)}<span class="price-period">/month</span></p>
			</div>
			<div class="pricing-card reveal-element">
				<p class="card-label">Couple</p>
				<p class="card-price">{formatPrice(memberships.monthly.couple)}<span class="price-period">/month</span></p>
			</div>
			<div class="pricing-card reveal-element">
				<p class="card-label">Family</p>
				<p class="card-price">{formatPrice(memberships.monthly.family)}<span class="price-period">/month</span></p>
				<p class="card-note">Up to {memberships.monthly.familyMaxSize} per household</p>
			</div>
		</div>

		<div class="membership-benefits reveal-element">
			<h3 class="heading-style-h4 margin-bottom-24">Monthly Member Includes</h3>
			<ul class="benefits-list">
				{#each MEMBERSHIP_BENEFITS as benefit}
					<li class="benefit-item">
						<svg class="benefit-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="20 6 9 17 4 12"></polyline>
						</svg>
						{benefit}
					</li>
				{/each}
			</ul>
			<p class="benefits-note">
				Guests of members pay regular walk-in pricing · Additional court time subject to availability
			</p>
		</div>

		<!-- Member Add-Ons -->
		<div class="addons-section reveal-element">
			<h3 class="heading-style-h4 margin-bottom-16">Optional Member Add-Ons</h3>
			<p class="text-size-eyebrow text-color-darkgrey margin-bottom-24">Same day · Based on availability</p>
			<div class="addons-grid">
				<div class="addon-item">
					<span class="addon-price">{formatPrice(addOns.openPlaySession)}</span>
					<span class="addon-label">Additional open play session</span>
				</div>
				<div class="addon-item">
					<span class="addon-price">{formatPrice(addOns.courtRebooking)}</span>
					<span class="addon-label">Additional court rebooking (per reservation)</span>
				</div>
			</div>
			<p class="benefits-note">{addOns.advanceBookingDays}-day advanced reservations available with membership</p>
		</div>
	</div>
</section>

<!-- Annual Memberships Section -->
<section class="section background-color-black" use:inview>
	<div class="container-large">
		<div class="section-header text-center">
			<h2 class="heading-style-h2 text-color-white">
				<span class="is-word is-1">Annual</span>
				<span class="is-word is-2">Memberships</span>
			</h2>
			<p class="text-size-eyebrow text-color-lightgrey reveal-element">Discounted</p>
		</div>

		<div class="pricing-grid">
			<div class="pricing-card is-dark reveal-element">
				<p class="card-label">Single</p>
				<p class="card-price">{formatPrice(memberships.annual.single)}</p>
			</div>
			<div class="pricing-card is-dark reveal-element">
				<p class="card-label">Couple</p>
				<p class="card-price">{formatPrice(memberships.annual.couples)}</p>
			</div>
			<div class="pricing-card is-dark reveal-element">
				<p class="card-label">Family</p>
				<p class="card-price">{formatPrice(memberships.annual.family)}</p>
			</div>
		</div>
	</div>
</section>

<!-- Walk-In / Court Reservations Section -->
<section class="section background-color-white" use:inview>
	<div class="container-large">
		<div class="two-column-layout">
			<!-- Walk-In Column -->
			<div class="column">
				<div class="section-header">
					<h2 class="heading-style-h2">
						<span class="is-word is-1">Court</span>
						<span class="is-word is-2">Reservations</span>
					</h2>
					<p class="text-size-eyebrow text-color-darkgrey reveal-element">Walk-In Play</p>
				</div>

				<div class="rate-card reveal-element">
					<p class="rate-price">{formatPrice(walkIn.courtRate)}</p>
					<p class="rate-details">per court / {walkIn.duration} minutes</p>
				</div>

				<ul class="benefits-list reveal-element">
					<li class="benefit-item">
						<svg class="benefit-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="20 6 9 17 4 12"></polyline>
						</svg>
						Cost split evenly among players
					</li>
					<li class="benefit-item">
						<svg class="benefit-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="20 6 9 17 4 12"></polyline>
						</svg>
						Max {walkIn.maxPlayers} players per court
					</li>
					<li class="benefit-item">
						<svg class="benefit-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="20 6 9 17 4 12"></polyline>
						</svg>
						{walkIn.advanceBookingDays}-day advance court reservations
					</li>
					<li class="benefit-item">
						<svg class="benefit-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="20 6 9 17 4 12"></polyline>
						</svg>
						{formatPrice(walkIn.paddleRental)} paddle rentals
					</li>
				</ul>
			</div>

			<!-- Happy Hours Column -->
			<div class="column">
				<div class="section-header">
					<h2 class="heading-style-h2">
						<span class="is-word is-1">Happy</span>
						<span class="is-word is-2">Hours</span>
					</h2>
					<p class="text-size-eyebrow text-color-darkgrey reveal-element">{happyHours.start} - {happyHours.end}</p>
				</div>

				<div class="rate-card is-highlight reveal-element">
					<p class="rate-price">{formatPrice(happyHours.rate)}</p>
					<p class="rate-details">per person / {happyHours.duration} min</p>
				</div>

				<p class="benefits-note reveal-element">*{happyHours.note}</p>
			</div>
		</div>
	</div>
</section>

<!-- Passes Section -->
<section class="section background-color-black" use:inview>
	<div class="container-large">
		<div class="section-header text-center">
			<h2 class="heading-style-h2 text-color-white">
				<span class="is-word is-1">Passes</span>
			</h2>
			<p class="text-size-medium text-color-lightgrey reveal-element">
				Great for out of town visitors or groups trying out the sport
			</p>
		</div>

		<div class="pricing-grid passes-grid">
			<div class="pricing-card is-dark reveal-element">
				<p class="card-label">3-Day Pass</p>
				<p class="card-price">{formatPrice(passes.threeDay)}<span class="price-period">pp</span></p>
			</div>
			<div class="pricing-card is-dark reveal-element">
				<p class="card-label">7-Day Pass</p>
				<p class="card-price">{formatPrice(passes.sevenDay)}<span class="price-period">pp</span></p>
			</div>
		</div>

		<div class="pass-benefits reveal-element">
			<h3 class="heading-style-h4 text-color-white margin-bottom-16">Pass Includes</h3>
			<ul class="benefits-list centered">
				{#each PASS_BENEFITS as benefit}
					<li class="benefit-item text-color-lightgrey">
						<svg class="benefit-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="20 6 9 17 4 12"></polyline>
						</svg>
						{benefit}
					</li>
				{/each}
			</ul>
			<p class="benefits-note text-color-lightgrey">Guests not on pass pay regular walk-in pricing</p>
		</div>
	</div>
</section>

<!-- Sponsorships Section -->
<section class="section background-color-white" use:inview>
	<div class="container-large">
		<div class="section-header text-center">
			<h2 class="heading-style-h2">
				<span class="is-word is-1">Sponsorships</span>
			</h2>
			<p class="text-size-eyebrow text-color-darkgrey reveal-element">Initial Year</p>
		</div>

		<div class="sponsorship-card reveal-element">
			<div class="sponsorship-pricing">
				<div class="sponsorship-option">
					<p class="sponsorship-price">{formatPrice(sponsorship.annual)}</p>
					<p class="sponsorship-term">1 Year Court Banner</p>
					<p class="sponsorship-note">{sponsorship.bannersAvailable} available · Paid in full</p>
				</div>
				<div class="sponsorship-divider">
					<span>or</span>
				</div>
				<div class="sponsorship-option">
					<p class="sponsorship-price">{formatPrice(sponsorship.monthlyPlan)}</p>
					<p class="sponsorship-term">in {sponsorship.monthlyPayments} monthly payments</p>
				</div>
			</div>

			<div class="sponsorship-benefits">
				<h3 class="heading-style-h4 margin-bottom-16">Includes</h3>
				<ul class="benefits-list">
					{#each sponsorship.benefits as benefit}
						<li class="benefit-item">
							<svg class="benefit-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="20 6 9 17 4 12"></polyline>
							</svg>
							{benefit}
						</li>
					{/each}
				</ul>
			</div>
		</div>

		<div class="section-cta reveal-element">
			<Button href="/contact" variant="secondary" showArrow>Inquire About Sponsorships</Button>
		</div>
	</div>
</section>

<!-- Important Information Section -->
<section class="section is-policies background-color-black" use:inview>
	<div class="container-large">
		<div class="policies-content reveal-element">
			<h3 class="heading-style-h4 text-color-white margin-bottom-24">Important Information</h3>
			<ul class="policies-list">
				<li class="policy-item">All pricing plus tax</li>
				<li class="policy-item">No cash facility</li>
				<li class="policy-item">Family members must reside in the same household</li>
				<li class="policy-item">{POLICIES.cancellationNoticeDays}-day notice required to cancel memberships</li>
				<li class="policy-item">Food & beverage not included in membership pricing</li>
			</ul>
		</div>
	</div>
</section>

<BottomCTA />

<style>
	/* Hero */
	.section.is-pricing-hero {
		padding-top: 10rem;
		padding-bottom: 4rem;
	}

	.pricing-hero-content {
		max-width: 45rem;
		margin: 0 auto;
	}

	/* Section Headers */
	.section-header {
		margin-bottom: 3rem;
	}

	.section-header.text-center {
		text-align: center;
	}

	.text-center {
		text-align: center;
	}


	/* Gold Rules */
	.gold-rule {
		height: 2px;
		background: linear-gradient(90deg, transparent, var(--green), transparent);
		margin-bottom: 3rem;
	}

	.gold-rule:last-child {
		margin-bottom: 0;
		margin-top: 3rem;
	}

	/* Pricing Grid */
	.pricing-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
		max-width: 56rem;
		margin: 0 auto 3rem;
	}

	.passes-grid {
		grid-template-columns: repeat(2, 1fr);
		max-width: 36rem;
	}

	/* Pricing Cards */
	.pricing-card {
		background: var(--white);
		border: 1px solid var(--light-grey);
		border-radius: 1rem;
		padding: 2rem 1.5rem;
		text-align: center;
		transition: border-color 0.3s var(--ease-stack), box-shadow 0.3s var(--ease-stack);
	}

	.pricing-card:hover {
		border-color: var(--green);
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
	}

	.pricing-card.is-dark {
		background: rgba(255, 255, 255, 0.03);
		border-color: rgba(150, 110, 68, 0.3);
	}

	.pricing-card.is-dark:hover {
		border-color: var(--green);
		background: rgba(150, 110, 68, 0.08);
	}

	.pricing-card.is-featured {
		background: rgba(255, 255, 255, 0.03);
		border: 2px solid var(--green);
	}

	.pricing-card.is-featured:hover {
		background: rgba(150, 110, 68, 0.1);
	}

	.card-label {
		font-family: var(--font-coolvetica);
		font-size: 1.25rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--dark-grey);
		margin-bottom: 0.75rem;
	}

	.is-dark .card-label,
	.is-featured .card-label {
		color: var(--light-grey);
	}

	.card-price {
		font-family: var(--font-coolvetica);
		font-size: clamp(2rem, 5vw, 3rem);
		color: var(--black);
		line-height: 1;
	}

	.is-dark .card-price,
	.is-featured .card-price {
		color: var(--white);
	}

	.price-period {
		font-family: var(--font-satoshi);
		font-size: 0.4em;
		color: var(--dark-grey);
		margin-left: 0.25rem;
	}

	.is-dark .price-period,
	.is-featured .price-period {
		color: var(--light-grey);
	}

	.card-note {
		font-family: var(--font-satoshi);
		font-size: 0.875rem;
		color: var(--dark-grey);
		margin-top: 0.5rem;
	}

	/* Rate Cards */
	.rate-card {
		background: var(--white);
		border: 1px solid var(--light-grey);
		border-radius: 1rem;
		padding: 2rem;
		text-align: center;
		margin-bottom: 2rem;
	}

	.rate-card.is-highlight {
		border-color: var(--green);
		background: rgba(150, 110, 68, 0.05);
	}

	.rate-price {
		font-family: var(--font-coolvetica);
		font-size: clamp(3rem, 8vw, 4.5rem);
		color: var(--black);
		line-height: 1;
	}

	.rate-details {
		font-family: var(--font-satoshi);
		font-size: 1rem;
		color: var(--dark-grey);
		margin-top: 0.5rem;
	}

	/* Benefits Lists */
	.benefits-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.benefits-list.centered {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem 2rem;
	}

	.benefit-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-family: var(--font-satoshi);
		font-size: 1rem;
		color: var(--black);
		margin-bottom: 0.75rem;
	}

	.benefit-item.text-color-white {
		color: var(--white);
	}

	.benefit-item.text-color-lightgrey {
		color: var(--light-grey);
	}

	.benefits-list.centered .benefit-item {
		margin-bottom: 0;
	}

	.benefit-check {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--green);
		flex-shrink: 0;
	}

	.benefits-note {
		font-family: var(--font-satoshi);
		font-size: 0.875rem;
		color: var(--dark-grey);
		margin-top: 1.5rem;
	}

	/* Membership Benefits Box */
	.membership-benefits {
		background: rgba(150, 110, 68, 0.05);
		border: 1px solid rgba(150, 110, 68, 0.2);
		border-radius: 1rem;
		padding: 2rem;
		margin-bottom: 3rem;
	}

	/* Add-Ons Section */
	.addons-section {
		text-align: center;
	}

	.addons-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 2rem;
		margin-bottom: 1rem;
	}

	.addon-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.addon-price {
		font-family: var(--font-coolvetica);
		font-size: 1.5rem;
		color: var(--green);
	}

	.addon-label {
		font-family: var(--font-satoshi);
		font-size: 1rem;
		color: var(--dark-grey);
	}

	/* Two Column Layout */
	.two-column-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4rem;
	}

	/* Pass Benefits */
	.pass-benefits {
		text-align: center;
	}

	/* Sponsorship Card */
	.sponsorship-card {
		background: rgba(150, 110, 68, 0.05);
		border: 1px solid rgba(150, 110, 68, 0.2);
		border-radius: 1rem;
		padding: 3rem;
		max-width: 48rem;
		margin: 0 auto 2rem;
	}

	.sponsorship-pricing {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		margin-bottom: 2rem;
	}

	.sponsorship-option {
		text-align: center;
	}

	.sponsorship-price {
		font-family: var(--font-coolvetica);
		font-size: clamp(2rem, 5vw, 3rem);
		color: var(--black);
		line-height: 1;
	}

	.sponsorship-term {
		font-family: var(--font-satoshi);
		font-size: 1rem;
		color: var(--dark-grey);
		margin-top: 0.5rem;
	}

	.sponsorship-note {
		font-family: var(--font-satoshi);
		font-size: 0.875rem;
		color: var(--dark-grey);
		margin-top: 0.25rem;
	}

	.sponsorship-divider {
		font-family: var(--font-satoshi);
		font-size: 1rem;
		color: var(--dark-grey);
		padding: 0 1rem;
	}

	.sponsorship-benefits {
		border-top: 1px solid rgba(150, 110, 68, 0.2);
		padding-top: 2rem;
	}

	/* Section CTA */
	.section-cta {
		display: flex;
		justify-content: center;
	}

	/* Policies Section */
	.section.is-policies {
		padding-top: 4rem;
		padding-bottom: 4rem;
	}

	.policies-content {
		max-width: 36rem;
		margin: 0 auto;
		text-align: center;
	}

	.policies-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.policy-item {
		font-family: var(--font-satoshi);
		font-size: 1rem;
		color: var(--light-grey);
		margin-bottom: 0.5rem;
	}

	.policy-item::before {
		content: '•';
		color: var(--green);
		margin-right: 0.5rem;
	}

	/* Responsive */
	@media (max-width: 991px) {
		.section.is-pricing-hero {
			padding-top: 8rem;
		}

		.two-column-layout {
			grid-template-columns: 1fr;
			gap: 4rem;
		}
	}

	@media (max-width: 767px) {
		.pricing-grid {
			grid-template-columns: 1fr;
			max-width: 20rem;
		}

		.passes-grid {
			max-width: 20rem;
		}

		.sponsorship-pricing {
			flex-direction: column;
			gap: 1.5rem;
		}

		.sponsorship-divider {
			padding: 0;
		}
	}

	@media (max-width: 479px) {
		.section.is-pricing-hero {
			padding-top: 6rem;
			padding-bottom: 3rem;
		}

		.sponsorship-card {
			padding: 2rem 1.5rem;
		}
	}
</style>
