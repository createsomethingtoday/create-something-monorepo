<script lang="ts">
	import type { PageData } from './$types';
	import ArticleHeader from '$lib/components/ArticleHeader.svelte';
	import ExperimentRuntime from '$lib/components/ExperimentRuntime.svelte';
	import ExperimentCodeEditor from '$lib/components/ExperimentCodeEditor.svelte';
	import RelatedArticles from '$lib/components/RelatedArticles.svelte';
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	import NextExperimentCard from '$lib/components/NextExperimentCard.svelte';
	import { isExecutable, isCodeExperiment } from '$lib/types/paper';
	import { getNextPaper } from '$lib/utils/recommendations';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		markExperimentCompleted,
		isExperimentCompleted,
		validateCompletionToken
	} from '$lib/utils/completion';

	let { data }: { data: PageData } = $props();
	const { paper, relatedPapers } = data;

	// Check experiment type
	const canRunTerminal = isExecutable(paper);
	const isCodeEditor = isCodeExperiment(paper);

	// Completion tracking
	let isCompleted = $state(false);

	// Next paper recommendation
	const nextPaper = getNextPaper([paper, ...relatedPapers], paper.slug);

	// Generate URLs
	const fullUrl = `https://createsomething.space/experiments/${paper.slug}`;
	const ioUrl = `https://createsomething.io/experiments/${paper.slug}`;
	const returnUrl = `${ioUrl}?completed=true`;

	function handleComplete() {
		isCompleted = true;
		markExperimentCompleted(paper.slug);
	}

	onMount(() => {
		// Check if we just returned from .io with a completion token
		if (validateCompletionToken($page.url)) {
			markExperimentCompleted(paper.slug);
			isCompleted = true;

			// Clean up URL without reloading
			const newUrl = new URL($page.url);
			newUrl.searchParams.delete('completed');
			window.history.replaceState({}, '', newUrl);
		}

		// Check persistent state
		isCompleted = isExperimentCompleted(paper.slug);
	});
</script>

<svelte:head>
	<title>{paper.title} | CREATE SOMETHING SPACE</title>
	<meta
		name="description"
		content={paper.description ||
			paper.excerpt_long ||
			paper.excerpt_short ||
			'Interactive experiment from CREATE SOMETHING'}
	/>
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

<div class="min-h-screen bg-black">
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
				class="inline-flex items-center gap-2 px-4 py-2 {isCompleted ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'} border rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm"
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

			<!-- Right: Share Buttons -->
			<div class="flex items-center gap-3">
				<ShareButtons title={paper.title} url={fullUrl} {isCompleted} />
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

	<!-- Related Articles -->
	<RelatedArticles papers={relatedPapers} currentPaperId={paper.id} />

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
			class="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to all experiments
		</a>
	</div>
</div>
