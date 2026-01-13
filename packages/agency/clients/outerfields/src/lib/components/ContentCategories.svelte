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
	import VideoModal from './VideoModal.svelte';
	import { browser } from '$app/environment';

	// Mock data structure - in production, this would come from API
	const categories = [
		{
			title: 'Crew Call',
			videos: Array.from({ length: 20 }, (_, i) => ({
				id: `crew-call-${i + 1}`,
				title: `Crew Call Episode ${i + 1}`,
				thumbnail: `/thumbnails/crew-call-${i + 1}.jpg`,
				duration: '45:00',
				tier: i === 0 ? 'free' : 'gated',
				category: 'crew-call',
				episodeNumber: i + 1
			}))
		},
		{
			title: 'Reconnecting Relationships',
			videos: Array.from({ length: 3 }, (_, i) => ({
				id: `reconnecting-${i + 1}`,
				title: `Reconnecting Relationships Episode ${i + 1}`,
				thumbnail: `/thumbnails/reconnecting-${i + 1}.jpg`,
				duration: '30:00',
				tier: i === 0 ? 'free' : 'gated',
				category: 'reconnecting',
				episodeNumber: i + 1
			}))
		},
		{
			title: 'Kodiak',
			videos: Array.from({ length: 8 }, (_, i) => ({
				id: `kodiak-${i + 1}`,
				title: `Kodiak Episode ${i + 1}`,
				thumbnail: `/thumbnails/kodiak-${i + 1}.jpg`,
				duration: '25:00',
				tier: i === 0 ? 'free' : 'gated',
				category: 'kodiak',
				episodeNumber: i + 1
			}))
		},
		{
			title: 'Lincoln Manufacturing',
			videos: Array.from({ length: 8 }, (_, i) => ({
				id: `lincoln-${i + 1}`,
				title: `Lincoln Manufacturing Episode ${i + 1}`,
				thumbnail: `/thumbnails/lincoln-${i + 1}.jpg`,
				duration: '35:00',
				tier: i === 0 ? 'free' : 'gated',
				category: 'lincoln',
				episodeNumber: i + 1
			}))
		},
		{
			title: 'Guns Out TV',
			videos: Array.from({ length: 13 }, (_, i) => ({
				id: `guns-out-${i + 1}`,
				title: `Guns Out TV Episode ${i + 1}`,
				thumbnail: `/thumbnails/guns-out-${i + 1}.jpg`,
				duration: '20:00',
				tier: i === 0 ? 'free' : 'gated',
				category: 'guns-out',
				episodeNumber: i + 1
			}))
		},
		{
			title: 'Films',
			videos: [
				{
					id: 'film-1',
					title: 'Feature Film',
					thumbnail: '/thumbnails/film-1.jpg',
					duration: '1:45:00',
					tier: 'free' as const,
					category: 'films',
					episodeNumber: undefined
				}
			]
		},
		{
			title: 'Coming Soon',
			videos: Array.from({ length: 5 }, (_, i) => ({
				id: `trailer-${i + 1}`,
				title: `Upcoming Project ${i + 1} Trailer`,
				thumbnail: `/thumbnails/trailer-${i + 1}.jpg`,
				duration: '2:30',
				tier: 'free' as const,
				category: 'coming-soon',
				episodeNumber: undefined
			}))
		}
	];

	let selectedVideoId = $state<string | null>(null);
	let showModal = $state(false);

	function handleVideoClick(videoId: string) {
		selectedVideoId = videoId;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		selectedVideoId = null;
	}

	// Verify episode counts
	const totalVideos = categories.reduce((sum, cat) => sum + cat.videos.length, 0);
	const freeVideos = categories.reduce((sum, cat) =>
		sum + cat.videos.filter(v => v.tier === 'free').length, 0
	);

	if (browser) {
		console.log(`Total videos: ${totalVideos}`);
		console.log(`Free videos: ${freeVideos} (5 first episodes + 1 film + 5 trailers)`);
	}
</script>

<section class="content-categories">
	<div class="section-header">
		<h2 class="section-title">Watch Now</h2>
		<p class="section-description">
			Explore our content library. First episodes and all trailers are FREE.
			Become a member for full access.
		</p>
	</div>

	<div class="categories">
		{#each categories as category}
			<CategoryRow
				title={category.title}
				videos={category.videos}
				onVideoClick={handleVideoClick}
			/>
		{/each}
	</div>

	{#if showModal && selectedVideoId}
		<VideoModal
			videoId={selectedVideoId}
			onClose={closeModal}
		/>
	{/if}
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
