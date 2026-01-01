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
	getTokenStatus,
	checkScheduleConflicts,
	suggestConflictFreeStartDate
} from '$lib/social';
import type { PostingMode, ScheduleConflict } from '$lib/social';

interface ScheduleRequest {
	platform: 'linkedin';
	content: string; // Content file name (e.g., 'kickstand') OR raw text
	mode?: PostingMode;
	timezone?: string;
	startDate?: string; // ISO date string
	dryRun?: boolean;
	forceSchedule?: boolean; // Override conflict detection
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
		dryRun = false,
		forceSchedule = false
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

	// Parse and validate startDate
	let parsedStartDate: Date | undefined;
	let dateAdjusted = false;

	if (startDate) {
		parsedStartDate = new Date(startDate);

		// Check if the parsed date is in the past
		const now = new Date();
		if (parsedStartDate <= now) {
			dateAdjusted = true;
			console.warn(
				`[Schedule API] Requested startDate ${startDate} parsed to past date ` +
				`${parsedStartDate.toISOString()}. Will auto-adjust to future.`
			);
		}
	}

	// Generate schedule
	const schedule = generateSchedule(postsToSchedule.length, {
		timezone,
		mode,
		startDate: parsedStartDate
	});

	const threadId = generateThreadId();
	const now = Date.now();

	// Check for conflicts with existing pending posts (skip for immediate mode)
	let conflictResult: { hasConflicts: boolean; conflicts: ScheduleConflict[]; message: string } = {
		hasConflicts: false,
		conflicts: [],
		message: ''
	};
	let suggestedStartDate: string | undefined;

	if (mode !== 'immediate') {
		// Get the date range we're scheduling into
		const minDate = Math.min(...schedule.map((d) => d.getTime()));
		const maxDate = Math.max(...schedule.map((d) => d.getTime()));

		// Query for existing pending posts in this range (with buffer)
		const bufferDays = 7 * 24 * 60 * 60 * 1000; // 7 days buffer
		const existingResult = await db
			.prepare(
				`SELECT id, scheduled_for, thread_id, thread_index, content
				 FROM social_posts
				 WHERE status = 'pending'
				   AND scheduled_for >= ?
				   AND scheduled_for <= ?
				 ORDER BY scheduled_for ASC`
			)
			.bind(minDate - bufferDays, maxDate + bufferDays)
			.all();

		const existingPosts = (existingResult.results || []) as Array<{
			id: string;
			scheduled_for: number;
			thread_id: string | null;
			thread_index: number | null;
			content: string;
		}>;

		conflictResult = checkScheduleConflicts(schedule, existingPosts, timezone);

		if (conflictResult.hasConflicts) {
			// Calculate a conflict-free start date
			const allPendingResult = await db
				.prepare(`SELECT scheduled_for FROM social_posts WHERE status = 'pending'`)
				.all();
			const allPending = (allPendingResult.results || []) as Array<{ scheduled_for: number }>;

			const suggested = suggestConflictFreeStartDate(allPending, postsToSchedule.length, timezone);
			suggestedStartDate = suggested.toISOString().split('T')[0];
		}
	}

	// Prepare preview
	const preview = formatSchedulePreview(schedule, postsToSchedule, timezone);

	if (dryRun) {
		const dryRunResponse: Record<string, unknown> = {
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
			conflicts: conflictResult.hasConflicts
				? {
						detected: true,
						count: conflictResult.conflicts.length,
						message: conflictResult.message,
						details: conflictResult.conflicts,
						suggestedStartDate
					}
				: { detected: false },
			scheduled: preview.map((p, i) => ({
				...p,
				fullContent: postsToSchedule[i].content,
				hasCommentLink: !!postsToSchedule[i].commentLink
			}))
		};

		// Add warning if date was adjusted from past to future
		if (dateAdjusted) {
			dryRunResponse.dateAdjusted = {
				originalRequest: startDate,
				message: `Requested date "${startDate}" was in the past. Automatically adjusted to next optimal time.`,
				adjustedTo: schedule[0]?.toISOString()
			};
		}

		return json(dryRunResponse);
	}

	// Block scheduling if conflicts exist (unless forceSchedule is true)
	if (conflictResult.hasConflicts && !forceSchedule) {
		return json(
			{
				error: 'Schedule conflicts detected',
				message: conflictResult.message,
				conflicts: conflictResult.conflicts,
				suggestedStartDate,
				hint: 'Use startDate parameter to schedule after existing posts, or set forceSchedule: true to override'
			},
			{ status: 409 }
		);
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

	const response: Record<string, unknown> = {
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
	};

	// Add warning if conflicts were overridden
	if (conflictResult.hasConflicts && forceSchedule) {
		response.warning = {
			message: 'Scheduled despite conflicts (forceSchedule=true)',
			conflicts: conflictResult.conflicts.length,
			note: 'LinkedIn may penalize multiple posts on the same day'
		};
	}

	// Add warning if date was adjusted from past to future
	if (dateAdjusted) {
		response.dateAdjusted = {
			originalRequest: startDate,
			message: `Requested date "${startDate}" was in the past. Automatically adjusted to next optimal time.`,
			adjustedTo: schedule[0]?.toISOString()
		};
	}

	return json(response);
};
