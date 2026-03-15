<script lang="ts">
	/**
	 * Admin Login Page
	 * Maverick X CMS
	 */

	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let isLoading = $state(false);
	let errorMessage = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isLoading = true;
		errorMessage = '';

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			if (res.ok) {
				goto('/admin/content');
			} else {
				errorMessage = 'Invalid credentials';
			}
		} catch (e) {
			errorMessage = 'Login failed. Please try again.';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Admin Login - Maverick X</title>
</svelte:head>

<div class="login-container">
	<div class="login-card">
		<div class="login-header">
			<h1 class="login-logo">Maverick X</h1>
			<p class="login-subtitle">Admin Login</p>
		</div>

		<form onsubmit={handleSubmit} class="login-form">
			{#if errorMessage}
				<div class="error-message">{errorMessage}</div>
			{/if}

			<div class="form-group">
				<label for="email" class="form-label">Email</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					class="form-input"
					placeholder="admin@maverickx.com"
					required
				/>
			</div>

			<div class="form-group">
				<label for="password" class="form-label">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					class="form-input"
					placeholder="Enter password"
					required
				/>
			</div>

			<button type="submit" class="login-btn" disabled={isLoading}>
				{isLoading ? 'Signing in...' : 'Sign In'}
			</button>
		</form>

		<a href="/" class="back-link">Back to site</a>
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: var(--color-bg-pure, #000);
	}

	.login-card {
		width: 100%;
		max-width: 24rem;
		padding: 2rem;
		background: var(--color-bg-elevated, #0a0a0a);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-lg, 12px);
	}

	.login-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.login-logo {
		font-size: var(--text-h2, 1.5rem);
		font-weight: 600;
		color: var(--color-fg-primary, #fff);
		margin-bottom: 0.5rem;
	}

	.login-subtitle {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.error-message {
		padding: 0.75rem 1rem;
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-primary, #fff);
		background: var(--color-error, #cc4444);
		border-radius: var(--radius-sm, 6px);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-label {
		font-size: var(--text-body-sm, 0.875rem);
		font-weight: 500;
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	.form-input {
		height: 2.75rem;
		padding: 0 1rem;
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-primary, #fff);
		background: var(--color-bg-surface, rgba(255, 255, 255, 0.05));
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-sm, 6px);
		transition: all 0.2s ease;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--color-border-strong, rgba(255, 255, 255, 0.3));
		background: var(--color-bg-subtle, rgba(255, 255, 255, 0.08));
	}

	.form-input::placeholder {
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
	}

	.login-btn {
		height: 2.75rem;
		font-size: var(--text-body, 1rem);
		font-weight: 600;
		color: var(--color-bg-pure, #000);
		background: var(--color-fg-primary, #fff);
		border-radius: var(--radius-sm, 6px);
		transition: all 0.2s ease;
	}

	.login-btn:hover:not(:disabled) {
		background: var(--color-fg-secondary, rgba(255, 255, 255, 0.9));
	}

	.login-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.back-link {
		display: block;
		margin-top: 1.5rem;
		text-align: center;
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		transition: color 0.2s ease;
	}

	.back-link:hover {
		color: var(--color-fg-primary, #fff);
	}
</style>
