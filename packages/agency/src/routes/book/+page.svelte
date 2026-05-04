<script lang="ts">
	import { browser } from '$app/environment';
	import { SEO } from '@create-something/canon';
	import { getAnalytics } from '@create-something/canon/analytics';
	import { DatePicker } from '@create-something/canon/domains/agency';
	import { TimeSlotPicker } from '@create-something/canon/domains/agency';
	import { BookingForm } from '@create-something/canon/domains/agency';
	import { BookingConfirmation } from '@create-something/canon/domains/agency';
	import {
		AGENCY_MARKETING_COPY_EXPERIMENT,
		getAgencyMarketingExperimentMetadata
	} from '$lib/analytics/marketing-experiment';

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

	const laneOptions: Array<{
		value: ServiceLane;
		label: string;
		description: string;
		priceHint: string;
		operatorFit: string;
	}> = [
		{
			value: 'workflow_infrastructure',
			label: 'Critical Workflow',
			description: 'One workflow that needs a safer, production-ready starting point.',
			priceHint: '$25K-$75K project after mapping',
			operatorFit: 'Best when implementation is bounded and handoff-ready.'
		},
		{
			value: 'reliability_and_control',
			label: 'Policy OS',
			description:
				'Policy artifacts, approval rules, release gates, and incident controls around live automation.',
			priceHint: '$12.5K-$30K/month',
			operatorFit: 'Requires one governed workflow, capped meetings, and explicit expansion triggers.'
		},
		{
			value: 'enterprise_extension',
			label: 'Enterprise Constraints',
			description: 'Cross-system orchestration with stricter governance, auditability, and recovery.',
			priceHint: '$30K+/month',
			operatorFit: 'Use for multiple workflows, custom UI, compliance burden, or high-touch cadence.'
		},
		{
			value: 'system_development_referral',
			label: 'System Development Referral',
			description: 'Full system build and onboarding needs (routed to partner team).',
			priceHint: 'Referral path',
			operatorFit: 'Use when ongoing admin coverage would break the owner-only model.'
		},
		{
			value: 'not_sure',
			label: 'Not sure yet',
			description: 'Need help choosing the right lane.',
			priceHint: 'Map fit first',
			operatorFit: 'We will decide whether the account fits the margin and operator-load model.'
		}
	];

	const bookingExperimentMetadata = getAgencyMarketingExperimentMetadata('/book') ?? {};

	// State
	let step = $state<BookingStep>('date');
	let selectedDate = $state<Date | null>(null);
	let selectedSlot = $state<TimeSlot | null>(null);
	let selectedLane = $state<ServiceLane>('not_sure');
	let slots = $state<TimeSlot[]>([]);
	let confirmedEvent = $state<BookingEvent | null>(null);

	// Loading states
	let loadingSlots = $state(false);
	let submitting = $state(false);
	let error = $state<string | null>(null);

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

	// Handle date selection
	function handleDateSelect(date: Date) {
		selectedDate = date;
		selectedSlot = null;
		step = 'time';
	}

	// Handle slot selection
	function handleSlotSelect(slot: TimeSlot) {
		selectedSlot = slot;
		step = 'details';
	}

	function mergeLaneIntoNotes(notes: string): string {
		const lane = laneOptions.find((option) => option.value === selectedLane);
		const laneLine = `Intake lane: ${lane?.label ?? 'Not sure yet'}`;
		const priceLine = lane?.priceHint ? `Commercial guardrail: ${lane.priceHint}` : null;
		const fitLine = lane?.operatorFit ? `Owner-compensation fit: ${lane.operatorFit}` : null;
		const trimmedNotes = notes.trim();
		const laneBlock = [laneLine, priceLine, fitLine].filter(Boolean).join('\n');
		return trimmedNotes ? `${laneBlock}\n${trimmedNotes}` : laneBlock;
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
				serviceLane: selectedLane
			});

			// Track booking initiated
			fetch('/api/analytics/track', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					event_type: 'booking_initiated',
					property: 'agency',
					path: '/book',
					experiment_id: AGENCY_MARKETING_COPY_EXPERIMENT.id,
					tag_id: AGENCY_MARKETING_COPY_EXPERIMENT.variant
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
					tag_id: AGENCY_MARKETING_COPY_EXPERIMENT.variant
				})
			});

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({}))) as { message?: string };
				throw new Error(errorData.message || 'Failed to create booking');
			}

			const result = (await response.json()) as { event: BookingEvent };
			confirmedEvent = result.event;
			getAnalytics()?.conversion('booking_completed', {
				...bookingExperimentMetadata,
				serviceLane: selectedLane
			});
			step = 'confirm';
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
	}

	// Initialize: fetch slots for current month
	$effect(() => {
		if (browser) {
			fetchSlotsForMonth(new Date());
		}
	});
