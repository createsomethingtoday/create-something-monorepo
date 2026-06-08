<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { goto } from '$app/navigation';

	let { data } = $props();
	const redirectTo = $derived(data.redirectTo || '/');
	const loginHref = $derived(`/api/auth/login?redirect=${encodeURIComponent(redirectTo)}`);
	const signupHref = $derived(`/api/auth/signup?redirect=${encodeURIComponent(redirectTo)}`);
	const errorParam = $derived(data.error || null);

	const errorMessages: Record<string, string> = {
		access_denied: 'Access was denied during sign-in.',
		invalid_state: 'The sign-in session could not be verified. Please try again.',
		missing_callback_params: 'The sign-in response was incomplete. Please try again.',
		token_exchange_failed: 'Token exchange failed. Please try again.',
	};

	const error = $derived(
		errorParam ? errorMessages[errorParam] || 'Authentication failed. Please try again.' : null
	);

	function continueTo(href: string) {
		goto(href, { invalidateAll: false });
	}
</script>

<SEO
	title="Sign In"
	description="Sign in to CREATE SOMETHING AGENCY"
	propertyName="agency"
	noindex={true}
/>

<div class="auth-container">
	<div class="auth-card">
		<div class="auth-header">
			<h1>Sign in to `.agency`</h1>
			<p class="auth-subtitle">
				Identity is now managed through Clerk. Use your managed account to access the client portal,
				bearer-token controls, and MCP surfaces.
			</p>
		</div>

		{#if error}
			<div class="error-message" role="alert">{error}</div>
		{/if}

		<div class="auth-actions">
			<button class="primary-action" type="button" onclick={() => continueTo(loginHref)}>
				Continue with Clerk
			</button>
			<button class="secondary-action" type="button" onclick={() => continueTo(signupHref)}>
				Create account
			</button>
		</div>

		<p class="auth-footnote">
			If you already have an authorized organization account, use the same email you use for client access.
			New account creation is still subject to policy, contract, and billing activation.
		</p>
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
		max-width: 36rem;
		background: var(--color-bg-surface);
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
		line-height: 1.7;
	}

	.error-message {
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		color: var(--color-error);
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		margin-bottom: var(--space-md);
	}

	.auth-actions {
		display: grid;
		gap: var(--space-md);
	}

	.primary-action,
	.secondary-action {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-full);
		font-size: var(--text-body);
		font-weight: 600;
		min-height: 48px;
		cursor: pointer;
	}

	.primary-action {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
	}

	.secondary-action {
		background: transparent;
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
	}

	.auth-footnote {
		margin: var(--space-lg) 0 0;
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		line-height: 1.7;
	}
</style>
