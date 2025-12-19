<script lang="ts">
	import type { PageData } from './$types';
	import type { Asset, AssetStatus, SortConfig } from '$lib/types';
	import { STATUS_ORDER, STATUS_CONFIG } from '$lib/types';
	import { Header } from '$lib/components/layout';
	import { BetaBanner, OverviewCard } from '$lib/components/dashboard';
	import { StatusSection } from '$lib/components/assets';
	import { Button } from '$lib/components/ui';
	import {
		CheckCircle,
		Calendar,
		Clock,
		AlertCircle,
		XCircle,
		FileText
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// State
	let searchTerm = $state('');
	let showPerformance = $state(false);
	let expandedStatuses = $state(new Set<AssetStatus>(['Published', 'Delisted']));
	let sortConfig = $state<SortConfig>({ key: 'submittedDate', direction: 'descending' });

	// Derived state
	const filteredAssets = $derived(
		(data.assets ?? []).filter((asset) => {
			if (!searchTerm) return true;
			const search = searchTerm.toLowerCase();
			return (
				asset.name.toLowerCase().includes(search) ||
				asset.description?.toLowerCase().includes(search) ||
				asset.type.toLowerCase().includes(search)
			);
		})
	);

	const filteredAssetsByStatus = $derived(
		filteredAssets.reduce(
			(acc, asset) => {
				const status = asset.status;
				if (!acc[status]) {
					acc[status] = [];
				}
				acc[status].push(asset);
				return acc;
			},
			{} as Record<AssetStatus, Asset[]>
		)
	);

	const statusCounts = $derived(
		STATUS_ORDER.map((status) => ({
			status,
			count: filteredAssetsByStatus[status]?.length ?? 0
		}))
	);

	// Event handlers
	function handleSearch(value: string) {
		searchTerm = value;
	}

	function toggleExpand(status: AssetStatus) {
		const newSet = new Set(expandedStatuses);
		if (newSet.has(status)) {
			newSet.delete(status);
		} else {
			newSet.add(status);
		}
		expandedStatuses = newSet;
	}

	function togglePerformance() {
		showPerformance = !showPerformance;
	}

	function handleSort(key: string) {
		// Toggle direction if same key, otherwise default to descending
		const direction =
			sortConfig.key === key && sortConfig.direction === 'descending'
				? 'ascending'
				: 'descending';
		sortConfig = { key, direction };
	}

	function scrollToStatus(status: AssetStatus) {
		const element = document.getElementById(`status-${status.toLowerCase()}`);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
			// Auto-expand the section
			if (!expandedStatuses.has(status)) {
				toggleExpand(status);
			}
		}
	}

	function handleEdit(asset: Asset) {
		// TODO: Implement edit modal
		console.log('Edit asset:', asset);
	}

	function handleSelect(assetId: string) {
		// TODO: Implement selection
		console.log('Select asset:', assetId);
	}

	// Icon mapping
	const statusIcons = {
		Published: CheckCircle,
		Scheduled: Calendar,
		Upcoming: Clock,
		Delisted: AlertCircle,
		Rejected: XCircle,
		Draft: FileText
	};
</script>

<svelte:head>
	<title>Dashboard | Webflow Asset Dashboard</title>
</svelte:head>

<Header
	userEmail={data.user?.email}
	submissionsThisMonth={data.submissionsThisMonth}
	onSearch={handleSearch}
/>

