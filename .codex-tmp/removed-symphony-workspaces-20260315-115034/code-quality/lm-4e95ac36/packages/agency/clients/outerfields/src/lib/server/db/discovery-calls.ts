import type { D1Database } from '@cloudflare/workers-types';

export interface DiscoveryCall {
	id: string;
	user_id: string;
	call_time: string;
	calendly_event_id: string;
	status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
	created_at: string;
}

/**
 * Create a new discovery call record
 */
export async function createDiscoveryCall(
	db: D1Database,
	userId: string,
	callTime: string,
	calendlyEventId: string
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO discovery_calls (id, user_id, call_time, calendly_event_id, status, created_at)
       VALUES (?, ?, ?, ?, 'scheduled', datetime('now'))`
		)
		.bind(`dc_${Date.now()}`, userId, callTime, calendlyEventId)
		.run();
}

/**
 * Update discovery call status
 */
export async function updateDiscoveryCallStatus(
	db: D1Database,
	calendlyEventId: string,
	status: DiscoveryCall['status']
): Promise<void> {
	await db
		.prepare(`UPDATE discovery_calls SET status = ? WHERE calendly_event_id = ?`)
		.bind(status, calendlyEventId)
		.run();
}

/**
 * Get all discovery calls (for admin dashboard)
 */
export async function getAllDiscoveryCalls(db: D1Database): Promise<DiscoveryCall[]> {
	const result = await db.prepare(`SELECT * FROM discovery_calls ORDER BY call_time DESC`).all();
	return (result.results as unknown) as DiscoveryCall[];
}

/**
 * Get discovery calls for a specific user
 */
export async function getUserDiscoveryCalls(
	db: D1Database,
	userId: string
): Promise<DiscoveryCall[]> {
	const result = await db
		.prepare(`SELECT * FROM discovery_calls WHERE user_id = ? ORDER BY call_time DESC`)
		.bind(userId)
		.all();
	return (result.results as unknown) as DiscoveryCall[];
}
