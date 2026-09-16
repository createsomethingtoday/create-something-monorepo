<script lang="ts">
	import { onMount } from 'svelte';
	import ArticleContent from './ArticleContent.svelte';
	import ArticleHeader from './ArticleHeader.svelte';
	import NextExperimentCard from './NextExperimentCard.svelte';
	import StickyCTA from './StickyCTA.svelte';
	import {
		MarkdownPreviewModal,
		PageActions,
		RelatedArticles,
		SEO,
		ShareButtons
	} from '@create-something/canon';
	import type { Paper } from '@create-something/canon/types';

	type ArtifactKind = 'paper' | 'experiment';

	interface Props {
		paper: Paper;
		relatedPapers?: Paper[];
		kind: ArtifactKind;
		fullUrl?: string;
		isCompleted?: boolean;
		nextPaper?: Paper | null;
		onReset?: () => void;
		sharpenExperiment?: {
			question: string;
			action: string;
			evidence: string;
			limit: string;
			nextLabel: string;
			nextHref: string;
		} | null;
		progressiveRecord?: boolean;
		progressiveActions?: boolean;
	}

	let {
		paper,
		relatedPapers = [],
		kind,
		fullUrl,
		isCompleted = false,
		nextPaper = null,
		onReset,
		sharpenExperiment = null,
		progressiveRecord = false,
		progressiveActions = false
	}: Props = $props();
	let enhanced = $state(false);
	onMount(() => { enhanced = true; });

	let showMarkdownPreview = $state(false);
	let markdownContent = $state('');

	const isExperiment = $derived(kind === 'experiment');
	const collectionName = $derived(isExperiment ? 'Experiments' : 'Papers');
	const collectionPath = $derived(isExperiment ? 'experiments' : 'papers');
	const artifactLabel = $derived(isExperiment ? 'Experiment' : 'Paper');
	const artifactUrl = $derived(
		fullUrl || `https://createsomething.io/${collectionPath}/${paper.slug}`
	);
	const hasInteractive = $derived(isExperiment && !!paper.interactive_demo_url);

	const articleTags = $derived(
		paper.tags
			? paper.tags.map((tag) => (typeof tag === 'string' ? tag : tag.name))
			: []
	);

	const keywords = $derived(
		paper.focus_keywords ||
			`${paper.category}, ${isExperiment ? 'automation, development, tutorial' : 'research, CREATE SOMETHING'}`
	);

	const description = $derived(
		paper.description ||
			paper.excerpt_long ||
			paper.excerpt_short ||
			(isExperiment
				? 'Technical experiment on modern development practices'
				: 'Research paper on AI-native development practices')
	);

	const artifactContent = $derived(`
## ${paper.title}

${description}

**Category**: ${paper.category}
${isExperiment ? `**Type**: ${hasInteractive ? 'Interactive Experiment' : 'Technical Experiment'}` : ''}

${paper.content || ''}

${hasInteractive && paper.interactive_demo_url ? `
---

**Interactive Version**: ${paper.interactive_demo_url}
` : ''}

---

**Full ${artifactLabel}**: ${artifactUrl}
	`.trim());

	function handlePreview(markdown: string) {
		markdownContent = markdown;
		showMarkdownPreview = true;
	}
</script>

<SEO
	title={paper.title}
	description={description}
	{keywords}
	canonical={artifactUrl}
	ogType="article"
	publishedTime={paper.created_at}
	modifiedTime={paper.updated_at}
	author={paper.author_name || 'CREATE SOMETHING Research'}
	authorType="Organization"
	authorUrl={paper.author_url || 'https://createsomething.io/about'}
	articleSection={paper.category}
	articleTags={articleTags}
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io/' },
		{ name: collectionName, url: `https://createsomething.io/${collectionPath}` },
		{ name: paper.title, url: artifactUrl }
	]}
/>

<div class="min-h-screen research-artifact-page">
	<ArticleHeader {paper} prioritizeTitle={!!sharpenExperiment} orientation={sharpenExperiment} />

	<div class="shell-inner-pad">
		<div class="grid grid-cols-1 lg:grid-cols-[80px_1fr] gap-12">
			<aside class="hidden lg:block">
				{#if !progressiveActions || enhanced}
				<div class="flex flex-col gap-4">
					<ShareButtons title={paper.title} url={artifactUrl} {isCompleted} />
					<PageActions
						title={paper.title}
						content={artifactContent}
						metadata={{
							category: paper.category,
							sourceUrl: artifactUrl,
							keywords: paper.focus_keywords?.split(',').map((keyword: string) => keyword.trim())
						}}
						claudePrompt={`Help me understand this ${artifactLabel.toLowerCase()} and how to apply it.`}
						onpreview={handlePreview}
					/>
				</div>
				{/if}
			</aside>

			<div class="min-w-0">
				{#if progressiveRecord}
					<details class="artifact-record">
						<summary>Open the full research record <span aria-hidden="true">＋</span></summary>
						<ArticleContent {paper} {isCompleted} {onReset} />
					</details>
				{:else}
					<ArticleContent {paper} {isCompleted} {onReset} />
				{/if}
			</div>
		</div>
	</div>

	{#if relatedPapers.length > 0}
		<RelatedArticles papers={relatedPapers} currentPaperId={paper.id} />
	{/if}

	<div class="shell-inner-pad py-12">
		<a href="/{collectionPath}" class="inline-flex items-center gap-2 back-link">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 19l-7-7 7-7"
				/>
			</svg>
			Back to all {collectionName.toLowerCase()}
		</a>
	</div>

	{#if hasInteractive && paper.interactive_demo_url}
		<StickyCTA
			spaceUrl={paper.interactive_demo_url}
			paperTitle={paper.title}
			{isCompleted}
			onReset={onReset}
		/>
	{/if}

	{#if isExperiment && isCompleted && nextPaper}
		<div class="shell-inner-pad pb-24">
			<NextExperimentCard {nextPaper} />
		</div>
	{/if}
</div>

<MarkdownPreviewModal
	bind:open={showMarkdownPreview}
	content={markdownContent}
	title={`${artifactLabel} Markdown`}
/>

<style>
	.research-artifact-page {
		background-color: var(--color-performance-bg-pure);
	}

	.back-link {
		color: var(--color-performance-fg-tertiary);
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.back-link:hover {
		color: var(--color-performance-fg-primary);
	}

	.artifact-record { border-block: 1px solid var(--color-performance-border-subtle); }
	.artifact-record summary { display: flex; justify-content: space-between; padding-block: 1rem; cursor: pointer; font-weight: 700; }
</style>
