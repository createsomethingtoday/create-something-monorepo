<script lang="ts">
	import type { PageData } from './$types';
	import { SEO } from '@create-something/canon';
	import { getAdminExperimentCatalogStats } from '$lib/admin/experiment-catalog';

	let { data }: { data: PageData } = $props();
	let searchQuery = $state('');
	let filterCategory = $state('all');

	const catalog = $derived(data.catalog);
	const experiments = $derived(catalog.status === 'ready' ? catalog.experiments : []);
	const stats = $derived(getAdminExperimentCatalogStats(catalog));
	const categories = $derived([
		'all',
		...Array.from(new Set(experiments.map((experiment) => experiment.category))).sort()
	]);
	const filteredExperiments = $derived(
		experiments.filter((experiment) => {
			const matchesCategory =
				filterCategory === 'all' || experiment.category === filterCategory;
			const query = searchQuery.trim().toLowerCase();
			const matchesSearch =
				query.length === 0 ||
				experiment.title.toLowerCase().includes(query) ||
				experiment.description.toLowerCase().includes(query);

			return matchesCategory && matchesSearch;
		})
	);

	function formatDate(value: string | null) {
		if (!value) return null;
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
	}
</script>

<SEO
	title="Admin - Experiments"
	description="Read-only repository experiment catalog"
	propertyName="io"
	noindex={true}
/>

<div class="space-y-6">
	<header class="page-header">
		<div>
			<div class="title-row">
				<h2 class="page-title">Experiments</h2>
				<span class="read-only-badge">Read-only</span>
			</div>
			<p class="page-subtitle">
				Repository-owned experiment catalog. Changes ship through reviewed source artifacts.
			</p>
		</div>
		<a href="/experiments" class="public-link">View public catalog →</a>
	</header>

	{#if catalog.status === 'unavailable'}
		<div class="empty-state error-state" role="alert">
			<strong>Experiment catalog unavailable</strong>
			<span>{catalog.message}</span>
			<span>Catalog metrics are unavailable until the repository source can be read.</span>
		</div>
	{:else}
		<div class="catalog-note">
			<strong>Source of truth: repository</strong>
			<span>
				Add or revise experiments through <code>fileBasedExperiments.ts</code>, reviewed content,
				and the normal production promotion path.
			</span>
		</div>

		<div class="filters">
			<label class="sr-only" for="experiment-search">Search experiments</label>
			<input
				id="experiment-search"
				type="search"
				bind:value={searchQuery}
				placeholder="Search experiments..."
				class="search-input"
			/>

			<label class="sr-only" for="experiment-category">Filter by category</label>
			<select id="experiment-category" bind:value={filterCategory} class="category-select">
				{#each categories as category}
					<option value={category}>
						{category === 'all' ? 'All categories' : category}
					</option>
				{/each}
			</select>
		</div>

		{#if filteredExperiments.length === 0}
			<div class="empty-state">
				{#if searchQuery || filterCategory !== 'all'}
					No experiments match these filters.
				{:else}
					The repository catalog contains no experiments.
				{/if}
			</div>
		{:else}
			<div class="experiment-list">
				{#each filteredExperiments as experiment (experiment.id)}
					<article class="experiment-card">
						<div class="card-copy">
							<h3 class="experiment-title">{experiment.title}</h3>
							<div class="badges">
								{#if experiment.featured}
									<span class="badge badge--featured">Featured</span>
								{/if}
								<span class="badge badge--category">{experiment.category}</span>
							</div>
							{#if experiment.description}
								<p class="experiment-description">{experiment.description}</p>
							{/if}
							{#if formatDate(experiment.updatedAt)}
								<span class="experiment-meta">Updated {formatDate(experiment.updatedAt)}</span>
							{/if}
						</div>
						<a href={experiment.publicPath} class="experiment-link">View published →</a>
					</article>
				{/each}
			</div>
		{/if}

		<section class="stats-section" aria-label="Catalog summary">
			<div class="stat-item">
				<div class="stat-value">{stats.total ?? '—'}</div>
				<div class="stat-label">Published Experiments</div>
			</div>
			<div class="stat-item">
				<div class="stat-value">{stats.featured ?? '—'}</div>
				<div class="stat-label">Featured</div>
			</div>
			<div class="stat-item">
				<div class="stat-value stat-value--text">Repository</div>
				<div class="stat-label">Authoring Source</div>
			</div>
		</section>
	{/if}
</div>

<style>
	.page-header,
	.title-row,
	.filters,
	.experiment-card,
	.badges {
		display: flex;
		align-items: center;
	}

	.page-header,
	.experiment-card {
		justify-content: space-between;
		gap: var(--space-performance-lg);
	}

	.title-row,
	.badges {
		gap: var(--space-performance-sm);
	}

	.page-title {
		font-size: var(--text-performance-h1);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
	}

	.page-subtitle,
	.experiment-description,
	.experiment-meta,
	.stat-label {
		color: var(--color-performance-fg-tertiary);
	}

	.page-subtitle {
		margin-top: var(--space-performance-xs);
		font-size: var(--text-performance-body);
	}

	.read-only-badge,
	.badge {
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-caption);
	}

	.read-only-badge,
	.badge--featured {
		background: var(--color-performance-bg-surface);
		color: var(--color-performance-fg-secondary);
	}

	.public-link,
	.experiment-link {
		color: var(--color-performance-fg-secondary);
		text-decoration: none;
		white-space: nowrap;
	}

	.public-link:hover,
	.experiment-link:hover {
		color: var(--color-performance-fg-primary);
	}

	.catalog-note {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
		padding: var(--space-performance-md);
		border-radius: var(--radius-performance-scale-lg);
		background: var(--color-performance-bg-surface);
		color: var(--color-performance-fg-secondary);
	}

	.catalog-note span {
		color: var(--color-performance-fg-tertiary);
	}

	.filters {
		gap: var(--space-performance-md);
	}

	.search-input,
	.category-select {
		padding: var(--space-performance-sm) var(--space-performance-md);
		border-radius: var(--radius-performance-scale-lg);
		color: var(--color-performance-fg-primary);
		font-size: var(--text-performance-body);
	}

	.search-input {
		flex: 1;
	}

	.search-input:focus,
	.category-select:focus {
		outline: none;
		border-color: var(--color-performance-border-emphasis);
	}

	.empty-state {
		padding: var(--space-performance-2xl);
		text-align: center;
		color: var(--color-performance-fg-tertiary);
	}

	.error-state {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
		color: var(--color-performance-error);
	}

	.experiment-list {
		display: grid;
		gap: var(--space-performance-md);
	}

	.experiment-card {
		padding: var(--space-performance-lg);
		border-radius: var(--radius-performance-scale-lg);
	}

	.card-copy {
		display: grid;
		gap: var(--space-performance-sm);
	}

	.experiment-title {
		font-size: var(--text-performance-h3);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
	}

	.badge--category {
		color: var(--color-performance-fg-tertiary);
	}

	.experiment-description,
	.experiment-meta,
	.stat-label {
		font-size: var(--text-performance-body-sm);
	}

	.stats-section {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-performance-md);
		padding-top: var(--space-performance-lg);
	}

	.stat-item {
		text-align: center;
	}

	.stat-value {
		font-size: var(--text-performance-h1);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
	}

	.stat-value--text {
		font-size: var(--text-performance-h3);
	}

	.stat-label {
		margin-top: var(--space-performance-xs);
	}

	@media (max-width: 720px) {
		.page-header,
		.experiment-card,
		.filters {
			align-items: stretch;
			flex-direction: column;
		}

		.stats-section {
			grid-template-columns: 1fr;
		}
	}
</style>
