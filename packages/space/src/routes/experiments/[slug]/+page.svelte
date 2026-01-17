<script lang="ts">
	import type { PageData } from './$types';
	import ArticleHeader from '$lib/components/ArticleHeader.svelte';
	import ExperimentRuntime from '$lib/components/ExperimentRuntime.svelte';
	import ExperimentCodeEditor from '$lib/components/ExperimentCodeEditor.svelte';
	import RelatedPapersCard from '$lib/components/RelatedPapersCard.svelte';
	import { RelatedArticles, PageActions, MarkdownPreviewModal } from '@create-something/components';
	import { RelatedContent } from '@create-something/components/navigation';
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	import NextExperimentCard from '$lib/components/NextExperimentCard.svelte';
	import { isExecutable, isCodeExperiment } from '$lib/types/paper';
	import { getNextPaper } from '$lib/utils/recommendations';
	import { page } from '$app/stores';
	import {
		markExperimentCompleted,
		isExperimentCompleted,
		validateCompletionToken,
		trackExperimentStart
	} from '$lib/utils/completion';

	let { data }: { data: PageData } = $props();

	// Use $derived to ensure reactivity on client-side navigation
	const paper = $derived(data.paper);
	const relatedPapers = $derived(data.relatedPapers);

	// Check experiment type (must also be derived)
	const canRunTerminal = $derived(isExecutable(paper));
	const isCodeEditor = $derived(isCodeExperiment(paper));

	// Completion tracking
	let isCompleted = $state(false);

	// Modal state for markdown preview
	let showMarkdownPreview = $state(false);
	let markdownContent = $state('');

	// Next paper recommendation (must also be derived)
	const nextPaper = $derived(getNextPaper([paper, ...relatedPapers], paper.slug));

	// Generate URLs (must also be derived)
	const fullUrl = $derived(`https://createsomething.space/experiments/${paper.slug}`);
	const ioUrl = $derived(`https://createsomething.io/experiments/${paper.slug}`);
	const returnUrl = $derived(`${ioUrl}?completed=true`);

	function handleComplete() {
		isCompleted = true;
		markExperimentCompleted(paper.slug);
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
**Type**: ${canRunTerminal ? 'Terminal Experiment' : isCodeEditor ? 'Code Editor Experiment' : 'Interactive Experiment'}

${paper.content || ''}

---

**Interactive Version**: ${fullUrl}
**Research Paper**: ${ioUrl}
	`.trim());

	// Use $effect to handle completion state on route changes
	$effect(() => {
		// Track paper.slug to re-run when navigating between articles
		const currentSlug = paper.slug;

		// Track experiment start
		trackExperimentStart(currentSlug);

		// Check if we just returned from .io with a completion token
		if (validateCompletionToken($page.url)) {
			markExperimentCompleted(currentSlug);
			isCompleted = true;

			// Clean up URL without reloading
			const newUrl = new URL($page.url);
			newUrl.searchParams.delete('completed');
			window.history.replaceState({}, '', newUrl);
		} else {
			// Check persistent state for this specific slug
			isCompleted = isExperimentCompleted(currentSlug);
		}
	});
</script>

<svelte:head>
	<title>{paper.title} | CREATE SOMETHING SPACE</title>
	<meta name="description" content={paper.description || paper.excerpt_long || paper.excerpt_short || 'Interactive experiment from CREATE SOMETHING'} />
	<meta
		name="keywords"
		content={paper.focus_keywords || `${paper.category}, experiments, interactive, hands-on`}
	/>

	<!-- Open Graph -->
	<meta property="og:type" content="article" />
	<meta property="og:url" content={fullUrl} />
	<meta property="og:title" content={paper.title} />
	<meta
		property="og:description"
		content={paper.description || paper.excerpt_long || 'Interactive experiment'}
	/>
	<meta property="og:site_name" content="CREATE SOMETHING SPACE" />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content={fullUrl} />
	<meta name="twitter:title" content={paper.title} />
	<meta
		name="twitter:description"
		content={paper.description || paper.excerpt_short || 'Interactive experiment'}
	/>
</svelte:head>

<div class="experiment-page min-h-screen">
	<!-- Article Header -->
	<ArticleHeader {paper} />

	<!-- Share Buttons & Return to Paper (Context-Aware) -->
	<div class="w-full max-w-5xl mx-auto px-6 mb-8">
		<div class="flex items-center justify-between gap-4 flex-wrap">
			<!-- Left: Context-aware paper link -->
			<a
				href={isCompleted ? returnUrl : ioUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="paper-link inline-flex items-center gap-2 px-4 py-2 {isCompleted ? 'completed' : ''} transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d={isCompleted ? "M5 13l4 4L19 7" : "M10 19l-7-7m0 0l7-7m-7 7h18"} />
				</svg>
				<span>{isCompleted ? 'Return to paper — Mark complete' : 'Read full paper on createsomething.io'}</span>
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
					/>
				</svg>
			</a>

			<!-- Right: Share Buttons & Page Actions -->
			<div class="flex items-center gap-3">
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
		</div>
	</div>

	<!-- Interactive Experience -->
	{#if isCodeEditor}
		<div class="w-full max-w-7xl mx-auto px-6 mb-12">
			<ExperimentCodeEditor {paper} onComplete={handleComplete} />
		</div>
	{:else if canRunTerminal}
		<div class="w-full max-w-5xl mx-auto px-6 mb-12">
			<ExperimentRuntime {paper} />
		</div>
	{/if}

	<!-- Related .io Research Papers -->
	<div class="w-full max-w-5xl mx-auto px-6">
		<RelatedPapersCard experimentSlug={paper.slug} />
	</div>

	<!-- Related Articles (same property) -->
	<RelatedArticles papers={relatedPapers} currentPaperId={paper.id} />

	<!-- Cross-Property Related Content -->
	<div class="w-full max-w-5xl mx-auto px-6 py-8">
		<RelatedContent 
			contentId={`space:experiment:${paper.slug}`}
			excludeCurrentProperty={true}
			currentProperty="space"
			maxItems={6}
		/>
	</div>

	<!-- Next Experiment Card (after completion) -->
	{#if isCompleted && nextPaper}
		<div class="max-w-4xl mx-auto px-6 pb-12">
			<NextExperimentCard {nextPaper} />
		</div>
	{/if}

	<!-- Back to Experiments -->
	<div class="w-full max-w-5xl mx-auto px-6 py-12">
		<a
			href="/experiments"
			class="back-link inline-flex items-center gap-2"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to all experiments
		</a>
	</div>
</div>

<!-- Markdown Preview Modal -->
<MarkdownPreviewModal
	bind:open={showMarkdownPreview}
	content={markdownContent}
	title="Experiment Markdown"
/>

<style>
  .experiment-page {
    background: var(--color-bg-pure);
  }

  .paper-link {
    background: var(--color-hover);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
  }

  .paper-link:hover {
    color: var(--color-fg-primary);
    background: var(--color-active);
  }

  .paper-link.completed {
    background: var(--color-success-muted);
    border-color: var(--color-success-border);
  }

  .back-link {
    color: var(--color-fg-secondary);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .back-link:hover {
    color: var(--color-fg-primary);
  }
</style>
