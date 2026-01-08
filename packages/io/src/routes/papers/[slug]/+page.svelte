<script lang="ts">
	/**
	 * Research Paper Detail - Markdown Route
	 *
	 * Renders markdown content using MDsveX.
	 * The MarkdownLayout.svelte provides structure and PageActions.
	 */
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { paper } = data;
</script>

<svelte:head>
	<title>{paper.frontmatter.title} | CREATE SOMETHING .io</title>
	<meta name="description" content={paper.frontmatter.abstract} />
	<meta name="keywords" content={paper.frontmatter.keywords?.join(', ')} />
</svelte:head>

<!-- Render the MDsveX component (uses MarkdownLayout automatically) -->
<svelte:component this={paper.component} {...paper.frontmatter} />

