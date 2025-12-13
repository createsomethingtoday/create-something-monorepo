/**
 * Contact API Endpoint
 *
 * Receives form submissions from ProgressiveForm.
 * In production, integrate with email service or CRM.
 *
 * Response time commitment: 48 hours (per template voice)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ContactSubmission {
	email: string;
	name?: string;
	message?: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body: ContactSubmission = await request.json();

		// Validate email (required)
		if (!body.email || !body.email.includes('@')) {
			throw error(400, 'Valid email required');
		}

		// In production: store to D1, send to email service, or push to CRM
		// For template: log and return success
		console.log('[Contact Submission]', {
			email: body.email,
			name: body.name || '(not provided)',
			message: body.message || '(not provided)',
			timestamp: new Date().toISOString()
		});

		// Optional: Store to D1 if available
		if (platform?.env?.DB) {
			try {
				await platform.env.DB.prepare(
					'INSERT INTO contact_submissions (email, name, message, created_at) VALUES (?, ?, ?, ?)'
				)
					.bind(body.email, body.name || null, body.message || null, new Date().toISOString())
					.run();
			} catch (dbError) {
				// Table may not exist in dev - log but don't fail
				console.log('[Contact] D1 not configured, submission logged only');
			}
		}

		return json({
			success: true,
			message: 'Received. Response within 48 hours.'
		});
	} catch (err) {
		console.error('[Contact Error]', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(500, 'Submission failed. Please try again.');
	}
};
