<script lang="ts">
	// CLEARWAY Landing Page
	// The infrastructure disappears; courts get booked.

	import {
		HeroSection,
		ProblemSection,
		StackShowcase,
		ValueGrid,
		DeveloperEmbed,
		PricingSection,
		ProgressiveForm,
		Footer
	} from '$lib/components/landing';
</script>

<svelte:head>
	<title>CLEARWAY - Autonomous Court Scheduling</title>
	<meta
		name="description"
		content="The infrastructure disappears; courts get booked. AI-powered court reservation that handles scheduling, waitlists, and optimization autonomously."
	/>
	<meta property="og:title" content="CLEARWAY - Autonomous Court Scheduling" />
	<meta
		property="og:description"
		content="The infrastructure disappears; courts get booked."
	/>
	<meta property="og:type" content="website" />
</svelte:head>

<main>
	<HeroSection />
	<ProblemSection />
	<StackShowcase />
	<ValueGrid />
	<DeveloperEmbed />
	<PricingSection />
	<ProgressiveForm />
	<Footer />
</main>

<style>
	main {
		min-height: 100vh;
	}
</style>
