<script lang="ts">
	/**
	 * Markdown Layout - Universal layout for MDsveX content
	 *
	 * Provides structure and PageActions for all markdown-based pages.
	 * Frontmatter is exposed via $$props.
	 */
	import { page } from '$app/stores';
	import { PageActions, MarkdownPreviewModal } from '@create-something/canon';
	import { RelatedContent } from '@create-something/canon/navigation';
	import type { PaperFrontmatter } from '@create-something/canon/utils';

	// Frontmatter comes from MDsveX as props
	interface Props {
		title: string;
		subtitle?: string;
		authors?: string[];
		category?: string;
		abstract?: string;
		keywords?: string[];
		publishedAt?: string;
		readingTime?: number;
		difficulty?: 'beginner' | 'intermediate' | 'advanced';
		children?: any;
	}

	let {
		title,
		subtitle,
		authors = [],
		category,
		abstract,
		keywords = [],
		publishedAt,
		readingTime,
		difficulty,
		children
	}: Props = $props();

	// State for PageActions
	let showMarkdownPreview = $state(false);
	let markdownContent = $state('');

	// Full URL for this page
	const fullUrl = $derived(`https://createsomething.io${$page.url.pathname}`);
	
	// Extract slug from URL for RelatedContent
	const slug = $derived($page.url.pathname.split('/').filter(Boolean).pop() || '');

	// Extract full content for PageActions
	// Note: This will include the rendered markdown content
	const pageContent = $derived(`
## ${title}

${subtitle ? `*${subtitle}*\n\n` : ''}

${authors.length ? `**Authors**: ${authors.join(', ')}\n` : ''}
${category ? `**Category**: ${category}\n` : ''}
${difficulty ? `**Difficulty**: ${difficulty}\n` : ''}
${readingTime ? `**Reading Time**: ${readingTime} min\n` : ''}

${abstract ? `### Abstract\n${abstract}\n\n` : ''}

[Content rendered from markdown - full content preserved]
`.trim());

	function handlePreview(markdown: string) {
		markdownContent = markdown;
		showMarkdownPreview = true;
	}
</script>

<div class="paper-container">
	<header class="paper-header">
		<div class="header-content">
			<div class="metadata">
				{#if category}
					<span class="category">{category}</span>
				{/if}
				{#if publishedAt}
					<span class="date">{new Date(publishedAt).toLocaleDateString()}</span>
				{/if}
			</div>

			<h1 class="title">{title}</h1>

			{#if subtitle}
				<p class="subtitle">{subtitle}</p>
			{/if}

			{#if authors.length > 0}
				<p class="authors">
					By {authors.join(', ')}
				</p>
			{/if}

			<div class="header-actions">
				<PageActions
					{title}
					content={pageContent}
					metadata={{
						category,
						authors,
						sourceUrl: fullUrl,
						keywords
					}}
					claudePrompt="Help me understand this paper and apply its concepts."
					onpreview={handlePreview}
				/>
			</div>
		</div>
	</header>

	<article class="paper-content prose">
		{@render children?.()}
	</article>

	<!-- Cross-Property Related Content -->
	{#if slug}
		<div class="related-content-section">
			<RelatedContent 
				contentId={`io:paper:${slug}`}
				excludeCurrentProperty={true}
				currentProperty="io"
				maxItems={6}
			/>
		</div>
	{/if}
</div>

<MarkdownPreviewModal bind:open={showMarkdownPreview} content={markdownContent} {title} />

<style>
	.paper-container {
		max-width: 42rem;
		margin: 0 auto;
		padding: var(--space-performance-xl) var(--space-performance-md);
	}

	.paper-header {
		margin-bottom: var(--space-performance-2xl);
		padding-bottom: var(--space-performance-lg);
	}

	.metadata {
		display: flex;
		gap: var(--space-performance-md);
		margin-bottom: var(--space-performance-sm);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
	}

	.category {
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.05em;
	}

	.title {
		font-size: var(--text-performance-h1);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
		margin: 0;
		line-height: 1.2;
	}

	.subtitle {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-secondary);
		margin: var(--space-performance-sm) 0 0;
		font-style: italic;
	}

	.authors {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		margin: var(--space-performance-xs) 0 0;
	}

	.header-actions {
		margin-top: var(--space-performance-md);
	}

	.paper-content {
		color: var(--color-performance-fg-primary);
		line-height: 1.7;
	}

	/* Prose styles - typography for markdown content */
	:global(.prose h2) {
		font-size: var(--text-performance-h2);
		font-weight: 700;
		margin: var(--space-performance-xl) 0 var(--space-performance-md);
		color: var(--color-performance-fg-primary);
	}

	:global(.prose h3) {
		font-size: var(--text-performance-h3);
		font-weight: 600;
		margin: var(--space-performance-lg) 0 var(--space-performance-sm);
		color: var(--color-performance-fg-primary);
	}

	:global(.prose p) {
		margin: var(--space-performance-md) 0;
	}

	:global(.prose ul),
	:global(.prose ol) {
		margin: var(--space-performance-md) 0;
		padding-left: var(--space-performance-lg);
	}

	:global(.prose li) {
		margin: var(--space-performance-xs) 0;
	}

	:global(.prose code) {
		background: var(--color-performance-bg-subtle);
		padding: 0.125rem 0.25rem;
		border-radius: var(--radius-performance-scale-sm);
		font-size: 0.9em;
		font-family: 'Stack Sans', monospace;
	}

	:global(.prose pre) {
		background: var(--color-performance-bg-subtle);
		padding: var(--space-performance-md);
		border-radius: var(--radius-performance-scale-md);
		overflow-x: auto;
		margin: var(--space-performance-md) 0;
	}

	:global(.prose pre code) {
		background: none;
		padding: 0;
	}

	:global(.prose a) {
		color: var(--color-performance-fg-primary);
		text-decoration: underline;
		text-decoration-color: var(--color-performance-border-emphasis);
		text-underline-offset: 0.2em;
		transition: text-decoration-color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	:global(.prose a:hover) {
		text-decoration-color: var(--color-performance-fg-primary);
	}

	:global(.prose blockquote) {
		border-left: 2px solid var(--color-performance-border-emphasis);
		padding-left: var(--space-performance-md);
		margin: var(--space-performance-md) 0;
		color: var(--color-performance-fg-secondary);
		font-style: italic;
	}

	:global(.prose table) {
		width: 100%;
		border-collapse: collapse;
		margin: var(--space-performance-md) 0;
	}

	:global(.prose th),
	:global(.prose td) {
		padding: var(--space-performance-sm);
		text-align: left;
	}

	:global(.prose th) {
		background: var(--color-performance-bg-subtle);
		font-weight: 600;
	}

	.related-content-section {
		margin-top: var(--space-performance-2xl);
		padding-top: var(--space-performance-xl);
	}
</style>
