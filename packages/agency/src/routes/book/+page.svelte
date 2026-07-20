<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, SEO } from '@create-something/canon';
	import { getAnalytics } from '@create-something/canon/analytics';
	import { PUBLIC_ATLAS_STORAGE_KEYS } from '$lib/atlas/intake-policy';
	import {
		buildFirstPartySchedulerUrl,
		FIRST_PARTY_SCHEDULER_ORIGIN,
		normalizeSchedulerAccessUrl,
		normalizeSchedulerHeightMessage,
		normalizeSchedulerLifecycleMessage,
		schedulerHandoffContext,
		type SchedulerAccess
	} from '$lib/scheduling/first-party';

	let schedulerHref = buildFirstPartySchedulerUrl();
	let schedulerFrame: HTMLIFrameElement;
	let handoffContext = schedulerHandoffContext();
	let schedulerAccess: SchedulerAccess | null = null;
	let schedulerHeight = 900;
	let javascriptReady = false;

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

	function receiveSchedulerLifecycle(event: MessageEvent) {
		if (event.origin !== FIRST_PARTY_SCHEDULER_ORIGIN) return;
		if (event.source !== schedulerFrame?.contentWindow) return;
		const height = normalizeSchedulerHeightMessage(event.data);
		if (height !== null) {
			schedulerHeight = height;
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
		window.addEventListener('message', receiveSchedulerLifecycle);
		schedulerAccess = normalizeSchedulerAccessUrl(window.location.href);
		if (schedulerAccess) {
			window.history.replaceState(window.history.state, '', schedulerAccess.cleanPath);
		}
		schedulerHref = buildFirstPartySchedulerUrl(window.location.search);
		const warmupNotes =
			window.localStorage.getItem(PUBLIC_ATLAS_STORAGE_KEYS.warmupSummary) ?? undefined;
		handoffContext = schedulerHandoffContext(window.location.search, warmupNotes);
		javascriptReady = true;
		return () => window.removeEventListener('message', receiveSchedulerLifecycle);
	});
</script>

<SEO
	title="Book a CREATE SOMETHING Mapping Session"
	description="Choose a verified 30- or 60-minute opening for a scoped workflow mapping session."
	propertyName="agency"
/>

<div class="booking-page" data-performance-surface="booking">
	<section class="booking-intro" aria-labelledby="booking-title">
		<div class="booking-intro__inner">
			<p class="booking-intro__eyebrow">Workflow mapping session</p>
			<h1 id="booking-title">Choose a time to map your workflow.</h1>
			<p class="booking-intro__lede">
				Pick 30 or 60 minutes with Micah. Bring one workflow that is slow, unclear, or hard to hand
				off.
			</p>
			<p class="booking-intro__outcome">
				After you confirm, we’ll create a Google Calendar event with a Google Meet link and send a
				booking receipt.
			</p>
			<div class="booking-intro__actions">
				<Button href="#first-party-scheduler">Choose a time</Button>
				<Button href="/map" variant="secondary">Map one workflow first</Button>
			</div>
		</div>
	</section>

	<section id="first-party-scheduler" class="scheduler-shell" aria-label="Choose an available time">
		{#if javascriptReady}
			<iframe
				bind:this={schedulerFrame}
				src={schedulerHref}
				title="Schedule a CREATE SOMETHING mapping session"
				loading="eager"
				referrerpolicy="no-referrer"
				sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
				style:height={`${schedulerHeight + 2}px`}
				onload={sendSchedulerContext}
			></iframe>

			<p class="scheduler-shell__fallback">
				If the calendar does not load,
				<a href={schedulerHref} target="_blank" rel="noopener noreferrer"
					>open the scheduler in a new tab</a
				>.
			</p>
		{:else}
			<noscript>
				<p class="scheduler-shell__no-script">
					Scheduling needs JavaScript to show live availability. If you cannot enable it,
					<a href="/contact">contact us to arrange a time</a>.
				</p>
			</noscript>
		{/if}
	</section>
</div>

<style>
	.booking-page {
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
	}

	.booking-intro {
		padding: clamp(3.5rem, 8vw, 7rem) clamp(1rem, 5vw, 4rem);
		background: var(--color-performance-ink, #090909);
		color: white;
	}

	.booking-intro__inner {
		width: min(100%, 56rem);
		margin: 0 auto;
	}

	.booking-intro__eyebrow {
		margin: 0 0 1.25rem;
		color: #8fc1f2;
		font-family: var(--font-performance-mono, monospace);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h1 {
		max-width: 14ch;
		margin: 0;
		font-size: clamp(3rem, 7vw, 6.5rem);
		font-weight: 500;
		letter-spacing: -0.04em;
		line-height: 0.96;
	}

	.booking-intro__lede,
	.booking-intro__outcome {
		max-width: 42rem;
		font-size: clamp(1.05rem, 2vw, 1.3rem);
		line-height: 1.55;
	}

	.booking-intro__lede {
		margin: 2rem 0 0;
		color: rgb(255 255 255 / 0.78);
	}

	.booking-intro__outcome {
		margin: 1rem 0 0;
		color: white;
	}

	.booking-intro__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 2rem;
	}

	.scheduler-shell {
		width: min(100%, 76rem);
		margin: 0 auto;
		padding: clamp(1rem, 4vw, 3rem);
		scroll-margin-top: 5rem;
	}

	iframe {
		display: block;
		width: 100%;
		min-height: 640px;
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

	.scheduler-shell__no-script {
		margin: 0;
		padding: 1.25rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		background: var(--color-performance-panel, #ffffff);
		font-size: 1rem;
	}

	.scheduler-shell__fallback a,
	.scheduler-shell__no-script a {
		color: var(--color-performance-ink, #090909);
		font-weight: 700;
	}
</style>
