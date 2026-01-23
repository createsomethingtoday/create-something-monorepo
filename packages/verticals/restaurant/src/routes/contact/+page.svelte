<script lang="ts">
	/**
	 * Contact Page - Restaurant
	 *
	 * Address, phone, email, hours, parking/transit.
	 * Simple contact form for inquiries.
	 */

	import { SEO } from '@create-something/components';
	import { siteConfig } from '$lib/config/context';

	let formState: 'idle' | 'submitting' | 'success' | 'error' = 'idle';
	let formData = {
		name: '',
		email: '',
		phone: '',
		message: ''
	};

	async function handleSubmit(event: Event) {
		event.preventDefault();
		formState = 'submitting';

		// Simulate form submission (replace with actual API call)
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// For now, just show success
		formState = 'success';

		// Reset form after 3 seconds
		setTimeout(() => {
			formState = 'idle';
			formData = { name: '', email: '', phone: '', message: '' };
		}, 3000);
	}
</script>

<SEO
	title="Contact"
	description="Get in touch with us. Visit our restaurant or call to make a reservation."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Contact', url: '/contact' }
	]}
/>

<main class="contact-page">
	<!-- Page Header -->
	<section class="page-header">
		<div class="container">
			<h1>Contact</h1>
			<p class="lead">We'd love to hear from you. Reach out with questions, special requests, or just to say hello.</p>
		</div>
	</section>

	<!-- Contact Content -->
	<div class="contact-content">
		<!-- Contact Info Sidebar -->
		<aside class="contact-info">
			<div class="info-section">
				<h2 class="info-label">Location</h2>
				<address class="info-address">
					{$siteConfig.address.street}<br />
					{$siteConfig.address.city}, {$siteConfig.address.state}
					{$siteConfig.address.zip}
				</address>
				{#if $siteConfig.location.neighborhood}
					<p class="info-detail">{$siteConfig.location.neighborhood}</p>
				{/if}
			</div>

			<div class="info-section">
				<h2 class="info-label">Contact</h2>
				<div class="info-links">
					<a href="tel:{$siteConfig.phone}" class="info-link">{$siteConfig.phone}</a>
					<a href="mailto:{$siteConfig.email}" class="info-link">{$siteConfig.email}</a>
				</div>
			</div>

			<div class="info-section">
				<h2 class="info-label">Hours</h2>
				<div class="hours-list">
					{#each $siteConfig.hours as entry}
						<div class="hours-row">
							<span class="day">{entry.days}</span>
							<span class="hours">{entry.hours}</span>
						</div>
					{/each}
				</div>
			</div>

			{#if $siteConfig.social}
				<div class="info-section">
					<h2 class="info-label">Follow</h2>
					<div class="social-links">
						{#if $siteConfig.social.instagram}
							<a
								href={$siteConfig.social.instagram}
								target="_blank"
								rel="noopener noreferrer"
								class="info-link"
							>
								Instagram
							</a>
						{/if}
						{#if $siteConfig.social.facebook}
							<a
								href={$siteConfig.social.facebook}
								target="_blank"
								rel="noopener noreferrer"
								class="info-link"
							>
								Facebook
							</a>
						{/if}
						{#if $siteConfig.social.yelp}
							<a
								href={$siteConfig.social.yelp}
								target="_blank"
								rel="noopener noreferrer"
								class="info-link"
							>
								Yelp
							</a>
						{/if}
					</div>
				</div>
			{/if}
		</aside>

		<!-- Contact Form -->
		<div class="contact-form-section">
			<div class="form-intro">
				<h2>Send Us a Message</h2>
				<p>
					Have a question or special request? Fill out the form below and we'll get back to you
					within 24 hours.
				</p>
			</div>

			<form class="contact-form" on:submit={handleSubmit}>
				<div class="form-group">
					<label for="name" class="form-label">Name *</label>
					<input
						type="text"
						id="name"
						name="name"
						bind:value={formData.name}
						required
						class="form-input"
						disabled={formState === 'submitting'}
					/>
				</div>

				<div class="form-group">
					<label for="email" class="form-label">Email *</label>
					<input
						type="email"
						id="email"
						name="email"
						bind:value={formData.email}
						required
						class="form-input"
						disabled={formState === 'submitting'}
					/>
				</div>

				<div class="form-group">
					<label for="phone" class="form-label">Phone</label>
					<input
						type="tel"
						id="phone"
						name="phone"
						bind:value={formData.phone}
						class="form-input"
						disabled={formState === 'submitting'}
					/>
				</div>

				<div class="form-group">
					<label for="message" class="form-label">Message *</label>
					<textarea
						id="message"
						name="message"
						bind:value={formData.message}
						required
						rows="6"
						class="form-textarea"
						disabled={formState === 'submitting'}
					></textarea>
				</div>

				{#if formState === 'success'}
					<div class="form-message success">
						Thank you! We've received your message and will respond within 24 hours.
					</div>
				{/if}

				{#if formState === 'error'}
					<div class="form-message error">
						Something went wrong. Please try again or call us directly.
					</div>
				{/if}

				<button type="submit" class="form-submit" disabled={formState === 'submitting'}>
					{formState === 'submitting' ? 'Sending...' : 'Send Message'}
				</button>
			</form>
		</div>
	</div>

	<!-- Additional Info -->
	<section class="additional-info">
		<div class="container">
			<div class="info-grid">
				{#if $siteConfig.location.parking && $siteConfig.location.parking.length > 0}
					<div class="info-card">
						<h3>Parking</h3>
						<ul>
							{#each $siteConfig.location.parking as option}
								<li>{option}</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if $siteConfig.location.transit && $siteConfig.location.transit.length > 0}
					<div class="info-card">
						<h3>Public Transit</h3>
						<ul>
							{#each $siteConfig.location.transit as option}
								<li>{option}</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if $siteConfig.location.landmarks && $siteConfig.location.landmarks.length > 0}
					<div class="info-card">
						<h3>Nearby</h3>
						<ul>
							{#each $siteConfig.location.landmarks as landmark}
								<li>{landmark}</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- Map Placeholder -->
	<section class="map-section">
		<div class="map-placeholder">
			<p>Map placeholder - {$siteConfig.address.street}, {$siteConfig.address.city}</p>
			<a
				href="https://maps.google.com/?q={encodeURIComponent(
					`${$siteConfig.address.street}, ${$siteConfig.address.city}, ${$siteConfig.address.state} ${$siteConfig.address.zip}`
				)}"
				target="_blank"
				rel="noopener noreferrer"
				class="map-link"
			>
				Open in Google Maps
			</a>
		</div>
	</section>
</main>

<style>
	.contact-page {
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 1200px;
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
		max-width: 700px;
		margin: 0 auto;
		line-height: 1.6;
	}

	/* Contact Content */
	.contact-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-2xl) var(--space-md);
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: var(--space-2xl);
	}

	@media (max-width: 968px) {
		.contact-content {
			grid-template-columns: 1fr;
		}
	}

	/* Contact Info Sidebar */
	.contact-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	.info-section {
		padding-bottom: var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.info-section:last-child {
		border-bottom: none;
	}

	.info-label {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		letter-spacing: 0.05em;
		text-transform: uppercase;
		margin-bottom: var(--space-sm);
	}

	.info-address {
		font-style: normal;
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin-bottom: var(--space-xs);
	}

	.info-detail {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.info-links,
	.social-links {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.info-link {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.info-link:hover {
		color: var(--color-fg-primary);
	}

	.hours-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.hours-row {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-body-sm);
		padding: var(--space-xs) 0;
	}

	.day {
		color: var(--color-fg-secondary);
		text-transform: capitalize;
	}

	.hours {
		color: var(--color-fg-tertiary);
		text-align: right;
	}

	/* Contact Form */
	.contact-form-section {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
	}

	.form-intro {
		margin-bottom: var(--space-xl);
	}

	.form-intro h2 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.form-intro p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.contact-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.form-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
	}

	.form-input,
	.form-textarea {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		font-family: inherit;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.form-input:focus,
	.form-textarea:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.form-input:disabled,
	.form-textarea:disabled {
		color: var(--color-fg-muted);
		cursor: not-allowed;
	}

	.form-textarea {
		resize: vertical;
		min-height: 120px;
	}

	.form-message {
		padding: var(--space-md);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		line-height: 1.5;
	}

	.form-message.success {
		background: var(--color-success-muted);
		border: 1px solid var(--color-success);
		color: var(--color-success);
	}

	.form-message.error {
		background: var(--color-error-muted);
		border: 1px solid var(--color-error);
		color: var(--color-error);
	}

	.form-submit {
		padding: var(--space-md) var(--space-xl);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: 1px solid var(--color-fg-primary);
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		font-family: inherit;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.form-submit:hover:not(:disabled) {
		background: var(--color-fg-secondary);
		border-color: var(--color-fg-secondary);
	}

	.form-submit:disabled {
		background: var(--color-fg-muted);
		border-color: var(--color-fg-muted);
		cursor: not-allowed;
	}

	/* Additional Info */
	.additional-info {
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

	.info-card ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.info-card li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.5;
	}

	/* Map Section */
	.map-section {
		background: var(--color-bg-elevated);
	}

	.map-placeholder {
		height: 400px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		background: var(--color-bg-surface);
		border-top: 1px solid var(--color-border-default);
		color: var(--color-fg-tertiary);
	}

	.map-placeholder p {
		font-size: var(--text-body);
	}

	.map-link {
		padding: var(--space-sm) var(--space-lg);
		background: transparent;
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.map-link:hover {
		background: var(--color-hover);
		border-color: var(--color-border-strong);
	}
</style>
