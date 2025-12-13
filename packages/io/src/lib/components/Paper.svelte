<script lang="ts">
	/**
	 * Paper Component
	 *
	 * Canon-compliant container for research papers and case studies.
	 * Provides consistent structure, typography, and styling using CSS Canon tokens.
	 *
	 * Usage:
	 * <Paper
	 *   title="Paper Title"
	 *   subtitle="Paper subtitle or description"
	 *   paperId="PAPER-2025-XXX"
	 *   category="Methodology"
	 *   readTime="15 min read"
	 *   level="Intermediate"
	 * >
	 *   <svelte:fragment slot="abstract">
	 *     Paper abstract goes here...
	 *   </svelte:fragment>
	 *
	 *   <svelte:fragment slot="metrics">
	 *     Optional metrics cards...
	 *   </svelte:fragment>
	 *
	 *   <svelte:fragment slot="content">
	 *     Main paper content...
	 *   </svelte:fragment>
	 *
	 *   <svelte:fragment slot="references">
	 *     References list...
	 *   </svelte:fragment>
	 *
	 *   <svelte:fragment slot="footer">
	 *     Optional footer content...
	 *   </svelte:fragment>
	 * </Paper>
	 */

	interface Props {
		title: string;
		subtitle?: string;
		paperId?: string;
		category?: string;
		readTime?: string;
		level?: string;
		author?: string;
		date?: string;
		children?: any;
	}

	let {
		title,
		subtitle,
		paperId,
		category,
		readTime,
		level,
		author,
		date
	}: Props = $props();
