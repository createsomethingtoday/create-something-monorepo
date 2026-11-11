<script lang="ts">
	import { goto } from '$app/navigation';
	import { SEO } from '@create-something/canon';
	import { LoginForm, SignupForm } from '@create-something/canon/auth/components';

	let { data } = $props();

	function initial<T>(read: () => T): T {
		return read();
	}

	let error = $state<string | null>(initial(() => data.error || null));
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
			<span class="status-label">Customer workspace</span>
			<a class="status-value" href="/">Back to Agency ↗</a>
		</div>
		<p class="auth-eyebrow">Your account</p>
		<h1 id="auth-heading">Sign in to your workspace.</h1>
		<p class="auth-summary">
			Use your CREATE SOMETHING credentials to manage your profile and tool access.
		</p>
	</section>

	<section
		class="auth-form-panel"
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
				source="space"
			/>
		{/if}
	</section>
</div>

<style>
	.auth-shell {
		width: min(1760px, 94%);
		margin: 0 auto;
		padding: 0 0 clamp(3rem, 7vw, 6rem);
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(20rem, 28rem);
		align-items: start;
		gap: clamp(2rem, 6vw, 6rem);
	}

	.auth-context {
		border-top: 1px solid var(--color-performance-line);
		padding: var(--space-performance-md) 0 0;
	}

	.auth-status {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-performance-sm);
		font-family: var(--font-performance-mono);
		font-size: 11px;
		letter-spacing: 0.045em;
		text-transform: uppercase;
	}

	.auth-status {
		justify-content: space-between;
		align-items: center;
	}

	.status-label,
	.auth-eyebrow {
		color: var(--color-performance-muted);
	}

	.status-value {
		color: var(--color-performance-muted);
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}

	.auth-eyebrow {
		margin: clamp(2rem, 4vw, 4rem) 0 var(--space-performance-sm);
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h1 {
		max-width: 12ch;
		margin: 0;
		color: var(--color-performance-ink);
		font-family: var(--font-performance-sans);
		font-size: clamp(2.5rem, 5vw, 4.5rem);
		font-weight: 500;
		letter-spacing: -0.055em;
		line-height: 1.08;
	}

	.auth-summary {
		max-width: 44rem;
		margin: var(--space-performance-lg) 0;
		color: var(--color-performance-ink-soft);
		font-size: var(--text-performance-body);
		line-height: 1.65;
	}

	.auth-form-panel {
		padding: clamp(1.25rem, 3vw, 2.5rem);
		background: var(--color-performance-panel);
		border: 1px solid var(--color-performance-line);
		border-radius: var(--radius-operator-panel);
	}

	/* Agency owns this presentation; shared auth behavior stays in Canon. */
	.auth-form-panel :global(.form-title) {
		font-family: var(--font-performance-sans);
		font-size: var(--text-performance-h3);
		letter-spacing: -0.03em;
	}

	.auth-form-panel :global(.form-header) { text-align: left; }
	.auth-form-panel :global(.input) {
		background: var(--color-operator-secondary);
		border: 1px solid var(--color-operator-focus-ring-accessible);
		border-radius: var(--radius-operator-control);
		min-height: 48px;
	}
	.auth-form-panel :global(.input::placeholder) { color: var(--color-operator-muted); }
	.auth-form-panel :global(.submit-button) { border-radius: var(--radius-operator-control); }
	.auth-form-panel :global(.link-button) { min-height: 44px; }
	.auth-form-panel :global(.error-message) {
		background: var(--color-operator-secondary);
		border-color: var(--color-operator-status-blocked-text);
		color: var(--color-operator-status-blocked-text);
		border-radius: var(--radius-operator-control);
		overflow-wrap: anywhere;
	}
	.auth-form-panel :global(:is(input, button):focus-visible) {
		outline: 2px solid var(--color-operator-focus-ring-accessible);
		outline-offset: 3px;
	}

	@media (max-width: 760px) {
		.auth-shell {
			grid-template-columns: 1fr;
		}

		.auth-summary { margin-block: var(--space-performance-md) 0; }

		.auth-eyebrow {
			margin-top: var(--space-performance-md);
		}

		h1 {
			font-size: clamp(2rem, 9vw, 3rem);
		}
	}
	@media (max-width: 700px) {
		.auth-shell { width: 88%; }
	}
</style>
