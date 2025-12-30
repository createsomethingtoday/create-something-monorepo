<script lang="ts">
	import { onMount } from 'svelte';
	import type { ReservationResult } from './widget';

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

	interface Props {
		facilitySlug: string;
		theme?: 'light' | 'dark';
		date?: string;
		courtType?: string;
		onReservationComplete?: (reservation: ReservationResult) => void;
		onError?: (error: Error) => void;
	}

	let {
		facilitySlug,
		theme = 'dark',
		date = $bindable(new Date().toISOString().split('T')[0]),
		courtType,
		onReservationComplete,
		onError
	}: Props = $props();

	// State
	let loading = $state(true);
	let error = $state<string | null>(null);
	let courts = $state<CourtAvailability[]>([]);
	let selectedCourt = $state<string | null>(null);
	let selectedSlot = $state<TimeSlot | null>(null);

	// API base URL
	const API_BASE =
		typeof window !== 'undefined' && window.location.hostname === 'localhost'
			? 'http://localhost:5173/api'
			: 'https://courtreserve.createsomething.space/api';

	// Fetch availability
	async function fetchAvailability() {
		loading = true;
		error = null;

		try {
			const url = new URL(`${API_BASE}/availability`);
			url.searchParams.set('facility', facilitySlug);
			url.searchParams.set('date', date);
			if (courtType) {
				url.searchParams.set('court_type', courtType);
			}

			const response = await fetch(url.toString());
			if (!response.ok) {
				throw new Error(`Failed to fetch availability: ${response.statusText}`);
			}

			const data = await response.json();
			courts = data.courts || [];
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Failed to load availability';
			error = errorMsg;
			onError?.(err instanceof Error ? err : new Error(errorMsg));
		} finally {
			loading = false;
		}
	}

	// Select a time slot
	function selectSlot(courtId: string, slot: TimeSlot) {
		if (slot.status !== 'available') return;
		selectedCourt = courtId;
		selectedSlot = slot;
	}

	// Clear selection
	function clearSelection() {
		selectedCourt = null;
		selectedSlot = null;
	}

	// Book the selected slot
	async function bookSlot() {
		if (!selectedCourt || !selectedSlot) return;

		loading = true;
		error = null;

		try {
			// For now, redirect to the booking page with selected slot
			// In a full implementation, this would create a reservation via API
			const court = courts.find((c) => c.id === selectedCourt);
			if (!court) throw new Error('Court not found');

			// Redirect to checkout
			const checkoutUrl = new URL(`${API_BASE}/../book`);
			checkoutUrl.searchParams.set('facility', facilitySlug);
			checkoutUrl.searchParams.set('court', selectedCourt);
			checkoutUrl.searchParams.set('date', date);
			checkoutUrl.searchParams.set('start', selectedSlot.startTime);

			window.location.href = checkoutUrl.toString();

			// If we had a callback, we'd call it here:
			// onReservationComplete?.({
			//   id: 'rsv_xxx',
			//   courtName: court.name,
			//   startTime: selectedSlot.startTime,
			//   endTime: selectedSlot.endTime,
			//   price: selectedSlot.priceCents || 0
			// });
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Booking failed';
			error = errorMsg;
			onError?.(err instanceof Error ? err : new Error(errorMsg));
		} finally {
			loading = false;
		}
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

<div class="court-reserve-widget" data-theme={theme}>
	<!-- Date Selector -->
	<div class="widget-header">
		<h3>Book a Court</h3>
		<input type="date" bind:value={date} class="date-input" />
	</div>

	<!-- Loading State -->
	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading availability...</p>
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
	{#if !loading && !error && courts.length > 0}
		<div class="courts-grid">
			{#each courts as court}
				<div class="court-section">
					<h4 class="court-name">{court.name}</h4>
					<div class="slots-grid">
						{#each court.slots as slot}
							<button
								class="slot"
								class:available={slot.status === 'available'}
								class:reserved={slot.status === 'reserved'}
								class:selected={selectedCourt === court.id &&
									selectedSlot?.startTime === slot.startTime}
								onclick={() => selectSlot(court.id, slot)}
								disabled={slot.status !== 'available'}
							>
								<span class="slot-time">{slot.startTime}</span>
								{#if slot.priceCents !== null}
									<span class="slot-price">${(slot.priceCents / 100).toFixed(0)}</span>
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
			<p>No courts available for this date.</p>
		</div>
	{/if}

	<!-- Booking Panel -->
	{#if selectedSlot && selectedCourt}
		<div class="booking-panel">
			<div class="booking-details">
				<p>
					<strong>{courts.find((c) => c.id === selectedCourt)?.name}</strong>
				</p>
				<p>
					{selectedSlot.startTime} - {selectedSlot.endTime}
				</p>
				{#if selectedSlot.priceCents}
					<p class="price">${(selectedSlot.priceCents / 100).toFixed(2)}</p>
				{/if}
			</div>
			<div class="booking-actions">
				<button class="cancel-btn" onclick={clearSelection}>Cancel</button>
				<button class="book-btn" onclick={bookSlot}>Book Now</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.court-reserve-widget {
		font-family:
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			Oxygen,
			Ubuntu,
			Cantarell,
			sans-serif;
		border-radius: 12px;
		padding: 1.5rem;
		max-width: 800px;
		margin: 0 auto;
	}

	/* Theme: Dark (default) */
	.court-reserve-widget[data-theme='dark'] {
		background: #1a1a1a;
		color: #ffffff;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.court-reserve-widget[data-theme='dark'] .date-input,
	.court-reserve-widget[data-theme='dark'] button {
		background: #111111;
		color: #ffffff;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.court-reserve-widget[data-theme='dark'] .slot.available {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.court-reserve-widget[data-theme='dark'] .slot.available:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.court-reserve-widget[data-theme='dark'] .slot.selected {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.5);
	}

	/* Theme: Light */
	.court-reserve-widget[data-theme='light'] {
		background: #ffffff;
		color: #1a1a1a;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	.court-reserve-widget[data-theme='light'] .date-input,
	.court-reserve-widget[data-theme='light'] button {
		background: #f5f5f5;
		color: #1a1a1a;
		border: 1px solid rgba(0, 0, 0, 0.2);
	}

	.court-reserve-widget[data-theme='light'] .slot.available {
		background: #f5f5f5;
		border-color: rgba(0, 0, 0, 0.2);
	}

	.court-reserve-widget[data-theme='light'] .slot.available:hover {
		background: #e5e5e5;
	}

	.court-reserve-widget[data-theme='light'] .slot.selected {
		background: #e0e0e0;
		border-color: rgba(0, 0, 0, 0.5);
	}

	/* Header */
	.widget-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.widget-header h3 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.date-input {
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		font-size: 1rem;
		transition: all 0.2s;
	}

	.date-input:focus {
		outline: none;
		border-color: rgba(255, 255, 255, 0.5);
	}

	/* Loading */
	.loading {
		text-align: center;
		padding: 3rem 1rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		margin: 0 auto 1rem;
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-top-color: rgba(255, 255, 255, 0.5);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Error */
	.error {
		text-align: center;
		padding: 2rem 1rem;
		color: #d44d4d;
	}

	.error button {
		margin-top: 1rem;
		padding: 0.5rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.error button:hover {
		opacity: 0.8;
	}

	/* Courts Grid */
	.courts-grid {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.court-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.court-name {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		opacity: 0.8;
	}

	.slots-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 0.75rem;
	}

	.slot {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.875rem;
	}

	.slot:disabled {
		cursor: not-allowed;
		opacity: 0.3;
	}

	.slot.reserved {
		background: rgba(255, 255, 255, 0.02);
		border-color: rgba(255, 255, 255, 0.05);
	}

	.slot-time {
		font-weight: 600;
	}

	.slot-price {
		font-size: 0.75rem;
		opacity: 0.7;
	}

	/* Empty State */
	.empty {
		text-align: center;
		padding: 3rem 1rem;
		opacity: 0.6;
	}

	/* Booking Panel */
	.booking-panel {
		margin-top: 2rem;
		padding: 1.5rem;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.05);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.booking-details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.booking-details p {
		margin: 0;
	}

	.booking-details .price {
		font-size: 1.25rem;
		font-weight: 700;
		color: #44aa44;
	}

	.booking-actions {
		display: flex;
		gap: 0.75rem;
	}

	.book-btn,
	.cancel-btn {
		padding: 0.75rem 2rem;
		border-radius: 8px;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		border: none;
		transition: all 0.2s;
	}

	.book-btn {
		background: #44aa44;
		color: white;
	}

	.book-btn:hover {
		background: #55bb55;
	}

	.cancel-btn {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
	}

	.cancel-btn:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	/* Responsive */
	@media (max-width: 640px) {
		.slots-grid {
			grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		}

		.booking-panel {
			flex-direction: column;
			align-items: stretch;
		}

		.booking-actions {
			width: 100%;
		}

		.book-btn,
		.cancel-btn {
			flex: 1;
		}
	}
</style>
