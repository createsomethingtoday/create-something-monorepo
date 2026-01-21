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

	let categories = $state<Array<{ title: string; videos: RowVideo[] }>>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let playerVideosById = $state<Record<string, PlayerVideo>>({});
	let rowVideosById = $state<Record<string, RowVideo>>({});

	const isMember = $derived($authStore.user?.membership ?? false);

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
			const rows: Array<{ title: string; videos: RowVideo[] }> = Object.entries(grouped)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([categoryId, vids]) => {
					for (const v of vids) {
						byId[v.id] = buildPlayerVideo(v);
					}
					return {
						title: titleFromCategoryId(categoryId),
						videos: vids.map(buildRowVideo)
					};
				});

			playerVideosById = byId;
			categories = rows;
			rowVideosById = Object.fromEntries(rows.flatMap(r => r.videos.map(v => [v.id, v])));
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Failed to load videos';
			categories = [];
			playerVideosById = {};
			rowVideosById = {};
		} finally {
			isLoading = false;
		}
	});
</script>

<section class="content-categories">
	<div class="section-header">
		<h2 class="section-title">Watch Now</h2>
		<p class="section-description">
			Explore our content library. First episodes and all trailers are FREE.
			Become a member for full access.
		</p>
	</div>

	<!-- Category filter pills -->
	<div class="category-pills">
		<button class="pill active">All Content</button>
		<button class="pill">Series</button>
		<button class="pill">Films</button>
		<button class="pill">Behind the Scenes</button>
		<button class="pill">Trailers</button>
		<button class="pill">Free to Watch</button>
	</div>

	<div class="categories">
		{#if isLoading}
			<p class="empty-state">Loading videos…</p>
		{:else if loadError}
			<p class="empty-state">{loadError}</p>
		{:else if categories.length === 0}
			<p class="empty-state">No videos available yet.</p>
		{:else}
			{#each categories as category}
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

	/* Category filter pills */
	.category-pills {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: 0 var(--space-lg);
		margin-bottom: var(--space-xl);
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.category-pills::-webkit-scrollbar {
		display: none;
	}

	.pill {
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-bg-surface);
		border: none;
		border-radius: var(--radius-full);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.pill:hover {
		background: var(--color-bg-surface-hover);
		color: var(--color-fg-primary);
	}

	.pill.active {
		background: var(--color-brand);
		color: white;
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
