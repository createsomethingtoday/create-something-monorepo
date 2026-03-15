/**
 * Admin Community Dashboard - Server
 * 
 * Your 5-minute daily review.
 * See what matters. Approve what's ready. Back to deep work.
 */
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

interface Signal {
	id: string;
	platform: string;
	signal_type: string;
	author_name: string | null;
	author_handle: string | null;
	author_followers: number | null;
	content: string;
	urgency: string;
	relevance_score: number;
	detected_at: string;
	source_url: string | null;
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
	target_url?: string;
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
	interactions_count: number;
}

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform!.env.DB;
	
	try {
		// Get urgent signals
		const signalsResult = await db.prepare(`
			SELECT id, platform, signal_type, author_name, author_handle, 
				   author_followers, content, urgency, relevance_score, 
				   detected_at, source_url
			FROM community_signals 
			WHERE status = 'new'
			ORDER BY 
				CASE urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
				relevance_score DESC,
				detected_at DESC
			LIMIT 20
		`).all<Signal>();
		
		// Get pending responses
		const queueResult = await db.prepare(`
			SELECT 
				q.id, q.draft_content, q.draft_reasoning, q.action_type, 
				q.platform, q.priority, q.target_url,
				s.content as signal_content,
				s.author_name as signal_author
			FROM community_queue q
			LEFT JOIN community_signals s ON q.signal_id = s.id
			WHERE q.status = 'pending'
			AND (q.expires_at IS NULL OR q.expires_at > datetime('now'))
			ORDER BY q.priority DESC
			LIMIT 20
		`).all<QueueItem>();
		
		// Get hot relationships
		const relationshipsResult = await db.prepare(`
			SELECT id, platform, person_name, person_handle, person_company,
				   warmth_score, lead_potential, last_interaction, interactions_count
			FROM community_relationships
			WHERE warmth_score > 0.2
			ORDER BY warmth_score DESC
			LIMIT 10
		`).all<Relationship>();
		
		// Get stats
		const statsResult = await db.batch([
			db.prepare(`SELECT COUNT(*) as count FROM community_signals WHERE status = 'new'`),
			db.prepare(`SELECT COUNT(*) as count FROM community_queue WHERE status = 'pending'`),
			db.prepare(`SELECT COUNT(*) as count FROM community_relationships WHERE lead_potential = 'hot'`),
			db.prepare(`SELECT COUNT(*) as count FROM community_signals WHERE status = 'responded' AND reviewed_at > datetime('now', '-7 days')`),
			db.prepare(`SELECT COUNT(*) as count FROM community_signals WHERE status = 'dismissed' AND reviewed_at > datetime('now', '-7 days')`),
		]);
		
		const stats = {
			new_signals: (statsResult[0].results[0] as { count: number })?.count || 0,
			pending_responses: (statsResult[1].results[0] as { count: number })?.count || 0,
			hot_leads: (statsResult[2].results[0] as { count: number })?.count || 0,
			responses_this_week: (statsResult[3].results[0] as { count: number })?.count || 0,
			dismissed_this_week: (statsResult[4].results[0] as { count: number })?.count || 0
		};
		
		return {
			signals: signalsResult.results,
			queue: queueResult.results,
			relationships: relationshipsResult.results,
			stats,
			generatedAt: new Date().toISOString()
		};
	} catch (error) {
		console.error('Failed to load community dashboard:', error);
		return {
			signals: [],
			queue: [],
			relationships: [],
			stats: {
				new_signals: 0,
				pending_responses: 0,
				hot_leads: 0,
				responses_this_week: 0,
				dismissed_this_week: 0
			},
			generatedAt: new Date().toISOString(),
			error: 'Failed to load data'
		};
	}
};

export const actions: Actions = {
	approve: async ({ request, platform }) => {
		const db = platform!.env.DB;
		const data = await request.formData();
		const id = data.get('id') as string;
		const editedContent = data.get('edited_content') as string | null;
		
		if (!id) {
			return fail(400, { error: 'Missing queue item ID' });
		}
		
		try {
			await db.prepare(`
				UPDATE community_queue 
				SET status = 'approved', 
					approved_at = ?,
					approved_content = ?
				WHERE id = ?
			`).bind(new Date().toISOString(), editedContent || null, id).run();
			
			return { success: true, action: 'approved', id };
		} catch (error) {
			return fail(500, { error: 'Failed to approve response' });
		}
	},
	
	reject: async ({ request, platform }) => {
		const db = platform!.env.DB;
		const data = await request.formData();
		const id = data.get('id') as string;
		
		if (!id) {
			return fail(400, { error: 'Missing queue item ID' });
		}
		
		try {
			await db.prepare(`
				UPDATE community_queue SET status = 'rejected' WHERE id = ?
			`).bind(id).run();
			
			await db.prepare(`
				UPDATE community_signals 
				SET status = 'dismissed' 
				WHERE id = (SELECT signal_id FROM community_queue WHERE id = ?)
			`).bind(id).run();
			
			return { success: true, action: 'rejected', id };
		} catch (error) {
			return fail(500, { error: 'Failed to reject response' });
		}
	},
	
	dismiss: async ({ request, platform }) => {
		const db = platform!.env.DB;
		const data = await request.formData();
		const id = data.get('id') as string;
		
		if (!id) {
			return fail(400, { error: 'Missing signal ID' });
		}
		
		try {
			await db.prepare(`
				UPDATE community_signals 
				SET status = 'dismissed', reviewed_at = ?
				WHERE id = ?
			`).bind(new Date().toISOString(), id).run();
			
			return { success: true, action: 'dismissed', id };
		} catch (error) {
			return fail(500, { error: 'Failed to dismiss signal' });
		}
	},
	
	flag: async ({ request, platform }) => {
		const db = platform!.env.DB;
		const data = await request.formData();
		const id = data.get('id') as string;
		
		if (!id) {
			return fail(400, { error: 'Missing signal ID' });
		}
		
		try {
			await db.prepare(`
				UPDATE community_signals 
				SET status = 'reviewed', reviewed_at = ?
				WHERE id = ?
			`).bind(new Date().toISOString(), id).run();
			
			return { success: true, action: 'flagged', id };
		} catch (error) {
			return fail(500, { error: 'Failed to flag signal' });
		}
	}
};
