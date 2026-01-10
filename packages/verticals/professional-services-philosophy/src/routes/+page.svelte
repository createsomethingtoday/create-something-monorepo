<script lang="ts">
	/**
	 * Home Page - Philosophy Edition
	 *
	 * Single conversion path. Natural narrative flow.
	 *
	 * Journey:
	 * 1. Hero: Contemplative entrance
	 * 2. Selected Works: 5 projects with outcome metrics
	 * 3. Philosophy: Dwelling invitation (replaces office gallery)
	 * 4. Practice Areas: Purposeful disclosure
	 * 5. Client Outcomes: Metrics-driven specificity
	 * 6. Team: Philosophy statements
	 * 7. Contact: Soft invitation (single conversion)
	 *
	 * "Tools recede. Partnership remains."
	 */

	import HeroSection from '$lib/components/HeroSection.svelte';
	import ProjectGallery from '$lib/components/ProjectGallery.svelte';
	import PhilosophySection from '$lib/components/PhilosophySection.svelte';
	import PracticeAreasExpanded from '$lib/components/PracticeAreasExpanded.svelte';
	import OutcomesGrid from '$lib/components/OutcomesGrid.svelte';
	import TeamPhilosophy from '$lib/components/TeamPhilosophy.svelte';
	import ProgressiveForm from '$lib/components/ProgressiveForm.svelte';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import StructuredData from '$lib/components/StructuredData.svelte';
</script>

<SEOHead canonical="/" />
<StructuredData page="home" />

<main class="philosophy-edition">
	<HeroSection />

	<ProjectGallery limit={5} />

	<PhilosophySection />

	<PracticeAreasExpanded />

	<OutcomesGrid />

	<TeamPhilosophy />

	<ProgressiveForm
		title="Inquire"
		subtitle="Email required. Response within 48 hours."
	/>
</main>

<style>
	.philosophy-edition {
		background: var(--color-bg-pure);
	}
</style>
