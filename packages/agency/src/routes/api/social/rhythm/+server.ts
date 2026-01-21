/**
 * GET /api/social/rhythm
 *
 * Check adherence to the Clay playbook weekly rhythm.
 * Returns status for each day's focus area.
 *
 * Clay Playbook Weekly Rhythm:
 * - Monday: Review week's learnings
 * - Tuesday: Create primary content
 * - Wednesday: Derivatives (repurpose)
 * - Thursday: Community engagement
 * - Friday: Pipeline review
 *
 * Agent-native endpoint for methodology adherence tracking.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface DayRhythm {
	focus: string;
	description: string;
	status: 'complete' | 'in_progress' | 'pending' | 'missed';
	postId?: string;
	content?: string;
}

// Clay playbook weekly rhythm definition
const WEEKLY_RHYTHM: Record<string, { focus: string; description: string }> = {
	monday: {
		focus: 'Review learnings',
		description: 'Identify 1 pattern to capture from the week'
	},
	tuesday: {
		focus: 'Create primary content',
		description: 'Draft main thread/post for the week'
	},
	wednesday: {
		focus: 'Derivatives',
		description: 'Repurpose content into secondary formats'
	},
	thursday: {
		focus: 'Community engagement',
		description: 'Respond, participate, connect in communities'
	},
	friday: {
		focus: 'Pipeline review',
		description: 'Review leads, partners, opportunities'
	}
};

export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const timezone = 'America/Los_Angeles';
	const now = new Date();

	// Get current day of week
	const dayFormatter = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		weekday: 'long'
	});
	const currentDay = dayFormatter.format(now).toLowerCase();

	// Get week number
	const weekNumber = getWeekNumber(now, timezone);

	// Get start and end of current week
	const weekStart = getStartOfWeek(now, timezone);
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekEnd.getDate() + 7);

	// Query posts for this week
	const result = await db
		.prepare(
			`SELECT id, scheduled_for, status, content
			 FROM social_posts
			 WHERE scheduled_for >= ? AND scheduled_for < ?
			   AND (status = 'posted' OR status = 'pending')
			 ORDER BY scheduled_for ASC`
		)
		.bind(weekStart.getTime(), weekEnd.getTime())
		.all<{
			id: string;
			scheduled_for: number;
			status: string;
			content: string;
		}>();

	const posts = result.results || [];

	// Map posts to days
	const postsByDay = new Map<string, { id: string; status: string; content: string }>();
	for (const post of posts) {
		const postDate = new Date(post.scheduled_for);
		const postDay = dayFormatter.format(postDate).toLowerCase();
		postsByDay.set(postDay, {
			id: post.id,
			status: post.status,
			content: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '')
		});
	}

	// Build rhythm status
	const rhythm: Record<string, DayRhythm> = {};
	const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
	const currentDayIndex = dayOrder.indexOf(currentDay);

	let completedDays = 0;

	for (let i = 0; i < dayOrder.length; i++) {
		const day = dayOrder[i];
		const rhythmDef = WEEKLY_RHYTHM[day];
		const post = postsByDay.get(day);

		let status: DayRhythm['status'];

		if (post) {
			if (post.status === 'posted') {
				status = 'complete';
				completedDays++;
			} else {
				status = i === currentDayIndex ? 'in_progress' : 'pending';
			}
		} else {
			// No post for this day
			if (i < currentDayIndex) {
				status = 'missed';
			} else if (i === currentDayIndex) {
				status = 'in_progress';
			} else {
				status = 'pending';
			}
		}

		rhythm[day] = {
			focus: rhythmDef.focus,
			description: rhythmDef.description,
			status,
			...(post && { postId: post.id, content: post.content })
		};
	}

	// Calculate score
	const score = `${completedDays}/5`;

	// Generate recommendation
	let recommendation = '';
	const todaysRhythm = WEEKLY_RHYTHM[currentDay];

	if (currentDay === 'saturday' || currentDay === 'sunday') {
		recommendation = 'Weekend - no posting scheduled. Prepare for next week.';
	} else if (rhythm[currentDay]?.status === 'complete') {
		recommendation = `Today's focus (${todaysRhythm.focus}) is complete. Consider working ahead.`;
	} else if (rhythm[currentDay]?.status === 'in_progress') {
		recommendation = `Focus on: ${todaysRhythm.focus}. ${todaysRhythm.description}.`;
	} else {
		recommendation = `Today: ${todaysRhythm.focus}. ${todaysRhythm.description}.`;
	}

	// Count missed days
	const missedDays = Object.values(rhythm).filter((r) => r.status === 'missed').length;
	if (missedDays > 0) {
		recommendation += ` Note: ${missedDays} day(s) missed this week.`;
	}

	return json({
		week: weekNumber,
		dayOfWeek: currentDay,
		todaysFocus: todaysRhythm?.focus || 'Weekend',
		todaysDescription: todaysRhythm?.description || 'No posting scheduled',
		rhythm,
		score,
		completedDays,
		missedDays,
		recommendation
	});
};

// Helper functions

function getStartOfWeek(date: Date, timezone: string): Date {
	const d = new Date(date);
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		weekday: 'short'
	});

	while (formatter.format(d).toLowerCase() !== 'mon') {
		d.setDate(d.getDate() - 1);
	}

	d.setHours(0, 0, 0, 0);
	return d;
}

function getWeekNumber(date: Date, timezone: string): string {
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		year: 'numeric'
	});
	const year = formatter.format(date);

	const startOfYear = new Date(parseInt(year), 0, 1);
	const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
	const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);

	return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}
