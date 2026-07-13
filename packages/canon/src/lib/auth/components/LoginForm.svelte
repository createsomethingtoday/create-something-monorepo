<script lang="ts">
	/**
	 * Login Form
	 *
	 * Email/password login form with Identity worker integration.
	 * Emits analytics events and handles loading/error states gracefully.
	 *
	 * Canon: The form disappears; only the action remains.
	 */

	interface Props {
		/** Called when login form is submitted */
		onSubmit: (credentials: { email: string; password: string }) => Promise<boolean>;
		/** Called when user clicks "Sign up" link */
		onSwitchToSignup?: () => void;
		/** Called when user clicks "Forgot password" link */
		onForgotPassword?: () => void;
		/** Called when user clicks "Magic link" option */
		onSwitchToMagicLink?: () => void;
		/** External loading state (overrides internal) */
		isLoading?: boolean;
		/** External error message (overrides internal) */
		error?: string | null;
		/** Show magic link option */
		showMagicLinkOption?: boolean;
		/** Show signup link */
		showSignupLink?: boolean;
	}

	let {
		onSubmit,
		onSwitchToSignup,
		onForgotPassword,
		onSwitchToMagicLink,
		isLoading: externalLoading = false,
		error: externalError = null,
		showMagicLinkOption = true,
		showSignupLink = true
	}: Props = $props();

	let email = $state('');
	let password = $state('');
	let internalLoading = $state(false);
	let internalError = $state<string | null>(null);

	const isLoading = $derived(externalLoading || internalLoading);
	const error = $derived(externalError || internalError);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		internalError = null;

		if (!email || !password) {
			internalError = 'Please enter your email and password';
			return;
		}

		internalLoading = true;

		try {
			const success = await onSubmit({ email, password });
			if (!success) {
				// Error will be set by parent via externalError prop
			}
		} catch (err) {
			internalError = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			internalLoading = false;
		}
	}
</script>

<form class="auth-form" onsubmit={handleSubmit}>
	<div class="form-header">
		<h2 class="form-title">Welcome back</h2>
		<p class="form-subtitle">Sign in to your account</p>
	</div>

	{#if error}
		<div class="error-message" role="alert">
			{error}
		</div>
	{/if}

	<div class="form-fields">
		<div class="field">
			<label for="login-email" class="label">Email</label>
			<input
				id="login-email"
				type="email"
				bind:value={email}
				class="input"
				placeholder="you@example.com"
				autocomplete="email"
				disabled={isLoading}
				required
			/>
		</div>

		<div class="field">
			<div class="label-row">
				<label for="login-password" class="label">Password</label>
				{#if onForgotPassword}
					<button type="button" class="link-button" onclick={onForgotPassword} disabled={isLoading}>
						Forgot password?
					</button>
				{/if}
			</div>
			<input
				id="login-password"
				type="password"
				bind:value={password}
				class="input"
				placeholder="Enter your password"
				autocomplete="current-password"
				disabled={isLoading}
				required
			/>
		</div>
	</div>

	<button type="submit" class="submit-button" disabled={isLoading}>
		{#if isLoading}
			<span class="spinner"></span>
			Signing in...
		{:else}
			Sign in
		{/if}
	</button>

	{#if showMagicLinkOption && onSwitchToMagicLink}
		<div class="divider">
			<span>or</span>
		</div>

		<button type="button" class="magic-link-button" onclick={onSwitchToMagicLink} disabled={isLoading}>
			Sign in with magic link
		</button>
	{/if}

	{#if showSignupLink && onSwitchToSignup}
		<p class="switch-text">
			Don't have an account?
			<button type="button" class="link-button" onclick={onSwitchToSignup} disabled={isLoading}>
				Sign up
			</button>
		</p>
	{/if}
</form>

<style>
	.auth-form {
		width: 100%;
		max-width: 440px;
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

	.label-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
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

	.magic-link-button {
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

	.magic-link-button:hover:not(:disabled) {
		background: var(--color-performance-hover);
		border-color: var(--color-performance-border-emphasis);
	}

	.magic-link-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.magic-link-button:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 2px;
	}

	.switch-text {
		text-align: center;
		margin-top: var(--space-performance-lg);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
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

	.link-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.link-button:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 2px;
	}
</style>
