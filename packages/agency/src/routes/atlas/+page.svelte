<script lang="ts">
	import {
		Button,
		PerformanceCampaignOpening,
		PerformanceContrastChapter,
		PerformancePageSection,
		PerformanceThesisConditions,
		SEO,
		type PerformanceCondition
	} from '@create-something/canon';
	import PublicAtlasCanvas from '$lib/components/PublicAtlasCanvas.svelte';
	import PublicAtlasStoryCanvas from '$lib/components/PublicAtlasStoryCanvas.svelte';
	import { agencyCoreMessaging } from '$lib/data/marketingCopy';

	const atlasProtocol: PerformanceCondition[] = [
		{
			label: 'Input',
			title: 'Prospect map only',
			detail: 'The public canvas receives workflow context, never credentials or private records.',
			tone: 'signal'
		},
		{
			label: 'Boundary',
			title: 'No production tools',
			detail: 'The agent can edit the prospect map and nothing beyond it.',
			tone: 'pressure'
		},
		{
			label: 'Handoff',
			title: 'Summary + context',
			detail: 'A named map and readiness state travel into the booking path.',
			tone: 'growth'
		}
	];
</script>

<SEO
	title="Public Atlas Canvas | CREATE SOMETHING"
	description="Use the public Atlas canvas to map one workflow, understand the operating boundary, and carry the summary into a CREATE SOMETHING mapping session."
	keywords="Atlas canvas, workflow mapping, AI agent workflow, public workflow map"
	propertyName="agency"
/>

<main class="atlas-page">
	<PerformanceCampaignOpening
		eyebrow="Atlas canvas"
		title="Map the workflow before the call."
		lede="Use the constrained public canvas to name the owner, data, approvals, systems, risks, and inspection points. The agent can only edit this prospect map; production tools and private systems stay outside the public surface."
		media={{ src: '/images/performance-lab/trace-control-plane.webp', mobileSrc: '/images/performance-lab/trace-control-plane-mobile.webp', alt: 'A controlled channel leaving a visible trace through the system' }}
		proof={[{ label: 'Input', value: 'Prospect map' }, { label: 'Boundary', value: 'No production tools' }, { label: 'Handoff', value: 'Summary + context' }]}
	>
		{#snippet actions()}
			<Button href="#canvas">Open canvas</Button>
			<Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
				{agencyCoreMessaging.bookMappingSessionLabel}
			</Button>
		{/snippet}
	</PerformanceCampaignOpening>

	<PerformanceThesisConditions
		eyebrow="Atlas protocol"
		title="Map the channel before work enters it."
		description="Atlas makes the boundary, ownership, stops, and proof requirements visible without touching production systems."
		conditions={atlasProtocol}
		ariaLabel="Atlas public mapping protocol"
	/>

	<PerformanceContrastChapter
		eyebrow="Atlas story"
		title="See the workflow as a story before editing the map."
		description="The static Atlas story uses the same graph contract as the interactive canvas. It explains what can run, what waits for judgment, where execution must stop, and where proof lands."
		intervention={{ label: 'Shared graph contract', title: 'Story before mutation', detail: 'The explanatory view and interactive canvas render the same operating model.' }}
	>
		{#snippet artifact()}
			<PublicAtlasStoryCanvas
				starterId="marketplace-review-queue"
				storyId="atlas-page-marketplace-review-story"
			/>
		{/snippet}
	</PerformanceContrastChapter>

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
