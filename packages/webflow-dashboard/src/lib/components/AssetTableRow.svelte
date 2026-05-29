<script lang="ts">
	import { TableCell, TableRow } from './ui';
	import ActionsDropdown from './ActionsDropdown.svelte';
	import type { Asset } from '$lib/server/airtable';
	import { getAssetActionConfig, normalizeAssetStatus } from '$lib/utils/asset-actions';
	import {
		formatCompactCurrency,
		formatCompactNumber,
		formatNumericDate,
		formatShortDate
	} from '$lib/utils/format';

	interface Props {
		asset: Asset;
		showPerformance?: boolean;
		isEditDisabled?: boolean;
		isEditLoading?: boolean;
		onView?: (id: string) => void;
		onEdit?: (id: string) => void;
		onArchive?: (id: string) => Promise<void>;
	}

	let {
		asset,
		showPerformance = false,
		isEditDisabled = false,
		isEditLoading = false,
		onView,
		onEdit,
		onArchive
	}: Props = $props();

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

</script>

<TableRow class="asset-table-row">
	<TableCell class="thumbnail-cell">
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
	<TableCell class="asset-title-cell">
		<button type="button" class="asset-name-link" onclick={() => onView?.(asset.id)}>
			<span class="asset-name">{asset.name}</span>
			{#if asset.category}
				<span class="asset-meta">{asset.category}</span>
			{/if}
		</button>
	</TableCell>
	<TableCell class="date-cell">
		<div class="date-stack">
			<span class="date">{formatShortDate(asset.submittedDate)}</span>
			{#if asset.submittedDate}
				<span class="date-sub">{formatNumericDate(asset.submittedDate)}</span>
			{/if}
		</div>
	</TableCell>
	<TableCell class="type-cell">
		<span class="type">{asset.type}</span>
	</TableCell>
	{#if showPerformance}
		{@const cr = conversionRate()}
		{@const aov = avgOrderValue()}
		<TableCell class="metric-cell">
			<span class="metric metric-primary">{showMetrics ? formatCompactNumber(asset.uniqueViewers) : '—'}</span>
		</TableCell>
		<TableCell class="metric-cell">
			<div class="metric-stack">
				<span class="metric metric-primary">{showMetrics ? formatCompactNumber(asset.cumulativePurchases) : '—'}</span>
				{#if cr !== null}
					<span class="metric-sub">{cr.toFixed(1)}%</span>
				{/if}
			</div>
		</TableCell>
		<TableCell class="metric-cell">
			<div class="metric-stack">
				<span class="metric metric-primary">{showMetrics ? formatCompactCurrency(asset.cumulativeRevenue) : '—'}</span>
				{#if aov !== null}
					<span class="metric-sub">${aov.toFixed(0)}/ea</span>
				{/if}
			</div>
		</TableCell>
	{/if}
	<TableCell class="more-cell">
		<ActionsDropdown
			assetId={asset.id}
			status={asset.status}
			actions={[actionConfig.primary, ...actionConfig.secondary]}
			{isEditDisabled}
			{isEditLoading}
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
		flex-direction: column;
		align-items: flex-start;
		gap: 0.02rem;
		max-width: 20rem;
	}

	.asset-name-link {
		padding: 0;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
	}

	.asset-thumbnail-link {
		border-radius: var(--radius-sm);
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.asset-thumbnail-link:focus-visible,
	.asset-name-link:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.thumbnail {
		width: 30px;
		height: 38px;
		object-fit: cover;
		border-radius: var(--radius-sm);
		aspect-ratio: 7/9;
	}

	.thumbnail-placeholder {
		width: 30px;
		height: 38px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
	}

	.asset-name {
		font-size: 0.93rem;
		font-weight: var(--font-semibold);
		letter-spacing: 0;
		color: var(--color-fg-primary);
		line-height: 1.16;
	}

	.asset-meta {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		line-height: 1.15;
		letter-spacing: 0;
	}

	.asset-name-link:hover .asset-name {
		color: var(--color-fg-primary);
		text-decoration: underline;
		text-underline-offset: 0.16rem;
		text-decoration-thickness: 1px;
	}

	.date,
	.type {
		color: var(--color-fg-tertiary);
		font-size: 0.82rem;
	}

	.date-stack {
		display: flex;
		flex-direction: column;
		gap: 0.04rem;
	}

	.date,
	.date-sub,
	.type,
	.metric,
	.metric-sub {
		font-variant-numeric: tabular-nums;
	}

	.date-sub {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		letter-spacing: 0;
	}

	.type {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0;
	}

	.metric {
		display: block;
		color: var(--color-fg-secondary);
		font-size: 0.86rem;
		line-height: 1.1;
	}

	.metric-primary {
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
		font-variant-numeric: tabular-nums;
	}

	.metric-stack {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.06rem;
	}

	.metric-sub {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		line-height: 1;
	}

	:global(.more-cell) {
		white-space: nowrap;
	}
</style>
