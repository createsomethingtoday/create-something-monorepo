<script lang="ts">
	/**
	 * OUTERFIELDS Demo Page
	 *
	 * Showcases a finished PCN subscriber experience.
	 * Example subscription tiers: Monthly ($9), Annual ($99), Lifetime ($199)
	 */
	import { Star, Play, Plus, Info, ArrowRight, Check, ArrowLeft } from 'lucide-svelte';
	import { videoPlayer, type Video } from '$lib/stores/videoPlayer';
	import VideoModal from '$lib/components/VideoModal.svelte';

	// Example subscription tiers
	const subscriptionTiers = [
		{
			id: 'monthly',
			name: 'Monthly',
			price: '$9',
			period: '/month',
			description: 'Flexible monthly access',
			features: ['Full content library', 'HD streaming', 'Cancel anytime']
		},
		{
			id: 'annual',
			name: 'Annual',
			price: '$99',
			period: '/year',
			description: 'Save 8% annually',
			features: ['Full content library', '4K streaming', 'Priority support', 'Exclusive content'],
			popular: true
		},
		{
			id: 'lifetime',
			name: 'Lifetime',
			price: '$199',
			period: 'one-time',
			description: 'Pay once, access forever',
			features: ['Full content library', '4K streaming', 'Priority support', 'Exclusive content', 'Future updates included']
		}
	];

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
	// Note: Engagement heatmap is sourced from KV via the shared VideoModal store,
	// so we don't pass in local mock engagement data here.

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
		title: 'Demo: Private Content Network',
		description:
			'This is an example of what a finished PCN looks like for subscribers. Full video playback, engagement analytics, and AI-powered features—all included in every network we build.',
		thumbnail: '/thumbnails/hero-building-outerfields.jpg',
		duration: '16 min',
		rating: '4.9',
		year: '2026',
		category: 'Demo'
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
	<title>Demo: Private Content Network Experience | OUTERFIELDS</title>
</svelte:head>

