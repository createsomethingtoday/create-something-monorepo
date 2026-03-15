<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { CheckCircle2, Lock, XCircle } from 'lucide-svelte';
	import WebflowLogo from '$lib/components/WebflowLogo.svelte';

	interface PageData {
		status: 'no-token' | 'rate-limited' | 'invalid' | 'not-found' | 'expired' | 'error';
		error: string | null;
		retryAfter?: number;
	}

	let { data } = $props<{ data: PageData }>();

	// Map server status to UI status
	type UIStatus = 'verifying' | 'success' | 'error' | 'no-token';

	function getInitialStatus(serverStatus: PageData['status'], serverError: string | null): UIStatus {
		// If server already determined an error, show it immediately
		if (serverStatus === 'no-token') return 'no-token';
		if (serverError) return 'error';
		// Otherwise, show verifying (though server-side should have redirected on success)
		return 'verifying';
	}

	const serverStatus = $derived(data.status);
	const serverError = $derived(data.error);
	let status = $state<UIStatus>('verifying');
	let errorMessage = $state<string | null>(null);

	$effect(() => {
		status = getInitialStatus(serverStatus, serverError);
		errorMessage = serverError;
	});

	async function waitForAuthenticatedSession(maxAttempts = 5, delayMs = 250): Promise<boolean> {
		for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
			try {
				const response = await fetch('/api/auth/check-session', {
					method: 'GET',
					cache: 'no-store',
					credentials: 'include'
				});

				if (response.ok) {
					return true;
				}
			} catch {
				// Ignore transient network failures and retry.
			}

			if (attempt < maxAttempts - 1) {
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}

		return false;
	}

	function navigateToDashboard() {
		window.location.assign('/dashboard');
	}

	// Client-side verification fallback for manual token entry
	async function verifyToken(token: string) {
		status = 'verifying';
		errorMessage = null;

		try {
			const response = await fetch('/api/auth/verify-token', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token })
			});

			const responseData = await response.json();

			if (response.ok) {
				const sessionReady = await waitForAuthenticatedSession();

				if (!sessionReady) {
					status = 'error';
					errorMessage =
						'Verification succeeded, but your session was not established. Please try again in your mobile browser.';
					return;
				}

				status = 'success';
				setTimeout(() => {
					navigateToDashboard();
				}, 750);
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
			<WebflowLogo />
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
		border: 1px solid var(--color-shell-border-default);
		border-radius: var(--radius-xl);
		text-align: center;
		box-shadow: var(--shadow-lg);
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

	.status-message :global(svg) {
		margin-bottom: var(--space-sm);
	}

	.status-message.success :global(svg) {
		color: var(--color-success);
	}

	.status-message.error :global(svg) {
		color: var(--color-error);
	}

	h1 {
		font-family: var(--font-heading);
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		letter-spacing: 0.01em;
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
		color: #0055d4;
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
		background: var(--color-bg-surface);
		border: 1px solid var(--color-shell-border-default);
		border-radius: 999px;
		box-shadow: var(--shadow-sm);
		color: var(--color-fg-primary);
		font-family: monospace;
		font-size: 1rem;
		text-align: center;
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			box-shadow var(--duration-micro) var(--ease-standard);
	}

	.token-input::placeholder {
		color: var(--color-fg-muted);
	}

	.token-input:focus {
		outline: none;
		border-color: var(--color-info);
		box-shadow: 0 0 0 4px var(--color-info-muted);
	}

	.token-input:focus-visible {
		outline: none;
	}

	.verify-button {
		width: 100%;
		padding: var(--space-sm);
		background: var(--color-info);
		border: 1px solid var(--color-info);
		border-radius: 999px;
		color: #ffffff;
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		box-shadow: 0 8px 18px rgba(20, 110, 245, 0.16);
		cursor: pointer;
		transition:
			transform var(--duration-micro) var(--ease-standard),
			background-color var(--duration-micro) var(--ease-standard);
	}

	.verify-button:hover:not(:disabled) {
		background: #0055d4;
		transform: translateY(-1px);
	}

	.verify-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 640px) {
		.container {
			align-items: flex-start;
			padding: var(--space-md);
		}

		.verify-card {
			margin: auto 0;
			padding: var(--space-md);
			border-radius: var(--radius-lg);
		}

		h1 {
			font-size: var(--text-h3);
		}

		.token-input,
		.verify-button {
			min-height: 2.75rem;
		}
	}
</style>
