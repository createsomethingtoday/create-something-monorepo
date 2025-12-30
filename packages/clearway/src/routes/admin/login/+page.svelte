<script lang="ts">
	/**
	 * Admin Login - Redirect to Identity Worker
	 *
	 * Simple redirect page to centralized auth.
	 * Canon: The login mechanism disappears; only access remains.
	 */

	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	const IDENTITY_WORKER = 'https://id.createsomething.space';

	let redirectUrl = $derived(
		$page.url.searchParams.get('redirect') || '/admin'
	);

	function login() {
		// Build OAuth-style redirect to Identity Worker
		const returnUrl = `${$page.url.origin}${redirectUrl}`;
		const loginUrl = `${IDENTITY_WORKER}/login?redirect=${encodeURIComponent(returnUrl)}&source=clearway`;
		window.location.href = loginUrl;
	}

	onMount(() => {
		// Could auto-redirect, but showing a button is more user-friendly
	});
</script>

<svelte:head>
	<title>Login - CLEARWAY Admin</title>
</svelte:head>

<div class="login">
	<div class="login-card">
		<h1>CLEARWAY Admin</h1>
		<p class="subtitle">The Stack Demo Instance</p>

		<p class="description">
			Sign in with your CREATE SOMETHING account to access the admin dashboard.
		</p>

		<button class="login-button" onclick={login}>
			Sign in with Identity
		</button>

		<p class="note">
			Access restricted to authorized administrators.
		</p>
	</div>
</div>

<style>
	.login {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-pure, #000000);
		padding: var(--space-lg, 1.5rem);
	}

	.login-card {
		max-width: 400px;
		width: 100%;
		text-align: center;
		padding: var(--space-xl, 2rem);
		background: var(--color-bg-subtle, #1a1a1a);
		border-radius: var(--radius-lg, 12px);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	h1 {
		font-size: var(--text-h2, 1.5rem);
		font-weight: 700;
		color: var(--color-fg-primary, #ffffff);
		margin: 0 0 0.25rem;
	}

	.subtitle {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		margin: 0 0 var(--space-lg, 1.5rem);
	}

	.description {
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		margin: 0 0 var(--space-lg, 1.5rem);
		line-height: 1.6;
	}

	.login-button {
		width: 100%;
		padding: 0.875rem 1.5rem;
		font-size: var(--text-body, 1rem);
		font-weight: 600;
		background: var(--color-fg-primary, #ffffff);
		color: var(--color-bg-pure, #000000);
		border: none;
		border-radius: var(--radius-md, 8px);
		cursor: pointer;
		transition: opacity var(--duration-micro, 200ms) var(--ease-standard);
	}

	.login-button:hover {
		opacity: 0.9;
	}

	.note {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		margin: var(--space-lg, 1.5rem) 0 0;
	}
</style>
