<script lang="ts">
	import { page } from '$app/stores';
	import {
		Button,
		PerformanceCampaignOpening,
		PerformanceConversionHandoff,
		PerformancePageSection,
		PerformanceThesisConditions,
		SEO,
		type PerformanceCondition
	} from '@create-something/canon';
	import PublicAtlasCanvas from '$lib/components/PublicAtlasCanvas.svelte';
	import SystemContextRail from '$lib/components/SystemContextRail.svelte';
	import { agencyCoreMessaging } from '$lib/data/marketingCopy';
	import { clarityInspectionMedia } from '$lib/data/performanceMedia';

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
		title="Make the workflow visible before you change it."
		lede="Use the constrained public canvas to name the owner, data, approvals, systems, risks, and inspection points. This browser-local draft stays on this device until you carry it into booking or an authenticated Map workspace."
		media={clarityInspectionMedia}
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

	<PerformancePageSection
		id="canvas"
		variant="white"
		eyebrow="Public mapping surface"
		title="The canvas turns curiosity into operating context."
		description="Cold readers can test the method without exposing credentials. The public draft stays in this browser; its summary and readiness signal can move into booking, a durable Map workspace, Build, or Control."
	>
		{#snippet after()}
			<SystemContextRail />
			<PublicAtlasCanvas bookingHref="/book"
				initialIntegration={$page.url.searchParams.get('source') === 'integration-catalog'
					? ($page.url.searchParams.get('integration') ?? '')
					: ''}
				initialIntegrationName={$page.url.searchParams.get('source') === 'integration-catalog'
					? ($page.url.searchParams.get('integration_name') ?? '')
					: ''}
			/>
		{/snippet}
	</PerformancePageSection>

	<PerformanceConversionHandoff
		eyebrow="Continue the definition"
		title="Keep the workflow definition alive."
		description="The public canvas is a browser-local draft, not a durable workspace. Sign in to create an account-scoped Map with version history, review gates, sharing, export, and Build handoff—or bring this draft into a mapping session first."
		density="compact"
		handoff={{
			owner: 'Workflow owner',
			authority: 'Human approval',
			proof: 'Map + versions + review record',
			state: 'review'
		}}
	>
		{#snippet actions()}
			<Button href="/map/workspace">Open Map workspace</Button>
			<Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
				{agencyCoreMessaging.bookMappingSessionLabel}
			</Button>
		{/snippet}
	</PerformanceConversionHandoff>
</main>
