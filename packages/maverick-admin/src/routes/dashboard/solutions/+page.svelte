<script lang="ts">
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const brandLabels: Record<string, string> = {
		petrox: 'PetroX',
		lithx: 'LithX',
		dme: 'DME'
	};
</script>

<svelte:head>
	<title>Solutions | Maverick X Admin</title>
</svelte:head>

<div class="page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Solutions</h1>
			<p class="page-subtitle">Manage product solutions across all brands</p>
		</div>
		<a href="/dashboard/solutions/new" class="btn btn-primary">Add Solution</a>
	</header>

	<!-- Filter tabs -->
	<div class="filter-tabs">
		<a href="/dashboard/solutions" class="filter-tab" class:active={!data.brand}>All</a>
		<a href="/dashboard/solutions?brand=petrox" class="filter-tab" class:active={data.brand === 'petrox'}>PetroX</a>
		<a href="/dashboard/solutions?brand=lithx" class="filter-tab" class:active={data.brand === 'lithx'}>LithX</a>
		<a href="/dashboard/solutions?brand=dme" class="filter-tab" class:active={data.brand === 'dme'}>DME</a>
	</div>

	<!-- Solutions table -->
	<div class="card">
		{#if data.solutions && data.solutions.length > 0}
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Brand</th>
						<th>Headline</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.solutions as solution}
						<tr>
							<td>
								<a href="/dashboard/solutions/{solution.id}" class="solution-link">
									{solution.name}
									{#if solution.symbol}
										<span class="solution-symbol">({solution.symbol})</span>
									{/if}
								</a>
							</td>
							<td>
								<span class="badge badge-{solution.brand}">{brandLabels[solution.brand] || solution.brand}</span>
							</td>
							<td class="cell-truncate">{solution.headline}</td>
							<td>
								<span class="badge badge-{solution.is_active ? 'success' : 'warning'}">
									{solution.is_active ? 'Active' : 'Inactive'}
								</span>
							</td>
							<td>
								<div class="action-buttons">
									<a href="/dashboard/solutions/{solution.id}/edit" class="btn-icon">Edit</a>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<div class="empty-state">
				<p class="empty-text">No solutions found</p>
				<a href="/dashboard/solutions/new" class="btn btn-primary">Add your first solution</a>
			</div>
		{/if}
	</div>
</div>

<style>
	.page {
		padding: var(--space-lg);
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-md);
	}

	.page-title {
		font-size: var(--text-h2, 1.5rem);
		font-weight: 700;
	}

	.page-subtitle {
		color: var(--color-fg-secondary);
	}

	.filter-tabs {
		display: flex;
		gap: var(--space-xs);
		margin-bottom: var(--space-md);
	}

	.filter-tab {
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-secondary);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.filter-tab:hover {
		background: var(--color-hover);
	}

	.filter-tab.active {
		background: var(--color-active);
		color: var(--color-fg-primary);
	}

	.solution-link:hover {
		text-decoration: underline;
	}

	.solution-symbol {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm, 0.875rem);
	}

	.cell-truncate {
		max-width: 300px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-fg-secondary);
	}

	.action-buttons {
		display: flex;
		gap: var(--space-xs);
	}

	.btn-icon {
		padding: 0.25rem 0.5rem;
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-secondary);
		border-radius: var(--radius-sm);
	}

	.btn-icon:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.empty-state {
		padding: var(--space-xl);
		text-align: center;
	}

	.empty-text {
		color: var(--color-fg-muted);
		margin-bottom: var(--space-md);
	}
</style>
