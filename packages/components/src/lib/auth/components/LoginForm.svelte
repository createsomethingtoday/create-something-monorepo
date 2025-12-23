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
		max-width: 400px;
	}

	.form-header {
		text-align: center;
		margin-bottom: var(--space-lg);
	}

	.form-title {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs) 0;
	}

	.form-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin: 0;
	}

	.error-message {
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		color: var(--color-error);
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		margin-bottom: var(--space-md);
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.label-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.label {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-secondary);
	}

	.input {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.input::placeholder {
		color: var(--color-fg-muted);
	}

	.input:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-button {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: var(--radius-full);
		font-size: var(--text-body);
		font-weight: 600;
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
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
		outline: 2px solid var(--color-focus);
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
		gap: var(--space-sm);
		margin: var(--space-md) 0;
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--color-border-default);
	}

	.magic-link-button {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		font-size: var(--text-body);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
		min-height: 44px;
	}

	.magic-link-button:hover:not(:disabled) {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.magic-link-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.magic-link-button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.switch-text {
		text-align: center;
		margin-top: var(--space-lg);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.link-button {
		background: none;
		border: none;
		color: var(--color-fg-secondary);
		font-size: inherit;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.link-button:hover:not(:disabled) {
		color: var(--color-fg-primary);
	}

	.link-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.link-button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
</style>
