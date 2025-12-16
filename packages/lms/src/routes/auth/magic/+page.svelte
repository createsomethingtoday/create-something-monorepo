<script lang="ts">
	/**
	 * Magic Link Landing Page
	 *
	 * Handles magic link clicks from emails.
	 * URL format: /auth/magic?token=<token>&session=<sessionId>
	 *
	 * Canon: One click, authenticated.
	 */

	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let status = $state<'loading' | 'success' | 'error'>('loading');
	let errorType = $state<'expired' | 'used' | 'invalid' | 'network' | null>(null);
	let errorMessage = $state('');
	let retrying = $state(false);

	const token = $derived($page.url.searchParams.get('token'));
	const sessionId = $derived($page.url.searchParams.get('session'));
	const redirectTo = $derived($page.url.searchParams.get('redirect') || '/paths');

	async function verifyMagicLink() {
		if (!token || !sessionId) {
			status = 'error';
			errorType = 'invalid';
			errorMessage = 'Invalid magic link. Missing required parameters.';
			return;
		}

		try {
			const response = await fetch('/api/auth/magic-link/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, sessionId }),
			});

			const data = await response.json();

			if (!response.ok) {
				// Determine error type from message
				const msg = data.message || '';
				if (msg.includes('expired')) {
					errorType = 'expired';
				} else if (msg.includes('already used')) {
					errorType = 'used';
				} else {
					errorType = 'invalid';
				}
				errorMessage = msg;
				status = 'error';
				return;
			}

			// Set cookies with cross-subdomain scope for unified identity
			document.cookie = `cs_access_token=${data.accessToken}; path=/; domain=.createsomething.space; max-age=900; secure; samesite=lax`;
			document.cookie = `cs_refresh_token=${data.refreshToken}; path=/; domain=.createsomething.space; max-age=604800; secure; samesite=lax`;

			status = 'success';

			// Redirect after brief success message
			setTimeout(() => {
				window.location.href = redirectTo;
			}, 1500);
		} catch (err) {
			console.error('Magic link verification error:', err);
			status = 'error';
			errorType = 'network';
			errorMessage = 'Network error. Please check your connection and try again.';
		}
	}

	async function handleRetry() {
		retrying = true;
		status = 'loading';
		errorType = null;
		errorMessage = '';
		await verifyMagicLink();
		retrying = false;
	}

	onMount(() => {
		verifyMagicLink();
	});
</script>

<svelte:head>
	<title>Verifying Magic Link | CREATE SOMETHING LMS</title>
</svelte:head>

<main class="container">
	<div class="auth-card">
		{#if status === 'loading'}
			<div class="loading-state">
				<div class="spinner"></div>
				<h1>Verifying your link...</h1>
				<p class="subtitle">This will only take a moment</p>
			</div>
		{:else if status === 'success'}
			<div class="success-state">
				<div class="success-icon">✓</div>
				<h1>Authentication successful!</h1>
				<p class="subtitle">Redirecting you now...</p>
			</div>
		{:else if status === 'error'}
			<div class="error-state">
				<div class="error-icon">!</div>
				<h1>
					{#if errorType === 'expired'}
						This link has expired
					{:else if errorType === 'used'}
						This link has already been used
					{:else if errorType === 'network'}
						Connection error
					{:else}
						Invalid magic link
					{/if}
				</h1>
				<p class="error-message">{errorMessage}</p>

				<div class="actions">
					{#if errorType === 'network'}
						<button onclick={handleRetry} disabled={retrying} class="retry-btn">
							{retrying ? 'Retrying...' : 'Retry'}
						</button>
					{:else}
						<a href="/login?redirect={encodeURIComponent(redirectTo)}" class="action-link">
							Back to Login
						</a>
						<a href="/signup?redirect={encodeURIComponent(redirectTo)}" class="action-link secondary">
							Create Account
						</a>
					{/if}
				</div>
			</div>
		{/if}
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
		text-align: center;
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

	/* Loading State */
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
	}

	.spinner {
		width: 48px;
		height: 48px;
		border: 3px solid var(--color-border-default);
		border-top-color: var(--color-fg-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Success State */
	.success-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
	}

	.success-icon {
		width: 64px;
		height: 64px;
		background: var(--color-success);
		color: var(--color-bg-pure);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		font-weight: bold;
		animation: scaleIn var(--duration-standard) var(--ease-standard);
	}

	@keyframes scaleIn {
		from {
			transform: scale(0);
		}
		to {
			transform: scale(1);
		}
	}

	/* Error State */
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
	}

	.error-icon {
		width: 64px;
		height: 64px;
		background: var(--color-error);
		color: var(--color-bg-pure);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		font-weight: bold;
	}

	.error-message {
		padding: var(--space-sm);
		background: rgba(204, 68, 68, 0.1);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-sm);
		color: var(--color-error);
		font-size: var(--text-body-sm);
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-top: var(--space-md);
		width: 100%;
	}

	.retry-btn {
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

	.retry-btn:hover:not(:disabled) {
		background: var(--color-fg-secondary);
	}

	.retry-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-link {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-sm);
		font-size: var(--text-body);
		text-decoration: none;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.action-link:hover {
		background: var(--color-fg-secondary);
	}

	.action-link.secondary {
		background: var(--color-bg-elevated);
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
	}

	.action-link.secondary:hover {
		border-color: var(--color-border-emphasis);
	}
</style>
