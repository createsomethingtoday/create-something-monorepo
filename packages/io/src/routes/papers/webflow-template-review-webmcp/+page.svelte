<script lang="ts">
	import { ArticleHeader, ArticleContent } from '@create-something/canon/domains/io';
	import { SEO, ShareButtons, PageActions, MarkdownPreviewModal } from '@create-something/canon';
	import type { Paper } from '@create-something/canon/types';

	import rawMarkdown from '../../../../../../papers/published/webflow-template-review-webmcp.md?raw';

	let showMarkdownPreview = $state(false);
	let markdownContent = $state('');

	function handlePreview(markdown: string) {
		markdownContent = markdown;
		showMarkdownPreview = true;
	}

	function stripLeadingH1(markdown: string): string {
		const trimmed = markdown.trimStart();
		if (!trimmed.startsWith('# ')) return markdown;
		const newline = trimmed.indexOf('\n');
		if (newline === -1) return '';
		return trimmed.slice(newline + 1).trimStart();
	}

	const paper: Paper = {
		id: 'paper-webflow-template-review-webmcp',
		slug: 'webflow-template-review-webmcp',
		title: 'The Webflow Way, Automated: Agent-Ready Template Reviews on Published Sites (WebMCP + Review Snippet)',
		category: 'webflow',
		description:
			'How we surfaced Webflow Way review signals to agents from a published template preview, using a project-level snippet aligned to WebMCP-style tool calling.',
		excerpt_short: 'Agent-ready template reviews without Designer access',
		excerpt_long:
			'We built a published-site review snippet that exposes a read-only tool surface (DOM, metadata, accessibility hygiene, 404 behavior, and Interactions capture) so agents can cover most review checks before humans escalate to Designer-only validation.',
		content: stripLeadingH1(rawMarkdown),
		reading_time: 10,
		difficulty_level: 'intermediate',
		featured: 0,
		published: 1,
		is_hidden: 0,
		archived: 0,
		tags: [
			{ id: 'webflow', name: 'Webflow', slug: 'webflow' },
			{ id: 'webmcp', name: 'WebMCP', slug: 'webmcp' },
			{ id: 'mcp', name: 'MCP', slug: 'mcp' },
			{ id: 'template-review', name: 'Template Review', slug: 'template-review' }
		],
		ascii_art: `
╔══════════════════════════════════════════════════════════════════╗
║  WEBFLOW WAY REVIEW                                MCP-READY     ║
║  ────────────────────────────────────────────────────────────    ║
║  Published Site  →  Review Snippet  →  Tools  →  Agent  →  QA     ║
║                                                                  ║
║  DOM + Meta + A11y + Links + Images + Forms + 404 + IX2 + IX3     ║
║                                                                  ║
║  window.__wfReview  |  postMessage  |  navigator.modelContext     ║
╚══════════════════════════════════════════════════════════════════╝
`,
		created_at: '2026-02-18T00:00:00Z',
		updated_at: '2026-02-18T00:00:00Z',
		published_at: '2026-02-18T00:00:00Z'
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
	keywords="webflow template review, WebMCP, MCP tools, agent QA, interactions audit, a11y, SEO hygiene"
	canonical={fullUrl}
	ogType="article"
	publishedTime={paper.published_at ?? undefined}
	modifiedTime={paper.updated_at ?? undefined}
	articleSection="Methodology"
	articleTags={paper.tags ? paper.tags.map((t) => t.name) : []}
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io/' },
		{ name: 'Papers', url: 'https://createsomething.io/papers' },
		{ name: 'Webflow Way, Automated', url: fullUrl }
	]}
/>

<div class="min-h-screen page-container">
	<ArticleHeader {paper} />

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
							sourceUrl: fullUrl
						}}
						claudePrompt="Help me understand this paper and turn it into a reviewer checklist."
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
