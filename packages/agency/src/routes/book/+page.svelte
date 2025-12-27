<script lang="ts">
	import { browser } from '$app/environment';
	import { SEO } from '@create-something/components';
	import DatePicker from '$lib/components/booking/DatePicker.svelte';
	import TimeSlotPicker from '$lib/components/booking/TimeSlotPicker.svelte';
	import BookingForm from '$lib/components/booking/BookingForm.svelte';
	import BookingConfirmation from '$lib/components/booking/BookingConfirmation.svelte';

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

	// State
	let step = $state<BookingStep>('date');
	let selectedDate = $state<Date | null>(null);
	let selectedSlot = $state<TimeSlot | null>(null);
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

			const data = await response.json();
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
			// Track booking initiated
			fetch('/api/analytics/track', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					event_type: 'booking_initiated',
					property: 'agency',
					path: '/book'
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
					notes: data.notes || undefined
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Failed to create booking');
			}

			const result = await response.json();
			confirmedEvent = result.event;
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
	title="Book a Discovery Call"
	description="Schedule a discovery call with CREATE SOMETHING. Let's discuss your project and explore how we can help."
	propertyName="agency"
/>

<main class="booking-page">
	<header class="booking-header">
		<h1 class="booking-title">Book a Discovery Call</h1>
		<p class="booking-subtitle">
			30 minutes to explore your project and see if we're a good fit.
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
				<h2 class="step-title">Your details</h2>
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
		max-width: 480px;
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
		border: 1px solid var(--color-border-default);
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

	/* Footer */
	.booking-footer {
		text-align: center;
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
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
