<script lang="ts">
	/**
	 * CalendarWidget Component
	 *
	 * Complete booking widget with calendar week/month view.
	 * Shows availability at a glance, then detailed slots when day is selected.
	 * Canon-compliant: monochrome, minimal chrome.
	 */

	import { onMount } from 'svelte';
	import WeekView from './components/WeekView.svelte';
	import MonthView from './components/MonthView.svelte';
	import ViewToggle from './components/ViewToggle.svelte';
	import CheckoutForm from './CheckoutForm.svelte';
	import { createCalendarState, type CalendarView } from './stores/calendar.svelte';
	import { createAvailabilityCache, type CourtAvailability, type TimeSlot } from './stores/availability-cache.svelte';
	import { formatDisplayDate, formatDate } from './utils/date-helpers';
	import type { BookingResult } from './widget';

	interface Props {
		facilitySlug: string;
		theme?: 'light' | 'dark';
		advanceBookingDays?: number;
		timezone?: string;
		stripePublishableKey?: string;
		onReservationComplete?: (reservation: BookingResult) => void;
		onError?: (error: Error) => void;
	}

	let {
		facilitySlug,
		theme = 'dark',
		advanceBookingDays = 30,
		timezone = 'America/Chicago',
		stripePublishableKey,
		onReservationComplete,
		onError
	}: Props = $props();

	// API base URL
	const API_BASE =
		typeof window !== 'undefined' && window.location.hostname === 'localhost'
			? 'http://localhost:5173/api'
			: typeof window !== 'undefined' && window.location.hostname.includes('clearway')
				? '/api'
				: 'https://clearway.pages.dev/api';

	// Create stores
	const calendar = createCalendarState({ advanceBookingDays, timezone });
	const availabilityCache = createAvailabilityCache(facilitySlug, API_BASE);

	// Current view: 'calendar' or 'slots'
	let currentView = $state<'calendar' | 'slots'>('calendar');

	// Slot selection state
	let selectedCourtId = $state<string | null>(null);
	let selectedSlot = $state<TimeSlot | null>(null);
	let selectedKey = $state<string | null>(null);

	// Checkout state
	let showCheckout = $state(false);
	let checkoutLoading = $state(false);
	let reservationId = $state<string | null>(null);
	let memberName = $state('');
	let memberEmail = $state('');

	// Derived: courts for selected date
	let selectedDateCourts = $derived(() => {
		if (!calendar.selectedDate) return [];
		const availability = availabilityCache.get(calendar.selectedDate);
		return availability?.courts || [];
	});

	// Derived: facility name
	let facilityName = $derived(availabilityCache.facility?.name || facilitySlug);

	/**
	 * Handle view toggle (week/month)
	 */
	function handleViewChange(view: CalendarView) {
		calendar.setView(view);
	}

	/**
	 * Format ISO timestamp to human-readable time
	 */
	function formatTime(isoString: string): string {
		const date = new Date(isoString);
		const hours = date.getHours();
		const ampm = hours >= 12 ? 'PM' : 'AM';
		const hour12 = hours % 12 || 12;
		return `${hour12} ${ampm}`;
	}

	/**
	 * Handle date selection from calendar
	 */
	function handleDateSelect(date: Date) {
		// Switch to slots view
		currentView = 'slots';
	}

	/**
	 * Go back to calendar view
	 */
	function handleBackToCalendar() {
		currentView = 'calendar';
		clearSlotSelection();
	}

	/**
	 * Select a time slot
	 */
	function selectSlot(courtId: string, slot: TimeSlot) {
		if (slot.status !== 'available') return;
		selectedCourtId = courtId;
		selectedSlot = slot;
		selectedKey = `${courtId}::${slot.startTime}`;
		calendar.selectSlot(courtId, slot.startTime);
	}

	/**
	 * Clear slot selection
	 */
	function clearSlotSelection() {
		selectedCourtId = null;
		selectedSlot = null;
		selectedKey = null;
		calendar.clearSlot();
	}

	/**
	 * Proceed to checkout
	 */
	function proceedToCheckout() {
		if (!memberName || !memberEmail) {
			showCheckout = true;
		} else {
			createReservationAndShowPayment();
		}
	}

	/**
	 * Create reservation and show payment
	 */
	async function createReservationAndShowPayment() {
		if (!selectedCourtId || !selectedSlot || !calendar.selectedDate) return;

		checkoutLoading = true;

		try {
			const courts = selectedDateCourts();
			const court = courts.find((c) => c.id === selectedCourtId);
			if (!court) throw new Error('Court not found');

			const response = await fetch(`${API_BASE}/book`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					facility_slug: facilitySlug,
					court_id: selectedCourtId,
					date: formatDate(calendar.selectedDate),
					start_time: selectedSlot.startTime,
					member_email: memberEmail,
					member_name: memberName
				})
			});

			if (!response.ok) {
				const errData = (await response.json()) as { message?: string };
				throw new Error(errData.message || 'Failed to create reservation');
			}

			const reservation = (await response.json()) as { id: string };
			reservationId = reservation.id;
			showCheckout = true;
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Booking failed';
			onError?.(err instanceof Error ? err : new Error(errorMsg));
		} finally {
			checkoutLoading = false;
		}
	}

	/**
	 * Handle successful payment
	 */
	function handlePaymentSuccess(result: any) {
		showCheckout = false;

		if (onReservationComplete && selectedCourtId && selectedSlot) {
			const courts = selectedDateCourts();
			const court = courts.find((c) => c.id === selectedCourtId);
			onReservationComplete({
				id: reservationId || '',
				court: court?.name || '',
				start: selectedSlot.startTime,
				end: selectedSlot.endTime,
				price: selectedSlot.priceCents || 0
			});
		}

		// Reset state
		clearSlotSelection();
		handleBackToCalendar();

		// Invalidate cache for selected date
		if (calendar.selectedDate) {
			availabilityCache.invalidate(calendar.selectedDate);
		}
	}

	/**
	 * Handle payment error
	 */
	function handlePaymentError(err: Error) {
		onError?.(err);
	}

	/**
	 * Cancel checkout
	 */
	function cancelCheckout() {
		showCheckout = false;
		memberName = '';
		memberEmail = '';
		reservationId = null;
	}
