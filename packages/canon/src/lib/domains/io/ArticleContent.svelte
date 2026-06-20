<script lang="ts">
	import { tick } from "svelte";
	import { marked } from "marked";
	import hljs from "highlight.js";
	import type { Paper } from "$lib/types/paper";
	import { InteractiveExperimentCTA } from "@create-something/canon/interactive";

	marked.setOptions({
		gfm: true,
		breaks: true
	});

	interface Props {
		paper: Paper;
		isCompleted?: boolean;
		onReset?: () => void;
	}

	let { paper, isCompleted = false, onReset }: Props = $props();

	// Use html_content if it's substantial (not just an excerpt), otherwise use markdown content
	// Some papers have html_content set to a short excerpt instead of full rendered HTML
	const hasSubstantialHtmlContent = $derived(
		!!paper.html_content &&
			(!paper.content || paper.html_content.length >= paper.content.length * 0.5)
	);
	const contentToRender = $derived(hasSubstantialHtmlContent ? paper.html_content : paper.content);

	const renderedContent = $derived.by(() => {
		if (!contentToRender) return "";
		if (hasSubstantialHtmlContent) return contentToRender;
		return marked.parse(contentToRender, { async: false });
	});

	$effect(() => {
		renderedContent;
		if (typeof document === 'undefined') return;
		tick().then(() => {
			document.querySelectorAll('pre code').forEach((block) => {
				hljs.highlightElement(block as HTMLElement);
			});
		});
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
		font-size: var(--text-display);
		font-weight: bold;
		color: var(--color-fg-primary);
		margin-bottom: 1.5rem;
		margin-top: 3rem;
	}

	.article-prose :global(h2) {
		font-size: var(--text-h1);
		font-weight: bold;
		color: var(--color-fg-primary);
		margin-bottom: 1.25rem;
		margin-top: 2.5rem;
	}

	.article-prose :global(h3) {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 1rem;
		margin-top: 2rem;
	}

	.article-prose :global(h4) {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 0.75rem;
		margin-top: 1.5rem;
	}

	.article-prose :global(p) {
		color: var(--color-fg-secondary);
		line-height: 1.75;
		margin-bottom: 1.5rem;
	}

	.article-prose :global(a) {
		color: var(--color-fg-secondary);
		text-decoration: underline;
		text-underline-offset: 0.25rem;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.article-prose :global(a:hover) {
		color: var(--color-fg-primary);
	}

	.article-prose :global(ul),
	.article-prose :global(ol) {
		list-style-position: outside;
		color: var(--color-fg-secondary);
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
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		overflow-x: auto;
	}

	.article-prose :global(code) {
		font-family: monospace;
		font-size: var(--text-body-sm);
	}

	.article-prose :global(:not(pre) > code) {
		background: var(--color-bg-surface);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
	}

	.article-prose :global(blockquote) {
		border-left: 4px solid var(--color-border-emphasis);
		padding-left: 1.5rem;
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
		margin-top: 1.5rem;
		margin-bottom: 1.5rem;
		font-style: italic;
		color: var(--color-fg-tertiary);
		background: var(--color-bg-surface);
		border-top-right-radius: var(--radius-sm);
		border-bottom-right-radius: var(--radius-sm);
	}

	.article-prose :global(img) {
		border-radius: var(--radius-lg);
		width: 100%;
		margin-top: 2rem;
		margin-bottom: 2rem;
	}

	.article-prose :global(table) {
		min-width: 100%;
		border-radius: var(--radius-lg);
		margin-top: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.article-prose :global(thead) {
		background: var(--color-bg-surface);
	}

	.article-prose :global(th) {
		padding: 0.75rem 1rem;
		text-align: left;
		color: var(--color-fg-primary);
		font-weight: 600;
	}

	.article-prose :global(td) {
		padding: 0.75rem 1rem;
		color: var(--color-fg-secondary);
	}

	.article-prose :global(hr) {
		border-color: var(--color-border-default);
		margin-top: 2rem;
		margin-bottom: 2rem;
	}

	.article-prose :global(strong) {
		font-weight: bold;
		color: var(--color-fg-primary);
	}

	.article-prose :global(em) {
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
