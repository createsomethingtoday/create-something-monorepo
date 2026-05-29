/**
 * Abundance Network: User Type Conversion
 *
 * POST /api/abundance/convert - Convert a user from Seeker to Talent (or vice versa)
 *
 * This handles the case where:
 * 1. WhatsApp webhook auto-creates user as Seeker (default)
 * 2. GPT conversation reveals they're actually a Talent
 * 3. This endpoint converts them properly
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ApiResponse } from '$lib/types/abundance';
import { generateId, safeJsonParse } from '$lib/abundance/matching';

interface ConvertRequest {
	phone: string;
	target_type: 'seeker' | 'talent';
	// Additional fields for the new type
	skills?: string[];        // Required if converting to talent
	styles?: string[];
	hourly_rate_min?: number;
	hourly_rate_max?: number;
	availability?: string;
	// Seeker fields
	brand_name?: string;
	brand_vibe?: string;
	typical_budget_min?: number;
	typical_budget_max?: number;
	preferred_formats?: string[];
}

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		if (!platform?.env?.DB) {
			throw error(500, 'Database not available');
		}

		const body = (await request.json()) as ConvertRequest;
		const { phone, target_type } = body;

		if (!phone || !phone.trim()) {
			return json({ success: false, error: 'Phone number is required' } as ApiResponse<never>, { status: 400 });
		}

		if (!target_type || !['seeker', 'talent'].includes(target_type)) {
			return json({ success: false, error: 'target_type must be "seeker" or "talent"' } as ApiResponse<never>, { status: 400 });
		}

		const db = platform.env.DB;

		// Check current user type
		const existingSeeker = await db.prepare(
			'SELECT * FROM seekers WHERE phone = ?'
		).bind(phone.trim()).first<Record<string, unknown>>();

		const existingTalent = await db.prepare(
			'SELECT * FROM talent WHERE phone = ?'
		).bind(phone.trim()).first<Record<string, unknown>>();

		// If converting to Talent
		if (target_type === 'talent') {
			const seekerIsActive = existingSeeker && existingSeeker.status !== 'inactive';
			const talentIsActive = existingTalent && existingTalent.status !== 'inactive';

			// Validate required fields
			if (!body.skills || !Array.isArray(body.skills) || body.skills.length === 0) {
				return json({ success: false, error: 'skills array is required when converting to talent' } as ApiResponse<never>, { status: 400 });
			}

			// Already a talent?
			if (talentIsActive) {
				if (seekerIsActive) {
					await db.prepare("UPDATE seekers SET status = 'inactive' WHERE phone = ?").bind(phone.trim()).run();
				}

				return json({
					success: true,
					data: {
						...existingTalent,
						skills: safeJsonParse<string[]>(existingTalent.skills, [], 'skills'),
						styles: safeJsonParse<string[] | undefined>(existingTalent.styles, undefined, 'styles')
					},
					message: 'User is already registered as talent'
				});
			}

			// Get name from existing seeker or require it
			const name = (existingSeeker?.name || existingTalent?.name) as string;
			if (!name) {
				return json({ success: false, error: 'User not found. Create via POST /talent instead.' } as ApiResponse<never>, { status: 404 });
			}

			const talentId = existingTalent?.id as string | undefined;
			const activeTalentId = talentId || generateId();

			if (talentId) {
				await db.prepare(`
					UPDATE talent
					SET name = ?, email = ?, skills = ?, styles = ?, hourly_rate_min = ?, hourly_rate_max = ?, availability = ?, status = 'active'
					WHERE id = ?
				`).bind(
					name,
					existingSeeker?.email || existingTalent?.email || null,
					JSON.stringify(body.skills),
					body.styles ? JSON.stringify(body.styles) : null,
					body.hourly_rate_min || null,
					body.hourly_rate_max || null,
					body.availability || 'available',
					activeTalentId
				).run();
			} else {
				await db.prepare(`
					INSERT INTO talent (id, phone, name, email, skills, styles, hourly_rate_min, hourly_rate_max, availability, status)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
				`).bind(
					activeTalentId,
					phone.trim(),
					name,
					existingSeeker?.email || null,
					JSON.stringify(body.skills),
					body.styles ? JSON.stringify(body.styles) : null,
					body.hourly_rate_min || null,
					body.hourly_rate_max || null,
					body.availability || 'available'
				).run();
			}

			if (seekerIsActive) {
				await db.prepare("UPDATE seekers SET status = 'inactive' WHERE phone = ?").bind(phone.trim()).run();
			}

			// Fetch created talent
			const created = await db.prepare(
				'SELECT * FROM talent WHERE id = ?'
			).bind(activeTalentId).first<Record<string, unknown>>();

			return json({
				success: true,
				data: {
					...created,
					skills: safeJsonParse<string[]>(created?.skills, [], 'skills'),
					styles: safeJsonParse<string[] | undefined>(created?.styles, undefined, 'styles')
				},
				message: 'Converted to talent successfully'
			}, { status: 201 });
		}

		// If converting to Seeker
		if (target_type === 'seeker') {
			const seekerIsActive = existingSeeker && existingSeeker.status !== 'inactive';
			const talentIsActive = existingTalent && existingTalent.status !== 'inactive';

			// Already a seeker?
			if (seekerIsActive) {
				if (talentIsActive) {
					await db.prepare("UPDATE talent SET status = 'inactive' WHERE phone = ?").bind(phone.trim()).run();
				}

				return json({
					success: true,
					data: {
						...existingSeeker,
						preferred_formats: safeJsonParse<string[] | undefined>(existingSeeker.preferred_formats, undefined, 'preferred_formats')
					},
					message: 'User is already registered as seeker'
				});
			}

			// Get name from existing talent or require it
			const name = (existingTalent?.name || existingSeeker?.name) as string;
			if (!name) {
				return json({ success: false, error: 'User not found. Create via POST /seekers instead.' } as ApiResponse<never>, { status: 404 });
			}

			const seekerId = existingSeeker?.id as string | undefined;
			const activeSeekerId = seekerId || generateId();

			if (seekerId) {
				await db.prepare(`
					UPDATE seekers
					SET name = ?, email = ?, brand_name = ?, brand_vibe = ?, typical_budget_min = ?, typical_budget_max = ?, preferred_formats = ?, status = 'active'
					WHERE id = ?
				`).bind(
					name,
					existingTalent?.email || existingSeeker?.email || null,
					body.brand_name || existingSeeker?.brand_name || null,
					body.brand_vibe || existingSeeker?.brand_vibe || null,
					body.typical_budget_min || existingSeeker?.typical_budget_min || null,
					body.typical_budget_max || existingSeeker?.typical_budget_max || null,
					body.preferred_formats ? JSON.stringify(body.preferred_formats) : existingSeeker?.preferred_formats || null,
					activeSeekerId
				).run();
			} else {
				await db.prepare(`
					INSERT INTO seekers (id, phone, name, email, brand_name, brand_vibe, typical_budget_min, typical_budget_max, preferred_formats, status)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
				`).bind(
					activeSeekerId,
					phone.trim(),
					name,
					existingTalent?.email || null,
					body.brand_name || null,
					body.brand_vibe || null,
					body.typical_budget_min || null,
					body.typical_budget_max || null,
					body.preferred_formats ? JSON.stringify(body.preferred_formats) : null
				).run();
			}

			if (talentIsActive) {
				await db.prepare("UPDATE talent SET status = 'inactive' WHERE phone = ?").bind(phone.trim()).run();
			}

			// Fetch created seeker
			const created = await db.prepare(
				'SELECT * FROM seekers WHERE id = ?'
			).bind(activeSeekerId).first<Record<string, unknown>>();

			return json({
				success: true,
				data: {
					...created,
					preferred_formats: safeJsonParse<string[] | undefined>(created?.preferred_formats, undefined, 'preferred_formats')
				},
				message: 'Converted to seeker successfully'
			}, { status: 201 });
		}

		return json({ success: false, error: 'Invalid target_type' } as ApiResponse<never>, { status: 400 });
	} catch (err) {
		console.error('Conversion error:', err);
		if (err instanceof Response) throw err;
		return json(
			{ success: false, error: `Error converting user: ${err instanceof Error ? err.message : 'Unknown error'}` } as ApiResponse<never>,
			{ status: 500 }
		);
	}
};
