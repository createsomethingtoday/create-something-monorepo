<script lang="ts">
	/**
	 * AnalyticsCard - Detailed performance metrics and conversion funnel
	 * 
	 * Shows expanded analytics for published templates:
	 * - Key metrics with trends
	 * - Conversion funnel visualization
	 * - Derived insights
	 */
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

	// Simulated trend data (would come from historical API in production)
	const viewersTrend = $derived(() => {
		if (!asset.uniqueViewers) return [];
		const base = asset.uniqueViewers / 4;
		return [base * 0.7, base * 0.85, base * 0.95, base];
	});

	const revenueTrend = $derived(() => {
		if (!asset.cumulativeRevenue) return [];
		const base = asset.cumulativeRevenue / 4;
		return [base * 0.6, base * 0.8, base * 0.9, base];
	});

	const purchasesTrend = $derived(() => {
		if (!asset.cumulativePurchases) return [];
		const base = asset.cumulativePurchases / 4;
		return [base * 0.65, base * 0.75, base * 0.9, base];
	});

	// Funnel stages (simulated - in production would come from real data)
	const funnelStages = $derived(() => {
		const views = asset.uniqueViewers || 0;
		// Simulated funnel drop-offs based on industry averages
		const detailViews = Math.round(views * 0.5); // 50% view details
		const addToCart = Math.round(views * 0.15); // 15% add to cart
		const purchases = asset.cumulativePurchases || 0;

		return [
			{ label: 'Views', value: views, percent: 100, color: 'var(--color-info)' },
			{ label: 'Detail Views', value: detailViews, percent: views > 0 ? (detailViews / views) * 100 : 0, color: 'var(--color-warning)' },
			{ label: 'Add to Cart', value: addToCart, percent: views > 0 ? (addToCart / views) * 100 : 0, color: 'var(--color-accent)' },
			{ label: 'Purchases', value: purchases, percent: views > 0 ? (purchases / views) * 100 : 0, color: 'var(--color-success)' }
		];
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
						{#if viewersTrend().length > 0}
							<div class="metric-trend">
								<Sparkline data={viewersTrend()} color="var(--color-info)" height={24} />
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
						{#if purchasesTrend().length > 0}
							<div class="metric-trend">
								<Sparkline data={purchasesTrend()} color="var(--color-warning)" height={24} />
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
						{#if revenueTrend().length > 0}
							<div class="metric-trend">
								<Sparkline data={revenueTrend()} color="var(--color-success)" filled height={24} />
							</div>
						{/if}
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Conversion Funnel -->
		<Card>
			<CardHeader>
				<CardTitle>Conversion Funnel</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="funnel">
					{#each funnelStages() as stage, index}
						<div class="funnel-stage">
							<div class="funnel-bar-container">
								<div 
									class="funnel-bar" 
									style="width: {stage.percent}%; background: {stage.color}"
								></div>
							</div>
							<div class="funnel-info">
								<span class="funnel-label">{stage.label}</span>
								<span class="funnel-value">{formatNumber(stage.value)}</span>
								<span class="funnel-percent">({formatPercent(stage.percent)})</span>
							</div>
						</div>
					{/each}
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
									{#if asset.qualityScore.includes('Good') || asset.qualityScore.includes('✅')}
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
	}

	/* Funnel */
	.funnel {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.funnel-stage {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.funnel-bar-container {
		height: 24px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.funnel-bar {
		height: 100%;
		border-radius: var(--radius-sm);
		transition: width var(--duration-smooth) var(--ease-standard);
	}

	.funnel-info {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.funnel-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		min-width: 100px;
	}

	.funnel-value {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.funnel-percent {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
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