</script>

<SEO
	title="Book a Workflow Mapping Session"
	description="Schedule a scoped workflow diagnostic to identify the workflow with the most drag, the safest starting wedge, and the right level of reliability control."
	propertyName="agency"
/>

<main class="booking-page">
	<header class="booking-header">
		<h1 class="booking-title">Book a Workflow Mapping Session</h1>
		<p class="booking-subtitle">
			Bring the workflow with the most drag, risk, or manual handoff. This is a scoped diagnostic
			for one safer operating path, not an open-ended consulting check-in.
		</p>
	</header>

	<!-- Progress indicator -->
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

	<div class="booking-content">
		{#if step === 'date'}
			<section class="step-content">
				<h2 class="step-title">Select a date</h2>
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
			<section class="step-content">
				<h2 class="step-title">Select a time</h2>
				<TimeSlotPicker
					slots={slotsForSelectedDate}
					{selectedSlot}
					onSlotSelect={handleSlotSelect}
					loading={loadingSlots}
					{timezone}
				/>
				<button type="button" class="back-link" onclick={handleBack}>
					← Choose a different date
				</button>
			</section>
		{:else if step === 'details'}
			<section class="step-content">
				<h2 class="step-title">Your details and lane</h2>
				<div class="lane-intake" role="radiogroup" aria-labelledby="lane-intake-title">
					<p id="lane-intake-title" class="lane-intake-title">Which workflow should we map first?</p>
					<p class="lane-intake-helper">This helps me prep the session. Most engagements begin with one narrow workflow and clear operating constraints.</p>
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
										<span class="lane-option-price">{lane.priceHint}</span>
										<span class="lane-option-description">{lane.description}</span>
										<span class="lane-option-fit">{lane.operatorFit}</span>
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
			<section class="step-content">
				<BookingConfirmation event={confirmedEvent} {timezone} />
			</section>
		{/if}
	</div>

	<!-- Fallback link -->
	{#if step !== 'confirm'}
		<footer class="booking-footer">
			<p class="fallback-text">
				Having trouble? <a href="https://savvycal.com/createsomething/together" target="_blank" rel="noopener noreferrer" class="fallback-link">Book directly on SavvyCal →</a>
			</p>
		</footer>
	{/if}
</main>

<style>
	.booking-page {
		max-width: var(--content-width-xl);
		margin: 0 auto;
		padding: var(--space-xl) var(--space-md);
		min-height: 100vh;
	}

	.booking-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.booking-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.booking-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
	}

	/* Progress indicator */
	.progress {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-xl);
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

	.progress-line {
		width: 32px;
		height: 1px;
		background: var(--color-border-default);
	}

	.progress-line.complete {
		background: var(--color-success);
	}

	/* Content */
	.booking-content {
		margin-bottom: var(--space-xl);
	}

	.step-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.step-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
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

	.lane-option-price,
	.lane-option-fit {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}

	.lane-option-price {
		font-family: var(--font-mono);
		font-weight: var(--font-medium);
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
