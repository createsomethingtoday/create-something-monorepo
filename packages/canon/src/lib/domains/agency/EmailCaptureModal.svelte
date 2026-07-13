<script lang="ts">
	/**
	 * Email Capture Modal
	 *
	 * Collects email for free product delivery.
	 * Sends product via Resend API.
	 */

	import { Dialog } from '@create-something/canon';

	interface Props {
		open?: boolean;
		productId: string;
		productTitle: string;
		onclose?: () => void;
	}

	let { open = $bindable(false), productId, productTitle, onclose }: Props = $props();

	let email = $state('');
	let status = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let errorMessage = $state('');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!email || !email.includes('@')) {
			errorMessage = 'Please enter a valid email address';
			status = 'error';
			return;
		}

		status = 'loading';
		errorMessage = '';

		try {
			const response = await fetch(`/api/products/${productId}/deliver`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			const result = (await response.json()) as { success: boolean; message?: string };

			if (!response.ok) {
				throw new Error(result.message || 'Failed to send');
			}

			status = 'success';
		} catch (err) {
			status = 'error';
			errorMessage = err instanceof Error ? err.message : 'Something went wrong';
		}
	}

	function handleClose() {
		// Reset state on close
		if (status === 'success') {
			email = '';
			status = 'idle';
		}
		open = false;
		onclose?.();
	}
</script>

<Dialog bind:open title={status === 'success' ? 'Check Your Email' : `Get ${productTitle}`} {onclose}>
	{#if status === 'success'}
		<div class="success-content">
			<div class="success-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
			</div>
			<p class="success-message">
				We've sent <strong>{productTitle}</strong> to <strong>{email}</strong>
			</p>
			<p class="success-note">Check your inbox for the download link and quick-start guide.</p>
			<button type="button" class="close-button" onclick={handleClose}>Done</button>
		</div>
	{:else}
		<form onsubmit={handleSubmit} class="capture-form">
			<p class="form-description">
				Enter your email and we'll send you the {productTitle} with installation instructions.
			</p>

			<div class="form-field">
				<label for="email-input" class="sr-only">Email address</label>
				<input
					id="email-input"
					type="email"
					bind:value={email}
					placeholder="you@company.com"
					required
					disabled={status === 'loading'}
					class="email-input"
					class:error={status === 'error'}
				/>
			</div>

			{#if status === 'error' && errorMessage}
				<p class="error-message">{errorMessage}</p>
			{/if}

			<button type="submit" class="submit-button" disabled={status === 'loading'}>
				{#if status === 'loading'}
					<span class="spinner"></span>
					Sending...
				{:else}
					Send me the template
				{/if}
			</button>

			<p class="privacy-note">We'll only use your email to deliver this product. No spam.</p>
		</form>
	{/if}
</Dialog>

<style>
	.capture-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-md);
	}

	.form-description {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-secondary);
		margin: 0;
		line-height: 1.6;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.sr-only {
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

	.email-input {
		width: 100%;
		padding: var(--space-performance-sm) var(--space-performance-md);
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-primary);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.email-input:focus {
		outline: none;
		border-color: var(--color-performance-fg-primary);
		box-shadow: 0 0 0 3px var(--color-performance-focus-ring);
	}

	.email-input.error {
		border-color: var(--color-performance-error);
	}

	.email-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error-message {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-error);
		margin: 0;
	}

	.submit-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-performance-xs);
		width: 100%;
		padding: var(--space-performance-sm) var(--space-performance-md);
		font-size: var(--text-performance-body);
		font-weight: var(--font-performance-medium);
		color: var(--color-performance-bg-pure);
		background: var(--color-performance-fg-primary);
		border: none;
		border-radius: var(--radius-performance-scale-md);
		cursor: pointer;
		transition: opacity var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.submit-button:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.privacy-note {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		margin: 0;
		text-align: center;
	}

	/* Success state */
	.success-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: var(--space-performance-md);
		padding: var(--space-performance-md) 0;
	}

	.success-icon {
		width: 48px;
		height: 48px;
		color: var(--color-performance-success);
	}

	.success-icon svg {
		width: 100%;
		height: 100%;
	}

	.success-message {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-primary);
		margin: 0;
	}

	.success-note {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-secondary);
		margin: 0;
	}

	.close-button {
		padding: var(--space-performance-sm) var(--space-performance-lg);
		font-size: var(--text-performance-body);
		font-weight: var(--font-performance-medium);
		color: var(--color-performance-fg-primary);
		background: var(--color-performance-bg-subtle);
		border-radius: var(--radius-performance-scale-md);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.close-button:hover {
		background: var(--color-performance-hover);
	}
</style>
