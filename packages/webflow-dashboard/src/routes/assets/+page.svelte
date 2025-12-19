<script lang="ts">
	import type { PageData } from './$types';
	import { Header } from '$lib/components/layout';
	import { AssetGrid } from '$lib/components/assets';
	import { Button, Input, Badge } from '$lib/components/ui';
	import { Search, Filter, Plus } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedStatus = $state<string>('all');

	const statuses = ['all', 'Published', 'Scheduled', 'Upcoming', 'Draft', 'Rejected', 'Delisted'];

	const filteredAssets = $derived(() => {
		let assets = data.assets ?? [];

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			assets = assets.filter(a =>
				a.name.toLowerCase().includes(query) ||
				a.description?.toLowerCase().includes(query)
			);
		}

		if (selectedStatus !== 'all') {
			assets = assets.filter(a => a.status === selectedStatus);
		}

		return assets;
	});
</script>

<svelte:head>
	<title>Assets | Webflow Asset Dashboard</title>
</svelte:head>

<Header userEmail={data.user?.email} />

<main class="main">
	<div class="content">
		<header class="page-header">
			<div class="header-text">
				<h1 class="heading">Your Assets</h1>
				<p class="subtitle">
					{data.assets?.length ?? 0} templates and cloneables
				</p>
			</div>
			<Button variant="webflow">
				<Plus size={16} />
				<span>New Asset</span>
			</Button>
		</header>

		<div class="filters">
			<div class="search-wrapper">
				<Search size={18} class="search-icon" />
				<Input
					type="search"
					placeholder="Search assets..."
					bind:value={searchQuery}
					class="search-input"
				/>
			</div>

			<div class="status-filters">
				{#each statuses as status}
					<button
						class="status-filter"
						class:active={selectedStatus === status}
						onclick={() => selectedStatus = status}
					>
						{status === 'all' ? 'All' : status}
					</button>
				{/each}
			</div>
		</div>

		<section class="assets-section">
			<AssetGrid
				assets={filteredAssets()}
				emptyMessage={searchQuery || selectedStatus !== 'all'
					? 'No assets match your filters.'
					: 'No assets yet. Create your first template to get started.'}
			/>
		</section>
	</div>
</main>

<style>
	.main {
		min-height: calc(100vh - 60px);
	}

	.content {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.header-text {
		flex: 1;
	}

	.heading {
		font-family: var(--font-sans);
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		line-height: 1.2;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0.5rem 0 0;
	}

	.filters {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.search-wrapper {
		position: relative;
		max-width: 400px;
	}

	.search-wrapper :global(.search-icon) {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-fg-muted);
		pointer-events: none;
	}

	.search-wrapper :global(.search-input) {
		padding-left: 2.5rem;
	}

	.status-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.status-filter {
		padding: 0.375rem 0.75rem;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.status-filter:hover {
		border-color: var(--color-border-emphasis);
	}

	.status-filter.active {
		background: var(--webflow-blue);
		border-color: var(--webflow-blue);
		color: #ffffff;
	}

	.assets-section {
		margin-top: 1rem;
	}

	@media (min-width: 768px) {
		.filters {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
	}
</style>
