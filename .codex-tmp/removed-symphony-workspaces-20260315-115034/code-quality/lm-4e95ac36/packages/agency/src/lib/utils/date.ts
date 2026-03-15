/**
 * Date utilities for social calendar operations.
 *
 * Timezone-aware helpers for week calculations.
 */

/**
 * Get the start of the week (Monday) for a given date in a specific timezone.
 */
export function getStartOfWeek(date: Date, timezone: string): Date {
	const d = new Date(date);
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		weekday: 'short'
	});

	// Move back to Monday
	while (formatter.format(d).toLowerCase() !== 'mon') {
		d.setDate(d.getDate() - 1);
	}

	// Set to start of day
	d.setHours(0, 0, 0, 0);
	return d;
}

/**
 * Get the ISO week number string (e.g., "2026-W04") for a date in a specific timezone.
 */
export function getWeekNumber(date: Date, timezone: string): string {
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		year: 'numeric'
	});
	const year = formatter.format(date);

	// Calculate week number
	const startOfYear = new Date(parseInt(year), 0, 1);
	const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
	const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);

	return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}
