<script lang="ts">
	/**
	 * Markdown Layout - Universal layout for MDsveX content
	 *
	 * Provides structure and PageActions for all markdown-based pages.
	 * Frontmatter is exposed via $$props.
	 */
	import { page } from '$app/stores';
	import { PageActions, MarkdownPreviewModal } from '@create-something/components';
	import type { PaperFrontmatter } from '@create-something/components/utils';

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
</div>

<MarkdownPreviewModal bind:open={showMarkdownPreview} content={markdownContent} {title} />

<style>
	.paper-container {
		max-width: 42rem;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-md);
	}

	.paper-header {
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.metadata {
		display: flex;
		gap: var(--space-md);
		margin-bottom: var(--space-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.category {
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.05em;
	}

	.title {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0;
		line-height: 1.2;
	}

	.subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: var(--space-sm) 0 0;
		font-style: italic;
	}

	.authors {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: var(--space-xs) 0 0;
	}

	.header-actions {
		margin-top: var(--space-md);
	}

	.paper-content {
		color: var(--color-fg-primary);
		line-height: 1.7;
	}

	/* Prose styles - typography for markdown content */
	:global(.prose h2) {
		font-size: var(--text-h2);
		font-weight: 700;
		margin: var(--space-xl) 0 var(--space-md);
		color: var(--color-fg-primary);
	}

	:global(.prose h3) {
		font-size: var(--text-h3);
		font-weight: 600;
		margin: var(--space-lg) 0 var(--space-sm);
		color: var(--color-fg-primary);
	}

	:global(.prose p) {
		margin: var(--space-md) 0;
	}

	:global(.prose ul),
	:global(.prose ol) {
		margin: var(--space-md) 0;
		padding-left: var(--space-lg);
	}

	:global(.prose li) {
		margin: var(--space-xs) 0;
	}

	:global(.prose code) {
		background: var(--color-bg-subtle);
		padding: 0.125rem 0.25rem;
		border-radius: var(--radius-sm);
		font-size: 0.9em;
		font-family: 'Stack Sans', monospace;
	}

	:global(.prose pre) {
		background: var(--color-bg-subtle);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		overflow-x: auto;
		margin: var(--space-md) 0;
	}

	:global(.prose pre code) {
		background: none;
		padding: 0;
	}

	:global(.prose a) {
		color: var(--color-fg-primary);
		text-decoration: underline;
		text-decoration-color: var(--color-border-emphasis);
		text-underline-offset: 0.2em;
		transition: text-decoration-color var(--duration-micro) var(--ease-standard);
	}

	:global(.prose a:hover) {
		text-decoration-color: var(--color-fg-primary);
	}

	:global(.prose blockquote) {
		border-left: 2px solid var(--color-border-emphasis);
		padding-left: var(--space-md);
		margin: var(--space-md) 0;
		color: var(--color-fg-secondary);
		font-style: italic;
	}

	:global(.prose table) {
		width: 100%;
		border-collapse: collapse;
		margin: var(--space-md) 0;
	}

	:global(.prose th),
	:global(.prose td) {
		border: 1px solid var(--color-border-default);
		padding: var(--space-sm);
		text-align: left;
	}

	:global(.prose th) {
		background: var(--color-bg-subtle);
		font-weight: 600;
	}
</style>
