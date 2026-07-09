<script lang="ts">
	import { Button, PerformancePageSection, SEO } from '@create-something/canon';
	import PublicAtlasCanvas from '$lib/components/PublicAtlasCanvas.svelte';
	import PublicAtlasStoryCanvas from '$lib/components/PublicAtlasStoryCanvas.svelte';
	import { agencyCoreMessaging } from '$lib/data/marketingCopy';
</script>

<SEO
	title="Public Atlas Canvas | CREATE SOMETHING"
	description="Use the public Atlas canvas to map one workflow, understand the operating boundary, and carry the summary into a CREATE SOMETHING mapping session."
	keywords="Atlas canvas, workflow mapping, AI agent workflow, public workflow map"
	propertyName="agency"
/>

<main class="atlas-page">
	<PerformancePageSection
		variant="hero"
		titleLevel="h1"
		eyebrow="Atlas canvas"
		title="Map the workflow before the call."
		description="Use the constrained public canvas to name the owner, data, approvals, systems, risks, and inspection points. The agent can only edit this prospect map; production tools and private systems stay outside the public surface."
	>
		{#snippet actions()}
			<Button href="#canvas">Open canvas</Button>
			<Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
				{agencyCoreMessaging.bookMappingSessionLabel}
			</Button>
		{/snippet}
	</PerformancePageSection>

	<PerformancePageSection
		variant="soft"
		eyebrow="Atlas story"
		title="See the workflow as a story before editing the map."
		description="The static Atlas story uses the same graph contract as the interactive canvas. It explains what can run, what waits for judgment, where execution must stop, and where proof lands."
	>
		{#snippet after()}
			<PublicAtlasStoryCanvas
				starterId="marketplace-review-queue"
				storyId="atlas-page-marketplace-review-story"
			/>
		{/snippet}
	</PerformancePageSection>

	<PerformancePageSection
		id="canvas"
		variant="white"
		eyebrow="Public mapping surface"
		title="The canvas turns curiosity into booking context."
		description="Cold readers can test the method without exposing credentials. Warm teams leave with a summary, readiness signal, and booking metadata that make the first session sharper."
	>
		{#snippet after()}
			<PublicAtlasCanvas bookingHref="/book" />
		{/snippet}
	</PerformancePageSection>
</main>
