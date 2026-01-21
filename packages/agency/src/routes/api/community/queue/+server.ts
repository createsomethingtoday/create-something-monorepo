/**
 * Community Response Queue API
 * 
 * AI-drafted responses awaiting your 5-minute review.
 * Approve, edit, or dismiss — then back to deep work.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface QueueItem {
	id: string;
	signal_id: string | null;
	draft_content: string;
	draft_reasoning: string | null;
	tone: string;
	action_type: string;
	platform: string;
	target_url: string | null;
	priority: number;
	status: string;
	expires_at: string | null;
	approved_at: string | null;
	approved_content: string | null;
	sent_at: string | null;
	result: string | null;
	created_at: string;
	// Joined signal data
	signal_content?: string;
	signal_author?: string;
	signal_type?: string;
}

/**
 * GET /api/community/queue
 * 
 * Get pending responses for review
 */
export const GET: RequestHandler = async ({ platform, url }) => {
	const db = platform!.env.DB;
	
	const status = url.searchParams.get('status') || 'pending';
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
	
	try {
		const result = await db.prepare(`
			SELECT 
				q.*,
				s.content as signal_content,
				s.author_name as signal_author,
				s.signal_type
			FROM community_queue q
			LEFT JOIN community_signals s ON q.signal_id = s.id
			WHERE q.status = ?
			AND (q.expires_at IS NULL OR q.expires_at > datetime('now'))
			ORDER BY q.priority DESC, q.created_at ASC
			LIMIT ?
		`).bind(status, limit).all<QueueItem>();
		
		return json({
			queue: result.results,
			count: result.results.length,
			status
		});
	} catch (error) {
		console.error('Failed to fetch queue:', error);
		return json({ error: 'Failed to fetch queue' }, { status: 500 });
	}
};

interface QueuePostBody {
	signal_id?: string;
	draft_content: string;
	draft_reasoning?: string;
	tone?: string;
	action_type: string;
	platform: string;
	target_url?: string;
	priority?: number;
	expires_in_hours?: number;
}

/**
 * POST /api/community/queue
 * 
 * Add a drafted response to the queue (typically called by AI)
 */
export const POST: RequestHandler = async ({ platform, request }) => {
	const db = platform!.env.DB;
	const body = await request.json() as QueuePostBody;
	
	const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	
	const {
		signal_id,
		draft_content,
		draft_reasoning,
		tone = 'methodology',
		action_type,
		platform: targetPlatform,
		target_url,
		priority = 5,
		expires_in_hours
	} = body;
	
	if (!draft_content || !action_type || !targetPlatform) {
		return json(
			{ error: 'Missing required fields: draft_content, action_type, platform' },
			{ status: 400 }
		);
	}
	
	const expires_at = expires_in_hours 
		? new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString()
		: null;
	
	try {
		await db.prepare(`
			INSERT INTO community_queue (
				id, signal_id, draft_content, draft_reasoning, tone,
				action_type, platform, target_url, priority, status, expires_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
		`).bind(
			id,
			signal_id || null,
			draft_content,
			draft_reasoning || null,
			tone,
			action_type,
			targetPlatform,
			target_url || null,
			priority,
			expires_at
		).run();
		
		// If this is tied to a signal, update the signal status
		if (signal_id) {
			await db.prepare(`
				UPDATE community_signals SET status = 'queued' WHERE id = ?
			`).bind(signal_id).run();
		}
		
		return json({ id, status: 'created' }, { status: 201 });
	} catch (error) {
		console.error('Failed to queue response:', error);
		return json({ error: 'Failed to queue response' }, { status: 500 });
	}
};

interface QueuePatchBody {
	id: string;
	action: string;
	edited_content?: string;
	error?: string;
}

/**
 * PATCH /api/community/queue
 * 
 * Approve, edit, reject, or mark as sent
 */
export const PATCH: RequestHandler = async ({ platform, request }) => {
	const db = platform!.env.DB;
	const body = await request.json() as QueuePatchBody;
	
	const { id, action, edited_content } = body;
	
	if (!id || !action) {
		return json({ error: 'Missing required fields: id, action' }, { status: 400 });
	}
	
	const validActions = ['approve', 'reject', 'sent', 'failed'];
	if (!validActions.includes(action)) {
		return json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, { status: 400 });
	}
	
	try {
		const now = new Date().toISOString();
		
		if (action === 'approve') {
			await db.prepare(`
				UPDATE community_queue 
				SET status = 'approved', 
					approved_at = ?,
					approved_content = ?
				WHERE id = ?
			`).bind(now, edited_content || null, id).run();
			
		} else if (action === 'reject') {
			await db.prepare(`
				UPDATE community_queue SET status = 'rejected' WHERE id = ?
			`).bind(id).run();
			
			// Also update the linked signal
			await db.prepare(`
				UPDATE community_signals 
				SET status = 'dismissed' 
				WHERE id = (SELECT signal_id FROM community_queue WHERE id = ?)
			`).bind(id).run();
			
		} else if (action === 'sent') {
			await db.prepare(`
				UPDATE community_queue SET status = 'sent', sent_at = ? WHERE id = ?
			`).bind(now, id).run();
			
			// Update linked signal
			await db.prepare(`
				UPDATE community_signals 
				SET status = 'responded' 
				WHERE id = (SELECT signal_id FROM community_queue WHERE id = ?)
			`).bind(id).run();
			
		} else if (action === 'failed') {
			const { error: errorMsg } = body;
			await db.prepare(`
				UPDATE community_queue SET status = 'failed', result = ? WHERE id = ?
			`).bind(errorMsg || 'Unknown error', id).run();
		}
		
		return json({ id, action, updated: true });
	} catch (error) {
		console.error('Failed to update queue item:', error);
		return json({ error: 'Failed to update queue item' }, { status: 500 });
	}
};
