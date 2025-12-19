<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Card, CardContent } from '$lib/components/ui';
	import { TrendingUp, TrendingDown, Minus } from 'lucide-svelte';

	type Trend = 'up' | 'down' | 'neutral';

	interface Props {
		title: string;
		value: string | number;
		subtitle?: string;
		trend?: Trend;
		trendValue?: string;
		icon?: Snippet;
	}

	let { title, value, subtitle, trend, trendValue, icon }: Props = $props();

	const trendConfig = {
		up: { icon: TrendingUp, class: 'trend-up' },
		down: { icon: TrendingDown, class: 'trend-down' },
		neutral: { icon: Minus, class: 'trend-neutral' }
	};
</script>

<Card>
	<CardContent>
		<div class="metric-card">
			<div class="header">
				<span class="title">{title}</span>
				{#if icon}
					<span class="icon">
						{@render icon()}
					</span>
				{/if}
			</div>

			<div class="value">{value}</div>

			{#if subtitle || (trend && trendValue)}
				<div class="footer">
					{#if trend && trendValue}
						<span class="trend {trendConfig[trend].class}">
							<svelte:component this={trendConfig[trend].icon} size={14} />
							{trendValue}
						</span>
					{/if}
					{#if subtitle}
						<span class="subtitle">{subtitle}</span>
					{/if}
				</div>
			{/if}
		</div>
	</CardContent>
</Card>

<style>
	.metric-card {
		padding: 0.5rem 0;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.title {
		font-size: 0.875rem;
		color: var(--webflow-fg-secondary);
	}

	.icon {
		display: flex;
		color: var(--webflow-fg-muted);
	}

	.icon :global(svg) {
		width: 1.25rem;
		height: 1.25rem;
	}

	.value {
		font-family: var(--webflow-font-medium);
		font-size: 2rem;
		font-weight: 600;
		color: var(--webflow-fg-primary);
		line-height: 1.2;
	}

	.footer {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.trend {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.trend-up {
		color: var(--webflow-success);
	}

	.trend-down {
		color: var(--webflow-error);
	}

	.trend-neutral {
		color: var(--webflow-fg-muted);
	}

	.subtitle {
		font-size: 0.75rem;
		color: var(--webflow-fg-muted);
	}
</style>
