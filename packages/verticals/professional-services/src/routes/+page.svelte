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

	import HeroSection from '$lib/components/HeroSection.svelte';
	import ProjectGallery from '$lib/components/ProjectGallery.svelte';
	import StudioSection from '$lib/components/StudioSection.svelte';
	import ProgressiveForm from '$lib/components/ProgressiveForm.svelte';
	import StickyCTA from '$lib/components/StickyCTA.svelte';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import StructuredData from '$lib/components/StructuredData.svelte';
</script>

<SEOHead canonical="/" />
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
