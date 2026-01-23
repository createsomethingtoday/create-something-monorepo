<script lang="ts">
	/**
	 * Home Page - DWELL-Inspired Architecture Studio
	 *
	 * The page is a journey through space:
	 * 1. Hero: Full-bleed image commands attention
	 * 2. Projects: Gallery invites exploration
	 * 3. Studio: Philosophy reveals itself
	 * 4. Contact: Soft invitation, not demand
	 *
	 * "Space between elements is content."
	 */

	import { SEO } from '@create-something/components';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import ProjectGallery from '$lib/components/ProjectGallery.svelte';
	import StudioSection from '$lib/components/StudioSection.svelte';
	import ProgressiveForm from '$lib/components/ProgressiveForm.svelte';
	import StickyCTA from '$lib/components/StickyCTA.svelte';
	import StructuredData from '$lib/components/StructuredData.svelte';
</script>

<SEO
	title="Professional Services"
	description="Space between elements is content. Architecture studio focused on thoughtful design."
	propertyName="agency"
	breadcrumbs={[{ name: 'Home', url: '/' }]}
/>
<StructuredData page="home" />

<main class="home">
	<HeroSection />
	<ProjectGallery />
	<StudioSection />
	<ProgressiveForm
		title="Inquire"
		subtitle="Email required. Response within 48 hours."
	/>
</main>

<StickyCTA />

<style>
	.home {
		background: var(--color-bg-pure);
	}
</style>
