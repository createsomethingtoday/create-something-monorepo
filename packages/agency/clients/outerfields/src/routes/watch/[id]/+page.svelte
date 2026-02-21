<script lang="ts">
	/**
	 * OUTERFIELDS Watch Page
	 *
	 * Dedicated video landing page with:
	 * - Full video player with engagement heatmap
	 * - Related videos sidebar
	 * - Comments section
	 * - Transcript panel
	 * - View analytics
	 * - SEO optimization
	 */
	import WatchPagePlayer from '$lib/components/WatchPagePlayer.svelte';
	import RelatedVideos from '$lib/components/RelatedVideos.svelte';
	import VideoAnalytics from '$lib/components/VideoAnalytics.svelte';
	import CommentSection from '$lib/components/CommentSection.svelte';
	import TranscriptPanel from '$lib/components/TranscriptPanel.svelte';
	import { ChevronLeft, ChevronRight, Lock } from 'lucide-svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	import { VIDEO_CDN_BASE } from '$lib/constants/video';
	import { fetchVideoPlayback } from '$lib/client/video-playback';

	// In dev, when the CDN file is missing, use a public sample so the player still works
	const FALLBACK_VIDEO_SRC = import.meta.env.DEV
		? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
		: undefined;

	let { data }: { data: PageData } = $props();

	const video = $derived(data.video);
	const related = $derived(data.related);
	const isAccessible = $derived(data.isAccessible);
	const isMember = $derived(data.isMember);
	const user = $derived(data.user);
	const isAdmin = $derived(data.isAdmin);
	const series = $derived(data.series);

	// Current playback time for transcript sync
	let currentTime = $state(0);

	let playbackSrc = $state<string | null>(null);
	let playbackState = $state<
		| { status: 'idle' | 'loading' }
		| { status: 'ready'; src: string }
		| { status: 'processing'; message: string }
		| { status: 'failed'; message: string }
		| { status: 'unavailable'; message: string }
		| { status: 'error'; message: string }
		| { status: 'auth_required'; message: string }
	>({ status: 'idle' });

	// Get video source URL
	function getVideoSrc(assetPath: string): string {
		if (assetPath.startsWith('http')) return assetPath;
		return `${VIDEO_CDN_BASE}${assetPath.startsWith('/') ? '' : '/'}${assetPath}`;
	}

	// Get thumbnail URL
	function getThumbnailSrc(thumbnailPath: string): string {
		if (thumbnailPath.startsWith('/thumbnails/')) return thumbnailPath;
		return `/thumbnails${thumbnailPath.startsWith('/') ? '' : '/'}${thumbnailPath}`;
	}

	// Format time display
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function titleizeSlug(value: string): string {
		return value
			.split('-')
			.filter(Boolean)
			.map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
			.join(' ');
	}

	// Transform related videos to RelatedVideos format
	function transformVideos(videos: typeof related.sameCategory) {
		return videos.map(v => ({
			id: v.id,
			title: v.title,
			thumbnail: getThumbnailSrc(v.thumbnail_path),
			duration: formatTime(v.duration),
			tier: v.tier,
			category: v.category,
			episodeNumber: v.episode_number ?? undefined
		}));
	}

	const relatedVideosData = $derived([
		...transformVideos(related.sameCategory),
		...transformVideos(related.otherCategories)
	]);

	// Handle time updates from player
	function handleTimeUpdate(time: number, duration: number) {
		currentTime = time;
	}

	// Handle transcript seek
	function handleTranscriptSeek(time: number) {
		// The WatchPagePlayer doesn't expose a seek function, so we'd need to add that
		// For now, this is a placeholder
		console.log('Seek to:', time);
	}

	async function resolvePlayback() {
		if (!video || !isAccessible) return;

		playbackState = { status: 'loading' };
		playbackSrc = null;

		const playback = await fetchVideoPlayback(video.id);

		if (playback.status === 'ready' && playback.grant?.hlsUrl) {
			playbackSrc = playback.grant.hlsUrl;
			playbackState = { status: 'ready', src: playback.grant.hlsUrl };
			return;
		}

		if (playback.status === 'legacy') {
			const legacyPath = playback.legacyAssetPath || video.asset_path;
			if (legacyPath) {
				const src = getVideoSrc(legacyPath);
				playbackSrc = src;
				playbackState = { status: 'ready', src };
				return;
			}
		}

		if (playback.status === 'processing') {
			playbackState = { status: 'processing', message: playback.message || 'Video is still processing' };
			return;
		}

		if (playback.status === 'failed') {
			playbackState = { status: 'failed', message: playback.message || 'Video processing failed' };
			return;
		}

		if (playback.status === 'auth_required') {
			playbackState = { status: 'auth_required', message: playback.message || 'Membership required' };
			return;
		}

		if (playback.status === 'unavailable') {
			playbackState = { status: 'unavailable', message: playback.message || 'Video unavailable' };
			return;
		}

		playbackState = { status: 'error', message: playback.message || 'Failed to resolve playback' };
	}

	onMount(() => {
		void resolvePlayback();
	});

	// SEO data
	const seo = $derived({
		title: video ? `${video.title} | OUTERFIELDS` : 'Watch | OUTERFIELDS',
		description: video?.description || `Watch ${video?.title} on OUTERFIELDS - Premium content network`,
		image: video ? `https://outerfields.createsomething.agency${getThumbnailSrc(video.thumbnail_path)}` : 'https://outerfields.createsomething.agency/og-image.svg',
		url: video ? `https://outerfields.createsomething.agency/watch/${video.id}` : ''
	});

	// JSON-LD Video Schema
	const videoSchema = $derived(video ? (() => {
		const schema: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'VideoObject',
		name: video.title,
		description: video.description || `Watch ${video.title} on OUTERFIELDS`,
		thumbnailUrl: seo.image,
		uploadDate: new Date(video.created_at * 1000).toISOString(),
		duration: `PT${Math.floor(video.duration / 60)}M${video.duration % 60}S`,
		embedUrl: seo.url,
		publisher: {
			'@type': 'Organization',
			name: 'OUTERFIELDS',
			logo: {
				'@type': 'ImageObject',
				url: 'https://outerfields.createsomething.agency/logo-outerfields.png'
			}
		}
		};

		if (video.asset_path) {
			schema.contentUrl = getVideoSrc(video.asset_path);
		}

		return schema;
	})() : null);
