/**
 * Agent-in-a-Box License Validation API
 *
 * POST /api/agent-kit/validate
 *
 * Validates license keys and records machine activations.
 * Called by `npx @createsomething/agent-kit --key=xxx`
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ValidationRequest {
	key: string;
	machineId: string;
	hostname?: string;
	os?: string;
}

interface ValidationResponse {
	valid: boolean;
	tier: 'solo' | 'team' | 'org';
	email?: string;
	teamSeatsRemaining?: number;
	officeHoursRemaining?: number;
	error?: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		throw error(500, 'Database not available');
	}

	let body: ValidationRequest;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const { key, machineId, hostname, os } = body;

	// Validate request
	if (!key || !machineId) {
		throw error(400, 'Missing required fields: key, machineId');
	}

	// Check license key format
	if (!key.startsWith('ak_') || key.length < 20) {
		return json({
			valid: false,
			tier: 'solo',
			error: 'Invalid license key format'
		} satisfies ValidationResponse);
	}

	try {
		// Look up license in database
		const purchase = await db
			.prepare(
				`
			SELECT
				id,
				email,
				tier,
				license_key,
				office_hours_remaining,
				team_seats_total,
				team_seats_used,
				created_at
			FROM agent_kit_purchases
			WHERE license_key = ?
		`
			)
			.bind(key)
			.first<{
				id: string;
				email: string;
				tier: 'solo' | 'team' | 'org';
				license_key: string;
				office_hours_remaining: number;
				team_seats_total: number;
				team_seats_used: number;
				created_at: string;
			}>();

		if (!purchase) {
			return json({
				valid: false,
				tier: 'solo',
				error: 'License key not found'
			} satisfies ValidationResponse);
		}

		// Record activation (upsert)
		await db
			.prepare(
				`
			INSERT INTO agent_kit_activations (id, license_key, machine_id, hostname, os, activated_at, last_seen_at)
			VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
			ON CONFLICT(license_key, machine_id) DO UPDATE SET
				hostname = excluded.hostname,
				os = excluded.os,
				last_seen_at = datetime('now')
		`
			)
			.bind(crypto.randomUUID(), key, machineId, hostname || null, os || null)
			.run();

		// Calculate team seats remaining
		const teamSeatsRemaining =
			purchase.tier === 'org'
				? 999 // Unlimited for org tier
				: purchase.team_seats_total - purchase.team_seats_used;

		return json({
			valid: true,
			tier: purchase.tier,
			email: purchase.email,
			officeHoursRemaining: purchase.office_hours_remaining,
			teamSeatsRemaining
		} satisfies ValidationResponse);
	} catch (err) {
		console.error('License validation error:', err);
		throw error(500, 'License validation failed');
	}
};
