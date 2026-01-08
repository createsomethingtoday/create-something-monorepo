<script lang="ts">
	/**
	 * OUTERFIELDS Login Page
	 *
	 * Authentication page with login/signup forms
	 */
	import { Infinity, AlertCircle, CheckCircle, Loader2, LogIn, UserPlus, ShieldCheck, User } from 'lucide-svelte';
	import { goto, invalidateAll } from '$app/navigation';

	interface Props {
		data: {
			redirectTo: string;
		};
	}

	let { data }: Props = $props();

	type AuthMode = 'login' | 'signup';
	let mode: AuthMode = $state('login');
	let isLoading = $state(false);
	let error: string | null = $state(null);
	let success: string | null = $state(null);

	let email = $state('');
	let password = $state('');
	let name = $state('');

	// Demo accounts
	const demoAccounts = [
		{ label: 'User Demo', email: 'demo@outerfields.com', password: 'demo123', role: 'user' },
		{ label: 'Admin Demo', email: 'admin@outerfields.com', password: 'demo123', role: 'admin' }
	];

	async function handleSubmit(event: Event) {
		event.preventDefault();
		isLoading = true;
		error = null;
		success = null;

		const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
		const body =
			mode === 'login'
				? { email, password }
				: { email, password, name, source: 'outerfields' };

		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			const result = await response.json();

			if (!response.ok) {
				error = result.error || `${mode === 'login' ? 'Login' : 'Signup'} failed`;
				return;
			}

			await invalidateAll();
			goto(data.redirectTo);
		} catch {
			error = 'An unexpected error occurred';
		} finally {
			isLoading = false;
		}
	}

	function fillDemoCredentials(demo: (typeof demoAccounts)[0]) {
		email = demo.email;
		password = demo.password;
		mode = 'login';
	}
</script>

<svelte:head>
	<title>{mode === 'login' ? 'Sign In' : 'Create Account'} | OUTERFIELDS</title>
</svelte:head>

<div class="auth-container">
	<div class="auth-card">
		<div class="auth-header">
			<a href="/" class="logo">
				<Infinity size={28} />
				<span class="logo-text">OUTERFIELDS</span>
			</a>
			<h1>
				{#if mode === 'login'}
					Welcome back
				{:else}
					Create your account
				{/if}
			</h1>
			<p class="auth-subtitle">
				{#if mode === 'login'}
					Sign in to access the platform demo
				{:else}
					Join to experience the full platform
				{/if}
			</p>
		</div>

		<form onsubmit={handleSubmit} class="auth-form">
			{#if mode === 'signup'}
				<div class="form-group">
					<label for="name">Full Name</label>
					<input
						type="text"
						id="name"
						bind:value={name}
						placeholder="Enter your name"
						autocomplete="name"
					/>
				</div>
			{/if}

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
					placeholder="Enter your password"
					autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
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

			{#if success}
				<div class="success-message">
					<CheckCircle size={20} />
					{success}
				</div>
			{/if}

			<button type="submit" class="btn-primary submit-btn" disabled={isLoading}>
				{#if isLoading}
					<Loader2 size={20} class="spinning" />
					{mode === 'login' ? 'Signing in...' : 'Creating account...'}
				{:else if mode === 'login'}
					<LogIn size={20} />
					Sign In
				{:else}
					<UserPlus size={20} />
					Create Account
				{/if}
			</button>
		</form>

		<div class="auth-switch">
			{#if mode === 'login'}
				<p>
					Don't have an account?
					<button type="button" onclick={() => (mode = 'signup')}>Create one</button>
				</p>
			{:else}
				<p>
					Already have an account?
					<button type="button" onclick={() => (mode = 'login')}>Sign in</button>
				</p>
			{/if}
		</div>

		<div class="demo-section">
			<div class="divider">
				<span>or try a demo account</span>
			</div>

			<div class="demo-accounts">
				{#each demoAccounts as demo}
					<button type="button" class="demo-btn" onclick={() => fillDemoCredentials(demo)}>
						<span class="demo-icon" class:admin={demo.role === 'admin'}>
							{#if demo.role === 'admin'}
								<ShieldCheck size={24} />
							{:else}
								<User size={24} />
							{/if}
						</span>
						<div class="demo-info">
							<span class="demo-label">{demo.label}</span>
							<span class="demo-email">{demo.email}</span>
						</div>
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.auth-container {
		min-height: calc(100vh - 80px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
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

	.error-message :global(svg) {
		flex-shrink: 0;
	}

	.success-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: 0.5rem;
		color: var(--color-success);
		font-size: 0.875rem;
	}

	.success-message :global(svg) {
		flex-shrink: 0;
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

	.auth-switch button {
		background: none;
		border: none;
		color: var(--color-primary);
		font-weight: 500;
		cursor: pointer;
		padding: 0;
	}

	.auth-switch button:hover {
		text-decoration: underline;
	}

	.demo-section {
		margin-top: 2rem;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--color-border-default);
	}

	.divider span {
		font-size: 0.75rem;
		color: var(--color-fg-subtle);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.demo-accounts {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.demo-btn {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		padding: 0.875rem 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
		text-align: left;
	}

	.demo-btn:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-surface-hover);
	}

	.demo-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-fg-muted);
	}

	.demo-icon.admin {
		color: var(--color-primary);
	}

	.demo-info {
		display: flex;
		flex-direction: column;
	}

	.demo-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-fg-primary);
	}

	.demo-email {
		font-size: 0.75rem;
		color: var(--color-fg-subtle);
	}
</style>
