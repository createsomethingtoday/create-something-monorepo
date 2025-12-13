<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>{$page.status} | CREATE SOMETHING.agency</title>
</svelte:head>

<div class="error-page">
	<div class="error-container">
		<!-- Error Code -->
		<h1 class="error-code">{$page.status}</h1>

		<!-- Error Message -->
		<h2 class="error-message">
			{$page.error?.message || 'Not Found'}
		</h2>

		<!-- Description -->
		<p class="error-description">
			{#if $page.status === 404}
				The page you're looking for doesn't exist. Maybe it was moved, or maybe it never existed.
			{:else if $page.status === 500}
				Something went wrong on our end. We've been notified and are looking into it.
			{:else}
				An unexpected error occurred.
			{/if}
		</p>

		<!-- Action Buttons -->
		<div class="button-group">
			<a href="/" class="button-primary">
				Go Home
			</a>
			<a href="/services" class="button-secondary">
				View Services
			</a>
		</div>
	</div>
</div>

<style>
	.error-page {
		min-height: 100vh;
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 var(--space-md);
	}

	.error-container {
		max-width: 48rem;
		width: 100%;
		text-align: center;
	}

	.error-code {
		font-size: clamp(5rem, 10vw, 8rem);
		font-weight: 700;
		margin-bottom: var(--space-sm);
		color: var(--color-fg-secondary);
	}

	.error-message {
		font-size: var(--text-h2);
		font-weight: 500;
		margin-bottom: var(--space-md);
		color: var(--color-fg-secondary);
	}

	.error-description {
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-xl);
		max-width: 32rem;
		margin-left: auto;
		margin-right: auto;
	}

	.button-group {
		display: flex;
		gap: var(--space-sm);
		justify-content: center;
	}

	.button-primary {
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-weight: 600;
		border-radius: var(--radius-full);
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.button-primary:hover {
		opacity: 0.9;
	}

	.button-secondary {
		padding: var(--space-sm) var(--space-lg);
		background: transparent;
		border: 1px solid var(--color-border-emphasis);
		color: var(--color-fg-primary);
		font-weight: 600;
		border-radius: var(--radius-full);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.button-secondary:hover {
		background: var(--color-hover);
	}
</style>
