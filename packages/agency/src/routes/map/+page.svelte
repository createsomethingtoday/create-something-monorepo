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
	import PlaybookField from '$lib/components/PlaybookField.svelte';
	import PublicAtlasCanvas from '$lib/components/PublicAtlasCanvas.svelte';
	import SystemContextRail from '$lib/components/SystemContextRail.svelte';
	import { agencyCoreMessaging } from '$lib/data/marketingCopy';
	import { playbookHeroMedia } from '$lib/data/playbookHeroMedia';

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
		expression="editorial"
		title="See the whole operation before AI runs the play."
		lede="Map defines the client-owned Playbook: owner, data, systems, authority, Runbooks, risks, and proof. Start a private draft without touching production. A short summary can travel to a mapping session."
		density="compact"
		media={playbookHeroMedia.map}
		mediaMobilePlacement="background"
		proof={[{ label: 'Input', value: 'Prospect map' }, { label: 'Boundary', value: 'No production tools' }, { label: 'Handoff', value: 'Build or Control' }]}
	>
		{#snippet actions()}
			<Button href="#canvas">Open private draft</Button>
			<Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
				{agencyCoreMessaging.bookMappingSessionLabel}
			</Button>
		{/snippet}
	</PerformanceCampaignOpening>

	<PerformanceThesisConditions
		eyebrow="Mapping protocol"
		title="Set the boundary before work is delegated."
		description="Map shows the boundary, owner, stop condition, and proof requirement before work reaches a production system."
		conditions={mapProtocol}
		ariaLabel="Public workflow mapping protocol"
	/>

	<PerformancePageSection
		id="canvas"
		variant="white"
		eyebrow="Public mapping surface"
		title="The canvas turns a starting sheet into operating context."
		description="Cold readers can test the method without exposing credentials. The private draft stays in this browser; its summary and readiness signal can move into booking, a durable Map workspace, Build, or Control."
	>
		{#snippet after()}
			<PlaybookField variant="map" embedded />
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
		expression="editorial"
		eyebrow="Continue the definition"
		title="Carry the starter sheet forward."
		description="The private draft is a starting sheet, not an account-scoped CREATE SOMETHING Map. Sign in for version history, review gates, sharing, export, and Build handoff—or bring its summary into a mapping session first."
		density="compact"
		handoff={{
			owner: 'Workflow owner',
			authority: 'Human approval',
			proof: 'Map + versions + review record',
			state: 'review'
		}}
	>
		{#snippet actions()}
			<Button href="/map/workspace">Open CREATE SOMETHING Map</Button>
			<Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
				{agencyCoreMessaging.bookMappingSessionLabel}
			</Button>
		{/snippet}
	</PerformanceConversionHandoff>
</main>
