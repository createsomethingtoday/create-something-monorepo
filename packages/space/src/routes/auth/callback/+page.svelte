<script lang="ts">
	// This page should redirect immediately via +page.server.ts
	// This component only shows briefly during loading
</script>

<svelte:head>
	<title>Verifying... | CREATE SOMETHING SPACE</title>
</svelte:head>

<div class="callback-container">
	<div class="callback-card">
		<div class="spinner"></div>
		<p>Verifying your login...</p>
	</div>
</div>

<style>
	.callback-container {
		min-height: calc(100vh - 72px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.callback-card {
		text-align: center;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
	}

	.callback-card p {
		margin: var(--space-md) 0 0;
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--color-border-default);
		border-top-color: var(--color-fg-primary);
		border-radius: 50%;
		margin: 0 auto;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
			border-top-color: var(--color-fg-primary);
			border-right-color: var(--color-fg-primary);
		}
	}
</style>
