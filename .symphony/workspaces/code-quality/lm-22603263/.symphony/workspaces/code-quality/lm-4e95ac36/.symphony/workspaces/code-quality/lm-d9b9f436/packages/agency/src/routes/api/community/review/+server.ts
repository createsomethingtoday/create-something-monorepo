/**
 * Community Daily Review API
 * 
 * Your 5-minute morning review.
 * See what matters, approve what's ready, then disappear into deep work.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface Signal {
	id: string;
	platform: string;
	signal_type: string;
	author_name: string | null;
	author_handle: string | null;
	content: string;
	urgency: string;
	relevance_score: number;
	detected_at: string;
}

interface QueueItem {
	id: string;
	draft_content: string;
	draft_reasoning: string | null;
	action_type: string;
	platform: string;
	priority: number;
	signal_content?: string;
	signal_author?: string;
}

interface Relationship {
	id: string;
	platform: string;
	person_name: string | null;
	person_handle: string | null;
	person_company: string | null;
	warmth_score: number;
	lead_potential: string;
	last_interaction: string | null;
}

/**
 * GET /api/community/review
 * 
 * Get everything needed for the daily review:
 * - High-priority signals needing attention
 * - Drafted responses ready for approval
 * - Hot relationships to be aware of
 * - Summary stats
 */
export const GET: RequestHandler = async ({ platform }) => {
	const db = platform!.env.DB;
	
	try {
		// Get urgent/high signals from last 48 hours
		const signalsResult = await db.prepare(`
			SELECT id, platform, signal_type, author_name, author_handle, 
				   content, urgency, relevance_score, detected_at
			FROM community_signals 
			WHERE status = 'new'
			AND (urgency IN ('critical', 'high') OR relevance_score > 0.7)
			AND detected_at > datetime('now', '-48 hours')
			ORDER BY 
				CASE urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END,
				relevance_score DESC
			LIMIT 10
		`).all<Signal>();
		
		// Get pending responses
		const queueResult = await db.prepare(`
			SELECT 
				q.id, q.draft_content, q.draft_reasoning, q.action_type, 
				q.platform, q.priority,
				s.content as signal_content,
				s.author_name as signal_author
			FROM community_queue q
			LEFT JOIN community_signals s ON q.signal_id = s.id
			WHERE q.status = 'pending'
			AND (q.expires_at IS NULL OR q.expires_at > datetime('now'))
			ORDER BY q.priority DESC
			LIMIT 10
		`).all<QueueItem>();
		
		// Get hot/warming relationships
		const relationshipsResult = await db.prepare(`
			SELECT id, platform, person_name, person_handle, person_company,
				   warmth_score, lead_potential, last_interaction
			FROM community_relationships
			WHERE lead_potential IN ('hot', 'warm')
			AND last_interaction > datetime('now', '-7 days')
			ORDER BY warmth_score DESC
			LIMIT 5
		`).all<Relationship>();
		
		// Get summary stats
		const statsResult = await db.batch([
			db.prepare(`SELECT COUNT(*) as count FROM community_signals WHERE status = 'new'`),
			db.prepare(`SELECT COUNT(*) as count FROM community_queue WHERE status = 'pending'`),
			db.prepare(`SELECT COUNT(*) as count FROM community_relationships WHERE lead_potential = 'hot'`),
			db.prepare(`SELECT COUNT(*) as count FROM community_signals WHERE status = 'responded' AND reviewed_at > datetime('now', '-7 days')`),
		]);
		
		const stats = {
			new_signals: (statsResult[0].results[0] as { count: number })?.count || 0,
			pending_responses: (statsResult[1].results[0] as { count: number })?.count || 0,
			hot_leads: (statsResult[2].results[0] as { count: number })?.count || 0,
			responses_this_week: (statsResult[3].results[0] as { count: number })?.count || 0
		};
		
		// Calculate review time estimate (rough: 30s per signal, 20s per response)
		const estimatedMinutes = Math.ceil(
			(signalsResult.results.length * 0.5 + queueResult.results.length * 0.33)
		);
		
		return json({
			review: {
				urgent_signals: signalsResult.results,
				pending_responses: queueResult.results,
				active_relationships: relationshipsResult.results,
				stats,
				estimated_time: `${estimatedMinutes} min`,
				generated_at: new Date().toISOString()
			}
		});
	} catch (error) {
		console.error('Failed to generate review:', error);
		return json({ error: 'Failed to generate review' }, { status: 500 });
	}
};

interface ReviewAction {
	type: string;
	id: string;
	edited_content?: string;
}

interface ReviewPostBody {
	actions: ReviewAction[];
}

/**
 * POST /api/community/review
 * 
 * Batch process review actions
 * Approve/dismiss multiple items at once
 */
export const POST: RequestHandler = async ({ platform, request }) => {
	const db = platform!.env.DB;
	const body = await request.json() as ReviewPostBody;
	
	const { actions } = body;
	
	if (!actions || !Array.isArray(actions)) {
		return json({ error: 'Missing required field: actions (array)' }, { status: 400 });
	}
	
	const now = new Date().toISOString();
	const results: { id: string; success: boolean; error?: string }[] = [];
	
	for (const action of actions) {
		const { type, id, edited_content } = action;
		
		try {
			if (type === 'approve_response') {
				await db.prepare(`
					UPDATE community_queue 
					SET status = 'approved', approved_at = ?, approved_content = ?
					WHERE id = ?
				`).bind(now, edited_content || null, id).run();
				results.push({ id, success: true });
				
			} else if (type === 'reject_response') {
				await db.prepare(`
					UPDATE community_queue SET status = 'rejected' WHERE id = ?
				`).bind(id).run();
				results.push({ id, success: true });
				
			} else if (type === 'dismiss_signal') {
				await db.prepare(`
					UPDATE community_signals SET status = 'dismissed', reviewed_at = ? WHERE id = ?
				`).bind(now, id).run();
				results.push({ id, success: true });
				
			} else if (type === 'flag_signal') {
				// Flag for manual response later
				await db.prepare(`
					UPDATE community_signals SET status = 'reviewed', reviewed_at = ? WHERE id = ?
				`).bind(now, id).run();
				results.push({ id, success: true });
				
			} else {
				results.push({ id, success: false, error: `Unknown action type: ${type}` });
			}
		} catch (error) {
			results.push({ id, success: false, error: String(error) });
		}
	}
	
	const succeeded = results.filter(r => r.success).length;
	const failed = results.filter(r => !r.success).length;
	
	return json({
		processed: results.length,
		succeeded,
		failed,
		results
	});
};
