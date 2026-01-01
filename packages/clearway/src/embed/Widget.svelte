<script lang="ts">
	import { onMount } from 'svelte';
	import type { BookingResult } from './widget';
	import CheckoutForm from './CheckoutForm.svelte';
	import CalendarWidget from './CalendarWidget.svelte';

	// API Response types (matching +server.ts)
	interface CourtAvailability {
		id: string;
		name: string;
		type: string;
		surfaceType: string | null;
		slots: TimeSlot[];
	}

	interface TimeSlot {
		startTime: string;
		endTime: string;
		status: 'available' | 'reserved' | 'pending' | 'maintenance';
		priceCents: number | null;
	}

	// AI Suggestion types (matching /api/suggestions)
	interface SlotSuggestion {
		courtId: string;
		courtName: string;
		startTime: string;
		endTime: string;
		score: number;
		reason: 'frequent_time' | 'frequent_court' | 'frequent_day' | 'pattern_match' | 'new_user';
	}

	interface SuggestionResponse {
		suggestions: SlotSuggestion[];
		personalized: boolean;
		computeTimeMs: number;
	}

	interface Props {
		facilitySlug: string;
		theme?: 'light' | 'dark';
		view?: 'slots' | 'calendar';
		date?: string;
		courtType?: string;
		advanceBookingDays?: number;
		timezone?: string;
		stripePublishableKey?: string;
		memberEmail?: string; // For AI personalization
		embedded?: boolean; // True when rendered in iframe (fixed booking bar)
		onReservationComplete?: (reservation: BookingResult) => void;
		onError?: (error: Error) => void;
	}

	let {
		facilitySlug,
		theme = 'dark',
		view = 'slots',
		date = $bindable(new Date().toISOString().split('T')[0]),
		courtType,
		advanceBookingDays = 30,
		timezone = 'America/Chicago',
		stripePublishableKey,
		memberEmail: propMemberEmail,
		embedded = false,
		onReservationComplete,
		onError
	}: Props = $props();

	// State
	let loading = $state(true);
	let error = $state<string | null>(null);
	let courts = $state<CourtAvailability[]>([]);
	let selectedCourt = $state<string | null>(null);
	let selectedSlot = $state<TimeSlot | null>(null);
	// Unique key for selection comparison (court::time)
	let selectedKey = $state<string | null>(null);

	// Court filter state
	let selectedLocations = $state<Set<string>>(new Set()); // Empty = show all

	// Extract unique location prefixes from court names (e.g., "Grandview" from "Grandview Court 1")
	function getLocationPrefix(courtName: string): string {
		// Extract the location name (everything before "Court" or just the first word)
		const match = courtName.match(/^(.+?)\s+Court/i);
		return match ? match[1].trim() : courtName.split(' ')[0];
	}

	// Derived: unique locations from all courts
	let uniqueLocations = $derived.by(() => {
		const locations = new Set<string>();
		for (const court of courts) {
			locations.add(getLocationPrefix(court.name));
		}
		return Array.from(locations).sort();
	});

	// Derived: filtered courts based on selected locations
	let filteredCourts = $derived.by(() => {
		if (selectedLocations.size === 0) return courts; // Show all if none selected
		return courts.filter(court => selectedLocations.has(getLocationPrefix(court.name)));
	});

	// Toggle location filter
	function toggleLocation(location: string) {
		const newSet = new Set(selectedLocations);
		if (newSet.has(location)) {
			newSet.delete(location);
		} else {
			newSet.add(location);
		}
		selectedLocations = newSet;
	}

	// AI Suggestion state
	let suggestedSlots = $state<Set<string>>(new Set()); // Set of "courtId::startTime" keys
	let suggestionsPersonalized = $state(false);

	// Checkout state
	let showCheckout = $state(false);
	let checkoutLoading = $state(false);
	let reservationId = $state<string | null>(null);
	let memberName = $state('');
	let memberEmail = $state('');
	let facilityName = $state('');

	// Element refs for scrolling
	let bookingRef: HTMLDivElement | null = null;

	// API base URL - use relative path for same-origin, absolute for embeds
	const API_BASE =
		typeof window !== 'undefined' && window.location.hostname === 'localhost'
			? 'http://localhost:5173/api'
			: typeof window !== 'undefined' && window.location.hostname.includes('clearway')
				? '/api'
				: 'https://clearway.pages.dev/api';

	// Re-fetch suggestions when email changes (debounced)
	let emailDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		const email = memberEmail; // Track dependency
		if (email && email.includes('@') && date) {
			// Debounce to avoid fetching on every keystroke
			if (emailDebounceTimer) clearTimeout(emailDebounceTimer);
			emailDebounceTimer = setTimeout(() => {
				fetchSuggestions();
			}, 500);
		}
		return () => {
			if (emailDebounceTimer) clearTimeout(emailDebounceTimer);
		};
	});

	// Format ISO timestamp to human-readable time (e.g., "6 AM", "5 PM")
	function formatTime(isoString: string): string {
		const date = new Date(isoString);
		const hours = date.getHours();
		const ampm = hours >= 12 ? 'PM' : 'AM';
		const hour12 = hours % 12 || 12;
		return `${hour12} ${ampm}`;
	}

	// Fetch AI-powered suggestions (runs in parallel with availability)
	async function fetchSuggestions(): Promise<void> {
		try {
			const params = new URLSearchParams();
			params.set('facility', facilitySlug);
			params.set('date', date);
			// Use prop email or previously entered email for personalization
			const emailForPersonalization = propMemberEmail || memberEmail;
			if (emailForPersonalization) {
				params.set('email', emailForPersonalization);
			}

			const response = await fetch(`${API_BASE}/suggestions?${params.toString()}`);
			if (!response.ok) {
				// Silently fail - suggestions are optional enhancement
				return;
			}

			const data = (await response.json()) as SuggestionResponse;

			// Only highlight slots for personalized suggestions (known members)
			// Generic "new_user" suggestions shouldn't show highlights
			if (data.personalized) {
				const newSuggested = new Set<string>();
				for (const suggestion of data.suggestions) {
					newSuggested.add(`${suggestion.courtId}::${suggestion.startTime}`);
				}
				suggestedSlots = newSuggested;
			} else {
				suggestedSlots = new Set();
			}
			suggestionsPersonalized = data.personalized;
		} catch {
			// Silently fail - suggestions are optional enhancement
			suggestedSlots = new Set();
			suggestionsPersonalized = false;
		}
	}

	// Fetch availability (and suggestions in parallel)
	async function fetchAvailability() {
		loading = true;
		error = null;
		// Clear suggestions when date changes
		suggestedSlots = new Set();

		try {
			// Build URL - handle both relative and absolute paths
			const params = new URLSearchParams();
			params.set('facility', facilitySlug);
			params.set('date', date);
			if (courtType) {
				params.set('court_type', courtType);
			}
			const fetchUrl = `${API_BASE}/availability?${params.toString()}`;

			// Fetch availability and suggestions in parallel
			const [response] = await Promise.all([
				fetch(fetchUrl),
				fetchSuggestions() // Fire and forget - doesn't block availability
			]);

			if (!response.ok) {
				throw new Error(`Failed to fetch availability: ${response.statusText}`);
			}

			const data = (await response.json()) as {
				courts?: CourtAvailability[];
				facility?: { name: string };
			};
			courts = data.courts || [];
			facilityName = data.facility?.name || facilitySlug;
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Failed to load availability';
			error = errorMsg;
			onError?.(err instanceof Error ? err : new Error(errorMsg));
		} finally {
			loading = false;
		}
	}

	// Select a time slot (or toggle off if already selected)
	function selectSlot(courtId: string, slot: TimeSlot) {
		if (slot.status !== 'available') return;

		// Toggle off if clicking the same slot
		const key = `${courtId}::${slot.startTime}`;
		if (selectedKey === key) {
			clearSelection();
			return;
		}

		selectedCourt = courtId;
		selectedSlot = slot;
		selectedKey = key;

		// Auto-scroll to booking bar when embedded (use timeout to ensure DOM updated)
		if (embedded) {
			setTimeout(() => {
				bookingRef?.scrollIntoView({ behavior: 'smooth', block: 'end' });
			}, 50);
		}
	}

	// Clear selection
	function clearSelection() {
		selectedCourt = null;
		selectedSlot = null;
		selectedKey = null;
	}

	// Proceed to checkout (show form if name/email not collected yet)
	function proceedToCheckout() {
		if (!memberName || !memberEmail) {
			// Show user info collection form
			showCheckout = true;
		} else {
			// Already have info, create reservation
			createReservationAndShowPayment();
		}
	}

	// Create reservation and show payment form
	async function createReservationAndShowPayment() {
		if (!selectedCourt || !selectedSlot) return;

		checkoutLoading = true;
		error = null;

		try {
			const court = courts.find((c) => c.id === selectedCourt);
			if (!court) throw new Error('Court not found');

			// Create reservation via booking API
			const response = await fetch(`${API_BASE}/book`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					facility_slug: facilitySlug,
					court_id: selectedCourt,
					date: date,
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

			// Show checkout form
			showCheckout = true;
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Booking failed';
			error = errorMsg;
			onError?.(err instanceof Error ? err : new Error(errorMsg));
		} finally {
			checkoutLoading = false;
		}
	}

	// Handle successful payment
	function handlePaymentSuccess(result: any) {
		showCheckout = false;

		// Call completion callback
		if (onReservationComplete && selectedCourt && selectedSlot) {
			const court = courts.find((c) => c.id === selectedCourt);
			onReservationComplete({
				id: reservationId || '',
				court: court?.name || '',
				start: selectedSlot.startTime,
				end: selectedSlot.endTime,
				price: selectedSlot.priceCents || 0
			});
		}

		// Reset state
		clearSelection();
		fetchAvailability(); // Refresh to show updated availability
	}

	// Handle payment error
	function handlePaymentError(err: Error) {
		error = err.message;
		onError?.(err);
	}

	// Cancel checkout
	function cancelCheckout() {
		showCheckout = false;
		memberName = '';
		memberEmail = '';
		reservationId = null;
	}

	// Load on mount and when date changes
	onMount(() => {
		fetchAvailability();
	});

	$effect(() => {
		// Re-fetch when date changes
		if (date) {
			fetchAvailability();
		}
	});
</script>

{#if view === 'calendar'}
	<!-- Calendar View Mode -->
	<CalendarWidget
		{facilitySlug}
		{theme}
		{advanceBookingDays}
		{timezone}
		{stripePublishableKey}
		{onReservationComplete}
		{onError}
	/>
{:else}
<div class="widget" class:has-selection={selectedSlot && !showCheckout} class:embedded data-theme={theme}>
	<!-- Week Navigation Header -->
	<div class="week-header">
		<h3>Book a Court</h3>
		<div class="week-nav">
			<button class="nav-btn" onclick={() => {
				const d = new Date(date + 'T12:00:00');
				d.setDate(d.getDate() - 7);
				date = d.toISOString().split('T')[0];
			}} aria-label="Previous week">
				<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			</button>
			<div class="week-days">
				{#each Array.from({ length: 7 }, (_, i) => {
					const d = new Date(date + 'T12:00:00');
					const startOfWeek = new Date(d);
					startOfWeek.setDate(d.getDate() - d.getDay());
					const day = new Date(startOfWeek);
					day.setDate(startOfWeek.getDate() + i);
					return day;
				}) as day}
					<button
						class="day-btn"
						class:selected={day.toISOString().split('T')[0] === date}
						class:today={day.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]}
						onclick={() => { date = day.toISOString().split('T')[0]; }}
					>
						<span class="day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
						<span class="day-num">{day.getDate()}</span>
					</button>
				{/each}
			</div>
			<button class="nav-btn" onclick={() => {
				const d = new Date(date + 'T12:00:00');
				d.setDate(d.getDate() + 7);
				date = d.toISOString().split('T')[0];
			}} aria-label="Next week">
				<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			</button>
		</div>
	</div>

	<!-- Location Filter (only show if multiple locations) -->
	{#if uniqueLocations.length > 1}
		<div class="location-filter">
			{#each uniqueLocations as location}
				<button
					class="filter-chip"
					class:active={selectedLocations.has(location)}
					onclick={() => toggleLocation(location)}
				>
					{location}
				</button>
			{/each}
			{#if selectedLocations.size > 0}
				<button class="filter-clear" onclick={() => selectedLocations = new Set()}>
					Show All
				</button>
			{/if}
		</div>
	{/if}

	<!-- Loading State -->
	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading...</p>
		</div>
	{/if}

	<!-- Error State -->
	{#if error && !loading}
		<div class="error">
			<p>{error}</p>
			<button onclick={() => fetchAvailability()}>Retry</button>
		</div>
	{/if}

	<!-- Availability Grid -->
	{#if !loading && !error && filteredCourts.length > 0}
		<div class="courts">
			{#each filteredCourts as court}
				<div class="court">
					<h4>{court.name}</h4>
					<div class="slots">
						{#each court.slots as slot}
							<button
								class="slot"
								class:available={slot.status === 'available'}
								class:peak={slot.priceCents !== null && slot.priceCents > 4000}
								class:selected={selectedKey === `${court.id}::${slot.startTime}`}
								class:suggested={suggestedSlots.has(`${court.id}::${slot.startTime}`)}
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
	{/if}

	<!-- Empty State -->
	{#if !loading && !error && courts.length === 0}
		<div class="empty">
			<p>No courts available.</p>
		</div>
	{:else if !loading && !error && filteredCourts.length === 0}
		<div class="empty">
			<p>No courts match your filter.</p>
			<button class="filter-clear" onclick={() => selectedLocations = new Set()}>Show All Courts</button>
		</div>
	{/if}

	<!-- Booking Panel -->
	{#if selectedSlot && selectedCourt && !showCheckout}
		<div class="booking" bind:this={bookingRef}>
			<div class="details">
				<strong>{courts.find((c) => c.id === selectedCourt)?.name}</strong>
				<span>{formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}</span>
				{#if selectedSlot.priceCents}
					<span class="amount">${(selectedSlot.priceCents / 100).toFixed(0)}</span>
				{/if}
			</div>
			<div class="actions">
				<button class="cancel" onclick={clearSelection}>Cancel</button>
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

	<!-- Checkout Form (In-Widget Payment) -->
	{#if showCheckout && !reservationId}
		<!-- User Info Collection -->
		<div class="user-info-form">
			<h3>Your Information</h3>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					createReservationAndShowPayment();
				}}
			>
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
	{:else if showCheckout && reservationId && selectedSlot && selectedCourt && stripePublishableKey}
		<!-- Payment Form -->
		<CheckoutForm
			{reservationId}
			courtName={courts.find((c) => c.id === selectedCourt)?.name || ''}
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
</div>
{/if}

<style>
	/* Canon Design System - Monochrome First */
	.widget {
		font-family: var(--font-sans, 'Stack Sans Notch', system-ui, sans-serif);
		border-radius: var(--radius-lg, 12px);
		padding: var(--space-lg, 1.5rem);
		max-width: 800px;
		margin: 0 auto;
	}

	/* Add bottom padding when booking bar is visible */
	.widget.has-selection {
		padding-bottom: 5rem;
	}

	/* Dark Theme (default) */
	.widget[data-theme='dark'] {
		background: var(--color-bg-subtle, #1a1a1a);
		color: var(--color-fg-primary, #ffffff);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.widget[data-theme='dark'] .date-input,
	.widget[data-theme='dark'] button {
		background: var(--color-bg-surface, #111111);
		color: var(--color-fg-primary, #ffffff);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	/* Week Header */
	.week-header {
		margin-bottom: var(--space-lg, 1.5rem);
	}

	.week-header h3 {
		margin: 0 0 var(--space-md, 1rem);
		font-size: var(--text-h3, 1.25rem);
		font-weight: 600;
		color: var(--color-fg-primary, #ffffff);
	}

	.week-nav {
		display: flex;
		align-items: center;
		gap: var(--space-sm, 0.5rem);
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: transparent;
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-sm, 6px);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		cursor: pointer;
		transition: all 150ms ease;
		flex-shrink: 0;
	}

	.nav-btn:hover {
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.25));
		color: var(--color-fg-primary, #ffffff);
	}

	.week-days {
		display: flex;
		flex: 1;
		gap: 0.25rem;
	}

	.day-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.125rem;
		padding: 0.5rem 0.25rem;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-sm, 6px);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		cursor: pointer;
		transition: all 150ms ease;
		font-family: inherit;
	}

	.day-btn:hover {
		background: var(--color-hover, rgba(255, 255, 255, 0.05));
	}

	.day-btn.selected {
		background: var(--color-fg-primary, #ffffff);
		color: var(--color-bg-pure, #000000);
	}

	.day-btn.today:not(.selected) {
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.3));
	}

	.day-name {
		font-size: var(--text-caption, 0.75rem);
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.day-num {
		font-size: var(--text-body, 1rem);
		font-weight: 600;
	}

	/* Location Filter */
	.location-filter {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: var(--space-md, 1rem);
		padding-bottom: var(--space-md, 1rem);
		border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.filter-chip {
		padding: 0.375rem 0.75rem;
		font-size: var(--text-body-sm, 0.875rem);
		font-weight: 500;
		background: transparent;
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-full, 9999px);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		cursor: pointer;
		transition: all 150ms ease;
	}

	.filter-chip:hover {
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.25));
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	.filter-chip.active {
		background: var(--color-fg-primary, #ffffff);
		border-color: var(--color-fg-primary, #ffffff);
		color: var(--color-bg-pure, #000000);
	}

	.filter-clear {
		padding: 0.375rem 0.75rem;
		font-size: var(--text-body-sm, 0.875rem);
		font-weight: 500;
		background: transparent;
		border: none;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		cursor: pointer;
		transition: color 150ms ease;
	}

	.filter-clear:hover {
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	/* Loading */
	.loading {
		text-align: center;
		padding: var(--space-xl, 3rem) var(--space-sm, 1rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
	}

	.spinner {
		width: 32px;
		height: 32px;
		margin: 0 auto var(--space-sm, 1rem);
		border: 2px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-top-color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Error */
	.error {
		text-align: center;
		padding: var(--space-lg, 1.5rem);
		color: var(--color-error, #d44d4d);
	}

	.error button {
		margin-top: var(--space-sm, 1rem);
		padding: 0.5rem 1.5rem;
		border-radius: var(--radius-md, 8px);
		cursor: pointer;
	}

	/* Courts */
	.courts {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg, 1.5rem);
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
		position: relative; /* For suggested ::before pseudo-element */
	}

	.slot:disabled {
		cursor: not-allowed;
		opacity: 0.25;
	}

	.slot.available {
		background: var(--color-bg-surface, rgba(255, 255, 255, 0.05));
		border-color: var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.slot.available:hover:not(:disabled) {
		background: var(--color-hover, rgba(255, 255, 255, 0.1));
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
	}

	.slot.selected {
		background: #ffffff !important;
		color: #000000 !important;
		border-color: #ffffff !important;
		box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
	}

	/* AI-suggested slots - visible but not intrusive
	   Philosophy: The tool recedes; the user thinks "this is my usual time" */
	.slot.suggested:not(.selected) {
		border-color: rgba(255, 255, 255, 0.4);
		background: rgba(255, 255, 255, 0.08);
		box-shadow:
			0 0 0 1px rgba(255, 255, 255, 0.15),
			0 0 12px rgba(255, 255, 255, 0.1);
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

	/* Booking Panel - sticky by default, fixed when embedded in iframe */
	.booking {
		position: sticky;
		bottom: 0;
		margin: var(--space-lg, 1.5rem) calc(var(--space-lg, 1.5rem) * -1) calc(var(--space-lg, 1.5rem) * -1);
		padding: var(--space-md, 1rem) var(--space-lg, 1.5rem);
		border-radius: var(--radius-lg, 12px) var(--radius-lg, 12px) 0 0;
		background: var(--color-bg-surface, #111111);
		border: 1px solid var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
		border-bottom: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-md, 1rem);
		box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
		z-index: 100;
	}

	/* When embedded in iframe, use fixed positioning */
	.widget.embedded .booking {
		position: fixed;
		left: 0;
		right: 0;
		margin: 0;
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

	/* Canon monochrome primary button: inverted colors, prominent */
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
		transform: scale(1.02);
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
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.booking {
			animation: none;
		}
		.book:hover {
			transform: none;
		}
	}

	/* User Info Form */
	.user-info-form {
		position: sticky;
		bottom: 0;
		margin: var(--space-lg, 1.5rem) calc(var(--space-lg, 1.5rem) * -1) calc(var(--space-lg, 1.5rem) * -1);
		padding: var(--space-lg, 1.5rem);
		border-radius: var(--radius-lg, 12px) var(--radius-lg, 12px) 0 0;
		background: var(--color-bg-surface, #111111);
		border: 1px solid var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
		border-bottom: none;
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

	.field input:disabled {
		opacity: 0.5;
	}

	.form-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: var(--space-sm, 0.75rem);
	}

	@media (max-width: 640px) {
		.user-info-form {
			padding: var(--space-md, 1rem);
		}

		.form-actions {
			flex-direction: column;
		}

		.form-actions button {
			width: 100%;
		}
	}
</style>
