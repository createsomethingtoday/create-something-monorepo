<script lang="ts">
	import { transformExperimentToPaper } from '@create-something/canon';
	import { SEO, ShareButtons, PageActions, MarkdownPreviewModal } from '@create-something/canon';
	import { ArticleHeader, ArticleContent } from '@create-something/canon/domains/io';
	import type { Paper } from '@create-something/canon/types';
	import { getFileBasedPaper } from '$lib/config/fileBasedPapers';

	import AnalyzerReviewArchitectureGraphic from './AnalyzerReviewArchitectureGraphic.svelte';
	import rawMarkdown from '../../../../content/papers/analyzer-mcp-review-architecture.md?raw';

	let showMarkdownPreview = $state(false);
	let markdownContent = $state('');

	function handlePreview(markdown: string) {
		markdownContent = markdown;
		showMarkdownPreview = true;
	}

	function stripFrontmatter(raw: string): string {
		const trimmed = raw.trimStart();
		if (!trimmed.startsWith('---')) return trimmed;

		const endIndex = trimmed.indexOf('\n---', 3);
		if (endIndex === -1) return trimmed;

		return trimmed.slice(endIndex + 4).trimStart();
	}

	const sourcePaper = getFileBasedPaper('analyzer-mcp-review-architecture');

	if (!sourcePaper) {
		throw new Error('Missing analyzer MCP paper metadata.');
	}

	const paper: Paper = {
		...transformExperimentToPaper(sourcePaper),
		content: stripFrontmatter(rawMarkdown)
	};

	const fullUrl = `https://createsomething.io/papers/${paper.slug}`;

	const exportMarkdown = `
## ${paper.title}

${paper.description || paper.excerpt_long || ''}

**Category**: ${paper.category}

${paper.content || ''}

---

**Full Paper**: ${fullUrl}
	`.trim();
</script>

<SEO
	title={paper.title}
	description={paper.description || paper.excerpt_long || 'Research paper on AI-native development practices'}
	keywords={paper.tags ? paper.tags.map((tag) => tag.name).join(', ') : 'MCP, review architecture'}
	canonical={fullUrl}
	ogType="article"
	publishedTime={paper.published_at ?? undefined}
	modifiedTime={paper.updated_at ?? undefined}
	articleSection={paper.category}
	articleTags={paper.tags ? paper.tags.map((tag) => tag.name) : []}
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io/' },
		{ name: 'Papers', url: 'https://createsomething.io/papers' },
		{ name: paper.title, url: fullUrl }
	]}
/>

<div class="min-h-screen page-container">
	<ArticleHeader {paper} />

	<AnalyzerReviewArchitectureGraphic />

	<div class="shell-inner-pad">
		<div class="grid grid-cols-1 lg:grid-cols-[80px_1fr] gap-12">
			<aside class="hidden lg:block">
				<div class="flex flex-col gap-4">
					<ShareButtons title={paper.title} url={fullUrl} />
					<PageActions
						title={paper.title}
						content={exportMarkdown}
						metadata={{
							category: paper.category,
							sourceUrl: fullUrl,
							keywords: paper.tags?.map((tag) => tag.name)
						}}
						claudePrompt="Help me understand this paper and map the architecture to another review system."
						onpreview={handlePreview}
					/>
				</div>
			</aside>

			<div class="min-w-0">
				<ArticleContent {paper} />
			</div>
		</div>
	</div>

	<div class="shell-inner-pad py-12">
		<a href="/papers" class="inline-flex items-center gap-2 back-link">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 19l-7-7 7-7"
				/>
			</svg>
			Back to all papers
		</a>
	</div>
</div>

<MarkdownPreviewModal bind:open={showMarkdownPreview} content={markdownContent} title="Paper Markdown" />

<style>
	.page-container {
		background-color: var(--color-performance-bg-pure);
	}

	.back-link {
		color: var(--color-performance-fg-tertiary);
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.back-link:hover {
		color: var(--color-performance-fg-primary);
	}
</style>
