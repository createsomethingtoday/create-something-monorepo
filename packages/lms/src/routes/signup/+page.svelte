<script lang="ts">
	/**
	 * Signup Page
	 *
	 * Registers via Identity Worker for unified CREATE SOMETHING identity.
	 *
	 * Canon: Creation begins with a single step.
	 */

	import { page } from '$app/stores';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	const redirectTo = $derived($page.url.searchParams.get('redirect') || '/paths');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';

		if (password.length < 8) {
			error = 'Password must be at least 8 characters';
			return;
		}

		loading = true;

		try {
			const response = await fetch('https://id.createsomething.space/v1/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, password, source: 'lms' }),
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.message || 'Signup failed';
				return;
			}

			// Set cookies with cross-subdomain scope for unified identity
			document.cookie = `cs_access_token=${data.access_token}; path=/; domain=.createsomething.space; max-age=${data.expires_in}; secure; samesite=lax`;
			document.cookie = `cs_refresh_token=${data.refresh_token}; path=/; domain=.createsomething.space; max-age=604800; secure; samesite=lax`;

			// Redirect on success
			window.location.href = redirectTo;
		} catch {
			error = 'An error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign Up | CREATE SOMETHING LMS</title>
</svelte:head>

<main class="container">
	<div class="auth-card">
		<h1>Create Account</h1>
		<p class="subtitle">Begin your journey into creation</p>

		{#if error}
			<div id="signup-error" class="error-message" role="alert" aria-live="polite">{error}</div>
		{/if}

		<form onsubmit={handleSubmit}>
			<div class="field">
				<label for="name">Name (optional)</label>
				<input
					type="text"
					id="name"
					bind:value={name}
					autocomplete="name"
				/>
			</div>

			<div class="field">
				<label for="email">Email <span class="required-indicator" aria-hidden="true">*</span></label>
				<input
					type="email"
					id="email"
					bind:value={email}
					required
					aria-required="true"
					aria-invalid={!!error}
					aria-describedby={error ? 'signup-error' : undefined}
					autocomplete="email"
				/>
			</div>

			<div class="field">
				<label for="password">Password <span class="required-indicator" aria-hidden="true">*</span></label>
				<input
					type="password"
					id="password"
					bind:value={password}
					required
					aria-required="true"
					aria-invalid={!!error}
					aria-describedby="password-hint"
					autocomplete="new-password"
					minlength="8"
				/>
				<span id="password-hint" class="hint">At least 8 characters</span>
			</div>

			<button type="submit" class="submit-btn" disabled={loading}>
				{loading ? 'Creating...' : 'Create Account'}
			</button>
		</form>

		<p class="switch-auth">
			Already have an account? <a href="/login?redirect={encodeURIComponent(redirectTo)}">Sign in</a>
		</p>
	</div>
</main>

<style>
	.container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-md);
	}

	.auth-card {
		width: 100%;
		max-width: 400px;
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	h1 {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.subtitle {
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-lg);
	}

	.error-message {
		padding: var(--space-sm);
		background: rgba(204, 68, 68, 0.1);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-sm);
		color: var(--color-error);
		margin-bottom: var(--space-md);
		font-size: var(--text-body-sm);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	label {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	input {
		padding: var(--space-sm);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-primary);
		font-family: inherit;
		font-size: var(--text-body);
	}

	input:focus {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-color: var(--color-border-emphasis);
	}

	.hint {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
	}

	.required-indicator {
		color: var(--color-error);
		margin-left: 0.25em;
	}

	.submit-btn {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: var(--radius-sm);
		font-family: inherit;
		font-size: var(--text-body);
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.submit-btn:hover:not(:disabled) {
		background: var(--color-fg-secondary);
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-btn:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.switch-auth {
		margin-top: var(--space-lg);
		text-align: center;
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.switch-auth a {
		color: var(--color-fg-primary);
		text-decoration: underline;
	}
</style>
