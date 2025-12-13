/**
 * Abundance Network: Single Match API
 *
 * GET /api/abundance/match/[id] - Get match by ID
 * PATCH /api/abundance/match/[id] - Update match status/feedback
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Match, ApiResponse } from '$lib/types/abundance';

export const GET: RequestHandler = async ({ params, platform }) => {
	try {
		if (!platform?.env?.DB) {
			throw error(500, 'Database not available');
		}

		const match = await platform.env.DB.prepare(
			'SELECT * FROM matches WHERE id = ?'
		).bind(params.id).first<Match>();

		if (!match) {
			return json({ success: false, error: 'Match not found' } as ApiResponse<never>, { status: 404 });
		}

		const result: Match = {
			...match,
			deliverables: match.deliverables ? JSON.parse(match.deliverables as unknown as string) : undefined,
			fit_breakdown: match.fit_breakdown ? JSON.parse(match.fit_breakdown as unknown as string) : undefined
		};

		return json({ success: true, data: result } as ApiResponse<Match>);
	} catch (err) {
		console.error('Match fetch error:', err);
		if (err instanceof Response) throw err;
		return json(
			{ success: false, error: `Error fetching match: ${err instanceof Error ? err.message : 'Unknown error'}` } as ApiResponse<never>,
			{ status: 500 }
		);
	}
};

export const PATCH: RequestHandler = async ({ params, request, platform }) => {
	try {
		if (!platform?.env?.DB) {
			throw error(500, 'Database not available');
		}

		// Check match exists
		const existing = await platform.env.DB.prepare(
			'SELECT * FROM matches WHERE id = ?'
		).bind(params.id).first<Match>();

		if (!existing) {
			return json({ success: false, error: 'Match not found' } as ApiResponse<never>, { status: 404 });
		}

		const body = (await request.json()) as Record<string, unknown>;
		const updates: string[] = [];
		const values: (string | number | null)[] = [];

		// Status updates with validation
		if ('status' in body) {
			const validStatuses = ['suggested', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled'];
			const status = body.status as string;
			if (!validStatuses.includes(status)) {
				return json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` } as ApiResponse<never>, { status: 400 });
			}

			updates.push('status = ?');
			values.push(status);

			// Set resolved_at for terminal states
			if (['completed', 'cancelled', 'declined'].includes(status)) {
				updates.push('resolved_at = datetime(\'now\')');
			}
		}

		// Feedback fields
		const feedbackFields = ['seeker_rating', 'seeker_feedback', 'talent_rating', 'talent_feedback'];
		for (const field of feedbackFields) {
			if (field in body) {
				const fieldValue = body[field];
				// Validate ratings
				if (field.includes('rating') && fieldValue !== null) {
					const rating = Number(fieldValue);
					if (isNaN(rating) || rating < 1 || rating > 5) {
						return json({ success: false, error: `${field} must be between 1 and 5` } as ApiResponse<never>, { status: 400 });
					}
				}
				updates.push(`${field} = ?`);
				values.push((fieldValue as string | number | null) ?? null);
			}
		}

		if (updates.length === 0) {
			return json({ success: false, error: 'No valid fields to update' } as ApiResponse<never>, { status: 400 });
		}

		// Add id for WHERE clause
		values.push(params.id);

		await platform.env.DB.prepare(`
			UPDATE matches SET ${updates.join(', ')} WHERE id = ?
		`).bind(...values).run();

		// Fetch updated record
		const updated = await platform.env.DB.prepare(
			'SELECT * FROM matches WHERE id = ?'
		).bind(params.id).first<Match>();

		if (!updated) {
			throw error(500, 'Failed to fetch updated match');
		}

		const result: Match = {
			...updated,
			deliverables: updated.deliverables ? JSON.parse(updated.deliverables as unknown as string) : undefined,
			fit_breakdown: updated.fit_breakdown ? JSON.parse(updated.fit_breakdown as unknown as string) : undefined
		};

		return json({ success: true, data: result } as ApiResponse<Match>);
	} catch (err) {
		console.error('Match update error:', err);
		if (err instanceof Response) throw err;
		return json(
			{ success: false, error: `Error updating match: ${err instanceof Error ? err.message : 'Unknown error'}` } as ApiResponse<never>,
			{ status: 500 }
		);
	}
};
