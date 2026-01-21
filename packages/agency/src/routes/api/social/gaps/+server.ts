/**
 * GET /api/social/gaps
 *
 * Find gaps in the weekly posting rhythm.
 * Returns days without scheduled content and suggests next actions.
 *
 * Agent-native endpoint for social calendar observability.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getNextOptimalTime, DEFAULT_PREFERRED_DAYS } from '$lib/social/strategy';

interface DayStatus {
	date: string;
	dayOfWeek: string;
	status: 'posted' | 'scheduled' | 'gap';
	postId?: string;
	preview?: string;
}

interface WeekData {
	weekNumber: string;
	days: Record<string, DayStatus>;
}

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const weeks = parseInt(url.searchParams.get('weeks') || '2', 10);
	const timezone = url.searchParams.get('timezone') || 'America/Los_Angeles';

	// Get current date in timezone
	const now = new Date();
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});

	// Calculate date range (current week + future weeks)
	const startOfWeek = getStartOfWeek(now, timezone);
	const endDate = new Date(startOfWeek);
	endDate.setDate(endDate.getDate() + weeks * 7);

	// Query posts in range
	const result = await db
		.prepare(
			`SELECT id, scheduled_for, status, content
			 FROM social_posts
			 WHERE scheduled_for >= ? AND scheduled_for <= ?
			 ORDER BY scheduled_for ASC`
		)
		.bind(startOfWeek.getTime(), endDate.getTime())
		.all<{
			id: string;
			scheduled_for: number;
			status: string;
			content: string;
		}>();

	const posts = result.results || [];

	// Build a map of date -> post
	const postsByDate = new Map<string, { id: string; status: string; preview: string }>();
	for (const post of posts) {
		const postDate = new Date(post.scheduled_for);
		const dateKey = formatter.format(postDate);
		postsByDate.set(dateKey, {
			id: post.id,
			status: post.status,
			preview: post.content.substring(0, 60) + (post.content.length > 60 ? '...' : '')
		});
	}

	// Build week data
	const weeksData: WeekData[] = [];
	const gaps: string[] = [];
	const dayFormatter = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		weekday: 'long'
	});
	const weekFormatter = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		year: 'numeric'
	});

	let currentDate = new Date(startOfWeek);
	let currentWeekDays: Record<string, DayStatus> = {};
	let currentWeekNumber = getWeekNumber(currentDate, timezone);

	while (currentDate < endDate) {
		const dateKey = formatter.format(currentDate);
		const dayOfWeek = dayFormatter.format(currentDate).toLowerCase();
		const weekNum = getWeekNumber(currentDate, timezone);

		// Start new week if needed
		if (weekNum !== currentWeekNumber) {
			weeksData.push({
				weekNumber: currentWeekNumber,
				days: currentWeekDays
			});
			currentWeekDays = {};
			currentWeekNumber = weekNum;
		}

		// Only track weekdays (Mon-Fri)
		if (isWeekday(currentDate, timezone)) {
			const postData = postsByDate.get(dateKey);

			let status: 'posted' | 'scheduled' | 'gap';
			if (postData) {
				status = postData.status === 'posted' ? 'posted' : 'scheduled';
			} else {
				status = 'gap';
				// Only count future gaps
				if (currentDate >= now) {
					gaps.push(dateKey);
				}
			}

			currentWeekDays[dayOfWeek] = {
				date: dateKey,
				dayOfWeek,
				status,
				...(postData && { postId: postData.id, preview: postData.preview })
			};
		}

		currentDate.setDate(currentDate.getDate() + 1);
	}

	// Add final week
	if (Object.keys(currentWeekDays).length > 0) {
		weeksData.push({
			weekNumber: currentWeekNumber,
			days: currentWeekDays
		});
	}

	// Get next optimal slot
	const nextOptimalSlot = getNextOptimalTime(timezone, DEFAULT_PREFERRED_DAYS, 9, now);

	// Generate suggestion
	let suggestion = '';
	if (gaps.length === 0) {
		suggestion = 'No gaps in the schedule. All weekdays covered.';
	} else if (gaps.length === 1) {
		suggestion = `Schedule content for ${formatDateForHuman(gaps[0], timezone)}.`;
	} else {
		suggestion = `${gaps.length} gaps found. Next gap: ${formatDateForHuman(gaps[0], timezone)}.`;
	}

	return json({
		timezone,
		weeksAnalyzed: weeks,
		currentWeek: weeksData[0],
		allWeeks: weeksData,
		gaps,
		gapCount: gaps.length,
		nextOptimalSlot: nextOptimalSlot.toISOString(),
		nextOptimalSlotFormatted: formatDateTimeForHuman(nextOptimalSlot, timezone),
		suggestion
	});
};

// Helper functions

function getStartOfWeek(date: Date, timezone: string): Date {
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

function getWeekNumber(date: Date, timezone: string): string {
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

function isWeekday(date: Date, timezone: string): boolean {
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		weekday: 'short'
	});
	const day = formatter.format(date).toLowerCase();
	return ['mon', 'tue', 'wed', 'thu', 'fri'].includes(day);
}

function formatDateForHuman(dateStr: string, timezone: string): string {
	const date = new Date(dateStr + 'T12:00:00');
	return new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		weekday: 'long',
		month: 'short',
		day: 'numeric'
	}).format(date);
}

function formatDateTimeForHuman(date: Date, timezone: string): string {
	return new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		timeZoneName: 'short'
	}).format(date);
}
