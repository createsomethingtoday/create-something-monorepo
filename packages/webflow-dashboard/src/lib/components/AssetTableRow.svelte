<script lang="ts">
	import { Badge, TableCell, TableRow } from './ui';
	import ActionsDropdown from './ActionsDropdown.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import type { Asset } from '$lib/server/airtable';
	import { CONVERSION_DATA_AVAILABLE, VIEWER_DATA_AVAILABLE } from '$lib/config/viewer-data';
	import { getAssetActionConfig, normalizeAssetStatus } from '$lib/utils/asset-actions';
	import { isTemplateSearchSuppressed } from '$lib/utils/template-health';
	import {
		formatCompactCurrency,
		formatCompactNumber,
		formatLongDate
	} from '$lib/utils/format';

	interface Props {
		asset: Asset;
		showPerformance?: boolean;
		showCategory?: boolean;
		showPrice?: boolean;
		isViewDisabled?: boolean;
		isEditDisabled?: boolean;
		isEditLoading?: boolean;
		onView?: (id: string) => void;
		onPreloadView?: (id: string) => void;
		onEdit?: (id: string) => void;
		onArchive?: (id: string) => void | Promise<void>;
	}

	let {
		asset,
		showPerformance = false,
		showCategory = true,
		showPrice = true,
		isViewDisabled = false,
		isEditDisabled = false,
		isEditLoading = false,
		onView,
		onPreloadView,
		onEdit,
		onArchive
	}: Props = $props();

	let imageError = $state(false);

	const actionConfig = $derived(getAssetActionConfig(asset.status, asset.type));
	const assetHref = $derived(`/assets/${asset.id}`);
	const cleanedStatus = $derived(normalizeAssetStatus(asset.status));
	const showMetrics = $derived(!['Upcoming', 'Rejected'].includes(cleanedStatus));
	const isSearchSuppressed = $derived(isTemplateSearchSuppressed(asset.searchVisibility));

	function handleView(event: MouseEvent) {
		if (isViewDisabled) {
			event.preventDefault();
			return;
		}
		onView?.(asset.id);
	}

	function preloadView() {
		onPreloadView?.(asset.id);
	}

	// Tufte: Show relationships, not just numbers
	// Conversion rate = purchases / viewers (key performance indicator)
	const conversionRate = $derived(() => {
		if (!VIEWER_DATA_AVAILABLE || !CONVERSION_DATA_AVAILABLE) return null;
		if (!showMetrics || !asset.uniqueViewers || asset.uniqueViewers === 0) return null;
		return ((asset.cumulativePurchases || 0) / asset.uniqueViewers) * 100;
	});

	// Revenue per purchase (average order value)
	const avgOrderValue = $derived(() => {
		if (!showMetrics || !asset.cumulativePurchases || asset.cumulativePurchases === 0) return null;
		return (asset.cumulativeRevenue || 0) / asset.cumulativePurchases;
	});

</script>

<TableRow
	class="asset-table-row"
	data-asset-id={asset.id}
	data-preview={asset.thumbnailUrl && !imageError ? asset.thumbnailUrl : undefined}
>
	<TableCell class="thumbnail-cell">
		<a
			href={assetHref}
			class="asset-thumbnail-link"
			aria-disabled={isViewDisabled}
			tabindex={isViewDisabled ? -1 : undefined}
			onmouseenter={preloadView}
			onfocus={preloadView}
			onclick={handleView}
			aria-label={`Open ${asset.name}`}
		>
			{#if asset.thumbnailUrl && !imageError}
				<img
					src={asset.thumbnailUrl}
					alt={asset.name}
					class="thumbnail"
					loading="lazy"
					decoding="async"
					width="32"
					height="40"
					onerror={() => (imageError = true)}
				/>
			{:else}
				<div class="thumbnail-placeholder">
					<span>{asset.name.charAt(0).toUpperCase()}</span>
				</div>
			{/if}
		</a>
	</TableCell>
	<TableCell class="asset-title-cell">
		<a
			href={assetHref}
			class="asset-name-link"
			aria-disabled={isViewDisabled}
			tabindex={isViewDisabled ? -1 : undefined}
			onmouseenter={preloadView}
			onfocus={preloadView}
			onclick={handleView}
		>
			<span class="asset-name-row">
				<span class="asset-name">{asset.name}</span>
				{#if isSearchSuppressed}
					<Badge variant="warning">Detail only</Badge>
				{/if}
			</span>
		</a>
	</TableCell>
	<TableCell class="status-cell">
		<StatusBadge status={asset.status} size="sm" variant="dot" />
	</TableCell>
	{#if showCategory}
		<TableCell class="category-cell">
			<span class="category" title={[asset.category, asset.subcategory].filter(Boolean).join(' / ')}>
				{asset.category || 'Uncategorized'}{#if asset.subcategory}<span class="category-sub"
						>{' · '}{asset.subcategory}</span
					>{/if}
			</span>
		</TableCell>
	{/if}
	<TableCell class="date-cell">
		<span class="date">{formatLongDate(asset.submittedDate) || '—'}</span>
	</TableCell>
	{#if showPrice}
		<TableCell class="price-cell">
			<span class="price">{asset.priceString || '—'}</span>
		</TableCell>
	{/if}
	{#if showPerformance}
		{@const cr = conversionRate()}
		{@const aov = avgOrderValue()}
		{#if VIEWER_DATA_AVAILABLE}
			<TableCell class="metric-cell">
				<span class="metric metric-primary"
					>{showMetrics && asset.uniqueViewers !== undefined ? formatCompactNumber(asset.uniqueViewers) : '—'}</span
				>
			</TableCell>
		{/if}
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
			{isViewDisabled}
			{isEditDisabled}
			{isEditLoading}
			{onView}
			{onPreloadView}
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
		max-width: 100%;
	}

	.asset-name-link {
		padding: 0;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		text-decoration: none;
	}

	.asset-thumbnail-link {
		border-radius: var(--radius-sm);
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		text-decoration: none;
	}

	.asset-thumbnail-link:focus-visible,
	.asset-name-link:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.asset-thumbnail-link[aria-disabled='true'],
	.asset-name-link[aria-disabled='true'] {
		cursor: wait;
		opacity: 0.65;
	}

	.asset-thumbnail-link {
		overflow: hidden;
		box-shadow: 0 0 0 1px var(--color-shell-border-default);
	}

	.thumbnail {
		display: block;
		width: 32px;
		height: 40px;
		object-fit: cover;
		object-position: top center;
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	/* Hover: the thumbnail leans in toward the larger pointer preview. */
	:global(.asset-table-row:hover) .thumbnail {
		transform: scale(1.08);
	}

	.thumbnail-placeholder {
		width: 32px;
		height: 40px;
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
		font-size: 0.9rem;
		font-weight: var(--font-semibold);
		letter-spacing: 0;
		color: var(--color-fg-primary);
		line-height: 1.16;
	}

	.asset-name-row {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.3rem 0.6rem;
		min-width: 0;
	}

	.asset-name-link:hover .asset-name {
		color: var(--color-fg-primary);
		text-decoration: underline;
		text-underline-offset: 0.16rem;
		text-decoration-thickness: 1px;
	}

	.date,
	.category,
	.price {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-fg-secondary);
		font-size: 0.84rem;
		letter-spacing: 0;
	}

	.date,
	.price,
	.metric,
	.metric-sub {
		font-variant-numeric: tabular-nums;
	}

	.price {
		text-align: right;
	}

	.category-sub {
		color: var(--color-fg-muted);
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
