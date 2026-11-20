<script lang="ts">
  import AgencyHeroFrame from '$lib/components/AgencyHeroFrame.svelte';
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
		shortDescription: 'Bring one problem or improvement and the person responsible.',
		description:
			'Bring one problem or improvement and the person responsible. We discuss diagnosis, engineering work, and learning needs. If you already have a workflow map, review it before choosing a time.',
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
		shortDescription: 'Bring one repository and the workflow you want to connect.',
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
		shortDescription: 'Bring one useful AI task and the team it should help.',
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
		shortDescription: 'Discuss fit and scope for a paid technical review.',
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
		shortDescription: 'Discuss fit and scope for a software problem.',
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

<div class="booking-page" data-performance-surface="booking" data-agent-foundation-booking={intent === 'agent-foundation' || intent === 'technical-review' ? true : undefined}>
  <AgencyHeroFrame compact={true}>
    <section class="booking-entry" aria-labelledby={intent === 'agent-foundation' || intent === 'technical-review' ? 'agent-booking-title' : 'booking-entry-title'}>
      <p class="booking-entry__eyebrow">{bookingOffer.eyebrow}</p>
      <h1 id={intent === 'agent-foundation' || intent === 'technical-review' ? 'agent-booking-title' : 'booking-entry-title'}>{bookingOffer.title}</h1>
      <p class="booking-entry__description">{bookingOffer.shortDescription}</p>
      <div class="booking-entry__action">
        <Button href="#first-party-scheduler" onclick={chooseMeetingTime}>Choose a time</Button>
        <p>30 or 60 minutes.<br />Review the details before confirming.</p>
      </div>
      <details class="booking-preparation">
        <summary>Before the conversation <span aria-hidden="true">+</span></summary>
        <div>
          <p>{bookingOffer.description}</p>
          {#if intent === 'agent-foundation' || intent === 'technical-review'}
            <p class="agent-booking__outcome"><strong>What you leave with</strong><br />A fit decision and, if it fits, a proposed scope and the basis for a quote.</p>
          {/if}
          <a href={bookingOffer.secondaryHref}>{bookingOffer.secondaryLabel} ↗</a>
        </div>
      </details>
    </section>
  </AgencyHeroFrame>
  {#if handoffSheet.warmupNotes}
    <aside class="agent-booking__context" aria-label="Prepared conversation context">
      <span>Private draft attached</span>
      <p>{handoffSheet.warmupNotes}</p>
      <small>Do not include credentials, client secrets, or private records.</small>
    </aside>
  {/if}
  <div class="booking-content">
    <section id="first-party-scheduler" bind:this={schedulerSection} tabindex="-1" class="scheduler-shell" aria-labelledby="scheduler-heading">
      <header class="scheduler-shell__heading">
        <div><p>Find a time</p><h2 id="scheduler-heading">Choose a time.</h2></div>
        <a href={schedulerHref} target="_blank" rel="noopener noreferrer">Open full page <span aria-hidden="true">↗</span></a>
      </header>
      <iframe bind:this={schedulerFrame} src={schedulerHref} title={bookingOffer.iframeTitle} loading="eager" referrerpolicy="no-referrer" sandbox="allow-forms allow-popups allow-same-origin allow-scripts" onload={sendSchedulerContext}></iframe>
      <p class="scheduler-shell__fallback">If the embedded scheduler is unavailable, <a href={schedulerHref} target="_blank" rel="noopener noreferrer">open the first-party scheduler</a>. Review <a href={bookingOffer.fallbackHref}>{bookingOffer.fallbackLabel}</a> before choosing a time.</p>
      <p class="booking-privacy-note">Keep passwords, tokens and private customer records out of booking notes.</p>
    </section>
  </div>
</div>

<style>
  .booking-page { background:var(--color-performance-paper); color:var(--color-performance-ink); }
  .booking-entry { min-width:0; }
  .booking-entry__eyebrow,.scheduler-shell__heading p,.agent-booking__context>span { margin:0 0 18px; font:11px/1.5 var(--font-performance-mono); text-transform:uppercase; letter-spacing:.045em; color:var(--color-performance-muted); }
  .booking-entry h1 { max-width:22ch; margin:0; font:500 clamp(36px,4.2vw,64px)/1.04 var(--font-performance-interface); letter-spacing:-.055em; text-wrap:balance; }
  .booking-entry__description { max-width:46ch; margin:22px 0 0; font-size:clamp(17px,1.5vw,20px); line-height:1.6; color:var(--color-performance-muted); }
  .booking-entry__action { display:flex; align-items:center; gap:24px; flex-wrap:wrap; margin-top:28px; }
  .booking-entry__action p { margin:0; font-size:13px; line-height:1.6; color:var(--color-performance-muted); }
  .booking-preparation { max-width:55ch; margin-top:24px; border-block:1px solid var(--color-performance-line); }
  summary { display:flex; justify-content:space-between; align-items:center; min-height:48px; gap:16px; cursor:pointer; font-size:13px; }
  summary::marker { content:''; }
  details[open] summary>span { transform:rotate(45deg); }
  .booking-preparation>div { padding:0 0 20px; font-size:14px; line-height:1.65; color:var(--color-performance-muted); }
  .booking-preparation p { margin:0 0 16px; }
  .booking-preparation a { display:inline-flex; align-items:center; min-height:44px; text-decoration:underline; text-underline-offset:4px; color:var(--color-performance-ink); }
  .agent-booking__outcome strong { color:var(--color-performance-ink); }
  .agent-booking__context { width:min(88%,80rem); margin:0 auto 24px; padding:20px; border:1px solid var(--color-performance-line); }
  .agent-booking__context p { margin:12px 0; line-height:1.65; }
  .agent-booking__context small { color:var(--color-performance-muted); }
  .booking-content { width:min(88%,80rem); margin:0 auto; padding-bottom:48px; }
  .scheduler-shell { padding:0; min-width:0; width:100%; margin:0; scroll-margin-top:100px; }
  .scheduler-shell:focus { outline:2px solid var(--color-performance-focus); outline-offset:6px; }
  .scheduler-shell__heading { display:flex; justify-content:space-between; gap:24px; align-items:center; padding:24px; border:1px solid var(--color-performance-line); border-bottom:0; }
  .scheduler-shell__heading p { margin-bottom:8px; }
  .scheduler-shell__heading h2 { margin:0; font-size:clamp(24px,2.5vw,36px); line-height:1.15; letter-spacing:-.04em; }
  .scheduler-shell__heading>a { display:inline-flex; align-items:center; gap:16px; min-height:44px; padding:10px 14px; border:1px solid var(--color-performance-line); font:12px/1.5 var(--font-performance-mono); white-space:nowrap; }
  iframe { display:block; width:100%; box-sizing:border-box; min-height:860px; border:1px solid var(--color-performance-line); background:var(--color-performance-panel); }
  .scheduler-shell__fallback { margin:0; padding:16px 24px; border:1px solid var(--color-performance-line); border-top:0; font:12px/1.7 var(--font-performance-mono); color:var(--color-performance-muted); }
  .scheduler-shell__fallback a { color:var(--color-performance-ink); text-decoration:underline; text-underline-offset:3px; }
  .booking-privacy-note { margin:14px 0 0; color:var(--color-performance-muted); font-size:12px; line-height:1.6; }
  @media(max-width:700px){
    .booking-entry h1 { font-size:clamp(32px,8.6vw,48px); }
    .booking-entry__description { margin-top:18px; font-size:16px; }
    .booking-entry__action { margin-top:22px; gap:16px; }
    .booking-entry__action p { font-size:12px; }
    .booking-preparation { margin-top:20px; }
    .booking-content { width:100%; }
    .scheduler-shell__heading { padding:20px 6vw; gap:16px; align-items:start; flex-wrap:wrap; border-inline:0; }
    .scheduler-shell__heading h2 { font-size:26px; }
    .scheduler-shell__heading>a { padding-inline:10px; }
    iframe { border-inline:0; }
    .scheduler-shell__fallback { border-inline:0; padding-inline:6vw; }
    .booking-privacy-note { padding-inline:6vw; }
  }
</style>
