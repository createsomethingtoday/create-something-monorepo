<script lang="ts">
	/**
	 * Homepage - The Stack Indoor Pickleball
	 *
	 * Sections:
	 * 1. VideoHero - Full-width video with scale animation
	 * 2. NewsletterSection - Black background with signup form
	 * 3. FeatureGrid - 2x2 grid of feature cards
	 * 4. LocationsSection - Parallax background with location cards
	 * 5. FAQAccordion - Expandable FAQ items
	 * 6. BottomCTA - "Ready to become a member?"
	 */

	import VideoHero from '$lib/components/VideoHero.svelte';
	import NewsletterSection from '$lib/components/NewsletterSection.svelte';
	import FeatureGrid from '$lib/components/FeatureGrid.svelte';
	import LocationsSection from '$lib/components/LocationsSection.svelte';
	import FAQAccordion from '$lib/components/FAQAccordion.svelte';
	import BottomCTA from '$lib/components/BottomCTA.svelte';
</script>

<svelte:head>
	<title>The Stack - Premiere Indoor Pickleball</title>
	<meta
		name="description"
		content="The Stack is a family owned and operated indoor pickleball facility. Book a court, join tournaments, and become a member today."
	/>
</svelte:head>

<VideoHero />
<NewsletterSection />
<FeatureGrid />
<LocationsSection />
<FAQAccordion />
<BottomCTA />
