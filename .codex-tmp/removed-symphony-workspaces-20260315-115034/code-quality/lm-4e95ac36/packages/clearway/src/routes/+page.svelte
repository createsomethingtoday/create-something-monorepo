<script lang="ts">
	// CLEARWAY Landing Page
	// The infrastructure disappears; courts get booked.

	import {
		HeroSection,
		StackShowcase,
		ValueGrid,
		PhilosophySection,
		PricingSection,
		ProgressiveForm,
		Footer,
		ScrollReveal
	} from '$lib/components/landing';
</script>

<svelte:head>
	<title>CLEARWAY - When Scheduling Works, You Forget It Exists</title>
	<meta
		name="description"
		content="CLEARWAY doesn't automate court booking. It removes the need to think about it. AI-powered scheduling that recedes into invisibility."
	/>
	<meta property="og:title" content="CLEARWAY - When Scheduling Works, You Forget It Exists" />
	<meta
		property="og:description"
		content="When scheduling works, you forget it exists."
	/>
	<meta property="og:type" content="website" />
</svelte:head>

<main>
	<HeroSection />
	<ScrollReveal>
		<StackShowcase />
	</ScrollReveal>
	<ScrollReveal delay={100}>
		<ValueGrid />
	</ScrollReveal>
	<ScrollReveal delay={100}>
		<PhilosophySection />
	</ScrollReveal>
	<ScrollReveal delay={100}>
		<PricingSection />
	</ScrollReveal>
	<ScrollReveal delay={100}>
		<div id="request-demo">
			<ProgressiveForm />
		</div>
	</ScrollReveal>
	<Footer />
</main>

<style>
	main {
		min-height: 100vh;
	}
</style>
