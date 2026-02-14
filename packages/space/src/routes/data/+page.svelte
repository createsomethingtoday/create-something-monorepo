<script lang="ts">
	import { SEO } from '@create-something/canon';

	const datasets = [
		{
			name: 'NBA Live',
			href: '/data/nba',
			description: 'Real-time NBA game data with play-by-play, box scores, shot networks, and pace analysis. Powered by NBA proxy worker with rate limiting and caching.',
			status: 'live'
		}
	];
</script>

<SEO
	title="Data Studio"
	description="Live data dashboards with real-time updates. Explore NBA analytics, player synergies, and league insights."
	keywords="data studio, live dashboards, NBA analytics, real-time data, Cloudflare Workers"
	propertyName="space"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.space' },
		{ name: 'Data Studio', url: 'https://createsomething.space/data' }
	]}
/>

<section class="page">
	<div class="container shell-inner">
		<h1 class="title">Data Studio</h1>
		<p class="subtitle">
			Live data dashboards with real-time updates, caching, and historical snapshots.
		</p>

		<div class="datasets">
			{#each datasets as dataset}
				<a href={dataset.href} class="dataset-card">
					<div class="dataset-header">
						<h2 class="dataset-name">{dataset.name}</h2>
						<span class="dataset-status">{dataset.status}</span>
					</div>
					<p class="dataset-description">{dataset.description}</p>
					<div class="dataset-arrow">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
					</div>
				</a>
			{/each}
		</div>
	</div>
</section>

<style>
	.page {
		padding: 6rem 1.5rem 4rem;
	}

	.container {
		margin: 0 auto;
	}

	.title {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-xl);
	}

	.datasets {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.dataset-card {
		display: block;
		padding: var(--space-lg);
		background-color: var(--glass-bg-light);
		backdrop-filter: blur(var(--glass-blur-md)) var(--glass-saturate-md);
		border: 1px solid var(--glass-border-light);
		border-radius: var(--radius-lg);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.dataset-card:hover {
		background-color: var(--glass-bg-medium);
		border-color: var(--glass-border-medium);
		box-shadow: var(--glass-shadow-sm);
		transform: translateY(-2px);
	}

	.dataset-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-xs);
	}

	.dataset-name {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.dataset-status {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-elevated);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-full);
	}

	.dataset-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-sm);
	}

	.dataset-arrow {
		color: var(--color-fg-subtle);
		display: flex;
		justify-content: flex-end;
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.dataset-card:hover .dataset-arrow {
		color: var(--color-fg-tertiary);
		transform: translateX(4px);
	}
</style>
