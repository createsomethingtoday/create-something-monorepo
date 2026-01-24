/**
 * Webinar Survey API
 *
 * Stores post-webinar survey responses for audience segmentation.
 * Used to determine which follow-up track (Cloudflare, Agentic, Systems, WORKWAY)
 * registrants are interested in.
 */

import { json, type RequestEvent } from '@sveltejs/kit';

interface SurveySubmission {
	webinar_slug: string;
	track: string;
	feedback?: string;
	email?: string; // Optional - can be passed if known
}

interface WebinarEnv {
	DB: D1Database;
}

interface D1Database {
	prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
	bind(...args: unknown[]): D1PreparedStatement;
	run(): Promise<D1Result>;
	first<T = unknown>(): Promise<T | null>;
	all<T = unknown>(): Promise<{ results: T[] }>;
}

interface D1Result {
	success: boolean;
}

const VALID_TRACKS = ['cloudflare', 'agentic', 'systems', 'workway'];

export const POST = async ({ request, platform }: RequestEvent) => {
	const body = (await request.json()) as SurveySubmission;
	const { webinar_slug, track, feedback, email } = body;

	// Validate required fields
	if (!webinar_slug || !track) {
		return json(
			{ success: false, message: 'Webinar and track selection are required' },
			{ status: 400 }
		);
	}

	// Validate track
	if (!VALID_TRACKS.includes(track)) {
		return json(
			{ success: false, message: 'Invalid track selection' },
			{ status: 400 }
		);
	}

	const env = platform?.env as WebinarEnv | undefined;
	if (!env?.DB) {
		return json(
			{ success: false, message: 'Service temporarily unavailable' },
			{ status: 500 }
		);
	}

	// Store survey response
	// If email provided, update the registration record
	// Otherwise, create a standalone survey response
	try {
		const surveyData = JSON.stringify({
			track,
			feedback: feedback || null,
			submitted_at: new Date().toISOString()
		});

		if (email) {
			// Update existing registration with survey response
			const result = await env.DB.prepare(
				`UPDATE webinar_registrations
				 SET survey_response = ?, drip_stage = 'attended'
				 WHERE email = ? AND webinar_slug = ?`
			)
				.bind(surveyData, email, webinar_slug)
				.run();

			if (!result.success) {
				throw new Error('Failed to update registration');
			}
		} else {
			// Create standalone survey entry (for anonymous submissions)
			const id = crypto.randomUUID();
			await env.DB.prepare(
				`INSERT INTO webinar_survey_responses (id, webinar_slug, track, feedback, submitted_at)
				 VALUES (?, ?, ?, ?, datetime('now'))`
			)
				.bind(id, webinar_slug, track, feedback || null)
				.run();
		}
	} catch (dbError) {
		console.error('Survey storage error:', dbError);
		// Don't fail - just log. The feedback is valuable even if storage fails.
	}

	console.log(`[SurveyAPI] Response for ${webinar_slug}:`, { track, hasFeedback: !!feedback });

	return json({
		success: true,
		message: 'Thank you for your feedback!'
	});
};
