<script lang="ts">
	let email = $state('');
	let loading = $state(false);
	let submitted = $state(false);
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
				submitted = true;
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
				Enter your email to receive a magic link
			</p>
		</header>

		{#if submitted}
			<div class="success-message">
				<p>Check your email for a sign-in link.</p>
				<p class="success-subtitle">The link will expire in 60 minutes.</p>
			</div>
		{:else}
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
						Send magic link
					{/if}
				</button>
			</form>
		{/if}
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
		background: var(--webflow-bg-secondary);
		border: 1px solid var(--webflow-border);
		border-radius: var(--webflow-radius-xl);
	}

	.login-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.login-title {
		font-size: var(--webflow-text-h3);
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.login-subtitle {
		font-size: var(--webflow-text-small);
		color: var(--webflow-text-muted);
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

	.success-message {
		text-align: center;
		padding: 1.5rem;
		background: rgba(0, 200, 83, 0.1);
		border: 1px solid rgba(0, 200, 83, 0.2);
		border-radius: var(--webflow-radius-md);
	}

	.success-message p {
		font-size: 1rem;
		color: var(--webflow-success);
		margin-bottom: 0.5rem;
	}

	.success-subtitle {
		font-size: var(--webflow-text-small);
		color: var(--webflow-text-muted) !important;
	}
</style>
