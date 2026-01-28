<script lang="ts">
	/**
	 * Signup Form
	 *
	 * Email/password registration form with Identity worker integration.
	 * Emits analytics events and handles loading/error states gracefully.
	 *
	 * Canon: The form disappears; only the action remains.
	 */

	interface Props {
		/** Called when signup form is submitted */
		onSubmit: (credentials: {
			email: string;
			password: string;
			name?: string;
			source?: string;
		}) => Promise<boolean>;
		/** Called when user clicks "Sign in" link */
		onSwitchToLogin?: () => void;
		/** Called when user clicks "Magic link" option */
		onSwitchToMagicLink?: () => void;
		/** External loading state (overrides internal) */
		isLoading?: boolean;
		/** External error message (overrides internal) */
		error?: string | null;
		/** Show magic link option */
		showMagicLinkOption?: boolean;
		/** Show login link */
		showLoginLink?: boolean;
		/** Source property for tracking */
		source?: 'io' | 'space' | 'agency' | 'ltd' | 'lms';
	}

	let {
		onSubmit,
		onSwitchToLogin,
		onSwitchToMagicLink,
		isLoading: externalLoading = false,
		error: externalError = null,
		showMagicLinkOption = true,
		showLoginLink = true,
		source = 'space'
	}: Props = $props();

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let internalLoading = $state(false);
	let internalError = $state<string | null>(null);

	const isLoading = $derived(externalLoading || internalLoading);
	const error = $derived(externalError || internalError);

	function validatePassword(pwd: string): string | null {
		if (pwd.length < 8) return 'Password must be at least 8 characters';
		return null;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		internalError = null;

		if (!email || !password) {
			internalError = 'Please enter your email and password';
			return;
		}

		const passwordError = validatePassword(password);
		if (passwordError) {
			internalError = passwordError;
			return;
		}

		if (password !== confirmPassword) {
			internalError = 'Passwords do not match';
			return;
		}

		internalLoading = true;

		try {
			const success = await onSubmit({
				email,
				password,
				name: name || undefined,
				source
			});
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
		<h2 class="form-title">Create an account</h2>
		<p class="form-subtitle">Get started with CREATE SOMETHING</p>
	</div>

	{#if error}
		<div class="error-message" role="alert">
			{error}
		</div>
	{/if}

	<div class="form-fields">
		<div class="field">
			<label for="signup-name" class="label">Name <span class="optional">(optional)</span></label>
			<input
				id="signup-name"
				type="text"
				bind:value={name}
				class="input"
				placeholder="Your name"
				autocomplete="name"
				disabled={isLoading}
			/>
		</div>

		<div class="field">
			<label for="signup-email" class="label">Email</label>
			<input
				id="signup-email"
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
			<label for="signup-password" class="label">Password</label>
			<input
				id="signup-password"
				type="password"
				bind:value={password}
				class="input"
				placeholder="At least 8 characters"
				autocomplete="new-password"
				disabled={isLoading}
				required
			/>
		</div>

		<div class="field">
			<label for="signup-confirm-password" class="label">Confirm password</label>
			<input
				id="signup-confirm-password"
				type="password"
				bind:value={confirmPassword}
				class="input"
				placeholder="Confirm your password"
				autocomplete="new-password"
				disabled={isLoading}
				required
			/>
		</div>
	</div>

	<button type="submit" class="submit-button" disabled={isLoading}>
		{#if isLoading}
			<span class="spinner"></span>
			Creating account...
		{:else}
			Create account
		{/if}
	</button>

	{#if showMagicLinkOption && onSwitchToMagicLink}
		<div class="divider">
			<span>or</span>
		</div>

		<button type="button" class="magic-link-button" onclick={onSwitchToMagicLink} disabled={isLoading}>
			Sign up with magic link
		</button>
	{/if}

	{#if showLoginLink && onSwitchToLogin}
		<p class="switch-text">
			Already have an account?
			<button type="button" class="link-button" onclick={onSwitchToLogin} disabled={isLoading}>
				Sign in
			</button>
		</p>
	{/if}

	<p class="terms-text">
		By creating an account, you agree to our
		<a href="/privacy" class="terms-link">Privacy Policy</a>.
	</p>
</form>

<style>
	.auth-form {
		width: 100%;
		max-width: 440px;
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

	.label {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-secondary);
	}

	.optional {
		font-weight: 400;
		color: var(--color-fg-muted);
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

	.terms-text {
		text-align: center;
		margin-top: var(--space-md);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.terms-link {
		color: var(--color-fg-tertiary);
		text-decoration: underline;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.terms-link:hover {
		color: var(--color-fg-secondary);
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
