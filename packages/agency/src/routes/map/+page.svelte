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

	const mapProtocol: PerformanceCondition[] = [
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
	title="CREATE SOMETHING Map | Workflow Mapping"
	description="Use CREATE SOMETHING Map to define one human-agent workflow, make its operating boundary legible, and carry an approved definition into Build or Control."
	keywords="workflow mapping product, human agent workflow, workflow definition, AI workflow map"
	propertyName="agency"
/>

<main class="map-page">
	<PerformanceCampaignOpening
		eyebrow="CREATE SOMETHING Map"
		title="Map the workflow before the call."
		lede="Use the constrained public canvas to name the owner, data, approvals, systems, risks, and inspection points. Map can stand alone as the living workflow definition, or carry approved context into Build and Control."
		media={{ src: '/images/performance-lab/trace-wake-natural.webp', mobileSrc: '/images/performance-lab/trace-wake-natural-mobile.webp', alt: 'Aerial black-and-white view of a survey craft leaving a directional wake' }}
		proof={[{ label: 'Input', value: 'Prospect map' }, { label: 'Boundary', value: 'No production tools' }, { label: 'Handoff', value: 'Build or Control' }]}
	>
		{#snippet actions()}
			<Button href="#canvas">Open canvas</Button>
			<Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
				{agencyCoreMessaging.bookMappingSessionLabel}
			</Button>
		{/snippet}
	</PerformanceCampaignOpening>

	<PerformanceThesisConditions
		eyebrow="Mapping protocol"
		title="Map the channel before work enters it."
		description="Map makes the boundary, ownership, stops, and proof requirements visible without touching production systems."
		conditions={mapProtocol}
		ariaLabel="Public workflow mapping protocol"
	/>

	<PerformanceContrastChapter
		eyebrow="Workflow story"
		title="See the workflow as a story before editing the map."
		description="The static story uses the same graph contract as the interactive canvas. It explains what can run, what waits for judgment, where execution must stop, and where proof lands."
		intervention={{ label: 'Shared graph contract', title: 'Story before mutation', detail: 'The explanatory view and interactive canvas render the same operating model.' }}
	>
		{#snippet artifact()}
			<PublicAtlasStoryCanvas
				starterId="marketplace-review-queue"
				storyId="map-page-marketplace-review-story"
			/>
		{/snippet}
	</PerformanceContrastChapter>

	<PerformancePageSection
		id="canvas"
		variant="white"
		eyebrow="Public mapping surface"
		title="The canvas turns curiosity into operating context."
		description="Cold readers can test the method without exposing credentials. Warm teams leave with a summary, readiness signal, and workflow definition that can stand alone or move into Build and Control."
	>
		{#snippet after()}
			<PublicAtlasCanvas bookingHref="/book" />
		{/snippet}
	</PerformancePageSection>
</main>

