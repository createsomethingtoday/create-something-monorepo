<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let experiment: any = null;
	let loading = true;
	let saving = false;

	// Form fields
	let title = '';
	let description = '';
	let content = '';
	let category = '';
	let featured = false;
	let published = true;

	// Tags
	let allTags: any[] = [];
	let selectedTagIds: string[] = [];

	onMount(async () => {
		await Promise.all([loadExperiment(), loadTags()]);
	});

	async function loadTags() {
		try {
			const response = await fetch('/api/admin/tags');
			if (response.ok) {
				allTags = await response.json();
			}
		} catch (error) {
			console.error('Failed to load tags:', error);
		}
	}

	async function loadExperiment() {
		loading = true;
		try {
			const response = await fetch('/api/admin/experiments');
			if (response.ok) {
				const experiments = await response.json();
				experiment = experiments.find((e: any) => e.id === $page.params.id);

				if (experiment) {
					title = experiment.title || '';
					description = experiment.description || experiment.excerpt || '';
					content = experiment.content || '';
					category = experiment.category || '';
					featured = !!experiment.featured;
					published = !!experiment.published;

					// Load tags for this experiment
					const tagsResponse = await fetch('/api/admin/tags', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ paper_id: experiment.id })
					});
					if (tagsResponse.ok) {
						const experimentTags = await tagsResponse.json();
						selectedTagIds = experimentTags.map((t: any) => t.id);
					}
				}
			}
		} catch (error) {
			console.error('Failed to load experiment:', error);
		} finally {
			loading = false;
		}
	}

	async function saveExperiment() {
		saving = true;
		try {
			// Update experiment details
			const response = await fetch('/api/admin/experiments', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: $page.params.id,
					title,
					description,
					content,
					category,
					featured,
					published
				})
			});

			if (!response.ok) {
				alert('Failed to save experiment');
				return;
			}

			// Update tags
			const tagsResponse = await fetch('/api/admin/tags', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					paper_id: $page.params.id,
					tag_ids: selectedTagIds
				})
			});

			if (!tagsResponse.ok) {
				alert('Failed to save tags');
				return;
			}

			goto('/admin/experiments');
		} catch (error) {
			console.error('Failed to save experiment:', error);
			alert('Failed to save experiment');
		} finally {
			saving = false;
		}
	}

	function toggleTag(tagId: string) {
		if (selectedTagIds.includes(tagId)) {
			selectedTagIds = selectedTagIds.filter(id => id !== tagId);
		} else {
			selectedTagIds = [...selectedTagIds, tagId];
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-3xl font-bold mb-2">Edit Experiment</h2>
			<p class="text-white/60">Update experiment details</p>
		</div>
		<a href="/admin/experiments" class="text-white/60 hover:text-white text-sm">← Back to Experiments</a>
	</div>

	{#if loading}
		<div class="p-12 bg-white/5 border border-white/10 rounded-lg text-center">
			<div class="animate-pulse text-white/60">Loading experiment...</div>
		</div>
	{:else if !experiment}
		<div class="p-12 bg-white/5 border border-white/10 rounded-lg text-center">
			<div class="text-white/60">Experiment not found</div>
			<a href="/admin/experiments" class="mt-4 inline-block text-white hover:text-white/80">
				← Back to Experiments
			</a>
		</div>
	{:else}
		<form onsubmit={(e) => { e.preventDefault(); saveExperiment(); }} class="space-y-6">
			<!-- Title -->
			<div>
				<label for="title" class="block text-sm font-medium mb-2">Title</label>
				<input
					type="text"
					id="title"
					bind:value={title}
					required
					class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
				/>
			</div>

			<!-- Description -->
			<div>
				<label for="description" class="block text-sm font-medium mb-2">Description</label>
				<textarea
					id="description"
					bind:value={description}
					rows="3"
					placeholder="Short description or excerpt"
					class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
				></textarea>
			</div>

			<!-- Content -->
			<div>
				<label for="content" class="block text-sm font-medium mb-2">Content</label>
				<textarea
					id="content"
					bind:value={content}
					rows="20"
					placeholder="Full experiment content (supports Markdown)"
					class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 font-mono text-sm"
				></textarea>
				<p class="text-xs text-white/40 mt-1">Markdown formatting supported</p>
			</div>

			<!-- Category -->
			<div>
				<label for="category" class="block text-sm font-medium mb-2">Category</label>
				<select
					id="category"
					bind:value={category}
					class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
				>
					<option value="">Select a category</option>
					{#each allTags as tag}
						<option value={tag.slug}>{tag.name}</option>
					{/each}
				</select>
				{#if category && !allTags.find(t => t.slug === category)}
					<p class="text-xs text-white/40 mt-1">Current: {category} (custom value)</p>
				{/if}
			</div>

			<!-- Tags -->
			<div>
				<label class="block text-sm font-medium mb-2">Tags (Multi-select)</label>
				<div class="flex flex-wrap gap-2">
					{#each allTags as tag}
						<button
							type="button"
							onclick={() => toggleTag(tag.id)}
							class="px-3 py-1.5 rounded-lg text-sm transition-colors {selectedTagIds.includes(tag.id)
								? 'bg-white text-black'
								: 'bg-white/10 text-white hover:bg-white/20'}"
						>
							{tag.name}
						</button>
					{/each}
				</div>
				{#if allTags.length === 0}
					<p class="text-xs text-white/40 mt-2">No tags available</p>
				{/if}
			</div>

			<!-- Toggles -->
			<div class="flex gap-6">
				<label class="flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={featured}
						class="w-4 h-4 rounded border-white/10 bg-white/5 text-white focus:ring-white/30"
					/>
					<span class="text-sm">Featured</span>
				</label>

				<label class="flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={published}
						class="w-4 h-4 rounded border-white/10 bg-white/5 text-white focus:ring-white/30"
					/>
					<span class="text-sm">Published</span>
				</label>
			</div>

			<!-- Experiment Info (read-only) -->
			<div class="border-t border-white/10 pt-6">
				<h3 class="text-sm font-medium mb-3 text-white/60">Experiment Info</h3>
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<div class="text-white/40 mb-1">ID</div>
						<div class="text-white/80 font-mono text-xs">{experiment.id}</div>
					</div>
					<div>
						<div class="text-white/40 mb-1">Slug</div>
						<div class="text-white/80 font-mono text-xs">{experiment.slug || 'N/A'}</div>
					</div>
					{#if experiment.created_at}
						<div>
							<div class="text-white/40 mb-1">Created</div>
							<div class="text-white/80">{new Date(experiment.created_at).toLocaleDateString()}</div>
						</div>
					{/if}
					{#if experiment.updated_at}
						<div>
							<div class="text-white/40 mb-1">Updated</div>
							<div class="text-white/80">{new Date(experiment.updated_at).toLocaleDateString()}</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Actions -->
			<div class="flex gap-4 border-t border-white/10 pt-6">
				<button
					type="submit"
					disabled={saving}
					class="px-6 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors font-semibold disabled:opacity-50"
				>
					{saving ? 'Saving...' : 'Save Changes'}
				</button>
				<a
					href="/admin/experiments"
					class="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
				>
					Cancel
				</a>
			</div>
		</form>
	{/if}
</div>
