<script lang="ts">
	/**
	 * OUTERFIELDS Contact Page
	 *
	 * Simple contact form and information
	 */

	import { goto } from '$app/navigation';

	let formState: 'idle' | 'submitting' | 'success' | 'error' = $state('idle');
	let formData = $state({
		name: '',
		email: '',
		subject: '',
		message: ''
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		formState = 'submitting';

		try {
			// In production, this would send to an API endpoint
			// For demo purposes, we'll just simulate success
			await new Promise(resolve => setTimeout(resolve, 1000));
			formState = 'success';

			// Clear form after 2 seconds
			setTimeout(() => {
				formData = { name: '', email: '', subject: '', message: '' };
				formState = 'idle';
			}, 2000);
		} catch (error) {
			formState = 'error';
			setTimeout(() => {
				formState = 'idle';
			}, 3000);
		}
	}
</script>

<svelte:head>
	<title>Contact | OUTERFIELDS</title>
	<meta name="description" content="Get in touch with OUTERFIELDS - we're here to help with your premium content network." />
</svelte:head>

<div class="contact-page">
	<div class="contact-container">
		<header class="contact-header">
			<h1>Get in Touch</h1>
			<p class="subtitle">
				Have questions about building your Premium Content Network? We're here to help.
			</p>
		</header>

		<div class="contact-content">
			<div class="contact-info">
				<div class="info-card">
					<h2>Contact Information</h2>
					<div class="info-items">
						<div class="info-item">
							<div class="info-label">Email</div>
							<a href="mailto:hello@outerfields.com" class="info-value">hello@outerfields.com</a>
						</div>
						<div class="info-item">
							<div class="info-label">Sales</div>
							<a href="mailto:sales@outerfields.com" class="info-value">sales@outerfields.com</a>
						</div>
						<div class="info-item">
							<div class="info-label">Support</div>
							<a href="mailto:support@outerfields.com" class="info-value">support@outerfields.com</a>
						</div>
					</div>
				</div>

				<div class="info-card">
					<h2>Quick Links</h2>
					<div class="quick-links">
						<a href="/demo" class="quick-link">
							<span class="quick-link-icon">▸</span>
							<span>Try the Demo</span>
						</a>
						<a href="/privacy" class="quick-link">
							<span class="quick-link-icon">▸</span>
							<span>Privacy Policy</span>
						</a>
						<a href="/terms" class="quick-link">
							<span class="quick-link-icon">▸</span>
							<span>Terms of Service</span>
						</a>
					</div>
				</div>
			</div>

			<div class="contact-form-wrapper">
				<form class="contact-form" onsubmit={handleSubmit}>
					<div class="form-group">
						<label for="name">Name</label>
						<input
							type="text"
							id="name"
							bind:value={formData.name}
							required
							disabled={formState === 'submitting'}
							placeholder="Your name"
						/>
					</div>

					<div class="form-group">
						<label for="email">Email</label>
						<input
							type="email"
							id="email"
							bind:value={formData.email}
							required
							disabled={formState === 'submitting'}
							placeholder="you@example.com"
						/>
					</div>

					<div class="form-group">
						<label for="subject">Subject</label>
						<input
							type="text"
							id="subject"
							bind:value={formData.subject}
							required
							disabled={formState === 'submitting'}
							placeholder="How can we help?"
						/>
					</div>

					<div class="form-group">
						<label for="message">Message</label>
						<textarea
							id="message"
							bind:value={formData.message}
							required
							disabled={formState === 'submitting'}
							placeholder="Tell us more about your project..."
							rows="6"
						></textarea>
					</div>

					<button
						type="submit"
						class="submit-button"
						disabled={formState === 'submitting' || formState === 'success'}
					>
						{#if formState === 'submitting'}
							Sending...
						{:else if formState === 'success'}
							Message Sent!
						{:else if formState === 'error'}
							Try Again
						{:else}
							Send Message
						{/if}
					</button>

					{#if formState === 'success'}
						<p class="form-message success">Thanks! We'll get back to you soon.</p>
					{:else if formState === 'error'}
						<p class="form-message error">Something went wrong. Please try again.</p>
					{/if}
				</form>
			</div>
		</div>

		<footer class="contact-footer">
			<a href="/" class="back-link">&larr; Back to Home</a>
		</footer>
	</div>
</div>

<style>
	.contact-page {
		min-height: 100vh;
		padding: 8rem 1.5rem 4rem;
		background: var(--color-bg-pure);
	}

	.contact-container {
		max-width: var(--container-max-width);
		margin: 0 auto;
	}

	.contact-header {
		margin-bottom: 3rem;
		text-align: center;
	}

	.contact-header h1 {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
	}

	.subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.contact-content {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: 3rem;
		margin-bottom: 3rem;
	}

	/* Contact Info */
	.contact-info {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.info-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
	}

	.info-card h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 1.5rem;
	}

	.info-items {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.info-label {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.info-value {
		font-size: var(--text-body);
		color: var(--color-primary);
		text-decoration: none;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.info-value:hover {
		opacity: 0.8;
	}

	.quick-links {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.quick-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		color: var(--color-fg-secondary);
		text-decoration: none;
		border-radius: var(--radius-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.quick-link:hover {
		background: rgba(255, 255, 255, 0.05);
		color: var(--color-fg-primary);
	}

	.quick-link-icon {
		color: var(--color-primary);
		font-size: 0.875rem;
	}

	/* Contact Form */
	.contact-form-wrapper {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 2rem;
	}

	.contact-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-fg-primary);
	}

	.form-group input,
	.form-group textarea {
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: var(--color-primary);
		background: rgba(255, 255, 255, 0.08);
	}

	.form-group input::placeholder,
	.form-group textarea::placeholder {
		color: var(--color-fg-subtle);
	}

	.form-group textarea {
		resize: vertical;
		min-height: 150px;
		font-family: inherit;
	}

	.submit-button {
		padding: 1rem 2rem;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		font-weight: 600;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.submit-button:hover:not(:disabled) {
		background: var(--color-primary-hover);
		transform: translateY(-1px);
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.form-message {
		padding: 0.75rem 1rem;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		margin: 0;
	}

	.form-message.success {
		background: rgba(68, 170, 68, 0.2);
		color: var(--color-success);
		border: 1px solid var(--color-success-border);
	}

	.form-message.error {
		background: rgba(212, 77, 77, 0.2);
		color: var(--color-error);
		border: 1px solid var(--color-error-border);
	}

	/* Footer */
	.contact-footer {
		padding-top: 2rem;
		border-top: 1px solid var(--color-border-default);
	}

	.back-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-primary);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.contact-content {
			grid-template-columns: 1fr;
		}

		.contact-form-wrapper {
			padding: 1.5rem;
		}
	}
</style>
