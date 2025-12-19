<script lang="ts">
	import { Card, CardHeader, CardTitle, CardContent } from './ui';
	import StatusBadge from './StatusBadge.svelte';
	import type { Asset } from '$lib/server/airtable';

	interface Props {
		assets: Asset[];
	}

	let { assets }: Props = $props();

	// Calculate stats by status
	const statusBreakdown = $derived(() => {
		const breakdown: Record<string, { count: number; viewers: number; purchases: number; revenue: number }> = {};

		for (const asset of assets) {
			const status = asset.status;
			if (!breakdown[status]) {
				breakdown[status] = { count: 0, viewers: 0, purchases: 0, revenue: 0 };
			}
			breakdown[status].count++;
			breakdown[status].viewers += asset.uniqueViewers || 0;
			breakdown[status].purchases += asset.cumulativePurchases || 0;
			breakdown[status].revenue += asset.cumulativeRevenue || 0;
		}

		return breakdown;
	});

	// Calculate totals
	const totals = $derived(() => {
		let viewers = 0;
		let purchases = 0;
		let revenue = 0;

		for (const asset of assets) {
			// Only count performance from Published and Delisted
			if (['Published', 'Delisted'].includes(asset.status)) {
				viewers += asset.uniqueViewers || 0;
				purchases += asset.cumulativePurchases || 0;
				revenue += asset.cumulativeRevenue || 0;
			}
		}

		return { viewers, purchases, revenue };
	});

	// Status order for display
	const statusOrder = ['Published', 'Scheduled', 'Upcoming', 'Delisted', 'Rejected'];

	const sortedStatuses = $derived(() => {
		return statusOrder.filter((status) => statusBreakdown()[status]?.count > 0);
	});

	// Calculate percentage for visual bar
	function getPercentage(count: number): number {
		const total = assets.length;
		if (total === 0) return 0;
		return Math.round((count / total) * 100);
	}

	// Status colors for the bar
	const statusColors: Record<string, string> = {
		Published: 'var(--color-success)',
		Scheduled: 'var(--color-info)',
		Upcoming: 'rgb(192, 132, 252)',
		Delisted: 'var(--color-warning)',
		Rejected: 'var(--color-error)'
	};
</script>

<div class="overview-stats">
	<!-- Performance Summary -->
	{#if totals().viewers > 0 || totals().purchases > 0 || totals().revenue > 0}
		<Card>
			<CardHeader>
				<CardTitle>Performance Summary</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="performance-grid">
					<div class="performance-item">
						<div class="performance-icon viewers">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								<path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
							</svg>
						</div>
						<div class="performance-content">
							<span class="performance-value">{totals().viewers.toLocaleString()}</span>
							<span class="performance-label">Total Viewers</span>
						</div>
					</div>

					<div class="performance-item">
						<div class="performance-icon purchases">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
							</svg>
						</div>
						<div class="performance-content">
							<span class="performance-value">{totals().purchases.toLocaleString()}</span>
							<span class="performance-label">Total Purchases</span>
						</div>
					</div>

					<div class="performance-item">
						<div class="performance-icon revenue">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
							</svg>
						</div>
						<div class="performance-content">
							<span class="performance-value">${totals().revenue.toLocaleString()}</span>
							<span class="performance-label">Total Revenue</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Status Distribution -->
	{#if sortedStatuses().length > 0}
		<Card>
			<CardHeader>
				<CardTitle>Status Distribution</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="distribution-list">
					{#each sortedStatuses() as status}
						{@const data = statusBreakdown()[status]}
						{@const percentage = getPercentage(data.count)}
						<div class="distribution-item">
							<div class="distribution-header">
								<div class="distribution-info">
									<StatusBadge {status} size="sm" />
									<span class="distribution-count">{data.count} template{data.count !== 1 ? 's' : ''}</span>
								</div>
								<span class="distribution-percentage">{percentage}%</span>
							</div>
							<div class="distribution-bar">
								<div
									class="distribution-fill"
									style="width: {percentage}%; background-color: {statusColors[status] || 'var(--color-fg-muted)'}"
								></div>
							</div>
						</div>
					{/each}
				</div>

				<div class="distribution-total">
					<span class="total-label">Total Assets</span>
					<span class="total-value">{assets.length}</span>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>

<style>
	.overview-stats {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.performance-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: var(--space-md);
	}

	.performance-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
	}

	.performance-icon {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
	}

	.performance-icon.viewers {
		background: var(--color-info-muted);
		color: var(--color-info);
	}

	.performance-icon.purchases {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.performance-icon.revenue {
		background: rgba(192, 132, 252, 0.2);
		color: rgb(192, 132, 252);
	}

	.performance-content {
		display: flex;
		flex-direction: column;
	}

	.performance-value {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.performance-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.distribution-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.distribution-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.distribution-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.distribution-info {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.distribution-count {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.distribution-percentage {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.distribution-bar {
		height: 0.375rem;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.distribution-fill {
		height: 100%;
		border-radius: var(--radius-full);
		transition: width var(--duration-standard) var(--ease-standard);
	}

	.distribution-total {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: var(--space-md);
		margin-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.total-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.total-value {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}
</style>
