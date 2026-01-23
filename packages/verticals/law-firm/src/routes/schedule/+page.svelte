<script lang="ts">
	/**
	 * Schedule Page
	 * Consultation booking via Calendly embed
	 *
	 * WORKWAY Integration:
	 * When Calendly booking completes, WORKWAY triggers:
	 * "Consultation Booking to Clio" workflow
	 * This creates/updates Clio contact automatically.
	 */

	import { SEO } from '@create-something/components';
	import { getSiteConfigFromContext } from '$lib/config/context';
	import EthicsDisclaimer from '$lib/components/EthicsDisclaimer.svelte';

	const siteConfig = getSiteConfigFromContext();
	const { name, phone, email, workflows, disclaimer } = siteConfig;

	const calendlyUrl = workflows?.calendlyUrl;
</script>

<SEO
	title="Schedule a Consultation"
	description="Book a free consultation with our experienced attorneys. We'll discuss your legal matter and explain your options."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Schedule', url: '/schedule' }
	]}
/>

<main class="schedule-page">
	<section class="schedule-hero">
		<div class="container">
			<h1 class="page-title">Schedule a Consultation</h1>
			<p class="page-subtitle">
				Book a time to discuss your legal matter. Initial consultations are free.
			</p>
		</div>
	</section>

	<section class="schedule-content">
		<div class="container">
			{#if calendlyUrl && calendlyUrl.trim() !== ''}
				<div class="calendly-container">
					<iframe
						src={calendlyUrl}
						title="Schedule a consultation"
						class="calendly-iframe"
						loading="lazy"
					></iframe>
				</div>
			{:else}
				<div class="no-calendly">
					<h2 class="contact-title">Contact Us to Schedule</h2>
					<p class="contact-text">
						Online booking is not currently available.
						Please contact us directly to schedule your consultation.
					</p>

					<div class="contact-methods">
						<a href="tel:{phone}" class="contact-method">
							<span class="contact-icon">📞</span>
							<span class="contact-label">Call</span>
							<span class="contact-value">{phone}</span>
						</a>

						<a href="mailto:{email}?subject=Consultation Request" class="contact-method">
							<span class="contact-icon">✉️</span>
							<span class="contact-label">Email</span>
							<span class="contact-value">{email}</span>
						</a>

						<a href="/contact" class="contact-method">
							<span class="contact-icon">📝</span>
							<span class="contact-label">Form</span>
							<span class="contact-value">Submit online</span>
						</a>
					</div>
				</div>
			{/if}

			<div class="schedule-info">
				<h3 class="info-title">What to Expect</h3>
				<ul class="info-list">
					<li>30-minute consultation with an experienced attorney</li>
					<li>Discussion of your legal situation and options</li>
					<li>Clear explanation of next steps and costs</li>
					<li>No obligation to proceed</li>
				</ul>
			</div>

			<p class="schedule-disclaimer">{disclaimer}</p>
		</div>
	</section>

	<EthicsDisclaimer />
</main>

<style>
	.schedule-page {
		background: var(--color-bg-pure);
		min-height: 100vh;
	}

	.schedule-hero {
		padding: var(--space-2xl) var(--space-lg);
		padding-top: calc(var(--space-2xl) + 80px); /* Account for nav */
		text-align: center;
		background: var(--color-bg-elevated);
	}

	.container {
		max-width: 900px;
		margin: 0 auto;
	}

	.page-title {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.page-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.schedule-content {
		padding: var(--space-xl) var(--space-lg);
	}

	.calendly-container {
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		margin-bottom: var(--space-xl);
	}

	.calendly-iframe {
		width: 100%;
		height: 700px;
		border: none;
	}

	.no-calendly {
		text-align: center;
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
		margin-bottom: var(--space-xl);
	}

	.contact-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.contact-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-lg);
	}

	.contact-methods {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.contact-method {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.contact-method:hover {
		background: var(--color-bg-subtle);
	}

	.contact-icon {
		font-size: 1.5rem;
	}

	.contact-label {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.contact-value {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
	}

	.schedule-info {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
		margin-bottom: var(--space-lg);
	}

	.info-title {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.info-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.info-list li {
		position: relative;
		padding-left: var(--space-md);
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.info-list li::before {
		content: '✓';
		position: absolute;
		left: 0;
		color: var(--color-success);
	}

	.schedule-disclaimer {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-align: center;
		font-style: italic;
	}

	@media (max-width: 768px) {
		.schedule-hero {
			padding: var(--space-xl) var(--space-md);
			padding-top: calc(var(--space-xl) + 60px);
		}

		.schedule-content {
			padding: var(--space-lg) var(--space-md);
		}

		.calendly-iframe {
			height: 600px;
		}

		.contact-methods {
			grid-template-columns: 1fr;
		}
	}
</style>
