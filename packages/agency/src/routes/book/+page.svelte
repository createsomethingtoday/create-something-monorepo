<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, PerformanceConversionHandoff, SEO } from '@create-something/canon';
	import { getAnalytics } from '@create-something/canon/analytics';
	import { PUBLIC_ATLAS_STORAGE_KEYS } from '$lib/atlas/intake-policy';
	import {
		buildFirstPartySchedulerUrl,
		FIRST_PARTY_SCHEDULER_ORIGIN,
		normalizeSchedulerLifecycleMessage,
		schedulerHandoffContext
	} from '$lib/scheduling/first-party';

	let schedulerHref = buildFirstPartySchedulerUrl();
	let schedulerFrame: HTMLIFrameElement;
	let handoffContext = schedulerHandoffContext();

	function sendSchedulerContext() {
		schedulerFrame?.contentWindow?.postMessage(
			{ type: 'create-something:scheduler-context', context: handoffContext },
			FIRST_PARTY_SCHEDULER_ORIGIN
		);
	}

	function receiveSchedulerLifecycle(event: MessageEvent) {
		if (event.origin !== FIRST_PARTY_SCHEDULER_ORIGIN) return;
		if (event.source !== schedulerFrame?.contentWindow) return;
		const lifecycle = normalizeSchedulerLifecycleMessage(event.data);
		if (!lifecycle) return;

		if (lifecycle.action === 'booking_form_started') {
			getAnalytics()?.track('interaction', lifecycle.action, { metadata: lifecycle.metadata });
			return;
		}

		getAnalytics()?.conversion(lifecycle.action, lifecycle.metadata);
	}

	onMount(() => {
		window.addEventListener('message', receiveSchedulerLifecycle);
		schedulerHref = buildFirstPartySchedulerUrl(window.location.search);
		const warmupNotes = window.localStorage.getItem(PUBLIC_ATLAS_STORAGE_KEYS.warmupSummary) ?? undefined;
		handoffContext = schedulerHandoffContext(window.location.search, warmupNotes);
		sendSchedulerContext();
		return () => window.removeEventListener('message', receiveSchedulerLifecycle);
	});
</script>

<SEO
	title="Book a CREATE SOMETHING Mapping Session"
	description="Choose a verified 30- or 60-minute opening for a scoped workflow mapping session."
	propertyName="agency"
/>

<main class="booking-page" data-performance-surface="booking">
	<PerformanceConversionHandoff
		eyebrow="Workflow mapping session"
		title="Map the workflow before the build decision."
		description="Choose a verified 30- or 60-minute opening through the owned scheduler. Use this controlled path to bring one real handoff, its decision owner, and the audit trail your team needs next."
		handoff={{
			owner: 'Micah Johnson',
			authority: 'Conflict-checked scheduling policy',
			proof: 'Calendar event and booking receipt',
			state: 'ready'
		}}
		steps={[
			{
				label: 'Time',
				title: 'Choose 30 or 60 minutes',
				detail: 'Every opening is checked against the live calendar before it is offered.'
			},
			{
				label: 'Details',
				title: 'Name the people in the handoff',
				detail: 'Your name and email are used to create the calendar event and meeting receipt.'
			},
			{
				label: 'Confirm',
				title: 'Commit with explicit intent',
				detail: 'The booking is created only after confirmation, with Google Meet included.'
			}
		]}
		headingLevel="h1"
		artifactPlacement="full-width"
	>
		{#snippet actions()}
			<Button href="#first-party-scheduler">Choose a time</Button>
			<Button href="/atlas" variant="secondary">Map one workflow first</Button>
		{/snippet}
		{#snippet aside()}
			<section id="first-party-scheduler" class="scheduler-shell" aria-label="Choose a verified opening">
				<iframe
					bind:this={schedulerFrame}
					src={schedulerHref}
					title="Schedule a CREATE SOMETHING mapping session"
					loading="eager"
					referrerpolicy="no-referrer"
					sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
					onload={sendSchedulerContext}
				></iframe>

				<p class="scheduler-shell__fallback">
					If the embedded scheduler is unavailable,
					<a href={schedulerHref} target="_blank" rel="noopener noreferrer">open the first-party scheduler</a>.
					Review <a href="/services">the workflow mapping service</a> before choosing a time.
				</p>
			</section>
		{/snippet}
	</PerformanceConversionHandoff>
</main>

<style>
	.booking-page {
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
	}

	.scheduler-shell {
		width: 100%;
		scroll-margin-top: 5rem;
	}

	iframe {
		display: block;
		width: 100%;
		min-height: 860px;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		background: var(--color-performance-panel, #ffffff);
	}

	.scheduler-shell__fallback {
		margin: 0;
		padding: 0.85rem 1rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-top: 0;
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-performance-mono, var(--font-mono));
		font-size: 0.78rem;
	}

	.scheduler-shell__fallback a {
		color: var(--color-performance-ink, #090909);
		font-weight: 700;
	}

	@media (max-width: 720px) {
		iframe {
			min-height: 940px;
		}
	}
</style>
