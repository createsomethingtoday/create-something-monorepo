<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fetchAdminJson, type AdminRequestError } from '$lib/admin/client';

	interface TagRecord {
		id: string;
		name: string;
		slug: string;
	}

	interface ExperimentRecord {
		id: string;
		slug?: string;
		title?: string;
		description?: string;
		excerpt?: string;
		content?: string;
		category?: string;
		featured?: boolean | number;
		published?: boolean | number;
		created_at?: string;
		updated_at?: string;
	}

	let experiment: ExperimentRecord | null = null;
	let loading = true;
	let saving = false;
	let loadError: AdminRequestError | null = null;

	// Form fields
	let title = '';
	let description = '';
	let content = '';
	let category = '';
	let featured = false;
	let published = true;

	// Tags
	let allTags: TagRecord[] = [];
	let selectedTagIds: string[] = [];

	onMount(async () => {
		await Promise.all([loadExperiment(), loadTags()]);
	});

	async function loadTags() {
		try {
			const result = await fetchAdminJson<TagRecord[]>('/api/admin/tags');
			if (result.ok) {
				allTags = result.data;
			}
		} catch (error) {
			console.error('Failed to load tags:', error);
		}
	}

	async function loadExperiment() {
		loading = true;
		loadError = null;
		const experimentId = $page.params.id;
		if (!experimentId) {
			loadError = {
				kind: 'error',
				status: 0,
				message: 'Missing experiment id'
			};
			experiment = null;
			loading = false;
			return;
		}

		try {
			const result = await fetchAdminJson<ExperimentRecord>(
				`/api/admin/experiments?id=${encodeURIComponent(experimentId)}`
			);

			if (!result.ok) {
				loadError = result.error;
				experiment = null;
				return;
			}

			experiment = result.data;
			title = experiment.title || '';
			description = experiment.description || experiment.excerpt || '';
			content = experiment.content || '';
			category = experiment.category || '';
			featured = !!experiment.featured;
			published = !!experiment.published;

			const tagsResult = await fetchAdminJson<TagRecord[]>('/api/admin/tags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ paper_id: experiment.id })
			});
			if (tagsResult.ok) {
				selectedTagIds = tagsResult.data.map((t) => t.id);
			}
		} catch (error) {
			console.error('Failed to load experiment:', error);
		} finally {
			loading = false;
		}
	}

	async function saveExperiment() {
		if (!experiment) {
			alert('Experiment not loaded');
			return;
		}

		saving = true;
		try {
			// Update experiment details
			const response = await fetchAdminJson<{ success: boolean }>('/api/admin/experiments', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: experiment.id,
					title,
					description,
					content,
					category,
					featured,
					published
				})
			});

			if (!response.ok) {
				alert(response.error.message);
				return;
			}

			// Update tags
			const tagsResponse = await fetchAdminJson<{ success: boolean }>('/api/admin/tags', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					paper_id: experiment.id,
					tag_ids: selectedTagIds
				})
			});

			if (!tagsResponse.ok) {
				alert(tagsResponse.error.message);
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

	function errorTitle(error: AdminRequestError | null) {
		if (!error) return 'Experiment not found';
		if (error.kind === 'unauthorized') return 'Sign in required';
		if (error.kind === 'forbidden') return 'Admin access required';
		if (error.kind === 'unavailable') return 'Experiment data unavailable';
		return error.status === 404 ? 'Experiment not found' : 'Unable to load experiment';
	}

	function errorMessage(error: AdminRequestError | null) {
		return error?.message || 'The requested experiment is not available in the admin experiment collection.';
	}
</script>

<SEO
	title="Admin - Edit Experiment"
	description="Administrative dashboard"
	propertyName="io"
	noindex={true}
/>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="page-title">Edit Experiment</h2>
			<p class="page-subtitle">Update experiment details</p>
		</div>
		<a href="/admin/experiments" class="back-link">← Back to Experiments</a>
	</div>

	{#if loading}
		<div class="loading-state">
			<div class="loading-text">Loading experiment...</div>
		</div>
	{:else if !experiment}
		<div class="error-state">
			<div class="error-title">{errorTitle(loadError)}</div>
			<div class="error-text">{errorMessage(loadError)}</div>
			<a href="/admin/experiments" class="error-link">
				← Back to Experiments
			</a>
		</div>
	{:else}
		<form onsubmit={(e) => { e.preventDefault(); saveExperiment(); }} class="space-y-6">
			<!-- Title -->
			<div>
				<label for="title" class="form-label">Title</label>
				<input
					type="text"
					id="title"
					bind:value={title}
					required
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
					placeholder="Short description or excerpt"
					class="form-textarea"
				></textarea>
			</div>

			<!-- Content -->
			<div>
				<label for="content" class="form-label">Content</label>
				<textarea
					id="content"
					bind:value={content}
					rows="20"
					placeholder="Full experiment content (supports Markdown)"
					class="form-textarea form-textarea--mono"
				></textarea>
				<p class="form-help">Markdown formatting supported</p>
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
				{#if category && !allTags.find(t => t.slug === category)}
					<p class="form-help">Current: {category} (custom value)</p>
				{/if}
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
				{#if allTags.length === 0}
					<p class="form-help">No tags available</p>
				{/if}
			</div>

			<!-- Toggles -->
			<div class="flex gap-6">
				<label class="checkbox-label">
					<input
						type="checkbox"
						bind:checked={featured}
						class="checkbox-input"
					/>
					<span>Featured</span>
				</label>

				<label class="checkbox-label">
					<input
						type="checkbox"
						bind:checked={published}
						class="checkbox-input"
					/>
					<span>Published</span>
				</label>
			</div>

			<!-- Experiment Info (read-only) -->
			<div class="info-section">
				<h3 class="info-title">Experiment Info</h3>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<div class="info-label">ID</div>
						<div class="info-value">{experiment.id}</div>
					</div>
					<div>
						<div class="info-label">Slug</div>
						<div class="info-value">{experiment.slug || 'N/A'}</div>
					</div>
					{#if experiment.created_at}
						<div>
							<div class="info-label">Created</div>
							<div class="info-value">{new Date(experiment.created_at).toLocaleDateString()}</div>
						</div>
					{/if}
					{#if experiment.updated_at}
						<div>
							<div class="info-label">Updated</div>
							<div class="info-value">{new Date(experiment.updated_at).toLocaleDateString()}</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Actions -->
			<div class="actions-section">
				<button
					type="submit"
					disabled={saving}
					class="btn btn--primary"
				>
					{saving ? 'Saving...' : 'Save Changes'}
				</button>
				<a
					href="/admin/experiments"
					class="btn btn--secondary"
				>
					Cancel
				</a>
			</div>
		</form>
	{/if}
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

	/* Links */
	.back-link {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		text-decoration: none;
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	/* Loading State */
	.loading-state {
		padding: var(--space-2xl);
		border-radius: var(--radius-lg);
		text-align: center;
	}

	.loading-text {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
		color: var(--color-fg-tertiary);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	/* Error State */
	.error-state {
		padding: var(--space-2xl);
		border-radius: var(--radius-lg);
		text-align: center;
	}

	.error-title {
		color: var(--color-fg-primary);
		font-weight: 600;
		margin-bottom: var(--space-xs);
	}

	.error-text {
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-md);
	}

	.error-link {
		display: inline-block;
		color: var(--color-fg-primary);
		text-decoration: none;
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.error-link:hover {
		color: var(--color-fg-secondary);
	}

	/* Buttons */
	.btn {
		padding: var(--space-sm) var(--space-lg);
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

	/* Form Elements */
	.form-label {
		display: block;
		font-size: var(--text-body-sm);
		font-weight: 500;
		margin-bottom: var(--space-sm);
		color: var(--color-fg-primary);
	}

	.form-input,
	.form-textarea,
	.form-select {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
	}

	.form-input::placeholder,
	.form-textarea::placeholder {
		color: var(--color-fg-muted);
	}

	.form-input:focus,
	.form-textarea:focus,
	.form-select:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.form-textarea--mono {
		font-family: ui-monospace, monospace;
		font-size: var(--text-body-sm);
	}

	.form-help {
		margin-top: var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Tag Buttons */
	.tag-btn {
		padding: 0.375rem var(--space-sm);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
		transition: all var(--duration-standard) var(--ease-standard);
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
		border: none;
		cursor: pointer;
	}

	.tag-btn:hover {
		background: var(--color-hover);
	}

	.tag-btn--active {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	/* Checkbox */
	.checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		cursor: pointer;
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
	}

	.checkbox-input {
		width: 1rem;
		height: 1rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	/* Info Section */
	.info-section {
		padding-top: var(--space-lg);
	}

	.info-title {
		font-size: var(--text-body-sm);
		font-weight: 500;
		margin-bottom: var(--space-sm);
		color: var(--color-fg-tertiary);
	}

	.info-label {
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
		font-size: var(--text-body-sm);
	}

	.info-value {
		color: var(--color-fg-secondary);
		font-family: ui-monospace, monospace;
		font-size: var(--text-caption);
	}

	/* Actions Section */
	.actions-section {
		display: flex;
		gap: var(--space-md);
		padding-top: var(--space-lg);
	}
</style>
