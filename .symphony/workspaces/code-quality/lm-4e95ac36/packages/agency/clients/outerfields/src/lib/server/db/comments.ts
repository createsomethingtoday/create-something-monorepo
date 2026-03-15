import type { D1Database } from '@cloudflare/workers-types';

export interface Comment {
	id: string;
	video_id: string;
	user_id: string;
	parent_id: string | null;
	content: string;
	created_at: number;
	updated_at: number;
}

export interface CommentWithUser extends Comment {
	user_name: string;
	user_email: string;
}

export interface CommentThread extends CommentWithUser {
	replies: CommentWithUser[];
}

/**
 * Get comments for a video with user info and nested replies
 */
export async function getVideoComments(
	db: D1Database,
	videoId: string,
	limit = 50,
	offset = 0
): Promise<{ comments: CommentThread[]; total: number }> {
	// Get top-level comments with user info
	const topLevel = await db
		.prepare(`
			SELECT c.*, u.name as user_name, u.email as user_email
			FROM comments c
			LEFT JOIN users u ON c.user_id = u.id
			WHERE c.video_id = ? AND c.parent_id IS NULL
			ORDER BY c.created_at DESC
			LIMIT ? OFFSET ?
		`)
		.bind(videoId, limit, offset)
		.all<CommentWithUser>();

	// Get total count
	const countResult = await db
		.prepare('SELECT COUNT(*) as count FROM comments WHERE video_id = ? AND parent_id IS NULL')
		.bind(videoId)
		.first<{ count: number }>();

	const total = countResult?.count ?? 0;

	if (!topLevel.results || topLevel.results.length === 0) {
		return { comments: [], total };
	}

	// Get all replies for these comments
	const parentIds = topLevel.results.map(c => c.id);
	const placeholders = parentIds.map(() => '?').join(',');
	
	const replies = await db
		.prepare(`
			SELECT c.*, u.name as user_name, u.email as user_email
			FROM comments c
			LEFT JOIN users u ON c.user_id = u.id
			WHERE c.parent_id IN (${placeholders})
			ORDER BY c.created_at ASC
		`)
		.bind(...parentIds)
		.all<CommentWithUser>();

	// Group replies by parent
	const repliesByParent = new Map<string, CommentWithUser[]>();
	for (const reply of replies.results || []) {
		if (!reply.parent_id) continue;
		const existing = repliesByParent.get(reply.parent_id) || [];
		existing.push(reply);
		repliesByParent.set(reply.parent_id, existing);
	}

	// Build threaded comments
	const comments: CommentThread[] = topLevel.results.map(comment => ({
		...comment,
		replies: repliesByParent.get(comment.id) || []
	}));

	return { comments, total };
}

/**
 * Get comment count for a video
 */
export async function getCommentCount(db: D1Database, videoId: string): Promise<number> {
	const result = await db
		.prepare('SELECT COUNT(*) as count FROM comments WHERE video_id = ?')
		.bind(videoId)
		.first<{ count: number }>();

	return result?.count ?? 0;
}

/**
 * Create a new comment
 */
export async function createComment(
	db: D1Database,
	videoId: string,
	userId: string,
	content: string,
	parentId?: string
): Promise<Comment> {
	const id = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
	const now = Math.floor(Date.now() / 1000);

	await db
		.prepare(`
			INSERT INTO comments (id, video_id, user_id, parent_id, content, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`)
		.bind(id, videoId, userId, parentId || null, content, now, now)
		.run();

	return {
		id,
		video_id: videoId,
		user_id: userId,
		parent_id: parentId || null,
		content,
		created_at: now,
		updated_at: now
	};
}

/**
 * Update a comment
 */
export async function updateComment(
	db: D1Database,
	commentId: string,
	userId: string,
	content: string
): Promise<boolean> {
	const now = Math.floor(Date.now() / 1000);

	const result = await db
		.prepare(`
			UPDATE comments 
			SET content = ?, updated_at = ?
			WHERE id = ? AND user_id = ?
		`)
		.bind(content, now, commentId, userId)
		.run();

	return result.meta.changes > 0;
}

/**
 * Delete a comment (and its replies)
 */
export async function deleteComment(
	db: D1Database,
	commentId: string,
	userId: string
): Promise<boolean> {
	// First delete replies
	await db
		.prepare('DELETE FROM comments WHERE parent_id = ?')
		.bind(commentId)
		.run();

	// Then delete the comment itself
	const result = await db
		.prepare('DELETE FROM comments WHERE id = ? AND user_id = ?')
		.bind(commentId, userId)
		.run();

	return result.meta.changes > 0;
}

/**
 * Get a single comment by ID
 */
export async function getCommentById(db: D1Database, commentId: string): Promise<Comment | null> {
	const result = await db
		.prepare('SELECT * FROM comments WHERE id = ?')
		.bind(commentId)
		.first<Comment>();

	return result || null;
}
