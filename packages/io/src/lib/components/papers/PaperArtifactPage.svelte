<script lang="ts">
	import { onMount } from 'svelte';
	import {
		MarkdownPreviewModal,
		PageActions,
		RelatedArticles,
		SEO,
		ShareButtons
	} from '@create-something/canon';
	import { ArticleContent } from '@create-something/canon/domains/io';
	import type { Paper } from '@create-something/canon/types';
	import PaperArticleHeader from './PaperArticleHeader.svelte';

	interface Props {
		paper: Paper;
		relatedPapers?: Paper[];
		fullUrl: string;
		nextPaper?: Paper | null;
	}

	let { paper, relatedPapers = [], fullUrl }: Props = $props();
	let enhanced = $state(false);
	let showMarkdownPreview = $state(false);
	let markdownContent = $state('');

	onMount(() => {
		enhanced = true;
	});

	const articleTags = $derived(
		paper.tags?.map((tag) => (typeof tag === 'string' ? tag : tag.name)) ?? []
	);
	const description = $derived(
		paper.description || paper.excerpt_long || paper.excerpt_short || 'Research paper'
	);
	const exportMarkdown = $derived(`
## ${paper.title}

${description}

**Category**: ${paper.category}

${paper.content || ''}

---

**Full Paper**: ${fullUrl}
	`.trim());

	function handlePreview(markdown: string) {
		markdownContent = markdown;
		showMarkdownPreview = true;
	}
</script>

<SEO
	title={paper.title}
	description={description}
	keywords={paper.focus_keywords || `${paper.category}, research`}
	canonical={fullUrl}
	ogType="article"
	publishedTime={paper.created_at}
	modifiedTime={paper.updated_at}
	articleSection={paper.category}
	articleTags={articleTags}
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io/' },
		{ name: 'Papers', url: 'https://createsomething.io/papers' },
		{ name: paper.title, url: fullUrl }
	]}
/>

<div class="paper-artifact-page">
	<PaperArticleHeader {paper} />

	<div class="shell-inner-pad">
		<div class="paper-layout">
			{#if enhanced}
				<aside>
					<ShareButtons title={paper.title} url={fullUrl} />
					<PageActions
						title={paper.title}
						content={exportMarkdown}
						metadata={{ category: paper.category, sourceUrl: fullUrl, keywords: articleTags }}
						claudePrompt="Help me understand this paper and decide where its findings apply."
						onpreview={handlePreview}
					/>
				</aside>
			{/if}

			<details class="paper-record paper-record-disclosure" data-paper-record id="full-paper" open>
				<summary>Read the full paper</summary>
				<div class="paper-record-body">
					<p class="record-label">Full research record</p>
					<ArticleContent {paper} />
				</div>
			</details>
		</div>
	</div>

	{#if relatedPapers.length > 0}
		<RelatedArticles papers={relatedPapers} currentPaperId={paper.id} />
	{/if}

	<div class="shell-inner-pad paper-back-link">
		<a href="/papers">Back to all papers</a>
	</div>
</div>

{#if enhanced}
	<MarkdownPreviewModal
		bind:open={showMarkdownPreview}
		content={markdownContent}
		title="Paper Markdown"
	/>
{/if}

<style>
	.paper-artifact-page {
		min-height: 100vh;
		background: var(--color-performance-bg-pure);
	}

	.paper-layout {
		display: grid;
		grid-template-columns: 5rem minmax(0, 1fr);
		gap: 3rem;
	}

	aside {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.paper-record {
		min-width: 0;
	}

	.record-label {
		margin: 0 0 1rem;
		font-size: 0.72rem;
		font-weight: 650;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-performance-fg-muted);
	}

	.paper-back-link {
		padding-block: 3rem;
	}

	.paper-back-link a {
		color: var(--color-performance-fg-secondary);
		text-underline-offset: 0.25em;
	}

	@media (max-width: 1023px) {
		.paper-layout {
			grid-template-columns: 1fr;
		}

		aside {
			display: none;
		}
	}
</style>
