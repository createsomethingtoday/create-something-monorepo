<script lang="ts">
	/**
	 * OUTERFIELDS Signup Page
	 *
	 * Dedicated signup route (separate from /login) for clearer routing and UX.
	 */
	import { Infinity, AlertCircle, Loader2, UserPlus } from 'lucide-svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';

	interface Props {
		data: {
			redirectTo: string;
		};
	}

	let { data }: Props = $props();

	let isLoading = $state(false);
	let error: string | null = $state(null);

	let email = $state('');
	let password = $state('');
	let name = $state('');

	async function handleSubmit(event: Event) {
		event.preventDefault();
		isLoading = true;
		error = null;

		try {
			const response = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password, name })
			});

			const result = await response.json();

			if (!response.ok) {
				error = result.error || 'Signup failed';
				return;
			}

			if (result.success && result.data?.user) {
				authStore.setUser(result.data.user);
			}

			await invalidateAll();
			goto(data.redirectTo || '/demo');
		} catch {
			error = 'An unexpected error occurred';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Create Account | OUTERFIELDS</title>
</svelte:head>

<div class="auth-container">
	<div class="auth-card">
		<div class="auth-header">
			<a href="/" class="logo">
				<Infinity size={28} />
				<span class="logo-text">OUTERFIELDS</span>
			</a>
			<h1>Create your account</h1>
			<p class="auth-subtitle">Join to access the platform</p>
		</div>

		<form onsubmit={handleSubmit} class="auth-form">
			<div class="form-group">
				<label for="name">Full Name</label>
				<input
					type="text"
					id="name"
					bind:value={name}
					placeholder="Enter your name"
					autocomplete="name"
					required
				/>
			</div>

			<div class="form-group">
				<label for="email">Email</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					placeholder="Enter your email"
					autocomplete="email"
					required
				/>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					placeholder="Create a password"
					autocomplete="new-password"
					required
					minlength="6"
				/>
			</div>

			{#if error}
				<div class="error-message">
					<AlertCircle size={20} />
					{error}
				</div>
			{/if}

			<button type="submit" class="btn-primary submit-btn" disabled={isLoading}>
				{#if isLoading}
					<Loader2 size={20} class="spinning" />
					Creating account...
				{:else}
					<UserPlus size={20} />
					Create Account
				{/if}
			</button>
		</form>

		<div class="auth-switch">
			<p>
				Already have an account?
				<a href="/login">Sign in</a>
			</p>
		</div>
	</div>
</div>

<style>
	.auth-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6rem 1.5rem 2rem;
	}

	.auth-card {
		width: 100%;
		max-width: 26rem;
		background: var(--glass-bg);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		padding: 2.5rem;
	}

	.auth-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.logo {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: var(--color-primary);
		margin-bottom: 1.5rem;
	}

	.logo :global(svg) {
		color: var(--color-primary);
	}

	.logo-text {
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	.auth-header h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.auth-subtitle {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-fg-secondary);
	}

	.form-group input {
		padding: 0.75rem 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-primary);
		font-size: 1rem;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.form-group input::placeholder {
		color: var(--color-fg-subtle);
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: 0.5rem;
		color: var(--color-error);
		font-size: 0.875rem;
	}

	.submit-btn {
		width: 100%;
		margin-top: 0.5rem;
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	:global(.spinning) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.auth-switch {
		text-align: center;
		margin-top: 1.5rem;
	}

	.auth-switch p {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0;
	}

	.auth-switch a {
		color: var(--color-primary);
		font-weight: 500;
		text-decoration: none;
	}

	.auth-switch a:hover {
		text-decoration: underline;
	}
</style>

