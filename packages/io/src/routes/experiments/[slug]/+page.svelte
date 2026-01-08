<script lang="ts">
	import type { PageData } from "./$types";
	import ArticleHeader from "$lib/components/ArticleHeader.svelte";
	import ArticleContent from "$lib/components/ArticleContent.svelte";
	import { ShareButtons, SEO, RelatedArticles, PageActions, MarkdownPreviewModal } from "@create-something/components";
	import Footer from "$lib/components/Footer.svelte";
	import StickyCTA from "$lib/components/StickyCTA.svelte";
	import NextExperimentCard from "$lib/components/NextExperimentCard.svelte";
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

	// Use $derived to ensure reactivity on client-side navigation
	const paper = $derived(data.paper);
	const relatedPapers = $derived(data.relatedPapers);

	// Generate full URL for sharing (must also be derived)
	const fullUrl = $derived(`https://createsomething.io/experiments/${paper.slug}`);

	// Check if this has an interactive SPACE version (must also be derived)
	const hasInteractive = $derived(!!paper.interactive_demo_url);

	// Find the next paper in the horizon (must also be derived)
	const nextPaper = $derived(getNextPaper([paper, ...relatedPapers], paper.slug));

	let isCompleted = $state(false);

	// Modal state for markdown preview
	let showMarkdownPreview = $state(false);
	let markdownContent = $state('');

	function handleReset() {
		clearExperimentCompletion(paper.slug);
		isCompleted = false;
	}

	function handlePreview(markdown: string) {
		markdownContent = markdown;
		showMarkdownPreview = true;
	}

	// Generate markdown content for export
	const experimentContent = $derived(`
## ${paper.title}

${paper.description || paper.excerpt_long || ''}

**Category**: ${paper.category}
**Type**: ${hasInteractive ? 'Interactive Experiment' : 'Technical Experiment'}

${paper.content || ''}

${hasInteractive ? `
---

**Interactive Version**: ${paper.interactive_demo_url}
` : ''}

---

**Full Experiment**: ${fullUrl}
	`.trim());

	// Use $effect to handle completion state and tracking on route changes
	$effect(() => {
		// Track paper.slug to re-run when navigating between articles
		const currentSlug = paper.slug;

		// Track experiment view
		if (typeof window !== 'undefined' && (window as any).trackEvent) {
			(window as any).trackEvent('experiment_view', {
				experiment_id: paper.id,
				path: `/experiments/${currentSlug}`
			});
		}

		// Check if we just returned from SPACE with a completion token
		if (validateCompletionToken($page.url)) {
			markExperimentCompleted(currentSlug);

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

			isCompleted = true;
		} else {
			// Check persistent state for this specific slug
			isCompleted = isExperimentCompleted(currentSlug);
		}
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

<div class="min-h-screen page-container">
	<!-- Article Header -->
	<ArticleHeader {paper} />

	<!-- Main Content with Sidebar -->
	<div class="w-full max-w-7xl mx-auto px-6">
		<div class="grid grid-cols-1 lg:grid-cols-[80px_1fr] gap-12">
			<!-- Sidebar - Share Buttons (left, sticky) -->
			<aside class="hidden lg:block">
				<div class="flex flex-col gap-4">
					<ShareButtons title={paper.title} url={fullUrl} {isCompleted} />
					<PageActions
						title={paper.title}
						content={experimentContent}
						metadata={{
							category: paper.category,
							sourceUrl: fullUrl,
							keywords: paper.focus_keywords?.split(',').map(k => k.trim())
						}}
						claudePrompt="Help me understand this experiment and how to apply it."
						onpreview={handlePreview}
					/>
				</div>
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
			class="inline-flex items-center gap-2 back-link"
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

<!-- Markdown Preview Modal -->
<MarkdownPreviewModal
	bind:open={showMarkdownPreview}
	content={markdownContent}
	title="Experiment Markdown"
/>

<style>
	.page-container {
		background-color: var(--color-bg-pure);
	}

	.back-link {
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}
</style>
