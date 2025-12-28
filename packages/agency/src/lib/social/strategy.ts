/**
 * LinkedIn Posting Strategy
 *
 * Research-backed optimal timing for LinkedIn posts.
 * See plan file for sources (Sprout Social, Buffer, Hootsuite, etc.)
 *
 * Key insights:
 * - First 30 min = 75% of reach
 * - Tue-Wed 8-9am or 10-11am local time
 * - Max 1 post/day (penalty for multiple)
 * - Max 5 hashtags (penalty for more)
 */

export type PostingMode = 'drip' | 'longform' | 'immediate';

export type DayOfWeek = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export interface ScheduledPost {
	id: string;
	content: string;
	scheduledFor: Date;
	threadId: string;
	threadIndex: number;
	threadTotal: number;
	campaign?: string;
}

export interface ScheduleOptions {
	timezone: string;
	mode: PostingMode;
	startDate?: Date;
	preferredDays?: DayOfWeek[];
	preferredHour?: number; // 0-23
}

// Research-backed optimal posting days and times
const DEFAULT_PREFERRED_DAYS: DayOfWeek[] = ['tue', 'wed', 'thu'];
const DEFAULT_PREFERRED_HOUR = 9; // 9am local time

const DAY_MAP: Record<DayOfWeek, number> = {
	sun: 0,
	mon: 1,
	tue: 2,
	wed: 3,
	thu: 4,
	fri: 5,
	sat: 6
};

/**
 * Get the next optimal posting time
 *
 * @param timezone - IANA timezone string (e.g., 'America/Los_Angeles')
 * @param preferredDays - Days to prefer (default: Tue-Thu)
 * @param preferredHour - Hour to post (default: 9am)
 * @param after - Find time after this date (default: now)
 */
export function getNextOptimalTime(
	timezone: string,
	preferredDays: DayOfWeek[] = DEFAULT_PREFERRED_DAYS,
	preferredHour: number = DEFAULT_PREFERRED_HOUR,
	after: Date = new Date()
): Date {
	// Convert to local timezone
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});

	// Start from current time or specified date
	let candidate = new Date(after);

	// Look up to 14 days ahead
	for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
		const testDate = new Date(candidate);
		testDate.setDate(testDate.getDate() + dayOffset);

		// Get day of week in local timezone
		const localDayFormatter = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			weekday: 'short'
		});
		const localDay = localDayFormatter.format(testDate).toLowerCase().slice(0, 3) as DayOfWeek;

		// Check if this is a preferred day
		if (preferredDays.includes(localDay)) {
			// Set to preferred hour in local timezone
			const targetDate = setLocalHour(testDate, preferredHour, timezone);

			// Make sure it's in the future
			if (targetDate > after) {
				return targetDate;
			}
		}
	}

	// Fallback: just use tomorrow at preferred hour
	const tomorrow = new Date(after);
	tomorrow.setDate(tomorrow.getDate() + 1);
	return setLocalHour(tomorrow, preferredHour, timezone);
}

/**
 * Set a date to a specific hour in a timezone
 */
function setLocalHour(date: Date, hour: number, timezone: string): Date {
	// Get current offset for the target timezone
	const targetDate = new Date(date);

	// Create a date string in the target timezone
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
	const localDateStr = formatter.format(targetDate);

	// Parse and set the hour
	const [year, month, day] = localDateStr.split('-').map(Number);

	// Create a date in UTC that represents the local time
	const localDate = new Date(Date.UTC(year, month - 1, day, hour, 0, 0, 0));

	// Get the offset for that local time
	const offsetFormatter = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		timeZoneName: 'longOffset'
	});
	const parts = offsetFormatter.formatToParts(localDate);
	const offsetPart = parts.find((p) => p.type === 'timeZoneName');

	if (offsetPart) {
		const offsetMatch = offsetPart.value.match(/([+-])(\d{2}):?(\d{2})?/);
		if (offsetMatch) {
			const sign = offsetMatch[1] === '+' ? -1 : 1;
			const hours = parseInt(offsetMatch[2], 10);
			const minutes = parseInt(offsetMatch[3] || '0', 10);
			const offsetMs = sign * (hours * 60 + minutes) * 60 * 1000;
			return new Date(localDate.getTime() + offsetMs);
		}
	}

	// Fallback: assume UTC
	return localDate;
}

/**
 * Generate a schedule for a thread
 *
 * @param postCount - Number of posts in the thread
 * @param options - Scheduling options
 */
export function generateSchedule(postCount: number, options: ScheduleOptions): Date[] {
	const { timezone, mode, startDate, preferredDays, preferredHour } = options;

	const schedule: Date[] = [];

	if (mode === 'immediate') {
		// All posts now with 1-minute delays (not recommended)
		const now = new Date();
		for (let i = 0; i < postCount; i++) {
			const postTime = new Date(now.getTime() + i * 60 * 1000);
			schedule.push(postTime);
		}
		return schedule;
	}

	if (mode === 'longform') {
		// Single post at next optimal time
		const optimalTime = getNextOptimalTime(
			timezone,
			preferredDays || DEFAULT_PREFERRED_DAYS,
			preferredHour || DEFAULT_PREFERRED_HOUR,
			startDate || new Date()
		);
		schedule.push(optimalTime);
		return schedule;
	}

	// Drip mode: one post per day on optimal days
	let nextTime = getNextOptimalTime(
		timezone,
		preferredDays || DEFAULT_PREFERRED_DAYS,
		preferredHour || DEFAULT_PREFERRED_HOUR,
		startDate || new Date()
	);

	for (let i = 0; i < postCount; i++) {
		schedule.push(new Date(nextTime));

		// Find next optimal day (at least 24 hours later)
		const afterThis = new Date(nextTime.getTime() + 24 * 60 * 60 * 1000);
		nextTime = getNextOptimalTime(
			timezone,
			preferredDays || DEFAULT_PREFERRED_DAYS,
			preferredHour || DEFAULT_PREFERRED_HOUR,
			afterThis
		);
	}

	return schedule;
}

/**
 * Generate unique IDs for scheduled posts
 */
export function generatePostId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `sp_${timestamp}_${random}`;
}

/**
 * Generate a thread ID
 */
export function generateThreadId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 6);
	return `thread_${timestamp}_${random}`;
}

/**
 * Format a schedule for display
 */
export function formatSchedulePreview(
	schedule: Date[],
	posts: { content: string }[],
	timezone: string
): { scheduledFor: string; preview: string }[] {
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		timeZoneName: 'short'
	});

	return schedule.map((date, i) => ({
		scheduledFor: formatter.format(date),
		preview: posts[i]?.content.substring(0, 80) + (posts[i]?.content.length > 80 ? '...' : '')
	}));
}
