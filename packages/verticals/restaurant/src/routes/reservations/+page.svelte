<script lang="ts">
	/**
	 * Reservations Page - Restaurant
	 *
	 * Prominent booking CTA, policies, walk-in info.
	 * Clear, inviting, friction-free.
	 */

	import { siteConfig } from '$lib/config/context';
</script>

<svelte:head>
	<title>Reservations - {$siteConfig.name}</title>
	<meta
		name="description"
		content="Reserve your table at {$siteConfig.name}. Book online or call {$siteConfig.reservations.phone}."
	/>
</svelte:head>

<main class="reservations-page">
	<!-- Page Header -->
	<section class="page-header">
		<div class="container">
			<h1>Reservations</h1>
			<p class="lead">
				We'd be honored to host you. Reserve a table through {$siteConfig.reservations.provider} or
				give us a call.
			</p>
		</div>
	</section>

	<!-- Booking CTA -->
	<section class="booking-section">
		<div class="container">
			<div class="booking-card">
				<h2>Book Your Table</h2>
				<p class="booking-note">{$siteConfig.reservations.note}</p>

				<div class="booking-actions">
					{#if $siteConfig.reservations.enabled && $siteConfig.reservations.url}
						<a
							href={$siteConfig.reservations.url}
							target="_blank"
							rel="noopener noreferrer"
							class="booking-button primary"
						>
							Book on {$siteConfig.reservations.provider}
						</a>
					{/if}

					<div class="booking-divider">
						<span>or</span>
					</div>

					<div class="phone-booking">
						<p class="phone-label">Call to reserve</p>
						<a href="tel:{$siteConfig.reservations.phone}" class="phone-number">
							{$siteConfig.reservations.phone}
						</a>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Party Size Info -->
	<section class="party-size-section">
		<div class="container">
			<div class="info-grid">
				<div class="info-card">
					<h3>Large Parties</h3>
					<p>
						For parties of 8 or more, please contact us directly at
						<a href="tel:{$siteConfig.reservations.phone}">{$siteConfig.reservations.phone}</a>
						or email
						<a href="mailto:{$siteConfig.email}">{$siteConfig.email}</a>. We're happy to
						accommodate your group with advance planning.
					</p>
				</div>

				<div class="info-card">
					<h3>Walk-Ins</h3>
					<p>
						We welcome walk-in guests and will seat you based on availability. While we always do
						our best to accommodate everyone, reservations receive priority seating during peak
						hours.
					</p>
				</div>

				{#if $siteConfig.privateEvents && $siteConfig.privateEvents.enabled}
					<div class="info-card">
						<h3>Private Events</h3>
						<p>
							Interested in hosting a private event? We offer several options for intimate
							gatherings and celebrations. Contact us at
							<a href="mailto:{$siteConfig.privateEvents.email}">
								{$siteConfig.privateEvents.email}
							</a>
							to discuss your needs.
						</p>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- Reservation Policies -->
	{#if $siteConfig.reservations.policies && $siteConfig.reservations.policies.length > 0}
		<section class="policies-section">
			<div class="container">
				<h2>Reservation Policies</h2>
				<p class="policies-intro">
					We've kept our policies simple to ensure a smooth experience for everyone.
				</p>

				<ul class="policies-list">
					{#each $siteConfig.reservations.policies as policy}
						<li>{policy}</li>
					{/each}
				</ul>
			</div>
		</section>
	{/if}

	<!-- Hours -->
	<section class="hours-section">
		<div class="container">
			<h2>Dining Hours</h2>
			<div class="hours-grid">
				{#each $siteConfig.hours as entry}
					<div class="hours-row">
						<span class="day-label">{entry.days}</span>
						<span class="hours-value">{entry.hours}</span>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Private Events -->
	{#if $siteConfig.privateEvents && $siteConfig.privateEvents.enabled && $siteConfig.privateEvents.spaces}
		<section class="private-events-section">
			<div class="container">
				<h2>Private Dining</h2>
				<p class="section-lead">
					Host your next celebration or business gathering in one of our private spaces.
				</p>

				<div class="spaces-grid">
					{#each $siteConfig.privateEvents.spaces as space}
						<article class="space-card">
							<h3 class="space-name">{space.name}</h3>
							<p class="space-capacity">Seats up to {space.capacity} guests</p>
							<p class="space-description">{space.description}</p>
							{#if space.features && space.features.length > 0}
								<ul class="space-features">
									{#each space.features as feature}
										<li>{feature}</li>
									{/each}
								</ul>
							{/if}
						</article>
					{/each}
				</div>

				<div class="private-events-contact">
					<p>
						To discuss private event options, contact us at
						<a href="mailto:{$siteConfig.privateEvents.email}">
							{$siteConfig.privateEvents.email}
						</a>
						or call
						<a href="tel:{$siteConfig.privateEvents.phone}">
							{$siteConfig.privateEvents.phone}
						</a>.
					</p>
				</div>
			</div>
		</section>
	{/if}

	<!-- Location Reference -->
	<section class="location-reference">
		<div class="container">
			<h2>Visit Us</h2>
			<div class="location-info">
				<address class="address">
					{$siteConfig.address.street}<br />
					{$siteConfig.address.city}, {$siteConfig.address.state}
					{$siteConfig.address.zip}
				</address>

				{#if $siteConfig.location.parking && $siteConfig.location.parking.length > 0}
					<div class="parking-info">
						<h3>Parking</h3>
						<ul>
							{#each $siteConfig.location.parking as option}
								<li>{option}</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if $siteConfig.location.transit && $siteConfig.location.transit.length > 0}
					<div class="transit-info">
						<h3>Transit</h3>
						<ul>
							{#each $siteConfig.location.transit as option}
								<li>{option}</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>

			<div class="location-actions">
				<a href="/contact" class="cta-secondary">View Full Contact Info</a>
			</div>
		</div>
	</section>
</main>

<style>
	.reservations-page {
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 900px;
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	/* Page Header */
	.page-header {
		padding: var(--space-2xl) 0 var(--space-xl);
		text-align: center;
		border-bottom: 1px solid var(--color-border-default);
	}

	.page-header h1 {
		font-size: var(--text-display);
		font-weight: var(--font-light);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		letter-spacing: -0.02em;
	}

	.lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		max-width: 600px;
		margin: 0 auto;
		line-height: 1.6;
	}

	/* Booking Section */
	.booking-section {
		padding: var(--space-2xl) 0;
	}

	.booking-card {
		max-width: 500px;
		margin: 0 auto;
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-lg);
		text-align: center;
	}

	.booking-card h2 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.booking-note {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xl);
		line-height: 1.6;
	}

	.booking-actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.booking-button {
		padding: var(--space-md) var(--space-xl);
		border-radius: var(--radius-md);
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		transition: all var(--duration-micro) var(--ease-standard);
		text-decoration: none;
		display: inline-block;
	}

	.booking-button.primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: 1px solid var(--color-fg-primary);
	}

	.booking-button.primary:hover {
		background: var(--color-fg-secondary);
		border-color: var(--color-fg-secondary);
	}

	.booking-divider {
		position: relative;
		text-align: center;
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.booking-divider::before,
	.booking-divider::after {
		content: '';
		position: absolute;
		top: 50%;
		width: 40%;
		height: 1px;
		background: var(--color-border-default);
	}

	.booking-divider::before {
		left: 0;
	}

	.booking-divider::after {
		right: 0;
	}

	.phone-booking {
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-md);
	}

	.phone-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-xs);
	}

	.phone-number {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.phone-number:hover {
		color: var(--color-fg-secondary);
	}

	/* Party Size Info */
	.party-size-section {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-md);
	}

	.info-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.info-card h3 {
		font-size: var(--text-h4);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.info-card p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.info-card a {
		color: var(--color-fg-primary);
		text-decoration: underline;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.info-card a:hover {
		color: var(--color-fg-secondary);
	}

	/* Policies Section */
	.policies-section {
		padding: var(--space-2xl) 0;
	}

	.policies-section h2 {
		font-size: var(--text-h1);
		font-weight: var(--font-light);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
		text-align: center;
	}

	.policies-intro {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		text-align: center;
		margin: 0 auto var(--space-xl);
		max-width: 600px;
	}

	.policies-list {
		list-style: none;
		padding: 0;
		max-width: 700px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.policies-list li {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	/* Hours Section */
	.hours-section {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.hours-section h2 {
		font-size: var(--text-h1);
		font-weight: var(--font-light);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xl);
		text-align: center;
	}

	.hours-grid {
		max-width: 600px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.hours-row {
		display: flex;
		justify-content: space-between;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.day-label {
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		text-transform: capitalize;
	}

	.hours-value {
		color: var(--color-fg-secondary);
		text-align: right;
	}

	/* Private Events Section */
	.private-events-section {
		padding: var(--space-2xl) 0;
	}

	.private-events-section h2 {
		font-size: var(--text-h1);
		font-weight: var(--font-light);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
		text-align: center;
	}

	.section-lead {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		text-align: center;
		margin: 0 auto var(--space-xl);
		max-width: 600px;
	}

	.spaces-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-xl);
	}

	.space-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.space-name {
		font-size: var(--text-h4);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.space-capacity {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-sm);
	}

	.space-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin-bottom: var(--space-sm);
	}

	.space-features {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.space-features li {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		padding-left: var(--space-sm);
		position: relative;
	}

	.space-features li::before {
		content: '•';
		position: absolute;
		left: 0;
	}

	.private-events-contact {
		text-align: center;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.private-events-contact p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.private-events-contact a {
		color: var(--color-fg-primary);
		text-decoration: underline;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.private-events-contact a:hover {
		color: var(--color-fg-secondary);
	}

	/* Location Reference */
	.location-reference {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.location-reference h2 {
		font-size: var(--text-h1);
		font-weight: var(--font-light);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xl);
		text-align: center;
	}

	.location-info {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.address {
		font-style: normal;
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.7;
	}

	.parking-info,
	.transit-info {
		color: var(--color-fg-secondary);
	}

	.parking-info h3,
	.transit-info h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.parking-info ul,
	.transit-info ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.parking-info li,
	.transit-info li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.location-actions {
		text-align: center;
	}

	.cta-secondary {
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		transition: all var(--duration-micro) var(--ease-standard);
		text-decoration: none;
		display: inline-block;
		background: transparent;
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-emphasis);
	}

	.cta-secondary:hover {
		background: var(--color-hover);
		border-color: var(--color-border-strong);
	}
</style>
