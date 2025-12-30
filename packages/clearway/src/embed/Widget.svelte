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
	// Unique key for selection comparison (court::time)
	let selectedKey = $state<string | null>(null);

	// API base URL - use relative path for same-origin, absolute for embeds
	const API_BASE =
		typeof window !== 'undefined' && window.location.hostname === 'localhost'
			? 'http://localhost:5173/api'
			: typeof window !== 'undefined' && window.location.hostname.includes('clearway')
				? '/api'
				: 'https://clearway.pages.dev/api';

	// Format ISO timestamp to human-readable time (e.g., "6 AM", "5 PM")
	function formatTime(isoString: string): string {
		const date = new Date(isoString);
		const hours = date.getHours();
		const ampm = hours >= 12 ? 'PM' : 'AM';
		const hour12 = hours % 12 || 12;
		return `${hour12} ${ampm}`;
	}

	// Fetch availability
	async function fetchAvailability() {
		loading = true;
		error = null;

		try {
			// Build URL - handle both relative and absolute paths
			const params = new URLSearchParams();
			params.set('facility', facilitySlug);
			params.set('date', date);
			if (courtType) {
				params.set('court_type', courtType);
			}
			const fetchUrl = `${API_BASE}/availability?${params.toString()}`;

			const response = await fetch(fetchUrl);
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
		selectedKey = `${courtId}::${slot.startTime}`;
	}

	// Clear selection
	function clearSelection() {
		selectedCourt = null;
		selectedSlot = null;
		selectedKey = null;
	}

	// Book the selected slot
	async function bookSlot() {
		if (!selectedCourt || !selectedSlot) return;

		loading = true;
		error = null;

		try {
			const court = courts.find((c) => c.id === selectedCourt);
			if (!court) throw new Error('Court not found');

			// Redirect to checkout
			const checkoutParams = new URLSearchParams();
			checkoutParams.set('facility', facilitySlug);
			checkoutParams.set('court', selectedCourt);
			checkoutParams.set('date', date);
			checkoutParams.set('start', selectedSlot.startTime);

			window.location.href = `/book?${checkoutParams.toString()}`;
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

<div class="widget" data-theme={theme}>
	<!-- Header -->
	<div class="header">
		<h3>Book a Court</h3>
		<input type="date" bind:value={date} class="date-input" />
	</div>

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
	{#if !loading && !error && courts.length > 0}
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
	{/if}

	<!-- Empty State -->
	{#if !loading && !error && courts.length === 0}
		<div class="empty">
			<p>No courts available.</p>
		</div>
	{/if}

	<!-- Booking Panel -->
	{#if selectedSlot && selectedCourt}
		<div class="booking">
			<div class="details">
				<strong>{courts.find((c) => c.id === selectedCourt)?.name}</strong>
				<span>{formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}</span>
				{#if selectedSlot.priceCents}
					<span class="amount">${(selectedSlot.priceCents / 100).toFixed(0)}</span>
				{/if}
			</div>
			<div class="actions">
				<button class="cancel" onclick={clearSelection}>Cancel</button>
				<button class="book" onclick={bookSlot}>Book</button>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Canon Design System - Monochrome First */
	.widget {
		font-family: var(--font-sans, 'Stack Sans Notch', system-ui, sans-serif);
		border-radius: var(--radius-lg, 12px);
		padding: var(--space-lg, 1.5rem);
		max-width: 800px;
		margin: 0 auto;
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

	/* Header */
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-lg, 1.5rem);
	}

	.header h3 {
		margin: 0;
		font-size: var(--text-h3, 1.25rem);
		font-weight: 600;
		color: var(--color-fg-primary, #ffffff);
	}

	.date-input {
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-md, 8px);
		font-size: var(--text-body, 1rem);
		font-family: inherit;
		transition: border-color 200ms ease;
	}

	.date-input:focus {
		outline: none;
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.3));
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

	/* Booking Panel - sticky + animated entrance for clear next step */
	.booking {
		position: sticky;
		bottom: 0;
		margin-top: var(--space-lg, 1.5rem);
		padding: var(--space-md, 1rem) var(--space-lg, 1.5rem);
		border-radius: var(--radius-lg, 12px) var(--radius-lg, 12px) 0 0;
		background: var(--color-bg-subtle, #1a1a1a);
		border: 1px solid var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
		border-bottom: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-md, 1rem);
		animation: slideUp var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
		box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(100%);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
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
</style>
