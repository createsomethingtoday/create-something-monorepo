/**
 * Learning Events API
 *
 * Receives learning activity from all CREATE SOMETHING properties.
 * Events contribute to learner progress and understanding tracking.
 *
 * Canon: The infrastructure disappears; only the unified journey remains.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

interface LearningEvent {
	property: 'io' | 'space' | 'ltd' | 'agency';
	eventType: string;
	metadata?: Record<string, unknown>;
}

/**
 * POST /api/events
 *
 * Record a learning event from any property.
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
	const user = locals.user;

	if (!user) {
		throw error(401, 'Authentication required');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	try {
		const body = (await request.json()) as LearningEvent;

		// Validate required fields
		if (!body.property || !body.eventType) {
			throw error(400, 'Missing required fields: property, eventType');
		}

		// Validate property
		const validProperties = ['io', 'space', 'ltd', 'agency'];
		if (!validProperties.includes(body.property)) {
			throw error(400, 'Invalid property');
		}

		// Generate event ID
		const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

		// Insert event
		await db
			.prepare(
				`
        INSERT INTO learning_events (id, learner_id, property, event_type, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `
			)
			.bind(
				eventId,
				user.id,
				body.property,
				body.eventType,
				JSON.stringify(body.metadata || {}),
				Math.floor(Date.now() / 1000)
			)
			.run();

		// Update learner's last_seen_at
		await db
			.prepare(
				`
        UPDATE learners
        SET last_seen_at = ?
        WHERE id = ?
      `
			)
			.bind(Math.floor(Date.now() / 1000), user.id)
			.run();

		return json({
			success: true,
			eventId,
		});
	} catch (err) {
		console.error('Error recording learning event:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to record learning event');
	}
};

/**
 * GET /api/events
 *
 * Retrieve learning events for the authenticated user.
 */
export const GET: RequestHandler = async ({ url, platform, locals }) => {
	const user = locals.user;

	if (!user) {
		throw error(401, 'Authentication required');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	try {
		// Parse query params
		const property = url.searchParams.get('property');
		const eventType = url.searchParams.get('eventType');
		const limit = parseInt(url.searchParams.get('limit') || '50', 10);
		const offset = parseInt(url.searchParams.get('offset') || '0', 10);

		// Build query
		let query = `
      SELECT id, property, event_type, metadata, created_at
      FROM learning_events
      WHERE learner_id = ?
    `;
		const params: unknown[] = [user.id];

		if (property) {
			query += ` AND property = ?`;
			params.push(property);
		}

		if (eventType) {
			query += ` AND event_type = ?`;
			params.push(eventType);
		}

		query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
		params.push(limit, offset);

		const result = await db.prepare(query).bind(...params).all();

		const events = (result.results || []).map((row: Record<string, unknown>) => ({
			id: row.id,
			property: row.property,
			eventType: row.event_type,
			metadata: JSON.parse((row.metadata as string) || '{}'),
			createdAt: row.created_at,
		}));

		return json({
			success: true,
			events,
			total: events.length,
		});
	} catch (err) {
		console.error('Error fetching learning events:', err);
		throw error(500, 'Failed to fetch learning events');
	}
};