<main class="main">
	<div class="content">
		<!-- Beta Banner -->
		<BetaBanner />

		<!-- Overview Section -->
		<section class="overview">
			<div class="overview-header">
				<div class="overview-title-group">
					<h2 class="overview-title">Overview</h2>
					<p class="overview-subtitle">Current status of your templates</p>
				</div>
				<div class="overview-actions">
					<Button variant="outline" size="sm">
						{#snippet children()}
							Marketplace Insights
						{/snippet}
					</Button>
					<Button variant="outline" size="sm">
						{#snippet children()}
							Validation Tools
						{/snippet}
					</Button>
				</div>
			</div>

			<!-- Horizontal scroll status cards -->
			<div class="overview-cards">
				{#each statusCounts as { status, count }}
					<OverviewCard {status} {count} onclick={() => scrollToStatus(status)}>
						{#snippet icon()}
							{@const IconComponent = statusIcons[status]}
							<IconComponent size={24} color={STATUS_CONFIG[status].darkColor} />
						{/snippet}
					</OverviewCard>
				{/each}
			</div>
		</section>

		<!-- Your Assets Section -->
		<section class="assets">
			<div class="assets-header">
				<h2 class="assets-title">Your Assets</h2>
				<Button variant="outline" size="sm" onclick={togglePerformance}>
					{#snippet children()}
						{showPerformance ? 'Hide' : 'Show'} Performance
					{/snippet}
				</Button>
			</div>

			{#each STATUS_ORDER as status}
				{@const statusAssets = filteredAssetsByStatus[status] ?? []}
				{#if statusAssets.length > 0}
					<div id="status-{status.toLowerCase()}">
						<StatusSection
							{status}
							assets={statusAssets}
							expanded={expandedStatuses.has(status)}
							{sortConfig}
							{showPerformance}
							onToggleExpand={() => toggleExpand(status)}
							onSort={handleSort}
							onEdit={handleEdit}
							onSelect={handleSelect}
						/>
					</div>
				{/if}
			{/each}

			{#if filteredAssets.length === 0}
				<div class="empty-state">
					<FileText size={48} />
					<h3>No assets found</h3>
					<p>
						{searchTerm
							? 'Try adjusting your search term'
							: 'Create your first template to get started'}
					</p>
				</div>
			{/if}
		</section>
	</div>
</main>

<style>
	/* ==========================================================================
	   Canon Golden Ratio Layout
	   φ (phi) = 1.618
	   Spacing: xs(0.5) → sm(1) → md(1.618) → lg(2.618) → xl(4.236) → 2xl(6.854)
	   ========================================================================== */

	.main {
		min-height: calc(100vh - 60px);
		background: var(--color-bg-elevated);
	}

	.content {
		max-width: 1400px;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-lg);
	}

	/* ==========================================================================
	   Overview Section - Visual hierarchy via golden ratio
	   ========================================================================== */

	.overview {
		margin-bottom: var(--space-xl);
	}

	.overview-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: var(--space-lg);
		gap: var(--space-lg);
	}

	.overview-title-group {
		display: flex;
		flex-direction: column;
		gap: calc(var(--space-xs) / 1.618); /* φ-derived micro-gap */
	}

	.overview-title {
		font-family: var(--font-sans);
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
		line-height: 1.2;
	}

	.overview-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin: 0;
	}

	.overview-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-shrink: 0;
	}

	/* Horizontal scroll cards - φ gap between cards */
	.overview-cards {
		display: flex;
		gap: var(--space-md);
		overflow-x: auto;
		padding: var(--space-xs) 0 var(--space-sm);
		margin: 0 calc(-1 * var(--space-xs));
		padding-left: var(--space-xs);
		padding-right: var(--space-xs);
		scrollbar-width: thin;
		scrollbar-color: var(--color-border-emphasis) transparent;
	}

	.overview-cards::-webkit-scrollbar {
		height: 6px;
	}

	.overview-cards::-webkit-scrollbar-track {
		background: transparent;
	}

	.overview-cards::-webkit-scrollbar-thumb {
		background: var(--color-border-default);
		border-radius: var(--radius-full);
	}

	.overview-cards::-webkit-scrollbar-thumb:hover {
		background: var(--color-border-emphasis);
	}

	/* ==========================================================================
	   Assets Section - Table-based layout with golden ratio gaps
	   ========================================================================== */

	.assets {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.assets-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-lg);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.assets-title {
		font-family: var(--font-sans);
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	/* ==========================================================================
	   Empty State - Centered with generous padding
	   ========================================================================== */

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		padding: var(--space-2xl) var(--space-xl);
		text-align: center;
		color: var(--color-fg-muted);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.empty-state h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.empty-state p {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin: 0;
		max-width: 32ch;
	}

	/* ==========================================================================
	   Responsive - Maintain proportions at smaller viewports
	   ========================================================================== */

	@media (max-width: 1024px) {
		.content {
			padding: var(--space-lg) var(--space-md);
		}
	}

	@media (max-width: 768px) {
		.content {
			padding: var(--space-md) var(--space-sm);
		}

		.overview-header {
			flex-direction: column;
			align-items: stretch;
			gap: var(--space-md);
		}

		.overview-actions {
			justify-content: flex-start;
		}

		.assets-header {
			flex-direction: column;
			align-items: stretch;
			gap: var(--space-sm);
		}
	}
</style>
