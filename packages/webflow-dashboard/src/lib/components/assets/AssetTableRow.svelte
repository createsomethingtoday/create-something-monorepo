<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Asset } from '$lib/types';
	import { TableRow, TableCell } from '../ui';
	import { Badge } from '../ui';
	import { Eye, Pencil, Archive, Loader2 } from 'lucide-svelte';

	interface Props {
		asset: Asset;
		showPerformance?: boolean;
		onEdit?: (asset: Asset) => void;
		onSelect?: (asset: Asset) => void;
		onArchive?: (asset: Asset) => Promise<void>;
	}

	let { asset, showPerformance = false, onEdit, onSelect, onArchive }: Props = $props();

	// Dropdown state
	let showDropdown = $state(false);
	let dropdownRef: HTMLDivElement | null = $state(null);
	let isArchiving = $state(false);

	// Toggle dropdown
	function toggleDropdown(e: MouseEvent) {
		e.stopPropagation();
		showDropdown = !showDropdown;
	}

	// Close dropdown
	function closeDropdown() {
		showDropdown = false;
	}

	// Click-outside handler
	function handleClickOutside(event: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
			showDropdown = false;
		}
	}

	// Handle view details - navigate to detail page
	function handleViewDetails() {
		closeDropdown();
		goto(`/assets/${asset.id}`);
	}

	// Handle edit - navigate to detail page for now
	function handleEdit() {
		closeDropdown();
		if (onEdit) {
			onEdit(asset);
		} else {
			// Default: navigate to detail page
			goto(`/assets/${asset.id}`);
		}
	}

	// Handle archive action
	async function handleArchive() {
		if (isArchiving) return;

		const confirmed = confirm(`Are you sure you want to archive "${asset.name}"? This will change its status to Delisted.`);
		if (!confirmed) {
			closeDropdown();
			return;
		}

		isArchiving = true;
		try {
			if (onArchive) {
				await onArchive(asset);
			}
			closeDropdown();
		} catch (err) {
			console.error('Failed to archive:', err);
			alert('Failed to archive asset. Please try again.');
		} finally {
			isArchiving = false;
		}
	}

	onMount(() => {
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	});

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
		<div class="actions-container" bind:this={dropdownRef}>
			<button
				class="actions-button"
				onclick={toggleDropdown}
				type="button"
				aria-label="Asset actions"
				aria-expanded={showDropdown}
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
					<circle cx="8" cy="2" r="1.5" fill="currentColor"/>
					<circle cx="8" cy="8" r="1.5" fill="currentColor"/>
					<circle cx="8" cy="14" r="1.5" fill="currentColor"/>
				</svg>
			</button>

			{#if showDropdown}
				<div class="dropdown-menu">
					<button class="dropdown-item" onclick={handleViewDetails}>
						<Eye size={16} />
						View Details
					</button>

					{#if asset.status === 'Published' || asset.status === 'Upcoming' || asset.status === 'Scheduled'}
						<button class="dropdown-item" onclick={handleEdit}>
							<Pencil size={16} />
							Edit
						</button>
					{/if}

					{#if asset.status !== 'Delisted'}
						<button
							class="dropdown-item dropdown-item-danger"
							onclick={handleArchive}
							disabled={isArchiving}
						>
							{#if isArchiving}
								<Loader2 size={16} class="spin" />
								Archiving...
							{:else}
								<Archive size={16} />
								Archive
							{/if}
						</button>
					{/if}
				</div>
			{/if}
		</div>
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

	.actions-container {
		position: relative;
	}

	.dropdown-menu {
		position: absolute;
		right: 0;
		top: 100%;
		margin-top: var(--space-xs);
		min-width: 160px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		z-index: 50;
		padding: var(--space-xs) 0;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: none;
		border: none;
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		cursor: pointer;
		text-align: left;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.dropdown-item:hover {
		background: var(--color-hover);
	}

	.dropdown-item-danger:hover {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	.dropdown-item:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.dropdown-item:disabled:hover {
		background: none;
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
