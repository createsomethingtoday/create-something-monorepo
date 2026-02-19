	<script lang="ts">
		import CategoryRow from './CategoryRow.svelte';
		import EditorChoice from './EditorChoice.svelte';
		import { onMount } from 'svelte';
		import { categoryFilter, FILTER_LABELS, type CategoryFilter } from '$lib/stores/categoryFilter.svelte';

		/**
		 * Get thumbnail path - uses local static thumbnails (Flux-generated)
		 * All thumbnails are stored in /static/thumbnails/ and served at /thumbnails/
	 *
	 * D1 stores paths like: /thumbnails/crew-call/ep01.jpg
	 * Static folder has:    static/thumbnails/crew-call/ep01.jpg
	 * Served at:            /thumbnails/crew-call/ep01.jpg ✓
	 */
		function getThumbnailPath(thumbnailPath: string): string {
			if (thumbnailPath.startsWith('/thumbnails/')) return thumbnailPath;
			return `/thumbnails${thumbnailPath.startsWith('/') ? '' : '/'}${thumbnailPath}`;
		}

		type RowTier = 'free' | 'preview' | 'gated';
		interface RowVideo {
		id: string;
		title: string;
		thumbnail: string;
		duration: string;
		tier: RowTier;
		category: string;
			episodeNumber?: number;
		}

		interface CatalogSeries {
			id: string;
			slug: string;
			title: string;
			description: string | null;
			sortOrder: number;
			homeFilters: string[];
		}

		interface CatalogVideo {
			id: string;
			title: string;
			tier: RowTier;
			episode_number: number | null;
			duration_seconds: number | null;
			duration: number;
			thumbnail_path: string;
			series_id: string | null;
		}

		interface CatalogRow {
			series: CatalogSeries;
			videos: CatalogVideo[];
		}

		let allRows = $state<Array<{ series: CatalogSeries; videos: RowVideo[] }>>([]);
		let isLoading = $state(true);
		let loadError = $state<string | null>(null);

		const activeFilter = $derived(categoryFilter.active);

		// Category filters
	const filterOptions: Array<{ id: CategoryFilter; label: string }> = [
			{ id: 'all', label: 'All Content' },
			{ id: 'series', label: 'Series' },
			{ id: 'films', label: 'Films' },
			{ id: 'bts', label: 'Behind the Scenes' },
			{ id: 'trailers', label: 'Trailers' },
			{ id: 'free', label: 'Free to Watch' }
		];

		function handleFilterClick(id: CategoryFilter) {
			categoryFilter.set(id);
		}

		const filteredRows = $derived.by(() => {
			if (activeFilter === 'all') return allRows;

			if (activeFilter === 'free') {
				return allRows
					.map((row) => ({ ...row, videos: row.videos.filter((video) => video.tier === 'free') }))
					.filter((row) => row.videos.length > 0);
			}

			return allRows.filter((row) => row.series.homeFilters?.includes(activeFilter));
		});

		function formatClock(totalSeconds: number): string {
			const s = Math.max(0, Math.floor(totalSeconds));
		const hours = Math.floor(s / 3600);
		const minutes = Math.floor((s % 3600) / 60);
		const seconds = s % 60;
		if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
			return `${minutes}:${seconds.toString().padStart(2, '0')}`;
		}

		function buildRowVideo(series: CatalogSeries, v: CatalogVideo): RowVideo {
			return {
				id: v.id,
				title: v.title,
				thumbnail: getThumbnailPath(v.thumbnail_path),
				duration: formatClock(v.duration_seconds ?? v.duration),
				tier: v.tier,
				category: series.title,
				...(v.episode_number !== null ? { episodeNumber: v.episode_number } : {})
			};
		}

		onMount(async () => {
			try {
				isLoading = true;
				loadError = null;

				const response = await fetch('/api/v1/catalog/home');
				const result = (await response.json()) as unknown;
				const payload = result as { success?: boolean; data?: { rows?: CatalogRow[] }; error?: string };

				if (!response.ok || !payload?.success) {
					throw new Error(payload?.error || 'Failed to load catalog');
				}

				const rows = payload.data?.rows || [];

				allRows = rows.map((row) => ({
					series: row.series,
					videos: (row.videos || []).map((video) => buildRowVideo(row.series, video))
				}));
			} catch (err) {
				loadError = err instanceof Error ? err.message : 'Failed to load videos';
				allRows = [];
			} finally {
				isLoading = false;
			}
		});
	</script>

