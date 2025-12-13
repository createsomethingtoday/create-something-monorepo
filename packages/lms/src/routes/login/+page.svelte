<script lang="ts">
	/**
	 * Login Page
	 *
	 * Canon: Authentication recedes into use.
	 */

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	const redirectTo = $derived($page.url.searchParams.get('redirect') || '/paths');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.message || 'Login failed';
				return;
			}

			// Redirect on success
			goto(redirectTo);
		} catch {
			error = 'An error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login | CREATE SOMETHING LMS</title>
</svelte:head>

<main class="container">
	<div class="auth-card">
		<h1>Sign In</h1>
		<p class="subtitle">Continue your learning journey</p>

		{#if error}
			<div class="error-message">{error}</div>
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

		<p class="switch-auth">
			Don't have an account? <a href="/signup?redirect={encodeURIComponent(redirectTo)}">Create one</a>
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
		outline: none;
		border-color: var(--color-border-emphasis);
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
		opacity: 0.9;
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
