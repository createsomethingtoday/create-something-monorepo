<script lang="ts">
	/**
	 * Magic Link Form
	 *
	 * Passwordless email authentication form with Identity worker integration.
	 * Sends a magic link to the user's email for frictionless sign-in.
	 *
	 * Canon: Passwords are friction. The email is the identity.
	 */

	interface Props {
		/** Called when magic link form is submitted */
		onSubmit: (email: string) => Promise<boolean>;
		/** Called when user clicks "Sign in with password" link */
		onSwitchToLogin?: () => void;
		/** External loading state (overrides internal) */
		isLoading?: boolean;
		/** External error message (overrides internal) */
		error?: string | null;
		/** Show login with password option */
		showPasswordOption?: boolean;
	}

	let {
		onSubmit,
		onSwitchToLogin,
		isLoading: externalLoading = false,
		error: externalError = null,
		showPasswordOption = true
	}: Props = $props();

	let email = $state('');
	let internalLoading = $state(false);
	let internalError = $state<string | null>(null);
	let sent = $state(false);

	const isLoading = $derived(externalLoading || internalLoading);
	const error = $derived(externalError || internalError);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		internalError = null;

		if (!email) {
			internalError = 'Please enter your email address';
			return;
		}

		internalLoading = true;

		try {
			const success = await onSubmit(email);
			if (success) {
				sent = true;
			}
		} catch (err) {
			internalError = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			internalLoading = false;
		}
	}

	function handleResend() {
		sent = false;
	}
</script>

{#if sent}
	<div class="auth-form success-state">
		<div class="success-icon">
			<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
			</svg>
		</div>
		<h2 class="form-title">Check your email</h2>
		<p class="form-subtitle">
			We sent a magic link to <strong>{email}</strong>. Click the link to sign in.
		</p>
		<p class="helper-text">
			Didn't receive it?
			<button type="button" class="link-button" onclick={handleResend}>
				Try again
			</button>
		</p>
	</div>
{:else}
	<form class="auth-form" onsubmit={handleSubmit}>
		<div class="form-header">
			<h2 class="form-title">Sign in with magic link</h2>
			<p class="form-subtitle">We'll send you a link to sign in instantly</p>
		</div>

		{#if error}
			<div class="error-message" role="alert">
				{error}
			</div>
		{/if}

		<div class="form-fields">
			<div class="field">
				<label for="magic-email" class="label">Email</label>
				<input
					id="magic-email"
					type="email"
					bind:value={email}
					class="input"
					placeholder="you@example.com"
					autocomplete="email"
					disabled={isLoading}
					required
				/>
			</div>
		</div>

		<button type="submit" class="submit-button" disabled={isLoading}>
			{#if isLoading}
				<span class="spinner"></span>
				Sending link...
			{:else}
				Send magic link
			{/if}
		</button>

		{#if showPasswordOption && onSwitchToLogin}
			<div class="divider">
				<span>or</span>
			</div>

			<button type="button" class="password-button" onclick={onSwitchToLogin} disabled={isLoading}>
				Sign in with password
			</button>
		{/if}
	</form>
{/if}

<style>
	.auth-form {
		width: 100%;
		max-width: 440px;
	}

	.success-state {
		text-align: center;
	}

	.success-icon {
		width: 64px;
		height: 64px;
		margin: 0 auto var(--space-performance-md);
		padding: var(--space-performance-sm);
		background: var(--color-performance-success-muted);
		border-radius: var(--radius-performance-scale-full);
		color: var(--color-performance-success);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.form-header {
		text-align: center;
		margin-bottom: var(--space-performance-lg);
	}

	.form-title {
		font-size: var(--text-performance-h2);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
		margin: 0 0 var(--space-performance-xs) 0;
	}

	.form-subtitle {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-tertiary);
		margin: 0;
	}

	.form-subtitle strong {
		color: var(--color-performance-fg-secondary);
	}

	.helper-text {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		margin-top: var(--space-performance-lg);
	}

	.error-message {
		background: var(--color-performance-error-muted);
		border: 1px solid var(--color-performance-error-border);
		color: var(--color-performance-error);
		padding: var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-md);
		font-size: var(--text-performance-body-sm);
		margin-bottom: var(--space-performance-md);
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-md);
		margin-bottom: var(--space-performance-lg);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.label {
		font-size: var(--text-performance-body-sm);
		font-weight: 500;
		color: var(--color-performance-fg-secondary);
	}

	.input {
		width: 100%;
		padding: var(--space-performance-sm) var(--space-performance-md);
		border-radius: var(--radius-performance-scale-md);
		color: var(--color-performance-fg-primary);
		font-size: var(--text-performance-body);
		transition: border-color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.input::placeholder {
		color: var(--color-performance-fg-muted);
	}

	.input:focus {
		outline: none;
		border-color: var(--color-performance-border-emphasis);
	}

	.input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-button {
		width: 100%;
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-pure);
		border: none;
		border-radius: var(--radius-performance-scale-full);
		font-size: var(--text-performance-body);
		font-weight: 600;
		cursor: pointer;
		transition: opacity var(--duration-performance-micro) var(--ease-performance-standard);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-performance-xs);
		min-height: 44px;
	}

	.submit-button:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-button:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 2px;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.divider {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		margin: var(--space-performance-md) 0;
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-body-sm);
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--color-performance-border-default);
	}

	.password-button {
		width: 100%;
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: transparent;
		color: var(--color-performance-fg-primary);
		border-radius: var(--radius-performance-scale-full);
		font-size: var(--text-performance-body);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
		min-height: 44px;
	}

	.password-button:hover:not(:disabled) {
		background: var(--color-performance-hover);
		border-color: var(--color-performance-border-emphasis);
	}

	.password-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.password-button:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 2px;
	}

	.link-button {
		background: none;
		border: none;
		color: var(--color-performance-fg-secondary);
		font-size: inherit;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.link-button:hover:not(:disabled) {
		color: var(--color-performance-fg-primary);
	}

	.link-button:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 2px;
	}
</style>
