<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { LoginForm, SignupForm, MagicLinkForm } from '@create-something/canon/auth';
	import { goto, invalidateAll } from '$app/navigation';

	interface AuthResponse {
		success?: boolean;
		error?: string;
	}

	let { data } = $props();

	type AuthMode = 'login' | 'signup' | 'magic';

	function friendlyLoginError(code: string | null): string | null {
		if (!code) return null;
		if (code === 'unsupported_provider') {
			return 'This sign-in link is no longer supported. Use your password or request a new email link below.';
		}
		return 'Sign-in could not continue. Choose a sign-in method below and try again.';
	}

	function labelReturnDestination(path: string): string {
		if (path === '/account') return 'your Canon account';
		if (path === '/canon' || path.startsWith('/canon/')) return 'the Canon library';
		if (path === '/masters' || path.startsWith('/masters/')) return 'Masters';
		if (path === '/principles' || path.startsWith('/principles/')) return 'Principles';
		return 'your requested Canon page';
	}

	let mode: AuthMode = $state('login');
	let isLoading = $state(false);
	let errorOverride = $state<string | null | undefined>(undefined);
	const error = $derived(
		errorOverride === undefined ? friendlyLoginError(data.error) : errorOverride
	);
	const returnDestinationLabel = $derived(labelReturnDestination(data.redirectTo));

	function switchMode(nextMode: AuthMode) {
		errorOverride = null;
		mode = nextMode;
	}

	async function handleLogin(credentials: { email: string; password: string }): Promise<boolean> {
		isLoading = true;
		errorOverride = null;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(credentials)
			});

			const result = (await response.json()) as AuthResponse;

			if (!response.ok) {
				errorOverride = result.error || 'Login failed';
				return false;
			}

			// Invalidate all load functions to refresh user state
			await invalidateAll();
			const redirectTo = data.redirectTo || '/';
			await goto(redirectTo);
			return true;
		} catch {
			errorOverride = 'An unexpected error occurred';
			return false;
		} finally {
			isLoading = false;
		}
	}

	async function handleSignup(credentials: { email: string; password: string; name?: string }): Promise<boolean> {
		isLoading = true;
		errorOverride = null;

		try {
			const response = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...credentials, source: 'ltd' })
			});

			const result = (await response.json()) as AuthResponse;

			if (!response.ok) {
				errorOverride = result.error || 'Signup failed';
				return false;
			}

			// Invalidate all load functions to refresh user state
			await invalidateAll();
			const redirectTo = data.redirectTo || '/';
			await goto(redirectTo);
			return true;
		} catch {
			errorOverride = 'An unexpected error occurred';
			return false;
		} finally {
			isLoading = false;
		}
	}

	async function handleMagicLink(email: string): Promise<boolean> {
		isLoading = true;
		errorOverride = null;

		try {
			const response = await fetch('/api/auth/magic-login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, source: 'ltd' })
			});

			const result = (await response.json()) as AuthResponse;

			if (!response.ok) {
				errorOverride = result.error || 'Failed to send magic link';
				return false;
			}

			return true;
		} catch {
			errorOverride = 'An unexpected error occurred';
			return false;
		} finally {
			isLoading = false;
		}
	}
</script>

<SEO
	title="Sign In"
	description="Sign in to CREATE SOMETHING"
	propertyName="ltd"
	noindex={true}
/>

