/**
 * Facility Detail API
 *
 * GET /api/facilities/:slug - Get facility by slug
 * PATCH /api/facilities/:slug - Update facility
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Facility } from '$lib/types';

interface UpdateFacilityBody {
	name?: string;
	timezone?: string;
	status?: string;
	opening_time?: string;
	closing_time?: string;
	slot_duration_minutes?: number;
	advance_booking_days?: number;
	cancellation_hours?: number;
	cancellation_fee_cents?: number;
	email?: string;
	phone?: string;
	address?: string;
	config?: Record<string, unknown>;
}

export const GET: RequestHandler = async ({ params, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const facility = await db
		.prepare(
			`
      SELECT id, name, slug, timezone, status,
             opening_time, closing_time, slot_duration_minutes,
             advance_booking_days, cancellation_hours, cancellation_fee_cents,
             email, phone, address, config, created_at, updated_at
      FROM facilities
      WHERE slug = ? AND status != 'suspended'
    `
		)
		.bind(params.slug)
		.first<Facility>();

	if (!facility) {
		throw error(404, 'Facility not found');
	}

	// Parse config JSON
	const config = facility.config ? JSON.parse(facility.config as unknown as string) : {};

	return json({
		...facility,
		config
	});
};

export const PATCH: RequestHandler = async ({ params, request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	// Verify facility exists
	const existing = await db
		.prepare('SELECT id, status FROM facilities WHERE slug = ?')
		.bind(params.slug)
		.first<{ id: string; status: string }>();

	if (!existing) {
		throw error(404, 'Facility not found');
	}

	const body = (await request.json()) as UpdateFacilityBody;
	const now = new Date().toISOString();

	// Build update query dynamically
	const updates: string[] = ['updated_at = ?'];
	const values: unknown[] = [now];

	const allowedFields: (keyof UpdateFacilityBody)[] = [
		'name',
		'timezone',
		'status',
		'opening_time',
		'closing_time',
		'slot_duration_minutes',
		'advance_booking_days',
		'cancellation_hours',
		'cancellation_fee_cents',
		'email',
		'phone',
		'address'
	];

	for (const field of allowedFields) {
		if (body[field] !== undefined) {
			updates.push(`${field} = ?`);
			values.push(body[field]);
		}
	}

	// Handle config separately (JSON)
	if (body.config !== undefined) {
		updates.push('config = ?');
		values.push(JSON.stringify(body.config));
	}

	values.push(existing.id);

	await db
		.prepare(`UPDATE facilities SET ${updates.join(', ')} WHERE id = ?`)
		.bind(...values)
		.run();

	return json({ success: true, updated: Object.keys(body) });
};