<div class="portal">
	<!-- Back to Main Site -->
	<a href="/" class="back-link">
		<ArrowLeft size={16} />
		Return to Main Site
	</a>

	<!-- Featured Hero -->
	<section class="featured-hero">
		<div class="hero-backdrop">
			<!-- Sketchfab 3D embed background -->
			<iframe
				title="OUTERFIELDS 3D Experience"
				class="sketchfab-embed"
				frameborder="0"
				allow="autoplay; fullscreen"
				src="https://sketchfab.com/models/d6521362b37b48e3a82bce4911409303/embed?autospin=0.2&autostart=1&preload=1&ui_infos=0&ui_stop=0&ui_inspector=0&ui_watermark_link=0&ui_watermark=0&ui_hint=0&ui_ar=1&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0&ui_theme=dark&dnt=1"
			></iframe>
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

	<!-- About This Demo -->
	<section class="about-demo">
		<div class="about-card">
			<Info size={24} />
			<div class="about-content">
				<h3>About This Demo</h3>
				<p>
					You're viewing an example of a finished Private Content Network. This is what your subscribers see—premium content, seamless playback, and a professional browsing experience. Every PCN we build includes these features and more.
				</p>
			</div>
		</div>
	</section>

	<!-- Example Subscription Pricing -->
	<section class="pricing-section">
		<div class="pricing-header">
			<h2>Example Subscription Tiers</h2>
			<p>Flexible pricing options for your audience</p>
		</div>
		<div class="pricing-grid">
			{#each subscriptionTiers as tier}
				<div class="pricing-card" class:popular={tier.popular}>
					{#if tier.popular}
						<span class="popular-badge">Most Popular</span>
					{/if}
					<h3 class="tier-name">{tier.name}</h3>
					<div class="tier-price">
						<span class="price">{tier.price}</span>
						<span class="period">{tier.period}</span>
					</div>
					<p class="tier-description">{tier.description}</p>
					<ul class="tier-features">
						{#each tier.features as feature}
							<li>
								<Check size={14} />
								{feature}
							</li>
						{/each}
					</ul>
					<button class="tier-button" disabled>
						Example Only
					</button>
				</div>
			{/each}
		</div>
		<p class="pricing-note">
			These are example tiers. Your PCN pricing is fully customizable to match your business model.
		</p>
	</section>

	<!-- Return CTA -->
	<div class="return-cta">
		<h3>Ready to Build Your Own PCN?</h3>
		<p>We handle everything—platform, production, marketing, and ongoing support.</p>
		<a href="/#pricing" class="cta-button">
			View Pricing
			<ArrowRight size={16} />
		</a>
	</div>
</div>

<!-- Shared video modal component (DRY: reused from marketing page) -->
<VideoModal />

<style>
	.portal {
		min-height: 100vh;
		background: var(--color-bg-pure);
		padding-bottom: 4rem;
	}

	/* Back Link */
	.back-link {
		position: fixed;
		top: 5rem;
		left: 1.5rem;
		z-index: 100;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(30, 30, 30, 0.9);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-secondary);
		font-size: 0.875rem;
		text-decoration: none;
		backdrop-filter: blur(8px);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
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
		overflow: hidden;
	}

	.hero-backdrop :global(.sketchfab-embed) {
		width: 100%;
		height: 120%;
		border: none;
		pointer-events: none;
		transform: scale(1.1);
		transform-origin: center center;
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
		line-clamp: 3;
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
		color: var(--color-bg-pure); /* Black text on white background */
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

	/* Play button styles are global in app.css */

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

	/* About Demo Section */
	.about-demo {
		padding: 0 4%;
		margin-bottom: 3rem;
	}

	.about-card {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		max-width: 60rem;
		margin: 0 auto;
		padding: 1.5rem 2rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
	}

	.about-card > :global(svg) {
		color: var(--color-sun);
		flex-shrink: 0;
		margin-top: 0.25rem;
	}

	.about-content h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.about-content p {
		font-size: 0.9375rem;
		color: var(--color-fg-muted);
		line-height: 1.6;
		margin: 0;
	}

	/* Pricing Section */
	.pricing-section {
		padding: 4rem 4%;
		background: var(--color-bg-surface);
	}

	.pricing-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.pricing-header h2 {
		font-size: clamp(1.5rem, 3vw, 2rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.pricing-header p {
		font-size: 1rem;
		color: var(--color-slate);
		margin: 0;
	}

	.pricing-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
		max-width: 60rem;
		margin: 0 auto;
	}

	.pricing-card {
		position: relative;
		padding: 2rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		text-align: center;
	}

	.pricing-card.popular {
		border-color: var(--color-sun);
	}

	.popular-badge {
		position: absolute;
		top: -0.75rem;
		left: 50%;
		transform: translateX(-50%);
		padding: 0.25rem 0.75rem;
		background: var(--color-sun);
		color: white;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-radius: 9999px;
	}

	.tier-name {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
	}

	.tier-price {
		margin-bottom: 0.5rem;
	}

	.tier-price .price {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.tier-price .period {
		font-size: 1rem;
		color: var(--color-slate);
	}

	.tier-description {
		font-size: 0.875rem;
		color: var(--color-slate);
		margin: 0 0 1.5rem;
	}

	.tier-features {
		list-style: none;
		padding: 0;
		margin: 0 0 1.5rem;
		text-align: left;
	}

	.tier-features li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
		padding: 0.375rem 0;
	}

	.tier-features li :global(svg) {
		color: var(--color-sun);
		flex-shrink: 0;
	}

	.tier-button {
		width: 100%;
		padding: 0.75rem 1.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-fg-muted);
		cursor: not-allowed;
	}

	.pricing-note {
		text-align: center;
		font-size: 0.875rem;
		color: var(--color-slate);
		margin: 2rem 0 0;
	}

	/* Return CTA */
	.return-cta {
		text-align: center;
		padding: 4rem 1.5rem;
	}

	.return-cta h3 {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.return-cta p {
		font-size: 1rem;
		color: var(--color-slate);
		margin: 0 0 1.5rem;
	}

	.cta-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 2rem;
		background: var(--color-sun);
		color: white;
		font-size: 1rem;
		font-weight: 700;
		text-decoration: none;
		border-radius: 0.5rem;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.cta-button:hover {
		background: var(--color-primary-hover);
		transform: scale(1.02);
	}

	@media (max-width: 900px) {
		.pricing-grid {
			grid-template-columns: 1fr;
			max-width: 24rem;
		}
	}

	@media (max-width: 768px) {
		.back-link {
			top: auto;
			bottom: 1rem;
			left: 1rem;
			right: 1rem;
			justify-content: center;
		}

		.hero-content {
			bottom: 10%;
			left: 5%;
			right: 5%;
		}

		.hero-description {
			-webkit-line-clamp: 2;
			line-clamp: 2;
		}

		.categories {
			padding: 0 5%;
		}

		.content-card {
			width: 200px;
		}

		.about-demo {
			padding: 0 5%;
		}

		.about-card {
			flex-direction: column;
			text-align: center;
		}

		.pricing-section {
			padding: 3rem 5%;
		}
	}
</style>
