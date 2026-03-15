/**
 * Calendar State Store
 *
 * Manages calendar view state: view mode, focus date, selections.
 * Uses Svelte 5 runes for reactive state management.
 */

import {
	getWeekDates,
	getMonthDates,
	addDays,
	formatDate,
	isSameDay
} from '../utils/date-helpers';

export type CalendarView = 'week' | 'month';

export interface CalendarConfig {
	advanceBookingDays: number;
	timezone: string;
}

/**
 * Create a calendar state instance
 */
export function createCalendarState(config: CalendarConfig) {
	// View mode (week or month)
	let view = $state<CalendarView>('week');

	// The anchor date for the current view
	let focusDate = $state<Date>(new Date());

	// Selected date (clicked day in calendar)
	let selectedDate = $state<Date | null>(null);

	// Selected time slot compound key: `${courtId}::${startTime}`
	let selectedSlot = $state<string | null>(null);

	// Configuration
	let advanceBookingDays = $state(config.advanceBookingDays);
	let timezone = $state(config.timezone);

	/**
	 * Get dates visible in current view
	 */
	function getVisibleDates(): Date[] {
		if (view === 'week') {
			return getWeekDates(focusDate);
		}
		return getMonthDates(focusDate);
	}

	/**
	 * Get the bookable date range
	 */
	function getBookableRange(): { min: Date; max: Date } {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const max = addDays(today, advanceBookingDays);
		max.setHours(23, 59, 59, 999);

		return { min: today, max };
	}

	/**
	 * Check if a date is bookable
	 */
	function isBookable(date: Date): boolean {
		const range = getBookableRange();
		const d = new Date(date);
		d.setHours(12, 0, 0, 0); // Normalize to noon to avoid timezone issues

		return d >= range.min && d <= range.max;
	}

	/**
	 * Set the view mode
	 */
	function setView(newView: CalendarView): void {
		view = newView;
	}

	/**
	 * Navigate to previous period
	 */
	function navigatePrevious(): void {
		if (view === 'week') {
			focusDate = addDays(focusDate, -7);
		} else {
			const d = new Date(focusDate);
			d.setMonth(d.getMonth() - 1);
			focusDate = d;
		}
	}

	/**
	 * Navigate to next period
	 */
	function navigateNext(): void {
		if (view === 'week') {
			focusDate = addDays(focusDate, 7);
		} else {
			const d = new Date(focusDate);
			d.setMonth(d.getMonth() + 1);
			focusDate = d;
		}
	}

	/**
	 * Navigate to today
	 */
	function navigateToday(): void {
		focusDate = new Date();
		selectedDate = new Date();
	}

	/**
	 * Select a date
	 */
	function selectDate(date: Date | null): void {
		selectedDate = date;
		// Clear slot selection when date changes
		selectedSlot = null;
	}

	/**
	 * Select a time slot
	 */
	function selectSlot(courtId: string, startTime: string): void {
		selectedSlot = `${courtId}::${startTime}`;
	}

	/**
	 * Clear slot selection
	 */
	function clearSlot(): void {
		selectedSlot = null;
	}

	/**
	 * Clear all selections
	 */
	function clearSelection(): void {
		selectedDate = null;
		selectedSlot = null;
	}

	/**
	 * Check if a date is selected
	 */
	function isSelected(date: Date): boolean {
		if (!selectedDate) return false;
		return isSameDay(date, selectedDate);
	}

	/**
	 * Parse selected slot into components
	 */
	function parseSelectedSlot(): { courtId: string; startTime: string } | null {
		if (!selectedSlot) return null;
		const [courtId, startTime] = selectedSlot.split('::');
		return { courtId, startTime };
	}

	/**
	 * Update configuration
	 */
	function updateConfig(newConfig: Partial<CalendarConfig>): void {
		if (newConfig.advanceBookingDays !== undefined) {
			advanceBookingDays = newConfig.advanceBookingDays;
		}
		if (newConfig.timezone !== undefined) {
			timezone = newConfig.timezone;
		}
	}

	return {
		// Reactive getters
		get view() {
			return view;
		},
		get focusDate() {
			return focusDate;
		},
		get selectedDate() {
			return selectedDate;
		},
		get selectedSlot() {
			return selectedSlot;
		},
		get advanceBookingDays() {
			return advanceBookingDays;
		},
		get timezone() {
			return timezone;
		},

		// Computed values
		get visibleDates() {
			return getVisibleDates();
		},
		get bookableRange() {
			return getBookableRange();
		},

		// Methods
		setView,
		navigatePrevious,
		navigateNext,
		navigateToday,
		selectDate,
		selectSlot,
		clearSlot,
		clearSelection,
		isSelected,
		isBookable,
		parseSelectedSlot,
		updateConfig
	};
}

// Type for the calendar state instance
export type CalendarState = ReturnType<typeof createCalendarState>;
