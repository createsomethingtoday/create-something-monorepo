<script lang="ts">
	/**
	 * NewsletterSignup Component
	 *
	 * A Canon-compliant newsletter signup form with email capture.
	 * Includes loading states, success/error feedback, and honeypot protection.
	 *
	 * Canon: The form recedes into the action; only the commitment remains.
	 */

	interface Props {
		/** Property-specific headline */
		headline?: string;
		/** Property-specific description */
		description?: string;
		/** API endpoint for submission */
		endpoint?: string;
		/** Optional source tracking (defaults to property) */
		source?: string;
	}

	let {
		headline = 'Stay in the loop',
		description = 'Get updates on new experiments and research.',
		endpoint = '/api/newsletter',
		source
	}: Props = $props();

	let email = $state('');
	let honeypot = $state(''); // Hidden field to catch bots
	let status: 'idle' | 'loading' | 'success' | 'error' = $state('idle');
	let message = $state('');

	async function handleSubmit(event: Event) {
		event.preventDefault();

		// Don't submit if already loading
		if (status === 'loading') return;

		// Basic validation
		if (!email.trim()) {
			status = 'error';
			message = 'Email is required';
			return;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			status = 'error';
			message = 'Please enter a valid email';
			return;
		}

		status = 'loading';
		message = '';

		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: email.trim(),
					website: honeypot, // Honeypot field
					source
				})
			});

			const data = await response.json();

			if (response.ok && data.success) {
				status = 'success';
				message = data.message || 'Check your email to confirm.';
				email = '';
			} else {
				status = 'error';
				message = data.message || 'Something went wrong. Please try again.';
			}
		} catch {
			status = 'error';
			message = 'Network error. Please try again.';
		}
	}

	function handleInput() {
		// Clear error state when user starts typing
		if (status === 'error') {
			status = 'idle';
			message = '';
		}
	}
</script>

<section class="newsletter-section">
	<div class="newsletter-content">
		<h2 class="newsletter-headline">{headline}</h2>
		<p class="newsletter-description">{description}</p>

		{#if status === 'success'}
			<div class="success-message" role="status">
				<svg
					class="success-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path
						d="M20 6L9 17l-5-5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				<span>{message}</span>
			</div>
		{:else}
			<form class="newsletter-form" onsubmit={handleSubmit}>
				<!-- Honeypot field - hidden from humans, visible to bots -->
				<div class="honeypot" aria-hidden="true">
					<label for="website">Website</label>
					<input
						type="text"
						id="website"
						name="website"
						bind:value={honeypot}
						tabindex="-1"
						autocomplete="off"
					/>
				</div>

				<div class="form-row">
					<div class="input-wrapper">
						<label for="newsletter-email" class="visually-hidden">Email address</label>
						<input
							type="email"
							id="newsletter-email"
							name="email"
							placeholder="your@email.com"
							bind:value={email}
							oninput={handleInput}
							disabled={status === 'loading'}
							class:has-error={status === 'error'}
							required
							autocomplete="email"
						/>
					</div>
					<button
						type="submit"
						class="submit-button"
						disabled={status === 'loading'}
					>
						{#if status === 'loading'}
							<span class="loading-spinner" aria-hidden="true"></span>
							<span class="visually-hidden">Subscribing...</span>
						{:else}
							Subscribe
						{/if}
					</button>
				</div>

				{#if status === 'error' && message}
					<p class="error-message" role="alert">{message}</p>
				{/if}
			</form>
		{/if}
	</div>
</section>

<style>
	.newsletter-section {
		padding: var(--space-xl) var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.newsletter-content {
		max-width: var(--width-prose);
		margin: 0 auto;
		text-align: center;
	}

	.newsletter-headline {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.newsletter-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-md);
		line-height: var(--leading-relaxed);
	}

	/* Form Layout */
	.newsletter-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.form-row {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	@media (min-width: 640px) {
		.form-row {
			flex-direction: row;
			justify-content: center;
		}
	}

	/* Honeypot - hidden from humans */
	.honeypot {
		position: absolute;
		left: -9999px;
		opacity: 0;
		pointer-events: none;
	}

	/* Input Styling */
	.input-wrapper {
		flex: 1;
		max-width: 320px;
	}

	input[type="email"] {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		font-family: inherit;
		min-height: 44px;
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			box-shadow var(--duration-micro) var(--ease-standard);
	}

	input[type="email"]::placeholder {
		color: var(--color-fg-muted);
	}

	input[type="email"]:hover:not(:disabled):not(:focus) {
		border-color: var(--color-border-emphasis);
	}

	input[type="email"]:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
		box-shadow: 0 0 0 3px var(--color-focus);
	}

	input[type="email"]:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	input[type="email"].has-error {
		border-color: var(--color-error);
	}

	input[type="email"].has-error:focus {
		box-shadow: 0 0 0 3px var(--color-error-muted);
	}

	/* Button Styling */
	.submit-button {
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		font-family: inherit;
		cursor: pointer;
		min-height: 44px;
		min-width: 120px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		transition:
			opacity var(--duration-micro) var(--ease-standard),
			background var(--duration-micro) var(--ease-standard);
	}

	.submit-button:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.submit-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	/* Loading Spinner */
	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--color-bg-pure);
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin var(--duration-slow) linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Error Message */
	.error-message {
		font-size: var(--text-body-sm);
		color: var(--color-error);
		margin: 0;
		text-align: center;
	}

	/* Success Message */
	.success-message {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-md);
		color: var(--color-success);
		font-size: var(--text-body);
	}

	.success-icon {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	/* Accessibility */
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* Reduced Motion */
	@media (prefers-reduced-motion: reduce) {
		.loading-spinner {
			animation: none;
		}

		input[type="email"],
		.submit-button {
			transition: none;
		}
	}
</style>
