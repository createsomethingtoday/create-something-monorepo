/**
 * Community Relationships API
 * 
 * Track engagement patterns over time.
 * See who's warming up without the schmoozing.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface Relationship {
	id: string;
	platform: string;
	person_id: string;
	person_name: string | null;
	person_handle: string | null;
	person_title: string | null;
	person_company: string | null;
	person_url: string | null;
	person_followers: number | null;
	interactions_count: number;
	our_responses_count: number;
	their_responses_count: number;
	shares_count: number;
	first_interaction: string | null;
	last_interaction: string | null;
	warmth_score: number;
	lead_potential: string;
	interests: string | null;
	notes: string | null;
	tags: string | null;
}

/**
 * GET /api/community/relationships
 * 
 * Get relationships, sorted by warmth or recency
 */
export const GET: RequestHandler = async ({ platform, url }) => {
	const db = platform!.env.DB;
	
	const sort = url.searchParams.get('sort') || 'warmth'; // warmth, recent, interactions
	const platformFilter = url.searchParams.get('platform');
	const leadPotential = url.searchParams.get('lead_potential');
	const minWarmth = parseFloat(url.searchParams.get('min_warmth') || '0');
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
	
	let query = `SELECT * FROM community_relationships WHERE warmth_score >= ?`;
	const params: (string | number)[] = [minWarmth];
	
	if (platformFilter) {
		query += ` AND platform = ?`;
		params.push(platformFilter);
	}
	
	if (leadPotential) {
		query += ` AND lead_potential = ?`;
		params.push(leadPotential);
	}
	
	if (sort === 'warmth') {
		query += ` ORDER BY warmth_score DESC, interactions_count DESC`;
	} else if (sort === 'recent') {
		query += ` ORDER BY last_interaction DESC NULLS LAST`;
	} else if (sort === 'interactions') {
		query += ` ORDER BY interactions_count DESC`;
	}
	
	query += ` LIMIT ?`;
	params.push(limit);
	
	try {
		const result = await db.prepare(query).bind(...params).all<Relationship>();
		
		// Parse JSON fields
		const relationships = result.results.map(r => ({
			...r,
			interests: r.interests ? JSON.parse(r.interests) : [],
			tags: r.tags ? JSON.parse(r.tags) : []
		}));
		
		// Calculate summary stats
		const stats = {
			total: relationships.length,
			hot_leads: relationships.filter(r => r.lead_potential === 'hot').length,
			warm_leads: relationships.filter(r => r.lead_potential === 'warm').length,
			avg_warmth: relationships.length > 0 
				? relationships.reduce((sum, r) => sum + r.warmth_score, 0) / relationships.length 
				: 0
		};
		
		return json({ relationships, stats });
	} catch (error) {
		console.error('Failed to fetch relationships:', error);
		return json({ error: 'Failed to fetch relationships' }, { status: 500 });
	}
};

interface RelationshipPostBody {
	platform: string;
	person_id: string;
	person_name?: string;
	person_handle?: string;
	person_title?: string;
	person_company?: string;
	person_url?: string;
	person_followers?: number;
	interaction_type?: 'inbound' | 'outbound';
}

/**
 * POST /api/community/relationships
 * 
 * Create or update a relationship (upsert)
 */
