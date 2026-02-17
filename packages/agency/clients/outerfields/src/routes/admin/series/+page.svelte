<script lang="ts">
	import type { PageData } from './$types';

	type Visibility = 'draft' | 'published' | 'archived';
	type HomeFilter = 'series' | 'films' | 'bts' | 'trailers';

	interface EditableSeries {
		id: string;
		slug: string;
		title: string;
		description: string;
		visibility: Visibility;
		sort_order: number;
		homeFilters: HomeFilter[];
		isSaving?: boolean;
		lastError?: string | null;
	}

	const AVAILABLE_FILTERS: Array<{ id: HomeFilter; label: string }> = [
		{ id: 'series', label: 'Series' },
		{ id: 'films', label: 'Films' },
		{ id: 'bts', label: 'Behind the Scenes' },
		{ id: 'trailers', label: 'Trailers' }
	];

	let { data }: { data: PageData } = $props();

	function parseHomeFilters(value: string): HomeFilter[] {
		try {
			const parsed = JSON.parse(value) as unknown;
			if (!Array.isArray(parsed)) return [];
			return parsed.filter((entry) => typeof entry === 'string') as HomeFilter[];
		} catch {
			return [];
		}
	}

	let series = $state<EditableSeries[]>(
		(data.series || []).map((row) => ({
			id: row.id,
			slug: row.slug,
			title: row.title,
			description: row.description ?? '',
			visibility: row.visibility,
			sort_order: row.sort_order,
			homeFilters: parseHomeFilters(row.home_filters),
			isSaving: false,
			lastError: null
		}))
	);

	let createSlug = $state('');
	let createTitle = $state('');
	let createDescription = $state('');
	let createError = $state<string | null>(null);
	let createSaving = $state(false);

	function toggleFilter(item: EditableSeries, filter: HomeFilter) {
		const next = new Set(item.homeFilters);
		if (next.has(filter)) next.delete(filter);
		else next.add(filter);
		item.homeFilters = Array.from(next);
	}

	async function saveSeries(item: EditableSeries) {
		item.isSaving = true;
		item.lastError = null;

		try {
			const response = await fetch(`/api/v1/admin/series/${item.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: item.title,
					description: item.description,
					visibility: item.visibility,
					sort_order: item.sort_order,
					home_filters: item.homeFilters
				})
			});

			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(result?.error || 'Failed to save series');
			}

			// Normalize server response back into local state.
			const updated = result.data as any;
			item.title = updated.title;
			item.description = updated.description ?? '';
			item.visibility = updated.visibility;
			item.sort_order = updated.sort_order;
			item.homeFilters = parseHomeFilters(updated.home_filters);
		} catch (error) {
			item.lastError = error instanceof Error ? error.message : 'Failed to save series';
		} finally {
			item.isSaving = false;
		}
	}

	async function archiveSeries(item: EditableSeries) {
		item.isSaving = true;
		item.lastError = null;

		try {
			const response = await fetch(`/api/v1/admin/series/${item.id}`, {
				method: 'DELETE'
			});
			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(result?.error || 'Failed to archive series');
			}

			item.visibility = 'archived';
		} catch (error) {
			item.lastError = error instanceof Error ? error.message : 'Failed to archive series';
		} finally {
			item.isSaving = false;
		}
	}

	async function createSeries() {
		createError = null;
		createSaving = true;

		try {
			const response = await fetch('/api/v1/admin/series', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					slug: createSlug,
					title: createTitle,
					description: createDescription
				})
			});

			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(result?.error || 'Failed to create series');
			}

			const created = result.data as any;
			series = [
				...series,
				{
					id: created.id,
					slug: created.slug,
					title: created.title,
					description: created.description ?? '',
					visibility: created.visibility,
					sort_order: created.sort_order,
					homeFilters: parseHomeFilters(created.home_filters),
					isSaving: false,
					lastError: null
				}
			].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

			createSlug = '';
			createTitle = '';
			createDescription = '';
		} catch (error) {
			createError = error instanceof Error ? error.message : 'Failed to create series';
		} finally {
			createSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Admin | Series</title>
</svelte:head>

<div class="page">
	<header class="header">
		<h1>Series</h1>
		<p>Manage which rows appear on the home page and how they are ordered.</p>
	</header>

	<section class="card">
		<h2>Create Series</h2>

		<form
			class="create-form"
			onsubmit={(e) => {
				e.preventDefault();
				void createSeries();
			}}
		>
			<label>
				<span>Slug</span>
				<input bind:value={createSlug} placeholder="e.g. crew-call" required />
			</label>
			<label>
				<span>Title</span>
				<input bind:value={createTitle} placeholder="Crew Call" required />
			</label>
			<label class="full">
				<span>Description</span>
				<textarea bind:value={createDescription} rows="2" placeholder="Optional"></textarea>
			</label>

			<div class="actions full">
				<button class="primary" type="submit" disabled={createSaving}>
					{createSaving ? 'Creating…' : 'Create'}
				</button>
				{#if createError}
					<span class="error">{createError}</span>
				{/if}
			</div>
		</form>
	</section>

	<section class="card">
		<h2>All Series</h2>

		<div class="table">
			<div class="row head">
				<div>Order</div>
				<div>Slug</div>
				<div>Title</div>
				<div>Visibility</div>
				<div>Filters</div>
				<div>Actions</div>
			</div>

			{#each series as item (item.id)}
				<div class="row">
					<div>
						<input
							type="number"
							min="0"
							step="1"
							bind:value={item.sort_order}
							class="order"
						/>
					</div>
					<div class="mono">{item.slug}</div>
					<div>
						<input bind:value={item.title} />
						<textarea
							bind:value={item.description}
							rows="2"
							placeholder="Description"
						></textarea>
					</div>
					<div>
						<select bind:value={item.visibility}>
							<option value="published">published</option>
							<option value="draft">draft</option>
							<option value="archived">archived</option>
						</select>
					</div>
					<div class="filters">
						{#each AVAILABLE_FILTERS as filter}
							<label class="filter">
								<input
									type="checkbox"
									checked={item.homeFilters.includes(filter.id)}
									onchange={() => toggleFilter(item, filter.id)}
								/>
								<span>{filter.label}</span>
							</label>
						{/each}
					</div>
					<div class="actions">
						<button class="primary" disabled={item.isSaving} onclick={() => void saveSeries(item)}>
							{item.isSaving ? 'Saving…' : 'Save'}
						</button>
						<button class="danger" disabled={item.isSaving} onclick={() => void archiveSeries(item)}>
							Archive
						</button>
						{#if item.lastError}
							<span class="error">{item.lastError}</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</section>
</div>

<style>
	.page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 7rem 1.5rem 3rem;
	}

	.header h1 {
		margin: 0;
		font-size: 1.8rem;
	}

	.header p {
		margin: 0.25rem 0 0;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.6));
	}

	.card {
		margin-top: 1.5rem;
		padding: 1rem;
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.12));
		border-radius: 12px;
		background: var(--color-bg-surface, rgba(255, 255, 255, 0.03));
	}

	.card h2 {
		margin: 0 0 0.75rem;
		font-size: 1.1rem;
	}

	.create-form {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	label span {
		display: block;
		font-size: 0.75rem;
		opacity: 0.8;
		margin-bottom: 0.25rem;
	}

	input,
	textarea,
	select {
		width: 100%;
		box-sizing: border-box;
		padding: 0.5rem 0.6rem;
		border-radius: 10px;
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.12));
		background: rgba(0, 0, 0, 0.35);
		color: var(--color-fg-primary, #fff);
	}

	textarea {
		resize: vertical;
	}

	.full {
		grid-column: 1 / -1;
	}

	.table {
		display: grid;
		gap: 0.5rem;
	}

	.row {
		display: grid;
		grid-template-columns: 90px 160px 1.2fr 160px 1.3fr 1fr;
		gap: 0.75rem;
		align-items: start;
		padding: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
	}

	.row.head {
		font-size: 0.75rem;
		opacity: 0.8;
		background: rgba(255, 255, 255, 0.02);
	}

	.mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
		font-size: 0.85rem;
		opacity: 0.9;
	}

	.order {
		text-align: right;
	}

	.filters {
		display: grid;
		gap: 0.25rem;
	}

	.filter {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		font-size: 0.85rem;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		align-items: center;
	}

	button {
		padding: 0.5rem 0.75rem;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.05);
		color: white;
		cursor: pointer;
	}

	button.primary {
		background: rgba(255, 255, 255, 0.12);
	}

	button.danger {
		border-color: rgba(255, 80, 80, 0.35);
		background: rgba(255, 80, 80, 0.12);
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error {
		color: rgba(255, 80, 80, 0.95);
		font-size: 0.85rem;
	}

	@media (max-width: 980px) {
		.row {
			grid-template-columns: 1fr;
		}
	}
</style>
