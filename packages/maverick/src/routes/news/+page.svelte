<script lang="ts">
	/**
	 * News Page - Maverick In the News
	 * Maverick X
	 *
	 * Structure: Main (heading) → FeaturedArticle → NewsGrid
	 */

	import { inview } from '$lib/actions/inview';
	import Button from '$lib/components/Button.svelte';

	let mainVisible = $state(false);
	let featuredVisible = $state(false);
	let gridVisible = $state(false);

	// News articles data - matches React mocks/news.tsx
	const newsArticles = [
		{
			id: '1',
			date: 'July 29, 2025',
			title: 'Maverick Metals launches Direct Metal Extraction Technology',
			excerpt: 'Revolutionary DME platform enables recovery of critical metals from industrial wastewater streams, transforming waste into valuable resources for the energy transition.',
			image: '/images/news-pic-2.png',
			slug: 'maverick-metals-launches-dme-technology',
			featured: true,
			category: 'Product Launch'
		},
		{
			id: '2',
			date: 'August 6, 2025',
			title: 'Maverick Metals launches Direct Metal Extraction Technology',
			excerpt: 'Follow-up developments in our groundbreaking DME technology platform.',
			image: '/images/news-pic-3.jpg',
			slug: 'dme-technology-update',
			featured: false,
			category: 'Technology'
		},
		{
			id: '3',
			date: 'July 29, 2025',
			title: 'Critical Metals Startup Relocating HQ to Austin from San Antonio',
			excerpt: 'Maverick X expands operations to Austin, positioning for accelerated growth in the critical metals recovery sector.',
			image: '/images/news-pic-5.jpg',
			slug: 'relocating-hq-to-austin',
			featured: false,
			category: 'Company News'
		},
		{
			id: '4',
			date: 'July 29, 2025',
			title: 'Maverick Metals secures $19M to strengthen global copper supply chains',
			excerpt: 'Series A funding round led by prominent investors accelerates deployment of LithX technology for critical metals recovery.',
			image: '/images/content/news-pic-1.jpg',
			slug: 'secures-19m-series-a-funding',
			featured: false,
			category: 'Funding'
		},
		{
			id: '5',
			date: 'June 15, 2025',
			title: 'LithX Technology Achieves 99.9% Metal Recovery Rate in Pilot Testing',
			excerpt: 'Breakthrough results demonstrate commercial viability of ambient-temperature metal extraction from low-grade ores.',
			image: '/images/content/news-pic-2.jpg',
			slug: 'lithx-pilot-testing-results',
			featured: false,
			category: 'Research'
		},
		{
			id: '6',
			date: 'May 20, 2025',
			title: 'Partnership with Global Mining Consortium Announced',
			excerpt: 'Strategic alliance brings LithX technology to three major mining operations across North America.',
			image: '/images/content/news-pic-3.jpg',
			slug: 'global-mining-consortium-partnership',
			featured: false,
			category: 'Partnerships'
		}
	];

	const featuredArticle = newsArticles.find(article => article.featured) || newsArticles[0];
	const regularArticles = newsArticles.filter(article => !article.featured);
</script>

<svelte:head>
	<title>News | Maverick X</title>
	<meta name="description" content="Latest news and updates from Maverick X - advances in oilfield chemistry, mining technology, and water treatment solutions." />
</svelte:head>

<!-- Main Section -->
<section
	use:inview
	oninview={() => mainVisible = true}
	class="main-section"
>
	<div class="container">
		<h1
			class="main-title scroll-reveal"
			class:scroll-reveal-hidden={!mainVisible}
		>
			Maverick In the News
		</h1>
	</div>
</section>

