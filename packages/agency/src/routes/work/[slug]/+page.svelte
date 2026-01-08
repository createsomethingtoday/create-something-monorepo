<script lang="ts">
	/**
	 * Work Case Study - Dynamic Route Component
	 *
	 * Renders markdown content using MDsveX.
	 * The MarkdownLayout.svelte provides structure and PageActions.
	 */
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { work } = data;
</script>

<svelte:head>
	<title>{work.frontmatter.title} — Case Study | CREATE SOMETHING Agency</title>
	<meta name="description" content={work.frontmatter.description || work.frontmatter.title} />
</svelte:head>

<!-- Render the MDsveX component (uses MarkdownLayout automatically) -->
<svelte:component this={work.component} {...work.frontmatter} />
