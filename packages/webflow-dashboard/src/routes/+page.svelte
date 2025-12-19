<script lang="ts">
	// Placeholder - will be replaced with dashboard or redirect to login
</script>

<svelte:head>
	<title>Dashboard | Webflow Asset Dashboard</title>
</svelte:head>

<main class="container">
	<h1>Webflow Asset Dashboard</h1>
	<p class="subtitle">Loading...</p>
</main>

<style>
	.container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	h1 {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-top: var(--space-sm);
	}
</style>
