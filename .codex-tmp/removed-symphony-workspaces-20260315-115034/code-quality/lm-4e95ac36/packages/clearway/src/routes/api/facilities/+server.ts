/**
 * Facilities API
 *
 * POST /api/facilities - Create a new facility
 * GET /api/facilities - List facilities (admin only)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateId } from '$lib/types';

interface CreateFacilityBody {
	name: string;
	slug: string;
	timezone?: string;
	email?: string;
	phone?: string;
	address?: string;
	opening_time?: string;
	closing_time?: string;
	slot_duration_minutes?: number;
	advance_booking_days?: number;
	cancellation_hours?: number;
	config?: Record<string, unknown>;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const body = (await request.json()) as CreateFacilityBody;

	// Validate required fields
	const { name, slug, timezone, email } = body;
	if (!name || !slug) {
		throw error(400, 'Name and slug are required');
	}

	// Check slug format
	if (!/^[a-z0-9-]+$/.test(slug)) {
		throw error(400, 'Slug must be lowercase alphanumeric with hyphens only');
	}

	// Check if slug is taken
	const existing = await db
		.prepare('SELECT id FROM facilities WHERE slug = ?')
		.bind(slug)
		.first();

	if (existing) {
		throw error(409, 'This slug is already taken');
	}

	const id = generateId('fac');
	const now = new Date().toISOString();
	const config = JSON.stringify(body.config || {});

	await db
		.prepare(
			`
      INSERT INTO facilities (
        id, name, slug, timezone, status,
        opening_time, closing_time, slot_duration_minutes,
        advance_booking_days, cancellation_hours,
        email, phone, address, config, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'configuring', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
		)
		.bind(
			id,
			name,
			slug,
			timezone || 'America/Los_Angeles',
			body.opening_time || '06:00',
			body.closing_time || '22:00',
			body.slot_duration_minutes || 60,
			body.advance_booking_days || 14,
			body.cancellation_hours || 24,
			email || null,
			body.phone || null,
			body.address || null,
			config,
			now,
			now
		)
		.run();

	return json(
		{
			id,
			slug,
			name,
			status: 'configuring',
			url: `https://${slug}.courtreserve.createsomething.space`
		},
		{ status: 201 }
	);
};

export const GET: RequestHandler = async ({ platform, url }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	// For now, return all active facilities
	// TODO: Add authentication for admin-only access
	const limit = parseInt(url.searchParams.get('limit') || '20');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	const facilities = await db
		.prepare(
			`
      SELECT id, name, slug, timezone, status,
             opening_time, closing_time, slot_duration_minutes,
             email, phone, address, created_at
      FROM facilities
      WHERE status != 'suspended'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
		)
		.bind(limit, offset)
		.all();

	return json({
		facilities: facilities.results || [],
		pagination: {
			limit,
			offset,
			hasMore: (facilities.results?.length || 0) === limit
		}
	});
};
