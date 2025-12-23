import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, platform }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return {
			success: false,
			error: 'Missing unsubscribe token',
			email: null
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
			email: null
		};
	}

	if (!platform?.env?.DB) {
		console.error('Database not available');
		return {
			success: false,
			error: 'Service temporarily unavailable',
			email: null
		};
	}

	try {
		// Update the subscriber record - handle both schema variations
		await platform.env.DB.prepare(
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
			email
		};
	} catch (dbError) {
		console.error('Unsubscribe error:', dbError);
		return {
			success: false,
			error: 'Failed to process unsubscribe request',
			email: null
		};
	}
};
