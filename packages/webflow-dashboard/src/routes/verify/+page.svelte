<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let status = $state<'verifying' | 'success' | 'error'>('verifying');
	let errorMessage = $state<string | null>(null);

	onMount(async () => {
		const token = $page.url.searchParams.get('token');

		if (!token) {
			status = 'error';
			errorMessage = 'No verification token provided';
			return;
		}

		try {
			const response = await fetch('/api/auth/verify-token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token })
			});

			const data = await response.json();

			if (response.ok) {
				status = 'success';
				// Redirect to dashboard after brief success message
				setTimeout(() => {
					goto('/dashboard');
				}, 1500);
			} else {
				status = 'error';
				const errorData = data as { error?: string };
				errorMessage = errorData.error || 'Verification failed';
			}
		} catch {
			status = 'error';
			errorMessage = 'An error occurred during verification';
		}
	});
</script>

<svelte:head>
	<title>Verify | Webflow Asset Dashboard</title>
</svelte:head>

<main class="container">
	<div class="verify-card">
		<div class="logo">
			<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
				<rect width="40" height="40" rx="8" fill="var(--webflow-blue)" />
				<path d="M28 14L20 26L12 14H28Z" fill="white" />
			</svg>
		</div>

		{#if status === 'verifying'}
			<div class="status-message">
				<div class="spinner"></div>
				<h1>Verifying your email</h1>
				<p class="subtitle">Please wait while we verify your login...</p>
			</div>
		{:else if status === 'success'}
			<div class="status-message success">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
				<h1>Verification successful</h1>
				<p class="subtitle">Redirecting to dashboard...</p>
			</div>
		{:else}
			<div class="status-message error">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<line x1="15" y1="9" x2="9" y2="15" />
					<line x1="9" y1="9" x2="15" y2="15" />
				</svg>
				<h1>Verification failed</h1>
				<p class="subtitle">{errorMessage}</p>
				<a href="/login" class="retry-link">Try logging in again</a>
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
		padding: var(--space-lg);
	}

	.verify-card {
		width: 100%;
		max-width: 400px;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		text-align: center;
	}

	.logo {
		display: flex;
		justify-content: center;
		margin-bottom: var(--space-lg);
	}

	.status-message {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
	}

	.status-message svg {
		margin-bottom: var(--space-sm);
	}

	.status-message.success svg {
		color: var(--color-success);
	}

	.status-message.error svg {
		color: var(--color-error);
	}

	h1 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.subtitle {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.spinner {
		width: 48px;
		height: 48px;
		border: 3px solid var(--color-border-default);
		border-top-color: var(--webflow-blue);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin-bottom: var(--space-sm);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.retry-link {
		margin-top: var(--space-md);
		color: var(--webflow-blue);
		text-decoration: none;
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.retry-link:hover {
		opacity: 0.8;
	}
</style>
