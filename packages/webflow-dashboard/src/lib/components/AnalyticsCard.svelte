<script lang="ts">
	/**
	 * AnalyticsCard - Detailed performance metrics with real historical trends
	 * 
	 * Shows expanded analytics for published templates:
	 * - Key metrics with real sparkline trends (from D1 history)
	 * - Derived insights
	 * 
	 * Sparklines show real data from /api/assets/:id/history when available,
	 * gracefully falls back to no sparklines if history not yet collected.
	 */
	import { onMount } from 'svelte';
	import type { Asset } from '$lib/server/airtable';
	import { Card, CardHeader, CardTitle, CardContent } from './ui';
	import Sparkline from './Sparkline.svelte';
	import KineticNumber from './KineticNumber.svelte';
	import {
		Users,
		ShoppingCart,
		DollarSign,
		TrendingUp,
		TrendingDown,
		Percent,
		Eye,
		MousePointer,
		Target
	} from 'lucide-svelte';

	interface Props {
		asset: Asset;
	}

	let { asset }: Props = $props();

	// Historical trend data (fetched from API)
	let viewersTrend = $state<number[]>([]);
	let purchasesTrend = $state<number[]>([]);
	let revenueTrend = $state<number[]>([]);
	let historyLoaded = $state(false);
	let daysOfHistory = $state(0);

	// Type for history API response
	interface HistoryResponse {
		snapshots: Array<{
			unique_viewers: number;
			cumulative_purchases: number;
			cumulative_revenue: number;
		}>;
		days_available: number;
	}

	// Fetch historical data on mount
	onMount(async () => {
		try {
			const response = await fetch(`/api/assets/${asset.id}/history?days=14`);
			if (response.ok) {
				const data: HistoryResponse = await response.json();
				if (data.snapshots && data.snapshots.length > 0) {
					// Extract trend arrays from snapshots (already in chronological order)
					viewersTrend = data.snapshots.map((s) => s.unique_viewers);
					purchasesTrend = data.snapshots.map((s) => s.cumulative_purchases);
					revenueTrend = data.snapshots.map((s) => s.cumulative_revenue);
					daysOfHistory = data.days_available;
				}
			}
		} catch (err) {
			console.warn('Failed to fetch analytics history:', err);
		}
		historyLoaded = true;
	});

	// Format numbers
	function formatNumber(num?: number): string {
		if (num === undefined || num === null) return '0';
		return num.toLocaleString();
	}

	function formatCurrency(num?: number): string {
		if (num === undefined || num === null) return '$0';
		return `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
	}

	function formatPercent(num?: number): string {
		if (num === undefined || num === null) return '0%';
		return `${num.toFixed(1)}%`;
	}

	// Calculate derived metrics
	const conversionRate = $derived(() => {
		if (!asset.uniqueViewers || asset.uniqueViewers === 0) return 0;
		return ((asset.cumulativePurchases || 0) / asset.uniqueViewers) * 100;
	});

	const avgOrderValue = $derived(() => {
		if (!asset.cumulativePurchases || asset.cumulativePurchases === 0) return 0;
		return (asset.cumulativeRevenue || 0) / asset.cumulativePurchases;
	});

	const revenuePerViewer = $derived(() => {
		if (!asset.uniqueViewers || asset.uniqueViewers === 0) return 0;
		return (asset.cumulativeRevenue || 0) / asset.uniqueViewers;
	});

	// Check if we have data to show
	const hasData = $derived(
		(asset.uniqueViewers && asset.uniqueViewers > 0) ||
		(asset.cumulativePurchases && asset.cumulativePurchases > 0) ||
		(asset.cumulativeRevenue && asset.cumulativeRevenue > 0)
	);
</script>

<div class="analytics-container">
	{#if hasData}
		<!-- Key Metrics -->
		<Card>
			<CardHeader>
				<CardTitle>Performance Metrics</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="metrics-grid">
					<!-- Unique Viewers -->
					<div class="metric-card">
						<div class="metric-header">
							<Users size={18} class="metric-icon viewers" />
							<span class="metric-label">Unique Viewers</span>
						</div>
						<div class="metric-value">
							<KineticNumber value={asset.uniqueViewers || 0} />
						</div>
						{#if historyLoaded && viewersTrend.length >= 2}
							<div class="metric-trend">
								<Sparkline data={viewersTrend} color="var(--color-info)" height={24} />
								<span class="trend-days">{daysOfHistory}d trend</span>
							</div>
						{/if}
					</div>

					<!-- Purchases -->
					<div class="metric-card">
						<div class="metric-header">
							<ShoppingCart size={18} class="metric-icon purchases" />
							<span class="metric-label">Purchases</span>
						</div>
						<div class="metric-value">
							<KineticNumber value={asset.cumulativePurchases || 0} />
						</div>
						{#if historyLoaded && purchasesTrend.length >= 2}
							<div class="metric-trend">
								<Sparkline data={purchasesTrend} color="var(--color-warning)" height={24} />
								<span class="trend-days">{daysOfHistory}d trend</span>
							</div>
						{/if}
					</div>

					<!-- Revenue -->
					<div class="metric-card">
						<div class="metric-header">
							<DollarSign size={18} class="metric-icon revenue" />
							<span class="metric-label">Revenue</span>
						</div>
						<div class="metric-value">
							{formatCurrency(asset.cumulativeRevenue)}
						</div>
						{#if historyLoaded && revenueTrend.length >= 2}
							<div class="metric-trend">
								<Sparkline data={revenueTrend} color="var(--color-success)" filled height={24} />
								<span class="trend-days">{daysOfHistory}d trend</span>
							</div>
						{/if}
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Derived Insights -->
		<Card>
			<CardHeader>
				<CardTitle>Key Insights</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="insights-grid">
					<div class="insight">
						<div class="insight-icon">
							<Percent size={16} />
						</div>
						<div class="insight-content">
							<span class="insight-label">Conversion Rate</span>
							<span class="insight-value">{formatPercent(conversionRate())}</span>
							<span class="insight-description">
								{#if conversionRate() >= 5}
									<span class="insight-good">Excellent performance</span>
								{:else if conversionRate() >= 2}
									<span class="insight-ok">Good conversion</span>
								{:else}
									<span class="insight-low">Room for improvement</span>
								{/if}
							</span>
						</div>
					</div>

					<div class="insight">
						<div class="insight-icon">
							<Target size={16} />
						</div>
						<div class="insight-content">
							<span class="insight-label">Avg Order Value</span>
							<span class="insight-value">{formatCurrency(avgOrderValue())}</span>
							<span class="insight-description">Per purchase</span>
						</div>
					</div>

					<div class="insight">
						<div class="insight-icon">
							<TrendingUp size={16} />
						</div>
						<div class="insight-content">
							<span class="insight-label">Revenue per Viewer</span>
							<span class="insight-value">{formatCurrency(revenuePerViewer())}</span>
							<span class="insight-description">Lifetime value indicator</span>
						</div>
					</div>

					{#if asset.qualityScore}
						<div class="insight">
							<div class="insight-icon">
								<Eye size={16} />
							</div>
							<div class="insight-content">
								<span class="insight-label">Quality Score</span>
								<span class="insight-value">{asset.qualityScore}</span>
								<span class="insight-description">
									{#if String(asset.qualityScore).includes('Good') || String(asset.qualityScore).includes('✅')}
										<span class="insight-good">Meets standards</span>
									{:else}
										<span class="insight-ok">Review feedback</span>
									{/if}
								</span>
							</div>
						</div>
					{/if}
				</div>
			</CardContent>
		</Card>
	{:else}
		<!-- No Data State -->
		<Card>
			<CardContent>
				<div class="no-data">
					<div class="no-data-icon">
						<TrendingUp size={48} />
					</div>
					<h3 class="no-data-title">No Analytics Data Yet</h3>
					<p class="no-data-description">
						Analytics data will appear here once your template is published and starts receiving views.
					</p>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>

<style>
	.analytics-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	/* Metrics Grid */
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-md);
	}

	.metric-card {
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.metric-header {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	:global(.metric-icon) {
		flex-shrink: 0;
	}

	:global(.metric-icon.viewers) {
		color: var(--color-info);
	}

	:global(.metric-icon.purchases) {
		color: var(--color-warning);
	}

	:global(.metric-icon.revenue) {
		color: var(--color-success);
	}

	.metric-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.metric-value {
		font-size: var(--text-h3);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.metric-trend {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.trend-days {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		text-align: right;
	}

	/* Insights Grid */
	.insights-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	.insight {
		display: flex;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
	}

	.insight-icon {
		color: var(--color-fg-muted);
		margin-top: 2px;
	}

	.insight-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.insight-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.insight-value {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.insight-description {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	.insight-good {
		color: var(--color-success);
	}

	.insight-ok {
		color: var(--color-warning);
	}

	.insight-low {
		color: var(--color-fg-muted);
	}

	/* No Data State */
	.no-data {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-xl);
		text-align: center;
	}

	.no-data-icon {
		color: var(--color-fg-muted);
		margin-bottom: var(--space-md);
		opacity: 0.5;
	}

	.no-data-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.no-data-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		max-width: 300px;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}

		.insights-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
