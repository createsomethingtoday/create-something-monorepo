import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createWorkwayClient, isWorkflowSuccess } from '$lib/workway';

/**
 * Consultation Request API
 *
 * Handles consultation form submissions and triggers WORKWAY workflow.
 *
 * Flow:
 * 1. Validate request body
 * 2. Store in D1 database
 * 3. Trigger consultation-booking workflow via WORKWAY
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

		// Trigger WORKWAY consultation-booking workflow
		const apiKey = platform?.env.WORKWAY_API_KEY;
		const orgId = platform?.env.WORKWAY_ORG_ID;

		if (apiKey) {
			try {
				const workway = createWorkwayClient({
					apiKey,
					organizationId: orgId,
				});

				const result = await workway.trigger({
					workflowId: 'consultation-booking',
					event: 'consultation.requested',
					data: {
						name: body.name,
						email: body.email,
						company: body.company,
						phone: body.phone,
						service: body.service,
						message: body.message,
						preferredDate: body.preferredDate,
						preferredTime: body.preferredTime,
					},
					// Use email + date as idempotency key to prevent duplicate bookings
					idempotencyKey: `consultation-${body.email}-${body.preferredDate}-${body.preferredTime}`,
				});

				if (isWorkflowSuccess(result)) {
					console.log('WORKWAY workflow triggered:', result.executionId);
				} else {
					console.warn('WORKWAY workflow trigger failed:', result.error);
					// Continue - don't fail the request if workflow fails
				}
			} catch (workwayError) {
				console.error('WORKWAY integration error:', workwayError);
				// Continue - don't fail the request if workflow fails
			}
		} else {
			console.warn('WORKWAY_API_KEY not configured - skipping workflow trigger');
		}

		return json({
			success: true,
			message: 'Consultation request received. We will confirm your appointment within 24 hours.',
			data: {
				name: body.name,
				email: body.email,
				preferredDate: body.preferredDate,
				preferredTime: body.preferredTime,
			},
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
