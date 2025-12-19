<script lang="ts">
	import type { Asset, SortConfig, AssetStatus } from '$lib/types';
	import { STATUS_CONFIG } from '$lib/types';
	import { Badge } from '../ui';
	import StatusBadge from './StatusBadge.svelte';
	import AssetTable from './AssetTable.svelte';

	interface Props {
		status: AssetStatus;
		assets: Asset[];
		expanded?: boolean;
		sortConfig?: SortConfig;
		showPerformance?: boolean;
		onToggleExpand?: () => void;
		onSort?: (key: string) => void;
		onEdit?: (asset: Asset) => void;
		onSelect?: (asset: Asset) => void;
	}

	let {
		status,
		assets = [],
		expanded = false,
		sortConfig,
		showPerformance = false,
		onToggleExpand,
		onSort,
		onEdit,
		onSelect
	}: Props = $props();

	const statusConfig = STATUS_CONFIG[status];
	const INITIAL_DISPLAY_LIMIT = 10;

	let showAll = $state(false);

	let displayedAssets = $derived(
		showAll ? assets : assets.slice(0, INITIAL_DISPLAY_LIMIT)
	);

	let remainingCount = $derived(
		Math.max(0, assets.length - INITIAL_DISPLAY_LIMIT)
	);

	function handleShowMore() {
		showAll = true;
	}
</script>

<div class="status-section">
	<button class="header" onclick={onToggleExpand} type="button">
		<div class="header-left">
			<div class="icon-badge" style="background-color: {statusConfig.color}">
				{#if status === 'Published'}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M13.5 4.5L6 12L2.5 8.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				{:else if status === 'Scheduled'}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
						<rect x="2" y="3" width="12" height="11" rx="2" stroke="white" stroke-width="1.5" fill="none"/>
						<line x1="2" y1="6" x2="14" y2="6" stroke="white" stroke-width="1.5"/>
						<line x1="5" y1="1" x2="5" y2="4" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
						<line x1="11" y1="1" x2="11" y2="4" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
				{:else if status === 'Upcoming'}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
						<circle cx="8" cy="8" r="6.5" stroke="white" stroke-width="1.5" fill="none"/>
						<path d="M8 4.5V8H11" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
				{:else if status === 'Delisted'}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
						<circle cx="8" cy="8" r="6.5" stroke="white" stroke-width="1.5" fill="none"/>
						<line x1="8" y1="4" x2="8" y2="8" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
						<circle cx="8" cy="11" r="0.75" fill="white"/>
					</svg>
				{:else if status === 'Rejected'}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
						<circle cx="8" cy="8" r="6.5" stroke="white" stroke-width="1.5" fill="none"/>
						<path d="M10 6L6 10M6 6L10 10" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
				{:else if status === 'Draft'}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M4 2H12C12.5523 2 13 2.44772 13 3V13C13 13.5523 12.5523 14 12 14H4C3.44772 14 3 13.5523 3 13V3C3 2.44772 3.44772 2 4 2Z" stroke="white" stroke-width="1.5" fill="none"/>
						<line x1="5" y1="5" x2="11" y2="5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
						<line x1="5" y1="8" x2="11" y2="8" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
						<line x1="5" y1="11" x2="8" y2="11" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
				{/if}
			</div>

			<h3 class="status-title">
				{status} - {assets.length} {assets.length === 1 ? 'asset' : 'assets'}
			</h3>

			<StatusBadge {status} />
		</div>

		<div class="header-right">
			<svg
				class="chevron"
				class:expanded
				width="20"
				height="20"
				viewBox="0 0 20 20"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path d="M6 8L10 12L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</div>
	</button>

	{#if expanded}
		<div class="content">
			{#if assets.length === 0}
				<div class="empty-state">
					<p>No assets with {status.toLowerCase()} status</p>
				</div>
			{:else}
				<AssetTable
					assets={displayedAssets}
					{sortConfig}
					{showPerformance}
					{onSort}
					{onEdit}
					{onSelect}
				/>

				{#if !showAll && remainingCount > 0}
					<button class="show-more" onclick={handleShowMore} type="button">
						Show {remainingCount} More
					</button>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
	/* ==========================================================================
	   StatusSection - Collapsible asset group with Canon spacing
	   ========================================================================== */

	.status-section {
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		background: var(--color-bg-pure);
		overflow: hidden;
	}

	/* Header - Clickable toggle with status indicator */
	.header {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: none;
		cursor: pointer;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.header:hover {
		background: var(--color-hover);
	}

	.header:active {
		background: var(--color-active);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.header-right {
		display: flex;
		align-items: center;
	}

	/* Status icon badge - colored circle with icon */
	.icon-badge {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.status-title {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	/* Chevron - rotates when expanded */
	.chevron {
		color: var(--color-fg-tertiary);
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.chevron.expanded {
		transform: rotate(180deg);
	}

	/* Content area - contains the table */
	.content {
		border-top: 1px solid var(--color-border-default);
	}

	/* Empty state when no assets in this status */
	.empty-state {
		padding: var(--space-lg) var(--space-md);
		text-align: center;
	}

	.empty-state p {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		margin: 0;
	}

	/* Show more button - reveals additional assets */
	.show-more {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-subtle);
		border: none;
		border-top: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.show-more:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.show-more:active {
		background: var(--color-active);
	}
</style>