</script>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			{#if paperId}
				<div class="font-mono mb-4 paper-id">{paperId}</div>
			{/if}
			<h1 class="mb-3 paper-title">{title}</h1>
			{#if subtitle}
				<p class="max-w-3xl paper-subtitle">{subtitle}</p>
			{/if}
			{#if category || readTime || level || author || date}
				<div class="flex gap-4 mt-4 paper-meta">
					{#if category}<span>{category}</span>{/if}
					{#if category && (readTime || level || author || date)}<span>•</span>{/if}
					{#if readTime}<span>{readTime}</span>{/if}
					{#if readTime && (level || author || date)}<span>•</span>{/if}
					{#if level}<span>{level}</span>{/if}
					{#if level && (author || date)}<span>•</span>{/if}
					{#if author}<span>{author}</span>{/if}
					{#if author && date}<span>•</span>{/if}
					{#if date}<span>{date}</span>{/if}
				</div>
			{/if}
		</div>

		<!-- Abstract Section (optional slot) -->
		{#if $$slots.abstract}
			<section class="pl-6 space-y-4 abstract-section">
				<h2 class="section-heading">Abstract</h2>
				<div class="leading-relaxed body-text">
					{@render children?.abstract?.()}
				</div>
			</section>
		{/if}

		<!-- Metrics Section (optional slot) -->
		{#if $$slots.metrics}
			<section class="metrics-section">
				{@render children?.metrics?.()}
			</section>
		{/if}

		<!-- Main Content -->
		{#if $$slots.content}
			<div class="content-wrapper">
				{@render children?.content?.()}
			</div>
		{:else if $$slots.default}
			<div class="content-wrapper">
				{@render children?.()}
			</div>
		{/if}

		<!-- References Section (optional slot) -->
		{#if $$slots.references}
			<section class="space-y-4">
				<h2 class="section-heading">References</h2>
				<div class="references-list">
					{@render children?.references?.()}
				</div>
			</section>
		{/if}

		<!-- Footer Section (optional slot) -->
		{#if $$slots.footer}
			<div class="pt-6 paper-footer">
				{@render children?.footer?.()}
			</div>
		{/if}
	</div>
</div>

<style>
	/* Structure: Tailwind | Design: Canon */

	/* Container */
	.paper-container {
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	/* Header */
	.paper-header {
		border-bottom: 1px solid var(--color-border-default);
	}

	.paper-id {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.paper-title {
		font-size: var(--text-h1);
	}

	.paper-subtitle {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.paper-meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Abstract */
	.abstract-section {
		border-left: 4px solid var(--color-border-emphasis);
	}

	/* Typography */
	:global(.paper-container .section-heading) {
		font-size: var(--text-h2);
	}

	:global(.paper-container .subsection-heading) {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
	}

	:global(.paper-container .body-text),
	.body-text {
		color: var(--color-fg-secondary);
	}

	/* Content Blocks */
	:global(.paper-container .metric-card) {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	:global(.paper-container .metric-value) {
		font-size: var(--text-h2);
	}

	:global(.paper-container .metric-positive) {
		color: #4ade80;
	}

	:global(.paper-container .metric-label) {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Code Blocks */
	:global(.paper-container .code-block) {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
	}

	:global(.paper-container .code-block-success) {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
	}

	:global(.paper-container .code-comment) {
		color: var(--color-fg-muted);
	}

	:global(.paper-container .code-primary) {
		color: var(--color-fg-primary);
	}

	:global(.paper-container .code-secondary) {
		color: var(--color-fg-tertiary);
	}

	:global(.paper-container .code-success) {
		color: #86efac;
	}

	/* Quotes */
	:global(.paper-container .blockquote) {
		border-left: 4px solid var(--color-border-emphasis);
		color: var(--color-fg-tertiary);
	}

	:global(.paper-container .quote-box) {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	:global(.paper-container .quote-text) {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	/* Comparison Boxes */
	:global(.paper-container .comparison-broken) {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--radius-lg);
	}

	:global(.paper-container .comparison-success) {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		border-radius: var(--radius-lg);
	}

	:global(.paper-container .comparison-heading) {
		font-size: var(--text-body-lg);
		color: inherit;
	}

	:global(.paper-container .comparison-broken .comparison-heading) {
		color: #fca5a5;
	}

	:global(.paper-container .comparison-success .comparison-heading) {
		color: #86efac;
	}

	:global(.paper-container .comparison-text) {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	:global(.paper-container .comparison-muted) {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Tables */
	:global(.paper-container .data-table) {
		font-size: var(--text-body-sm);
	}

	:global(.paper-container .table-header-row) {
		border-bottom: 1px solid var(--color-border-emphasis);
	}

	:global(.paper-container .table-header) {
		color: var(--color-fg-secondary);
	}

	:global(.paper-container .table-body) {
		color: var(--color-fg-tertiary);
	}

	:global(.paper-container .table-row) {
		border-bottom: 1px solid var(--color-border-default);
	}

	:global(.paper-container .table-cell-emphasis) {
		color: var(--color-fg-secondary);
	}

	:global(.paper-container .table-success) {
		color: #4ade80;
	}

	/* Callouts */
	:global(.paper-container .callout-info) {
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: var(--radius-lg);
	}

	:global(.paper-container .callout-heading) {
		font-size: var(--text-h3);
		color: #93c5fd;
	}

	/* Info Cards */
	:global(.paper-container .info-card) {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	:global(.paper-container .card-heading) {
		color: var(--color-fg-secondary);
	}

	:global(.paper-container .card-list) {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* References */
	.references-list {
		color: var(--color-fg-tertiary);
	}

	:global(.paper-container .references-list ol) {
		padding-left: 1.5rem;
		list-style: decimal;
	}

	:global(.paper-container .references-list li) {
		margin-bottom: 0.5rem;
	}

	/* Footer */
	.paper-footer {
		border-top: 1px solid var(--color-border-default);
	}

	:global(.paper-container .footer-text) {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	:global(.paper-container .footer-link) {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	:global(.paper-container .footer-link:hover) {
		color: var(--color-fg-primary);
	}

	/* Content Typography - Global Styles */
	:global(.paper-container h1) {
		font-size: var(--text-h1);
		margin-bottom: 1rem;
	}

	:global(.paper-container h2) {
		font-size: var(--text-h2);
		margin-top: 3rem;
		margin-bottom: 1.5rem;
	}

	:global(.paper-container h3) {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		margin-top: 2rem;
		margin-bottom: 1rem;
	}

	:global(.paper-container h4) {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
	}

	:global(.paper-container p) {
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin-bottom: 1rem;
	}

	:global(.paper-container a) {
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	:global(.paper-container a:hover) {
		color: var(--color-fg-primary);
	}

	:global(.paper-container strong) {
		color: var(--color-fg-primary);
	}

	:global(.paper-container em) {
		color: var(--color-fg-secondary);
	}

	:global(.paper-container code) {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
	}

	:global(.paper-container pre) {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 1rem;
		overflow-x: auto;
		margin: 1rem 0;
	}

	:global(.paper-container ul) {
		list-style: disc inside;
		color: var(--color-fg-secondary);
		padding-left: 1rem;
		margin-bottom: 1rem;
	}

	:global(.paper-container ol) {
		list-style: decimal inside;
		color: var(--color-fg-secondary);
		padding-left: 1rem;
		margin-bottom: 1rem;
	}

	:global(.paper-container li) {
		margin-bottom: 0.5rem;
		line-height: 1.7;
	}

	:global(.paper-container blockquote) {
		border-left: 4px solid var(--color-border-emphasis);
		padding-left: 1rem;
		margin: 1.5rem 0;
		color: var(--color-fg-tertiary);
		font-style: italic;
	}

	:global(.paper-container table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1.5rem 0;
		font-size: var(--text-body-sm);
	}

	:global(.paper-container th) {
		text-align: left;
		padding: 0.5rem;
		color: var(--color-fg-secondary);
		border-bottom: 1px solid var(--color-border-emphasis);
	}

	:global(.paper-container td) {
		padding: 0.5rem;
		color: var(--color-fg-tertiary);
		border-bottom: 1px solid var(--color-border-default);
	}
</style>
