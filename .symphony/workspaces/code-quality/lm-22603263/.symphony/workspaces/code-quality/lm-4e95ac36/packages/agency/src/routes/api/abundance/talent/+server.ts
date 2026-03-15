/**
 * Abundance Network: Talent API
 *
 * POST /api/abundance/talent - Create a new talent
 * GET /api/abundance/talent - List talent (with optional phone lookup)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { TalentInput, Talent, ApiResponse, PaginatedResponse } from '$lib/types/abundance';
import { generateId, safeJsonParse } from '$lib/abundance/matching';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		if (!platform?.env?.DB) {
			throw error(500, 'Database not available');
		}

		const body = (await request.json()) as TalentInput;
		const {
			phone, name, email, portfolio_url, instagram,
			skills, styles, hourly_rate_min, hourly_rate_max,
			availability, timezone, abundance_index
		} = body;

		// Validate required fields
		if (!phone || !phone.trim()) {
			return json({ success: false, error: 'Phone number is required' } as ApiResponse<never>, { status: 400 });
		}

		if (!name || !name.trim()) {
			return json({ success: false, error: 'Name is required' } as ApiResponse<never>, { status: 400 });
		}

		if (!skills || !Array.isArray(skills) || skills.length === 0) {
			return json({ success: false, error: 'At least one skill is required' } as ApiResponse<never>, { status: 400 });
		}

		// Check if talent already exists (return existing for idempotency)
		const existing = await platform.env.DB.prepare(
			'SELECT * FROM talent WHERE phone = ?'
		).bind(phone.trim()).first<Talent>();

		if (existing) {
			const talent: Talent = {
				...existing,
				skills: safeJsonParse<string[]>(existing.skills, [], 'skills'),
				styles: safeJsonParse<string[] | undefined>(existing.styles, undefined, 'styles')
			};
			return json({ success: true, data: talent } as ApiResponse<Talent>);
		}

		// Create new talent
		const id = generateId();
		const skillsJson = JSON.stringify(skills);
		const stylesJson = styles ? JSON.stringify(styles) : null;

		await platform.env.DB.prepare(`
			INSERT INTO talent (id, phone, name, email, portfolio_url, instagram, skills, styles, hourly_rate_min, hourly_rate_max, availability, timezone, abundance_index, status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
		`).bind(
			id,
			phone.trim(),
			name.trim(),
			email?.trim() || null,
			portfolio_url?.trim() || null,
			instagram?.trim() || null,
			skillsJson,
			stylesJson,
			hourly_rate_min || null,
			hourly_rate_max || null,
			availability || 'available',
			timezone?.trim() || null,
			abundance_index || 50
		).run();

		// Fetch created record
		const created = await platform.env.DB.prepare(
			'SELECT * FROM talent WHERE id = ?'
		).bind(id).first<Talent>();

		if (!created) {
			throw error(500, 'Failed to create talent');
		}

		const talent: Talent = {
			...created,
			skills: safeJsonParse<string[]>(created.skills, [], 'skills'),
			styles: safeJsonParse<string[] | undefined>(created.styles, undefined, 'styles')
		};

		return json({ success: true, data: talent } as ApiResponse<Talent>, { status: 201 });
	} catch (err) {
		console.error('Talent creation error:', err);
		if (err instanceof Response) throw err;
		return json(
			{ success: false, error: `Error creating talent: ${err instanceof Error ? err.message : 'Unknown error'}` } as ApiResponse<never>,
			{ status: 500 }
		);
	}
};

export const GET: RequestHandler = async ({ url, platform }) => {
	try {
		if (!platform?.env?.DB) {
			throw error(500, 'Database not available');
		}

		const phone = url.searchParams.get('phone');
		const id = url.searchParams.get('id');
		const skill = url.searchParams.get('skill');
		const availability = url.searchParams.get('availability');
		const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
		const offset = parseInt(url.searchParams.get('offset') || '0');

		// Single lookup by phone or id
		if (phone) {
			const talent = await platform.env.DB.prepare(
				'SELECT * FROM talent WHERE phone = ?'
			).bind(phone.trim()).first<Talent>();

			if (!talent) {
				return json({ success: false, error: 'Talent not found' } as ApiResponse<never>, { status: 404 });
			}

			const result: Talent = {
				...talent,
				skills: safeJsonParse<string[]>(talent.skills, [], 'skills'),
				styles: safeJsonParse<string[] | undefined>(talent.styles, undefined, 'styles')
			};

			return json({ success: true, data: result } as ApiResponse<Talent>);
		}

		if (id) {
			const talent = await platform.env.DB.prepare(
				'SELECT * FROM talent WHERE id = ?'
			).bind(id.trim()).first<Talent>();

			if (!talent) {
				return json({ success: false, error: 'Talent not found' } as ApiResponse<never>, { status: 404 });
			}

			const result: Talent = {
				...talent,
				skills: safeJsonParse<string[]>(talent.skills, [], 'skills'),
				styles: safeJsonParse<string[] | undefined>(talent.styles, undefined, 'styles')
			};

			return json({ success: true, data: result } as ApiResponse<Talent>);
		}

		// Build query with filters
		let query = 'SELECT * FROM talent WHERE status = ?';
		const params: (string | number)[] = ['active'];

		if (availability) {
			query += ' AND availability = ?';
			params.push(availability);
		}

		if (skill) {
			// SQLite JSON search (skills is stored as JSON array)
			query += ' AND skills LIKE ?';
			params.push(`%"${skill}"%`);
		}

		query += ' ORDER BY abundance_index DESC, created_at DESC LIMIT ? OFFSET ?';
		params.push(limit, offset);

		const { results } = await platform.env.DB.prepare(query).bind(...params).all<Talent>();

		const talents = results.map(t => ({
			...t,
			skills: safeJsonParse<string[]>(t.skills, [], 'skills'),
			styles: safeJsonParse<string[] | undefined>(t.styles, undefined, 'styles')
		}));

		// Get total count (with same filters except pagination)
		let countQuery = 'SELECT COUNT(*) as count FROM talent WHERE status = ?';
		const countParams: (string | number)[] = ['active'];

		if (availability) {
			countQuery += ' AND availability = ?';
			countParams.push(availability);
		}

		if (skill) {
			countQuery += ' AND skills LIKE ?';
			countParams.push(`%"${skill}"%`);
		}

		const countResult = await platform.env.DB.prepare(countQuery).bind(...countParams).first<{ count: number }>();

		return json({
			success: true,
			data: talents,
			total: countResult?.count || 0,
			offset,
			limit
		} as PaginatedResponse<Talent>);
	} catch (err) {
		console.error('Talent fetch error:', err);
		if (err instanceof Response) throw err;
		return json(
			{ success: false, error: `Error fetching talent: ${err instanceof Error ? err.message : 'Unknown error'}` } as ApiResponse<never>,
			{ status: 500 }
		);
	}
};