export const POST: RequestHandler = async ({ platform, request }) => {
	const db = platform!.env.DB;
	const body = await request.json() as RelationshipPostBody;
	
	const {
		platform: relPlatform,
		person_id,
		person_name,
		person_handle,
		person_title,
		person_company,
		person_url,
		person_followers,
		interaction_type
	} = body;
	
	if (!relPlatform || !person_id) {
		return json({ error: 'Missing required fields: platform, person_id' }, { status: 400 });
	}
	
	const now = new Date().toISOString();
	const id = `rel_${relPlatform}_${person_id}`;
	
	try {
		// Try to get existing relationship
		const existing = await db.prepare(`
			SELECT * FROM community_relationships WHERE platform = ? AND person_id = ?
		`).bind(relPlatform, person_id).first<Relationship>();
		
		if (existing) {
			// Update existing
			const updates: string[] = [];
			const updateParams: (string | number | null)[] = [];
			
			if (person_name) { updates.push('person_name = ?'); updateParams.push(person_name); }
			if (person_handle) { updates.push('person_handle = ?'); updateParams.push(person_handle); }
			if (person_title) { updates.push('person_title = ?'); updateParams.push(person_title); }
			if (person_company) { updates.push('person_company = ?'); updateParams.push(person_company); }
			if (person_url) { updates.push('person_url = ?'); updateParams.push(person_url); }
			if (person_followers !== undefined) { updates.push('person_followers = ?'); updateParams.push(person_followers); }
			
			updates.push('interactions_count = interactions_count + 1');
			updates.push('last_interaction = ?'); updateParams.push(now);
			updates.push('updated_at = ?'); updateParams.push(now);
			
			if (interaction_type === 'inbound') {
				updates.push('their_responses_count = their_responses_count + 1');
			} else if (interaction_type === 'outbound') {
				updates.push('our_responses_count = our_responses_count + 1');
			}
			
			// Recalculate warmth (simple heuristic)
			const newInteractions = existing.interactions_count + 1;
			const newWarmth = Math.min(1, (newInteractions * 0.1) + (existing.their_responses_count * 0.15));
			updates.push('warmth_score = ?'); updateParams.push(newWarmth);
			
			// Auto-upgrade lead potential
			if (newWarmth > 0.7 && existing.lead_potential === 'warm') {
				updates.push("lead_potential = 'hot'");
			} else if (newWarmth > 0.3 && existing.lead_potential === 'cold') {
				updates.push("lead_potential = 'warm'");
			} else if (newWarmth > 0.1 && existing.lead_potential === 'unknown') {
				updates.push("lead_potential = 'cold'");
			}
			
			updateParams.push(relPlatform, person_id);
			
			await db.prepare(`
				UPDATE community_relationships 
				SET ${updates.join(', ')}
				WHERE platform = ? AND person_id = ?
			`).bind(...updateParams).run();
			
			return json({ id: existing.id, updated: true, warmth_score: newWarmth });
		} else {
			// Create new
			await db.prepare(`
				INSERT INTO community_relationships (
					id, platform, person_id, person_name, person_handle,
					person_title, person_company, person_url, person_followers,
					interactions_count, first_interaction, last_interaction,
					warmth_score, lead_potential
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0.1, 'unknown')
			`).bind(
				id,
				relPlatform,
				person_id,
				person_name || null,
				person_handle || null,
				person_title || null,
				person_company || null,
				person_url || null,
				person_followers || null,
				now,
				now
			).run();
			
			return json({ id, created: true }, { status: 201 });
		}
	} catch (error) {
		console.error('Failed to upsert relationship:', error);
		return json({ error: 'Failed to upsert relationship' }, { status: 500 });
	}
};

interface RelationshipPatchBody {
	id: string;
	notes?: string;
	tags?: string[];
	lead_potential?: string;
	interests?: string[];
}

/**
 * PATCH /api/community/relationships
 * 
 * Update relationship metadata (notes, tags, lead_potential)
 */
export const PATCH: RequestHandler = async ({ platform, request }) => {
	const db = platform!.env.DB;
	const body = await request.json() as RelationshipPatchBody;
	
	const { id, notes, tags, lead_potential, interests } = body;
	
	if (!id) {
		return json({ error: 'Missing required field: id' }, { status: 400 });
	}
	
	const updates: string[] = [];
	const params: (string | null)[] = [];
	
	if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
	if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)); }
	if (lead_potential !== undefined) { updates.push('lead_potential = ?'); params.push(lead_potential); }
	if (interests !== undefined) { updates.push('interests = ?'); params.push(JSON.stringify(interests)); }
	
	if (updates.length === 0) {
		return json({ error: 'No fields to update' }, { status: 400 });
	}
	
	updates.push('updated_at = ?');
	params.push(new Date().toISOString());
	params.push(id);
	
	try {
		await db.prepare(`
			UPDATE community_relationships SET ${updates.join(', ')} WHERE id = ?
		`).bind(...params).run();
		
		return json({ id, updated: true });
	} catch (error) {
		console.error('Failed to update relationship:', error);
		return json({ error: 'Failed to update relationship' }, { status: 500 });
	}
};
