<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let code = $state('');
	let loading = $state(false);
	let errorMessage = $state('');

	const email = $derived($page.url.searchParams.get('email') ?? '');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/auth/verify-token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: code })
			});

			const data = (await response.json()) as { error?: string; message?: string };

			if (!response.ok) {
				errorMessage = data.error ?? 'An error occurred';
			} else {
				// Successfully verified - redirect to dashboard
				goto('/');
			}
		} catch {
			errorMessage = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}

	function handleResend() {
		// Go back to login to resend the code
		goto('/login');
	}
</script>

<svelte:head>
	<title>Enter Verification Code | Webflow Asset Dashboard</title>
</svelte:head>

<main class="verify-container">
	<div class="verify-card">
		<header class="verify-header">
			<h1 class="verify-title">Check your email</h1>
			<p class="verify-subtitle">
				{#if email}
					We sent a verification code to <strong>{email}</strong>
				{:else}
					Enter the verification code from your email
				{/if}
			</p>
		</header>

		<form onsubmit={handleSubmit}>
			<div class="form-group">
				<label for="code" class="form-label">Verification code</label>
				<input
					type="text"
					id="code"
					name="code"
					bind:value={code}
					required
					autocomplete="one-time-code"
					class="form-input code-input"
					placeholder="Enter your code"
					disabled={loading}
				/>
			</div>

			{#if errorMessage}
				<div class="error-message">
					{errorMessage}
				</div>
			{/if}

			<button type="submit" class="submit-button" disabled={loading || !code}>
				{#if loading}
					Verifying...
				{:else}
					Verify code
				{/if}
			</button>
		</form>

		<div class="resend-section">
			<p class="resend-text">Didn't receive the code?</p>
			<button type="button" class="resend-button" onclick={handleResend}>
				Send a new code
			</button>
		</div>
	</div>
</main>

<style>
	.verify-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.verify-card {
		width: 100%;
		max-width: 400px;
		padding: 2rem;
		background: var(--webflow-bg-secondary);
		border: 1px solid var(--webflow-border);
		border-radius: var(--webflow-radius-xl);
	}

	.verify-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.verify-title {
		font-size: var(--webflow-text-h3);
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.verify-subtitle {
		font-size: var(--webflow-text-small);
		color: var(--webflow-text-muted);
	}

	.verify-subtitle strong {
		color: var(--webflow-text-primary);
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-label {
		display: block;
		font-size: var(--webflow-text-small);
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	.form-input {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 1rem;
		background: var(--webflow-bg-primary);
		border: 1px solid var(--webflow-border);
		border-radius: var(--webflow-radius-md);
		color: var(--webflow-text-primary);
		transition: border-color 0.2s ease;
	}

	.code-input {
		text-align: center;
		font-size: 1.25rem;
		letter-spacing: 0.25em;
		font-family: var(--webflow-font-mono, monospace);
	}

	.form-input:focus {
		outline: none;
		border-color: var(--webflow-blue);
	}

	.form-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.form-input::placeholder {
		color: var(--webflow-text-muted);
		letter-spacing: normal;
	}

	.submit-button {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 1rem;
		font-weight: 500;
		color: #ffffff;
		background: var(--webflow-blue);
		border: none;
		border-radius: var(--webflow-radius-md);
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.submit-button:hover:not(:disabled) {
		background: var(--webflow-blue-dark);
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error-message {
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		font-size: var(--webflow-text-small);
		color: var(--webflow-error);
		background: rgba(255, 82, 82, 0.1);
		border: 1px solid rgba(255, 82, 82, 0.2);
		border-radius: var(--webflow-radius-md);
	}

	.resend-section {
		margin-top: 1.5rem;
		text-align: center;
		padding-top: 1.5rem;
		border-top: 1px solid var(--webflow-border);
	}

	.resend-text {
		font-size: var(--webflow-text-small);
		color: var(--webflow-text-muted);
		margin-bottom: 0.5rem;
	}

	.resend-button {
		font-size: var(--webflow-text-small);
		color: var(--webflow-blue);
		background: none;
		border: none;
		cursor: pointer;
		text-decoration: underline;
	}

	.resend-button:hover {
		opacity: 0.8;
	}
</style>
