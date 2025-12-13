/**
 * Intake API Endpoint
 *
 * Receives client intake form submissions.
 * 1. Stores to D1 database
 * 2. Triggers WORKWAY webhook → Clio (creates contact + matter)
 *
 * WORKWAY Workflow: "Client Intake to Matter"
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { siteConfig } from '$lib/config/site';

interface IntakeSubmission {
	name: string;
	email: string;
	phone?: string;
	practiceArea: string;
	message: string;
}

interface WorkflowPayload {
	contact: {
		name: string;
		email: string;
		phone?: string;
	};
	matter: {
		practice_area: string;
		description: string;
	};
	source: string;
	timestamp: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body: IntakeSubmission = await request.json();

		// Validate required fields
		if (!body.name || body.name.trim().length < 2) {
			throw error(400, 'Name is required');
		}

		if (!body.email || !body.email.includes('@')) {
			throw error(400, 'Valid email is required');
		}

		if (!body.practiceArea) {
			throw error(400, 'Practice area is required');
		}

		if (!body.message || body.message.trim().length < 10) {
			throw error(400, 'Please provide more details about your situation');
		}

		const timestamp = new Date().toISOString();
		let intakeId: number | null = null;

		// 1. Store to D1 database
		if (platform?.env?.DB) {
			try {
				const result = await platform.env.DB.prepare(`
					INSERT INTO intakes (name, email, phone, practice_area, message, status, created_at)
					VALUES (?, ?, ?, ?, ?, 'pending', ?)
				`)
					.bind(
						body.name.trim(),
						body.email.trim().toLowerCase(),
						body.phone?.trim() || null,
						body.practiceArea,
						body.message.trim(),
						timestamp
					)
					.run();

				intakeId = result.meta?.last_row_id ?? null;

				console.log('[Intake] Stored to D1', { intakeId, email: body.email });
			} catch (dbError) {
				console.error('[Intake] D1 error:', dbError);
				// Continue without D1 - don't fail the submission
			}
		}

		// 2. Trigger WORKWAY webhook → Clio
		const webhookUrl = siteConfig.workflows?.clioIntakeWebhook;

		if (webhookUrl && webhookUrl.trim() !== '') {
			try {
				const workflowPayload: WorkflowPayload = {
					contact: {
						name: body.name.trim(),
						email: body.email.trim().toLowerCase(),
						phone: body.phone?.trim()
					},
					matter: {
						practice_area: body.practiceArea,
						description: body.message.trim()
					},
					source: siteConfig.url,
					timestamp
				};

				const webhookResponse = await fetch(webhookUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'User-Agent': 'CREATE-SOMETHING-Law-Firm-Template/1.0'
					},
					body: JSON.stringify(workflowPayload)
				});

				// Log workflow result
				if (platform?.env?.DB && intakeId) {
					const responseText = await webhookResponse.text();
					await platform.env.DB.prepare(`
						INSERT INTO workflow_logs (
							intake_id,
							workflow_name,
							status,
							request_payload,
							response_payload,
							triggered_at,
							completed_at
						)
						VALUES (?, ?, ?, ?, ?, ?, ?)
					`)
						.bind(
							intakeId,
							'client_intake_to_matter',
							webhookResponse.ok ? 'success' : 'failed',
							JSON.stringify(workflowPayload),
							responseText,
							timestamp,
							new Date().toISOString()
						)
						.run();
				}

				if (webhookResponse.ok) {
					console.log('[Intake] WORKWAY webhook triggered successfully');
				} else {
					console.error('[Intake] WORKWAY webhook failed:', webhookResponse.status);
				}
			} catch (webhookError) {
				console.error('[Intake] WORKWAY webhook error:', webhookError);
				// Don't fail the submission - the intake is stored
			}
		} else {
			console.log('[Intake] No WORKWAY webhook configured');
		}

		return json({
			success: true,
			message: 'Thank you for reaching out. We will respond within 24 hours.',
			intakeId
		});
	} catch (err) {
		console.error('[Intake Error]', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(500, 'Submission failed. Please try again or call us directly.');
	}
};
