<script lang="ts">
	import type { PageData } from "./$types";
	import ArticleHeader from "$lib/components/ArticleHeader.svelte";
	import ArticleContent from "$lib/components/ArticleContent.svelte";
	import { ShareButtons, SEO } from "@create-something/components";
	import RelatedArticles from "$lib/components/RelatedArticles.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import StickyCTA from "$lib/components/StickyCTA.svelte";
	import NextExperimentCard from "$lib/components/NextExperimentCard.svelte";
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import confetti from "canvas-confetti";
	import {
		markExperimentCompleted,
		isExperimentCompleted,
		validateCompletionToken,
		clearExperimentCompletion,
	} from "@create-something/components/utils";
	import { getNextPaper } from "$lib/utils/recommendations";

	let { data }: { data: PageData } = $props();
	const { paper, relatedPapers } = data;

	// Generate full URL for sharing
	const fullUrl = `https://createsomething.io/experiments/${paper.slug}`;

	// Check if this has an interactive SPACE version
	const hasInteractive = !!paper.interactive_demo_url;

	// Find the next paper in the horizon
	const nextPaper = getNextPaper(paper.slug);

	let isCompleted = $state(false);

	function handleReset() {
		clearExperimentCompletion(paper.slug);
		isCompleted = false;
	}

	onMount(() => {
		// Track experiment view
		if (typeof window !== 'undefined' && (window as any).trackEvent) {
			(window as any).trackEvent('experiment_view', {
				experiment_id: paper.id,
				path: `/experiments/${paper.slug}`
			});
		}

		// Check if we just returned from SPACE with a completion token
		if (validateCompletionToken($page.url)) {
			markExperimentCompleted(paper.slug);

			// Trigger celebration!
			confetti({
				particleCount: 100,
				spread: 70,
				origin: { y: 0.6 },
			});

			// Clean up URL without reloading
			const newUrl = new URL($page.url);
			newUrl.searchParams.delete("completed");
			window.history.replaceState({}, "", newUrl);
		}

		// Check persistent state
		isCompleted = isExperimentCompleted(paper.slug);
	});
</script>

<SEO
	title={paper.title}
	description={paper.description || paper.excerpt_long || paper.excerpt_short || "Technical experiment on modern development practices"}
	keywords={paper.focus_keywords || `${paper.category}, automation, development, tutorial`}
	canonical={fullUrl}
	ogType="article"
	publishedTime={paper.created_at}
	modifiedTime={paper.updated_at}
	articleSection={paper.category}
	articleTags={paper.tags ? paper.tags.map((t: any) => t.name) : []}
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io/' },
		{ name: 'Experiments', url: 'https://createsomething.io/experiments' },
		{ name: paper.title, url: fullUrl }
	]}
/>

<div class="min-h-screen bg-black">
	<!-- Article Header -->
	<ArticleHeader {paper} />

	<!-- Main Content with Sidebar -->
	<div class="w-full max-w-7xl mx-auto px-6">
		<div class="grid grid-cols-1 lg:grid-cols-[80px_1fr] gap-12">
			<!-- Sidebar - Share Buttons (left, sticky) -->
			<aside class="hidden lg:block">
				<ShareButtons title={paper.title} url={fullUrl} {isCompleted} />
			</aside>

			<!-- Article Content -->
			<div class="min-w-0">
				<ArticleContent {paper} {isCompleted} onReset={handleReset} />
			</div>
		</div>
	</div>

	<!-- Related Articles -->
	<RelatedArticles papers={relatedPapers} currentPaperId={paper.id} />

	<!-- Back to Experiments -->
	<div class="w-full max-w-5xl mx-auto px-6 py-12">
		<a
			href="/experiments"
			class="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
		>
			<svg
				class="w-5 h-5"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 19l-7-7 7-7"
				/>
			</svg>
			Back to all experiments
		</a>
	</div>

	<!-- Footer -->
	

	<!-- Sticky CTA for Interactive Experiments -->
	{#if hasInteractive && paper.interactive_demo_url}
		<StickyCTA
			spaceUrl={paper.interactive_demo_url}
			paperTitle={paper.title}
			{isCompleted}
			onReset={handleReset}
		/>
	{/if}

	{#if isCompleted && nextPaper}
		<div class="max-w-4xl mx-auto px-6 pb-24">
			<NextExperimentCard {nextPaper} />
		</div>
	{/if}
</div>
