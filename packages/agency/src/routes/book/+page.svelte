<script lang="ts">
	import { browser } from '$app/environment';
	import { tick } from 'svelte';
	import {
		Button,
		PerformanceCampaignOpening,
		PerformanceCardGrid,
		PerformanceContrastChapter,
		PerformancePageSection,
		PerformanceThesisConditions,
		SEO,
		type PerformanceCardItem,
		type PerformanceCondition
	} from '@create-something/canon';
	import { getAnalytics } from '@create-something/canon/analytics';
	import { DatePicker } from '@create-something/canon/domains/agency';
	import { TimeSlotPicker } from '@create-something/canon/domains/agency';
	import { BookingForm } from '@create-something/canon/domains/agency';
	import { BookingConfirmation } from '@create-something/canon/domains/agency';
	import {
		AGENCY_MARKETING_COPY_EXPERIMENT,
		getAgencyMarketingExperimentMetadata
	} from '$lib/analytics/marketing-experiment';
	import { PUBLIC_ATLAS_STORAGE_KEYS } from '$lib/atlas/intake-policy';
	import { agencyCoreMessaging } from '$lib/data/marketingCopy';

	interface TimeSlot {
		start_at: string;
		end_at: string;
		duration_minutes: number;
	}

	interface BookingEvent {
		id: string;
		start_at: string;
		end_at: string;
		name: string;
		timezone: string;
	}

	type BookingStep = 'date' | 'time' | 'details' | 'confirm';
	type ServiceLane =
		| 'workflow_infrastructure'
		| 'reliability_and_control'
		| 'enterprise_extension'
		| 'system_development_referral'
		| 'not_sure';

	const laneOptions: Array<{ value: ServiceLane; label: string; description: string }> = [
		{
			value: 'workflow_infrastructure',
			label: 'Workflow Map / Pilot',
			description:
				'Start with the fixed-scope map; pilot only when the first controlled path is clear.'
		},
		{
			value: 'reliability_and_control',
			label: 'Support Recovery / Ongoing Control',
			description:
				'Support, customer-trust, revenue, or account workflows that need approval rules and audit trails.'
		},
		{
			value: 'enterprise_extension',
			label: 'Enterprise Extension',
			description: 'Cross-system orchestration with stricter controls, auditability, and recovery.'
		},
		{
			value: 'system_development_referral',
			label: 'System Development Referral',
			description: 'Full system build, admin coverage, or onboarding needs routed to a trusted referral path.'
		},
		{
			value: 'not_sure',
			label: 'Not sure yet',
			description: 'Use the session to choose the right lane without overbuying the stack.'
		}
	];

	const bookingExperimentMetadata = getAgencyMarketingExperimentMetadata('/book') ?? {};
	const bookingUrlParams = browser ? new URLSearchParams(window.location.search) : new URLSearchParams();

	function normalizeQueryToken(value: string | null, fallback: string) {
		const normalized = (value ?? fallback)
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 64);

		return normalized || fallback;
	}

	function normalizeOptionalQueryToken(value: string | null) {
		const normalized = (value ?? '')
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 90);

		return normalized || undefined;
	}

	function normalizeOptionalNumber(value: string | null, max: number) {
		const parsed = Number(value);
		if (!Number.isFinite(parsed)) return undefined;
		return Math.max(0, Math.min(max, Math.round(parsed)));
	}

	function normalizeLane(value: string | null): ServiceLane | null {
		if (!value) return null;
		return laneOptions.some((option) => option.value === value) ? (value as ServiceLane) : null;
	}

	const bookingSource = normalizeQueryToken(bookingUrlParams.get('source'), 'direct');
	const bookingIntent = normalizeQueryToken(bookingUrlParams.get('intent'), 'workflow-mapping');
	const bookingPath = browser ? `${window.location.pathname}${window.location.search}` : '/book';
	const initialLane = normalizeLane(bookingUrlParams.get('lane')) ?? 'not_sure';
	const atlasWarmup = normalizeOptionalQueryToken(bookingUrlParams.get('warmup'));
	const atlasSessionId = normalizeOptionalQueryToken(bookingUrlParams.get('atlas_session_id'));
	const atlasReadiness = normalizeOptionalQueryToken(bookingUrlParams.get('readiness'));
	const atlasScore = normalizeOptionalNumber(bookingUrlParams.get('score'), 100);
	const atlasAgentMessages = normalizeOptionalNumber(bookingUrlParams.get('agent_messages'), 200);
	const directBookingHref = 'https://savvycal.com/createsomething/together';
	const warmupStorageKey = PUBLIC_ATLAS_STORAGE_KEYS.warmupSummary;
	const warmupDraftStorageKey = PUBLIC_ATLAS_STORAGE_KEYS.warmupDraft;

	const mappingSessionOutcomes: PerformanceCardItem[] = [
		{
			eyebrow: 'Handoff',
			icon: 'folder',
			title: 'Workflow Map',
			detail: 'Objects, owners, source systems, handoffs, and failure points.'
		},
		{
			eyebrow: 'Boundary',
			icon: 'user',
			title: 'Ownership boundary',
			detail: 'What can run, who owns it, and where vendor responsibility stops.'
		},
		{
			eyebrow: 'Rules',
			icon: 'check',
			title: 'Decision rules',
			detail: 'Auto-allowed, approval-needed, and blocked paths with reasons.'
		},
		{
			eyebrow: 'Path',
			icon: 'arrow-right',
			title: 'First controlled path',
			detail: 'The smallest workflow path that adds capacity without hiding risk.'
		}
	];

	const mappingSessionPrep: PerformanceCardItem[] = [
		{
			eyebrow: 'Workflow',
			icon: 'folder',
			title: 'One real workflow',
			detail: 'One real workflow your team wants out of manual coordination.'
		},
		{
			eyebrow: 'Systems',
			icon: 'settings',
			title: 'Accounts and tools',
			detail: 'The accounts, tools, or systems involved in the handoff.'
		},
		{
			eyebrow: 'Approver',
			icon: 'user',
			title: 'Decision owner',
			detail: 'The person who can approve risk, scope, or access.'
		},
		{
			eyebrow: 'No secrets',
			icon: 'warning',
			title: 'No credentials in notes',
			detail: 'No secrets, tokens, passwords, or API keys in booking notes.'
		}
	];

	const sessionFitSignals: PerformanceCardItem[] = [
		{
			eyebrow: 'Book this when',
			icon: 'success',
			title: 'The workflow has visible drag',
			detail:
				'Use the session when one workflow is concrete enough to map and important enough to control.',
			points: [
				'One workflow is creating visible drag, rework, or missed handoffs.',
				'Your team needs a clear owner, approval boundary, and next build path.',
				'You want an audit trail the team can inspect after the call.'
			]
		},
		{
			eyebrow: 'Use a different path when',
			icon: 'warning',
			title: 'The need is not a controlled workflow',
			detail:
				'Generic automation brainstorming, vendor demos, or open-ended admin coverage are different lanes.',
			points: [
				'You only need a vendor demo or a generic automation brainstorm.',
				'No workflow owner can join or make the next operating decision.',
				'You need ongoing admin coverage rather than a scoped workflow build.'
			]
		}
	];

	const bookingProtocol: PerformanceCondition[] = [
		{
			label: 'Context',
			title: 'One real workflow',
			detail: 'Bring the handoff with visible drag, not a generic automation brief.',
			tone: 'signal'
		},
		{
			label: 'Authority',
			title: 'Decision owner',
			detail: 'The person who can approve scope, access, or risk joins the path.',
			tone: 'pressure'
		},
		{
			label: 'Proof boundary',
			title: 'No secrets',
			detail: 'Booking carries context and map evidence, never credentials.',
			tone: 'growth'
		}
	];

	// State
	let step = $state<BookingStep>('date');
	let selectedDate = $state<Date | null>(null);
	let selectedSlot = $state<TimeSlot | null>(null);
	let selectedLane = $state<ServiceLane>(initialLane);
	let slots = $state<TimeSlot[]>([]);
	let confirmedEvent = $state<BookingEvent | null>(null);

	// Loading states
	let loadingSlots = $state(false);
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let activeStepElement = $state<HTMLElement | null>(null);
	let activeStepTitleElement = $state<HTMLHeadingElement | null>(null);
	let warmupSummary = $state('');
	let warmupLoaded = $state(false);

	// User's timezone
	const timezone = browser ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'America/Los_Angeles';

	// Available dates (populated when slots are fetched)
	let availableDates = $state<Set<string>>(new Set());

	// Progress indicator
	const steps = [
		{ key: 'date', label: 'Date' },
		{ key: 'time', label: 'Time' },
		{ key: 'details', label: 'Details' },
		{ key: 'confirm', label: 'Confirm' }
	] as const;

	const currentStepIndex = $derived(steps.findIndex((s) => s.key === step));
	const directBookingIsPrimary = $derived(
		step === 'date' && !loadingSlots && (availableDates.size === 0 || Boolean(error))
	);

	// Fetch slots for a date range
	async function fetchSlotsForMonth(date: Date) {
		loadingSlots = true;
		error = null;

		const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
		const endDate = new Date(date.getFullYear(), date.getMonth() + 2, 0); // Next month end

		try {
			const params = new URLSearchParams({
				start_date: startDate.toISOString().split('T')[0],
				end_date: endDate.toISOString().split('T')[0],
				timezone
			});

			const response = await fetch(`/api/booking/slots?${params}`);

			if (!response.ok) {
				throw new Error('Failed to fetch available times');
			}

			const data = (await response.json()) as { slots: TimeSlot[] };
			slots = data.slots;

			// Build set of available dates
			const dates = new Set<string>();
			for (const slot of data.slots) {
				const dateKey = slot.start_at.split('T')[0];
				dates.add(dateKey);
			}
			availableDates = dates;
		} catch (err) {
			console.error('Error fetching slots:', err);
			error = 'Unable to load available times. Please try again.';
		} finally {
			loadingSlots = false;
		}
	}

	// Get slots for selected date
	const slotsForSelectedDate = $derived.by(() => {
		if (!selectedDate) return [];

		const dateKey = selectedDate.toISOString().split('T')[0];
		return slots.filter((slot) => slot.start_at.startsWith(dateKey));
	});

	async function moveActiveStepIntoView() {
		if (!browser) return;

		await tick();

		activeStepElement?.scrollIntoView({
			block: 'start',
			behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
		});

		if (activeStepTitleElement) {
			activeStepTitleElement.focus({ preventScroll: true });
		}
	}

	// Handle date selection
	function handleDateSelect(date: Date) {
		selectedDate = date;
		selectedSlot = null;
		step = 'time';
		void moveActiveStepIntoView();
	}

	// Handle slot selection
	function handleSlotSelect(slot: TimeSlot) {
		selectedSlot = slot;
		step = 'details';
		void moveActiveStepIntoView();
	}

	function mergeLaneIntoNotes(notes: string): string {
		const lane = laneOptions.find((option) => option.value === selectedLane);
		const laneLine = `Intake lane: ${lane?.label ?? 'Not sure yet'}`;
		const sourceLine = `Booking source: ${bookingSource} / ${bookingIntent}`;
		const atlasLines = [
			atlasSessionId ? `Atlas session: ${atlasSessionId}` : '',
			atlasReadiness
				? `Atlas readiness: ${atlasReadiness}${atlasScore !== undefined ? ` (${atlasScore}/100)` : ''}`
				: '',
			atlasAgentMessages !== undefined ? `Atlas agent messages: ${atlasAgentMessages}` : ''
		].filter(Boolean);
		const atlasLine = atlasLines.length ? `Atlas canvas:\n${atlasLines.join('\n')}` : '';
		const warmupLine = warmupSummary.trim()
			? `Workflow warmup:\n${warmupSummary.trim()}`
			: '';
		const trimmedNotes = notes.trim();
		const baseNotes = [laneLine, sourceLine, atlasLine, warmupLine].filter(Boolean).join('\n');
		return trimmedNotes ? `${baseNotes}\n${trimmedNotes}` : baseNotes;
	}

	function clearWarmup() {
		warmupSummary = '';
		if (browser) {
			window.localStorage.removeItem(warmupStorageKey);
			window.localStorage.removeItem(warmupDraftStorageKey);
			window.localStorage.removeItem(PUBLIC_ATLAS_STORAGE_KEYS.canvas);
			window.localStorage.removeItem(PUBLIC_ATLAS_STORAGE_KEYS.meta);
		}
	}

	// Handle form submission
	async function handleFormSubmit(data: {
		name: string;
		email: string;
		company: string;
		notes: string;
	}) {
		if (!selectedSlot) return;

		submitting = true;
		error = null;

		try {
			getAnalytics()?.conversion('booking_initiated', {
				...bookingExperimentMetadata,
				serviceLane: selectedLane,
				bookingSource,
				bookingIntent,
				source: bookingSource,
				intent: bookingIntent,
				lane: selectedLane,
				surface: 'booking_form',
				landingUrl: browser ? window.location.href : bookingPath
			});

			// Track booking initiated
			fetch('/api/analytics/track', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					event_type: 'booking_initiated',
					property: 'agency',
					path: bookingPath,
					experiment_id: AGENCY_MARKETING_COPY_EXPERIMENT.id,
					tag_id: AGENCY_MARKETING_COPY_EXPERIMENT.variant,
					referrer: browser ? document.referrer : undefined
				})
			}).catch(() => {});

			const response = await fetch('/api/booking/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					start_at: selectedSlot.start_at,
					end_at: selectedSlot.end_at,
					name: data.name,
					email: data.email,
					timezone,
					company: data.company || undefined,
					notes: mergeLaneIntoNotes(data.notes),
					experiment_id: AGENCY_MARKETING_COPY_EXPERIMENT.id,
					tag_id: AGENCY_MARKETING_COPY_EXPERIMENT.variant,
					session_id: getAnalytics()?.getSessionId(),
					source_property: getAnalytics()?.getSourceProperty() ?? undefined,
					source: bookingSource,
					intent: bookingIntent,
					lane: selectedLane,
					atlas_warmup: atlasWarmup,
					atlas_session_id: atlasSessionId,
					atlas_readiness: atlasReadiness,
					atlas_score: atlasScore,
					atlas_agent_messages: atlasAgentMessages,
					landing_url: browser ? window.location.href : undefined,
					referrer: browser ? document.referrer : undefined
				})
			});

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({}))) as { message?: string };
				throw new Error(errorData.message || 'Failed to create booking');
			}

			const result = (await response.json()) as { event: BookingEvent };
			confirmedEvent = result.event;
			clearWarmup();
			getAnalytics()?.conversion('booking_completed', {
				...bookingExperimentMetadata,
				serviceLane: selectedLane,
				bookingSource,
				bookingIntent,
				source: bookingSource,
				intent: bookingIntent,
				lane: selectedLane,
				surface: 'booking_form',
				landingUrl: browser ? window.location.href : bookingPath
			});
			step = 'confirm';
			void moveActiveStepIntoView();
		} catch (err) {
			console.error('Booking error:', err);
			error = err instanceof Error ? err.message : 'Failed to create booking. Please try again.';
		} finally {
			submitting = false;
		}
	}

	// Handle back navigation
	function handleBack() {
		if (step === 'time') {
			step = 'date';
		} else if (step === 'details') {
			step = 'time';
		}
		void moveActiveStepIntoView();
	}

	// Initialize: fetch slots for current month
	$effect(() => {
		if (browser) {
			fetchSlotsForMonth(new Date());
		}
	});

	$effect(() => {
		if (!browser || warmupLoaded) return;
		warmupLoaded = true;
		warmupSummary = window.localStorage.getItem(warmupStorageKey) ?? '';
	});
