<script lang="ts">
	/**
	 * OUTERFIELDS User Portal Demo
	 *
	 * Netflix-style video browsing experience demonstrating
	 * the user-facing side of the PCN platform.
	 * Uses shared VideoModal component for video playback (DRY).
	 */
	import { Star, Play, Plus, Info, ArrowRight } from 'lucide-svelte';
	import { videoPlayer, type Video } from '$lib/stores/videoPlayer';
	import VideoModal from '$lib/components/VideoModal.svelte';

	// Cloudflare R2 CDN base URL (same as marketing page)
	const CDN_BASE = 'https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev';

	// Video source mapping for demo content
	const videoSources: Record<string, string> = {
		'1': `${CDN_BASE}/videos/weatherford-promo.mp4`,
		'2': `${CDN_BASE}/videos/texas-state-fair.mp4`,
		'3': `${CDN_BASE}/videos/gotv-uscca.mp4`,
		'4': `${CDN_BASE}/videos/hilti-anchors.mp4`,
		'5': `${CDN_BASE}/videos/staccato-promo.mp4`,
		'6': `${CDN_BASE}/videos/uscca-expo-promo.mp4`,
		'7': `${CDN_BASE}/videos/weatherford-promo.mp4`,
		'8': `${CDN_BASE}/videos/texas-state-fair.mp4`,
		'9': `${CDN_BASE}/videos/gotv-uscca.mp4`,
		'10': `${CDN_BASE}/videos/hilti-anchors.mp4`,
		'11': `${CDN_BASE}/videos/staccato-promo.mp4`,
		'12': `${CDN_BASE}/videos/uscca-expo-promo.mp4`,
		featured: `${CDN_BASE}/videos/gotv-uscca.mp4`
	};

	// Engagement data for heatmap visualization
	const engagementData: Record<string, number[]> = {
		'1': [0.3, 0.4, 0.5, 0.7, 0.9, 1.0, 0.95, 0.85, 0.7, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.1],
		'2': [0.2, 0.3, 0.5, 0.6, 0.65, 0.7, 0.8, 0.95, 1.0, 0.9, 0.75, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.2, 0.15, 0.1],
		'3': [0.4, 0.35, 0.3, 0.35, 0.5, 0.7, 0.85, 1.0, 0.9, 0.7, 0.5, 0.4, 0.5, 0.7, 0.9, 0.95, 0.8, 0.5, 0.3, 0.2],
		featured: [0.5, 0.6, 0.7, 0.85, 1.0, 0.9, 0.75, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.05, 0.05]
	};

	interface ContentItem {
		id: string;
		title: string;
		thumbnail: string;
		duration: string;
		progress?: number;
		episode?: string;
		views?: string;
		isNew?: boolean;
	}

	interface Category {
		title: string;
		items: ContentItem[];
	}

	interface Props {
		data: {
			user: { name: string; avatar: string | null };
			categories: Category[];
		};
	}

	let { data }: Props = $props();

	let featuredContent = {
		id: 'featured',
		title: 'Building OUTERFIELDS: The Journey',
		description:
			'Documentary-style behind-the-scenes of the OUTERFIELDS team building the Premium Content Network platform. See how we architect edge-first systems, design with Canon principles, and build for creators.',
		thumbnail: '/thumbnails/hero-building-outerfields.jpg',
		duration: '16 min',
		rating: '4.9',
		year: '2024',
		category: 'Featured'
	};

	function playVideo(item: ContentItem | typeof featuredContent) {
		const video: Video = {
			id: item.id,
			title: item.title,
			description: 'episode' in item ? `${item.episode} • ${item.duration}` : item.duration,
			duration: item.duration,
			thumbnail: item.thumbnail,
			category: 'category' in item ? item.category : 'Demo',
			src: videoSources[item.id] || videoSources['featured']
		};
		videoPlayer.play(video);
	}
</script>

<svelte:head>
	<title>Browse | OUTERFIELDS Demo</title>
</svelte:head>

