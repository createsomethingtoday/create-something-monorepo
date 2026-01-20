<script lang="ts">
	import { Button, Card, CardContent, Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from './ui';
	import AssetTableRow from './AssetTableRow.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import type { Asset } from '$lib/server/airtable';
	import { BarChart3, Package, TrendingUp, CalendarClock, CheckCircle2, Rocket, AlertTriangle, XCircle } from 'lucide-svelte';
	import type { Component } from 'svelte';

	interface Props {
		assets: Asset[];
		searchTerm?: string;
		onView?: (id: string) => void;
		onEdit?: (id: string) => void;
		onArchive?: (id: string) => Promise<void>;
		onRefresh?: () => void;
	}

	let { assets, searchTerm = '', onView, onEdit, onArchive, onRefresh }: Props = $props();

	let showPerformance = $state(false);
	let expandedStatuses = $state<string[]>([]);
	let sortConfig = $state<{ key: string; direction: 'asc' | 'desc' }>({
		key: 'submittedDate',
		direction: 'desc'
	});

	// Status order for display
	const statusOrder = ['Scheduled', 'Published', 'Upcoming', 'Delisted', 'Rejected'];

	// Status icons and colors
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const statusConfig: Record<string, { icon: Component<any>; bgClass: string }> = {
		Scheduled: { icon: CalendarClock, bgClass: 'status-scheduled' },
		Published: { icon: CheckCircle2, bgClass: 'status-published' },
		Upcoming: { icon: Rocket, bgClass: 'status-upcoming' },
		Delisted: { icon: AlertTriangle, bgClass: 'status-delisted' },
		Rejected: { icon: XCircle, bgClass: 'status-rejected' }
	};

	// Filter assets by search term
	const filteredAssets = $derived.by(() => {
		if (!searchTerm.trim()) return assets;
		const term = searchTerm.toLowerCase();
		return assets.filter(
			(asset) =>
				asset.name.toLowerCase().includes(term) ||
				asset.type.toLowerCase().includes(term) ||
				asset.status.toLowerCase().includes(term)
		);
	});

	// Group assets by status
	const groupedAssets = $derived.by(() => {
		const groups: Record<string, Asset[]> = {};

		for (const asset of filteredAssets) {
			const status = asset.status;
			if (!groups[status]) {
				groups[status] = [];
			}
			groups[status].push(asset);
		}

		// Sort each group
		for (const status of Object.keys(groups)) {
			groups[status].sort((a, b) => {
				const aVal = a[sortConfig.key as keyof Asset];
				const bVal = b[sortConfig.key as keyof Asset];

				if (sortConfig.key === 'submittedDate' || sortConfig.key === 'publishedDate') {
					const dateA = aVal ? new Date(aVal as string).getTime() : 0;
					const dateB = bVal ? new Date(bVal as string).getTime() : 0;
					return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
				}

				if (typeof aVal === 'number' && typeof bVal === 'number') {
					return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
				}

				const strA = String(aVal || '');
				const strB = String(bVal || '');
				return sortConfig.direction === 'asc'
					? strA.localeCompare(strB)
					: strB.localeCompare(strA);
			});
		}

		return groups;
	});

	// Get sorted status keys
	const sortedStatuses = $derived.by(() => {
		return statusOrder.filter((status) => groupedAssets[status]?.length > 0);
	});

	function toggleStatus(status: string) {
		if (expandedStatuses.includes(status)) {
			expandedStatuses = expandedStatuses.filter((s) => s !== status);
		} else {
			expandedStatuses = [...expandedStatuses, status];
		}
	}

	function requestSort(key: string) {
		if (sortConfig.key === key) {
			sortConfig = { key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' };
		} else {
			sortConfig = { key, direction: 'desc' };
		}
	}

	function getSortIndicator(key: string): string {
		if (sortConfig.key !== key) return '';
		return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
	}

	function getVisibleAssets(status: string): Asset[] {
		const all = groupedAssets[status] || [];
		if (expandedStatuses.includes(status)) {
			return all;
		}
		return all.slice(0, 10);
	}

	function calculateTotals(assets: Asset[]): { viewers: number; purchases: number; revenue: number } {
		return assets.reduce(
			(acc, asset) => ({
				viewers: acc.viewers + (asset.uniqueViewers || 0),
				purchases: acc.purchases + (asset.cumulativePurchases || 0),
				revenue: acc.revenue + (asset.cumulativeRevenue || 0)
			}),
			{ viewers: 0, purchases: 0, revenue: 0 }
		);
	}
</script>

<div class="assets-display">
	<div class="section-header">
		<h2 class="section-title">Your Assets</h2>
	<Button
		variant={showPerformance ? 'default' : 'outline'}
		size="sm"
		onclick={() => (showPerformance = !showPerformance)}
	>
		<BarChart3 size={16} />
		{showPerformance ? 'Hide' : 'Show'} Performance
	</Button>
	</div>

	{#if sortedStatuses.length === 0}
		<Card>
			<CardContent>
				<div class="empty-state">
					<Package size={64} strokeWidth={1.5} />
					<h3>No assets found</h3>
					<p>
						{#if searchTerm}
							No assets match your search "{searchTerm}".
						{:else}
							Your published and pending templates will be displayed here.
						{/if}
					</p>
				</div>
			</CardContent>
		</Card>
	{:else}
		{#each sortedStatuses as status}
			{@const statusAssets = groupedAssets[status] || []}
			{@const visibleAssets = getVisibleAssets(status)}
			{@const config = statusConfig[status]}
			{@const showTotals = showPerformance && !['Upcoming', 'Rejected'].includes(status)}
			{@const totals = showTotals ? calculateTotals(visibleAssets) : null}

			<section class="status-section">
				<div class="status-header">
					<div class="status-info">
						<div class="status-icon {config?.bgClass || ''}">
							{#if config?.icon}
								<svelte:component this={config.icon} size={18} />
							{:else}
								<span>•</span>
							{/if}
						</div>
						<div class="status-meta">
							<h3 class="status-title">{status}</h3>
							<span class="status-count">
								{statusAssets.length} {statusAssets.length === 1 ? 'asset' : 'assets'}
							</span>
						</div>
					</div>
					<StatusBadge {status} />
				</div>

				<Card>
					<div class="table-container">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead class="w-12"></TableHead>
									<TableHead>
										<button type="button" class="sort-btn" onclick={() => requestSort('name')}>
											Name{getSortIndicator('name')}
										</button>
									</TableHead>
									<TableHead>
										<button type="button" class="sort-btn" onclick={() => requestSort('submittedDate')}>
											Submitted{getSortIndicator('submittedDate')}
										</button>
									</TableHead>
									<TableHead>Type</TableHead>
									{#if showPerformance}
										<TableHead class="text-center">
											<button type="button" class="sort-btn" onclick={() => requestSort('uniqueViewers')}>
												Viewers{getSortIndicator('uniqueViewers')}
											</button>
										</TableHead>
										<TableHead class="text-center">
											<button type="button" class="sort-btn" onclick={() => requestSort('cumulativePurchases')}>
												Purchases{getSortIndicator('cumulativePurchases')}
											</button>
										</TableHead>
										<TableHead class="text-center">
											<button type="button" class="sort-btn" onclick={() => requestSort('cumulativeRevenue')}>
												Revenue{getSortIndicator('cumulativeRevenue')}
											</button>
										</TableHead>
									{/if}
									<TableHead class="w-12"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each visibleAssets as asset (asset.id)}
									<AssetTableRow
										{asset}
										{showPerformance}
										{onView}
										{onEdit}
										{onArchive}
									/>
								{/each}
								{#if totals}
								<TableRow class="totals-row">
									<TableCell>
										<div class="totals-icon">
											<TrendingUp size={16} />
										</div>
									</TableCell>
									<TableCell><strong>Total</strong></TableCell>
									<TableCell></TableCell>
									<TableCell></TableCell>
									<TableCell class="text-center"><strong>{totals.viewers.toLocaleString()}</strong></TableCell>
									<TableCell class="text-center"><strong>{totals.purchases.toLocaleString()}</strong></TableCell>
									<TableCell class="text-center"><strong>${totals.revenue.toLocaleString()}</strong></TableCell>
									<TableCell></TableCell>
								</TableRow>
								{/if}
							</TableBody>
						</Table>
					</div>

					{#if statusAssets.length > 10}
						<div class="show-more">
							<Button variant="outline" onclick={() => toggleStatus(status)}>
								{expandedStatuses.includes(status)
									? 'Show Less'
									: `Show ${statusAssets.length - 10} More`}
							</Button>
						</div>
					{/if}
				</Card>
			</section>
		{/each}
	{/if}
</div>

<style>
	.assets-display {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.status-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.status-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.status-info {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.status-icon {
		width: 2.25rem;
		height: 2.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
		font-size: var(--text-body);
	}

	.status-icon.status-scheduled {
		background: var(--color-info-muted);
		color: var(--color-info);
	}

	.status-icon.status-published {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.status-icon.status-upcoming {
		background: color-mix(in srgb, var(--color-data-3) 20%, transparent);
		color: var(--color-data-3);
	}

	.status-icon.status-delisted {
		background: var(--color-warning-muted);
		color: var(--color-warning);
	}

	.status-icon.status-rejected {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	.status-meta {
		display: flex;
		flex-direction: column;
	}

	.status-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.status-count {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.table-container {
		overflow-x: auto;
	}

	.sort-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0;
		background: none;
		border: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.sort-btn:hover {
		color: var(--color-fg-primary);
	}

	.show-more {
		display: flex;
		justify-content: center;
		padding: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.totals-row {
		border-top: 2px solid var(--color-border-emphasis);
		background: var(--color-bg-subtle);
	}

	.totals-icon {
		width: 35px;
		height: 45px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
		color: var(--color-fg-muted);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-2xl) var(--space-md);
		text-align: center;
	}

	.empty-state :global(svg) {
		color: var(--color-fg-muted);
		margin-bottom: var(--space-md);
	}

	.empty-state h3 {
		font-size: var(--text-body-lg);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.empty-state p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
		max-width: 24rem;
	}

	:global(.text-center) {
		text-align: center;
	}
</style>
