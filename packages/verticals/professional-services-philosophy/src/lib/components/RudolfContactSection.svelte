<script lang="ts">
	/**
	 * RudolfContactSection - Contact form with Rudolf template styling
	 *
	 * Layout: Centered form with clear hierarchy
	 * Interaction: Progressive disclosure
	 */

	import { siteConfig } from '$lib/config/context';

	let formState = $state<'idle' | 'submitting' | 'success' | 'error'>('idle');
	let email = $state('');
	let message = $state('');
	let showNameField = $state(false);
	let name = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!email || !message) return;

		formState = 'submitting';

		try {
			const response = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					message,
					name: name || undefined
				})
			});

			if (response.ok) {
				formState = 'success';
				email = '';
				message = '';
				name = '';
				showNameField = false;
			} else {
				formState = 'error';
			}
		} catch {
			formState = 'error';
		}
	}

	function handleEmailBlur() {
		if (email.includes('@') && !showNameField) {
			showNameField = true;
		}
	}
</script>

<section id="contact" class="section-contact">
	<div class="container">
		<div class="contact-wrapper">
			<div class="contact-header">
				<h2 class="contact-heading">Inquire</h2>
				<p class="contact-subheading">
					Email required. Response within 48 hours.
				</p>
			</div>

			{#if formState === 'success'}
				<div class="success-message">
					<svg
						width="48"
						height="48"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
					<h3>Message received</h3>
					<p>We'll respond within 48 hours.</p>
				</div>
			{:else}
				<form class="contact-form" onsubmit={handleSubmit}>
					<div class="form-field">
						<label for="email" class="form-label">Email *</label>
						<input
							type="email"
							id="email"
							bind:value={email}
							onblur={handleEmailBlur}
							required
							class="form-input"
							placeholder="your@email.com"
							disabled={formState === 'submitting'}
						/>
					</div>

					{#if showNameField}
						<div class="form-field form-field-animated">
							<label for="name" class="form-label">Name (optional)</label>
							<input
								type="text"
								id="name"
								bind:value={name}
								class="form-input"
								placeholder="Your name"
								disabled={formState === 'submitting'}
							/>
						</div>
					{/if}

					<div class="form-field">
						<label for="message" class="form-label">Message *</label>
						<textarea
							id="message"
							bind:value={message}
							required
							class="form-textarea"
							placeholder="Tell us about your project..."
							rows="6"
							disabled={formState === 'submitting'}
						></textarea>
					</div>

					{#if formState === 'error'}
						<div class="error-message">
							Failed to send message. Please try again.
						</div>
					{/if}

					<button
						type="submit"
						class="submit-button"
						disabled={formState === 'submitting'}
					>
						{formState === 'submitting' ? 'Sending...' : 'Send Message'}
					</button>
				</form>
			{/if}
		</div>
	</div>
</section>

<style>
	.section-contact {
		padding: var(--section-padding) 0;
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 0 var(--space-lg);
	}

	.contact-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--space-3xl);
	}

	.contact-header {
		text-align: center;
	}

	.contact-heading {
		font-size: clamp(2.5rem, 5vw, 4rem);
		font-weight: 700;
		line-height: 1.2;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md);
		letter-spacing: -0.02em;
	}

	.contact-subheading {
		font-size: var(--text-body-lg);
		line-height: 1.6;
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.contact-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.form-field-animated {
		animation: fadeIn var(--duration-standard) var(--ease-standard);
	}

	.form-label {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.form-input,
	.form-textarea {
		width: 100%;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		font-family: inherit;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.form-input:focus,
	.form-textarea:focus {
		outline: none;
		border-color: var(--color-focus);
		box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
	}

	.form-input:disabled,
	.form-textarea:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.form-textarea {
		resize: vertical;
		min-height: 150px;
	}

	.submit-button {
		padding: var(--space-md) var(--space-2xl);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: var(--radius-full);
		font-size: var(--text-body);
		font-weight: 600;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
		align-self: flex-start;
	}

	.submit-button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.9);
		transform: translateY(-2px);
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.success-message {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-4xl) var(--space-2xl);
		text-align: center;
		color: var(--color-fg-primary);
	}

	.success-message svg {
		color: var(--color-success);
	}

	.success-message h3 {
		font-size: var(--text-h2);
		font-weight: 700;
		margin: 0;
	}

	.success-message p {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.error-message {
		padding: var(--space-md);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
		color: var(--color-error);
		font-size: var(--text-body-sm);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
