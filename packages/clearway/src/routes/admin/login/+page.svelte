<script lang="ts">
	/**
	 * Admin Login - CLEARWAY
	 *
	 * Authenticates via Identity Worker for unified CREATE SOMETHING identity.
	 * Admin access restricted to micah@createsomething.io.
	 *
	 * Canon: Authentication recedes into use.
	 */

	import { page } from '$app/stores';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	const redirectTo = $derived($page.url.searchParams.get('redirect') || '/admin');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			const response = await fetch('https://id.createsomething.space/v1/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.message || 'Login failed';
				return;
			}

			// Set cookies with cross-subdomain scope for unified identity
			// Note: clearway.pages.dev won't share cookies with createsomething.space
			// So we set on the current domain
			const domain = window.location.hostname.includes('createsomething')
				? '.createsomething.space'
				: undefined;

			const domainAttr = domain ? `; domain=${domain}` : '';

			document.cookie = `cs_access_token=${data.access_token}; path=/${domainAttr}; max-age=${data.expires_in}; secure; samesite=lax`;
			document.cookie = `cs_refresh_token=${data.refresh_token}; path=/${domainAttr}; max-age=604800; secure; samesite=lax`;

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
	<title>Admin Login - CLEARWAY</title>
</svelte:head>

<main class="container">
	<div class="auth-card">
		<h1>CLEARWAY Admin</h1>
		<p class="subtitle">The Stack Demo Instance</p>

		{#if error}
			<div class="error-message" role="alert">{error}</div>
		{/if}

		<form onsubmit={handleSubmit}>
			<div class="field">
				<label for="email">Email</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					required
					autocomplete="email"
					placeholder="micah@createsomething.io"
				/>
			</div>

			<div class="field">
				<label for="password">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					required
					autocomplete="current-password"
				/>
			</div>

			<button type="submit" class="submit-btn" disabled={loading}>
				{loading ? 'Signing in...' : 'Sign In'}
			</button>
		</form>

		<p class="note">
			Access restricted to authorized administrators.
		</p>
	</div>
</main>

<style>
	.container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-md, 1rem);
		background: var(--color-bg-pure, #000000);
	}

	.auth-card {
		width: 100%;
		max-width: 400px;
		padding: var(--space-xl, 2rem);
		background: var(--color-bg-subtle, #1a1a1a);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-lg, 12px);
	}

	h1 {
		font-size: var(--text-h2, 1.5rem);
		font-weight: 700;
		color: var(--color-fg-primary, #ffffff);
		margin: 0 0 0.25rem;
	}

	.subtitle {
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		margin: 0 0 var(--space-lg, 1.5rem);
		font-size: var(--text-body-sm, 0.875rem);
	}

	.error-message {
		padding: var(--space-sm, 0.75rem);
		background: var(--color-error-muted, rgba(212, 77, 77, 0.2));
		border: 1px solid var(--color-error, #d44d4d);
		border-radius: var(--radius-sm, 6px);
		color: var(--color-error, #d44d4d);
		margin-bottom: var(--space-md, 1rem);
		font-size: var(--text-body-sm, 0.875rem);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md, 1rem);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs, 0.5rem);
	}

	label {
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		font-size: var(--text-body-sm, 0.875rem);
	}

	input {
		padding: var(--space-sm, 0.75rem);
		background: var(--color-bg-surface, #111111);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-sm, 6px);
		color: var(--color-fg-primary, #ffffff);
		font-family: inherit;
		font-size: var(--text-body, 1rem);
	}

	input::placeholder {
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	input:focus {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
	}

	.submit-btn {
		margin-top: var(--space-sm, 0.5rem);
		padding: var(--space-sm, 0.75rem) var(--space-md, 1rem);
		background: var(--color-fg-primary, #ffffff);
		color: var(--color-bg-pure, #000000);
		border: none;
		border-radius: var(--radius-md, 8px);
		font-family: inherit;
		font-size: var(--text-body, 1rem);
		font-weight: 600;
		cursor: pointer;
		transition: opacity var(--duration-micro, 200ms) var(--ease-standard);
	}

	.submit-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-btn:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	.note {
		margin-top: var(--space-lg, 1.5rem);
		text-align: center;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		font-size: var(--text-caption, 0.75rem);
	}
</style>
