<script lang="ts">
	import { goto } from '$app/navigation';
	import { SEO } from '@create-something/canon';
	import { LoginForm, SignupForm } from '@create-something/canon/auth/components';

	let { data } = $props();
	let error = $state<string | null>(data.error || null);
	let mode = $state<'login' | 'signup'>('login');

	function switchMode(nextMode: 'login' | 'signup') {
		error = null;
		mode = nextMode;
	}

	async function signIn(credentials: { email: string; password: string }): Promise<boolean> {
		error = null;
		const response = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(credentials),
		});
		const payload = (await response.json()) as { success?: boolean; error?: string };
		if (!response.ok || payload.success !== true) {
			error = payload.error || 'Sign-in failed. Check your credentials and try again.';
			return false;
		}
		await goto(data.redirectTo);
		return true;
	}

	async function signUp(credentials: {
		email: string;
		password: string;
		name?: string;
		source?: string;
	}): Promise<boolean> {
		error = null;
		const response = await fetch('/api/auth/signup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(credentials),
		});
		const payload = (await response.json()) as { success?: boolean; error?: string };
		if (!response.ok || payload.success !== true) {
			error = payload.error || 'Account creation failed. Check your details and try again.';
			return false;
		}
		await goto(data.redirectTo);
		return true;
	}
</script>

<SEO
	title="Sign In"
	description="Sign in to CREATE SOMETHING AGENCY"
	propertyName="agency"
	noindex={true}
/>

<div class="auth-shell property-performance">
	<section class="auth-context" aria-labelledby="auth-heading">
		<div class="auth-status">
			<span class="status-label">Identity</span>
			<span class="status-value">Controlled</span>
		</div>
		<p class="auth-eyebrow">First-party customer access</p>
		<h1 id="auth-heading">Sign in to your .agency workspace.</h1>
		<p class="auth-summary">
			Credentials are verified by CREATE SOMETHING Identity. Your workspace applies its own account,
			tenant, and entitlement boundaries after authentication.
		</p>
		<div class="auth-proof" aria-label="Authentication controls">
			<span>Surface / Customer workspace</span>
			<span>Session / HttpOnly</span>
			<span>Policy / Fail closed</span>
		</div>
	</section>

	<section
		class="auth-form-panel theme-light"
		aria-label={mode === 'login' ? 'Sign-in form' : 'Account creation form'}
	>
		{#if mode === 'login'}
			<LoginForm
				onSubmit={signIn}
				onSwitchToSignup={() => switchMode('signup')}
				{error}
				showMagicLinkOption={false}
				showSignupLink={true}
			/>
		{:else}
			<SignupForm
				onSubmit={signUp}
				onSwitchToLogin={() => switchMode('login')}
				{error}
				showMagicLinkOption={false}
				showLoginLink={true}
				source="agency"
			/>
		{/if}
	</section>
</div>

<style>
	.auth-shell {
		width: min(var(--content-width-performance), calc(100% - 2rem));
		min-height: calc(100vh - 8rem);
		margin: 0 auto;
		padding: clamp(2rem, 7vw, 6rem) 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(20rem, 28rem);
		align-items: start;
		gap: clamp(2rem, 6vw, 6rem);
	}

	.auth-context {
		border-top: 1px solid var(--color-performance-line);
		padding-top: var(--space-performance-md);
	}

	.auth-status,
	.auth-proof {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-performance-sm) var(--space-performance-lg);
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.auth-status {
		justify-content: space-between;
	}

	.status-label,
	.auth-eyebrow,
	.auth-proof {
		color: var(--color-performance-muted);
	}

	.status-value {
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
		max-width: 12ch;
		margin: 0;
		color: var(--color-performance-ink);
		font-family: var(--font-performance-display);
		font-size: clamp(2.5rem, 6vw, 5.5rem);
		font-weight: var(--font-performance-bold);
		letter-spacing: -0.055em;
		line-height: 0.94;
	}

	.auth-summary {
		max-width: 44rem;
		margin: var(--space-performance-lg) 0;
		color: var(--color-performance-ink-soft);
		font-size: var(--text-performance-body);
		line-height: 1.65;
	}

	.auth-proof {
		padding-top: var(--space-performance-md);
		border-top: 1px solid var(--color-performance-line);
	}

	.auth-form-panel {
		padding: var(--space-performance-lg);
		background: var(--color-performance-panel);
		border: 1px solid var(--color-performance-line);
		box-shadow: var(--shadow-performance-panel);
	}

	@media (max-width: 760px) {
		.auth-shell {
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
