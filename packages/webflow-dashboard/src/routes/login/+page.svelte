<script lang="ts">
	import { goto } from '$app/navigation';

	let email = $state('');
	let loading = $state(false);
	let errorMessage = $state('');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			const data = await response.json() as { error?: string; message?: string };

			if (!response.ok) {
				errorMessage = data.error ?? 'An error occurred';
			} else {
				// Redirect to verification page with email as query param
				goto(`/verify?email=${encodeURIComponent(email)}`);
			}
		} catch {
			errorMessage = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign In | Webflow Asset Dashboard</title>
</svelte:head>

<main class="login-container">
	<div class="login-card">
		<header class="login-header">
			<h1 class="login-title">Sign in to your account</h1>
			<p class="login-subtitle">
				Enter your email to receive a verification code
			</p>
		</header>

		<form onsubmit={handleSubmit}>
			<div class="form-group">
				<label for="email" class="form-label">Email address</label>
				<input
					type="email"
					id="email"
					name="email"
					bind:value={email}
					required
					autocomplete="email"
					class="form-input"
					placeholder="you@example.com"
					disabled={loading}
				/>
			</div>

			{#if errorMessage}
				<div class="error-message">
					{errorMessage}
				</div>
			{/if}

			<button type="submit" class="submit-button" disabled={loading || !email}>
				{#if loading}
					Sending...
				{:else}
					Send verification code
				{/if}
			</button>
		</form>
	</div>
</main>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.login-card {
		width: 100%;
		max-width: 400px;
		padding: 2rem;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
	}

	.login-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.login-title {
		font-family: var(--font-sans);
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: 0.5rem;
	}

	.login-subtitle {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-label {
		display: block;
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		margin-bottom: 0.5rem;
	}

	.form-input {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: var(--text-body);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		transition: border-color var(--duration-micro) var(--ease-standard);
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
		color: var(--color-fg-muted);
	}

	.submit-button {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: #ffffff;
		background: var(--webflow-blue);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: background-color var(--duration-micro) var(--ease-standard);
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
		font-size: var(--text-body-sm);
		color: var(--color-error);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
	}
</style>
