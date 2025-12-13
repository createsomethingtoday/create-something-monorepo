<script lang="ts">
	import { onMount } from "svelte";
	import { marked } from "marked";
	import hljs from "highlight.js";
	import type { Paper } from "$lib/types/paper";
	import InteractiveExperimentCTA from "./InteractiveExperimentCTA.svelte";

	interface Props {
		paper: Paper;
		isCompleted?: boolean;
		onReset?: () => void;
	}

	let { paper, isCompleted = false, onReset }: Props = $props();

	// Use html_content if available, otherwise use markdown content
	const hasHtmlContent = !!paper.html_content;
	const contentToRender = paper.html_content || paper.content;

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

<article class="article-content w-full max-w-4xl mx-auto px-6 py-12 animate-reveal">
	<!-- Interactive Experiment CTA - Show if SPACE URL exists -->
	{#if paper.interactive_demo_url}
		<InteractiveExperimentCTA
			spaceUrl={paper.interactive_demo_url}
			paperTitle={paper.title}
			{isCompleted}
			{onReset}
		/>
	{/if}

	<div class="prose prose-invert prose-lg max-w-none">
		{@html renderedContent}
	</div>
</article>

<style>
	/* Prose styles use Canon tokens for design */
	.article-content :global(h1) {
		font-size: 2.25rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: 1.5rem;
		margin-top: 3rem;
	}

	.article-content :global(h2) {
		font-size: 1.875rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: 1.25rem;
		margin-top: 2.5rem;
	}

	.article-content :global(h3) {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 1rem;
		margin-top: 2rem;
	}

	.article-content :global(h4) {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 0.75rem;
		margin-top: 1.5rem;
	}

	.article-content :global(p) {
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin-bottom: 1.5rem;
	}

	.article-content :global(a) {
		color: var(--color-fg-secondary);
		text-decoration: underline;
		text-underline-offset: 4px;
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.article-content :global(a:hover) {
		color: var(--color-fg-primary);
	}

	.article-content :global(ul),
	.article-content :global(ol) {
		list-style-position: inside;
		color: var(--color-fg-secondary);
		margin-bottom: 1.5rem;
		margin-left: 1rem;
	}

	.article-content :global(ul) {
		list-style-type: disc;
	}

	.article-content :global(ol) {
		list-style-type: decimal;
	}

	.article-content :global(ul),
	.article-content :global(ol) {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.article-content :global(li) {
		line-height: 1.6;
	}

	.article-content :global(pre) {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		overflow-x: auto;
	}

	.article-content :global(code) {
		font-family: monospace;
		font-size: var(--text-body-sm);
	}

	.article-content :global(:not(pre) > code) {
		background: rgba(255, 255, 255, 0.1);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
	}

	.article-content :global(blockquote) {
		border-left: 4px solid var(--color-border-emphasis);
		padding-left: 1.5rem;
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
		margin: 1.5rem 0;
		font-style: italic;
		color: var(--color-fg-tertiary);
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	}

	.article-content :global(img) {
		border-radius: var(--radius-lg);
		width: 100%;
		margin: 2rem 0;
		border: 1px solid var(--color-border-default);
	}

	.article-content :global(table) {
		min-width: 100%;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		margin: 1.5rem 0;
	}

	.article-content :global(thead) {
		background: rgba(255, 255, 255, 0.05);
	}

	.article-content :global(th) {
		padding: 0.75rem 1rem;
		text-align: left;
		color: var(--color-fg-primary);
		font-weight: 600;
		border-bottom: 1px solid var(--color-border-default);
	}

	.article-content :global(td) {
		padding: 0.75rem 1rem;
		color: var(--color-fg-secondary);
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.article-content :global(hr) {
		border-color: var(--color-border-default);
		margin: 2rem 0;
	}

	.article-content :global(strong) {
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.article-content :global(em) {
		font-style: italic;
		color: var(--color-fg-secondary);
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
