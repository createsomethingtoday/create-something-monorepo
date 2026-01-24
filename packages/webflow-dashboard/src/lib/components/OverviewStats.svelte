<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { Card, CardHeader, CardTitle, CardContent } from './ui';
	import StatusBadge from './StatusBadge.svelte';
	import KineticNumber from './KineticNumber.svelte';
	import DataFreshnessIndicator from './DataFreshnessIndicator.svelte';
	import type { Asset } from '$lib/server/airtable';
	import { Eye, ShoppingBag, DollarSign } from 'lucide-svelte';

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
		Upcoming: 'var(--color-data-3)',
		Delisted: 'var(--color-warning)',
		Rejected: 'var(--color-error)'
	};
</script>

<div class="overview-stats">
	<!-- Performance Summary -->
	{#if totals().viewers > 0 || totals().purchases > 0 || totals().revenue > 0}
		<div in:fade={{ duration: 300, delay: 0 }}>
			<Card>
				<CardHeader>
					<div class="header-with-indicator">
						<CardTitle>Performance Summary</CardTitle>
						<DataFreshnessIndicator variant="inline" />
					</div>
				</CardHeader>
				<CardContent>
				<div class="performance-grid">
					<div class="performance-item" in:fly={{ y: 20, duration: 400, delay: 100 }}>
						<div class="performance-icon viewers">
							<Eye size={24} />
						</div>
						<div class="performance-content">
							<span class="performance-value"><KineticNumber value={totals().viewers} /></span>
							<span class="performance-label">Total Viewers</span>
						</div>
					</div>

					<div class="performance-item" in:fly={{ y: 20, duration: 400, delay: 200 }}>
						<div class="performance-icon purchases">
							<ShoppingBag size={24} />
						</div>
						<div class="performance-content">
							<span class="performance-value"><KineticNumber value={totals().purchases} /></span>
							<span class="performance-label">Total Purchases</span>
						</div>
					</div>

					<div class="performance-item" in:fly={{ y: 20, duration: 400, delay: 300 }}>
						<div class="performance-icon revenue">
							<DollarSign size={24} />
						</div>
						<div class="performance-content">
							<span class="performance-value"><KineticNumber value={totals().revenue} prefix="$" /></span>
							<span class="performance-label">Total Revenue</span>
						</div>
					</div>
				</div>
				</CardContent>
			</Card>
		</div>
	{/if}

	<!-- Status Distribution -->
	{#if sortedStatuses().length > 0}
		<div in:fade={{ duration: 300, delay: 400 }}>
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
		</div>
	{/if}
</div>

<style>
	.overview-stats {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.header-with-indicator {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		width: 100%;
	}

	.performance-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: var(--space-md);
	}

	/* Highlight grid pattern: siblings dim on hover */
	.performance-grid:hover .performance-item:not(:hover) {
		opacity: 0.5;
	}

	.performance-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.performance-item:hover {
		background: var(--color-hover);
		transform: scale(1.02);
		border: 1px solid var(--color-border-emphasis);
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
		background: var(--color-data-3-muted);
		color: var(--color-data-3);
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
		transition: all var(--duration-standard) var(--ease-standard);
		animation: progressFill 1s var(--ease-standard);
	}

	@keyframes progressFill {
		from {
			width: 0;
		}
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

	@media (prefers-reduced-motion: reduce) {
		.performance-item,
		.distribution-fill {
			transition: none;
			animation: none;
		}

		.performance-item:hover {
			transform: none;
		}

		/* Keep opacity transitions for reduced motion users - they're subtle */
		.performance-grid:hover .performance-item:not(:hover) {
			opacity: 0.8;
		}
	}
</style>
