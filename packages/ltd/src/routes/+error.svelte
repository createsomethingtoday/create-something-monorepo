<script lang="ts">
	/**
	 * Error Page for CREATE SOMETHING .ltd
	 *
	 * Canonical error styling following the design system.
	 * "Weniger, aber besser"
	 */

	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>{$page.status} — CREATE SOMETHING.ltd</title>
</svelte:head>

<div class="error-page">
	<div class="error-content">
		<h1 class="error-code">{$page.status}</h1>
		<p class="error-message">
			{#if $page.status === 404}
				Page not found
			{:else if $page.status === 503}
				Service unavailable
			{:else}
				{$page.error?.message || 'Something went wrong'}
			{/if}
		</p>
		<a href="/" class="error-link">Return to Canon</a>
	</div>
</div>

<style>
	.error-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-pure, #000000);
		padding: var(--space-xl, 3rem);
	}

	.error-content {
		text-align: center;
	}

	.error-code {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: clamp(6rem, 20vw, 12rem);
		font-weight: 200;
		color: var(--color-fg-primary, #ffffff);
		line-height: 1;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.error-message {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 0.875rem;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		margin: var(--space-md, 1.5rem) 0 var(--space-xl, 3rem);
		letter-spacing: 0.02em;
	}

	.error-link {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 0.75rem;
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		text-decoration: none;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: var(--space-sm, 1rem) var(--space-md, 1.5rem);
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: border-color 0.2s ease;
	}

	.error-link:hover {
		border-color: rgba(255, 255, 255, 0.3);
	}
</style>
