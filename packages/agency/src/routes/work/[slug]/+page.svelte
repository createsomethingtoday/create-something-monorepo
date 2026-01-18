<script lang="ts">
	/**
	 * Work Case Study - Dynamic Route Component
	 *
	 * Renders markdown content using MDsveX.
	 * The MarkdownLayout.svelte provides structure and PageActions.
	 */
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { component: Component, frontmatter } = data;
</script>

<svelte:head>
	<title>{frontmatter.title} — Case Study | CREATE SOMETHING Agency</title>
	<meta name="description" content={frontmatter.description || frontmatter.title} />
</svelte:head>

<!-- Render the MDsveX component (uses MarkdownLayout automatically) -->
<Component {...frontmatter} />
