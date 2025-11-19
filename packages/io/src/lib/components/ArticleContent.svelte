<script lang="ts">
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";
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

	onMount(() => {
		if (!hasHtmlContent && contentToRender) {
			// Configure marked for GitHub-flavored markdown
			marked.setOptions({
				gfm: true,
				breaks: true,
				highlight: function (code, lang) {
					if (lang && hljs.getLanguage(lang)) {
						try {
							return hljs.highlight(code, { language: lang })
								.value;
						} catch (err) {}
					}
					return code;
				},
			});

			renderedContent = marked(contentToRender);
		} else if (hasHtmlContent) {
			renderedContent = contentToRender;
		}
	});
</script>

<article
	class="w-full max-w-4xl mx-auto px-6 py-12"
	transition:fade={{ duration: 600, delay: 200 }}
>
	<!-- Interactive Experiment CTA - Show if SPACE URL exists -->
	{#if paper.interactive_demo_url}
		<InteractiveExperimentCTA
			spaceUrl={paper.interactive_demo_url}
			paperTitle={paper.title}
			{isCompleted}
			{onReset}
		/>
	{/if}

	<div
		class="prose prose-invert prose-lg max-w-none
			[&_h1]:text-4xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-6 [&_h1]:mt-12
			[&_h2]:text-3xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-5 [&_h2]:mt-10
			[&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mb-4 [&_h3]:mt-8
			[&_h4]:text-xl [&_h4]:font-semibold [&_h4]:text-white [&_h4]:mb-3 [&_h4]:mt-6
			[&_p]:text-white/80 [&_p]:leading-relaxed [&_p]:mb-6
			[&_a]:text-white/90 [&_a]:hover:text-white [&_a]:underline [&_a]:underline-offset-4 [&_a]:transition-colors
			[&_ul]:list-disc [&_ul]:list-inside [&_ul]:text-white/80 [&_ul]:mb-6 [&_ul]:space-y-2 [&_ul]:ml-4
			[&_ol]:list-decimal [&_ol]:list-inside [&_ol]:text-white/80 [&_ol]:mb-6 [&_ol]:space-y-2 [&_ol]:ml-4
			[&_li]:leading-relaxed
			[&_pre]:bg-[#1a1a1a] [&_pre]:border [&_pre]:border-white/10 [&_pre]:rounded-lg [&_pre]:p-6 [&_pre]:mb-6 [&_pre]:overflow-x-auto
			[&_code]:font-mono [&_code]:text-sm
			[&_:not(pre)>code]:bg-white/10 [&_:not(pre)>code]:px-2 [&_:not(pre)>code]:py-1 [&_:not(pre)>code]:rounded [&_:not(pre)>code]:text-white/90
			[&_blockquote]:border-l-4 [&_blockquote]:border-white/20 [&_blockquote]:pl-6 [&_blockquote]:py-2 [&_blockquote]:my-6 [&_blockquote]:italic [&_blockquote]:text-white/70 [&_blockquote]:bg-white/5 [&_blockquote]:rounded-r
			[&_img]:rounded-lg [&_img]:w-full [&_img]:my-8 [&_img]:border [&_img]:border-white/10
			[&_table]:min-w-full [&_table]:border [&_table]:border-white/10 [&_table]:rounded-lg [&_table]:my-6
			[&_thead]:bg-white/5
			[&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-white [&_th]:font-semibold [&_th]:border-b [&_th]:border-white/10
			[&_td]:px-4 [&_td]:py-3 [&_td]:text-white/80 [&_td]:border-b [&_td]:border-white/5
			[&_hr]:border-white/10 [&_hr]:my-8
			[&_strong]:font-bold [&_strong]:text-white
			[&_em]:italic [&_em]:text-white/90"
	>
		{@html renderedContent}
	</div>
</article>
