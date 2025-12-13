import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ContactSubmission {
	name: string;
	email: string;
	company?: string;
	budget?: string;
	message: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body: ContactSubmission = await request.json();

		if (!body.email || !body.email.includes('@')) {
			throw error(400, 'Valid email required');
		}

		if (!body.name || !body.message) {
			throw error(400, 'Name and message required');
		}

		console.log('[Contact Submission]', {
			name: body.name,
			email: body.email,
			company: body.company || '(not provided)',
			budget: body.budget || '(not provided)',
			message: body.message.substring(0, 100) + '...',
			timestamp: new Date().toISOString()
		});

		if (platform?.env?.DB) {
			try {
				await platform.env.DB.prepare(
					'INSERT INTO inquiries (name, email, company, budget, message, created_at) VALUES (?, ?, ?, ?, ?, ?)'
				)
					.bind(
						body.name,
						body.email,
						body.company || null,
						body.budget || null,
						body.message,
						new Date().toISOString()
					)
					.run();
			} catch {
				console.log('[Contact] D1 not configured');
			}
		}

		return json({
			success: true,
			message: 'Received. We\'ll be in touch within 24 hours.'
		});
	} catch (err) {
		console.error('[Contact Error]', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Submission failed');
	}
};
