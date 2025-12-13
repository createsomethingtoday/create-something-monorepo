/**
 * Abundance Network: Match API
 *
 * POST /api/abundance/match - Find matches for a seeker's job request
 * GET /api/abundance/match - List matches (with optional filters)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Talent, Match, MatchRequest, MatchResult, ApiResponse, PaginatedResponse } from '$lib/types/abundance';
import { findMatches, generateId } from '$lib/abundance/matching';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		if (!platform?.env?.DB) {
			throw error(500, 'Database not available');
		}

		const body = (await request.json()) as MatchRequest;
		const {
			seeker_id, job_title, job_description, deliverables,
			budget, deadline, required_skills, preferred_styles
		} = body;

		// Validate required fields
		if (!seeker_id || !seeker_id.trim()) {
			return json({ success: false, error: 'Seeker ID is required' } as ApiResponse<never>, { status: 400 });
		}

		if (!job_title || !job_title.trim()) {
			return json({ success: false, error: 'Job title is required' } as ApiResponse<never>, { status: 400 });
		}

		// Verify seeker exists
		const seeker = await platform.env.DB.prepare(
			'SELECT id FROM seekers WHERE id = ?'
		).bind(seeker_id.trim()).first();

		if (!seeker) {
			return json({ success: false, error: 'Seeker not found' } as ApiResponse<never>, { status: 404 });
		}

		// Fetch all active, available talent
		const { results: talentResults } = await platform.env.DB.prepare(`
			SELECT * FROM talent WHERE status = 'active' AND availability != 'unavailable'
		`).all<Talent>();

		// Parse JSON fields
		const talents: Talent[] = talentResults.map(t => ({
			...t,
			skills: JSON.parse(t.skills as unknown as string),
			styles: t.styles ? JSON.parse(t.styles as unknown as string) : undefined
		}));

		// Build the match request with optional filters
		const matchRequest: MatchRequest = {
			seeker_id: seeker_id.trim(),
			job_title: job_title.trim(),
			job_description: job_description?.trim(),
			deliverables,
			budget,
			deadline,
			required_skills: required_skills || deliverables, // Use deliverables as skills hint if not provided
			preferred_styles
		};

		// Find matches
		const matchResults = findMatches(matchRequest, talents, 5);

		// Store matches in database
		const savedMatches: Match[] = [];

		for (const result of matchResults) {
			const matchId = generateId();
			const deliverablesJson = deliverables ? JSON.stringify(deliverables) : null;
			const breakdownJson = JSON.stringify(result.fit_breakdown);

			await platform.env.DB.prepare(`
				INSERT INTO matches (id, seeker_id, talent_id, job_title, job_description, deliverables, budget, deadline, fit_score, fit_breakdown, status)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'suggested')
			`).bind(
				matchId,
				seeker_id.trim(),
				result.talent.id,
				job_title.trim(),
				job_description?.trim() || null,
				deliverablesJson,
				budget || null,
				deadline || null,
				result.fit_score,
				breakdownJson
			).run();

			savedMatches.push({
				id: matchId,
				seeker_id: seeker_id.trim(),
				talent_id: result.talent.id,
				job_title: job_title.trim(),
				job_description: job_description?.trim(),
				deliverables,
				budget,
				deadline,
				fit_score: result.fit_score,
				fit_breakdown: result.fit_breakdown,
				status: 'suggested',
				created_at: new Date().toISOString()
			});
		}

		// Return matches with talent details
		const response = matchResults.map((result, i) => ({
			match: savedMatches[i],
			talent: result.talent,
			fit_score: result.fit_score,
			fit_breakdown: result.fit_breakdown
		}));

		return json({
			success: true,
			data: response,
			total: response.length
		}, { status: 201 });
	} catch (err) {
		console.error('Match creation error:', err);
		if (err instanceof Response) throw err;
		return json(
			{ success: false, error: `Error finding matches: ${err instanceof Error ? err.message : 'Unknown error'}` } as ApiResponse<never>,
			{ status: 500 }
		);
	}
};

export const GET: RequestHandler = async ({ url, platform }) => {
	try {
		if (!platform?.env?.DB) {
			throw error(500, 'Database not available');
		}

		const seeker_id = url.searchParams.get('seeker_id');
		const talent_id = url.searchParams.get('talent_id');
		const status = url.searchParams.get('status');
		const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
		const offset = parseInt(url.searchParams.get('offset') || '0');

		// Build query with filters
		let query = 'SELECT * FROM matches WHERE 1=1';
		const params: (string | number)[] = [];

		if (seeker_id) {
			query += ' AND seeker_id = ?';
			params.push(seeker_id.trim());
		}

		if (talent_id) {
			query += ' AND talent_id = ?';
			params.push(talent_id.trim());
		}

		if (status) {
			query += ' AND status = ?';
			params.push(status);
		}

		query += ' ORDER BY fit_score DESC, created_at DESC LIMIT ? OFFSET ?';
		params.push(limit, offset);

		const { results } = await platform.env.DB.prepare(query).bind(...params).all<Match>();

		const matches = results.map(m => ({
			...m,
			deliverables: m.deliverables ? JSON.parse(m.deliverables as unknown as string) : undefined,
			fit_breakdown: m.fit_breakdown ? JSON.parse(m.fit_breakdown as unknown as string) : undefined
		}));

		// Get total count
		let countQuery = 'SELECT COUNT(*) as count FROM matches WHERE 1=1';
		const countParams: (string | number)[] = [];

		if (seeker_id) {
			countQuery += ' AND seeker_id = ?';
			countParams.push(seeker_id.trim());
		}

		if (talent_id) {
			countQuery += ' AND talent_id = ?';
			countParams.push(talent_id.trim());
		}

		if (status) {
			countQuery += ' AND status = ?';
			countParams.push(status);
		}

		const countResult = await platform.env.DB.prepare(countQuery).bind(...countParams).first<{ count: number }>();

		return json({
			success: true,
			data: matches,
			total: countResult?.count || 0,
			offset,
			limit
		} as PaginatedResponse<Match>);
	} catch (err) {
		console.error('Match fetch error:', err);
		if (err instanceof Response) throw err;
		return json(
			{ success: false, error: `Error fetching matches: ${err instanceof Error ? err.message : 'Unknown error'}` } as ApiResponse<never>,
			{ status: 500 }
		);
	}
};
