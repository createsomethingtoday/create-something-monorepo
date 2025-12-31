<script lang="ts">
	/**
	 * WeekView Component
	 *
	 * 7-day calendar grid with navigation controls.
	 * Fetches availability in parallel on mount and navigation.
	 * Canon-compliant: monochrome, minimal chrome.
	 */

	import { onMount } from 'svelte';
	import DayCell from './DayCell.svelte';
	import { formatMonthYear, getWeekDates } from '../utils/date-helpers';
	import type { CalendarState } from '../stores/calendar.svelte';
	import type { AvailabilityCache } from '../stores/availability-cache.svelte';

	interface Props {
		calendar: CalendarState;
		availabilityCache: AvailabilityCache;
		onDateSelect?: (date: Date) => void;
	}

	let { calendar, availabilityCache, onDateSelect }: Props = $props();

	// Track loading state for the current week
	let isLoadingWeek = $state(false);

	// Visible dates for the week
	let visibleDates = $derived(calendar.visibleDates);

	// Header displaying month/year
	let headerText = $derived(formatMonthYear(calendar.focusDate));

	// Day of week headers (Mon-Sun)
	const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	/**
	 * Fetch availability for all visible dates
	 */
	async function fetchWeekAvailability() {
		isLoadingWeek = true;
		try {
			await availabilityCache.fetchDates(visibleDates);
		} finally {
			isLoadingWeek = false;
		}
	}

	/**
	 * Handle day selection
	 */
	function handleDayClick(date: Date) {
		if (!calendar.isBookable(date)) return;
		calendar.selectDate(date);
		onDateSelect?.(date);
	}

	/**
	 * Navigate to previous week
	 */
	function handlePrevious() {
		calendar.navigatePrevious();
		fetchWeekAvailability();
	}

	/**
	 * Navigate to next week
	 */
	function handleNext() {
		calendar.navigateNext();
		fetchWeekAvailability();
	}

	/**
	 * Navigate to today
	 */
	function handleToday() {
		calendar.navigateToday();
		fetchWeekAvailability();
	}

	// Fetch availability on mount
	onMount(() => {
		fetchWeekAvailability();
	});
</script>

<div class="week-view">
	<!-- Navigation Header -->
	<header class="week-header">
		<button
			class="nav-btn"
			onclick={handlePrevious}
			aria-label="Previous week"
		>
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
				<path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>

		<div class="header-center">
			<h2 class="month-year">{headerText}</h2>
			<button class="today-btn" onclick={handleToday}>
				Today
			</button>
		</div>

		<button
			class="nav-btn"
			onclick={handleNext}
			aria-label="Next week"
		>
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
				<path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>
	</header>

	<!-- Day of Week Headers (Desktop only) -->
	<div class="day-headers" aria-hidden="true">
		{#each dayHeaders as day}
			<span class="day-header">{day}</span>
		{/each}
	</div>

	<!-- Week Grid -->
	<div class="week-grid" role="grid" aria-label="Week calendar">
		{#each visibleDates as date, i (date.toISOString())}
			{@const availability = availabilityCache.get(date)}
			{@const isPending = availabilityCache.isPending(date)}
			{@const isBookable = calendar.isBookable(date)}
			{@const isSelected = calendar.isSelected(date)}

			<DayCell
				{date}
				{availability}
				selected={isSelected}
				disabled={!isBookable}
				loading={isPending || (isLoadingWeek && !availability)}
				showDayName={true}
				onclick={() => handleDayClick(date)}
			/>
		{/each}
	</div>

	<!-- Loading indicator overlay -->
	{#if isLoadingWeek}
		<div class="loading-overlay" aria-live="polite">
			<span class="sr-only">Loading availability...</span>
		</div>
	{/if}
</div>

<style>
	.week-view {
		display: flex;
		flex-direction: column;
		gap: var(--space-md, 1rem);
		position: relative;
	}

	/* Header */
	.week-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm, 0.75rem);
	}

	.header-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs, 0.25rem);
	}

	.month-year {
		font-size: var(--text-h3, 1.25rem);
		font-weight: 600;
		color: var(--color-fg-primary, #ffffff);
		margin: 0;
		line-height: 1;
	}

	.today-btn {
		font-size: var(--text-caption, 0.75rem);
		font-weight: 500;
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		background: transparent;
		border: none;
		cursor: pointer;
		padding: var(--space-xs, 0.25rem) var(--space-sm, 0.5rem);
		border-radius: var(--radius-sm, 4px);
		transition: color var(--duration-micro, 100ms) var(--ease-standard, ease);
		font-family: inherit;
	}

	.today-btn:hover {
		color: var(--color-fg-primary, #ffffff);
	}

	/* Navigation buttons */
	.nav-btn {
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
			border-color var(--duration-micro, 100ms) var(--ease-standard, ease),
			color var(--duration-micro, 100ms) var(--ease-standard, ease);
	}

	.nav-btn:hover {
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.25));
		color: var(--color-fg-primary, #ffffff);
	}

	.nav-btn:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	/* Day headers (desktop only) */
	.day-headers {
		display: none;
		grid-template-columns: repeat(7, 1fr);
		gap: var(--space-xs, 0.5rem);
		padding: 0 var(--space-xs, 0.25rem);
	}

	@media (min-width: 640px) {
		.day-headers {
			display: grid;
		}
	}

	.day-header {
		font-size: var(--text-caption, 0.75rem);
		font-weight: 500;
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		text-transform: uppercase;
		letter-spacing: 0.05em;
		text-align: center;
		padding: var(--space-xs, 0.25rem) 0;
	}

	/* Week grid */
	.week-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: var(--space-xs, 0.5rem);
	}

	/* Mobile: hide day name in header since DayCell shows it */
	@media (min-width: 640px) {
		.week-grid :global(.day-cell) {
			/* Day name hidden on desktop since headers are shown */
		}
	}

	/* Loading overlay */
	.loading-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	/* Screen reader only */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.nav-btn,
		.today-btn {
			transition: none;
		}
	}
</style>
