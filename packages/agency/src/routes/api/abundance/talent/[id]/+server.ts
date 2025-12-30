/**
 * Abundance Network: Single Talent API
 *
 * GET /api/abundance/talent/[id] - Get talent by ID
 * PATCH /api/abundance/talent/[id] - Update talent
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Talent, ApiResponse } from '$lib/types/abundance';
import { safeJsonParse } from '$lib/abundance/matching';

export const GET: RequestHandler = async ({ params, platform }) => {
	try {
		if (!platform?.env?.DB) {
			throw error(500, 'Database not available');
		}

		const talent = await platform.env.DB.prepare(
			'SELECT * FROM talent WHERE id = ?'
		).bind(params.id).first<Talent>();

		if (!talent) {
			return json({ success: false, error: 'Talent not found' } as ApiResponse<never>, { status: 404 });
		}

		const result: Talent = {
			...talent,
			skills: safeJsonParse<string[]>(talent.skills, [], 'skills'),
			styles: safeJsonParse<string[] | undefined>(talent.styles, undefined, 'styles')
		};

		return json({ success: true, data: result } as ApiResponse<Talent>);
	} catch (err) {
		console.error('Talent fetch error:', err);
		if (err instanceof Response) throw err;
		return json(
			{ success: false, error: `Error fetching talent: ${err instanceof Error ? err.message : 'Unknown error'}` } as ApiResponse<never>,
			{ status: 500 }
		);
	}
};

export const PATCH: RequestHandler = async ({ params, request, platform }) => {
	try {
		if (!platform?.env?.DB) {
			throw error(500, 'Database not available');
		}

		// Check talent exists
		const existing = await platform.env.DB.prepare(
			'SELECT * FROM talent WHERE id = ?'
		).bind(params.id).first<Talent>();

		if (!existing) {
			return json({ success: false, error: 'Talent not found' } as ApiResponse<never>, { status: 404 });
		}

		const body = (await request.json()) as Record<string, unknown>;
		const updates: string[] = [];
		const values: (string | number | null)[] = [];

		// Build dynamic update query
		const allowedFields = [
			'name', 'email', 'portfolio_url', 'instagram',
			'hourly_rate_min', 'hourly_rate_max', 'availability',
			'timezone', 'abundance_index', 'status'
		];

		for (const field of allowedFields) {
			if (field in body) {
				updates.push(`${field} = ?`);
				values.push((body[field] as string | number | null) ?? null);
			}
		}

		// Handle JSON array fields
		if ('skills' in body) {
			const skills = body.skills as unknown[];
			if (!Array.isArray(skills) || skills.length === 0) {
				return json({ success: false, error: 'Skills must be a non-empty array' } as ApiResponse<never>, { status: 400 });
			}
			updates.push('skills = ?');
			values.push(JSON.stringify(skills));
		}

		if ('styles' in body) {
			updates.push('styles = ?');
			values.push(body.styles ? JSON.stringify(body.styles) : null);
		}

		if (updates.length === 0) {
			return json({ success: false, error: 'No valid fields to update' } as ApiResponse<never>, { status: 400 });
		}

		// Add id for WHERE clause
		values.push(params.id);

		await platform.env.DB.prepare(`
			UPDATE talent SET ${updates.join(', ')} WHERE id = ?
		`).bind(...values).run();

		// Fetch updated record
		const updated = await platform.env.DB.prepare(
			'SELECT * FROM talent WHERE id = ?'
		).bind(params.id).first<Talent>();

		if (!updated) {
			throw error(500, 'Failed to fetch updated talent');
		}

		const result: Talent = {
			...updated,
			skills: safeJsonParse<string[]>(updated.skills, [], 'skills'),
			styles: safeJsonParse<string[] | undefined>(updated.styles, undefined, 'styles')
		};

		return json({ success: true, data: result } as ApiResponse<Talent>);
	} catch (err) {
		console.error('Talent update error:', err);
		if (err instanceof Response) throw err;
		return json(
			{ success: false, error: `Error updating talent: ${err instanceof Error ? err.message : 'Unknown error'}` } as ApiResponse<never>,
			{ status: 500 }
		);
	}
};
