<script lang="ts">
	import { Button, TableCell, TableRow } from './ui';
	import ActionsDropdown from './ActionsDropdown.svelte';
	import type { Asset } from '$lib/server/airtable';
	import type { AssetActionDescriptor } from '$lib/utils/asset-actions';
	import { getAssetActionConfig, normalizeAssetStatus } from '$lib/utils/asset-actions';

	interface Props {
		asset: Asset;
		showPerformance?: boolean;
		onPrimaryAction?: (asset: Asset, action: AssetActionDescriptor) => void;
		onView?: (id: string) => void;
		onEdit?: (id: string) => void;
		onArchive?: (id: string) => Promise<void>;
	}

	let { asset, showPerformance = false, onPrimaryAction, onView, onEdit, onArchive }: Props = $props();

	let imageError = $state(false);

	const actionConfig = $derived(getAssetActionConfig(asset.status));
	const cleanedStatus = $derived(normalizeAssetStatus(asset.status));
	const showMetrics = $derived(!['Upcoming', 'Rejected'].includes(cleanedStatus));

	// Tufte: Show relationships, not just numbers
	// Conversion rate = purchases / viewers (key performance indicator)
	const conversionRate = $derived(() => {
		if (!showMetrics || !asset.uniqueViewers || asset.uniqueViewers === 0) return null;
		return ((asset.cumulativePurchases || 0) / asset.uniqueViewers) * 100;
	});

	// Revenue per purchase (average order value)
	const avgOrderValue = $derived(() => {
		if (!showMetrics || !asset.cumulativePurchases || asset.cumulativePurchases === 0) return null;
		return (asset.cumulativeRevenue || 0) / asset.cumulativePurchases;
	});

	function formatDate(dateStr?: string): string {
		if (!dateStr) return '—';
		try {
			return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		} catch {
			return '—';
		}
	}

	function formatNumber(num?: number): string {
		if (num === undefined || num === null) return '0';
		if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
		return num.toLocaleString();
	}

	function formatCurrency(num?: number): string {
		if (num === undefined || num === null) return '$0';
		if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
		return `$${num.toLocaleString()}`;
	}
</script>

<TableRow class="asset-table-row">
	<TableCell>
		<button
			type="button"
			class="asset-thumbnail-link"
			onclick={() => onView?.(asset.id)}
			aria-label={`Open ${asset.name}`}
		>
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
		</button>
	</TableCell>
	<TableCell>
		<button type="button" class="asset-name-link" onclick={() => onView?.(asset.id)}>
			<span class="asset-name">{asset.name}</span>
		</button>
	</TableCell>
	<TableCell>
		<span class="date">{formatDate(asset.submittedDate)}</span>
	</TableCell>
	<TableCell>
		<span class="type">{asset.type}</span>
	</TableCell>
	{#if showPerformance}
		{@const cr = conversionRate()}
		{@const aov = avgOrderValue()}
		<TableCell class="text-center">
			<span class="metric tabular">{showMetrics ? formatNumber(asset.uniqueViewers) : '—'}</span>
		</TableCell>
		<TableCell class="text-center">
			<div class="metric-stack">
				<span class="metric tabular">{showMetrics ? formatNumber(asset.cumulativePurchases) : '—'}</span>
				{#if cr !== null}
					<span class="metric-sub">{cr.toFixed(1)}%</span>
				{/if}
			</div>
		</TableCell>
		<TableCell class="text-center">
			<div class="metric-stack">
				<span class="metric tabular">{showMetrics ? formatCurrency(asset.cumulativeRevenue) : '—'}</span>
				{#if aov !== null}
					<span class="metric-sub">${aov.toFixed(0)}/ea</span>
				{/if}
			</div>
		</TableCell>
	{/if}
	<TableCell>
		<Button
			variant={actionConfig.primary.handler === 'edit' ? 'default' : 'secondary'}
			size="sm"
			class="primary-action-button"
			onclick={() => onPrimaryAction?.(asset, actionConfig.primary)}
		>
			{actionConfig.primary.label}
		</Button>
	</TableCell>
	<TableCell>
		<ActionsDropdown
			assetId={asset.id}
			status={asset.status}
			actions={actionConfig.secondary}
			{onView}
			{onEdit}
			{onArchive}
		/>
	</TableCell>
</TableRow>

<style>
	.asset-thumbnail-link,
	.asset-name-link {
		display: inline-flex;
		align-items: center;
		padding: 0;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
	}

	.asset-thumbnail-link {
		border-radius: var(--radius-sm);
	}

	.asset-thumbnail-link:focus-visible,
	.asset-name-link:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

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

	.asset-name-link:hover .asset-name {
		color: var(--color-info);
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

	.metric.tabular {
		font-variant-numeric: tabular-nums;
	}

	.metric-stack {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.125rem;
	}

	.metric-sub {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-variant-numeric: tabular-nums;
	}

	:global(.primary-action-button) {
		min-width: 8rem;
	}
</style>
