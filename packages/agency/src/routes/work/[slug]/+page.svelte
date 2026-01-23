<script lang="ts">
	/**
	 * Work Case Study - Dynamic Route Component
	 *
	 * Renders markdown content using MDsveX.
	 * The MarkdownLayout.svelte provides structure and PageActions.
	 */
	import type { PageData } from './$types';
	import { SEO } from '@create-something/components';

	let { data }: { data: PageData } = $props();
	const { component: Component, frontmatter } = data;
</script>

<SEO
	title="{frontmatter.title} — Case Study"
	description={frontmatter.description || frontmatter.title}
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Work', url: '/work' },
		{ name: frontmatter.title, url: `/work/${frontmatter.slug || ''}` }
	]}
/>

<!-- Render the MDsveX component (uses MarkdownLayout automatically) -->
<Component {...frontmatter} />
