import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getVideoComments,
	getCommentCount,
	createComment,
	updateComment,
	deleteComment
} from '$lib/server/db/comments';

/**
 * GET /api/videos/[id]/comments
 * Returns comments for a video with user info and nested replies
 */
export const GET: RequestHandler = async ({ params, platform, url }) => {
	const db = platform?.env.DB;

	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	const { id: videoId } = params;
	const limit = parseInt(url.searchParams.get('limit') ?? '50');
	const offset = parseInt(url.searchParams.get('offset') ?? '0');

	if (!videoId) {
		return json({ success: false, error: 'Video ID is required' }, { status: 400 });
	}

	try {
		const { comments, total } = await getVideoComments(db, videoId, limit, offset);

		return json({
			success: true,
			data: {
				comments,
				total,
				hasMore: offset + comments.length < total
			}
		});
	} catch (err) {
		console.error('Error fetching comments:', err);
		return json({ success: false, error: 'Failed to fetch comments' }, { status: 500 });
	}
};

/**
 * POST /api/videos/[id]/comments
 * Create a new comment (requires authentication)
 */
export const POST: RequestHandler = async ({ params, platform, request, locals }) => {
	const db = platform?.env.DB;

	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	const { id: videoId } = params;

	if (!videoId) {
		return json({ success: false, error: 'Video ID is required' }, { status: 400 });
	}

	// Check authentication
	const user = locals.user;
	if (!user) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	// Check membership
	if (!user.membership) {
		return json({ success: false, error: 'Membership required to comment' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const { content, parentId } = body as { content: string; parentId?: string };

		if (!content || typeof content !== 'string' || content.trim().length === 0) {
			return json({ success: false, error: 'Comment content is required' }, { status: 400 });
		}

		if (content.length > 2000) {
			return json({ success: false, error: 'Comment too long (max 2000 characters)' }, { status: 400 });
		}

		const comment = await createComment(db, videoId, user.id, content.trim(), parentId);

		return json({
			success: true,
			data: {
				...comment,
				user_name: user.name,
				user_email: user.email
			}
		}, { status: 201 });
	} catch (err) {
		console.error('Error creating comment:', err);
		return json({ success: false, error: 'Failed to create comment' }, { status: 500 });
	}
};

/**
 * PATCH /api/videos/[id]/comments
 * Update an existing comment (owner only)
 */
export const PATCH: RequestHandler = async ({ params, platform, request, locals }) => {
	const db = platform?.env.DB;

	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	// Check authentication
	const user = locals.user;
	if (!user) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { commentId, content } = body as { commentId: string; content: string };

		if (!commentId) {
			return json({ success: false, error: 'Comment ID is required' }, { status: 400 });
		}

		if (!content || typeof content !== 'string' || content.trim().length === 0) {
			return json({ success: false, error: 'Comment content is required' }, { status: 400 });
		}

		if (content.length > 2000) {
			return json({ success: false, error: 'Comment too long (max 2000 characters)' }, { status: 400 });
		}

		const updated = await updateComment(db, commentId, user.id, content.trim());

		if (!updated) {
			return json({ success: false, error: 'Comment not found or not authorized' }, { status: 404 });
		}

		return json({ success: true });
	} catch (err) {
		console.error('Error updating comment:', err);
		return json({ success: false, error: 'Failed to update comment' }, { status: 500 });
	}
};

/**
 * DELETE /api/videos/[id]/comments
 * Delete a comment (owner only)
 */
export const DELETE: RequestHandler = async ({ platform, request, locals }) => {
	const db = platform?.env.DB;

	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	// Check authentication
	const user = locals.user;
	if (!user) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { commentId } = body as { commentId: string };

		if (!commentId) {
			return json({ success: false, error: 'Comment ID is required' }, { status: 400 });
		}

		const deleted = await deleteComment(db, commentId, user.id);

		if (!deleted) {
			return json({ success: false, error: 'Comment not found or not authorized' }, { status: 404 });
		}

		return json({ success: true });
	} catch (err) {
		console.error('Error deleting comment:', err);
		return json({ success: false, error: 'Failed to delete comment' }, { status: 500 });
	}
};
