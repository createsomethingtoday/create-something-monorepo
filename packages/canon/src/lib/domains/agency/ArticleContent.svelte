<script lang="ts">
	import { onMount } from "svelte";
	import { marked } from "marked";
	import hljs from "highlight.js";
	import type { Paper } from "$lib/types/paper";
	import { InteractiveExperimentCTA } from "@create-something/canon/interactive";

	interface Props {
		paper: Paper;
		isCompleted?: boolean;
		onReset?: () => void;
	}

	let { paper, isCompleted = false, onReset }: Props = $props();

	// Use html_content if available, otherwise use markdown content
	const hasHtmlContent = $derived(!!paper.html_content);
	const contentToRender = $derived(paper.html_content || paper.content);

	// For markdown content, configure marked
	let renderedContent = $state("");

	onMount(async () => {
		if (!hasHtmlContent && contentToRender) {
			// Configure marked for GitHub-flavored markdown
			marked.setOptions({
				gfm: true,
				breaks: true
			});

			// Render markdown (marked now returns a Promise)
			renderedContent = await marked(contentToRender);

			// Apply syntax highlighting to code blocks after rendering
			if (typeof document !== 'undefined') {
				setTimeout(() => {
					document.querySelectorAll('pre code').forEach((block) => {
						hljs.highlightElement(block as HTMLElement);
					});
				}, 0);
			}
		} else if (hasHtmlContent) {
			renderedContent = contentToRender;
		}
	});
</script>

<article class="article-container w-full max-w-4xl mx-auto px-6 py-12 animate-reveal">
	<!-- Interactive Experiment CTA - Show if SPACE URL exists -->
	{#if paper.interactive_demo_url}
		<InteractiveExperimentCTA
			spaceUrl={paper.interactive_demo_url}
			paperTitle={paper.title}
			{isCompleted}
			{onReset}
		/>
	{/if}

	<div class="article-prose prose prose-invert prose-lg max-w-none">
		{@html renderedContent}
	</div>
</article>

<style>
	.article-prose :global(h1) {
		font-size: var(--text-performance-display);
		font-weight: bold;
		color: var(--color-performance-fg-primary);
		margin-bottom: 1.5rem;
		margin-top: 3rem;
	}

	.article-prose :global(h2) {
		font-size: var(--text-performance-h1);
		font-weight: bold;
		color: var(--color-performance-fg-primary);
		margin-bottom: 1.25rem;
		margin-top: 2.5rem;
	}

	.article-prose :global(h3) {
		font-size: var(--text-performance-h2);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin-bottom: 1rem;
		margin-top: 2rem;
	}

	.article-prose :global(h4) {
		font-size: var(--text-performance-h3);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin-bottom: 0.75rem;
		margin-top: 1.5rem;
	}

	.article-prose :global(p) {
		color: var(--color-performance-fg-secondary);
		line-height: 1.75;
		margin-bottom: 1.5rem;
	}

	.article-prose :global(a) {
		color: var(--color-performance-fg-secondary);
		text-decoration: underline;
		text-underline-offset: 0.25rem;
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.article-prose :global(a:hover) {
		color: var(--color-performance-fg-primary);
	}

	.article-prose :global(ul),
	.article-prose :global(ol) {
		list-style-position: outside;
		color: var(--color-performance-fg-secondary);
		margin-bottom: 1.5rem;
		margin-left: 0;
		padding-left: 1.5rem;
	}

	.article-prose :global(ul) {
		list-style-type: disc;
	}

	.article-prose :global(ol) {
		list-style-type: decimal;
	}

	.article-prose :global(li) {
		line-height: 1.75;
		margin-bottom: 0.5rem;
	}

	.article-prose :global(li > p) {
		margin: 0;
	}

	.article-prose :global(li > p:first-child:last-child) {
		display: inline;
	}

	.article-prose :global(pre) {
		border-radius: var(--radius-performance-scale-lg);
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		overflow-x: auto;
	}

	.article-prose :global(code) {
		font-family: monospace;
		font-size: var(--text-performance-body-sm);
	}

	.article-prose :global(:not(pre) > code) {
		background: var(--color-performance-bg-surface);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-performance-scale-sm);
		color: var(--color-performance-fg-secondary);
	}

	.article-prose :global(blockquote) {
		border-left: 4px solid var(--color-performance-border-emphasis);
		padding-left: 1.5rem;
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
		margin-top: 1.5rem;
		margin-bottom: 1.5rem;
		font-style: italic;
		color: var(--color-performance-fg-tertiary);
		background: var(--color-performance-bg-surface);
		border-top-right-radius: var(--radius-performance-scale-sm);
		border-bottom-right-radius: var(--radius-performance-scale-sm);
	}

	.article-prose :global(img) {
		border-radius: var(--radius-performance-scale-lg);
		width: 100%;
		margin-top: 2rem;
		margin-bottom: 2rem;
	}

	.article-prose :global(table) {
		min-width: 100%;
		border-radius: var(--radius-performance-scale-lg);
		margin-top: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.article-prose :global(thead) {
		background: var(--color-performance-bg-surface);
	}

	.article-prose :global(th) {
		padding: 0.75rem 1rem;
		text-align: left;
		color: var(--color-performance-fg-primary);
		font-weight: 600;
	}

	.article-prose :global(td) {
		padding: 0.75rem 1rem;
		color: var(--color-performance-fg-secondary);
	}

	.article-prose :global(hr) {
		border-color: var(--color-performance-border-default);
		margin-top: 2rem;
		margin-bottom: 2rem;
	}

	.article-prose :global(strong) {
		font-weight: bold;
		color: var(--color-performance-fg-primary);
	}

	.article-prose :global(em) {
		font-style: italic;
		color: var(--color-performance-fg-secondary);
	}

	.animate-reveal {
		opacity: 0;
		transform: translateY(12px);
		animation: reveal 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards;
	}

	@keyframes reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-reveal {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
