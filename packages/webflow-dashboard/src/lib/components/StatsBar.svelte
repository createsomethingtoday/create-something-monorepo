<script lang="ts">
	/**
	 * StatsBar - Tufte-inspired high-density metrics display
	 *
	 * Shows key metrics in a compact horizontal bar with real sparkline trends.
	 * Maximizes data-ink ratio by eliminating decorative elements.
	 * 
	 * Sparklines show real data from /api/analytics/history when available,
	 * gracefully showing no sparklines if history not yet collected.
	 */
	import { onMount } from 'svelte';
	import Sparkline from './Sparkline.svelte';
	import { LayoutGrid, Eye, ShoppingCart, DollarSign, TrendingUp } from 'lucide-svelte';
	import type { Asset } from '$lib/server/airtable';

	interface Props {
		assets: Asset[];
	}

	let { assets }: Props = $props();

	// Real historical trend data (fetched from API)
	let viewersTrend = $state<number[]>([]);
	let revenueTrend = $state<number[]>([]);
	let historyLoaded = $state(false);

	// Type for aggregate history API response
	interface AggregateHistoryResponse {
		snapshots: Array<{
			total_viewers: number;
			total_revenue: number;
		}>;
		days_available: number;
	}

	// Fetch aggregate historical data on mount
	onMount(async () => {
		try {
			const response = await fetch('/api/analytics/history?days=14');
			if (response.ok) {
				const data: AggregateHistoryResponse = await response.json();
				if (data.snapshots && data.snapshots.length > 0) {
					// Extract trend arrays from snapshots (already in chronological order)
					viewersTrend = data.snapshots.map((s) => s.total_viewers);
					revenueTrend = data.snapshots.map((s) => s.total_revenue);
				}
			}
		} catch (err) {
			console.warn('Failed to fetch aggregate analytics history:', err);
		}
		historyLoaded = true;
	});

	// Calculate core metrics
	const metrics = $derived(() => {
		const published = assets.filter((a) => a.status === 'Published');
		const pending = assets.filter((a) => ['Upcoming', 'Scheduled'].includes(a.status));

		let totalViewers = 0;
		let totalPurchases = 0;
		let totalRevenue = 0;

		for (const asset of published) {
			totalViewers += asset.uniqueViewers || 0;
			totalPurchases += asset.cumulativePurchases || 0;
			totalRevenue += asset.cumulativeRevenue || 0;
		}

		// Conversion rate (viewers → purchases)
		const conversionRate = totalViewers > 0 ? (totalPurchases / totalViewers) * 100 : 0;

		// Average revenue per template
		const avgRevenue = published.length > 0 ? totalRevenue / published.length : 0;

		return {
			publishedCount: published.length,
			pendingCount: pending.length,
			totalCount: assets.length,
			totalViewers,
			totalPurchases,
			totalRevenue,
			conversionRate,
			avgRevenue
		};
	});

	function formatNumber(n: number): string {
		if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
		if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
		return n.toLocaleString();
	}

	function formatCurrency(n: number): string {
		if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
		if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
		return `$${n.toLocaleString()}`;
	}
</script>

<div class="stats-bar">
	<div class="stat-group templates">
		<LayoutGrid size={14} class="stat-icon" />
		<span class="stat-main">{metrics().publishedCount}</span>
		<span class="stat-label">published</span>
		{#if metrics().pendingCount > 0}
			<span class="stat-secondary">+{metrics().pendingCount} pending</span>
		{/if}
	</div>

	<div class="stat-divider"></div>

	<div class="stat-group viewers">
		<Eye size={14} class="stat-icon" />
		<span class="stat-main">{formatNumber(metrics().totalViewers)}</span>
		<span class="stat-label">viewers</span>
		{#if historyLoaded && viewersTrend.length >= 2}
			<Sparkline data={viewersTrend} color="var(--color-info)" showTrend />
		{/if}
	</div>

	<div class="stat-divider"></div>

	<div class="stat-group purchases">
		<ShoppingCart size={14} class="stat-icon" />
		<span class="stat-main">{formatNumber(metrics().totalPurchases)}</span>
		<span class="stat-label">purchases</span>
		<span class="stat-secondary conversion">
			{metrics().conversionRate.toFixed(1)}% conv
		</span>
	</div>

	<div class="stat-divider"></div>

	<div class="stat-group revenue">
		<DollarSign size={14} class="stat-icon" />
		<span class="stat-main">{formatCurrency(metrics().totalRevenue)}</span>
		<span class="stat-label">revenue</span>
		{#if historyLoaded && revenueTrend.length >= 2}
			<Sparkline data={revenueTrend} color="var(--color-success)" showTrend filled />
		{/if}
	</div>

	{#if metrics().avgRevenue > 0}
		<div class="stat-divider"></div>
		<div class="stat-group avg">
			<TrendingUp size={14} class="stat-icon" />
			<span class="stat-main">{formatCurrency(metrics().avgRevenue)}</span>
			<span class="stat-label">avg/template</span>
		</div>
	{/if}
</div>

<style>
	.stats-bar {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow-x: auto;
	}

	.stat-group {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	.stat-group :global(.stat-icon) {
		color: var(--color-fg-muted);
		flex-shrink: 0;
	}

	.stat-main {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.stat-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.stat-secondary {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	.stat-secondary.conversion {
		padding: 0.125rem 0.375rem;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		font-variant-numeric: tabular-nums;
	}

	.stat-divider {
		width: 1px;
		height: 1.5rem;
		background: var(--color-border-default);
		flex-shrink: 0;
	}

	.stat-group.templates :global(.stat-icon),
	.stat-group.templates .stat-main {
		color: var(--color-success);
	}

	.stat-group.viewers :global(.stat-icon) {
		color: var(--color-info);
	}

	.stat-group.purchases :global(.stat-icon) {
		color: var(--color-warning);
	}

	.stat-group.revenue :global(.stat-icon),
	.stat-group.revenue .stat-main {
		color: var(--color-data-3);
	}

	.stat-group.avg {
		opacity: 0.8;
	}

	.stat-group.avg :global(.stat-icon) {
		color: var(--color-fg-tertiary);
	}

	@media (max-width: 768px) {
		.stats-bar {
			flex-wrap: wrap;
			gap: var(--space-sm);
		}

		.stat-divider {
			display: none;
		}

		.stat-group {
			min-width: calc(50% - var(--space-sm));
		}
	}
</style>
