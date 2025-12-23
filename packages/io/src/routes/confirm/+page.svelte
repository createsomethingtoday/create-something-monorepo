<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Confirm Subscription | CREATE SOMETHING</title>
	<meta name="description" content="Confirm your newsletter subscription to CREATE SOMETHING." />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="confirm-container">
	<div class="confirm-card">
		{#if data.success}
			<div class="icon success-icon">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
					<polyline points="22 4 12 14.01 9 11.01"></polyline>
				</svg>
			</div>
			<h1 class="title">{data.alreadyConfirmed ? 'Already Confirmed' : 'Subscription Confirmed'}</h1>
			<p class="message">{data.message}</p>
			{#if data.email}
				<p class="email">{data.email}</p>
			{/if}
			<a href="/" class="cta">Explore CREATE SOMETHING</a>
		{:else}
			<div class="icon error-icon">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"></circle>
					<line x1="15" y1="9" x2="9" y2="15"></line>
					<line x1="9" y1="9" x2="15" y2="15"></line>
				</svg>
			</div>
			<h1 class="title">Confirmation Failed</h1>
			<p class="message">{data.message}</p>
			<a href="/" class="cta secondary">Return Home</a>
		{/if}
	</div>
</div>

<style>
	.confirm-container {
		min-height: calc(100vh - 200px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.confirm-card {
		max-width: 480px;
		text-align: center;
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.icon {
		margin-bottom: var(--space-md);
	}

	.success-icon {
		color: var(--color-success);
	}

	.error-icon {
		color: var(--color-error);
	}

	.title {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.message {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.email {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
		margin-bottom: var(--space-md);
	}

	.cta {
		display: inline-block;
		margin-top: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		text-decoration: none;
		font-weight: 500;
		border-radius: var(--radius-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.cta:hover {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.cta.secondary {
		background: var(--color-bg-subtle);
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
	}

	.cta.secondary:hover {
		background: var(--color-hover);
	}
</style>
