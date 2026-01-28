<script lang="ts">
	/**
	 * Projects Index - DWELL-Inspired Gallery
	 *
	 * Full gallery view of all projects.
	 * Images command, text recedes.
	 *
	 * "Let the work speak."
	 */

	import { SEO } from '@create-something/canon';
	import ProjectGallery from '$lib/components/ProjectGallery.svelte';
	import { siteConfig } from '$lib/config/context';
</script>

<SEO
	title="Projects"
	description="Explore our portfolio of architecture and design projects."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Projects', url: '/projects' }
	]}
/>

<main class="projects-page">
	<!-- Header -->
	<header class="projects-header">
		<h1 class="projects-label">Projects</h1>
		<p class="projects-count">{$siteConfig.projects.length} Works</p>
	</header>

	<!-- Gallery -->
	<ProjectGallery />
</main>

<style>
	.projects-page {
		background: var(--color-bg-pure);
		min-height: 100vh;
		padding-top: var(--space-3xl);
	}

	.projects-header {
		max-width: var(--width-wide);
		margin: 0 auto;
		padding: 0 var(--space-lg) var(--space-xl);
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.projects-label {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		letter-spacing: var(--tracking-wider);
		text-transform: uppercase;
	}

	.projects-count {
		font-size: var(--text-caption);
		color: var(--color-fg-subtle);
	}
</style>
