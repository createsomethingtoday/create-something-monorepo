<script lang="ts">
	/**
	 * Canon Dynamic Route Component
	 *
	 * Renders markdown content via MDsveX with MarkdownLayout.
	 * Uses catch-all [...path] route to handle nested canon pages.
	 */
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	
	// Use $derived for reactivity on client-side navigation
	let canonPage = $derived(data.canonPage);
</script>

<svelte:head>
	<title>{canonPage.frontmatter.title} — Canon Design System</title>
	<meta name="description" content={canonPage.frontmatter.description || canonPage.frontmatter.title} />
</svelte:head>

<!-- Render the MDsveX component (uses MarkdownLayout automatically) -->
<svelte:component this={canonPage.component} {...canonPage.frontmatter} />
