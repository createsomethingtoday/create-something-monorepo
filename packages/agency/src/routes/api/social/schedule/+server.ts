/**
 * POST /api/social/schedule
 *
 * Schedule a thread for LinkedIn posting.
 * Supports drip (1/day), longform (consolidated), or immediate modes.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile } from 'fs/promises';
import { join } from 'path';
import {
	parseThread,
	formatPostForLinkedIn,
	consolidateToLongForm,
	generateSchedule,
	generatePostId,
	generateThreadId,
	formatSchedulePreview,
	getTokenStatus
} from '$lib/social';
import type { PostingMode } from '$lib/social';

interface ScheduleRequest {
	platform: 'linkedin';
	content: string; // Content file name (e.g., 'kickstand') OR raw text
	mode?: PostingMode;
	timezone?: string;
	startDate?: string; // ISO date string
	dryRun?: boolean;
}

interface ScheduledPostRow {
	id: string;
	platform: string;
	content: string;
	scheduled_for: number;
	timezone: string;
	status: string;
	campaign: string | null;
	thread_id: string | null;
	thread_index: number | null;
	thread_total: number | null;
	created_at: number;
	metadata: string | null;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;
	const sessions = platform?.env?.SESSIONS;

	if (!db || !sessions) {
		return json({ error: 'Database or sessions not available' }, { status: 500 });
	}

	// Parse request first to check for dryRun before token check
	let body: ScheduleRequest;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const {
		platform: targetPlatform,
		content,
		mode = 'drip',
		timezone = 'America/Los_Angeles',
		startDate,
		dryRun = false
	} = body;

	// Check LinkedIn token status - only block if not a dry run
	const tokenStatus = await getTokenStatus(sessions);
	const tokenWarning = !tokenStatus.connected
		? 'LinkedIn not connected. Authenticate at https://createsomething.io/api/linkedin/auth before scheduling.'
		: tokenStatus.warning;

	if (!tokenStatus.connected && !dryRun) {
		return json(
			{
				error: 'LinkedIn not connected',
				message: 'Visit /api/linkedin/auth on createsomething.io to connect',
				authUrl: 'https://createsomething.io/api/linkedin/auth'
			},
			{ status: 401 }
		);
	}

	if (tokenStatus.warning) {
		console.warn('LinkedIn token warning:', tokenStatus.warning);
	}

	if (targetPlatform !== 'linkedin') {
		return json(
			{
				error: 'Unsupported platform',
				message: 'Currently only LinkedIn is supported',
				supported: ['linkedin']
			},
			{ status: 400 }
		);
	}

	if (!content) {
		return json({ error: 'Missing content field' }, { status: 400 });
	}

	// Try to load content from file first
	let markdown: string;
	let campaign: string | undefined;

	if (content.length < 100 && !content.includes('\n')) {
		// Looks like a filename
		try {
			// In production, content files would be in a known location
			// For now, we expect the full path or content directly
			const contentPath = join(
				process.cwd(),
				'content',
				'social',
				`linkedin-thread-${content}.md`
			);
			markdown = await readFile(contentPath, 'utf-8');
			campaign = content;
		} catch {
			// Not a file, treat as raw content
			markdown = content;
		}
	} else {
		markdown = content;
	}

	// Parse the thread
	const thread = parseThread(markdown);

	if (thread.posts.length === 0) {
		return json(
			{
				error: 'No posts found in content',
				message: 'Content should have ### Tweet N or ### Post N sections'
			},
			{ status: 400 }
		);
	}

	// Apply mode
	let postsToSchedule: { content: string; commentLink?: string }[];

	if (mode === 'longform') {
		const consolidated = consolidateToLongForm(thread);
		const { postContent, commentContent } = formatPostForLinkedIn(consolidated, {
			includeNumbering: false,
			includeHashtags: true,
			extractLinkToComment: true
		});
		postsToSchedule = [{ content: postContent, commentLink: commentContent }];
	} else {
		postsToSchedule = thread.posts.map((post) => {
			const { postContent, commentContent } = formatPostForLinkedIn(post, {
				includeNumbering: mode !== 'immediate', // Number drip posts
				includeHashtags: post.index === post.total,
				extractLinkToComment: true
			});
			return { content: postContent, commentLink: commentContent };
		});
	}

	// Generate schedule
	const schedule = generateSchedule(postsToSchedule.length, {
		timezone,
		mode,
		startDate: startDate ? new Date(startDate) : undefined
	});

	const threadId = generateThreadId();
	const now = Date.now();

	// Prepare preview
	const preview = formatSchedulePreview(schedule, postsToSchedule, timezone);

	if (dryRun) {
		return json({
			dryRun: true,
			mode,
			timezone,
			threadId,
			totalPosts: postsToSchedule.length,
			tokenStatus: {
				connected: tokenStatus.connected,
				daysRemaining: tokenStatus.daysRemaining,
				warning: tokenWarning
			},
			scheduled: preview.map((p, i) => ({
				...p,
				fullContent: postsToSchedule[i].content,
				hasCommentLink: !!postsToSchedule[i].commentLink
			}))
		});
	}

	// Insert into D1
	const insertedPosts: { id: string; scheduledFor: string; preview: string }[] = [];

	for (let i = 0; i < postsToSchedule.length; i++) {
		const postId = generatePostId();
		const post = postsToSchedule[i];
		const scheduledFor = schedule[i];

		const metadata = post.commentLink ? JSON.stringify({ commentLink: post.commentLink }) : null;

		await db
			.prepare(
				`INSERT INTO social_posts
			(id, platform, content, scheduled_for, timezone, status, campaign, thread_id, thread_index, thread_total, created_at, metadata)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				postId,
				'linkedin',
				post.content,
				scheduledFor.getTime(),
				timezone,
				'pending',
				campaign || null,
				threadId,
				i + 1,
				postsToSchedule.length,
				now,
				metadata
			)
			.run();

		insertedPosts.push({
			id: postId,
			scheduledFor: preview[i].scheduledFor,
			preview: preview[i].preview
		});
	}

	return json({
		success: true,
		mode,
		timezone,
		threadId,
		totalPosts: postsToSchedule.length,
		tokenStatus: {
			connected: tokenStatus.connected,
			daysRemaining: tokenStatus.daysRemaining,
			warning: tokenStatus.warning
		},
		scheduled: insertedPosts
	});
};
