<script lang="ts">
	/**
	 * StatsCard Component
	 *
	 * Dashboard-style card for displaying metrics
	 */
	import Card from './Card.svelte';
	import { TrendingUp, TrendingDown, Minus } from 'lucide-svelte';

	interface Props {
		title: string;
		value: string | number;
		change?: number;
		changeLabel?: string;
		href?: string;
	}

	let { title, value, change, changeLabel, href }: Props = $props();

	const trend = $derived(
		change === undefined ? 'neutral' : change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
	);
</script>

<Card {title} {href} variant="default" size="md" class="stats-card">
	<div class="stats-content">
		<span class="stats-value">{value}</span>
		
		{#if change !== undefined}
			<div class="stats-change trend-{trend}">
				{#if trend === 'up'}
					<TrendingUp size={14} />
				{:else if trend === 'down'}
					<TrendingDown size={14} />
				{:else}
					<Minus size={14} />
				{/if}
				<span>{change > 0 ? '+' : ''}{change}%</span>
				{#if changeLabel}
					<span class="change-label">{changeLabel}</span>
				{/if}
			</div>
		{/if}
	</div>
</Card>

<style>
	.stats-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.stats-value {
		font-size: var(--text-display);
		font-weight: 800;
		color: var(--color-fg-primary);
		line-height: 1;
	}

	.stats-change {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: var(--text-body-sm);
		font-weight: 500;
	}

	.trend-up {
		color: var(--color-success);
	}

	.trend-down {
		color: var(--color-error);
	}

	.trend-neutral {
		color: var(--color-fg-muted);
	}

	.change-label {
		color: var(--color-fg-subtle);
		font-weight: 400;
	}
</style>
