<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, PerformanceConversionHandoff, SEO } from '@create-something/canon';
	import { getAnalytics } from '@create-something/canon/analytics';
	import { PUBLIC_ATLAS_STORAGE_KEYS } from '$lib/atlas/intake-policy';
	import {
		buildFirstPartySchedulerUrl,
		buildSchedulerLifecycleAnalyticsMetadata,
		FIRST_PARTY_SCHEDULER_ORIGIN,
		normalizeSchedulerAccessUrl,
		normalizeSchedulerLifecycleMessage,
		normalizeSchedulerResizeMessage,
		schedulerHandoffContext,
		schedulerHandoffSheet,
		type SchedulerAccess,
		type SchedulerHandoffSheet
	} from '$lib/scheduling/first-party';

	let schedulerHref = buildFirstPartySchedulerUrl();
	let schedulerFrame: HTMLIFrameElement;
	let handoffContext = schedulerHandoffContext();
	let handoffSheet: SchedulerHandoffSheet = schedulerHandoffSheet(handoffContext);
	let schedulerAccess: SchedulerAccess | null = null;

	function sendSchedulerContext() {
		schedulerFrame?.contentWindow?.postMessage(
			{ type: 'create-something:scheduler-context', context: handoffContext },
			FIRST_PARTY_SCHEDULER_ORIGIN
		);
		if (schedulerAccess) {
			schedulerFrame?.contentWindow?.postMessage(
				{
					type: 'create-something:scheduler-access',
					bookingId: schedulerAccess.bookingId,
					actionToken: schedulerAccess.actionToken
				},
				FIRST_PARTY_SCHEDULER_ORIGIN
			);
		}
	}

	function receiveSchedulerMessage(event: MessageEvent) {
		if (event.origin !== FIRST_PARTY_SCHEDULER_ORIGIN) return;
		if (event.source !== schedulerFrame?.contentWindow) return;
		const documentHeight = normalizeSchedulerResizeMessage(event.data);
		if (documentHeight) {
			const frameBorder = schedulerFrame.offsetHeight - schedulerFrame.clientHeight;
			schedulerFrame.style.height = `${documentHeight + frameBorder}px`;
			return;
		}
		const lifecycle = normalizeSchedulerLifecycleMessage(event.data);
		if (!lifecycle) return;
		const metadata = buildSchedulerLifecycleAnalyticsMetadata(lifecycle.metadata, handoffContext);

		if (lifecycle.action === 'booking_form_started') {
			getAnalytics()?.track('interaction', lifecycle.action, { metadata });
			return;
		}

		getAnalytics()?.conversion(lifecycle.action, metadata);
	}

	onMount(() => {
		window.addEventListener('message', receiveSchedulerMessage);
		schedulerAccess = normalizeSchedulerAccessUrl(window.location.href);
		if (schedulerAccess) {
			window.history.replaceState(window.history.state, '', schedulerAccess.cleanPath);
		}
		schedulerHref = buildFirstPartySchedulerUrl(window.location.search);
		const warmupNotes = window.localStorage.getItem(PUBLIC_ATLAS_STORAGE_KEYS.warmupSummary) ?? undefined;
		handoffContext = schedulerHandoffContext(window.location.search, warmupNotes);
		handoffSheet = schedulerHandoffSheet(handoffContext);
		sendSchedulerContext();
		getAnalytics()?.track('interaction', 'booking_handoff_viewed', {
			metadata: {
				surface: 'agency-booking',
				state: handoffSheet.state,
				fieldCount: handoffSheet.fields.length,
				hasWarmupNotes: Boolean(handoffSheet.warmupNotes),
				...(handoffContext.source ? { source: handoffContext.source } : {}),
				...(handoffContext.intent ? { intent: handoffContext.intent } : {})
			}
		});
		return () => window.removeEventListener('message', receiveSchedulerMessage);
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
	title="Review the handoff, then choose a time."
	description="Use this scheduler for one real workflow, its decision owner, and the record your team needs next. If you started a private draft, review its handoff before choosing an opening."
		handoff={{
			owner: 'Micah Johnson',
			authority: 'Conflict-checked scheduling policy',
			proof: 'Calendar event and booking receipt',
			state: 'ready'
		}}
		steps={[
		{
				label: 'Handoff',
				title: 'Review what will be shared',
				detail: 'Confirm the source, decision owner, and draft notes that will reach the scheduler.'
			},
			{
				label: 'Time',
				title: 'Choose 30 or 60 minutes',
				detail: 'Every opening is checked against the live calendar before it is offered.'
			},
			{
				label: 'Confirm',
				title: 'Commit with explicit intent',
				detail: 'Your name and email are used only when you explicitly create the calendar event and meeting receipt.'
			}
		]}
		headingLevel="h1"
		artifactPlacement="full-width"
	>
		{#snippet actions()}
			<Button href="#first-party-scheduler">Choose a time</Button>
			<Button href="/map" variant="secondary">Start a private workflow draft</Button>
		{/snippet}
		{#snippet aside()}
			<section
				class="booking-handoff"
				data-booking-handoff-state={handoffSheet.state}
				aria-labelledby="booking-handoff-title"
			>
				<div class="booking-handoff__heading">
					<span>Incoming handoff</span>
					<h2 id="booking-handoff-title">What will travel into booking</h2>
					<p>{handoffSheet.summary}</p>
				</div>

				{#if handoffSheet.state === 'ready'}
					<dl class="booking-handoff__fields">
						{#each handoffSheet.fields as field}
							<div>
								<dt>{field.label}</dt>
								<dd>{field.value}</dd>
							</div>
						{/each}
						{#if handoffSheet.warmupNotes}
							<div class="booking-handoff__notes">
								<dt>Private draft notes</dt>
								<dd>{handoffSheet.warmupNotes}</dd>
							</div>
						{/if}
					</dl>
				{/if}

				<p class="booking-handoff__privacy">
					Only these fields are shared with the scheduler below. Do not add credentials,
					client secrets, or private records.
				</p>
			</section>

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

	.booking-handoff {
		position: relative;
		display: grid;
		gap: 1rem;
		margin-bottom: 1rem;
		padding: 1.15rem;
		border: 1px solid var(--color-performance-line-strong, #9c9c96);
		background:
			linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 3rem 3rem,
			var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
	}

	.booking-handoff::before {
		position: absolute;
		top: -1px;
		right: 1.15rem;
		width: 4.6rem;
		height: 0.28rem;
		background: var(--color-performance-signal, #0057b8);
		content: '';
	}

	.booking-handoff__heading {
		display: grid;
		gap: 0.35rem;
	}

	.booking-handoff__heading > span,
	.booking-handoff dt {
		font-family: var(--font-performance-mono, monospace);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.booking-handoff__heading > span {
		color: var(--color-performance-signal, #0057b8);
	}

	.booking-handoff h2,
	.booking-handoff p,
	.booking-handoff dd {
		margin: 0;
	}

	.booking-handoff h2 {
		font-size: clamp(1.3rem, 2vw, 1.7rem);
		font-weight: var(--font-performance-medium, 500);
		line-height: 1.08;
	}

	.booking-handoff__heading p,
	.booking-handoff__privacy {
		color: var(--color-performance-muted, #5e6268);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.booking-handoff__fields {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.65rem;
		margin: 0;
	}

	.booking-handoff__fields > div {
		min-width: 0;
		padding: 0.75rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		background: var(--color-performance-panel, #ffffff);
	}

	.booking-handoff dd {
		margin-top: 0.28rem;
		font-size: 0.95rem;
		line-height: 1.4;
		overflow-wrap: anywhere;
	}

	.booking-handoff__notes {
		grid-column: 1 / -1;
	}

	.booking-handoff__privacy {
		padding-top: 0.8rem;
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
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
		font-family: var(--font-performance-mono, var(--font-performance-mono));
		font-size: 0.78rem;
	}

	.scheduler-shell__fallback a {
		color: var(--color-performance-ink, #090909);
		font-weight: 700;
	}

	@media (max-width: 720px) {
		.booking-handoff__fields {
			grid-template-columns: 1fr;
		}

		iframe {
			min-height: 940px;
		}
	}
</style>
