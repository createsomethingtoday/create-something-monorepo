/**
 * Content Ideas Pipeline API
 * 
 * AI-native idea management:
 * - Agents discover ideas from research/signals
 * - Ideas flow through: discovered → researched → drafted → scheduled
 * - Human reviews at key gates
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface Idea {
	id: string;
	source: string;
	source_id: string | null;
	title: string;
	description: string | null;
	target_audience: string | null;
	pillar: string | null;
	format: string | null;
	status: string;
	priority: number;
	research_notes: string | null;
	draft_content: string | null;
	best_day: string | null;
	tags: string | null;
	created_at: string;
	created_by: string | null;
}

/**
 * GET /api/content/ideas
 * 
 * Get ideas from the pipeline, filtered by status/pillar
 */
export const GET: RequestHandler = async ({ platform, url }) => {
	const db = platform!.env.DB;
	
	const status = url.searchParams.get('status');
	const pillar = url.searchParams.get('pillar');
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
	
	let query = 'SELECT * FROM content_ideas WHERE 1=1';
	const params: (string | number)[] = [];
	
	if (status) {
		query += ' AND status = ?';
		params.push(status);
	}
	
	if (pillar) {
		query += ' AND pillar = ?';
		params.push(pillar);
	}
	
	query += ' ORDER BY priority DESC, created_at DESC LIMIT ?';
	params.push(limit);
	
	try {
		const result = await db.prepare(query).bind(...params).all<Idea>();
		
		// Parse JSON fields
		const ideas = result.results.map(idea => ({
			...idea,
			tags: idea.tags ? JSON.parse(idea.tags) : []
		}));
		
		// Get pipeline stats
		const statsResult = await db.prepare(`
			SELECT status, COUNT(*) as count FROM content_ideas GROUP BY status
		`).all<{ status: string; count: number }>();
		
		const stats = Object.fromEntries(
			statsResult.results.map(r => [r.status, r.count])
		);
		
		return json({
			ideas,
			count: ideas.length,
			pipeline: stats
		});
	} catch (error) {
		console.error('Failed to fetch ideas:', error);
		return json({ error: 'Failed to fetch ideas' }, { status: 500 });
	}
};

interface CreateIdeaBody {
	title: string;
	description?: string;
	source: 'research' | 'signal' | 'manual' | 'agent' | 'community';
	source_id?: string;
	pillar?: string;
	format?: string;
	target_audience?: string;
	priority?: number;
	tags?: string[];
	created_by?: string;
}

/**
 * POST /api/content/ideas
 * 
 * Create a new content idea
 */
export const POST: RequestHandler = async ({ platform, request }) => {
	const db = platform!.env.DB;
	const body = await request.json() as CreateIdeaBody;
	
	const {
		title,
		description,
		source,
		source_id,
		pillar,
		format,
		target_audience,
		priority = 5,
		tags,
		created_by = 'agent'
	} = body;
	
	if (!title || !source) {
		return json({ error: 'Missing required fields: title, source' }, { status: 400 });
	}
	
	const id = `idea_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	
	// Determine best day based on pillar
	const pillarToDayMap: Record<string, string> = {
		methodology: 'monday',
		case_study: 'tuesday',
		industry: 'wednesday',
		behind_scenes: 'thursday',
		value_share: 'friday'
	};
	const best_day = pillar ? pillarToDayMap[pillar] || null : null;
	
	try {
		await db.prepare(`
			INSERT INTO content_ideas (
				id, title, description, source, source_id, pillar, format,
				target_audience, priority, best_day, tags, created_by, status
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'discovered')
		`).bind(
			id,
			title,
			description || null,
			source,
			source_id || null,
			pillar || null,
			format || null,
			target_audience || null,
			priority,
			best_day,
			tags ? JSON.stringify(tags) : null,
			created_by
		).run();
		
		return json({ id, status: 'discovered', best_day }, { status: 201 });
	} catch (error) {
		console.error('Failed to create idea:', error);
		return json({ error: 'Failed to create idea' }, { status: 500 });
	}
};

interface UpdateIdeaBody {
	id: string;
	status?: string;
	research_notes?: string;
	draft_content?: string;
	draft_format?: string;
	pillar?: string;
	format?: string;
	priority?: number;
	scheduled_post_id?: string;
	beads_issue_id?: string;
}

/**
 * PATCH /api/content/ideas
 * 
 * Update an idea (advance through pipeline, add research, draft content)
 */
export const PATCH: RequestHandler = async ({ platform, request }) => {
	const db = platform!.env.DB;
	const body = await request.json() as UpdateIdeaBody;
	
	const { id, ...updates } = body;
	
	if (!id) {
		return json({ error: 'Missing required field: id' }, { status: 400 });
	}
	
	const allowedFields = [
		'status', 'research_notes', 'draft_content', 'draft_format',
		'pillar', 'format', 'priority', 'scheduled_post_id', 'beads_issue_id'
	];
	
	const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
	const params: (string | number | null)[] = [];
	
	for (const [key, value] of Object.entries(updates)) {
		if (allowedFields.includes(key) && value !== undefined) {
			setClauses.push(`${key} = ?`);
			params.push(value);
		}
	}
	
	params.push(id);
	
	try {
		await db.prepare(`
			UPDATE content_ideas SET ${setClauses.join(', ')} WHERE id = ?
		`).bind(...params).run();
		
		return json({ id, updated: true, ...updates });
	} catch (error) {
		console.error('Failed to update idea:', error);
		return json({ error: 'Failed to update idea' }, { status: 500 });
	}
};
