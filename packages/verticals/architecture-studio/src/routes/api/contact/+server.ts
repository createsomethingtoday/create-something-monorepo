/**
 * Contact API Endpoint - Architecture Studio
 *
 * Receives inquiry submissions. In production, integrate with email/CRM.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ContactSubmission {
	name: string;
	email: string;
	inquiryType: string;
	message: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body: ContactSubmission = await request.json();

		// Validate required fields
		if (!body.email || !body.email.includes('@')) {
			throw error(400, 'Valid email required');
		}

		if (!body.name || !body.message) {
			throw error(400, 'Name and message required');
		}

		// Log submission
		console.log('[Contact Submission]', {
			name: body.name,
			email: body.email,
			inquiryType: body.inquiryType,
			message: body.message.substring(0, 100) + '...',
			timestamp: new Date().toISOString()
		});

		// Store to D1 if available
		if (platform?.env?.DB) {
			try {
				await platform.env.DB.prepare(
					'INSERT INTO inquiries (name, email, inquiry_type, message, created_at) VALUES (?, ?, ?, ?, ?)'
				)
					.bind(body.name, body.email, body.inquiryType, body.message, new Date().toISOString())
					.run();
			} catch (dbError) {
				console.log('[Contact] D1 not configured, submission logged only');
			}
		}

		return json({
			success: true,
			message: 'Received. We\'ll respond within 48 hours.'
		});
	} catch (err) {
		console.error('[Contact Error]', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Submission failed. Please try again.');
	}
};
