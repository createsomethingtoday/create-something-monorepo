<script lang="ts">
	import { page } from '$app/stores';
	import SEOHead from '$lib/components/SEOHead.svelte';
</script>

<SEOHead title="Error {$page.status}" noindex={true} />

<div class="error-page">
	<div class="container">
		<div class="error-content">
			<span class="error-code">{$page.status}</span>
			<h1 class="error-title">
				{#if $page.status === 404}
					Page Not Found
				{:else if $page.status === 500}
					Server Error
				{:else}
					Something Went Wrong
				{/if}
			</h1>
			<p class="error-message">
				{#if $page.status === 404}
					This page doesn't exist.
				{:else}
					{$page.error?.message || 'Something broke.'}
				{/if}
			</p>
			<div class="error-actions">
				<a href="/" class="cta-primary">Home</a>
				<a href="/projects" class="cta-secondary">Projects</a>
			</div>
		</div>
	</div>
</div>

<style>
	.error-page {
		min-height: 80vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 600px;
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	.error-content {
		text-align: center;
	}

	.error-code {
		display: block;
		font-size: var(--text-display-xl);
		font-weight: 200;
		color: var(--color-fg-muted);
		line-height: 1;
		margin-bottom: var(--space-md);
	}

	.error-title {
		font-size: var(--text-h1);
		font-weight: 300;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.error-message {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xl);
		line-height: 1.6;
	}

	.error-actions {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
		flex-wrap: wrap;
	}

	.cta-primary {
		display: inline-block;
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		text-decoration: none;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.cta-primary:hover {
		opacity: 0.9;
	}

	.cta-secondary {
		display: inline-block;
		padding: var(--space-sm) var(--space-lg);
		background: transparent;
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.cta-secondary:hover {
		background: var(--color-hover);
	}
</style>
