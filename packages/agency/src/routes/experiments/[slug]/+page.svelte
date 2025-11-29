<script lang="ts">
	import type { PageData } from './$types';
	import ArticleHeader from '$lib/components/ArticleHeader.svelte';
	import ArticleContent from '$lib/components/ArticleContent.svelte';
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	import RelatedArticles from '$lib/components/RelatedArticles.svelte';

	export let data: PageData;

	// Use reactive declarations to ensure reactivity on client-side navigation
	$: paper = data.paper;
	$: relatedPapers = data.relatedPapers;

	// Generate full URL for sharing (must also be reactive)
	$: fullUrl = `https://createsomething.agency/experiments/${paper.slug}`;
</script>

<svelte:head>
	<title>{paper.title} | CREATE SOMETHING SPACE</title>
	<meta
		name="description"
		content={paper.description ||
			paper.excerpt_long ||
			paper.excerpt_short ||
			'Community experiment from the playground'}
	/>
	<meta
		name="keywords"
		content={paper.focus_keywords || `${paper.category}, experiments, community, fork, learn`}
	/>

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="article" />
	<meta property="og:url" content={fullUrl} />
	<meta property="og:title" content={paper.title} />
	<meta
		property="og:description"
		content={paper.description ||
			paper.excerpt_long ||
			'Community experiment from the playground'}
	/>
	<meta property="og:site_name" content="CREATE SOMETHING SPACE" />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content={fullUrl} />
	<meta name="twitter:title" content={paper.title} />
	<meta
		name="twitter:description"
		content={paper.description || paper.excerpt_short || 'Community experiment'}
	/>
</svelte:head>

<div class="min-h-screen bg-black">
	<!-- Article Header -->
	<ArticleHeader {paper} />

	<!-- Main Content with Sidebar -->
	<div class="w-full max-w-7xl mx-auto px-6">
		<div class="grid grid-cols-1 lg:grid-cols-[80px_1fr] gap-12">
			<!-- Sidebar - Share Buttons (left, sticky) -->
			<aside class="hidden lg:block">
				<ShareButtons title={paper.title} url={fullUrl} />
			</aside>

			<!-- Article Content -->
			<div class="min-w-0">
				<ArticleContent {paper} />
			</div>
		</div>
	</div>

	<!-- Related Articles -->
	<RelatedArticles papers={relatedPapers} currentPaperId={paper.id} />

	<!-- Back to Experiments -->
	<div class="w-full max-w-5xl mx-auto px-6 py-12">
		<a
			href="/experiments"
			class="inline-flex items-center gap-2 text-terminal-green hover:text-white transition-colors"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to all experiments
		</a>
	</div>
</div>

<style>
	:global(.text-terminal-green) {
		color: #00ff00;
	}
</style>
