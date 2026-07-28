<script lang="ts">
	import WebflowLogo from '$lib/components/WebflowLogo.svelte';
</script>

<svelte:head>
	<title>Dashboard | Webflow Asset Dashboard</title>
</svelte:head>

<main class="container">
	<div class="brand-mark" aria-hidden="true">
		<WebflowLogo width={72} height={44} />
	</div>
	<h1>Webflow Asset Dashboard</h1>
	<p class="subtitle" role="status">Connecting your workspace…</p>
</main>

<style>
	.container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		padding: var(--space-lg);
		background: var(--color-bg-pure);
	}

	.brand-mark {
		display: grid;
		place-items: center;
		padding: 0.25rem 0;
	}

	h1 {
		font-family: var(--font-heading);
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		letter-spacing: 0.01em;
		color: var(--color-fg-primary);
		margin: 0;
		text-align: center;
	}

	.subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
	}
</style>
