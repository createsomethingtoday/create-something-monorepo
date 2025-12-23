<script lang="ts">
	import { LoginForm, SignupForm, MagicLinkForm } from '@create-something/components/auth';
	import { goto, invalidateAll } from '$app/navigation';

	interface AuthResponse {
		success?: boolean;
		error?: string;
	}

	let { data } = $props();

	type AuthMode = 'login' | 'signup' | 'magic';
	let mode: AuthMode = $state('login');
	let isLoading = $state(false);
	let error: string | null = $state(null);

	async function handleLogin(credentials: { email: string; password: string }): Promise<boolean> {
		isLoading = true;
		error = null;

		try {
			const response = await fetch('/api/public/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(credentials)
			});

			const result = (await response.json()) as AuthResponse;

			if (!response.ok) {
				error = result.error || 'Login failed';
				return false;
			}

			// Invalidate all load functions to refresh user state
			await invalidateAll();
			const redirectTo = data.redirectTo || '/';
			goto(redirectTo);
			return true;
		} catch {
			error = 'An unexpected error occurred';
			return false;
		} finally {
			isLoading = false;
		}
	}

	async function handleSignup(credentials: { email: string; password: string; name?: string }): Promise<boolean> {
		isLoading = true;
		error = null;

		try {
			const response = await fetch('/api/public/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...credentials, source: 'io' })
			});

			const result = (await response.json()) as AuthResponse;

			if (!response.ok) {
				error = result.error || 'Signup failed';
				return false;
			}

			// Invalidate all load functions to refresh user state
			await invalidateAll();
			const redirectTo = data.redirectTo || '/';
			goto(redirectTo);
			return true;
		} catch {
			error = 'An unexpected error occurred';
			return false;
		} finally {
			isLoading = false;
		}
	}

	async function handleMagicLink(email: string): Promise<boolean> {
		isLoading = true;
		error = null;

		try {
			const response = await fetch('/api/public/auth/magic-login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, source: 'io' })
			});

			const result = (await response.json()) as AuthResponse;

			if (!response.ok) {
				error = result.error || 'Failed to send magic link';
				return false;
			}

			return true;
		} catch {
			error = 'An unexpected error occurred';
			return false;
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign In | CREATE SOMETHING</title>
</svelte:head>

<div class="auth-container">
	<div class="auth-card">
		<div class="auth-header">
			<h1>
				{#if mode === 'login'}
					Sign in
				{:else if mode === 'signup'}
					Create account
				{:else}
					Passwordless sign in
				{/if}
			</h1>
			<p class="auth-subtitle">
				{#if mode === 'login'}
					Welcome back to CREATE SOMETHING
				{:else if mode === 'signup'}
					Join the research community
				{:else}
					We'll send you a magic link
				{/if}
			</p>
		</div>

		{#if mode === 'login'}
			<LoginForm
				onSubmit={handleLogin}
				onSwitchToSignup={() => (mode = 'signup')}
				onSwitchToMagicLink={() => (mode = 'magic')}
				{isLoading}
				{error}
				showMagicLinkOption={true}
				showSignupLink={true}
			/>
		{:else if mode === 'signup'}
			<SignupForm
				onSubmit={handleSignup}
				onSwitchToLogin={() => (mode = 'login')}
				onSwitchToMagicLink={() => (mode = 'magic')}
				{isLoading}
				{error}
				source="io"
			/>
		{:else}
			<MagicLinkForm
				onSubmit={handleMagicLink}
				onSwitchToLogin={() => (mode = 'login')}
				{isLoading}
				{error}
			/>
		{/if}
	</div>
</div>

<style>
	.auth-container {
		min-height: calc(100vh - 72px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.auth-card {
		width: 100%;
		max-width: 480px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
	}

	.auth-header {
		text-align: center;
		margin-bottom: var(--space-lg);
	}

	.auth-header h1 {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs) 0;
	}

	.auth-subtitle {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0;
	}
</style>
