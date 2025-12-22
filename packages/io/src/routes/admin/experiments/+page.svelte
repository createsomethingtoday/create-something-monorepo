<script lang="ts">
	import { onMount } from 'svelte';

	let experiments: any[] = [];
	let loading = true;
	let filterCategory = 'all';
	let searchQuery = '';
	let bulkTagging = false;

	const categories = ['all', 'design', 'engineering', 'research', 'product'];

	onMount(async () => {
		await loadExperiments();
	});

	async function loadExperiments() {
		loading = true;
		try {
			const response = await fetch('/api/admin/experiments');
			if (response.ok) {
				experiments = await response.json();
			}
		} catch (error) {
			console.error('Failed to load experiments:', error);
		} finally {
			loading = false;
		}
	}

	async function bulkApplyTags() {
		if (!confirm('This will automatically tag all experiments based on their content and category. Continue?')) {
			return;
		}

		bulkTagging = true;
		try {
			const response = await fetch('/api/admin/bulk-tag', {
				method: 'POST'
			});

			if (response.ok) {
				const result = await response.json();
				alert(result.message);
				await loadExperiments();
			} else {
				alert('Failed to apply bulk tags');
			}
		} catch (error) {
			console.error('Failed to bulk tag:', error);
			alert('Failed to apply bulk tags');
		} finally {
			bulkTagging = false;
		}
	}

	async function toggleFeature(experimentId: string, currentStatus: boolean) {
		try {
			const response = await fetch('/api/admin/experiments', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: experimentId,
					featured: !currentStatus
				})
			});

			if (response.ok) {
				await loadExperiments();
			}
		} catch (error) {
			console.error('Failed to toggle feature:', error);
		}
	}

	async function deleteExperiment(experimentId: string) {
		if (!confirm('Are you sure you want to delete this experiment?')) return;

		try {
			const response = await fetch('/api/admin/experiments', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: experimentId })
			});

			if (response.ok) {
				await loadExperiments();
			}
		} catch (error) {
			console.error('Failed to delete experiment:', error);
		}
	}

	$: filteredExperiments = experiments.filter((exp) => {
		const matchesCategory = filterCategory === 'all' || exp.category === filterCategory;
		const matchesSearch =
			searchQuery === '' ||
			exp.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			exp.description?.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesCategory && matchesSearch;
	});
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="page-title">Experiments</h2>
			<p class="page-subtitle">Manage CREATE SOMETHING experiments</p>
		</div>
		<div class="flex gap-3">
			<button
				onclick={bulkApplyTags}
				disabled={bulkTagging}
				class="btn btn--secondary"
			>
				{bulkTagging ? 'Tagging...' : 'Auto-Tag All'}
			</button>
			<a
				href="/admin/experiments/new"
				class="btn btn--primary"
			>
				+ New Experiment
			</a>
		</div>
	</div>

	<!-- Filters -->
	<div class="flex gap-4 items-center">
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search experiments..."
			class="search-input"
		/>

		<select
			bind:value={filterCategory}
			class="category-select"
		>
			{#each categories as category}
				<option value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</option>
			{/each}
		</select>
	</div>

	<!-- Experiments List -->
	{#if loading}
		<div class="space-y-4">
			{#each [1, 2, 3] as _}
				<div class="skeleton-card">
					<div class="skeleton-title"></div>
					<div class="skeleton-text"></div>
				</div>
			{/each}
		</div>
	{:else if filteredExperiments.length === 0}
		<div class="empty-state">
			{#if searchQuery || filterCategory !== 'all'}
				No experiments match your filters.
			{:else}
				No experiments yet. Create your first one!
			{/if}
		</div>
	{:else}
		<div class="space-y-4">
			{#each filteredExperiments as experiment}
				<div class="experiment-card">
					<div class="flex items-start justify-between mb-3">
						<div class="flex-1">
							<h3 class="experiment-title">{experiment.title || 'Untitled Experiment'}</h3>
							<div class="flex items-center gap-2 mb-2">
								{#if experiment.featured}
									<span class="badge badge--featured">Featured</span>
								{/if}
								{#if experiment.category}
									<span class="badge badge--category">{experiment.category}</span>
								{/if}
							</div>
							{#if experiment.description}
								<p class="experiment-description">{experiment.description}</p>
							{/if}
						</div>

						<div class="flex gap-2">
							<button
								onclick={() => toggleFeature(experiment.id, experiment.featured)}
								class="action-btn"
							>
								{experiment.featured ? 'Unfeature' : 'Feature'}
							</button>
							<a
								href="/admin/experiments/{experiment.id}/edit"
								class="action-btn"
							>
								Edit
							</a>
							<button
								onclick={() => deleteExperiment(experiment.id)}
								class="action-btn action-btn--danger"
							>
								Delete
							</button>
						</div>
					</div>

					<div class="flex items-center gap-4">
						{#if experiment.url}
							<a href={experiment.url} target="_blank" class="experiment-link">
								View Live →
							</a>
						{/if}
						{#if experiment.created_at}
							<span class="experiment-meta">Created {new Date(experiment.created_at).toLocaleDateString()}</span>
						{/if}
						{#if experiment.execution_count}
							<span class="experiment-meta">{experiment.execution_count} executions</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Stats Summary -->
	<div class="stats-section">
		<div class="grid grid-cols-3 gap-4">
			<div class="stat-item">
				<div class="stat-value">{experiments.length}</div>
				<div class="stat-label">Total Experiments</div>
			</div>
			<div class="stat-item">
				<div class="stat-value">
					{experiments.filter((e) => e.featured).length}
				</div>
				<div class="stat-label">Featured</div>
			</div>
			<div class="stat-item">
				<div class="stat-value">
					{experiments.reduce((sum, e) => sum + (e.execution_count || 0), 0)}
				</div>
				<div class="stat-label">Total Executions</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Typography */
	.page-title {
		font-size: var(--text-h1);
		font-weight: 700;
		margin-bottom: var(--space-sm);
		color: var(--color-fg-primary);
	}

	.page-subtitle {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body);
	}

	/* Buttons */
	.btn {
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-lg);
		font-weight: 600;
		transition: all var(--duration-standard) var(--ease-standard);
		border: none;
		cursor: pointer;
		text-decoration: none;
		display: inline-block;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn--primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.btn--primary:hover:not(:disabled) {
		background: var(--color-fg-secondary);
	}

	.btn--secondary {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
	}

	.btn--secondary:hover:not(:disabled) {
		background: var(--color-hover);
	}

	/* Form Inputs */
	.search-input {
		flex: 1;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
	}

	.search-input::placeholder {
		color: var(--color-fg-muted);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.category-select {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		cursor: pointer;
	}

	.category-select:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	/* Skeleton Loading */
	.skeleton-card {
		padding: var(--space-lg);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	.skeleton-title {
		height: 1.5rem;
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
		width: 33.333333%;
		margin-bottom: var(--space-sm);
	}

	.skeleton-text {
		height: 1rem;
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
		width: 66.666667%;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: var(--space-2xl);
		color: var(--color-fg-tertiary);
	}

	/* Experiment Cards */
	.experiment-card {
		padding: var(--space-lg);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: border-color var(--duration-standard) var(--ease-standard);
	}

	.experiment-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.experiment-title {
		font-size: var(--text-h3);
		font-weight: 600;
		margin-bottom: var(--space-sm);
		color: var(--color-fg-primary);
	}

	.experiment-description {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	/* Badges */
	.badge {
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
	}

	.badge--featured {
		background: var(--color-bg-surface);
		color: var(--color-fg-secondary);
	}

	.badge--category {
		background: var(--color-bg-elevated);
		color: var(--color-fg-tertiary);
	}

	/* Action Buttons */
	.action-btn {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		transition: all var(--duration-standard) var(--ease-standard);
		cursor: pointer;
		text-decoration: none;
		display: inline-block;
	}

	.action-btn:hover {
		background: var(--color-hover);
	}

	.action-btn--danger {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	.action-btn--danger:hover {
		background: var(--color-error-border);
	}

	/* Experiment Metadata */
	.experiment-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.experiment-link:hover {
		color: var(--color-fg-primary);
	}

	.experiment-meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Stats Section */
	.stats-section {
		border-top: 1px solid var(--color-border-default);
		padding-top: var(--space-lg);
	}

	.stat-item {
		text-align: center;
	}

	.stat-value {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.stat-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-top: var(--space-xs);
	}
</style>