<section class="content-categories" id="content-categories">
	<div class="section-header">
		<h2 class="section-title">
			{#if activeFilter === 'all'}
				The Outerfields Network
			{:else}
				{FILTER_LABELS[activeFilter]}
			{/if}
		</h2>
			<p class="section-description">
				{#if activeFilter === 'trailers'}
					Preview what's coming next.
				{:else if activeFilter === 'films'}
					Feature-length films from our network.
				{:else if activeFilter === 'bts'}
					Behind the scenes of our productions.
				{:else if activeFilter === 'series'}
					Ongoing series from our content network.
				{:else if activeFilter === 'free'}
					Free episodes available to watch without membership.
				{:else}
					50+ episodes demonstrating the quality and scale we deliver
				{/if}
			</p>
		</div>

	<!-- Category filter pills - positioned close to content they filter -->
	<div class="category-pills">
		{#each filterOptions as filter}
			<button
				class="pill"
				class:active={activeFilter === filter.id}
				onclick={() => handleFilterClick(filter.id)}
			>
				{filter.label}
			</button>
		{/each}
	</div>

		<div class="categories">
			{#if isLoading}
				<p class="empty-state">Loading videos…</p>
			{:else if loadError}
				<p class="empty-state">{loadError}</p>
			{:else if filteredRows.length === 0}
				<p class="empty-state">No videos in this category yet.</p>
			{:else}
				{#each filteredRows as row (row.series.id)}
					<CategoryRow title={row.series.title} videos={row.videos} useLinks={true} />
					<!-- Insert EditorChoice after Crew Call -->
					{#if row.series.slug === 'crew-call' && activeFilter === 'all'}
						<EditorChoice />
					{/if}
				{/each}
			{/if}
		</div>
	</section>

<style>
	.content-categories {
		width: 100%;
		padding: var(--space-2xl) 0;
		background: var(--color-bg-pure);
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-2xl);
		max-width: var(--container-max-width);
		margin-left: auto;
		margin-right: auto;
	}

	.section-title {
		font-size: var(--text-display);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md) 0;
	}

	.section-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		max-width: 600px;
		margin: 0 auto;
	}

	/* Category filter pills */
	.category-pills {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: var(--space-sm);
		max-width: var(--container-max-width);
		margin: 0 auto var(--space-xl);
	}

	.pill {
		padding: 0.5rem 1.25rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: var(--radius-full);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.pill:hover {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.2);
		color: var(--color-fg-primary);
	}

	.pill.active {
		background: rgba(255, 255, 255, 0.15);
		color: white;
		font-weight: 700;
		border-color: rgba(255, 255, 255, 0.3);
	}

	.categories {
		display: flex;
		flex-direction: column;
	}

	.empty-state {
		text-align: center;
		color: var(--color-fg-muted);
		padding: var(--space-lg);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.content-categories {
			padding: var(--space-xl) 0;
		}

		.section-header {
			margin-bottom: var(--space-xl);
		}

		.section-title {
			font-size: var(--text-h1);
		}

		.section-description {
			font-size: var(--text-body);
		}

		.category-pills {
			margin-bottom: var(--space-lg);
		}
	}

	@media (max-width: 480px) {
		.category-pills {
			gap: var(--space-xs);
		}

		.pill {
			padding: 0.375rem 1rem;
			font-size: 0.75rem;
		}
	}
</style>