</script>

<div class="calendar-widget" data-theme={theme}>
	{#if currentView === 'calendar'}
		<!-- Calendar View -->
		<div class="calendar-view">
			<!-- View Toggle -->
			<div class="view-toggle-wrapper">
				<ViewToggle
					value={calendar.view}
					onchange={handleViewChange}
				/>
			</div>

			<!-- Week or Month View -->
			{#if calendar.view === 'week'}
				<WeekView
					{calendar}
					{availabilityCache}
					onDateSelect={handleDateSelect}
				/>
			{:else}
				<MonthView
					{calendar}
					{availabilityCache}
					onDateSelect={handleDateSelect}
				/>
			{/if}
		</div>
	{:else}
		<!-- Slots View -->
		<div class="slots-view">
			<!-- Back button and date header -->
			<header class="slots-header">
				<button class="back-btn" onclick={handleBackToCalendar} aria-label="Back to calendar">
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
						<path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
				<h2 class="date-header">
					{#if calendar.selectedDate}
						{formatDisplayDate(calendar.selectedDate)}
					{/if}
				</h2>
			</header>

			<!-- Availability summary -->
			{#if calendar.selectedDate}
				{@const availability = availabilityCache.get(calendar.selectedDate)}
				{#if availability}
					<p class="availability-summary">
						{availability.availableSlots} slot{availability.availableSlots === 1 ? '' : 's'} available
					</p>
				{/if}
			{/if}

			<!-- Courts and slots -->
			{#if selectedDateCourts().length > 0}
				{@const courts = selectedDateCourts()}
				<div class="courts">
					{#each courts as court}
						<div class="court">
							<h4>{court.name}</h4>
							<div class="slots">
								{#each court.slots as slot}
									<button
										class="slot"
										class:available={slot.status === 'available'}
										class:peak={slot.priceCents !== null && slot.priceCents > 4000}
										class:selected={selectedKey === `${court.id}::${slot.startTime}`}
										onclick={() => selectSlot(court.id, slot)}
										disabled={slot.status !== 'available'}
									>
										<span class="time">{formatTime(slot.startTime)}</span>
										{#if slot.priceCents !== null}
											<span class="price">${(slot.priceCents / 100).toFixed(0)}</span>
										{/if}
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty">
					<p>No courts available for this date.</p>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Booking Panel -->
	{#if selectedSlot && selectedCourtId && !showCheckout}
		{@const courts = selectedDateCourts()}
		{@const court = courts.find((c) => c.id === selectedCourtId)}
		<div class="booking">
			<div class="details">
				<strong>{court?.name}</strong>
				<span>{formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}</span>
				{#if selectedSlot.priceCents}
					<span class="amount">${(selectedSlot.priceCents / 100).toFixed(0)}</span>
				{/if}
			</div>
			<div class="actions">
				<button class="cancel" onclick={clearSlotSelection}>Cancel</button>
				<button class="book" onclick={proceedToCheckout} disabled={checkoutLoading}>
					{#if checkoutLoading}
						Loading...
					{:else}
						Book
					{/if}
				</button>
			</div>
		</div>
	{/if}

	<!-- User Info Form -->
	{#if showCheckout && !reservationId}
		<div class="user-info-form">
			<h3>Your Information</h3>
			<form onsubmit={(e) => { e.preventDefault(); createReservationAndShowPayment(); }}>
				<div class="field">
					<label for="name">Name</label>
					<input
						type="text"
						id="name"
						bind:value={memberName}
						placeholder="John Smith"
						required
						disabled={checkoutLoading}
					/>
				</div>
				<div class="field">
					<label for="email">Email</label>
					<input
						type="email"
						id="email"
						bind:value={memberEmail}
						placeholder="you@example.com"
						required
						disabled={checkoutLoading}
					/>
				</div>
				<div class="form-actions">
					<button type="button" class="cancel" onclick={cancelCheckout} disabled={checkoutLoading}>
						Cancel
					</button>
					<button type="submit" class="book" disabled={checkoutLoading}>
						{#if checkoutLoading}
							Creating...
						{:else}
							Continue
						{/if}
					</button>
				</div>
			</form>
		</div>
	{:else if showCheckout && reservationId && selectedSlot && selectedCourtId && stripePublishableKey}
		{@const courts = selectedDateCourts()}
		{@const court = courts.find((c) => c.id === selectedCourtId)}
		<CheckoutForm
			{reservationId}
			courtName={court?.name || ''}
			{facilityName}
			startTime={selectedSlot.startTime}
			endTime={selectedSlot.endTime}
			priceCents={selectedSlot.priceCents || 0}
			{memberName}
			{memberEmail}
			{theme}
			{stripePublishableKey}
			onSuccess={handlePaymentSuccess}
			onError={handlePaymentError}
			onCancel={cancelCheckout}
		/>
	{/if}

	<!-- Error Display -->
	{#if availabilityCache.lastError}
		<div class="error-banner">
			<p>{availabilityCache.lastError}</p>
		</div>
	{/if}
</div>

<style>
	/* Canon Design System - Monochrome */
	.calendar-widget {
		font-family: var(--font-sans, 'Stack Sans Notch', system-ui, sans-serif);
		border-radius: var(--radius-lg, 12px);
		padding: var(--space-lg, 1.5rem);
		max-width: 800px;
		margin: 0 auto;
		position: relative;
	}

	/* Dark Theme */
	.calendar-widget[data-theme='dark'] {
		background: var(--color-bg-subtle, #1a1a1a);
		color: var(--color-fg-primary, #ffffff);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	/* Calendar View */
	.calendar-view {
		min-height: 300px;
	}

	.view-toggle-wrapper {
		display: flex;
		justify-content: flex-end;
		margin-bottom: var(--space-md, 1rem);
	}

	/* Slots View */
	.slots-view {
		min-height: 300px;
	}

	.slots-header {
		display: flex;
		align-items: center;
		gap: var(--space-md, 1rem);
		margin-bottom: var(--space-md, 1rem);
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: transparent;
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-md, 8px);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		cursor: pointer;
		transition:
			border-color var(--duration-micro, 100ms) ease,
			color var(--duration-micro, 100ms) ease;
	}

	.back-btn:hover {
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.25));
		color: var(--color-fg-primary, #ffffff);
	}

	.date-header {
		font-size: var(--text-h3, 1.25rem);
		font-weight: 600;
		color: var(--color-fg-primary, #ffffff);
		margin: 0;
	}

	.availability-summary {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		margin: 0 0 var(--space-lg, 1.5rem);
	}

	/* Courts */
	.courts {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg, 1.5rem);
		padding-bottom: 100px;
	}

	.court h4 {
		margin: 0 0 var(--space-sm, 0.75rem);
		font-size: var(--text-body, 1rem);
		font-weight: 600;
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	.slots {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
		gap: 0.5rem;
	}

	.slot {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.125rem;
		padding: 0.625rem 0.5rem;
		border-radius: var(--radius-md, 8px);
		cursor: pointer;
		transition: all 200ms ease;
		font-size: var(--text-body-sm, 0.875rem);
		background: var(--color-bg-surface, #111111);
		color: var(--color-fg-primary, #ffffff);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		font-family: inherit;
	}

	.slot:disabled {
		cursor: not-allowed;
		opacity: 0.25;
	}

	.slot.available:hover:not(:disabled) {
		background: var(--color-hover, rgba(255, 255, 255, 0.1));
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
	}

	.slot.selected {
		background: var(--color-fg-primary, #ffffff);
		color: var(--color-bg-pure, #000000);
		border-color: var(--color-fg-primary, #ffffff);
	}

	.slot.peak .price {
		font-weight: 600;
	}

	.time {
		font-weight: 500;
	}

	.price {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
	}

	.slot.selected .price {
		color: var(--color-bg-pure, #000000);
	}

	/* Empty */
	.empty {
		text-align: center;
		padding: var(--space-xl, 3rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
	}

	/* Booking Panel */
	.booking {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		margin: 0;
		padding: var(--space-md, 1rem) var(--space-lg, 1.5rem);
		border-radius: var(--radius-lg, 12px) var(--radius-lg, 12px) 0 0;
		background: var(--color-bg-surface, #111111);
		border: 1px solid var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
		border-bottom: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-md, 1rem);
		animation: slideUp var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
		box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
		z-index: 100;
	}

	@keyframes slideUp {
		from { opacity: 0; transform: translateY(100%); }
		to { opacity: 1; transform: translateY(0); }
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.details strong {
		color: var(--color-fg-primary, #ffffff);
	}

	.details span {
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		font-size: var(--text-body-sm, 0.875rem);
	}

	.details .amount {
		font-size: var(--text-body-lg, 1.125rem);
		font-weight: 600;
		color: var(--color-fg-primary, #ffffff);
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.cancel,
	.book {
		padding: 0.625rem 1.25rem;
		border-radius: var(--radius-md, 8px);
		font-weight: 500;
		font-size: var(--text-body, 1rem);
		cursor: pointer;
		transition: all 200ms ease;
		font-family: inherit;
	}

	.cancel {
		background: transparent;
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.cancel:hover {
		background: var(--color-hover, rgba(255, 255, 255, 0.05));
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
	}

	.book {
		background: var(--color-fg-primary, #ffffff);
		color: var(--color-bg-pure, #000000);
		border: none;
		padding: 0.75rem 2rem;
		font-size: var(--text-body-lg, 1.125rem);
		font-weight: 600;
	}

	.book:hover {
		opacity: 0.9;
	}

	/* User Info Form */
	.user-info-form {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		margin: 0;
		padding: var(--space-lg, 1.5rem);
		border-radius: var(--radius-lg, 12px) var(--radius-lg, 12px) 0 0;
		background: var(--color-bg-surface, #111111);
		border: 1px solid var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
		border-bottom: none;
		animation: slideUp var(--duration-standard, 300ms) ease;
		box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
		z-index: 100;
	}

	.user-info-form h3 {
		margin: 0 0 var(--space-md, 1rem);
		font-size: var(--text-h4, 1.125rem);
		font-weight: 600;
	}

	.user-info-form form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md, 1rem);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field label {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		font-weight: 500;
	}

	.field input {
		padding: 0.875rem 1rem;
		border-radius: var(--radius-md, 8px);
		background: var(--color-bg-subtle, #1a1a1a);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		color: var(--color-fg-primary, #ffffff);
		font-size: var(--text-body, 1rem);
		font-family: inherit;
		transition: border-color 200ms ease;
	}

	.field input:focus {
		outline: none;
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.3));
	}

	.field input::placeholder {
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.form-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: var(--space-sm, 0.75rem);
	}

	/* Error Banner */
	.error-banner {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		padding: var(--space-md, 1rem);
		background: var(--color-error, #d44d4d);
		color: white;
		text-align: center;
		z-index: 150;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.slots {
			grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
		}

		.booking {
			flex-direction: column;
			align-items: stretch;
		}

		.actions {
			width: 100%;
		}

		.cancel,
		.book {
			flex: 1;
		}

		.form-actions {
			flex-direction: column;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.booking,
		.user-info-form {
			animation: none;
		}
	}
</style>
