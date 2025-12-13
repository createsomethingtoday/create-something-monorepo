<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="error-page">
	<div class="error-content">
		<span class="error-code">{$page.status}</span>
		<h1 class="error-title">
			{#if $page.status === 404}
				Page Not Found
			{:else}
				Something went wrong
			{/if}
		</h1>
		<p class="error-description">
			{#if $page.status === 404}
				The page you're looking for doesn't exist or has been moved.
			{:else}
				{$page.error?.message || 'An unexpected error occurred.'}
			{/if}
		</p>
		<a href="/" class="error-link">
			<span>Return Home</span>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M5 12h14M12 5l7 7-7 7"/>
			</svg>
		</a>
	</div>
</div>

<style>
	.error-page {
		min-height: calc(100vh - 200px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-2xl) var(--gutter);
		text-align: center;
	}

	.error-content {
		max-width: 500px;
	}

	.error-code {
		display: block;
		font-size: var(--text-display-xl);
		font-weight: 200;
		letter-spacing: var(--tracking-tight);
		color: var(--color-fg-subtle);
		line-height: 1;
		margin-bottom: var(--space-md);
	}

	.error-title {
		font-size: var(--text-h1);
		font-weight: 300;
		margin-bottom: var(--space-sm);
	}

	.error-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-lg);
	}

	.error-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		padding: var(--space-sm) var(--space-md);
		border: 1px solid var(--color-border-default);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.error-link:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}
</style>
