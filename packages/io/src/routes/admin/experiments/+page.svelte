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
			<h2 class="text-3xl font-bold mb-2">Experiments</h2>
			<p class="text-white/60">Manage CREATE SOMETHING experiments</p>
		</div>
		<div class="flex gap-3">
			<button
				onclick={bulkApplyTags}
				disabled={bulkTagging}
				class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
			>
				{bulkTagging ? 'Tagging...' : 'Auto-Tag All'}
			</button>
			<a
				href="/admin/experiments/new"
				class="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors font-semibold"
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
			class="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
		/>

		<select
			bind:value={filterCategory}
			class="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
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
				<div class="p-6 bg-white/5 border border-white/10 rounded-lg animate-pulse">
					<div class="h-6 bg-white/10 rounded w-1/3 mb-2"></div>
					<div class="h-4 bg-white/10 rounded w-2/3"></div>
				</div>
			{/each}
		</div>
	{:else if filteredExperiments.length === 0}
		<div class="text-center py-12 text-white/60">
			{#if searchQuery || filterCategory !== 'all'}
				No experiments match your filters.
			{:else}
				No experiments yet. Create your first one!
			{/if}
		</div>
	{:else}
		<div class="space-y-4">
			{#each filteredExperiments as experiment}
				<div class="p-6 bg-white/5 border border-white/10 rounded-lg hover:border-white/20 transition-colors">
					<div class="flex items-start justify-between mb-3">
						<div class="flex-1">
							<h3 class="text-xl font-semibold mb-2">{experiment.title || 'Untitled Experiment'}</h3>
							<div class="flex items-center gap-2 mb-2">
								{#if experiment.featured}
									<span class="px-2 py-1 bg-white/10 text-white/90 text-xs rounded">Featured</span>
								{/if}
								{#if experiment.category}
									<span class="px-2 py-1 bg-white/5 text-white/60 text-xs rounded"
										>{experiment.category}</span
									>
								{/if}
							</div>
							{#if experiment.description}
								<p class="text-white/60 text-sm">{experiment.description}</p>
							{/if}
						</div>

						<div class="flex gap-2">
							<button
								onclick={() => toggleFeature(experiment.id, experiment.featured)}
								class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
							>
								{experiment.featured ? 'Unfeature' : 'Feature'}
							</button>
							<a
								href="/admin/experiments/{experiment.id}/edit"
								class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
							>
								Edit
							</a>
							<button
								onclick={() => deleteExperiment(experiment.id)}
								class="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
							>
								Delete
							</button>
						</div>
					</div>

					<div class="flex items-center gap-4 text-sm text-white/40">
						{#if experiment.url}
							<a href={experiment.url} target="_blank" class="hover:text-white/60">
								View Live →
							</a>
						{/if}
						{#if experiment.created_at}
							<span>Created {new Date(experiment.created_at).toLocaleDateString()}</span>
						{/if}
						{#if experiment.execution_count}
							<span>{experiment.execution_count} executions</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Stats Summary -->
	<div class="border-t border-white/10 pt-6">
		<div class="grid grid-cols-3 gap-4 text-center">
			<div>
				<div class="text-2xl font-bold">{experiments.length}</div>
				<div class="text-sm text-white/60">Total Experiments</div>
			</div>
			<div>
				<div class="text-2xl font-bold">
					{experiments.filter((e) => e.featured).length}
				</div>
				<div class="text-sm text-white/60">Featured</div>
			</div>
			<div>
				<div class="text-2xl font-bold">
					{experiments.reduce((sum, e) => sum + (e.execution_count || 0), 0)}
				</div>
				<div class="text-sm text-white/60">Total Executions</div>
			</div>
		</div>
	</div>
</div>
