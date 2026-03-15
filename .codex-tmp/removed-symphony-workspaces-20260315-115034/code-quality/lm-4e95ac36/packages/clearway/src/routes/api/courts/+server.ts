/**
 * Courts API
 *
 * POST /api/courts - Create a new court
 * GET /api/courts?facility=:facilityId - List courts for a facility
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateId, type Court, type CourtType } from '$lib/types';

interface CreateCourtBody {
	facility_id: string;
	name: string;
	court_type: CourtType;
	surface_type?: string;
	price_per_slot_cents?: number;
	peak_price_cents?: number;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const body = (await request.json()) as CreateCourtBody;

	// Validate required fields
	const { facility_id, name, court_type } = body;
	if (!facility_id || !name || !court_type) {
		throw error(400, 'facility_id, name, and court_type are required');
	}

	// Verify facility exists
	const facility = await db
		.prepare('SELECT id FROM facilities WHERE id = ?')
		.bind(facility_id)
		.first();

	if (!facility) {
		throw error(404, 'Facility not found');
	}

	// Get next sort order
	const lastCourt = await db
		.prepare(
			'SELECT MAX(sort_order) as max_order FROM courts WHERE facility_id = ?'
		)
		.bind(facility_id)
		.first<{ max_order: number | null }>();

	const sortOrder = (lastCourt?.max_order ?? -1) + 1;

	const id = generateId('crt');
	const now = new Date().toISOString();

	await db
		.prepare(
			`
      INSERT INTO courts (
        id, facility_id, name, court_type, surface_type,
        is_active, sort_order, price_per_slot_cents, peak_price_cents,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    `
		)
		.bind(
			id,
			facility_id,
			name,
			court_type,
			body.surface_type || null,
			sortOrder,
			body.price_per_slot_cents || null,
			body.peak_price_cents || null,
			now,
			now
		)
		.run();

	return json(
		{
			id,
			facility_id,
			name,
			court_type,
			is_active: true,
			sort_order: sortOrder
		},
		{ status: 201 }
	);
};

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const facilityId = url.searchParams.get('facility');
	const facilitySlug = url.searchParams.get('slug');

	if (!facilityId && !facilitySlug) {
		throw error(400, 'facility or slug parameter is required');
	}

	let courts;

	if (facilitySlug) {
		// Look up by slug
		courts = await db
			.prepare(
				`
        SELECT c.id, c.facility_id, c.name, c.court_type, c.surface_type,
               c.is_active, c.sort_order, c.price_per_slot_cents, c.peak_price_cents
        FROM courts c
        JOIN facilities f ON f.id = c.facility_id
        WHERE f.slug = ? AND c.is_active = 1
        ORDER BY c.sort_order ASC
      `
			)
			.bind(facilitySlug)
			.all<Court>();
	} else {
		// Look up by ID
		courts = await db
			.prepare(
				`
        SELECT id, facility_id, name, court_type, surface_type,
               is_active, sort_order, price_per_slot_cents, peak_price_cents
        FROM courts
        WHERE facility_id = ? AND is_active = 1
        ORDER BY sort_order ASC
      `
			)
			.bind(facilityId)
			.all<Court>();
	}

	return json({
		courts: courts.results || []
	});
};
