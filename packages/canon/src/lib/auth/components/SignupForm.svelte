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

	.label {
		font-size: var(--text-performance-body-sm);
		font-weight: 500;
		color: var(--color-performance-fg-secondary);
	}

	.optional {
		font-weight: 400;
		color: var(--color-performance-fg-muted);
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

	.terms-text {
		text-align: center;
		margin-top: var(--space-performance-md);
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.terms-link {
		color: var(--color-performance-fg-tertiary);
		text-decoration: underline;
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.terms-link:hover {
		color: var(--color-performance-fg-secondary);
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
