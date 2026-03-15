/**
 * Heideggerian Form Experience - API Endpoints
 *
 * POST: Submit a new service configuration
 * GET: List all configurations (public demo - no PII)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface SubmitRequest {
	sessionId: string;
	serviceType: string;
	scope: string;
	features: string[];
	pricingTier: string;
	formCompletionMs?: number;
	validationFailures?: number;
}

interface ServiceConfigurationRow {
	id: string;
	session_id: string;
	service_type: string;
	scope: string;
	features: string;
	pricing_tier: string;
	form_completion_ms: number | null;
	validation_failures: number;
	created_at: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	try {
		const body = (await request.json()) as SubmitRequest;

		// Validate required fields
		if (!body.sessionId || !body.serviceType || !body.scope || !body.pricingTier) {
			return json(
				{ success: false, error: 'Missing required fields: sessionId, serviceType, scope, pricingTier' },
				{ status: 400 }
			);
		}

		// Validate service type
		const validServiceTypes = ['automation', 'transformation', 'advisory', 'development'];
		if (!validServiceTypes.includes(body.serviceType)) {
			return json({ success: false, error: 'Invalid service type' }, { status: 400 });
		}

		// Validate pricing tier
		const validPricingTiers = ['starter', 'growth', 'enterprise'];
		if (!validPricingTiers.includes(body.pricingTier)) {
			return json({ success: false, error: 'Invalid pricing tier' }, { status: 400 });
		}

		// Generate ID
		const id = crypto.randomUUID();

		// Insert configuration
		await db
			.prepare(
				`INSERT INTO service_configurations
				(id, session_id, service_type, scope, features, pricing_tier, form_completion_ms, validation_failures)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				id,
				body.sessionId,
				body.serviceType,
				body.scope,
				JSON.stringify(body.features || []),
				body.pricingTier,
				body.formCompletionMs || null,
				body.validationFailures || 0
			)
			.run();

		// Fetch the created entry
		const entry = (await db
			.prepare('SELECT * FROM service_configurations WHERE id = ?')
			.bind(id)
			.first()) as ServiceConfigurationRow | null;

		const parsedEntry = entry
			? {
					...entry,
					features: JSON.parse(entry.features)
				}
			: null;

		return json({ success: true, id, entry: parsedEntry });
	} catch (error) {
		console.error('Failed to submit configuration:', error);
		return json({ success: false, error: 'Failed to submit configuration' }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ entries: [], total: 0, error: 'Database not available' }, { status: 500 });
	}

	try {
		const result = await db
			.prepare(
				`SELECT * FROM service_configurations
				ORDER BY created_at DESC
				LIMIT 50`
			)
			.all();

		// Parse JSON features for each entry
		const rows = (result.results || []) as unknown as ServiceConfigurationRow[];
		const entries = rows.map((entry) => ({
			...entry,
			features: typeof entry.features === 'string' ? JSON.parse(entry.features) : entry.features
		}));

		return json({
			entries,
			total: entries.length
		});
	} catch (error) {
		console.error('Failed to fetch configurations:', error);
		return json({ entries: [], total: 0, error: 'Failed to fetch configurations' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	try {
		const { id } = (await request.json()) as { id: string };

		if (!id) {
			return json({ success: false, error: 'Entry ID required' }, { status: 400 });
		}

		await db.prepare('DELETE FROM service_configurations WHERE id = ?').bind(id).run();

		return json({ success: true, deleted: id });
	} catch (error) {
		console.error('Failed to delete configuration:', error);
		return json({ success: false, error: 'Failed to delete configuration' }, { status: 500 });
	}
};
