<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { CheckCircle2, Lock, XCircle } from 'lucide-svelte';

	interface PageData {
		status: 'no-token' | 'rate-limited' | 'invalid' | 'not-found' | 'expired' | 'error';
		error: string | null;
		retryAfter?: number;
	}

	let { data } = $props<{ data: PageData }>();

	// Map server status to UI status
	type UIStatus = 'verifying' | 'success' | 'error' | 'no-token';

	function getInitialStatus(): UIStatus {
		// If server already determined an error, show it immediately
		if (data.status === 'no-token') return 'no-token';
		if (data.error) return 'error';
		// Otherwise, show verifying (though server-side should have redirected on success)
		return 'verifying';
	}

	let status = $state<UIStatus>(getInitialStatus());
	let errorMessage = $state<string | null>(data.error);

	// Client-side verification fallback for manual token entry
	async function verifyToken(token: string) {
		status = 'verifying';
		errorMessage = null;

		try {
			const response = await fetch('/api/auth/verify-token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token })
			});

			const responseData = await response.json();

			if (response.ok) {
				status = 'success';
				// Redirect to dashboard after brief success message
				setTimeout(() => {
					goto('/dashboard');
				}, 1500);
			} else {
				status = 'error';
				const errorData = responseData as { error?: string };
				errorMessage = errorData.error || 'Verification failed';
			}
		} catch {
			status = 'error';
			errorMessage = 'An error occurred during verification';
		}
	}

	// Handle case where token was in URL but needs client-side verification
	onMount(async () => {
		const token = $page.url.searchParams.get('token');

		// If we have a token but status is still verifying, try client-side
		// This handles edge cases where server-side verification wasn't possible
		if (token && status === 'verifying') {
			await verifyToken(token);
		}
	});

	// Token input for manual entry
	let tokenInput = $state('');

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (tokenInput.trim()) {
			verifyToken(tokenInput.trim());
		}
	}
</script>

<svelte:head>
	<title>Verify | Webflow Asset Dashboard</title>
</svelte:head>

<main class="container">
	<div class="verify-card">
		<div class="logo">
			<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
				<rect width="40" height="40" rx="8" fill="var(--color-fg-primary)" />
				<path d="M28 14L20 26L12 14H28Z" fill="black" />
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
			<CheckCircle2 size={48} />
			<h1>Verification successful</h1>
			<p class="subtitle">Redirecting to dashboard...</p>
		</div>
	{:else if status === 'no-token'}
		<div class="status-message">
			<Lock size={48} />
			<h1>Enter verification token</h1>
			<p class="subtitle">Paste your verification token from the email</p>
			<form class="token-form" onsubmit={handleSubmit}>
				<input
					type="text"
					class="token-input"
					bind:value={tokenInput}
					placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
					autocomplete="off"
					spellcheck="false"
				/>
				<button type="submit" class="verify-button" disabled={!tokenInput.trim()}>
					Verify
				</button>
			</form>
			<a href="/login" class="retry-link">Request a new verification email</a>
		</div>
	{:else}
		<div class="status-message error">
			<XCircle size={48} />
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
		border-top-color: var(--color-info);
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
		color: var(--color-info);
		text-decoration: none;
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.retry-link:hover {
		opacity: 0.8;
	}

	.token-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		width: 100%;
		margin-top: var(--space-md);
	}

	.token-input {
		width: 100%;
		padding: var(--space-sm);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-family: monospace;
		font-size: var(--text-body-sm);
		text-align: center;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.token-input::placeholder {
		color: var(--color-fg-muted);
	}

	.token-input:focus {
		outline: none;
		border-color: var(--color-info);
	}

	.verify-button {
		width: 100%;
		padding: var(--space-sm);
		background: var(--color-fg-primary);
		border: none;
		border-radius: var(--radius-md);
		color: var(--color-bg-pure);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.verify-button:hover:not(:disabled) {
		opacity: 0.9;
	}

	.verify-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
