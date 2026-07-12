<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, PerformanceCampaignOpening, SEO } from '@create-something/canon';
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
	<PerformanceCampaignOpening
		eyebrow="Workflow mapping session"
		title="Map the workflow before the build decision."
		lede="Choose a verified opening through the owned CREATE SOMETHING scheduler. Bring one real handoff, its decision owner, and the proof your team needs next."
		media={{
			src: '/images/performance-lab/pressure-boundary-natural.webp',
			mobileSrc: '/images/performance-lab/pressure-boundary-natural-mobile.webp',
			alt: 'Black-and-white wave impact against a concrete boundary'
		}}
		proof={[
			{ label: 'Duration', value: '30 / 60 min' },
			{ label: 'Calendar', value: 'Conflict checked' },
			{ label: 'Conferencing', value: 'Included' }
		]}
	>
		{#snippet actions()}
			<Button href="#first-party-scheduler">Choose a time</Button>
			<Button href="/atlas" variant="secondary">Map the workflow first</Button>
		{/snippet}
	</PerformanceCampaignOpening>

	<section id="first-party-scheduler" class="scheduler-shell" aria-labelledby="scheduler-title">
		<header class="scheduler-shell__header">
			<span>CREATE SOMETHING / SCHEDULER</span>
			<h2 id="scheduler-title">Choose a verified opening.</h2>
			<p>
				Availability, conflict checks, booking state, and receipts come from the same API- and
				MCP-first scheduling service. Use this controlled path to bring one workflow handoff, its
				owner, and the audit trail needed for a scoped decision.
			</p>
		</header>

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
</main>

<style>
	.booking-page {
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
	}

	.scheduler-shell {
		width: min(var(--content-width-performance, 85rem), calc(100% - 2rem));
		margin-inline: auto;
		padding-block: clamp(2rem, 5vw, 5rem);
		scroll-margin-top: 5rem;
	}

	.scheduler-shell__header {
		display: grid;
		gap: 0.6rem;
		margin-bottom: 1rem;
		padding: 1rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-left: 5px solid var(--color-performance-signal, #0057b8);
		background: var(--color-performance-panel, #ffffff);
	}

	.scheduler-shell__header span {
		font-family: var(--font-performance-mono, var(--font-mono));
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	.scheduler-shell__header h2,
	.scheduler-shell__header p {
		margin: 0;
	}

	.scheduler-shell__header h2 {
		font-family: var(--font-performance-display, var(--font-sans));
		font-size: clamp(2rem, 5vw, 4rem);
		font-weight: var(--font-performance-display-weight, 500);
		letter-spacing: -0.03em;
		line-height: 0.96;
	}

	.scheduler-shell__header p {
		max-width: 62ch;
		color: var(--color-performance-muted, #5e6268);
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
		.scheduler-shell {
			width: min(100% - 1rem, var(--content-width-performance, 85rem));
		}

		iframe {
			min-height: 940px;
		}
	}
</style>
