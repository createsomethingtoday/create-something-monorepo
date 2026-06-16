<script lang="ts">
	import { Badge, TableCell, TableRow } from './ui';
	import ActionsDropdown from './ActionsDropdown.svelte';
	import type { Asset } from '$lib/server/airtable';
	import { getAssetActionConfig, normalizeAssetStatus } from '$lib/utils/asset-actions';
	import { isTemplateSearchSuppressed } from '$lib/utils/template-health';
	import { LoaderCircle } from 'lucide-svelte';
	import {
		formatCompactCurrency,
		formatCompactNumber,
		formatNumericDate,
		formatShortDate
	} from '$lib/utils/format';

	interface Props {
		asset: Asset;
		showPerformance?: boolean;
		isViewDisabled?: boolean;
		isViewLoading?: boolean;
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
		isViewDisabled = false,
		isViewLoading = false,
		isEditDisabled = false,
		isEditLoading = false,
		onView,
		onPreloadView,
		onEdit,
		onArchive
	}: Props = $props();

	let imageError = $state(false);

	const actionConfig = $derived(getAssetActionConfig(asset.status));
	const cleanedStatus = $derived(normalizeAssetStatus(asset.status));
	const showMetrics = $derived(!['Upcoming', 'Rejected'].includes(cleanedStatus));
	const isSearchSuppressed = $derived(isTemplateSearchSuppressed(asset.searchVisibility));
	const hasActiveOffer = $derived(
		Boolean(
			asset.activeOfferLabel ||
				asset.activeOfferCtaUrl ||
				asset.activeOfferStrategy ||
				asset.activeOfferEndsAt ||
				asset.activeOfferVisibility ||
				asset.activeOfferPrice !== undefined
		)
	);

	function handleView() {
		if (isViewDisabled) return;
		onView?.(asset.id);
	}

	function preloadView() {
		onPreloadView?.(asset.id);
	}

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
			class:loading={isViewLoading}
			disabled={isViewDisabled}
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
					width="30"
					height="38"
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
		<button
			type="button"
			class="asset-name-link"
			class:loading={isViewLoading}
			disabled={isViewDisabled}
			onmouseenter={preloadView}
			onfocus={preloadView}
			onclick={handleView}
		>
			<span class="asset-name-row">
				{#if isViewLoading}
					<LoaderCircle size={14} class="row-spinner" />
				{/if}
				<span class="asset-name">{asset.name}</span>
			</span>
			{#if hasActiveOffer}
				<span class="offer-badge-row">
					<Badge variant="info">
						{asset.activeOfferLabel || 'Limited offer'}
						{#if asset.activeOfferPrice !== undefined}
							· {formatCompactCurrency(asset.activeOfferPrice)}
						{/if}
					</Badge>
				</span>
			{/if}
			{#if isSearchSuppressed}
				<span class="offer-badge-row">
					<Badge variant="warning">Detail only</Badge>
				</span>
			{/if}
			{#if asset.recoveryOfferUsed}
				<span class="offer-badge-row">
					<Badge variant="secondary">Recovery used</Badge>
				</span>
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
	<TableCell class="category-cell">
		<div class="category-stack" title={[asset.category, asset.subcategory].filter(Boolean).join(' / ')}>
			<span class="category">{asset.category || 'Uncategorized'}</span>
			{#if asset.subcategory}
				<span class="category-sub">{asset.subcategory}</span>
			{/if}
		</div>
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
			{isViewDisabled}
			{isViewLoading}
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

	.asset-thumbnail-link:disabled,
	.asset-name-link:disabled {
		cursor: wait;
		opacity: 0.65;
	}

	.asset-thumbnail-link.loading,
	.asset-name-link.loading {
		opacity: 1;
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

	.asset-name-row {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-width: 0;
	}

	:global(.row-spinner) {
		flex-shrink: 0;
		color: var(--color-info);
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.offer-badge-row {
		display: inline-flex;
		margin-top: 0.22rem;
		max-width: 100%;
	}

	.asset-name-link:hover .asset-name {
		color: var(--color-fg-primary);
		text-decoration: underline;
		text-underline-offset: 0.16rem;
		text-decoration-thickness: 1px;
	}

	.date,
	.category {
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
	.metric,
	.metric-sub {
		font-variant-numeric: tabular-nums;
	}

	.date-sub {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		letter-spacing: 0;
	}

	.category-stack {
		display: flex;
		flex-direction: column;
		gap: 0.04rem;
		min-width: 0;
	}

	.category {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: var(--text-caption);
		letter-spacing: 0;
	}

	.category-sub {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		line-height: 1;
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
