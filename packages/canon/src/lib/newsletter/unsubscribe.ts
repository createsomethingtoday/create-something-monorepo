/**
 * Unsubscribe Logic
 *
 * Shared server-side logic for processing newsletter unsubscribe requests.
 * Used by property-specific +page.server.ts files.
 *
 * @packageDocumentation
 */

import type { UnsubscribeResult } from './types.js';

/**
 * D1 Database interface (minimal)
 */
interface D1Database {
	prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
	bind(...args: unknown[]): D1PreparedStatement;
	run(): Promise<D1Result>;
}

interface D1Result {
	success: boolean;
}

/**
 * Process an unsubscribe request from a URL token.
 *
 * Token format: base64(email:timestamp)
 *
 * @example
 * ```typescript
 * // In +page.server.ts
 * import { processUnsubscribe } from '@create-something/canon/newsletter';
 *
 * export const load: PageServerLoad = async ({ url, platform }) => {
 *   const token = url.searchParams.get('token');
 *   return processUnsubscribe(token, platform?.env?.DB);
 * };
 * ```
 */
export async function processUnsubscribe(
	token: string | null,
	db: D1Database | undefined
): Promise<UnsubscribeResult> {
	if (!token) {
		return {
			success: false,
			error: 'Missing unsubscribe token',
			email: null,
		};
	}

	// Decode the token (format: base64(email:timestamp))
	let email: string;
	try {
		const decoded = atob(token);
		const parts = decoded.split(':');
		if (parts.length < 2) {
			throw new Error('Invalid token format');
		}
		email = parts[0];

		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			throw new Error('Invalid email in token');
		}
	} catch {
		return {
			success: false,
			error: 'Invalid unsubscribe token',
			email: null,
		};
	}

	if (!db) {
		console.error('Database not available');
		return {
			success: false,
			error: 'Service temporarily unavailable',
			email: null,
		};
	}

	try {
		// Update the subscriber record - handle both schema variations
		// Schema 1: has unsubscribed_at column
		// Schema 2: has status column
		await db
			.prepare(
				`UPDATE newsletter_subscribers
			 SET unsubscribed_at = datetime('now'),
			     status = 'unsubscribed'
			 WHERE email = ? AND (unsubscribed_at IS NULL OR status = 'active')`
			)
			.bind(email)
			.run();

		return {
			success: true,
			error: null,
			email,
		};
	} catch (dbError) {
		console.error('Unsubscribe error:', dbError);
		return {
			success: false,
			error: 'Failed to process unsubscribe request',
			email: null,
		};
	}
}
