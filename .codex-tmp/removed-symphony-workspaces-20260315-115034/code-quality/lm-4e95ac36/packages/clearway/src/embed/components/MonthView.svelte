<script lang="ts">
	/**
	 * MonthView Component
	 *
	 * Full month calendar grid (6 weeks, 42 days).
	 * Fetches availability progressively, shows density indicators.
	 * Canon-compliant: monochrome, minimal chrome.
	 */

	import { onMount } from 'svelte';
	import DayCell from './DayCell.svelte';
	import { formatMonthYear, getMonthDates, isInMonth } from '../utils/date-helpers';
	import type { CalendarState } from '../stores/calendar.svelte';
	import type { AvailabilityCache } from '../stores/availability-cache.svelte';

	interface Props {
		calendar: CalendarState;
		availabilityCache: AvailabilityCache;
		onDateSelect?: (date: Date) => void;
	}

	let { calendar, availabilityCache, onDateSelect }: Props = $props();

	// Track loading state
	let isLoadingMonth = $state(false);

	// Visible dates for the month (42 days)
	let visibleDates = $derived(calendar.visibleDates);

	// Current month info for header
	let headerText = $derived(formatMonthYear(calendar.focusDate));
	let currentMonth = $derived(calendar.focusDate.getMonth());
	let currentYear = $derived(calendar.focusDate.getFullYear());

	// Day of week headers
	const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	/**
	 * Fetch availability for all visible dates
	 */
	async function fetchMonthAvailability() {
		isLoadingMonth = true;
		try {
			await availabilityCache.fetchDates(visibleDates);
		} finally {
			isLoadingMonth = false;
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
	 * Navigate to previous month
	 */
	function handlePrevious() {
		calendar.navigatePrevious();
		fetchMonthAvailability();
	}

	/**
	 * Navigate to next month
	 */
	function handleNext() {
		calendar.navigateNext();
		fetchMonthAvailability();
	}

	/**
	 * Navigate to today
	 */
	function handleToday() {
		calendar.navigateToday();
		fetchMonthAvailability();
	}

	// Fetch availability on mount
	onMount(() => {
		fetchMonthAvailability();
	});
</script>

<div class="month-view">
	<!-- Navigation Header -->
	<header class="month-header">
		<button
			class="nav-btn"
			onclick={handlePrevious}
			aria-label="Previous month"
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
			aria-label="Next month"
		>
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
				<path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>
	</header>

	<!-- Day of Week Headers -->
	<div class="day-headers" aria-hidden="true">
		{#each dayHeaders as day}
			<span class="day-header">{day}</span>
		{/each}
	</div>

	<!-- Month Grid (6 weeks x 7 days = 42 cells) -->
	<div class="month-grid" role="grid" aria-label="Month calendar">
		{#each visibleDates as date, i (date.toISOString())}
			{@const availability = availabilityCache.get(date)}
			{@const isPending = availabilityCache.isPending(date)}
			{@const isBookable = calendar.isBookable(date)}
			{@const isSelected = calendar.isSelected(date)}
			{@const isCurrentMonth = isInMonth(date, currentMonth, currentYear)}

			<div class="day-wrapper" class:outside-month={!isCurrentMonth}>
				<DayCell
					{date}
					{availability}
					selected={isSelected}
					disabled={!isBookable}
					loading={isPending || (isLoadingMonth && !availability)}
					compact={true}
					showDayName={false}
					onclick={() => handleDayClick(date)}
				/>
			</div>
		{/each}
	</div>

	<!-- Loading indicator overlay -->
	{#if isLoadingMonth}
		<div class="loading-overlay" aria-live="polite">
			<span class="sr-only">Loading availability...</span>
		</div>
	{/if}
</div>

<style>
	.month-view {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm, 0.75rem);
		position: relative;
	}

	/* Header */
	.month-header {
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

	/* Day headers */
	.day-headers {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: var(--space-xs, 0.25rem);
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

	/* Month grid */
	.month-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: var(--space-xs, 0.25rem);
	}

	/* Day wrapper for outside-month styling */
	.day-wrapper {
		display: contents;
	}

	.day-wrapper.outside-month :global(.day-cell) {
		opacity: 0.4;
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
