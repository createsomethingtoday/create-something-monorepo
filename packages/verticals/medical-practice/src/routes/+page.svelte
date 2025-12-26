<script lang="ts">
	import { siteConfig } from '$lib/config/context';
</script>

<svelte:head>
	<title>{$siteConfig.name} - {$siteConfig.tagline}</title>
	<meta name="description" content={$siteConfig.description} />
</svelte:head>

<section class="hero">
	<div class="container">
		<h1>{$siteConfig.tagline}</h1>
		<p class="lead">{$siteConfig.description}</p>
		<div class="cta-group">
			<a href="/contact" class="button-primary">Book Appointment</a>
			<a href="/services" class="button-secondary">Our Services</a>
		</div>
	</div>
</section>

<section class="services-preview">
	<div class="container">
		<h2>Our Services</h2>
		<div class="services-grid">
			{#each $siteConfig.services.slice(0, 3) as service}
				<div class="service-card">
					<h3>{service.title}</h3>
					<p>{service.description}</p>
				</div>
			{/each}
		</div>
		<a href="/services" class="view-all">View All Services →</a>
	</div>
</section>

<section class="insurance">
	<div class="container">
		<h2>Insurance Accepted</h2>
		<p class="note">{$siteConfig.insurance.note}</p>
		<div class="insurance-grid">
			{#each $siteConfig.insurance.accepted.slice(0, 6) as plan}
				<div class="insurance-badge">{plan}</div>
			{/each}
		</div>
	</div>
</section>

<!-- Providers Preview -->
{#if $siteConfig.providers && $siteConfig.providers.length > 0}
	<section class="providers-preview">
		<div class="container">
			<h2>Our Care Team</h2>
			<p class="section-note">Board-certified physicians and nurse practitioners dedicated to your health.</p>
			<div class="providers-grid">
				{#each $siteConfig.providers as provider}
					<div class="provider-card">
						<div class="provider-image-wrapper">
							<img src={provider.image} alt={provider.name} class="provider-image" loading="lazy" />
						</div>
						<div class="provider-info">
							<h3 class="provider-name">{provider.name}</h3>
							<p class="provider-credentials">{provider.credentials}</p>
							<p class="provider-role">{provider.role}</p>
							{#if provider.languages && provider.languages.length > 1}
								<p class="provider-languages">
									<svg class="lang-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
										<path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
									</svg>
									{provider.languages.join(', ')}
								</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
			<a href="/team" class="view-all">Meet Our Full Team →</a>
		</div>
	</section>
{/if}

<!-- Practical Info: Hours, Location, Contact -->
<section class="practical-info">
	<div class="container">
		<div class="practical-grid">
			<!-- Hours -->
			<div class="practical-card hours-card">
				<h3 class="practical-title">
					<svg class="practical-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<circle cx="12" cy="12" r="10"/>
						<path d="M12 6v6l4 2"/>
					</svg>
					Office Hours
				</h3>
				<dl class="hours-list">
					{#each Object.entries($siteConfig.hours) as [day, hours]}
						<div class="hours-row" class:closed={hours === 'Closed'}>
							<dt class="day-name">{day.charAt(0).toUpperCase() + day.slice(1)}</dt>
							<dd class="hours-value">{hours}</dd>
						</div>
					{/each}
				</dl>
				{#if $siteConfig.afterHours?.enabled}
					<div class="after-hours">
						<span class="after-hours-label">After Hours</span>
						<a href="tel:{$siteConfig.afterHours.phone}" class="after-hours-phone">{$siteConfig.afterHours.phone}</a>
						<p class="after-hours-note">{$siteConfig.afterHours.note}</p>
					</div>
				{/if}
			</div>

			<!-- Location -->
			<div class="practical-card location-card">
				<h3 class="practical-title">
					<svg class="practical-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
						<path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
					</svg>
					Location
				</h3>
				<address class="location-address">
					<span class="address-line">{$siteConfig.address.street}</span>
					<span class="address-line">{$siteConfig.address.city}, {$siteConfig.address.state} {$siteConfig.address.zip}</span>
				</address>
				<a href="https://maps.google.com/?q={encodeURIComponent(`${$siteConfig.address.street}, ${$siteConfig.address.city}, ${$siteConfig.address.state} ${$siteConfig.address.zip}`)}"
				   target="_blank"
				   rel="noopener"
				   class="directions-link">
					Get Directions →
				</a>
			</div>

			<!-- Contact -->
			<div class="practical-card contact-card">
				<h3 class="practical-title">
					<svg class="practical-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
					</svg>
					Contact
				</h3>
				<div class="contact-list">
					<a href="tel:{$siteConfig.phone}" class="contact-item">
						<span class="contact-label">Phone</span>
						<span class="contact-value">{$siteConfig.phone}</span>
					</a>
					{#if $siteConfig.fax}
						<div class="contact-item">
							<span class="contact-label">Fax</span>
							<span class="contact-value">{$siteConfig.fax}</span>
						</div>
					{/if}
					<a href="mailto:{$siteConfig.email}" class="contact-item">
						<span class="contact-label">Email</span>
						<span class="contact-value">{$siteConfig.email}</span>
					</a>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Patient Portal CTA -->
{#if $siteConfig.patientPortal?.enabled}
	<section class="portal-cta">
		<div class="container">
			<div class="portal-content">
				<div class="portal-text">
					<h2>Patient Portal</h2>
					<p>Access your health information online, anytime.</p>
					<ul class="portal-features">
						{#each $siteConfig.patientPortal.features.slice(0, 4) as feature}
							<li>{feature}</li>
						{/each}
					</ul>
				</div>
				<div class="portal-actions">
					<a href={$siteConfig.patientPortal.url} target="_blank" rel="noopener" class="button-primary">
						Access Portal
					</a>
				</div>
			</div>
		</div>
	</section>
{/if}

<!-- New Patients CTA -->
{#if $siteConfig.newPatients?.accepting}
	<section class="new-patients">
		<div class="container">
			<div class="new-patients-content">
				<span class="accepting-badge">Now Accepting New Patients</span>
				<p>{$siteConfig.newPatients.note}</p>
				<a href="/contact" class="button-primary">Schedule Your First Visit</a>
			</div>
		</div>
	</section>
{/if}

<style>
	.hero {
		padding: var(--space-2xl) 0;
		text-align: center;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	h1 {
		margin-bottom: var(--space-md);
	}

	.lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xl);
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;
	}

	.cta-group {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
	}

	.button-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		padding: var(--space-md) var(--space-lg);
		border-radius: var(--radius-md);
		font-weight: var(--font-semibold);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.button-primary:hover {
		background: var(--color-fg-secondary);
	}

	.button-secondary {
		border: 1px solid var(--color-border-emphasis);
		color: var(--color-fg-primary);
		padding: var(--space-md) var(--space-lg);
		border-radius: var(--radius-md);
		font-weight: var(--font-semibold);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.button-secondary:hover {
		border-color: var(--color-border-strong);
	}

	.services-preview {
		padding: var(--space-2xl) 0;
	}

	.services-preview h2 {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.services-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.service-card {
		background: var(--color-bg-surface);
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.service-card h3 {
		margin-bottom: var(--space-sm);
		color: var(--color-fg-primary);
	}

	.service-card p {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.view-all {
		display: block;
		text-align: center;
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	.insurance {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.insurance h2 {
		text-align: center;
		margin-bottom: var(--space-sm);
	}

	.note {
		text-align: center;
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-xl);
		font-size: var(--text-body-sm);
	}

	.insurance-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.insurance-badge {
		background: var(--color-bg-surface);
		padding: var(--space-md);
		text-align: center;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	/* ==========================================================================
	   Providers Preview
	   ========================================================================== */

	.providers-preview {
		padding: var(--space-2xl) 0;
	}

	.providers-preview h2 {
		text-align: center;
		margin-bottom: var(--space-sm);
	}

	.section-note {
		text-align: center;
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-xl);
		font-size: var(--text-body);
	}

	.providers-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.provider-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.provider-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.provider-image-wrapper {
		aspect-ratio: 1;
		overflow: hidden;
		background: var(--color-bg-elevated);
	}

	.provider-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.provider-card:hover .provider-image {
		transform: scale(1.03);
	}

	.provider-info {
		padding: var(--space-md);
	}

	.provider-name {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: 2px;
	}

	.provider-credentials {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.provider-role {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.provider-languages {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.lang-icon {
		width: 14px;
		height: 14px;
		opacity: 0.6;
	}

	/* ==========================================================================
	   Practical Info Section
	   ========================================================================== */

	.practical-info {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.practical-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);
	}

	.practical-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.practical-title {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.practical-icon {
		width: 20px;
		height: 20px;
		opacity: 0.6;
	}

	/* Hours */
	.hours-list {
		margin: 0;
		padding: 0;
	}

	.hours-row {
		display: flex;
		justify-content: space-between;
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.hours-row:last-child {
		border-bottom: none;
	}

	.hours-row.closed {
		opacity: 0.5;
	}

	.day-name {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.hours-value {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.after-hours {
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-emphasis);
		background: var(--color-bg-elevated);
		margin: var(--space-md) calc(-1 * var(--space-lg)) calc(-1 * var(--space-lg));
		padding: var(--space-md) var(--space-lg) var(--space-lg);
		border-radius: 0 0 var(--radius-lg) var(--radius-lg);
	}

	.after-hours-label {
		display: block;
		font-size: var(--text-caption);
		color: var(--color-warning);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-xs);
	}

	.after-hours-phone {
		display: block;
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.after-hours-note {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
	}

	/* Location */
	.location-address {
		font-style: normal;
		margin-bottom: var(--space-md);
	}

	.address-line {
		display: block;
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		line-height: var(--leading-relaxed);
	}

	.directions-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.directions-link:hover {
		color: var(--color-fg-primary);
	}

	/* Contact */
	.contact-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.contact-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-sm);
		margin: 0 calc(-1 * var(--space-sm));
		border-radius: var(--radius-md);
		transition: background var(--duration-micro) var(--ease-standard);
		text-decoration: none;
	}

	a.contact-item:hover {
		background: var(--color-hover);
	}

	.contact-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.contact-value {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* ==========================================================================
	   Patient Portal CTA
	   ========================================================================== */

	.portal-cta {
		padding: var(--space-2xl) 0;
	}

	.portal-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
	}

	.portal-text h2 {
		margin-bottom: var(--space-xs);
	}

	.portal-text p {
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
	}

	.portal-features {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-xs) var(--space-lg);
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.portal-features li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		position: relative;
		padding-left: var(--space-md);
	}

	.portal-features li::before {
		content: '✓';
		position: absolute;
		left: 0;
		color: var(--color-success);
	}

	/* ==========================================================================
	   New Patients CTA
	   ========================================================================== */

	.new-patients {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.new-patients-content {
		text-align: center;
		max-width: 600px;
		margin: 0 auto;
	}

	.accepting-badge {
		display: inline-block;
		background: var(--color-success-muted);
		color: var(--color-success);
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--radius-full);
		margin-bottom: var(--space-md);
	}

	.new-patients-content p {
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
	}

	/* ==========================================================================
	   Responsive
	   ========================================================================== */

	@media (max-width: 1024px) {
		.practical-grid {
			grid-template-columns: 1fr 1fr;
		}

		.hours-card {
			grid-column: 1 / -1;
		}
	}

	@media (max-width: 768px) {
		.practical-grid {
			grid-template-columns: 1fr;
		}

		.portal-content {
			flex-direction: column;
			text-align: center;
		}

		.portal-features {
			grid-template-columns: 1fr;
			justify-items: center;
		}
	}
</style>
