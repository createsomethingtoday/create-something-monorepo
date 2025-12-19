<script lang="ts">
	import { enhance } from '$app/forms';

	let email = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);
</script>

<svelte:head>
	<title>Login | Webflow Asset Dashboard</title>
</svelte:head>

<main class="container">
	<div class="login-card">
		<div class="logo">
			<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
				<rect width="40" height="40" rx="8" fill="var(--webflow-blue)" />
				<path d="M28 14L20 26L12 14H28Z" fill="white" />
			</svg>
		</div>

		<h1>Asset Dashboard</h1>
		<p class="subtitle">Sign in to manage your Webflow templates</p>

		{#if success}
			<div class="success-message">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
				<div>
					<strong>Check your email</strong>
					<p>We sent a verification link to {email}</p>
				</div>
			</div>
		{:else}
			<form
				method="POST"
				action="/api/auth/login"
				use:enhance={() => {
					loading = true;
					error = null;
					return async ({ result }) => {
						loading = false;
						if (result.type === 'success') {
							success = true;
						} else if (result.type === 'failure') {
							const data = result.data as { error?: string } | undefined;
							error = data?.error || 'An error occurred';
						} else if (result.type === 'error') {
							error = result.error?.message || 'An error occurred';
						}
					};
				}}
			>
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
		{/if}

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
		border-color: var(--webflow-blue);
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

	.success-message {
		display: flex;
		gap: var(--space-sm);
		padding: var(--space-md);
		color: var(--color-success);
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-md);
	}

	.success-message svg {
		flex-shrink: 0;
		margin-top: 2px;
	}

	.success-message strong {
		display: block;
		color: var(--color-fg-primary);
	}

	.success-message p {
		margin: var(--space-xs) 0 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
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
		color: white;
		background: var(--webflow-blue);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.submit-button:hover:not(:disabled) {
		background: var(--webflow-blue-hover);
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
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
