<script lang="ts">
	/**
	 * Protected Route
	 *
	 * Wrapper component that redirects unauthenticated users.
	 * Provides loading state and fallback content.
	 *
	 * Canon: Protection is invisible when valid; only the content remains.
	 */

	import type { Snippet } from 'svelte';
	import type { User } from '../types.js';

	interface Props {
		/** Current user (null if not authenticated) */
		user: User | null;
		/** Whether auth state is still loading */
		isLoading?: boolean;
		/** Redirect URL for unauthenticated users */
		loginUrl?: string;
		/** Include redirect parameter in login URL */
		includeRedirect?: boolean;
		/** Content to render when authenticated */
		children?: Snippet;
		/** Content to render while loading */
		loading?: Snippet;
		/** Content to render when not authenticated (before redirect) */
		fallback?: Snippet;
		/** Called when redirect happens (for SPA navigation) */
		onRedirect?: (url: string) => void;
	}

	let {
		user,
		isLoading = false,
		loginUrl = '/login',
		includeRedirect = true,
		children,
		loading,
		fallback,
		onRedirect
	}: Props = $props();

	const isAuthenticated = $derived(!!user);

	$effect(() => {
		if (!isLoading && !isAuthenticated) {
			// Build redirect URL
			let redirectUrl = loginUrl;
			if (includeRedirect && typeof window !== 'undefined') {
				const currentPath = window.location.pathname + window.location.search;
				redirectUrl = `${loginUrl}?redirect=${encodeURIComponent(currentPath)}`;
			}

			// Call redirect handler or navigate
			if (onRedirect) {
				onRedirect(redirectUrl);
			} else if (typeof window !== 'undefined') {
				window.location.href = redirectUrl;
			}
		}
	});
</script>

{#if isLoading}
	{#if loading}
		{@render loading()}
	{:else}
		<div class="loading-state">
			<div class="spinner"></div>
			<p class="loading-text">Loading...</p>
		</div>
	{/if}
{:else if isAuthenticated}
	{#if children}
		{@render children()}
	{/if}
{:else}
	{#if fallback}
		{@render fallback()}
	{:else}
		<div class="redirect-state">
			<div class="spinner"></div>
			<p class="redirect-text">Redirecting to login...</p>
		</div>
	{/if}
{/if}

<style>
	.loading-state,
	.redirect-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-2xl);
		gap: var(--space-md);
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--color-border-default);
		border-top-color: var(--color-fg-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-text,
	.redirect-text {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin: 0;
	}
</style>
