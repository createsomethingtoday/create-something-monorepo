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

<div class="identity">
	<a class="skip" href="#identity-form">Skip to account form</a>
	<header>
		<a class="wordmark" href="/" aria-label="CREATE SOMETHING home">CREATE SOMETHING</a>
		<a href="/">Back to Agency <span aria-hidden="true">↗</span></a>
	</header>
	<section class="auth-shell" aria-labelledby="auth-heading">
		<div class="intro">
			<h1 id="auth-heading">{mode === 'login' ? 'Sign in to your workspace.' : 'Create your account.'}</h1>
			<p>Use your CREATE SOMETHING Identity to manage your profile and tool access.</p>
		</div>
		<div class="auth-form-panel" id="identity-form" tabindex="-1">
			<noscript>Enable JavaScript to sign in or create an account.</noscript>
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
			{#if mode === 'login'}
				<a class="recover" href="https://id.createsomething.space/recover">Forgot your password?</a>
			{/if}
		</div>
	</section>
	<footer><a href="/privacy">Privacy choices</a><a href="/contact">Contact</a></footer>
</div>

<style>
	@font-face {
		font-family: "STIX Two Text";
		src: url("/fonts/agency-stix-two-text.woff2") format("woff2");
		font-weight: 400;
		font-display: swap;
	}
	@font-face {
		font-family: "Agency Geist";
		src: url("/fonts/agency-geist-latin.woff2") format("woff2");
		font-weight: 100 900;
		font-display: swap;
	}
	.identity {
		--paper: #faf8f5;
		--ink: #262626;
		--line: #d9d5ce;
		--subtle: #625e58;
		--color-performance-fg-primary: var(--ink);
		--color-performance-fg-secondary: var(--subtle);
		--color-performance-fg-tertiary: var(--subtle);
		--color-performance-fg-muted: var(--subtle);
		--color-performance-bg-pure: white;
		--color-performance-focus: var(--ink);
		--color-performance-error: #8b2327;
		--color-performance-error-muted: #fff2f0;
		--color-performance-error-border: #ca8785;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		min-height: 100svh;
		padding-inline: max(1.25rem, calc((100% - 69rem) / 2));
		background: var(--paper);
		color: var(--ink);
		color-scheme: light;
		font: 400 1rem/1.5 "Agency Geist", Arial, sans-serif;
	}
	.skip { position: absolute; left: 1rem; top: 1rem; transform: translateY(-200%); }
	.skip:focus { transform: none; background: var(--paper); padding: .5rem; }
	header, footer { display: flex; gap: 1.5rem; align-items: center; padding-block: 1.25rem; }
	header { justify-content: space-between; border-bottom: 1px solid var(--line); }
	.recover { display: inline-flex; align-items: center; min-height: 44px; font-size: .9rem; }
	footer { margin-top: auto; border-top: 1px solid var(--line); }
	a { color: inherit; text-underline-offset: .2em; }
	header a, footer a { font-size: .9rem; }
	header .wordmark { font-size: 1.12rem; font-weight: 800; letter-spacing: -.055em; text-decoration: none; }
	.auth-shell { display: grid; grid-template-columns: minmax(0,1.15fr) minmax(0,.85fr); gap: clamp(2rem, 7vw, 7rem); align-items: start; padding-block: clamp(4rem,12vh,9rem); }
	h1 { margin: 0; max-width: 12ch; font: 400 clamp(3rem,5vw,4.75rem)/1.02 "STIX Two Text", Georgia, serif; letter-spacing: -.054em; }
	.intro p { max-width: 32ch; margin: 1.25rem 0 0; color: var(--subtle); font-size: 1.2rem; }
	.auth-form-panel :global(.form-header) { display: none; }
	.auth-form-panel :global(.label) { color: var(--ink); font-weight: 500; }
	.auth-form-panel :global(.input) { min-height: 3rem; background: white; color: var(--ink); border: 1px solid #aaa69e; border-radius: .42rem; font: inherit; }
	.auth-form-panel :global(.input::placeholder) { color: var(--subtle); }
	.auth-form-panel :global(.submit-button) { border-radius: .42rem; background: var(--ink); color: white; font-weight: 600; min-height: 3rem; }
	.auth-form-panel :global(.link-button), .auth-form-panel :global(.terms-link) { color: var(--ink); text-decoration: underline; text-underline-offset: .18em; }
	.identity :global(:is(input,button,a):focus-visible) { outline: 2px solid var(--ink); outline-offset: 3px; }
	@media (max-width: 720px) {
		.auth-shell { grid-template-columns: 1fr; padding-block: 3.5rem; }
		.auth-form-panel :global(.auth-form) { max-width: none; }
	}
</style>
