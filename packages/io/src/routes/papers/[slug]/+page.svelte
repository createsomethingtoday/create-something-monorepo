<script lang="ts">
	import type { PageData } from "./$types";
	import { ArticleHeader, ArticleContent } from "@create-something/canon/domains/io";
	import { ShareButtons, SEO, RelatedArticles, PageActions, MarkdownPreviewModal } from "@create-something/canon";
	import type { Paper } from '@create-something/canon/types';
	import { getNextPaper } from '@create-something/canon/utils';

	let { data }: { data: PageData } = $props();

	// Use $derived to ensure reactivity on client-side navigation
	const paper = $derived(data.paper as unknown as Paper);
	const relatedPapers = $derived((data.relatedPapers as Paper[]) || []);

	// Generate full URL for sharing
	const fullUrl = $derived(`https://createsomething.io/papers/${paper.slug}`);

	// Find the next paper in the horizon
	const nextPaper = $derived(getNextPaper([paper, ...relatedPapers], paper.slug));

	// Modal state for markdown preview
	let showMarkdownPreview = $state(false);
	let markdownContent = $state('');

	function handlePreview(markdown: string) {
		markdownContent = markdown;
		showMarkdownPreview = true;
	}

	// Generate markdown content for export
	const paperContent = $derived(`
## ${paper.title}

${paper.description || paper.excerpt_long || ''}

**Category**: ${paper.category}

${paper.content || ''}

---

**Full Paper**: ${fullUrl}
	`.trim());
</script>

<SEO
	title={paper.title}
	description={paper.description || paper.excerpt_long || paper.excerpt_short || "Research paper on AI-native development practices"}
	keywords={paper.focus_keywords || `${paper.category}, research, CREATE SOMETHING`}
	canonical={fullUrl}
	ogType="article"
	publishedTime={paper.created_at}
	modifiedTime={paper.updated_at}
	articleSection={paper.category}
	articleTags={paper.tags ? paper.tags.map((t: any) => typeof t === 'string' ? t : t.name) : []}
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io/' },
		{ name: 'Papers', url: 'https://createsomething.io/papers' },
		{ name: paper.title, url: fullUrl }
	]}
/>

<div class="min-h-screen page-container">
	<!-- Article Header -->
	<ArticleHeader {paper} />

	<!-- Main Content with Sidebar -->
	<div class="shell-inner-pad">
		<div class="grid grid-cols-1 lg:grid-cols-[80px_1fr] gap-12">
			<!-- Sidebar - Share Buttons (left, sticky) -->
			<aside class="hidden lg:block">
				<div class="flex flex-col gap-4">
					<ShareButtons title={paper.title} url={fullUrl} />
					<PageActions
						title={paper.title}
						content={paperContent}
						metadata={{
							category: paper.category,
							sourceUrl: fullUrl,
							keywords: paper.focus_keywords?.split(',').map((k: string) => k.trim())
						}}
						claudePrompt="Help me understand this research paper and how to apply it."
						onpreview={handlePreview}
					/>
				</div>
			</aside>

			<!-- Article Content -->
			<div class="min-w-0">
				<ArticleContent {paper} />
			</div>
		</div>
	</div>

	<!-- Related Articles -->
	{#if relatedPapers.length > 0}
		<RelatedArticles papers={relatedPapers} currentPaperId={paper.id} hrefPrefix="/papers" />
	{/if}

	<!-- Back to Papers -->
	<div class="shell-inner-pad py-12">
		<a
			href="/papers"
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
			Back to all papers
		</a>
	</div>
</div>

<!-- Markdown Preview Modal -->
<MarkdownPreviewModal
	bind:open={showMarkdownPreview}
	content={markdownContent}
	title="Paper Markdown"
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