</script>

<SEO
	title="Book a CREATE SOMETHING Mapping Session"
	description="Schedule a scoped workflow mapping session to clarify the handoff, ownership boundary, decision rules, audit trail, and first controlled build path."
	propertyName="agency"
/>

<main class="booking-page">
	<PerformanceCampaignOpening
		eyebrow="Workflow mapping session"
		title="Map the workflow before the build decision."
		lede="Bring the support recovery, customer-trust, revenue, production, or credential-touching handoff with the most drag. You leave with the objects named, actions scoped, decision states, audit trail, and first controlled path or a clear stop."
		media={{ src: '/images/performance-lab/pressure-boundary-natural.webp', mobileSrc: '/images/performance-lab/pressure-boundary-natural-mobile.webp', alt: 'Black-and-white wave impact against a concrete boundary' }}
		proof={[{ label: 'Context', value: 'One workflow' }, { label: 'Authority', value: 'Decision owner' }, { label: 'Proof', value: 'No secrets' }]}
	>
		{#snippet actions()}
			<Button href="#booking-flow">Choose a time</Button>
			<Button href={agencyCoreMessaging.selfMapHref} variant="secondary">
				{agencyCoreMessaging.selfMapLabel}
			</Button>
			<Button href="/services" variant="secondary">Review the service path</Button>
		{/snippet}
	</PerformanceCampaignOpening>

	<PerformanceContrastChapter
		eyebrow="Session output"
		title="Leave with an operating boundary, not a brainstorm."
		description="The mapping session converts one real handoff into named ownership, decision rules, proof requirements, and a first controlled path."
		intervention={{ label: 'Fixed-scope handoff', title: 'Four inspectable outcomes', detail: 'The output stays useful even when the right decision is to stop before implementation.' }}
	>
		{#snippet artifact()}
			<PerformanceCardGrid
				items={mappingSessionOutcomes}
				columns={1}
				density="compact"
				ariaLabel="Mapping session outcomes"
			/>
		{/snippet}
	</PerformanceContrastChapter>

	<PerformanceThesisConditions
		eyebrow="Delegation boundary"
		title="Carry context into the session. Keep authority outside it."
		description="The booking path preserves the workflow map, owner, and next decision while credentials and production access remain out of scope."
		conditions={bookingProtocol}
		ariaLabel="Booking delegation boundary"
	/>

	<PerformancePageSection
		variant="white"
		eyebrow="Bring enough context"
		title="Bring context, not secrets."
		description="The session works best when we can see the real handoff and decide what your team keeps. Credentials move through Infisical or the approved runtime path only after the map shows a controlled build path."
	>
		{#snippet after()}
			<PerformanceCardGrid
				items={mappingSessionPrep}
				columns={4}
				ariaLabel="What to bring to the mapping session"
			/>
		{/snippet}
	</PerformancePageSection>

	<PerformancePageSection
		variant="soft"
		eyebrow="Fit check"
		title="Book when the workflow is ready to become an operating path."
		description="The mapping session is for a real handoff with an owner, risk, and next decision. It is the fixed-scope first step before any workflow pilot."
	>
		{#snippet after()}
			<PerformanceCardGrid items={sessionFitSignals} columns={2} ariaLabel="Mapping session fit" />
		{/snippet}
	</PerformancePageSection>

	<section id="booking-flow" class="booking-flow" aria-label="Booking flow">
		<header class="booking-flow__header">
			<span>Choose a time</span>
			<h2>Start with the first available mapping session.</h2>
		</header>

		{#if step !== 'confirm'}
			<nav class="progress" aria-label="Booking progress">
				{#each steps.slice(0, 3) as s, i}
					<div
						class="progress-step"
						class:active={i === currentStepIndex}
						class:complete={i < currentStepIndex}
						aria-current={i === currentStepIndex ? 'step' : undefined}
					>
						<span class="step-number">{i + 1}</span>
						<span class="step-label">{s.label}</span>
					</div>
					{#if i < 2}
						<div class="progress-line" class:complete={i < currentStepIndex}></div>
					{/if}
				{/each}
			</nav>
		{/if}

		<div class={`booking-backup ${directBookingIsPrimary ? 'booking-backup--primary' : ''}`}>
			<div>
				<span>{directBookingIsPrimary ? 'Direct path' : 'Backup path'}</span>
				<strong>
					{directBookingIsPrimary
						? 'If the embedded calendar has no visible times, use the direct booking page.'
						: 'Prefer SavvyCal or need more times? Open the direct booking page.'}
				</strong>
				<p>
					The direct page uses the same mapping session. Bring one workflow, the owner, and the
					decision your team needs to make next.
				</p>
			</div>
			<a href={directBookingHref} target="_blank" rel="noopener noreferrer">Open SavvyCal</a>
		</div>

		{#if warmupSummary}
			<section class="warmup-carryover" aria-label="Workflow warmup carried into booking">
				<div>
					<span>Warmup attached</span>
					<h3>Your first map will travel with the booking notes.</h3>
					<p>
						Review it here before choosing a time. Remove it if you want to start the session from a
						blank page.
					</p>
				</div>
				<pre>{warmupSummary}</pre>
				<button type="button" onclick={clearWarmup}>Remove warmup</button>
			</section>
		{/if}

		<div class="booking-content">
			{#if step === 'date'}
				<section class="step-content" bind:this={activeStepElement}>
					<h2 class="step-title" bind:this={activeStepTitleElement} tabindex="-1">Select a date</h2>
					<DatePicker
						{selectedDate}
						onDateSelect={handleDateSelect}
						{availableDates}
						loading={loadingSlots}
					/>
					{#if error}
						<p class="error-message">{error}</p>
					{/if}
				</section>
			{:else if step === 'time'}
				<section class="step-content" bind:this={activeStepElement}>
					<h2 class="step-title" bind:this={activeStepTitleElement} tabindex="-1">Select a time</h2>
					<TimeSlotPicker
						slots={slotsForSelectedDate}
						{selectedSlot}
						onSlotSelect={handleSlotSelect}
						loading={loadingSlots}
						{timezone}
					/>
					<button type="button" class="back-link" onclick={handleBack}>
						Choose a different date
					</button>
				</section>
			{:else if step === 'details'}
				<section class="step-content" bind:this={activeStepElement}>
					<h2 class="step-title" bind:this={activeStepTitleElement} tabindex="-1">
						Your details and operator lane
					</h2>
					<div class="lane-intake" role="radiogroup" aria-labelledby="lane-intake-title">
						<p id="lane-intake-title" class="lane-intake-title">Which service path should we test first?</p>
						<p class="lane-intake-helper">
							This helps me prep the session around the real operating boundary: what can run,
							what needs approval, and what should stop with a reason.
						</p>
						<div class="lane-options">
							{#each laneOptions as lane}
								<label class="lane-option" class:selected={selectedLane === lane.value}>
									<input
										type="radio"
										name="service-lane"
										value={lane.value}
										bind:group={selectedLane}
									/>
									<span class="lane-option-text">
										<span class="lane-option-label">{lane.label}</span>
										<span class="lane-option-description">{lane.description}</span>
									</span>
								</label>
							{/each}
						</div>
					</div>
					{#if selectedSlot}
						<BookingForm
							{selectedSlot}
							{timezone}
							onSubmit={handleFormSubmit}
							onBack={handleBack}
							loading={submitting}
							{error}
						/>
					{/if}
				</section>
			{:else if step === 'confirm' && confirmedEvent}
				<section class="step-content" bind:this={activeStepElement}>
					<BookingConfirmation event={confirmedEvent} {timezone} />
				</section>
			{/if}
		</div>

		{#if step !== 'confirm'}
			<footer class="booking-footer">
				<p class="fallback-text">
					Having trouble? <a href={directBookingHref} target="_blank" rel="noopener noreferrer" class="fallback-link">Book directly on SavvyCal</a>
				</p>
			</footer>
		{/if}
	</section>
</main>

<style>
	.booking-page {
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-ink, #090909);
	}

	.booking-flow {
		--color-bg-surface: var(--color-performance-panel, #ffffff);
		--color-bg-muted: var(--color-performance-paper, #f3f3f0);
		--color-fg-primary: var(--color-performance-ink, #090909);
		--color-fg-secondary: #2f3542;
		--color-fg-tertiary: var(--color-performance-muted, #5e6268);
		--color-fg-muted: var(--color-performance-muted, #5e6268);
		--color-border-default: var(--color-performance-line, #d7d7d2);
		--color-border-emphasis: var(--color-performance-line-strong, #9c9c96);
		--color-hover: rgba(10, 14, 25, 0.045);
		--color-success: var(--color-performance-growth, #007a4d);
		width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
		margin-inline: auto;
		padding-block: 4rem;
		scroll-margin-top: 5.25rem;
	}

	.booking-flow__header {
		display: grid;
		justify-items: center;
		gap: 0.6rem;
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.booking-flow__header span {
		display: inline-flex;
		width: fit-content;
		min-height: 1.9rem;
		align-items: center;
		padding: 0.36rem 0.62rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-mono);
		font-size: 0.76rem;
		font-weight: var(--font-semibold);
		text-transform: uppercase;
	}

	.booking-flow__header h2 {
		margin: 0;
		max-width: 16ch;
		color: var(--color-performance-ink, #090909);
		font-size: 2.65rem;
		font-weight: var(--font-medium);
		line-height: 1.04;
		text-wrap: balance;
	}

	/* Progress indicator */
	.progress {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		margin-bottom: clamp(1.1rem, 2.5vw, 1.75rem);
	}

	.progress-step {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.step-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		background: var(--color-bg-surface);
		color: var(--color-fg-muted);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.progress-step.active .step-number {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-color: var(--color-fg-primary);
	}

	.progress-step.complete .step-number {
		background: var(--color-success);
		color: var(--color-bg-pure);
		border-color: var(--color-success);
	}

	.step-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		display: none;
	}

	@media (min-width: 480px) {
		.step-label {
			display: inline;
		}

		.progress-step.active .step-label {
			color: var(--color-fg-primary);
		}
	}

	@media (max-width: 520px) {
		.booking-flow {
			width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
			padding-block: 2.75rem;
		}

		.booking-flow__header h2 {
			font-size: 2.1rem;
		}

		.booking-backup {
			align-items: stretch;
			flex-direction: column;
		}

		.warmup-carryover {
			grid-template-columns: 1fr;
		}
	}

	.progress-line {
		width: 32px;
		height: 1px;
		background: var(--color-border-default);
	}

	.progress-line.complete {
		background: var(--color-success);
	}

	/* Content */
	.booking-backup {
		display: flex;
		gap: 1rem;
		align-items: center;
		justify-content: space-between;
		margin-bottom: clamp(1rem, 2vw, 1.4rem);
		padding: 1rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-paper, #f3f3f0);
	}

	.booking-backup--primary {
		border-color: var(--color-performance-line-strong, #9c9c96);
		background: color-mix(in srgb, var(--color-performance-signal-soft, #dce8f5) 34%, white);
	}

	.booking-backup div {
		display: grid;
		gap: 0.35rem;
		min-width: 0;
	}

	.booking-backup span {
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-mono);
		font-size: 0.74rem;
		font-weight: var(--font-semibold);
		text-transform: uppercase;
	}

	.booking-backup strong {
		color: var(--color-performance-ink, #090909);
		font-size: 1rem;
		font-weight: var(--font-medium);
		line-height: 1.22;
	}

	.booking-backup p {
		margin: 0;
		max-width: 48rem;
		color: var(--color-performance-muted, #5e6268);
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.booking-backup a {
		flex: 0 0 auto;
		display: inline-flex;
		min-height: 2.75rem;
		align-items: center;
		justify-content: center;
		padding-inline: 1rem;
		border: 1px solid var(--color-performance-ink, #090909);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-ink, #090909);
		color: #ffffff;
		font-size: 0.94rem;
		font-weight: var(--font-medium);
		text-decoration: none;
	}

	.booking-backup a:hover {
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-ink, #090909);
	}

	.warmup-carryover {
		display: grid;
		grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.25fr);
		gap: 1rem;
		align-items: start;
		margin-bottom: clamp(1rem, 2vw, 1.4rem);
		padding: 1rem;
		border: 1px solid color-mix(in srgb, var(--color-performance-signal-soft, #dce8f5) 56%, var(--color-performance-line, #d7d7d2));
		border-radius: 8px;
		background: color-mix(in srgb, var(--color-performance-signal-soft, #dce8f5) 10%, #ffffff);
		box-shadow: 0 16px 44px rgba(10, 14, 25, 0.05);
	}

	.warmup-carryover span {
		display: inline-flex;
		margin-bottom: 0.4rem;
		color: var(--color-performance-muted, #5e6268);
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.warmup-carryover h3 {
		margin: 0;
		color: var(--color-performance-ink, #090909);
		font-size: 1.05rem;
		letter-spacing: 0;
		line-height: 1.25;
	}

	.warmup-carryover p {
		margin: 0.45rem 0 0;
		color: var(--color-performance-muted, #5e6268);
		font-size: 0.92rem;
		line-height: 1.5;
	}

	.warmup-carryover pre {
		max-height: 13rem;
		overflow: auto;
		margin: 0;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: 6px;
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
		font: 0.78rem/1.55 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		padding: 0.85rem;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.warmup-carryover button {
		grid-column: 1 / -1;
		justify-self: start;
		min-height: 2.45rem;
		border: 1px solid var(--color-performance-line-strong, #9c9c96);
		border-radius: 6px;
		background: #ffffff;
		color: var(--color-performance-ink, #090909);
		cursor: pointer;
		font: inherit;
		font-weight: 700;
		padding: 0.55rem 0.8rem;
	}

	.booking-content {
		margin-bottom: clamp(1.4rem, 3vw, 2.1rem);
	}

	.step-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		padding: 1.25rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-panel, #ffffff);
		scroll-margin-top: 5.75rem;
	}

	.step-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.step-title:focus {
		outline: none;
	}

	.back-link {
		align-self: flex-start;
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	.error-message {
		font-size: var(--text-body-sm);
		color: var(--color-error);
		padding: var(--space-sm);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
	}

	.lane-intake {
		padding: var(--space-md);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
	}

	.lane-intake-title {
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-2xs);
	}

	.lane-intake-helper {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-sm);
	}

	.lane-options {
		display: grid;
		gap: var(--space-xs);
	}

	.lane-option {
		display: flex;
		gap: var(--space-sm);
		align-items: flex-start;
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			background var(--duration-micro) var(--ease-standard);
	}

	.lane-option input {
		margin-top: 0.2rem;
	}

	.lane-option.selected {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-muted);
	}

	.lane-option-text {
		display: flex;
		flex-direction: column;
		gap: var(--space-2xs);
	}

	.lane-option-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.lane-option-description {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	/* Footer */
	.booking-footer {
		text-align: center;
		padding-top: var(--space-lg);
	}

	.fallback-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.fallback-link {
		color: var(--color-fg-tertiary);
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.fallback-link:hover {
		color: var(--color-fg-primary);
	}
</style>
