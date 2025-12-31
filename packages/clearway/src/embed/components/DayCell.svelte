<script lang="ts">
	/**
	 * DayCell Component
	 *
	 * Individual day button in the calendar grid.
	 * Displays date number and slot availability count.
	 * Canon-compliant: monochrome, inverted selection.
	 */

	import { isToday, getDayName } from '../utils/date-helpers';
	import type { DayAvailability } from '../stores/availability-cache.svelte';

	interface Props {
		date: Date;
		availability: DayAvailability | null;
		selected: boolean;
		disabled: boolean;
		loading: boolean;
		compact?: boolean;
		showDayName?: boolean;
		onclick?: () => void;
	}

	let {
		date,
		availability,
		selected,
		disabled,
		loading,
		compact = false,
		showDayName = true,
		onclick
	}: Props = $props();

	// Compute availability level for styling
	let availabilityLevel = $derived(() => {
		if (loading || !availability) return 'loading';
		if (availability.availableSlots === 0) return 'none';
		const ratio = availability.availableSlots / availability.totalSlots;
		if (ratio < 0.25) return 'low';
		if (ratio < 0.5) return 'medium';
		return 'high';
	});

	// Format slot count display
	let slotDisplay = $derived(() => {
		if (!availability) return '';
		if (availability.availableSlots === 0) return 'Full';
		return `${availability.availableSlots}`;
	});

	let isTodayDate = $derived(isToday(date));
	let dayName = $derived(getDayName(date, true));
	let dateNumber = $derived(date.getDate());
</script>

<button
	class="day-cell"
	class:selected
	class:disabled
	class:loading
	class:today={isTodayDate}
	class:compact
	data-availability={availabilityLevel()}
	{disabled}
	{onclick}
	aria-selected={selected}
	aria-disabled={disabled}
	aria-label="{dayName}, {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}, {availability ? `${availability.availableSlots} slots available` : 'loading'}"
>
	{#if showDayName}
		<span class="day-name">{dayName}</span>
	{/if}

	<span class="date-number">{dateNumber}</span>

	{#if loading}
		<span class="skeleton" aria-busy="true"></span>
	{:else if availability}
		<span class="slot-count" class:full={availability.availableSlots === 0}>
			{slotDisplay()}
		</span>
	{/if}
</button>

<style>
	.day-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs, 0.25rem);
		padding: var(--space-sm, 0.75rem) var(--space-xs, 0.5rem);
		min-height: 5rem;
		background: var(--color-bg-surface, #111111);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-md, 8px);
		cursor: pointer;
		transition:
			border-color var(--duration-micro, 100ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			background var(--duration-micro, 100ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
		font-family: inherit;
		color: var(--color-fg-primary, #ffffff);
	}

	.day-cell.compact {
		min-height: 4rem;
		padding: var(--space-xs, 0.5rem);
	}

	/* Hover - border only (Canon) */
	.day-cell:hover:not(.disabled):not(.selected) {
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.25));
	}

	/* Selected - inverted (Canon) */
	.day-cell.selected {
		background: var(--color-fg-primary, #ffffff);
		color: var(--color-bg-pure, #000000);
		border-color: var(--color-fg-primary, #ffffff);
	}

	/* Today indicator */
	.day-cell.today:not(.selected) {
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.25));
	}

	/* Disabled */
	.day-cell.disabled {
		opacity: 0.25;
		cursor: not-allowed;
	}

	/* Fully booked */
	.day-cell[data-availability='none']:not(.selected) {
		background: var(--color-bg-subtle, #0a0a0a);
	}

	/* Day name */
	.day-name {
		font-size: var(--text-caption, 0.75rem);
		font-weight: 500;
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.day-cell.selected .day-name {
		color: var(--color-bg-surface, rgba(0, 0, 0, 0.6));
	}

	/* Date number */
	.date-number {
		font-size: var(--text-h3, 1.25rem);
		font-weight: 600;
		line-height: 1;
	}

	/* Slot count */
	.slot-count {
		font-size: var(--text-body-sm, 0.875rem);
		font-weight: 500;
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	.day-cell.selected .slot-count {
		color: var(--color-bg-pure, #000000);
	}

	.slot-count.full {
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		font-size: var(--text-caption, 0.75rem);
	}

	.day-cell.selected .slot-count.full {
		color: var(--color-bg-surface, rgba(0, 0, 0, 0.6));
	}

	/* Skeleton loader */
	.skeleton {
		width: 1.5rem;
		height: 0.875rem;
		background: linear-gradient(
			90deg,
			var(--color-bg-subtle, #1a1a1a) 25%,
			var(--color-bg-surface, #222222) 50%,
			var(--color-bg-subtle, #1a1a1a) 75%
		);
		background-size: 200% 100%;
		border-radius: var(--radius-sm, 4px);
		animation: shimmer 1.5s infinite;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.day-cell {
			transition: none;
		}

		.skeleton {
			animation: none;
			background: var(--color-bg-subtle, #1a1a1a);
		}
	}

	/* Focus visible */
	.day-cell:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}
</style>
