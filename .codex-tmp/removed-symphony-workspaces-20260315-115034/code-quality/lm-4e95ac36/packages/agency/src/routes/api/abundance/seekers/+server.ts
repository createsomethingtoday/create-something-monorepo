/**
 * Abundance Network: Seekers API
 *
 * POST /api/abundance/seekers - Create a new seeker
 * GET /api/abundance/seekers - List seekers (with optional phone lookup)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { SeekerInput, Seeker, ApiResponse, PaginatedResponse } from '$lib/types/abundance';
import { generateId, safeJsonParse } from '$lib/abundance/matching';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		if (!platform?.env?.DB) {
			throw error(500, 'Database not available');
		}

		const body = (await request.json()) as SeekerInput;
		const { phone, name, email, brand_name, brand_vibe, website, typical_budget_min, typical_budget_max, preferred_formats, readiness_score } = body;

		// Validate required fields
		if (!phone || !phone.trim()) {
			return json({ success: false, error: 'Phone number is required' } as ApiResponse<never>, { status: 400 });
		}

		if (!name || !name.trim()) {
			return json({ success: false, error: 'Name is required' } as ApiResponse<never>, { status: 400 });
		}

		// Check if seeker already exists (return existing for idempotency)
		const existing = await platform.env.DB.prepare(
			'SELECT * FROM seekers WHERE phone = ?'
		).bind(phone.trim()).first<Seeker>();

		if (existing) {
			// Parse JSON fields safely
			const seeker: Seeker = {
				...existing,
				preferred_formats: safeJsonParse<string[] | undefined>(existing.preferred_formats, undefined, 'preferred_formats')
			};
			return json({ success: true, data: seeker } as ApiResponse<Seeker>);
		}

		// Create new seeker
		const id = generateId();
		const formatsJson = preferred_formats ? JSON.stringify(preferred_formats) : null;

		await platform.env.DB.prepare(`
			INSERT INTO seekers (id, phone, name, email, brand_name, brand_vibe, website, typical_budget_min, typical_budget_max, preferred_formats, readiness_score, status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
		`).bind(
			id,
			phone.trim(),
			name.trim(),
			email?.trim() || null,
			brand_name?.trim() || null,
			brand_vibe?.trim() || null,
			website?.trim() || null,
			typical_budget_min || null,
			typical_budget_max || null,
			formatsJson,
			readiness_score || 50
		).run();

		// Fetch created record
		const created = await platform.env.DB.prepare(
			'SELECT * FROM seekers WHERE id = ?'
		).bind(id).first<Seeker>();

		if (!created) {
			throw error(500, 'Failed to create seeker');
		}

		const seeker: Seeker = {
			...created,
			preferred_formats: safeJsonParse<string[] | undefined>(created.preferred_formats, undefined, 'preferred_formats')
		};

		return json({ success: true, data: seeker } as ApiResponse<Seeker>, { status: 201 });
	} catch (err) {
		console.error('Seeker creation error:', err);
		if (err instanceof Response) throw err;
		return json(
			{ success: false, error: `Error creating seeker: ${err instanceof Error ? err.message : 'Unknown error'}` } as ApiResponse<never>,
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
		const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
		const offset = parseInt(url.searchParams.get('offset') || '0');

		// Single lookup by phone or id
		if (phone) {
			const seeker = await platform.env.DB.prepare(
				'SELECT * FROM seekers WHERE phone = ?'
			).bind(phone.trim()).first<Seeker>();

			if (!seeker) {
				return json({ success: false, error: 'Seeker not found' } as ApiResponse<never>, { status: 404 });
			}

			const result: Seeker = {
				...seeker,
				preferred_formats: safeJsonParse<string[] | undefined>(seeker.preferred_formats, undefined, 'preferred_formats')
			};

			return json({ success: true, data: result } as ApiResponse<Seeker>);
		}

		if (id) {
			const seeker = await platform.env.DB.prepare(
				'SELECT * FROM seekers WHERE id = ?'
			).bind(id.trim()).first<Seeker>();

			if (!seeker) {
				return json({ success: false, error: 'Seeker not found' } as ApiResponse<never>, { status: 404 });
			}

			const result: Seeker = {
				...seeker,
				preferred_formats: safeJsonParse<string[] | undefined>(seeker.preferred_formats, undefined, 'preferred_formats')
			};

			return json({ success: true, data: result } as ApiResponse<Seeker>);
		}

		// List all seekers
		const { results } = await platform.env.DB.prepare(
			'SELECT * FROM seekers WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
		).bind('active', limit, offset).all<Seeker>();

		const seekers = results.map(s => ({
			...s,
			preferred_formats: safeJsonParse<string[] | undefined>(s.preferred_formats, undefined, 'preferred_formats')
		}));

		// Get total count
		const countResult = await platform.env.DB.prepare(
			'SELECT COUNT(*) as count FROM seekers WHERE status = ?'
		).bind('active').first<{ count: number }>();

		return json({
			success: true,
			data: seekers,
			total: countResult?.count || 0,
			offset,
			limit
		} as PaginatedResponse<Seeker>);
	} catch (err) {
		console.error('Seeker fetch error:', err);
		if (err instanceof Response) throw err;
		return json(
			{ success: false, error: `Error fetching seekers: ${err instanceof Error ? err.message : 'Unknown error'}` } as ApiResponse<never>,
			{ status: 500 }
		);
	}
};
