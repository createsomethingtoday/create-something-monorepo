<script lang="ts">
	/**
	 * Pattern Detail - Markdown Route
	 *
	 * Renders markdown content using MDsveX.
	 * The MarkdownLayout.svelte provides structure and PageActions.
	 */
	import { SEO } from '@create-something/components';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	
	// Use $derived for reactivity on client-side navigation
	let pattern = $derived(data.pattern);
</script>

<SEO
	title={pattern.frontmatter.title}
	description={pattern.frontmatter.subtitle || pattern.frontmatter.title}
	propertyName="ltd"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.ltd' },
		{ name: 'Patterns', url: 'https://createsomething.ltd/patterns' },
		{ name: pattern.frontmatter.title, url: `https://createsomething.ltd/patterns/${data.slug}` }
	]}
/>

<!-- Render the MDsveX component (uses MarkdownLayout automatically) -->
<svelte:component this={pattern.component} {...pattern.frontmatter} />
