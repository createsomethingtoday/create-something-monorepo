<script lang="ts">
	import WebflowLogo from '$lib/components/WebflowLogo.svelte';

	const loadingPhrases = [
		'Preparing your dashboard...',
		'Syncing session details...',
		'Redirecting you now...'
	];
</script>

<svelte:head>
	<title>Dashboard | Webflow Asset Dashboard</title>
</svelte:head>

<main class="container">
	<div class="brand-mark" aria-hidden="true">
		<WebflowLogo width={72} height={44} />
	</div>
	<h1>Webflow Asset Dashboard</h1>
	<p class="subtitle" aria-live="polite">Connecting your workspace</p>
	<ul class="loading-steps" aria-hidden="true">
		{#each loadingPhrases as phrase}
			<li>{phrase}</li>
		{/each}
	</ul>
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

	.loading-steps {
		list-style: none;
		padding: 0;
		margin: var(--space-sm) 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.loading-steps li {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		text-align: center;
		animation: pulse 1.4s ease-in-out infinite;
	}

	.loading-steps li:nth-child(2) {
		animation-delay: 0.2s;
	}

	.loading-steps li:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.5;
		}
		50% {
			opacity: 1;
		}
	}
</style>
