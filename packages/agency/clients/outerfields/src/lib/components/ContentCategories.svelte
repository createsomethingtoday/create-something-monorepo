<script lang="ts">
	/**
	 * ContentCategories Component
	 * Displays all 7 content categories with Netflix-style horizontal scrolling.
	 *
	 * Categories:
	 * 1. Crew Call (20+ episodes)
	 * 2. Reconnecting Relationships (3 episodes)
	 * 3. Kodiak (8 episodes)
	 * 4. Lincoln Manufacturing (7-8 episodes)
	 * 5. Guns Out TV (13 episodes)
	 * 6. Films (1 film)
	 * 7. Coming Soon (5 trailers)
	 */
	import CategoryRow from './CategoryRow.svelte';
	import { onMount } from 'svelte';
	import { videoPlayer, type Video as PlayerVideo } from '$lib/stores/videoPlayer';
	import type { Video as DbVideo } from '$lib/server/db/videos';
	import { authStore } from '$lib/stores/auth';
	import { categoryFilter, FILTER_TO_CATEGORIES, FILTER_LABELS } from '$lib/stores/categoryFilter.svelte';

	// Cloudflare R2 CDN base URL (public bucket) - used for video assets only
	const CDN_BASE = 'https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev';

	/**
	 * Get thumbnail path - uses local static thumbnails (Flux-generated)
	 * All thumbnails are stored in /static/thumbnails/ and served at /thumbnails/
	 *
	 * D1 stores paths like: /thumbnails/crew-call/ep01.jpg
	 * Static folder has:    static/thumbnails/crew-call/ep01.jpg
	 * Served at:            /thumbnails/crew-call/ep01.jpg ✓
	 */
	function getThumbnailPath(v: DbVideo): string {
		// D1 thumbnail_path is already in the correct format: /thumbnails/...
		// Just use it directly since static folder serves at that path
		if (v.thumbnail_path.startsWith('/thumbnails/')) {
			return v.thumbnail_path;
		}
		// Fallback: prefix with /thumbnails if missing
		return `/thumbnails${v.thumbnail_path.startsWith('/') ? '' : '/'}${v.thumbnail_path}`;
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

	let allCategories = $state<Array<{ title: string; categoryId: string; videos: RowVideo[] }>>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let playerVideosById = $state<Record<string, PlayerVideo>>({});
	let rowVideosById = $state<Record<string, RowVideo>>({});

	const isMember = $derived($authStore.user?.membership ?? false);
	const activeFilter = $derived(categoryFilter.active);

	// Filter categories based on the active filter
	const filteredCategories = $derived.by(() => {
		if (activeFilter === 'all') {
			return allCategories;
		}

		if (activeFilter === 'free') {
			// Filter videos by tier, show all categories that have free content
			return allCategories
				.map(cat => ({
					...cat,
					videos: cat.videos.filter(v => v.tier === 'free')
				}))
				.filter(cat => cat.videos.length > 0);
		}

		// Filter by category
		const allowedCategories = FILTER_TO_CATEGORIES[activeFilter];
		if (!allowedCategories) return allCategories;

		return allCategories.filter(cat => allowedCategories.includes(cat.categoryId));
	});

	function formatClock(totalSeconds: number): string {
		const s = Math.max(0, Math.floor(totalSeconds));
		const hours = Math.floor(s / 3600);
		const minutes = Math.floor((s % 3600) / 60);
		const seconds = s % 60;
		if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	function titleFromCategoryId(categoryId: string): string {
		const map: Record<string, string> = {
			'crew-call': 'Crew Call',
			'reconnecting-relationships': 'Reconnecting Relationships',
			kodiak: 'Kodiak',
			'lincoln-manufacturing': 'Lincoln Manufacturing',
			'guns-out-tv': 'Guns Out TV',
			films: 'Films',
			'coming-soon': 'Coming Soon'
		};
		return map[categoryId] || categoryId;
	}

	function toAssetUrl(path: string): string {
		if (path.startsWith('http://') || path.startsWith('https://')) return path;
		// Normalize leading slash so CDN_BASE + "/videos/..." doesn't double-slash
		return `${CDN_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
	}

	function buildRowVideo(v: DbVideo): RowVideo {
		return {
			id: v.id,
			title: v.title,
			thumbnail: getThumbnailPath(v),
			duration: formatClock(v.duration),
			tier: v.tier,
			category: v.category,
			...(v.episode_number ? { episodeNumber: v.episode_number } : {})
		};
	}

	function buildPlayerVideo(v: DbVideo): PlayerVideo {
		return {
			id: v.id,
			title: v.title,
			description: v.description || '',
			duration: formatClock(v.duration),
			thumbnail: getThumbnailPath(v),
			category: titleFromCategoryId(v.category),
			src: toAssetUrl(v.asset_path)  // Videos still come from R2 CDN
		};
	}

	function handleVideoClick(videoId: string) {
		const row = rowVideosById[videoId];
		if (row?.tier === 'gated' && !isMember) {
			document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
			return;
		}

		const video = playerVideosById[videoId];
		if (!video) return;
		videoPlayer.play(video);
	}

	onMount(async () => {
		try {
			isLoading = true;
			loadError = null;

			const response = await fetch('/api/videos?grouped=true');
			const result = await response.json();

			if (!response.ok || !result?.success) {
				throw new Error(result?.error || 'Failed to load videos');
			}

			const grouped = result.data as Record<string, DbVideo[]>;

			const byId: Record<string, PlayerVideo> = {};
			const rows: Array<{ title: string; categoryId: string; videos: RowVideo[] }> = Object.entries(grouped)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([categoryId, vids]) => {
					for (const v of vids) {
						byId[v.id] = buildPlayerVideo(v);
					}
					return {
						title: titleFromCategoryId(categoryId),
						categoryId,
						videos: vids.map(buildRowVideo)
					};
				});

			playerVideosById = byId;
			allCategories = rows;
			rowVideosById = Object.fromEntries(rows.flatMap(r => r.videos.map(v => [v.id, v])));
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Failed to load videos';
			allCategories = [];
			playerVideosById = {};
			rowVideosById = {};
		} finally {
			isLoading = false;
		}
	});
</script>

<section class="content-categories" id="content-categories">
	<div class="section-header">
		<h2 class="section-title">
			{#if activeFilter === 'all'}
				Watch Now
			{:else}
				{FILTER_LABELS[activeFilter]}
			{/if}
		</h2>
		<p class="section-description">
			{#if activeFilter === 'free'}
				Free content — no membership required.
			{:else if activeFilter === 'trailers'}
				Preview what's coming next.
			{:else if activeFilter === 'films'}
				Feature-length films from our network.
			{:else if activeFilter === 'bts'}
				Behind the scenes of our productions.
			{:else if activeFilter === 'series'}
				Ongoing series from our content network.
			{:else}
				Explore our content library. First episodes and all trailers are FREE.
			{/if}
		</p>
	</div>

	<div class="categories">
		{#if isLoading}
			<p class="empty-state">Loading videos…</p>
		{:else if loadError}
			<p class="empty-state">{loadError}</p>
		{:else if filteredCategories.length === 0}
			<p class="empty-state">No videos in this category yet.</p>
		{:else}
			{#each filteredCategories as category (category.categoryId)}
				<CategoryRow title={category.title} videos={category.videos} useLinks={true} />
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
		padding: 0 var(--space-lg);
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
			padding: 0 var(--space-md);
			margin-bottom: var(--space-xl);
		}

		.section-title {
			font-size: var(--text-h1);
		}

		.section-description {
			font-size: var(--text-body);
		}
	}

	@media (max-width: 480px) {
		.section-header {
			padding: 0 var(--space-sm);
		}
	}
</style>
