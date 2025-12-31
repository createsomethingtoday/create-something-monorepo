/**
 * Date Helper Utilities for Calendar Views
 *
 * Pure functions for date manipulation without external dependencies.
 * Uses native Date API for zero bundle impact.
 */

/**
 * Format a Date to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to Date
 */
export function parseDate(dateStr: string): Date {
	const [year, month, day] = dateStr.split('-').map(Number);
	return new Date(year, month - 1, day);
}

/**
 * Add days to a date (can be negative)
 */
export function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

/**
 * Get the start of a week (Monday) for a given date
 */
export function getWeekStart(date: Date): Date {
	const result = new Date(date);
	const day = result.getDay();
	// Convert Sunday (0) to 7, then subtract to get Monday
	const diff = day === 0 ? 6 : day - 1;
	result.setDate(result.getDate() - diff);
	return result;
}

/**
 * Get array of 7 dates for the week containing the given date
 * Week starts on Monday
 */
export function getWeekDates(anchorDate: Date): Date[] {
	const weekStart = getWeekStart(anchorDate);
	return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/**
 * Get the start of a month (first day)
 */
export function getMonthStart(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get array of dates for a full calendar month view
 * Includes padding days from prev/next months to fill the grid
 */
export function getMonthDates(anchorDate: Date): Date[] {
	const monthStart = getMonthStart(anchorDate);
	const monthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);

	// Get the Monday of the week containing the 1st
	const calendarStart = getWeekStart(monthStart);

	// Calculate how many days we need (always show 6 weeks = 42 days)
	const dates: Date[] = [];
	let current = calendarStart;

	// Generate 42 days (6 weeks) to ensure consistent grid
	for (let i = 0; i < 42; i++) {
		dates.push(new Date(current));
		current = addDays(current, 1);
	}

	return dates;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

/**
 * Check if a date is within a range (inclusive)
 */
export function isWithinRange(date: Date, min: Date, max: Date): boolean {
	const d = date.getTime();
	return d >= min.getTime() && d <= max.getTime();
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
	return isSameDay(date, new Date());
}

/**
 * Check if a date is in the past (before today)
 */
export function isPast(date: Date): boolean {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const check = new Date(date);
	check.setHours(0, 0, 0, 0);
	return check.getTime() < today.getTime();
}

/**
 * Check if a date is in the given month
 */
export function isInMonth(date: Date, month: number, year: number): boolean {
	return date.getMonth() === month && date.getFullYear() === year;
}

/**
 * Get the day of week name (short)
 */
export function getDayName(date: Date, short = true): string {
	const options: Intl.DateTimeFormatOptions = { weekday: short ? 'short' : 'long' };
	return date.toLocaleDateString('en-US', options);
}

/**
 * Get month name
 */
export function getMonthName(date: Date, short = false): string {
	const options: Intl.DateTimeFormatOptions = { month: short ? 'short' : 'long' };
	return date.toLocaleDateString('en-US', options);
}

/**
 * Format a date for display (e.g., "Wed, Jan 8")
 */
export function formatDisplayDate(date: Date): string {
	return date.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	});
}

/**
 * Format month and year for calendar header (e.g., "January 2025")
 */
export function formatMonthYear(date: Date): string {
	return date.toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric'
	});
}

/**
 * Get array of day names starting from Monday
 */
export function getWeekdayHeaders(short = true): string[] {
	const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	if (!short) {
		return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
	}
	return days;
}