<!-- Featured Article Section -->
{#if featuredArticle}
	<section
		use:inview
		oninview={() => featuredVisible = true}
		class="featured-section"
	>
		<div class="container">
			<div class="featured-grid">
				<!-- Left: Image -->
				<div
					class="featured-image-wrapper scroll-reveal"
					class:scroll-reveal-hidden={!featuredVisible}
				>
					<div
						class="featured-image"
						style="background-image: url({featuredArticle.image})"
					></div>
				</div>

				<!-- Right: Content -->
				<div
					class="featured-content scroll-reveal stagger-1"
					class:scroll-reveal-hidden={!featuredVisible}
				>
					<div class="featured-date">{featuredArticle.date}</div>
					<h2 class="featured-title">{featuredArticle.title}</h2>
					<p class="featured-excerpt">{featuredArticle.excerpt}</p>
					<Button
						title="Read More"
						light
						arrow
					/>
				</div>
			</div>

			<!-- Navigation Dots -->
			<div class="dots-container">
				<div class="dots">
					<div class="dot active"></div>
					<div class="dot"></div>
				</div>
			</div>
		</div>
	</section>
{/if}

<!-- News Grid Section -->
{#if regularArticles.length > 0}
	<section
		use:inview
		oninview={() => gridVisible = true}
		class="grid-section"
	>
		<div class="container">
			<div class="news-grid">
				{#each regularArticles as article, index}
					<article
						class="news-card group scroll-reveal"
						class:scroll-reveal-hidden={!gridVisible}
						class:stagger-1={index === 0}
						class:stagger-2={index === 1}
						class:stagger-3={index === 2}
						class:stagger-4={index === 3}
					>
						<div class="card-image-wrapper">
							<div
								class="card-image"
								style="background-image: url({article.image})"
							></div>
						</div>
						<div class="card-date">{article.date}</div>
						<h3 class="card-title">{article.title}</h3>
					</article>
				{/each}
			</div>
		</div>
	</section>
{/if}

<style>
	/* Main Section - matches React pt-32 bg-black xl:pt-28 md:pt-24 */
	.main-section {
		padding-top: 8rem;  /* pt-32 */
		background: #000000;
	}

	@media (max-width: 1179px) {
		.main-section {
			padding-top: 7rem;  /* xl:pt-28 */
		}
	}

	@media (max-width: 767px) {
		.main-section {
			padding-top: 6rem;  /* md:pt-24 */
		}
	}

	.main-title {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 2.5rem;  /* text-h1: 2.5rem */
		line-height: 3.125rem;
		font-weight: 500;
		color: #ffffff;
	}

	@media (max-width: 1179px) {
		.main-title {
			font-size: 1.875rem;  /* xl:text-h1 */
			line-height: 2.34rem;
		}
	}

	/* Featured Article Section - matches React pt-12 pb-20 bg-black xl:pt-10 xl:pb-16 */
	.featured-section {
		padding: 3rem 0 5rem;  /* pt-12 pb-20 */
		background: #000000;
	}

	@media (max-width: 1179px) {
		.featured-section {
			padding: 2.5rem 0 4rem;  /* xl:pt-10 xl:pb-16 */
		}
	}

	.featured-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 4rem;  /* gap-16 */
		align-items: center;
	}

	@media (max-width: 1179px) {
		.featured-grid {
			gap: 3rem;  /* xl:gap-12 */
		}
	}

	@media (max-width: 767px) {
		.featured-grid {
			grid-template-columns: 1fr;  /* md:grid-cols-1 */
			gap: 2.5rem;  /* md:gap-10 */
		}
	}

	.featured-image-wrapper {
		position: relative;
		aspect-ratio: 4 / 3;
		border-radius: 0;  /* Sharp corners - React has rounded-2xl but all radius = 0 */
		overflow: hidden;
	}

	.featured-image {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
	}

	.featured-content {
		display: flex;
		flex-direction: column;
	}

	.featured-date {
		margin-bottom: 1rem;  /* mb-4 */
		font-size: 0.75rem;  /* text-caption */
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);  /* text-white/60 */
	}

	.featured-title {
		margin-bottom: 1.5rem;  /* mb-6 */
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 1.875rem;  /* text-h2: 1.875rem */
		line-height: 2.34rem;
		font-weight: 500;
		color: #ffffff;
	}

	@media (max-width: 1179px) {
		.featured-title {
			font-size: 1.5rem;  /* xl:text-h3 */
			line-height: 1.875rem;
		}
	}

	.featured-excerpt {
		margin-bottom: 2rem;  /* mb-8 */
		font-size: 1rem;  /* text-body */
		line-height: 1.625;
		color: rgba(255, 255, 255, 0.8);  /* text-white/80 */
	}

	/* Navigation Dots */
	.dots-container {
		display: flex;
		justify-content: center;
		margin-top: 2.5rem;  /* mt-10 */
	}

	@media (max-width: 1179px) {
		.dots-container {
			margin-top: 2rem;  /* xl:mt-8 */
		}
	}

	@media (max-width: 767px) {
		.dots-container {
			margin-top: 1.5rem;  /* md:mt-6 */
		}
	}

	.dots {
		display: flex;
		gap: 0.5rem;  /* space-x-2 */
	}

	.dot {
		width: 0.5rem;  /* w-2 */
		height: 0.5rem;  /* h-2 */
		border-radius: 50%;  /* rounded-full */
		background: rgba(255, 255, 255, 0.3);  /* bg-white/30 */
	}

	.dot.active {
		background: #ffffff;  /* bg-white */
	}

	/* News Grid Section - matches React py-20 bg-white xl:py-16 */
	.grid-section {
		padding: 5rem 0;  /* py-20 */
		background: #ffffff;
	}

	@media (max-width: 1179px) {
		.grid-section {
			padding: 4rem 0;  /* xl:py-16 */
		}
	}

	.news-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2rem;  /* gap-8 */
	}

	@media (max-width: 1179px) {
		.news-grid {
			gap: 1.5rem;  /* xl:gap-6 */
		}
	}

	@media (max-width: 1023px) {
		.news-grid {
			grid-template-columns: repeat(2, 1fr);  /* lg:grid-cols-2 */
		}
	}

	@media (max-width: 767px) {
		.news-grid {
			grid-template-columns: 1fr;  /* md:grid-cols-1 */
			gap: 2rem;  /* md:gap-8 */
		}
	}

	.news-card {
		padding: 1rem;  /* p-4 */
		transition: all 0.5s ease;
		border-radius: 0;  /* Sharp corners */
		cursor: pointer;
	}

	.news-card:hover {
		transform: translateY(-0.5rem);  /* hover:-translate-y-2 */
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);  /* hover:shadow-2xl */
	}

	.card-image-wrapper {
		position: relative;
		aspect-ratio: 4 / 3;
		border-radius: 0;  /* Sharp corners */
		overflow: hidden;
		margin-bottom: 1rem;  /* mb-4 */
	}

	.card-image {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		transition: all 0.5s ease;
	}

	:global(.group:hover) .card-image {
		transform: scale(1.02);
		filter: brightness(1.1);
	}

	.card-date {
		margin-bottom: 0.75rem;  /* mb-3 */
		font-size: 0.75rem;  /* text-caption */
		font-weight: 500;
		color: #9ca3af;  /* text-g-200 */
	}

	.card-title {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 1.25rem;  /* text-h4: 1.25rem */
		line-height: 1.56rem;
		font-weight: 500;
		color: #111827;  /* text-g-900 */
		transition: color 0.5s ease;
	}

	:global(.group:hover) .card-title {
		color: #ff7a00;  /* group-hover:text-primary-500 (petrox color) */
	}
</style>
