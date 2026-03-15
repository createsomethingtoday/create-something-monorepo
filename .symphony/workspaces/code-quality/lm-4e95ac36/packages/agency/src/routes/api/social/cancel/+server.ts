/**
 * DELETE /api/social/cancel
 *
 * Cancel scheduled posts.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const postId = url.searchParams.get('id');
	const threadId = url.searchParams.get('thread');

	if (!postId && !threadId) {
		return json(
			{
				error: 'Missing id or thread parameter',
				usage: 'DELETE /api/social/cancel?id=sp_xxx or ?thread=thread_xxx'
			},
			{ status: 400 }
		);
	}

	let result: D1Result;

	if (threadId) {
		// Cancel entire thread
		result = await db
			.prepare(
				`UPDATE social_posts
			 SET status = 'cancelled'
			 WHERE thread_id = ? AND status = 'pending'`
			)
			.bind(threadId)
			.run();
	} else {
		// Cancel single post
		result = await db
			.prepare(
				`UPDATE social_posts
			 SET status = 'cancelled'
			 WHERE id = ? AND status = 'pending'`
			)
			.bind(postId)
			.run();
	}

	if (result.meta.changes === 0) {
		return json(
			{
				error: 'No pending posts found',
				message: threadId
					? `No pending posts in thread ${threadId}`
					: `Post ${postId} not found or already processed`
			},
			{ status: 404 }
		);
	}

	return json({
		success: true,
		cancelled: result.meta.changes,
		message: threadId
			? `Cancelled ${result.meta.changes} posts in thread ${threadId}`
			: `Cancelled post ${postId}`
	});
};
