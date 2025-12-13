/**
 * Abundance Network: Single Seeker API
 *
 * GET /api/abundance/seekers/[id] - Get seeker by ID
 * PATCH /api/abundance/seekers/[id] - Update seeker
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Seeker, ApiResponse } from '$lib/types/abundance';

export const GET: RequestHandler = async ({ params, platform }) => {
	try {
		if (!platform?.env?.DB) {
			throw error(500, 'Database not available');
		}

		const seeker = await platform.env.DB.prepare(
			'SELECT * FROM seekers WHERE id = ?'
		).bind(params.id).first<Seeker>();

		if (!seeker) {
			return json({ success: false, error: 'Seeker not found' } as ApiResponse<never>, { status: 404 });
		}

		const result: Seeker = {
			...seeker,
			preferred_formats: seeker.preferred_formats ? JSON.parse(seeker.preferred_formats as unknown as string) : undefined
		};

		return json({ success: true, data: result } as ApiResponse<Seeker>);
	} catch (err) {
		console.error('Seeker fetch error:', err);
		if (err instanceof Response) throw err;
		return json(
			{ success: false, error: `Error fetching seeker: ${err instanceof Error ? err.message : 'Unknown error'}` } as ApiResponse<never>,
			{ status: 500 }
		);
	}
};

export const PATCH: RequestHandler = async ({ params, request, platform }) => {
	try {
		if (!platform?.env?.DB) {
			throw error(500, 'Database not available');
		}

		// Check seeker exists
		const existing = await platform.env.DB.prepare(
			'SELECT * FROM seekers WHERE id = ?'
		).bind(params.id).first<Seeker>();

		if (!existing) {
			return json({ success: false, error: 'Seeker not found' } as ApiResponse<never>, { status: 404 });
		}

		const body = (await request.json()) as Record<string, unknown>;
		const updates: string[] = [];
		const values: (string | number | null)[] = [];

		// Build dynamic update query
		const allowedFields = [
			'name', 'email', 'brand_name', 'brand_vibe', 'website',
			'typical_budget_min', 'typical_budget_max', 'readiness_score', 'status'
		];

		for (const field of allowedFields) {
			if (field in body) {
				updates.push(`${field} = ?`);
				values.push((body[field] as string | number | null) ?? null);
			}
		}

		// Handle JSON array field
		if ('preferred_formats' in body) {
			updates.push('preferred_formats = ?');
			values.push(body.preferred_formats ? JSON.stringify(body.preferred_formats) : null);
		}

		if (updates.length === 0) {
			return json({ success: false, error: 'No valid fields to update' } as ApiResponse<never>, { status: 400 });
		}

		// Add id for WHERE clause
		values.push(params.id);

		await platform.env.DB.prepare(`
			UPDATE seekers SET ${updates.join(', ')} WHERE id = ?
		`).bind(...values).run();

		// Fetch updated record
		const updated = await platform.env.DB.prepare(
			'SELECT * FROM seekers WHERE id = ?'
		).bind(params.id).first<Seeker>();

		if (!updated) {
			throw error(500, 'Failed to fetch updated seeker');
		}

		const result: Seeker = {
			...updated,
			preferred_formats: updated.preferred_formats ? JSON.parse(updated.preferred_formats as unknown as string) : undefined
		};

		return json({ success: true, data: result } as ApiResponse<Seeker>);
	} catch (err) {
		console.error('Seeker update error:', err);
		if (err instanceof Response) throw err;
		return json(
			{ success: false, error: `Error updating seeker: ${err instanceof Error ? err.message : 'Unknown error'}` } as ApiResponse<never>,
			{ status: 500 }
		);
	}
};
