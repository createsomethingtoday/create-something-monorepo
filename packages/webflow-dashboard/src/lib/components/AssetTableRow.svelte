<script lang="ts">
	import { TableRow, TableCell } from './ui';
	import ActionsDropdown from './ActionsDropdown.svelte';
	import type { Asset } from '$lib/server/airtable';

	interface Props {
		asset: Asset;
		showPerformance?: boolean;
		onView?: (id: string) => void;
		onEdit?: (id: string) => void;
		onArchive?: (id: string) => Promise<void>;
	}

	let { asset, showPerformance = false, onView, onEdit, onArchive }: Props = $props();

	let imageError = $state(false);

	// Clean status for display logic
	const cleanedStatus = asset.status
		.replace(/^\d*️⃣/u, '')
		.replace(/🆕/u, '')
		.replace(/📅/u, '')
		.replace(/🚀/u, '')
		.replace(/☠️/u, '')
		.replace(/❌/u, '')
		.trim();

	const showMetrics = !['Upcoming', 'Rejected'].includes(cleanedStatus);

	function formatDate(dateStr?: string): string {
		if (!dateStr) return '—';
		try {
			return new Date(dateStr).toLocaleDateString();
		} catch {
			return '—';
		}
	}

	function formatNumber(num?: number): string {
		if (num === undefined || num === null) return '0';
		return num.toLocaleString();
	}

	function formatCurrency(num?: number): string {
		if (num === undefined || num === null) return '$0';
		return `$${num.toLocaleString()}`;
	}
</script>

<TableRow>
	<TableCell>
		{#if asset.thumbnailUrl && !imageError}
			<img
				src={asset.thumbnailUrl}
				alt={asset.name}
				class="thumbnail"
				onerror={() => (imageError = true)}
			/>
		{:else}
			<div class="thumbnail-placeholder">
				<span>{asset.name.charAt(0).toUpperCase()}</span>
			</div>
		{/if}
	</TableCell>
	<TableCell>
		<span class="asset-name">{asset.name}</span>
	</TableCell>
	<TableCell>
		<span class="date">{formatDate(asset.submittedDate)}</span>
	</TableCell>
	<TableCell>
		<span class="type">{asset.type}</span>
	</TableCell>
	{#if showPerformance}
		<TableCell class="text-center">
			<span class="metric">{showMetrics ? formatNumber(asset.uniqueViewers) : '—'}</span>
		</TableCell>
		<TableCell class="text-center">
			<span class="metric">{showMetrics ? formatNumber(asset.cumulativePurchases) : '—'}</span>
		</TableCell>
		<TableCell class="text-center">
			<span class="metric">{showMetrics ? formatCurrency(asset.cumulativeRevenue) : '—'}</span>
		</TableCell>
	{/if}
	<TableCell>
		<ActionsDropdown
			assetId={asset.id}
			status={asset.status}
			{onView}
			{onEdit}
			{onArchive}
		/>
	</TableCell>
</TableRow>

<style>
	.thumbnail {
		width: 35px;
		height: 45px;
		object-fit: cover;
		border-radius: var(--radius-sm);
		aspect-ratio: 7/9;
	}

	.thumbnail-placeholder {
		width: 35px;
		height: 45px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
	}

	.asset-name {
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.date,
	.type {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.metric {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}
</style>
