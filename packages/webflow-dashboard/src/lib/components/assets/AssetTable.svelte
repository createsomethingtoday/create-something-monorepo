<script lang="ts">
	import type { Asset, SortConfig } from '$lib/types';
	import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../ui';
	import AssetTableRow from './AssetTableRow.svelte';

	interface Props {
		assets: Asset[];
		sortConfig?: SortConfig;
		showPerformance?: boolean;
		onSort?: (key: string) => void;
		onEdit?: (asset: Asset) => void;
		onSelect?: (asset: Asset) => void;
		onArchive?: (asset: Asset) => Promise<void>;
	}

	let {
		assets = [],
		sortConfig,
		showPerformance = false,
		onSort,
		onEdit,
		onSelect,
		onArchive
	}: Props = $props();

	function handleSort(key: string) {
		if (onSort) {
			onSort(key);
		}
	}

	function formatCurrency(num?: number): string {
		if (num === undefined || num === null) return '$0';
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
	}

	function formatNumber(num?: number): string {
		if (num === undefined || num === null) return '0';
		return num.toLocaleString('en-US');
	}

	let totals = $derived({
		views: assets.reduce((sum, asset) => sum + (asset.uniqueViewers ?? 0), 0),
		purchases: assets.reduce((sum, asset) => sum + (asset.cumulativePurchases ?? 0), 0),
		revenue: assets.reduce((sum, asset) => sum + (asset.cumulativeRevenue ?? 0), 0)
	});
</script>

<Table>
	<TableHeader>
		<TableRow>
			<TableHead>Thumbnail</TableHead>
			<TableHead
				sortable={true}
				sorted={sortConfig?.key === 'name'}
				direction={sortConfig?.direction === 'ascending' ? 'asc' : 'desc'}
				onclick={() => handleSort('name')}
			>
				Name
			</TableHead>
			<TableHead
				sortable={true}
				sorted={sortConfig?.key === 'submittedDate'}
				direction={sortConfig?.direction === 'ascending' ? 'asc' : 'desc'}
				onclick={() => handleSort('submittedDate')}
			>
				Submitted Date
			</TableHead>
			<TableHead>Type</TableHead>
			{#if showPerformance}
				<TableHead>Views</TableHead>
				<TableHead>Purchases</TableHead>
				<TableHead>Revenue</TableHead>
			{/if}
			<TableHead>Actions</TableHead>
		</TableRow>
	</TableHeader>

	<TableBody>
		{#each assets as asset (asset.id)}
			<AssetTableRow {asset} {showPerformance} {onEdit} {onSelect} {onArchive} />
		{/each}

		{#if showPerformance && assets.length > 0}
			<TableRow class="totals-row">
				<TableCell></TableCell>
				<TableCell class="totals-label">Totals</TableCell>
				<TableCell></TableCell>
				<TableCell></TableCell>
				<TableCell class="totals-value">{formatNumber(totals.views)}</TableCell>
				<TableCell class="totals-value">{formatNumber(totals.purchases)}</TableCell>
				<TableCell class="totals-value">{formatCurrency(totals.revenue)}</TableCell>
				<TableCell></TableCell>
			</TableRow>
		{/if}
	</TableBody>
</Table>

<style>
	:global(.totals-row) {
		background: var(--color-bg-subtle);
		font-weight: 600;
		border-top: 2px solid var(--color-border-emphasis);
	}

	:global(.totals-row:hover) {
		background: var(--color-bg-subtle);
	}

	:global(.totals-label) {
		color: var(--color-fg-secondary);
		font-weight: 600;
	}

	:global(.totals-value) {
		color: var(--color-fg-primary);
		font-weight: 600;
	}
</style>
