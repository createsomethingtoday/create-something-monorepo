<script lang="ts">
	import { goto } from '$app/navigation';

	let email = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		error = null;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			if (response.ok) {
				// Redirect to verify page (same as original Next.js behavior)
				goto('/verify');
			} else {
				const data = (await response.json()) as { error?: string };
				error = data.error || 'Login failed. Please check your email and try again.';
			}
		} catch {
			error = 'An error occurred during the login process. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login | Webflow Asset Dashboard</title>
</svelte:head>

<main class="container">
	<div class="login-card">
		<div class="logo">
			<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
				<rect width="40" height="40" rx="8" fill="var(--color-fg-primary)" />
				<path d="M28 14L20 26L12 14H28Z" fill="var(--color-bg-pure)" />
			</svg>
		</div>

		<h1>Asset Dashboard</h1>
		<p class="subtitle">Sign in to manage your Webflow templates</p>

		<form onsubmit={handleSubmit}>
			<div class="form-group">
				<label for="email">Email address</label>
				<input
					type="email"
					id="email"
					name="email"
					bind:value={email}
					placeholder="you@webflow.com"
					required
					disabled={loading}
				/>
			</div>

			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			<button type="submit" class="submit-button" disabled={loading || !email}>
				{#if loading}
					<span class="spinner"></span>
					Sending...
				{:else}
					Continue with Email
				{/if}
			</button>
		</form>

		<p class="footer-text">
			Only authorized Webflow template creators can access this dashboard.
		</p>
	</div>
</main>

<style>
	.container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.login-card {
		width: 100%;
		max-width: 400px;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
	}

	.logo {
		display: flex;
		justify-content: center;
		margin-bottom: var(--space-md);
	}

	h1 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		text-align: center;
		margin: 0 0 var(--space-xs);
	}

	.subtitle {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-align: center;
		margin: 0 0 var(--space-lg);
	}

	.form-group {
		margin-bottom: var(--space-md);
	}

	label {
		display: block;
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	input {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		outline: none;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	input:focus {
		border-color: var(--color-border-emphasis);
	}

	input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	input::placeholder {
		color: var(--color-fg-muted);
	}

	.error-message {
		padding: 0.75rem 1rem;
		font-size: var(--text-body-sm);
		color: var(--color-error);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-md);
	}

	.submit-button {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: var(--color-bg-pure);
		background: var(--color-fg-primary);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
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
		border: 2px solid var(--color-border-strong);
		border-top-color: var(--color-bg-pure);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.footer-text {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-align: center;
		margin: var(--space-lg) 0 0;
	}
</style>
