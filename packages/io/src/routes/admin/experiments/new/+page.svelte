<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { goto } from '$app/navigation';

	interface TagRecord {
		id: string;
		name: string;
		slug: string;
	}

	let title = '';
	let description = '';
	let content = '';
	let category = '';
	let url = '';
	let featured = false;
	let published = true;
	let selectedTagIds: string[] = [];
	let allTags: TagRecord[] = [];
	let loading = false;
	let error = '';

	async function loadTags() {
		try {
			const response = await fetch('/api/admin/tags');
			if (response.ok) {
				allTags = (await response.json()) as TagRecord[];
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

			const created = (await createResponse.json()) as { id?: string };
			if (!created.id) {
				throw new Error('Failed to create experiment');
			}

			// Update tags if any selected
			if (selectedTagIds.length > 0) {
				await fetch('/api/admin/tags', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						paper_id: created.id,
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

<SEO
	title="Admin - New Experiment"
	description="Administrative dashboard"
	propertyName="io"
	noindex={true}
/>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="page-title">New Experiment</h2>
			<p class="page-subtitle">Create a new CREATE SOMETHING experiment</p>
		</div>
		<a
			href="/admin/experiments"
			class="back-link"
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
			<div class="error-alert">
				{error}
			</div>
		{/if}

		<!-- Title -->
		<div>
			<label for="title" class="form-label">Title *</label>
			<input
				id="title"
				type="text"
				bind:value={title}
				required
				placeholder="Multi-User Gmail→Notion Sync"
				class="form-input"
			/>
		</div>

		<!-- Description -->
		<div>
			<label for="description" class="form-label">Description</label>
			<textarea
				id="description"
				bind:value={description}
				rows="3"
				placeholder="Brief description of the experiment..."
				class="form-textarea"
			></textarea>
		</div>

		<!-- Content -->
		<div>
			<label for="content" class="form-label">Content (Markdown supported)</label>
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
				class="form-textarea form-textarea--mono"
			></textarea>
		</div>

		<!-- Category -->
		<div>
			<label for="category" class="form-label">Category</label>
			<select
				id="category"
				bind:value={category}
				class="form-select"
			>
				<option value="">Select a category</option>
				{#each allTags as tag}
					<option value={tag.slug}>{tag.name}</option>
				{/each}
			</select>
			<p class="form-help">
				Category determines the experiment's primary classification
			</p>
		</div>

			<!-- Tags -->
			<div>
				<p class="form-label">Tags (Multi-select)</p>
				<div class="flex flex-wrap gap-2">
					{#each allTags as tag}
					<button
						type="button"
						onclick={() => toggleTag(tag.id)}
						class="tag-btn {selectedTagIds.includes(tag.id) ? 'tag-btn--active' : ''}"
					>
						{tag.name}
					</button>
				{/each}
			</div>
			<p class="form-help">
				Tags help categorize and filter experiments across the system
			</p>
		</div>

		<!-- URL -->
		<div>
			<label for="url" class="form-label">URL (optional)</label>
			<input
				id="url"
				type="url"
				bind:value={url}
				placeholder="https://example.com/experiment"
				class="form-input"
			/>
		</div>

		<!-- Options -->
		<div class="flex gap-6">
			<label class="checkbox-label">
				<input type="checkbox" bind:checked={featured} class="checkbox-input" />
				<span>Featured</span>
			</label>

			<label class="checkbox-label">
				<input type="checkbox" bind:checked={published} class="checkbox-input" />
				<span>Published</span>
			</label>
		</div>

		<!-- Actions -->
		<div class="flex gap-3 pt-4">
			<button
				type="submit"
				disabled={loading}
				class="btn btn--primary"
			>
				{loading ? 'Creating...' : 'Create Experiment'}
			</button>

			<a
				href="/admin/experiments"
				class="btn btn--secondary"
			>
				Cancel
			</a>
		</div>
	</form>
</div>

<style>
	/* Typography */
	.page-title {
		font-size: var(--text-performance-h1);
		font-weight: 700;
		margin-bottom: var(--space-performance-sm);
		color: var(--color-performance-fg-primary);
	}

	.page-subtitle {
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-body);
	}

	/* Links */
	.back-link {
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		color: var(--color-performance-fg-primary);
		text-decoration: none;
		transition: all var(--duration-performance-standard) var(--ease-performance-standard);
	}

	.back-link:hover {
		background: var(--color-performance-hover);
	}

	/* Buttons */
	.btn {
		padding: var(--space-performance-sm) var(--space-performance-lg);
		border-radius: var(--radius-performance-scale-lg);
		font-weight: 600;
		transition: all var(--duration-performance-standard) var(--ease-performance-standard);
		border: none;
		cursor: pointer;
		text-decoration: none;
		display: inline-block;
		text-align: center;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn--primary {
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-pure);
	}

	.btn--primary:hover:not(:disabled) {
		background: var(--color-performance-fg-secondary);
	}

	.btn--secondary {
		background: var(--color-performance-bg-surface);
		color: var(--color-performance-fg-primary);
	}

	.btn--secondary:hover:not(:disabled) {
		background: var(--color-performance-hover);
	}

	/* Error Alert */
	.error-alert {
		padding: var(--space-performance-md);
		background: var(--color-performance-error-muted);
		border: 1px solid var(--color-performance-error-border);
		border-radius: var(--radius-performance-scale-lg);
		color: var(--color-performance-error);
	}

	/* Form Elements */
	.form-label {
		display: block;
		font-size: var(--text-performance-body-sm);
		font-weight: 500;
		margin-bottom: var(--space-performance-sm);
		color: var(--color-performance-fg-primary);
	}

	.form-input,
	.form-textarea,
	.form-select {
		width: 100%;
		padding: var(--space-performance-sm) var(--space-performance-md);
		border-radius: var(--radius-performance-scale-lg);
		color: var(--color-performance-fg-primary);
		font-size: var(--text-performance-body);
	}

	.form-input::placeholder,
	.form-textarea::placeholder {
		color: var(--color-performance-fg-muted);
	}

	.form-input:focus,
	.form-textarea:focus,
	.form-select:focus {
		outline: none;
		border-color: var(--color-performance-border-emphasis);
	}

	.form-textarea--mono {
		font-family: ui-monospace, monospace;
		font-size: var(--text-performance-body-sm);
	}

	.form-help {
		margin-top: var(--space-performance-xs);
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	/* Tag Buttons */
	.tag-btn {
		padding: 0.375rem var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-lg);
		font-size: var(--text-performance-body-sm);
		transition: all var(--duration-performance-standard) var(--ease-performance-standard);
		background: var(--color-performance-bg-surface);
		color: var(--color-performance-fg-primary);
		border: none;
		cursor: pointer;
	}

	.tag-btn:hover {
		background: var(--color-performance-hover);
	}

	.tag-btn--active {
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-pure);
	}

	/* Checkbox */
	.checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		cursor: pointer;
		color: var(--color-performance-fg-primary);
		font-size: var(--text-performance-body-sm);
	}

	.checkbox-input {
		width: 1rem;
		height: 1rem;
		cursor: pointer;
	}
</style>
