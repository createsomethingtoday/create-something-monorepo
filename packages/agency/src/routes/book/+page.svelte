<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, tick } from 'svelte';
	import { Button, PerformanceConversionHandoff, SEO } from '@create-something/canon';
	import { getAnalytics } from '@create-something/canon/analytics';
	import { PUBLIC_ATLAS_STORAGE_KEYS } from '$lib/atlas/intake-policy';
	import {
		createBookingHandoffState,
		FIRST_PARTY_SCHEDULER_ORIGIN,
		normalizeSchedulerAccessUrl,
		normalizeSchedulerLifecycleMessage,
		normalizeSchedulerResizeMessage,
		type SchedulerAccess,
		type SchedulerHandoffSheet
	} from '$lib/scheduling/first-party';
	import type { PageData } from './$types';

	export let data: PageData;

	const mappingBookingOffer = {
		seoTitle: 'Book a CREATE SOMETHING Mapping Session',
		seoDescription:
			'Choose a verified 30- or 60-minute opening for a scoped workflow mapping session.',
		eyebrow: 'Workflow mapping session',
		title: 'Review the handoff, then choose a time.',
		description:
			'Use this scheduler for one real workflow, its decision owner, and the record your team needs next. If you started a private draft, review its handoff before choosing an opening.',
		secondaryHref: '/map',
		secondaryLabel: 'Start a private workflow draft',
		iframeTitle: 'Schedule a CREATE SOMETHING mapping session',
		fallbackHref: '/services',
		fallbackLabel: 'the workflow mapping service'
	} as const;

	const compilerIntegrationBookingOffer = {
		seoTitle: 'Book a Workflow Compiler Integration Fit Call | CREATE SOMETHING',
		seoDescription:
			'Choose a verified 30- or 60-minute opening to assess one fixed-scope Workflow Compiler Integration.',
		eyebrow: 'Workflow Compiler Integration fit call',
		title: 'Confirm the integration boundary, then choose a time.',
		description:
			'Use this scheduler to assess one repository, one consequential workflow, the required MCP or agent tools, and fit for a fixed-scope Build.',
		secondaryHref: '/workflow-compiler-integration',
		secondaryLabel: 'Review the integration offer',
		iframeTitle: 'Schedule a Workflow Compiler Integration fit call',
		fallbackHref: '/workflow-compiler-integration',
		fallbackLabel: 'the fixed-scope integration offer'
	} as const;

	const agentFoundationBookingOffer = {
		seoTitle: 'Book an Agent Foundation Fit Call | CREATE SOMETHING',
		seoDescription:
			'Choose a verified 30- or 60-minute opening to assess one bounded, client-owned Agent Foundation.',
		eyebrow: 'Agent Foundation fit call',
		title: 'Choose a time to review your agent project.',
		description:
			'Bring the project, the person or team the agent serves, and one representative example. We’ll decide whether Agent Foundation fits and define the first useful job.',
		secondaryHref: '/agent-foundation',
		secondaryLabel: 'Review the Agent Foundation offer',
		iframeTitle: 'Schedule an Agent Foundation fit call',
		fallbackHref: '/agent-foundation',
		fallbackLabel: 'the Agent Foundation offer'
	} as const;
	type BookingOffer =
		| typeof mappingBookingOffer
		| typeof compilerIntegrationBookingOffer
		| typeof agentFoundationBookingOffer;

	let schedulerHref = data.schedulerHref;
	let schedulerFrame: HTMLIFrameElement;
	let handoffContext = data.handoffContext;
	let handoffSheet: SchedulerHandoffSheet = data.handoffSheet;
	let schedulerAccess: SchedulerAccess | null = null;
	let warmupNotes: string | undefined;
	let intent: string | null = null;
	let bookingOffer: BookingOffer = mappingBookingOffer;

	$: intent = $page.url.searchParams.get('intent');
	$: bookingOffer =
		intent === 'agent-foundation'
			? agentFoundationBookingOffer
			: intent === 'compiler-integration'
				? compilerIntegrationBookingOffer
				: mappingBookingOffer;
	$: {
		const bookingState = createBookingHandoffState($page.url.search, warmupNotes);
		schedulerHref = bookingState.schedulerHref;
		handoffContext = bookingState.handoffContext;
		handoffSheet = bookingState.handoffSheet;
	}

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

		if (lifecycle.action === 'booking_form_started') {
			getAnalytics()?.track('interaction', lifecycle.action, { metadata: lifecycle.metadata });
			return;
		}

		getAnalytics()?.conversion(lifecycle.action, lifecycle.metadata);
	}

	onMount(() => {
		window.addEventListener('message', receiveSchedulerMessage);
		schedulerAccess = normalizeSchedulerAccessUrl(window.location.href);
		if (schedulerAccess) {
			window.history.replaceState(window.history.state, '', schedulerAccess.cleanPath);
		}
		warmupNotes = window.localStorage.getItem(PUBLIC_ATLAS_STORAGE_KEYS.warmupSummary) ?? undefined;
		void tick().then(() => {
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
		});
		return () => window.removeEventListener('message', receiveSchedulerMessage);
	});
</script>

<SEO
	title={bookingOffer.seoTitle}
	description={bookingOffer.seoDescription}
	propertyName="agency"
/>

