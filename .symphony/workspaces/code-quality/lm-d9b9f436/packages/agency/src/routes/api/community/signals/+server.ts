/**
 * Community Signals API
 * 
 * Inbound monitoring: mentions, conversations, opportunities.
 * The agent watches; you decide what matters.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface Signal {
	id: string;
	platform: string;
	signal_type: string;
	source_url: string | null;
	source_id: string | null;
	author_id: string | null;
	author_name: string | null;
	author_handle: string | null;
	author_followers: number | null;
	content: string;
	context: string | null;
	relevance_score: number;
	urgency: string;
	status: string;
	detected_at: string;
	reviewed_at: string | null;
	metadata: string | null;
}

/**
 * GET /api/community/signals
 * 
 * Retrieve signals, optionally filtered by status, platform, urgency
 */
export const GET: RequestHandler = async ({ platform, url }) => {
	const db = platform!.env.DB;
	
	const status = url.searchParams.get('status') || 'new';
	const platformFilter = url.searchParams.get('platform');
	const urgency = url.searchParams.get('urgency');
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
	
	let query = `
		SELECT * FROM community_signals 
		WHERE status = ?
	`;
	const params: (string | number)[] = [status];
	
	if (platformFilter) {
		query += ` AND platform = ?`;
		params.push(platformFilter);
	}
	
	if (urgency) {
		query += ` AND urgency = ?`;
		params.push(urgency);
	}
	
	query += ` ORDER BY 
		CASE urgency 
			WHEN 'critical' THEN 1 
			WHEN 'high' THEN 2 
			WHEN 'medium' THEN 3 
			ELSE 4 
		END,
		relevance_score DESC,
		detected_at DESC
		LIMIT ?`;
	params.push(limit);
	
	try {
		const result = await db.prepare(query).bind(...params).all<Signal>();
		
		// Parse metadata JSON for each signal
		const signals = result.results.map(s => ({
			...s,
			metadata: s.metadata ? JSON.parse(s.metadata) : null
		}));
		
		return json({
			signals,
			count: signals.length,
			filters: { status, platform: platformFilter, urgency }
		});
	} catch (error) {
		console.error('Failed to fetch signals:', error);
		return json({ error: 'Failed to fetch signals' }, { status: 500 });
	}
};

interface SignalPostBody {
	platform: string;
	signal_type: string;
	content: string;
	source_url?: string;
	source_id?: string;
	author_id?: string;
	author_name?: string;
	author_handle?: string;
	author_followers?: number;
	context?: string;
	relevance_score?: number;
	urgency?: string;
	metadata?: Record<string, unknown>;
}

/**
 * POST /api/community/signals
 * 
 * Record a new signal (typically called by monitors)
 */
export const POST: RequestHandler = async ({ platform, request }) => {
	const db = platform!.env.DB;
	const body = await request.json() as SignalPostBody;
	
	const id = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	
	const {
		platform: signalPlatform,
		signal_type,
		source_url,
		source_id,
		author_id,
		author_name,
		author_handle,
		author_followers,
		content,
		context,
		relevance_score = 0.5,
		urgency = 'low',
		metadata
	} = body;
	
	if (!signalPlatform || !signal_type || !content) {
		return json(
			{ error: 'Missing required fields: platform, signal_type, content' },
			{ status: 400 }
		);
	}
	
	try {
		await db.prepare(`
			INSERT INTO community_signals (
				id, platform, signal_type, source_url, source_id,
				author_id, author_name, author_handle, author_followers,
				content, context, relevance_score, urgency, status,
				detected_at, metadata
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
		`).bind(
			id,
			signalPlatform,
			signal_type,
			source_url || null,
			source_id || null,
			author_id || null,
			author_name || null,
			author_handle || null,
			author_followers || null,
			content,
			context || null,
			relevance_score,
			urgency,
			new Date().toISOString(),
			metadata ? JSON.stringify(metadata) : null
		).run();
		
		return json({ id, status: 'created' }, { status: 201 });
	} catch (error) {
		console.error('Failed to create signal:', error);
		return json({ error: 'Failed to create signal' }, { status: 500 });
	}
};

interface SignalPatchBody {
	id: string;
	status: string;
	notes?: string;
}

/**
 * PATCH /api/community/signals
 * 
 * Update signal status (review, dismiss, etc.)
 */
export const PATCH: RequestHandler = async ({ platform, request }) => {
	const db = platform!.env.DB;
	const body = await request.json() as SignalPatchBody;
	
	const { id, status, notes } = body;
	
	if (!id || !status) {
		return json({ error: 'Missing required fields: id, status' }, { status: 400 });
	}
	
	const validStatuses = ['new', 'reviewed', 'queued', 'dismissed', 'responded'];
	if (!validStatuses.includes(status)) {
		return json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
	}
	
	try {
		await db.prepare(`
			UPDATE community_signals 
			SET status = ?, reviewed_at = ?
			WHERE id = ?
		`).bind(status, new Date().toISOString(), id).run();
		
		return json({ id, status, updated: true });
	} catch (error) {
		console.error('Failed to update signal:', error);
		return json({ error: 'Failed to update signal' }, { status: 500 });
	}
};
