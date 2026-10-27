<script lang="ts">
	import { page } from '$app/stores';
	import { replaceState } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import { Button, SEO } from '@create-something/canon';
	import { getAnalytics } from '@create-something/canon/analytics';
	import { PUBLIC_ATLAS_STORAGE_KEYS } from '$lib/atlas/intake-policy';
	import {
		createBookingHandoffState,
		schedulerHandoffContext,
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
		seoTitle: 'Discuss AI-native Technical Support | CREATE SOMETHING',
		seoDescription:
			'Choose a 30- or 60-minute time to discuss technical support for your tools and workflows.',
		eyebrow: 'Workflow mapping session',
		title: 'Choose a time to talk through the task.',
		description:
			'Bring one problem or improvement and the person responsible. We discuss diagnosis, engineering work, and learning needs. Review any Map summary before choosing a time.',
		secondaryHref: '/map',
		secondaryLabel: 'Map your workflow',
		iframeTitle: 'Schedule a CREATE SOMETHING mapping session',
		fallbackHref: '/services',
		fallbackLabel: 'the workflow mapping service'
	} as const;

	const compilerIntegrationBookingOffer = {
		seoTitle: 'Book a Workflow Compiler Integration Fit Call | CREATE SOMETHING',
		seoDescription:
			'Choose a verified 30- or 60-minute opening to assess one fixed-scope Workflow Compiler Integration.',
		eyebrow: 'Workflow Compiler Integration fit call',
		title: 'Choose a time to discuss the integration.',
		description:
			'Bring one code repository, the workflow you want to connect, and the tools it needs. We’ll assess the work and whether it fits a defined project.',
		secondaryHref: '/workflow-compiler-integration',
		secondaryLabel: 'Review the integration offer',
		iframeTitle: 'Schedule a Workflow Compiler Integration fit call',
		fallbackHref: '/workflow-compiler-integration',
		fallbackLabel: 'the fixed-scope integration offer'
	} as const;

	const agentFoundationBookingOffer = {
		seoTitle: 'Book an Agent Foundation Fit Call | CREATE SOMETHING',
		seoDescription:
			'Choose a 30- or 60-minute time to discuss an AI project for your business.',
		eyebrow: 'Agent Foundation fit call',
		title: 'Choose a time to talk about your project.',
		description:
			'Bring an idea or a project, the team it should help, and an example of the work. We’ll discuss whether we can help and agree on the first useful task.',
		secondaryHref: '/agent-foundation',
		secondaryLabel: 'Review the Agent Foundation offer',
		iframeTitle: 'Schedule an Agent Foundation fit call',
		fallbackHref: '/agent-foundation',
		fallbackLabel: 'the Agent Foundation offer'
	} as const;
	const technicalReviewBookingOffer = {
		seoTitle: 'Discuss Your Existing Project | CREATE SOMETHING',
		seoDescription: 'Talk through a technical review before your customer pilot. Agree on scope and price before work starts.',
		eyebrow: 'Technical review fit call',
		title: 'Talk through the project you have built.',
		description: 'Bring a demo, the problem you need help with, and any customer requirement or deadline. We will discuss fit and the scope of a paid review. Do not include credentials or private customer records in booking notes.',
		secondaryHref: '/technical-review',
		secondaryLabel: 'Review the technical review service',
		iframeTitle: 'Schedule a technical review fit call',
		fallbackHref: '/technical-review',
		fallbackLabel: 'the technical review service'
	} as const;
	const supportBookingOffer = {
		seoTitle: 'Discuss a Software Support Problem | CREATE SOMETHING',
		seoDescription: 'Choose a time to discuss remote software or workflow support. Agree on fit, scope and price before work begins.',
		eyebrow: 'Remote software support discussion',
		title: 'Choose a time to discuss the failure.',
		description: 'Bring the tools involved, the last working state and the person who can approve a change. We will discuss fit and scope. Keep credentials and private customer records out of booking notes.',
		secondaryHref: '/dfw-tech-support',
		secondaryLabel: 'Review remote software support',
		iframeTitle: 'Schedule a remote software support discussion',
		fallbackHref: '/dfw-tech-support',
		fallbackLabel: 'the remote software support service'
	} as const;
	type BookingOffer =
		| typeof mappingBookingOffer
		| typeof compilerIntegrationBookingOffer
		| typeof agentFoundationBookingOffer
		| typeof technicalReviewBookingOffer
		| typeof supportBookingOffer;

	let schedulerHref = data.schedulerHref;
	let schedulerFrame: HTMLIFrameElement;
	let schedulerSection: HTMLElement;
	let handoffContext = data.handoffContext;
	let handoffSheet: SchedulerHandoffSheet = data.handoffSheet;
	let schedulerAccess: SchedulerAccess | null = null;
	let warmupNotes: string | undefined;
	let intent: string | null = null;
	let bookingOffer: BookingOffer = mappingBookingOffer;

	$: intent = schedulerHandoffContext($page.url.search).intent ?? null;
	$: bookingOffer =
		intent === 'system-support'
			? supportBookingOffer
			: intent === 'technical-review'
			? technicalReviewBookingOffer
			: intent === 'agent-foundation'
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

	function chooseMeetingTime(event: MouseEvent) {
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		if (!schedulerSection) return;
		event.preventDefault();
		replaceState('#first-party-scheduler', $page.state);
		schedulerSection.focus({ preventScroll: true });
		schedulerSection.scrollIntoView({
			block: 'start',
			behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
		});
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

		const lifecycleMetadata = {
			...lifecycle.metadata,
			...(handoffContext.intent ? { intent: handoffContext.intent } : {})
		};

		if (lifecycle.action === 'booking_form_started') {
			getAnalytics()?.track('interaction', lifecycle.action, { metadata: lifecycleMetadata });
			return;
		}

		getAnalytics()?.conversion(lifecycle.action, lifecycleMetadata);
	}

	onMount(() => {
		const handleSchedulerLink = (event: MouseEvent) => {
			const link = event.target instanceof Element ? event.target.closest('a') : null;
			if (link?.getAttribute('href') === '#first-party-scheduler') chooseMeetingTime(event);
		};
		document.addEventListener('click', handleSchedulerLink, true);
		window.addEventListener('message', receiveSchedulerMessage);
		schedulerAccess = normalizeSchedulerAccessUrl(window.location.href);
		if (schedulerAccess) {
			window.history.replaceState(window.history.state, '', schedulerAccess.cleanPath);
		}
		try {
			warmupNotes = window.localStorage.getItem(PUBLIC_ATLAS_STORAGE_KEYS.warmupSummary) ?? undefined;
		} catch {
			// Booking remains available when browser storage is disabled.
			warmupNotes = undefined;
		}
		void tick().then(() => {
			sendSchedulerContext();
			getAnalytics()?.track('interaction', 'booking_handoff_received', {
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
		return () => {
			document.removeEventListener('click', handleSchedulerLink, true);
			window.removeEventListener('message', receiveSchedulerMessage);
		};
	});
</script>

<SEO
	title={bookingOffer.seoTitle}
	description={bookingOffer.seoDescription}
	propertyName="agency"
/>

<div class="booking-page" data-performance-surface="booking">
	{#if intent === 'agent-foundation' || intent === 'technical-review'}
		<section
			class="agent-booking"
			data-agent-foundation-booking
			aria-labelledby="agent-booking-title"
		>
			<div class="agent-booking__intro">
				<p>{bookingOffer.eyebrow}</p>
				<h1 id="agent-booking-title">{bookingOffer.title}</h1>
				<p>{bookingOffer.description}</p>
				<div class="agent-booking__outcome">
					<span>What you leave with</span>
					<p>A fit decision and, if it fits, a proposed scope and the basis for a quote.</p>
				</div>
				<Button href="#first-party-scheduler" onclick={chooseMeetingTime}>Choose a time</Button>
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
					bind:this={schedulerSection}
					tabindex="-1"
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
<section class="booking-entry" aria-labelledby="booking-entry-title">
	<div class="booking-entry__copy">
		<p class="booking-entry__eyebrow">{bookingOffer.eyebrow}</p>
		<h1 id="booking-entry-title">{bookingOffer.title}</h1>
		<p class="booking-entry__description">{bookingOffer.description}</p>
		<div class="booking-entry__action">
			<Button href="#first-party-scheduler" onclick={chooseMeetingTime}>Choose a time</Button>
			<p>Choose a 30- or 60-minute opening.<br />Review the details before confirming your booking.</p>
		</div>
	</div>
</section>
<div class="booking-content">

				<section
					id="first-party-scheduler"
					bind:this={schedulerSection}
					tabindex="-1"
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
</div>
	{/if}
</div>

<style>
	.booking-entry {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
		align-items: center;
		gap: clamp(2rem, 5vw, 5rem);
		max-width: 85rem;
		margin-inline: auto;
		padding: clamp(3rem, 6vw, 5.5rem) clamp(1.25rem, 5vw, 5rem) clamp(2.5rem, 5vw, 4rem);
		color: var(--color-performance-ink);
	}

	.booking-entry__copy { min-width: 0; }
	.booking-entry__eyebrow {
		margin: 0 0 1.25rem;
		font-family: var(--font-performance-mono, monospace);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-performance-muted);
	}
	.booking-entry h1 {
		max-width: 18ch;
		margin: 0;
		font-family: var(--font-performance-interface);
		font-size: clamp(2.25rem, 4vw, 3.75rem);
		font-weight: var(--font-performance-medium, 500);
		line-height: 1.06;
		letter-spacing: -0.045em;
		text-wrap: balance;
	}
	.booking-entry__description {
		max-width: 49ch;
		margin: 1.5rem 0 0;
		font-size: clamp(1rem, 1.3vw, 1.125rem);
		line-height: 1.65;
		color: var(--color-performance-muted);
	}
	.booking-entry__action {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem 1.5rem;
		margin-top: 2rem;
	}
	.booking-entry__action p {
		margin: 0;
		font-size: 0.8125rem;
		line-height: 1.55;
		color: var(--color-performance-muted);
	}
	/* Keep the shared illustration subordinate to this live booking workspace. */
	:global(body.design-preview[data-preview-route='/book'] .booking-entry > .agency-preview-media) {
		grid-column: 2;
		grid-row: 1;
		margin: 0;
		align-self: center;
	}
	:global(body.design-preview[data-preview-route='/book'] .booking-entry > .agency-preview-media img) {
		height: auto !important;
		max-height: 24rem;
		object-fit: contain !important;
	}
	.booking-content {
		display: grid;
		align-items: start;
		gap: var(--space-performance-md);
		width: min(100%, 85rem);
		margin-inline: auto;
		padding: 0 clamp(1.25rem, 5vw, 5rem) var(--space-performance-xl);
	}
	@media (max-width: 800px) {
		.booking-entry { grid-template-columns: minmax(0, 1fr); gap: 2rem; }
		.booking-entry h1 { max-width: 20ch; }
		:global(body.design-preview[data-preview-route='/book'] .booking-entry > .agency-preview-media) {
			grid-column: 1;
			grid-row: auto;
			max-width: 28rem;
			justify-self: center;
		}
		:global(body.design-preview[data-preview-route='/book'] .booking-entry > .agency-preview-media img) {
			max-height: 13rem;
		}
	}


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
		padding: var(--space-performance-lg) 7vw;
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
		font-size: clamp(1.8rem, 3vw, 2.75rem);
		font-weight: 400;
		letter-spacing: -0.06em;
		line-height: 1.15;
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
		padding: 0;
		margin: 0;
		min-width: 0;
		width: 100%;
		scroll-margin-top: 7rem;
		border-radius: var(--radius-performance-sm);
	}

	.scheduler-shell:focus {
		outline: 2px solid var(--color-performance-focus, #a7b8ff);
		outline-offset: 6px;
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

		iframe {
			min-height: 940px;
		}
	}
</style>
