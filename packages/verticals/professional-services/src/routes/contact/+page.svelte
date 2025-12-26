<script lang="ts">
	/**
	 * Contact Page - DWELL-Inspired Invitation to Connect
	 *
	 * Simple, direct, unhurried.
	 * The form is the focus. Contact info supports.
	 *
	 * "Every project begins with a conversation."
	 */

	import ProgressiveForm from '$lib/components/ProgressiveForm.svelte';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { siteConfig } from '$lib/config/context';
</script>

<SEOHead
	title="Contact | {$siteConfig.name}"
	description="Start a conversation about your project. We'd love to hear from you."
	canonical="/contact"
/>

<main class="contact-page">
	<!-- Header -->
	<header class="contact-header">
		<h1 class="contact-title">Contact</h1>
		<p class="contact-intro">
			Projects begin with a site visit. Share your location and timeline—we'll respond within 48 hours.
		</p>
	</header>

	<!-- Two column layout -->
	<div class="contact-content">
		<!-- Form -->
		<div class="contact-form-section">
			<ProgressiveForm
				title="Inquire"
				subtitle="Email required. Response within 48 hours."
			/>
		</div>

		<!-- Info -->
		<aside class="contact-info">
			<div class="info-group">
				<h2 class="info-label">Studio</h2>
				<address class="info-address">
					{$siteConfig.address.street}<br />
					{$siteConfig.address.city}, {$siteConfig.address.state} {$siteConfig.address.zip}
				</address>
			</div>

			<div class="info-group">
				<h2 class="info-label">Direct</h2>
				<a href="mailto:{$siteConfig.email}" class="info-link">{$siteConfig.email}</a>
				<a href="tel:{$siteConfig.phone}" class="info-link">{$siteConfig.phone}</a>
			</div>

			<div class="info-group">
				<h2 class="info-label">Follow</h2>
				<div class="social-links">
					{#if $siteConfig.social.instagram}
						<a
							href={$siteConfig.social.instagram}
							class="info-link"
							target="_blank"
							rel="noopener noreferrer"
						>
							Instagram
						</a>
					{/if}
					{#if $siteConfig.social.pinterest}
						<a
							href={$siteConfig.social.pinterest}
							class="info-link"
							target="_blank"
							rel="noopener noreferrer"
						>
							Pinterest
						</a>
					{/if}
				</div>
			</div>
		</aside>
	</div>
</main>

<style>
	.contact-page {
		background: var(--color-bg-pure);
		min-height: 100vh;
		padding-top: var(--space-3xl);
	}

	/* Header */
	.contact-header {
		max-width: var(--width-wide);
		margin: 0 auto;
		padding: 0 var(--space-lg) var(--space-2xl);
	}

	.contact-title {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		letter-spacing: var(--tracking-wider);
		text-transform: uppercase;
		margin-bottom: var(--space-lg);
	}

	.contact-intro {
		font-size: var(--text-h2);
		font-weight: var(--font-light);
		color: var(--color-fg-primary);
		line-height: var(--leading-relaxed);
		max-width: var(--width-prose);
	}

	/* Content */
	.contact-content {
		max-width: var(--width-wide);
		margin: 0 auto;
		padding: 0 var(--space-lg) var(--space-3xl);
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-2xl);
	}

	@media (min-width: 1024px) {
		.contact-content {
			grid-template-columns: 2fr 1fr;
			gap: var(--space-3xl);
		}
	}

	/* Form section */
	.contact-form-section {
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	/* Info sidebar */
	.contact-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	@media (min-width: 1024px) {
		.contact-info {
			border-top: none;
			border-left: 1px solid var(--color-border-default);
			padding-left: var(--space-xl);
			padding-top: 0;
		}
	}

	.info-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.info-label {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		letter-spacing: var(--tracking-wider);
		text-transform: uppercase;
	}

	.info-address {
		font-style: normal;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.info-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.info-link:hover {
		color: var(--color-fg-primary);
	}

	.social-links {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.info-link {
			transition: none;
		}
	}
</style>
