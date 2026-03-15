/**
 * GET /api/social/status
 *
 * Get status of scheduled and posted content.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTokenStatus } from '$lib/social';

interface PostRow {
	id: string;
	platform: string;
	content: string;
	scheduled_for: number;
	timezone: string;
	status: string;
	post_id: string | null;
	post_url: string | null;
	error: string | null;
	campaign: string | null;
	thread_id: string | null;
	thread_index: number | null;
	thread_total: number | null;
	created_at: number;
	posted_at: number | null;
}

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env?.DB;
	const sessions = platform?.env?.SESSIONS;

	if (!db || !sessions) {
		return json({ error: 'Database or sessions not available' }, { status: 500 });
	}

	// Query params
	const status = url.searchParams.get('status'); // pending | posted | failed | all
	const campaign = url.searchParams.get('campaign');
	const threadId = url.searchParams.get('thread');
	const limit = parseInt(url.searchParams.get('limit') || '50', 10);

	// Build query
	let query = 'SELECT * FROM social_posts WHERE 1=1';
	const params: (string | number)[] = [];

	if (status && status !== 'all') {
		query += ' AND status = ?';
		params.push(status);
	}

	if (campaign) {
		query += ' AND campaign = ?';
		params.push(campaign);
	}

	if (threadId) {
		query += ' AND thread_id = ?';
		params.push(threadId);
	}

	query += ' ORDER BY scheduled_for DESC LIMIT ?';
	params.push(limit);

	const stmt = db.prepare(query);
	const result = await stmt.bind(...params).all<PostRow>();

	// Get token status
	const tokenStatus = await getTokenStatus(sessions);

	// Format posts for response
	const posts = result.results.map((post) => ({
		id: post.id,
		platform: post.platform,
		status: post.status,
		scheduledFor: new Date(post.scheduled_for).toISOString(),
		timezone: post.timezone,
		campaign: post.campaign,
		thread: post.thread_id
			? {
					id: post.thread_id,
					index: post.thread_index,
					total: post.thread_total
				}
			: null,
		preview: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
		postUrl: post.post_url,
		error: post.error,
		createdAt: new Date(post.created_at).toISOString(),
		postedAt: post.posted_at ? new Date(post.posted_at).toISOString() : null
	}));

	// Aggregate stats
	const statsResult = await db
		.prepare(
			`SELECT status, COUNT(*) as count FROM social_posts GROUP BY status`
		)
		.all<{ status: string; count: number }>();

	const stats: Record<string, number> = {};
	for (const row of statsResult.results) {
		stats[row.status] = row.count;
	}

	// Next scheduled
	const nextResult = await db
		.prepare(
			`SELECT * FROM social_posts
		 WHERE status = 'pending' AND scheduled_for > ?
		 ORDER BY scheduled_for ASC LIMIT 1`
		)
		.bind(Date.now())
		.first<PostRow>();

	const next = nextResult
		? {
				id: nextResult.id,
				scheduledFor: new Date(nextResult.scheduled_for).toISOString(),
				preview: nextResult.content.substring(0, 60) + '...'
			}
		: null;

	return json({
		tokenStatus: {
			connected: tokenStatus.connected,
			daysRemaining: tokenStatus.daysRemaining,
			expiresAt: tokenStatus.expiresAt,
			warning: tokenStatus.warning
		},
		stats,
		next,
		posts
	});
};