<main class="booking-page" data-performance-surface="booking">
	{#if intent === 'agent-foundation'}
		<section
			class="agent-booking"
			data-agent-foundation-booking
			aria-labelledby="agent-booking-title"
		>
			<div class="agent-booking__intro">
				<p>{agentFoundationBookingOffer.eyebrow}</p>
				<h1 id="agent-booking-title">{agentFoundationBookingOffer.title}</h1>
				<p>{agentFoundationBookingOffer.description}</p>
				<div class="agent-booking__outcome">
					<span>What you leave with</span>
					<p>A fit decision and, if it fits, a proposed scope and the basis for a quote.</p>
				</div>
				<Button href="#first-party-scheduler">Choose a time</Button>
			</div>

			{#if handoffSheet.warmupNotes}
				<aside class="agent-booking__context">
					<span>Private draft attached</span>
					<p>{handoffSheet.warmupNotes}</p>
					<small>Do not include credentials, client secrets, or private records.</small>
				</aside>
			{/if}

			<section
				id="first-party-scheduler"
				class="scheduler-shell"
				aria-label="Choose a verified opening"
			>
				<iframe
					bind:this={schedulerFrame}
					src={schedulerHref}
					title={bookingOffer.iframeTitle}
					loading="eager"
					referrerpolicy="no-referrer"
					sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
					onload={sendSchedulerContext}
				></iframe>
				<p class="scheduler-shell__fallback">
					If the embedded scheduler is unavailable,
					<a href={schedulerHref} target="_blank" rel="noopener noreferrer"
						>open the first-party scheduler</a
					>. Review <a href={bookingOffer.fallbackHref}>{bookingOffer.fallbackLabel}</a> before choosing
					a time.
				</p>
			</section>
		</section>
	{:else}
		<PerformanceConversionHandoff
			eyebrow={bookingOffer.eyebrow}
			title={bookingOffer.title}
			description={bookingOffer.description}
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
					detail:
						'Confirm the source, decision owner, and draft notes that will reach the scheduler.'
				},
				{
					label: 'Time',
					title: 'Choose 30 or 60 minutes',
					detail: 'Every opening is checked against the live calendar before it is offered.'
				},
				{
					label: 'Confirm',
					title: 'Commit with explicit intent',
					detail:
						'Your name and email are used only when you explicitly create the calendar event and meeting receipt.'
				}
			]}
			headingLevel="h1"
			artifactPlacement="full-width"
		>
			{#snippet actions()}
				<Button href="#first-party-scheduler">Choose a time</Button>
				<Button href={bookingOffer.secondaryHref} variant="secondary">
					{bookingOffer.secondaryLabel}
				</Button>
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
						Only these fields are shared with the scheduler below. Do not add credentials, client
						secrets, or private records.
					</p>
				</section>

				<section
					id="first-party-scheduler"
					class="scheduler-shell"
					aria-label="Choose a verified opening"
				>
					<iframe
						bind:this={schedulerFrame}
						src={schedulerHref}
						title={bookingOffer.iframeTitle}
						loading="eager"
						referrerpolicy="no-referrer"
						sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
						onload={sendSchedulerContext}
					></iframe>

					<p class="scheduler-shell__fallback">
						If the embedded scheduler is unavailable,
						<a href={schedulerHref} target="_blank" rel="noopener noreferrer"
							>open the first-party scheduler</a
						>. Review <a href={bookingOffer.fallbackHref}>{bookingOffer.fallbackLabel}</a> before choosing
						a time.
					</p>
				</section>
			{/snippet}
		</PerformanceConversionHandoff>
	{/if}
</main>

<style>
	.booking-page {
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
	}

	.agent-booking {
		display: grid;
		grid-template-columns: minmax(18rem, 0.72fr) minmax(0, 1.28fr);
		gap: clamp(2rem, 6vw, 6rem);
		width: min(85rem, 100%);
		margin-inline: auto;
		padding: clamp(4rem, 9vw, 8rem) clamp(1.25rem, 5vw, 4rem);
	}

	.agent-booking__intro {
		align-self: start;
	}

	.agent-booking__intro > p:first-child,
	.agent-booking__outcome span,
	.agent-booking__context span {
		color: var(--color-performance-signal, #0057b8);
		font-family: var(--font-performance-mono, monospace);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}

	.agent-booking h1 {
		max-width: 12ch;
		margin: 0.8rem 0 1.25rem;
		font-size: clamp(2.75rem, 5.5vw, 5.7rem);
		font-weight: 400;
		letter-spacing: -0.06em;
		line-height: 0.94;
	}

	.agent-booking__intro > p:nth-child(3),
	.agent-booking__outcome p,
	.agent-booking__context p,
	.agent-booking__context small {
		color: var(--color-performance-muted, #5e6268);
		line-height: 1.55;
	}

	.agent-booking__outcome,
	.agent-booking__context {
		margin: 2rem 0;
		padding: 1rem;
		border-left: 3px solid var(--color-performance-signal, #0057b8);
		background: var(--color-performance-panel, #fff);
	}

	.agent-booking__outcome p,
	.agent-booking__context p {
		margin: 0.5rem 0 0;
	}

	.agent-booking__context {
		grid-column: 1 / -1;
		margin: 0;
	}

	.agent-booking > .scheduler-shell {
		grid-column: 2;
		grid-row: 1;
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
		.agent-booking {
			grid-template-columns: 1fr;
		}

		.agent-booking > .scheduler-shell {
			grid-column: 1;
			grid-row: auto;
		}
		.booking-handoff__fields {
			grid-template-columns: 1fr;
		}

		iframe {
			min-height: 940px;
		}
	}
</style>