<div class="portal">
	<!-- Featured Hero -->
	<section class="featured-hero">
		<div class="hero-backdrop">
			<img src={featuredContent.thumbnail} alt={featuredContent.title} />
			<div class="hero-gradient"></div>
		</div>

		<div class="hero-content">
			<span class="featured-badge">Featured</span>
			<h1 class="hero-title">{featuredContent.title}</h1>
			<div class="hero-meta">
				<span class="rating">
					<Star size={16} />
					{featuredContent.rating}
				</span>
				<span>{featuredContent.year}</span>
				<span>{featuredContent.duration}</span>
			</div>
			<p class="hero-description">{featuredContent.description}</p>
			<div class="hero-actions">
				<button class="btn-play" onclick={() => playVideo(featuredContent)}>
					<Play size={20} />
					Play
				</button>
				<button class="btn-add">
					<Plus size={20} />
					My List
				</button>
				<button class="btn-info">
					<Info size={20} />
				</button>
			</div>
		</div>
	</section>

	<!-- Content Categories -->
	<div class="categories">
		{#each data.categories as category}
			<section class="category">
				<h2 class="category-title">{category.title}</h2>
				<div class="content-row">
					{#each category.items as item}
						<button class="content-card" onclick={() => playVideo(item)}>
							<div class="card-thumbnail">
								<img src={item.thumbnail} alt={item.title} loading="lazy" />
								{#if item.isNew}
									<span class="badge-new">New</span>
								{/if}
								{#if item.progress !== undefined}
									<div class="progress-bar">
										<div class="progress-fill" style="width: {item.progress}%"></div>
									</div>
								{/if}
								<div class="card-overlay">
									<span class="play-button">
										<Play size={24} />
									</span>
								</div>
							</div>
							<div class="card-info">
								<h3 class="card-title">{item.title}</h3>
								<div class="card-meta">
									{#if item.episode}
										<span>{item.episode}</span>
										<span class="dot"></span>
									{/if}
									<span>{item.duration}</span>
									{#if item.views}
										<span class="dot"></span>
										<span>{item.views} views</span>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				</div>
			</section>
		{/each}
	</div>

	<!-- Demo Notice -->
	<div class="demo-notice">
		<Info size={20} />
		<p>This is a demo of the OUTERFIELDS user portal. Content is for demonstration purposes only.</p>
		<a href="/admin-demo" class="switch-link">
			Switch to Admin View
			<ArrowRight size={16} />
		</a>
	</div>
</div>

<!-- Shared video modal component (DRY: reused from marketing page) -->
<VideoModal {engagementData} />

<style>
	.portal {
		min-height: 100vh;
		background: var(--color-bg-pure);
		padding-bottom: 4rem;
	}

	/* Featured Hero */
	.featured-hero {
		position: relative;
		height: 80vh;
		min-height: 500px;
		max-height: 800px;
		margin-bottom: 2rem;
	}

	.hero-backdrop {
		position: absolute;
		inset: 0;
	}

	.hero-backdrop img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.hero-gradient {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to right,
			rgba(0, 0, 0, 0.9) 0%,
			rgba(0, 0, 0, 0.6) 40%,
			transparent 70%
		),
		linear-gradient(
			to top,
			var(--color-bg-pure) 0%,
			transparent 30%
		);
	}

	.hero-content {
		position: absolute;
		bottom: 20%;
		left: 4%;
		max-width: 40rem;
		z-index: 1;
	}

	.featured-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		background: var(--color-primary);
		color: var(--color-bg-pure);
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1rem;
	}

	.hero-title {
		font-size: clamp(2rem, 4vw, 3.5rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
		line-height: 1.1;
	}

	.hero-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
		margin-bottom: 1rem;
	}

	.rating {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--color-warning);
	}

	.rating :global(svg) {
		flex-shrink: 0;
	}

	.hero-description {
		font-size: 1rem;
		line-height: 1.6;
		color: var(--color-fg-secondary);
		margin: 0 0 1.5rem;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.hero-actions {
		display: flex;
		gap: 0.75rem;
	}

	.btn-play {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: 0.375rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.btn-play:hover {
		transform: scale(1.05);
	}

	.btn-add {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: rgba(255, 255, 255, 0.2);
		color: var(--color-fg-primary);
		border: none;
		border-radius: 0.375rem;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.btn-add:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.btn-info {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		background: rgba(255, 255, 255, 0.2);
		color: var(--color-fg-primary);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		cursor: pointer;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.btn-info:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	/* Categories */
	.categories {
		padding: 0 4%;
	}

	.category {
		margin-bottom: 2.5rem;
	}

	.category-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
	}

	.content-row {
		display: flex;
		gap: 0.75rem;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		-ms-overflow-style: none;
		padding-bottom: 0.5rem;
	}

	.content-row::-webkit-scrollbar {
		display: none;
	}

	.content-card {
		flex: 0 0 auto;
		width: 280px;
		scroll-snap-align: start;
		cursor: pointer;
		/* Button reset for interactive card */
		background: none;
		border: none;
		padding: 0;
		text-align: left;
		font: inherit;
		color: inherit;
	}

	.card-thumbnail {
		position: relative;
		aspect-ratio: 16/9;
		border-radius: 0.5rem;
		overflow: hidden;
		margin-bottom: 0.75rem;
	}

	.card-thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.content-card:hover .card-thumbnail img {
		transform: scale(1.05);
	}

	.badge-new {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		padding: 0.25rem 0.5rem;
		background: var(--color-primary);
		border-radius: 0.25rem;
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.progress-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: rgba(255, 255, 255, 0.3);
	}

	.progress-fill {
		height: 100%;
		background: var(--color-primary);
	}

	.card-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.content-card:hover .card-overlay {
		opacity: 1;
	}

	.play-button {
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: 50%;
		transform: scale(0.8);
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.content-card:hover .play-button {
		transform: scale(1);
	}

	.play-button :global(svg) {
		flex-shrink: 0;
	}

	.card-info {
		padding: 0 0.25rem;
	}

	.card-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-fg-primary);
		margin: 0 0 0.375rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.card-meta {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	.dot {
		width: 3px;
		height: 3px;
		background: var(--color-fg-subtle);
		border-radius: 50%;
	}

	/* Demo Notice */
	.demo-notice {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		max-width: 60rem;
		margin: 4rem auto 0;
		padding: 1rem 1.5rem;
		background: var(--color-primary-muted);
		border: 1px solid rgba(124, 43, 238, 0.3);
		border-radius: 0.75rem;
	}

	.demo-notice > :global(svg) {
		color: var(--color-primary);
		flex-shrink: 0;
	}

	.demo-notice p {
		flex: 1;
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
	}

	.switch-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-primary);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
	}

	.switch-link:hover {
		text-decoration: underline;
	}

	.switch-link :global(svg) {
		flex-shrink: 0;
	}

	@media (max-width: 768px) {
		.hero-content {
			bottom: 10%;
			left: 5%;
			right: 5%;
		}

		.hero-description {
			-webkit-line-clamp: 2;
		}

		.categories {
			padding: 0 5%;
		}

		.content-card {
			width: 200px;
		}

		.demo-notice {
			flex-direction: column;
			text-align: center;
			margin: 4rem 1rem 0;
		}
	}
</style>
