<script lang="ts">
	/**
	 * Pattern Detail - Markdown Route
	 *
	 * Renders markdown content using MDsveX.
	 * The MarkdownLayout.svelte provides structure and PageActions.
	 */
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { pattern } = data;
</script>

<svelte:head>
	<title>{pattern.frontmatter.title} | CREATE SOMETHING .ltd</title>
	<meta name="description" content={pattern.frontmatter.subtitle || pattern.frontmatter.title} />
</svelte:head>

<!-- Render the MDsveX component (uses MarkdownLayout automatically) -->
<svelte:component this={pattern.component} {...pattern.frontmatter} />
