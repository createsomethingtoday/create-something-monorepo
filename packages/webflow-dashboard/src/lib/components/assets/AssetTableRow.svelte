<script lang="ts">
	import type { Asset } from '$lib/types';
	import { TableRow, TableCell } from '../ui';
	import { Badge } from '../ui';

	interface Props {
		asset: Asset;
		showPerformance?: boolean;
		onEdit?: (asset: Asset) => void;
		onSelect?: (asset: Asset) => void;
	}

	let { asset, showPerformance = false, onEdit, onSelect }: Props = $props();

	function formatDate(dateString?: string): string {
		if (!dateString) return '-';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
	}

	function formatNumber(num?: number): string {
		if (num === undefined || num === null) return '0';
		return num.toLocaleString('en-US');
	}

	function formatCurrency(num?: number): string {
		if (num === undefined || num === null) return '$0';
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
	}

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map(word => word[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}
</script>

<TableRow>
	<TableCell>
		<div class="thumbnail-cell">
			{#if asset.thumbnailUrl}
				<img src={asset.thumbnailUrl} alt={asset.name} class="thumbnail" />
			{:else}
				<div class="thumbnail-placeholder">
					{getInitials(asset.name)}
				</div>
			{/if}
		</div>
	</TableCell>

	<TableCell>
		<a href="/assets/{asset.id}" class="asset-name">
			{asset.name}
		</a>
	</TableCell>

	<TableCell>
		{formatDate(asset.submittedDate)}
	</TableCell>

	<TableCell>
		<Badge variant="default">{asset.type}</Badge>
	</TableCell>

	{#if showPerformance}
		<TableCell>
			{formatNumber(asset.uniqueViewers)}
		</TableCell>

		<TableCell>
			{formatNumber(asset.cumulativePurchases)}
		</TableCell>

		<TableCell>
			{formatCurrency(asset.cumulativeRevenue)}
		</TableCell>
	{/if}

	<TableCell>
		<button class="actions-button" onclick={() => onEdit?.(asset)} type="button" aria-label="Edit asset">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
				<circle cx="8" cy="2" r="1.5" fill="currentColor"/>
				<circle cx="8" cy="8" r="1.5" fill="currentColor"/>
				<circle cx="8" cy="14" r="1.5" fill="currentColor"/>
			</svg>
		</button>
	</TableCell>
</TableRow>

<style>
	.thumbnail-cell {
		display: flex;
		align-items: center;
	}

	.thumbnail {
		width: 35px;
		height: 45px;
		object-fit: cover;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-default);
	}

	.thumbnail-placeholder {
		width: 35px;
		height: 45px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-weight: 600;
	}

	.asset-name {
		color: var(--color-fg-primary);
		text-decoration: none;
		max-width: 200px;
		display: inline-block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.asset-name:hover {
		color: var(--color-info);
	}

	.actions-button {
		background: none;
		border: none;
		color: var(--color-fg-tertiary);
		cursor: pointer;
		padding: var(--space-xs);
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.actions-button:hover {
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	.actions-button:active {
		background: var(--color-active);
	}
</style>
