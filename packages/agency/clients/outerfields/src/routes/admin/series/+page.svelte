<script lang="ts">
	import type { PageData } from './$types';
	import { Plus, Save, Archive } from 'lucide-svelte';

	type HomeFilterId = 'series' | 'films' | 'bts' | 'trailers';

	const HOME_FILTERS: Array<{ id: HomeFilterId; label: string }> = [
		{ id: 'series', label: 'Series' },
		{ id: 'films', label: 'Films' },
		{ id: 'bts', label: 'Behind the Scenes' },
		{ id: 'trailers', label: 'Trailers' }
	];

	let { data }: { data: PageData } = $props();

	type UiSeries = PageData['series'][number];
	let rows = $state<UiSeries[]>(data.series);

	let createSlug = $state('');
	let createTitle = $state('');
	let createDescription = $state('');
	let createSortOrder = $state<number>(0);

	let isBusy = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	function clearMessages() {
		errorMessage = null;
		successMessage = null;
	}

	function safeParseJsonArray(value: string | null | undefined): string[] {
		if (!value) return [];
		try {
			const parsed = JSON.parse(value) as unknown;
			if (!Array.isArray(parsed)) return [];
			return parsed.filter((entry) => typeof entry === 'string') as string[];
		} catch {
			return [];
		}
	}

	async function refreshSeries() {
		const response = await fetch('/api/v1/admin/series');
		const payload = (await response.json()) as unknown as { success?: boolean; data?: any[]; error?: string };

		if (!response.ok || !payload?.success) {
			throw new Error(payload?.error || 'Failed to load series');
		}

		rows = (payload.data || []).map((row) => ({
			...row,
			homeFilters: safeParseJsonArray(row.home_filters)
		}));
	}

	function toggleHomeFilter(row: UiSeries, filterId: HomeFilterId) {
		const current = row.homeFilters || [];
		row.homeFilters = current.includes(filterId)
			? current.filter((value) => value !== filterId)
			: [...current, filterId];
	}

	async function handleCreateSeries() {
		clearMessages();
		if (!createSlug.trim() || !createTitle.trim()) {
			errorMessage = 'Slug and title are required.';
			return;
		}

		isBusy = true;
		try {
			const response = await fetch('/api/v1/admin/series', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					slug: createSlug.trim(),
					title: createTitle.trim(),
					description: createDescription.trim() || undefined,
					sort_order: Number.isFinite(createSortOrder) ? createSortOrder : undefined
				})
			});
			const payload = (await response.json()) as unknown as { success?: boolean; error?: string };
			if (!response.ok || !payload?.success) {
				throw new Error(payload?.error || 'Failed to create series');
			}

			createSlug = '';
			createTitle = '';
			createDescription = '';
			createSortOrder = 0;
			await refreshSeries();
			successMessage = 'Series created.';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to create series';
		} finally {
			isBusy = false;
		}
	}

	async function handleSaveSeries(row: UiSeries) {
		clearMessages();
		isBusy = true;
		try {
			const response = await fetch(`/api/v1/admin/series/${row.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: row.title,
					description: row.description ?? '',
					visibility: row.visibility,
					sort_order: row.sort_order,
					home_filters: row.homeFilters || []
				})
			});
			const payload = (await response.json()) as unknown as { success?: boolean; data?: any; error?: string };
			if (!response.ok || !payload?.success) {
				throw new Error(payload?.error || 'Failed to update series');
			}

			// Update row with server response (keep parsed homeFilters).
			row.title = payload.data.title;
			row.description = payload.data.description;
			row.visibility = payload.data.visibility;
			row.sort_order = payload.data.sort_order;
			row.home_filters = payload.data.home_filters;
			row.homeFilters = safeParseJsonArray(payload.data.home_filters);

			successMessage = 'Series saved.';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to update series';
		} finally {
			isBusy = false;
		}
	}

	async function handleArchiveSeries(row: UiSeries) {
		clearMessages();
		if (!confirm(`Archive series "${row.title}"?`)) return;

		isBusy = true;
		try {
			const response = await fetch(`/api/v1/admin/series/${row.id}`, { method: 'DELETE' });
			const payload = (await response.json()) as unknown as { success?: boolean; error?: string };
			if (!response.ok || !payload?.success) {
				throw new Error(payload?.error || 'Failed to archive series');
			}
			await refreshSeries();
			successMessage = 'Series archived.';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to archive series';
		} finally {
			isBusy = false;
		}
	}
</script>

<svelte:head>
	<title>Admin | Series</title>
</svelte:head>

<div class="admin-wrap">
	<header class="admin-header">
		<div class="admin-title">
			<h1>Series Catalog</h1>
			<p>Controls which rows appear on the home page and how they are ordered.</p>
		</div>

		<nav class="admin-tabs" aria-label="Admin navigation">
			<a class="tab" href="/admin/videos">Videos</a>
			<a class="tab active" href="/admin/series">Series</a>
			<a class="tab" href="/admin/proposals">Proposals</a>
		</nav>
	</header>

	<section class="panel">
		<h2>Create Series</h2>
		<p class="hint">Slug and ID are immutable. To rename a slug, create a new series and reassign videos.</p>

		<div class="grid">
			<label class="field">
				<span>Slug</span>
				<input placeholder="crew-call" bind:value={createSlug} />
			</label>
			<label class="field">
				<span>Title</span>
				<input placeholder="Crew Call" bind:value={createTitle} />
			</label>
			<label class="field">
				<span>Sort Order</span>
				<input
					type="number"
					value={createSortOrder}
					oninput={(e) => (createSortOrder = Number((e.target as HTMLInputElement).value))}
				/>
			</label>
			<label class="field span-3">
				<span>Description</span>
				<input placeholder="Optional" bind:value={createDescription} />
			</label>
		</div>

		<div class="actions">
			<button class="btn primary" onclick={handleCreateSeries} disabled={isBusy}>
				<Plus size={16} />
				<span>Create</span>
			</button>
		</div>
	</section>

	{#if errorMessage}
		<div class="notice error">{errorMessage}</div>
	{/if}
	{#if successMessage}
		<div class="notice success">{successMessage}</div>
	{/if}

	<section class="panel">
		<h2>All Series</h2>

		<div class="table">
			<div class="thead">
				<div>Slug</div>
				<div>Title</div>
				<div>Visibility</div>
				<div>Order</div>
				<div>Home Filters</div>
				<div></div>
			</div>

			{#each rows as row (row.id)}
				<div class="trow">
					<div class="mono">{row.slug}</div>
					<div>
						<input class="cell-input" bind:value={row.title} />
						<div class="sub">{row.id}</div>
					</div>
					<div>
						<select class="cell-input" bind:value={row.visibility}>
							<option value="draft">draft</option>
							<option value="published">published</option>
							<option value="archived">archived</option>
						</select>
					</div>
					<div>
						<input
							class="cell-input"
							type="number"
							value={row.sort_order}
							oninput={(e) => (row.sort_order = Number((e.target as HTMLInputElement).value))}
						/>
					</div>
					<div class="filters">
						{#each HOME_FILTERS as filter (filter.id)}
							<label class="check">
								<input
									type="checkbox"
									checked={(row.homeFilters || []).includes(filter.id)}
									onchange={() => toggleHomeFilter(row, filter.id)}
								/>
								<span>{filter.label}</span>
							</label>
						{/each}
					</div>
					<div class="row-actions">
						<button class="btn" onclick={() => handleSaveSeries(row)} disabled={isBusy}>
							<Save size={16} />
							<span>Save</span>
						</button>
						<button class="btn danger" onclick={() => handleArchiveSeries(row)} disabled={isBusy}>
							<Archive size={16} />
							<span>Archive</span>
						</button>
					</div>
				</div>
			{/each}
		</div>
	</section>
</div>

<style>
	.admin-wrap {
		max-width: 1100px;
		margin: 0 auto;
		padding: 7rem 1.5rem 3rem;
	}

	.admin-header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.5rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.admin-title h1 {
		margin: 0 0 0.25rem;
		font-size: 1.75rem;
		color: var(--color-fg-primary);
	}

	.admin-title p {
		margin: 0;
		color: var(--color-fg-muted);
	}

	.admin-tabs {
		display: flex;
		gap: 0.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 9999px;
		padding: 0.25rem;
	}

	.tab {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.85rem;
		color: var(--color-fg-secondary);
		text-decoration: none;
		border-radius: 9999px;
		font-size: 0.875rem;
	}

	.tab.active {
		background: rgba(255, 255, 255, 0.12);
		color: var(--color-fg-primary);
		font-weight: 700;
	}

	.panel {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		padding: 1.25rem;
		margin-bottom: 1.25rem;
	}

	.panel h2 {
		margin: 0 0 0.5rem;
		color: var(--color-fg-primary);
		font-size: 1.05rem;
	}

	.hint {
		margin: 0 0 1rem;
		color: var(--color-fg-muted);
		font-size: 0.875rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.field span {
		color: var(--color-fg-muted);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.field input {
		height: 2.5rem;
		border-radius: 0.75rem;
		border: 1px solid var(--color-border-default);
		background: rgba(0, 0, 0, 0.25);
		color: var(--color-fg-primary);
		padding: 0 0.85rem;
		outline: none;
	}

	.span-3 {
		grid-column: 1 / -1;
	}

	.actions {
		margin-top: 1rem;
		display: flex;
		justify-content: flex-end;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: 0.75rem;
		border: 1px solid var(--color-border-default);
		background: rgba(255, 255, 255, 0.03);
		color: var(--color-fg-secondary);
		padding: 0.6rem 0.9rem;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
		font-weight: 600;
	}

	.btn:hover:enabled {
		background: rgba(255, 255, 255, 0.08);
		color: var(--color-fg-primary);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn.primary {
		background: var(--color-primary);
		border-color: rgba(255, 255, 255, 0.12);
		color: #000;
	}

	.btn.primary:hover:enabled {
		filter: brightness(1.02);
	}

	.btn.danger {
		border-color: rgba(255, 90, 90, 0.35);
		color: rgba(255, 90, 90, 0.95);
	}

	.notice {
		padding: 0.85rem 1rem;
		border-radius: 0.75rem;
		margin: 1rem 0;
		border: 1px solid var(--color-border-default);
	}

	.notice.error {
		background: rgba(255, 90, 90, 0.08);
		border-color: rgba(255, 90, 90, 0.25);
		color: rgba(255, 220, 220, 0.95);
	}

	.notice.success {
		background: rgba(80, 200, 120, 0.08);
		border-color: rgba(80, 200, 120, 0.25);
		color: rgba(210, 255, 230, 0.95);
	}

	.table {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.thead,
	.trow {
		display: grid;
		grid-template-columns: 170px 1.4fr 130px 90px 1.6fr 220px;
		gap: 0.75rem;
		align-items: start;
	}

	.thead {
		color: var(--color-fg-muted);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0 0.25rem;
	}

	.trow {
		padding: 0.75rem;
		border-radius: 0.85rem;
		border: 1px solid var(--color-border-default);
		background: rgba(0, 0, 0, 0.18);
	}

	.mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		color: var(--color-fg-secondary);
		font-size: 0.9rem;
	}

	.sub {
		margin-top: 0.35rem;
		color: var(--color-fg-muted);
		font-size: 0.75rem;
	}

	.cell-input {
		width: 100%;
		height: 2.25rem;
		border-radius: 0.65rem;
		border: 1px solid var(--color-border-default);
		background: rgba(255, 255, 255, 0.03);
		color: var(--color-fg-primary);
		padding: 0 0.75rem;
		outline: none;
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 0.75rem;
		padding-top: 0.35rem;
	}

	.check {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		color: var(--color-fg-secondary);
		font-size: 0.875rem;
	}

	.check input {
		accent-color: var(--color-primary);
	}

	.row-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	@media (max-width: 980px) {
		.thead {
			display: none;
		}

		.trow {
			grid-template-columns: 1fr;
		}

		.row-actions {
			justify-content: flex-start;
		}
	}
</style>

