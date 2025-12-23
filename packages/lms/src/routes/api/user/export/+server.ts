/**
 * User Data Export API Route
 *
 * GDPR-compliant data export endpoint allowing users to download their data.
 *
 * GET /api/user/export (authenticated)
 * Returns JSON with user profile, analytics events, and session history.
 * Response as downloadable JSON file with Content-Disposition header.
 *
 * Canon: Your data belongs to you. Export it, take it, own it.
 */

import { error, type RequestEvent } from '@sveltejs/kit';

const IDENTITY_WORKER = 'https://id.createsomething.space';

interface UserProfile {
	id: string;
	email: string;
	email_verified: boolean;
	name?: string;
	avatar_url?: string;
	tier: 'free' | 'pro' | 'agency';
	created_at: string;
}

interface AnalyticsEvent {
	id: string;
	session_id: string;
	property: string;
	category: string;
	action: string;
	target: string | null;
	value: number | null;
	url: string;
	referrer: string | null;
	ip_country: string | null;
	metadata: string | null;
	created_at: string;
}

interface Session {
	id: string;
	property: string;
	started_at: string;
	ended_at: string | null;
	duration_seconds: number | null;
	page_views: number;
	interactions: number;
	entry_url: string | null;
	exit_url: string | null;
	referrer: string | null;
	ip_country: string | null;
}

interface LearnerProgress {
	path_progress: Array<{
		path_id: string;
		status: string;
		started_at: number | null;
		completed_at: number | null;
		current_lesson: string | null;
	}>;
	lesson_progress: Array<{
		path_id: string;
		lesson_id: string;
		status: string;
		started_at: number | null;
		completed_at: number | null;
		time_spent: number;
		visits: number;
	}>;
	praxis_attempts: Array<{
		praxis_id: string;
		status: string;
		score: number | null;
		started_at: number;
		submitted_at: number | null;
	}>;
	reflections: Array<{
		path_id: string | null;
		lesson_id: string | null;
		content: string;
		created_at: number;
	}>;
}

interface ExportData {
	export_metadata: {
		exported_at: string;
		format_version: string;
		data_retention_note: string;
	};
	profile: UserProfile;
	analytics: {
		events: AnalyticsEvent[];
		sessions: Session[];
		note: string;
	};
	learning: LearnerProgress;
}

interface ErrorResponse {
	error: string;
	message: string;
}

export const GET = async ({ cookies, platform }: RequestEvent) => {
	const accessToken = cookies.get('cs_access_token');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	// Get user ID from token
	const tokenPayload = parseJWT(accessToken);
	if (!tokenPayload?.sub) {
		throw error(401, 'Invalid token');
	}

	const userId = tokenPayload.sub;

	// Fetch user profile from Identity Worker
	const profileResponse = await fetch(`${IDENTITY_WORKER}/v1/users/me`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!profileResponse.ok) {
		const errData = (await profileResponse.json()) as ErrorResponse;
		throw error(profileResponse.status, errData.message || 'Failed to fetch profile');
	}

	const profile = (await profileResponse.json()) as UserProfile;

	// Get database for local data
	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	// Calculate date 90 days ago for analytics filter
	const ninetyDaysAgo = new Date();
	ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
	const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().slice(0, 19).replace('T', ' ');

	// Fetch analytics events (last 90 days)
	const eventsResult = await db
		.prepare(
			`SELECT id, session_id, property, category, action, target, value, url, referrer, ip_country, metadata, created_at
       FROM unified_events
       WHERE user_id = ? AND created_at >= ?
       ORDER BY created_at DESC
       LIMIT 10000`
		)
		.bind(userId, ninetyDaysAgoStr)
		.all();

	const events = (eventsResult.results || []) as unknown as AnalyticsEvent[];

	// Fetch session history (last 90 days)
	const sessionsResult = await db
		.prepare(
			`SELECT id, property, started_at, ended_at, duration_seconds, page_views, interactions, entry_url, exit_url, referrer, ip_country
       FROM unified_sessions
       WHERE user_id = ? AND started_at >= ?
       ORDER BY started_at DESC
       LIMIT 1000`
		)
		.bind(userId, ninetyDaysAgoStr)
		.all();

	const sessions = (sessionsResult.results || []) as unknown as Session[];

	// Fetch learning progress data
	// First, get learner record by email or user_id
	const learnerResult = await db
		.prepare(`SELECT id FROM learners WHERE id = ? OR email = ?`)
		.bind(userId, profile.email)
		.first();

	let learningProgress: LearnerProgress = {
		path_progress: [],
		lesson_progress: [],
		praxis_attempts: [],
		reflections: [],
	};

	if (learnerResult?.id) {
		const learnerId = learnerResult.id as string;

		// Path progress
		const pathProgressResult = await db
			.prepare(
				`SELECT path_id, status, started_at, completed_at, current_lesson
         FROM path_progress WHERE learner_id = ?`
			)
			.bind(learnerId)
			.all();
		learningProgress.path_progress = (pathProgressResult.results || []) as typeof learningProgress.path_progress;

		// Lesson progress
		const lessonProgressResult = await db
			.prepare(
				`SELECT path_id, lesson_id, status, started_at, completed_at, time_spent, visits
         FROM lesson_progress WHERE learner_id = ?`
			)
			.bind(learnerId)
			.all();
		learningProgress.lesson_progress = (lessonProgressResult.results || []) as typeof learningProgress.lesson_progress;

		// Praxis attempts (exclude submission content for size)
		const praxisResult = await db
			.prepare(
				`SELECT praxis_id, status, score, started_at, submitted_at
         FROM praxis_attempts WHERE learner_id = ?`
			)
			.bind(learnerId)
			.all();
		learningProgress.praxis_attempts = (praxisResult.results || []) as typeof learningProgress.praxis_attempts;

		// Reflections
		const reflectionsResult = await db
			.prepare(
				`SELECT path_id, lesson_id, content, created_at
         FROM reflections WHERE learner_id = ?`
			)
			.bind(learnerId)
			.all();
		learningProgress.reflections = (reflectionsResult.results || []) as typeof learningProgress.reflections;
	}

	// Construct export data
	const exportData: ExportData = {
		export_metadata: {
			exported_at: new Date().toISOString(),
			format_version: '1.0',
			data_retention_note: 'Analytics events shown are from the last 90 days. Older events may have been automatically purged.',
		},
		profile: {
			id: profile.id,
			email: profile.email,
			email_verified: profile.email_verified,
			name: profile.name,
			avatar_url: profile.avatar_url,
			tier: profile.tier,
			created_at: profile.created_at,
		},
		analytics: {
			events,
			sessions,
			note: `Contains ${events.length} events and ${sessions.length} sessions from the last 90 days.`,
		},
		learning: learningProgress,
	};

	// Return as downloadable JSON file
	const jsonContent = JSON.stringify(exportData, null, 2);
	const filename = `createsomething-data-export-${new Date().toISOString().slice(0, 10)}.json`;

	return new Response(jsonContent, {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'no-store',
		},
	});
};

/**
 * Parse JWT payload without verification (we trust the Identity Worker already validated it)
 */
function parseJWT(token: string): { sub?: string; email?: string } | null {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return null;
		const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
		return payload;
	} catch {
		return null;
	}
}
