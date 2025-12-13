<script lang="ts">
	import { siteConfig } from '$lib/config/site';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import StructuredData from '$lib/components/StructuredData.svelte';

	let formState = $state<'idle' | 'submitting' | 'success' | 'error'>('idle');
	let formData = $state({
		name: '',
		email: '',
		inquiryType: '',
		message: ''
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		formState = 'submitting';

		try {
			const response = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			if (response.ok) {
				formState = 'success';
				formData = { name: '', email: '', inquiryType: '', message: '' };
			} else {
				formState = 'error';
			}
		} catch {
			formState = 'error';
		}
	}
</script>

<SEOHead title="Contact" canonical="/contact" description="Get in touch with {siteConfig.name}" />
<StructuredData page="contact" />

<div class="contact-page">
	<div class="contact-layout">
		<!-- Left: Info -->
		<div class="contact-info">
			<h1 class="page-title">Contact</h1>
			<p class="page-intro">
				New project inquiries, press, and general questions. We respond within 48 hours.
			</p>

			<div class="info-sections">
				<div class="info-section">
					<h2 class="info-label">Email</h2>
					<a href="mailto:{siteConfig.email}" class="info-value">{siteConfig.email}</a>
				</div>

				<div class="info-section">
					<h2 class="info-label">Phone</h2>
					<a href="tel:{siteConfig.phone}" class="info-value">{siteConfig.phone}</a>
				</div>

				<div class="info-section">
					<h2 class="info-label">Studio</h2>
					<address class="info-address">
						{siteConfig.address.street}<br />
						{siteConfig.address.city}, {siteConfig.address.state}
						{siteConfig.address.zip}
					</address>
				</div>
			</div>
		</div>

		<!-- Right: Form -->
		<div class="contact-form-wrapper">
			{#if formState === 'success'}
				<div class="success-message">
					<h2 class="success-title">Message received</h2>
					<p class="success-text">We'll be in touch within 48 hours.</p>
				</div>
			{:else}
				<form class="contact-form" onsubmit={handleSubmit}>
					<div class="form-group">
						<label for="name" class="form-label">Name</label>
						<input
							type="text"
							id="name"
							name="name"
							bind:value={formData.name}
							required
							class="form-input"
						/>
					</div>

					<div class="form-group">
						<label for="email" class="form-label">Email</label>
						<input
							type="email"
							id="email"
							name="email"
							bind:value={formData.email}
							required
							class="form-input"
						/>
					</div>

					<div class="form-group">
						<label for="inquiryType" class="form-label">Inquiry Type</label>
						<select
							id="inquiryType"
							name="inquiryType"
							bind:value={formData.inquiryType}
							required
							class="form-select"
						>
							<option value="">Select...</option>
							{#each siteConfig.inquiryTypes as type}
								<option value={type}>{type}</option>
							{/each}
						</select>
					</div>

					<div class="form-group">
						<label for="message" class="form-label">Message</label>
						<textarea
							id="message"
							name="message"
							bind:value={formData.message}
							rows="5"
							required
							class="form-textarea"
						></textarea>
					</div>

					{#if formState === 'error'}
						<p class="error-message">Something went wrong. Please try again.</p>
					{/if}

					<button type="submit" class="submit-button" disabled={formState === 'submitting'}>
						{formState === 'submitting' ? 'Sending...' : 'Send Message'}
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>

<style>
	.contact-page {
		padding: calc(var(--space-3xl) + 80px) var(--gutter) var(--space-2xl);
	}

	.contact-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3xl);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	/* Info */
	.page-title {
		font-size: var(--text-display);
		font-weight: 300;
		margin-bottom: var(--space-md);
	}

	.page-intro {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-2xl);
	}

	.info-sections {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.info-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.info-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.info-value {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.info-value:hover {
		color: var(--color-fg-secondary);
	}

	.info-address {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		font-style: normal;
		line-height: var(--leading-relaxed);
	}

	/* Form */
	.contact-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.form-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.form-input,
	.form-select,
	.form-textarea {
		font-family: inherit;
		font-size: var(--text-body);
		padding: var(--space-sm);
		border: 1px solid var(--color-border-default);
		background: transparent;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.form-input:focus,
	.form-select:focus,
	.form-textarea:focus {
		outline: none;
		border-color: var(--color-fg-primary);
	}

	.form-textarea {
		resize: vertical;
		min-height: 120px;
	}

	.submit-button {
		font-family: inherit;
		font-size: var(--text-body);
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
		align-self: flex-start;
	}

	.submit-button:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error-message {
		font-size: var(--text-body-sm);
		color: var(--color-error);
	}

	/* Success */
	.success-message {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-xl);
		background: var(--color-bg-surface);
	}

	.success-title {
		font-size: var(--text-h3);
		font-weight: 300;
	}

	.success-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	@media (max-width: 768px) {
		.contact-layout {
			grid-template-columns: 1fr;
			gap: var(--space-2xl);
		}
	}
</style>