<div class="auth-shell property-performance">
	<section class="auth-context" data-performance-chapter="task-state" aria-labelledby="auth-heading">
		<div class="auth-status">
			<span>Canon access</span>
			<strong>
				{mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Email link'}
			</strong>
		</div>
		<p class="auth-eyebrow">Your next step</p>
		<h1 id="auth-heading">
			{mode === 'login'
				? 'Sign in to Canon.'
				: mode === 'signup'
					? 'Create your Canon account.'
					: 'Email yourself a Canon sign-in link.'}
		</h1>
		<p class="auth-summary">
			{#if mode === 'magic'}
				Enter your email. We will send a one-time link, then return you to {returnDestinationLabel}.
			{:else}
				Use your CREATE SOMETHING email and password. We will return you to {returnDestinationLabel}
				when this step is complete.
			{/if}
		</p>
		<div class="auth-boundary" aria-label="Account boundary">
			<span>Checked by CREATE SOMETHING Identity</span>
			<span>Access stays with this account</span>
		</div>
	</section>

	<section class="auth-card" data-performance-chapter="workspace" aria-label="Account form">
		{#if mode === 'login'}
			<LoginForm
				onSubmit={handleLogin}
				onSwitchToSignup={() => switchMode('signup')}
				onSwitchToMagicLink={() => switchMode('magic')}
				{isLoading}
				{error}
				showMagicLinkOption={true}
				showSignupLink={true}
			/>
		{:else if mode === 'signup'}
			<SignupForm
				onSubmit={handleSignup}
				onSwitchToLogin={() => switchMode('login')}
				onSwitchToMagicLink={() => switchMode('magic')}
				{isLoading}
				{error}
				source="ltd"
			/>
		{:else}
			<MagicLinkForm
				onSubmit={handleMagicLink}
				onSwitchToLogin={() => switchMode('login')}
				{isLoading}
				{error}
			/>
		{/if}
	</section>

	<section class="auth-handoff" data-performance-chapter="decision-receipt">
		<span>
			{mode === 'login'
				? 'After sign-in'
				: mode === 'signup'
					? 'After account creation'
					: 'After opening the email'}
		</span>
		<strong>{returnDestinationLabel}</strong>
		{#if mode === 'magic'}
			<p>Check your email, open the link, and return to {returnDestinationLabel}.</p>
		{:else}
			<p>If an old link fails, stay here and choose another sign-in method. Your return path stays inside Canon.</p>
		{/if}
	</section>
</div>

<style>
	.auth-shell {
		width: min(var(--content-width-performance), calc(100% - 2rem));
		min-height: calc(100vh - 72px);
		margin: 0 auto;
		padding: clamp(2rem, 7vw, 6rem) 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(20rem, 30rem);
		align-items: start;
		gap: clamp(2rem, 6vw, 6rem);
	}

	.auth-card {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-xl);
	}

	.auth-context {
		border-top: 1px solid var(--color-performance-border-subtle);
		padding-top: var(--space-performance-md);
	}

	.auth-status,
	.auth-boundary {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--space-performance-sm) var(--space-performance-lg);
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.auth-status span,
	.auth-boundary,
	.auth-eyebrow,
	.auth-handoff span {
		color: var(--color-performance-fg-muted);
	}

	.auth-status strong {
		color: var(--color-performance-ready);
	}

	.auth-eyebrow {
		margin: clamp(3rem, 8vw, 7rem) 0 var(--space-performance-sm);
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h1 {
		max-width: 13ch;
		margin: 0;
		font-size: clamp(2.5rem, 6vw, 5.5rem);
		font-weight: var(--font-performance-bold);
		color: var(--color-performance-fg-primary);
		letter-spacing: -0.055em;
		line-height: 0.94;
	}

	.auth-summary {
		max-width: 44rem;
		margin: var(--space-performance-lg) 0;
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-tertiary);
		line-height: 1.65;
	}

	.auth-boundary {
		justify-content: flex-start;
		padding-top: var(--space-performance-md);
		border-top: 1px solid var(--color-performance-border-subtle);
	}

	.auth-handoff {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: minmax(8rem, 0.35fr) minmax(12rem, 0.65fr) minmax(0, 1fr);
		gap: var(--space-performance-md);
		align-items: baseline;
		border-top: 1px solid var(--color-performance-border-subtle);
		padding-top: var(--space-performance-md);
	}

	.auth-handoff span {
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.auth-handoff strong,
	.auth-handoff p {
		margin: 0;
	}

	.auth-handoff p {
		color: var(--color-performance-fg-tertiary);
		line-height: 1.5;
	}

	@media (max-width: 760px) {
		.auth-shell,
		.auth-handoff {
			grid-template-columns: 1fr;
		}

		.auth-eyebrow {
			margin-top: var(--space-performance-xl);
		}

		h1 {
			font-size: clamp(2.5rem, 13vw, 4rem);
		}
	}
</style>
