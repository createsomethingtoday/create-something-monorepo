<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { page } from '$app/stores';
	import ClerkMount from '$lib/components/ClerkMount.svelte';

	let { data } = $props();
	const publishableKey = $derived($page.data?.publicConfig?.clerkPublishableKey ?? null);
</script>

<SEO
	title="Create Account"
	description="Create an account on CREATE SOMETHING AGENCY"
	propertyName="agency"
	noindex={true}
/>

<div class="auth-container">
	<div class="auth-card">
		<div class="auth-header">
			<h1>Create your account</h1>
			<p class="auth-subtitle">
				New account creation is subject to policy, contract, and billing activation.
			</p>
		</div>

		<ClerkMount
			mode="signUp"
			{publishableKey}
			fallbackRedirectUrl={data.redirectTo}
		/>
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
</style>
