<script lang="ts">
	import { goto } from '$app/navigation';

	let title = '';
	let description = '';
	let content = '';
	let category = '';
	let url = '';
	let featured = false;
	let published = true;
	let selectedTagIds: string[] = [];
	let allTags: any[] = [];
	let loading = false;
	let error = '';

	async function loadTags() {
		try {
			const response = await fetch('/api/admin/tags');
			if (response.ok) {
				allTags = await response.json();
			}
		} catch (err) {
			console.error('Failed to load tags:', err);
		}
	}

	loadTags();

	function toggleTag(tagId: string) {
		if (selectedTagIds.includes(tagId)) {
			selectedTagIds = selectedTagIds.filter((id) => id !== tagId);
		} else {
			selectedTagIds = [...selectedTagIds, tagId];
		}
	}

	async function createExperiment() {
		if (!title.trim()) {
			error = 'Title is required';
			return;
		}

		loading = true;
		error = '';

		try {
			// Create the experiment
			const createResponse = await fetch('/api/admin/experiments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					description,
					content,
					category,
					url,
					featured,
					published
				})
			});

			if (!createResponse.ok) {
				throw new Error('Failed to create experiment');
			}

			const { id } = await createResponse.json();

			// Update tags if any selected
			if (selectedTagIds.length > 0) {
				await fetch('/api/admin/tags', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						paper_id: id,
						tag_ids: selectedTagIds
					})
				});
			}

			// Redirect to experiments list
			goto('/admin/experiments');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create experiment';
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-3xl font-bold mb-2">New Experiment</h2>
			<p class="text-white/60">Create a new CREATE SOMETHING experiment</p>
		</div>
		<a
			href="/admin/experiments"
			class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
		>
			← Back to Experiments
		</a>
	</div>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			createExperiment();
		}}
		class="space-y-6"
	>
		{#if error}
			<div class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
				{error}
			</div>
		{/if}

		<!-- Title -->
		<div>
			<label for="title" class="block text-sm font-medium mb-2">Title *</label>
			<input
				id="title"
				type="text"
				bind:value={title}
				required
				placeholder="Multi-User Gmail→Notion Sync"
				class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
			/>
		</div>

		<!-- Description -->
		<div>
			<label for="description" class="block text-sm font-medium mb-2">Description</label>
			<textarea
				id="description"
				bind:value={description}
				rows="3"
				placeholder="Brief description of the experiment..."
				class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
			></textarea>
		</div>

		<!-- Content -->
		<div>
			<label for="content" class="block text-sm font-medium mb-2"
				>Content (Markdown supported)</label
			>
			<textarea
				id="content"
				bind:value={content}
				rows="20"
				placeholder="# Experiment Content

## Overview
Detailed explanation of the experiment...

## Implementation
Technical details...

## Results
Outcomes and learnings..."
				class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 font-mono text-sm"
			></textarea>
		</div>

		<!-- Category -->
		<div>
			<label for="category" class="block text-sm font-medium mb-2">Category</label>
			<select
				id="category"
				bind:value={category}
				class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
			>
				<option value="">Select a category</option>
				{#each allTags as tag}
					<option value={tag.slug}>{tag.name}</option>
				{/each}
			</select>
			<p class="mt-1 text-xs text-white/40">
				Category determines the experiment's primary classification
			</p>
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
			<p class="mt-1 text-xs text-white/40">
				Tags help categorize and filter experiments across the system
			</p>
		</div>

		<!-- URL -->
		<div>
			<label for="url" class="block text-sm font-medium mb-2">URL (optional)</label>
			<input
				id="url"
				type="url"
				bind:value={url}
				placeholder="https://example.com/experiment"
				class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
			/>
		</div>

		<!-- Options -->
		<div class="flex gap-6">
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="checkbox" bind:checked={featured} class="w-4 h-4" />
				<span class="text-sm">Featured</span>
			</label>

			<label class="flex items-center gap-2 cursor-pointer">
				<input type="checkbox" bind:checked={published} class="w-4 h-4" />
				<span class="text-sm">Published</span>
			</label>
		</div>

		<!-- Actions -->
		<div class="flex gap-3 pt-4">
			<button
				type="submit"
				disabled={loading}
				class="px-6 py-3 bg-white text-black rounded-lg hover:bg-white/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{loading ? 'Creating...' : 'Create Experiment'}
			</button>

			<a
				href="/admin/experiments"
				class="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-semibold"
			>
				Cancel
			</a>
		</div>
	</form>
</div>
