<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { page } from '$app/stores';
	import ClerkMount from '$lib/components/ClerkMount.svelte';

	let { data } = $props();
	const redirectTo = $derived(data.redirectTo || '/');
	const errorParam = $derived(data.error || null);

	const errorMessages: Record<string, string> = {
		access_denied: 'Access was denied during sign-in.',
		invalid_state: 'The sign-in session could not be verified. Please try again.',
		missing_callback_params: 'The sign-in response was incomplete. Please try again.',
		token_exchange_failed: 'Token exchange failed. Please try again.',
	};

	const error = $derived(
		errorParam ? errorMessages[errorParam] || 'Authentication failed. Please try again.' : null,
	);

	const publishableKey = $derived($page.data?.publicConfig?.clerkPublishableKey ?? null);
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
			<h1>Sign in to <code>.agency</code></h1>
			<p class="auth-subtitle">
				Use your managed account to access the client portal,
				bearer-token controls, and MCP surfaces.
			</p>
		</div>

		{#if error}
			<div class="error-message" role="alert">{error}</div>
		{/if}

		<ClerkMount
			mode="signIn"
			{publishableKey}
			fallbackRedirectUrl={redirectTo}
		/>

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

	.auth-footnote {
		margin: var(--space-lg) 0 0;
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		line-height: 1.7;
	}
</style>
