<script lang="ts">
	/**
	 * Canon Dynamic Route Component
	 *
	 * Renders markdown content via MDsveX with MarkdownLayout.
	 * Uses catch-all [...path] route to handle nested canon pages.
	 */
	import { SEO } from '@create-something/components';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	
	// Use $derived for reactivity on client-side navigation
	let canonPage = $derived(data.canonPage);
</script>

<SEO
	title={canonPage.frontmatter.title}
	description={canonPage.frontmatter.description || canonPage.frontmatter.title}
	propertyName="ltd"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.ltd' },
		{ name: 'Canon', url: 'https://createsomething.ltd/canon' },
		{ name: canonPage.frontmatter.title, url: `https://createsomething.ltd/canon/${data.path}` }
	]}
/>

<!-- Render the MDsveX component (uses MarkdownLayout automatically) -->
<svelte:component this={canonPage.component} {...canonPage.frontmatter} />
