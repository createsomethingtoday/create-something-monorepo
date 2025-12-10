import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Consultation Request API
 *
 * Handles consultation form submissions and triggers WORKWAY workflow.
 *
 * Flow:
 * 1. Validate request body
 * 2. Store in D1 database
 * 3. Trigger consultation-booking workflow (when WORKWAY integrated)
 * 4. Return confirmation
 */

interface ConsultationRequest {
	name: string;
	email: string;
	company?: string;
	phone?: string;
	service: string;
	message?: string;
	preferredDate: string;
	preferredTime: string;
}

function validateRequest(body: unknown): body is ConsultationRequest {
	if (typeof body !== 'object' || body === null) return false;

	const req = body as Record<string, unknown>;

	return (
		typeof req.name === 'string' &&
		req.name.length > 0 &&
		typeof req.email === 'string' &&
		req.email.includes('@') &&
		typeof req.service === 'string' &&
		req.service.length > 0 &&
		typeof req.preferredDate === 'string' &&
		typeof req.preferredTime === 'string'
	);
}

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body = await request.json();

		// Validate request
		if (!validateRequest(body)) {
			throw error(400, 'Invalid request: missing required fields');
		}

		const db = platform?.env.DB;

		if (db) {
			// Store consultation request in D1
			await db
				.prepare(
					`INSERT INTO consultations (
						name, email, company, phone, service, message,
						preferred_date, preferred_time, status, created_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					body.name,
					body.email,
					body.company || null,
					body.phone || null,
					body.service,
					body.message || null,
					body.preferredDate,
					body.preferredTime,
					'pending',
					new Date().toISOString()
				)
				.run();
		}

		// TODO: Trigger WORKWAY consultation-booking workflow
		// When integrated:
		// await workway.trigger('consultation-booking', {
		//   event: 'consultation.requested',
		//   data: body
		// });

		return json({
			success: true,
			message: 'Consultation request received. We will confirm your appointment within 24 hours.',
			data: {
				name: body.name,
				email: body.email,
				preferredDate: body.preferredDate,
				preferredTime: body.preferredTime
			}
		});
	} catch (err) {
		console.error('Consultation request error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Failed to process consultation request');
	}
};

export const GET: RequestHandler = async () => {
	return json({
		message: 'Consultation API is active',
		endpoints: {
			POST: 'Submit a consultation request'
		}
	});
};
