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

	const laneOptions: Array<{ value: ServiceLane; label: string; description: string }> = [
		{
			value: 'workflow_infrastructure',
			label: 'Critical Workflow',
			description: 'One workflow that needs a safer, production-ready starting point.'
		},
		{
			value: 'reliability_and_control',
			label: 'Policy OS',
			description:
				'Policy artifacts, approval rules, release gates, and incident controls around live automation.'
		},
		{
			value: 'enterprise_extension',
			label: 'Enterprise Constraints',
			description: 'Cross-system orchestration with stricter governance, auditability, and recovery.'
		},
		{
			value: 'system_development_referral',
			label: 'System Development Referral',
			description: 'Full system build and onboarding needs (routed to partner team).'
		},
		{
			value: 'not_sure',
			label: 'Not sure yet',
			description: 'Need help choosing the right lane.'
		}
	];

	const bookingExperimentMetadata = getAgencyMarketingExperimentMetadata('/book') ?? {};
	const DIRECT_BOOKING_URL = 'https://savvycal.com/createsomething/together';

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
		const trimmedNotes = notes.trim();
		return trimmedNotes ? `${laneLine}\n${trimmedNotes}` : laneLine;
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

	function retryAvailableTimes() {
		fetchSlotsForMonth(selectedDate ?? new Date());
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
				{#if error}
					<div class="booking-alert" role="alert">
						<div class="booking-alert-copy">
							<p class="booking-alert-eyebrow">Calendar fallback</p>
							<h3>Book directly if the calendar is unavailable.</h3>
							<p>
								Use the direct booking link or retry the embedded calendar. The session is the
								same either way.
							</p>
						</div>
						<div class="booking-alert-actions">
							<button
								type="button"
								class="booking-alert-secondary"
								onclick={retryAvailableTimes}
								disabled={loadingSlots}
							>
								{loadingSlots ? 'Retrying…' : 'Retry calendar'}
							</button>
							<a
								href={DIRECT_BOOKING_URL}
								target="_blank"
								rel="noopener noreferrer"
								class="booking-alert-primary"
							>
								Book on SavvyCal
							</a>
						</div>
					</div>
				{/if}
				<DatePicker
					{selectedDate}
					onDateSelect={handleDateSelect}
					{availableDates}
					loading={loadingSlots}
				/>
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
			<section class="step-content">
				<BookingConfirmation event={confirmedEvent} {timezone} />
			</section>
		{/if}
	</div>

	<!-- Fallback link -->
	{#if step !== 'confirm'}
		<footer class="booking-footer">
			<p class="fallback-text">
				Having trouble? <a href={DIRECT_BOOKING_URL} target="_blank" rel="noopener noreferrer" class="fallback-link">Book directly on SavvyCal →</a>
			</p>
		</footer>
	{/if}
</main>

<style>
	.booking-page {
		max-width: var(--content-width-xl);
		margin: 0 auto;
		padding: clamp(1.5rem, 4vw, 3rem) var(--space-md) clamp(3rem, 6vw, 5rem);
		min-height: 100vh;
	}

	.booking-header {
		text-align: center;
		max-width: 56rem;
		margin: 0 auto clamp(1.5rem, 4vw, 2.5rem);
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
		max-width: 48rem;
		margin: 0 auto;
		line-height: 1.65;
	}

	/* Progress indicator */
	.progress {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		margin-bottom: clamp(1.25rem, 3vw, 2rem);
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
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.progress-step.active .step-label {
		color: var(--color-fg-primary);
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
		margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
	}

	.step-content {
		display: flex;
		flex-direction: column;
		gap: clamp(1rem, 3vw, 1.5rem);
	}

	.step-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
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

	.booking-alert {
		display: grid;
		gap: var(--space-md);
		padding: clamp(1rem, 2vw, 1.25rem);
		border-radius: var(--radius-lg);
		border: 1px solid rgba(239, 68, 68, 0.22);
		background:
			linear-gradient(180deg, rgba(127, 29, 29, 0.3), rgba(69, 10, 10, 0.22)),
			rgba(24, 7, 7, 0.9);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.03),
			0 18px 42px rgba(0, 0, 0, 0.24);
	}

	.booking-alert-copy {
		display: grid;
		gap: var(--space-2xs);
	}

	.booking-alert-eyebrow {
		margin: 0;
		font-size: var(--text-caption);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(252, 165, 165, 0.9);
	}

	.booking-alert-copy h3 {
		margin: 0;
		font-size: clamp(1.05rem, 1vw + 0.9rem, 1.25rem);
		color: var(--color-fg-primary);
	}

	.booking-alert-copy p:last-child {
		margin: 0;
		font-size: var(--text-body-sm);
		line-height: 1.65;
		color: rgba(254, 226, 226, 0.88);
	}

	.booking-alert-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.booking-alert-primary,
	.booking-alert-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 0.72rem 1rem;
		border-radius: 999px;
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		text-decoration: none;
		transition:
			transform var(--duration-micro) var(--ease-standard),
			background var(--duration-micro) var(--ease-standard),
			border-color var(--duration-micro) var(--ease-standard),
			color var(--duration-micro) var(--ease-standard);
	}

	.booking-alert-primary {
		background: linear-gradient(180deg, #ffffff, #eceef7);
		color: #090909;
		border: 1px solid rgba(255, 255, 255, 0.22);
	}

	.booking-alert-secondary {
		background: rgba(255, 255, 255, 0.04);
		color: var(--color-fg-primary);
		border: 1px solid rgba(255, 255, 255, 0.12);
		cursor: pointer;
		font-family: inherit;
	}

	.booking-alert-secondary:disabled {
		opacity: 0.6;
		cursor: wait;
	}

	.booking-alert-primary:hover,
	.booking-alert-secondary:hover:not(:disabled) {
		transform: translateY(-1px);
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
		padding-top: clamp(1rem, 2.5vw, 1.75rem);
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

	@media (max-width: 640px) {
		.booking-page {
			padding-left: 1rem;
			padding-right: 1rem;
		}

		.booking-title {
			font-size: clamp(2.6rem, 11vw, 4rem);
			line-height: 0.98;
			text-wrap: balance;
		}

		.progress {
			gap: 0.7rem;
		}

		.progress-step {
			flex-direction: column;
			gap: 0.35rem;
			min-width: 3.15rem;
		}

		.step-label {
			font-size: 0.68rem;
			letter-spacing: 0.08em;
			text-transform: uppercase;
		}

		.progress-line {
			width: 18px;
			margin-bottom: 1rem;
		}

		.booking-alert-actions {
			flex-direction: column;
		}

		.booking-alert-primary,
		.booking-alert-secondary {
			width: 100%;
		}
	}
</style>
