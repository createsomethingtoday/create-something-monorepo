<script lang="ts">
	import { enhance } from '$app/forms';

	let error = $state('');
	let loading = $state(false);
</script>

<svelte:head>
	<title>Login | Maverick X Admin</title>
</svelte:head>

<div class="login-container">
	<div class="card login-card">
		<div class="login-header">
			<h1 class="login-title">MAVERICK X</h1>
			<p class="login-subtitle">Admin Portal</p>
		</div>

		{#if error}
			<div class="error-box">
				<p class="error-text">{error}</p>
			</div>
		{/if}

		<form
			method="POST"
			action="/api/auth/login"
			use:enhance={() => {
				loading = true;
				return async ({ result }) => {
					loading = false;
					if (result.type === 'redirect') {
						window.location.href = result.location;
					} else if (result.type === 'failure') {
						error = 'Invalid credentials';
					}
				};
			}}
		>
			<div class="form-fields">
				<div>
					<label for="email" class="field-label">Email</label>
					<input
						type="email"
						id="email"
						name="email"
						required
						autocomplete="email"
						class="w-full"
						placeholder="admin@maverickx.com"
					/>
				</div>

				<div>
					<label for="password" class="field-label">Password</label>
					<input
						type="password"
						id="password"
						name="password"
						required
						autocomplete="current-password"
						class="w-full"
						placeholder="••••••••"
					/>
				</div>

				<button
					type="submit"
					class="btn btn-primary w-full"
					disabled={loading}
				>
					{#if loading}
						<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
							<path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1" />
						</svg>
						Signing in...
					{:else}
						Sign In
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-sm);
	}

	.login-card {
		width: 100%;
		max-width: 28rem;
	}

	.login-header {
		text-align: center;
		margin-bottom: var(--space-lg);
	}

	.login-title {
		font-size: var(--text-h2, 1.5rem);
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.login-subtitle {
		margin-top: var(--space-xs);
		color: var(--color-fg-secondary);
	}

	.error-box {
		margin-bottom: var(--space-sm);
		padding: var(--space-xs);
		border-radius: var(--radius-lg);
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	.error-text {
		color: var(--color-error);
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.field-label {
		display: block;
		font-size: var(--text-body-sm, 0.875rem);
		font-weight: 500;
		margin-bottom: 0.25rem;
		color: var(--color-fg-secondary);
	}

	.spinner {
		width: 1rem;
		height: 1rem;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