</script>

<svelte:head>
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	<meta property="og:type" content="video.other" />
	<meta property="og:title" content={seo.title} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:image" content={seo.image} />
	<meta property="og:url" content={seo.url} />
	<meta name="twitter:card" content="player" />
	<meta name="twitter:title" content={seo.title} />
	<meta name="twitter:description" content={seo.description} />
	<meta name="twitter:image" content={seo.image} />
	{#if videoSchema}
		{@html `<script type="application/ld+json">${JSON.stringify(videoSchema)}</script>`}
	{/if}
</svelte:head>

<div class="watch-page">
	<div class="watch-layout">
		<!-- Main Content -->
		<div class="main-content">
			<!-- Video Player -->
			{#if isAccessible}
				{#if playbackSrc}
					<WatchPagePlayer
						videoId={video.id}
						src={playbackSrc}
						poster={getThumbnailSrc(video.thumbnail_path)}
						title={video.title}
						fallbackSrc={FALLBACK_VIDEO_SRC}
						onTimeUpdate={handleTimeUpdate}
					/>
				{:else}
					<div class="gate-container">
						<div class="gate-poster" style="background-image: url({getThumbnailSrc(video.thumbnail_path)})">
							<div class="gate-overlay">
								{#if playbackState.status === 'loading' || playbackState.status === 'idle'}
									<h2>Loading video…</h2>
									<p>Preparing playback.</p>
								{:else if playbackState.status === 'processing'}
									<h2>Processing</h2>
									<p>{playbackState.message}</p>
								{:else if playbackState.status === 'failed'}
									<h2>Processing Failed</h2>
									<p>{playbackState.message}</p>
								{:else if playbackState.status === 'unavailable'}
									<h2>Unavailable</h2>
									<p>{playbackState.message}</p>
								{:else if playbackState.status === 'auth_required'}
									<Lock size={48} />
									<h2>Members Only</h2>
									<p>{playbackState.message}</p>
									<a href="/#pricing" class="gate-cta">
										Become a Founding Member - $99
									</a>
								{:else if playbackState.status === 'error'}
									<h2>Error</h2>
									<p>{playbackState.message}</p>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			{:else}
				<div class="gate-container">
					<div class="gate-poster" style="background-image: url({getThumbnailSrc(video.thumbnail_path)})">
						<div class="gate-overlay">
							<Lock size={48} />
							<h2>Members Only</h2>
							<p>This content requires a membership to view.</p>
							<a href="/#pricing" class="gate-cta">
								Become a Founding Member - $99
							</a>
						</div>
					</div>
				</div>
			{/if}

			<!-- Video Info -->
			<div class="video-info">
				<div class="video-meta">
					<a href="/" class="category-link">
						{series?.title || titleizeSlug(video.category)}
					</a>
					{#if isAdmin && video.visibility !== 'published'}
						<span class="episode-badge">{video.visibility.toUpperCase()}</span>
					{/if}
					{#if video.episode_number}
						<span class="episode-badge">Episode {video.episode_number}</span>
					{/if}
					<span class="tier-badge" class:free={video.tier === 'free'}>
						{video.tier === 'free' ? 'FREE' : 'MEMBERS'}
					</span>
				</div>
				<h1 class="video-title">{video.title}</h1>
				{#if video.description}
					<p class="video-description">{video.description}</p>
				{/if}

				<!-- Analytics -->
				<VideoAnalytics 
					videoId={video.id} 
					publishedAt={new Date(video.created_at * 1000).toISOString()}
				/>

				<!-- Episode Navigation -->
				{#if related.prevVideo || related.nextVideo}
					<div class="episode-nav">
						{#if related.prevVideo}
							<a href="/watch/{related.prevVideo.id}" class="episode-link prev">
								<ChevronLeft size={20} />
								<span>Previous: {related.prevVideo.title}</span>
							</a>
						{/if}
						{#if related.nextVideo}
							<a href="/watch/{related.nextVideo.id}" class="episode-link next">
								<span>Next: {related.nextVideo.title}</span>
								<ChevronRight size={20} />
							</a>
						{/if}
					</div>
				{/if}

				<!-- Transcript Panel -->
				<div class="transcript-section">
					<TranscriptPanel
						videoId={video.id}
						currentTime={currentTime}
						onSeek={handleTranscriptSeek}
					/>
				</div>

				<!-- Comments Section -->
				<CommentSection
					videoId={video.id}
					isMember={isMember}
					user={user ? { id: user.id, name: user.name || 'Member', email: user.email } : null}
				/>
			</div>
		</div>

		<!-- Sidebar: Related Videos -->
		<aside class="sidebar">
			<RelatedVideos
				videos={relatedVideosData}
				currentVideoId={video.id}
				title="Up Next"
				layout="sidebar"
			/>
		</aside>
	</div>
</div>

<style>
	.watch-page {
		min-height: 100vh;
		background: var(--color-bg-pure);
		padding-top: 5rem; /* Account for fixed navigation */
		overflow-x: hidden;
		max-width: 100vw;
	}

	.watch-layout {
		display: grid;
		grid-template-columns: 1fr 360px;
		gap: 1.5rem;
		max-width: 1800px;
		width: 100%;
		margin: 0 auto;
		padding: 0 1.5rem;
		box-sizing: border-box;
	}

	/* Main Content - min-width: 0 allows grid item to shrink below content size */
	.main-content {
		min-width: 0;
		max-width: 100%;
	}

	/* Gate Container */
	.gate-container {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.gate-poster {
		width: 100%;
		height: 100%;
		background-size: cover;
		background-position: center;
		filter: blur(8px);
	}

	.gate-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.85);
		text-align: center;
		padding: 2rem;
	}

	.gate-overlay :global(svg) {
		color: var(--color-fg-muted);
		margin-bottom: 1rem;
	}

	.gate-overlay h2 {
		font-size: 1.5rem;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.gate-overlay p {
		color: var(--color-fg-muted);
		margin: 0 0 1.5rem;
	}

	.gate-cta {
		display: inline-block;
		padding: 0.875rem 1.5rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: 0.5rem;
		font-weight: 600;
		text-decoration: none;
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.gate-cta:hover {
		transform: scale(1.02);
	}

	/* Video Info */
	.video-info {
		padding: 1.5rem 0;
	}

	.video-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
	}

	.category-link {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-primary);
		text-decoration: none;
	}

	.category-link:hover {
		text-decoration: underline;
	}

	.episode-badge,
	.tier-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.episode-badge {
		background: var(--color-bg-surface);
		color: var(--color-fg-secondary);
	}

	.tier-badge {
		background: var(--color-bg-surface);
		color: var(--color-fg-muted);
	}

	.tier-badge.free {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.video-title {
		font-size: clamp(1.5rem, 3vw, 2rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.75rem;
		line-height: 1.2;
	}

	.video-description {
		font-size: 1rem;
		color: var(--color-fg-muted);
		margin: 0 0 1.5rem;
		line-height: 1.6;
	}

	/* Episode Navigation */
	.episode-nav {
		display: flex;
		gap: 1rem;
		margin: 1.5rem 0;
		padding: 1.5rem 0;
		border-top: 1px solid var(--color-border-default);
		border-bottom: 1px solid var(--color-border-default);
		flex-wrap: wrap;
	}

	.episode-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-secondary);
		text-decoration: none;
		font-size: 0.875rem;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.episode-link:hover {
		border-color: var(--color-border-strong);
	}

	.episode-link.next {
		margin-left: auto;
	}

	/* Transcript Section */
	.transcript-section {
		margin: 1.5rem 0;
	}

	/* Sidebar */
	.sidebar {
		padding-top: 0.5rem;
	}

	/* Responsive - iPad and tablets (single column + tighter layout) */
	@media (max-width: 1100px) {
		.watch-layout {
			grid-template-columns: 1fr;
			padding: 0 1rem;
			gap: 1.25rem;
		}

		.sidebar {
			padding: 0 0 2rem;
		}
	}

	/* Tablet-only: reduce vertical bulk so the page isn't too tall */
	@media (max-width: 1100px) and (min-width: 641px) {
		.watch-page {
			padding-top: 4rem;
		}

		.video-info {
			padding: 1rem 0;
		}

		.video-meta {
			margin-bottom: 0.5rem;
		}

		.video-title {
			margin-bottom: 0.5rem;
		}

		.video-description {
			margin-bottom: 1rem;
		}

		.episode-nav {
			margin: 1.25rem 0;
			padding: 1.25rem 0;
		}

		.transcript-section {
			margin: 1rem 0;
		}
	}

	/* Tablet portrait and below */
	@media (max-width: 768px) {
		.watch-page {
			padding-top: 4rem;
		}

		.video-info {
			padding: 1.25rem 0;
		}
	}

	/* Mobile - reduce vertical bulk so the page isn't too tall */
	@media (max-width: 640px) {
		.watch-page {
			padding-top: 0;
			min-height: auto;
		}

		.watch-layout {
			padding: 0 0.75rem;
			gap: 1rem;
		}

		.video-info {
			padding: 0.75rem 0;
		}

		.video-meta {
			margin-bottom: 0.5rem;
		}

		.video-title {
			margin-bottom: 0.5rem;
		}

		.video-description {
			margin-bottom: 1rem;
		}

		.episode-nav {
			margin: 1rem 0;
			padding: 1rem 0;
			flex-direction: column;
		}

		.episode-link.next {
			margin-left: 0;
		}

		.transcript-section {
			margin: 0.75rem 0;
		}

		.sidebar {
			padding: 0 0 2rem;
		}
	}

	/* Very small viewports - prevent overflow */
	@media (max-width: 380px) {
		.watch-layout {
			padding: 0 0.5rem;
		}
	}
</style>
