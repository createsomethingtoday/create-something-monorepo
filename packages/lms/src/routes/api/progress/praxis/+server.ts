/**
 * Praxis Progress API
 *
 * Tracks praxis exercise attempts and submissions.
 * Canon: The exercise reveals understanding.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { ProgressTracker } from '$lib/progress/tracker';
import { getPraxisExercise } from '$lib/content/praxis';

/**
 * POST /api/progress/praxis
 *
 * Body:
 *  - praxisId: string
 *  - action: 'start' | 'submit'
 *  - submission?: unknown (for submit action)
 *  - feedback?: string (AI-generated feedback, for submit)
 *  - score?: number (0.0 to 1.0, for submit)
 *  - passed?: boolean (for submit)
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
	const user = locals.user;

	if (!user) {
		throw error(401, 'Authentication required');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	let body: {
		praxisId?: string;
		action?: string;
		submission?: unknown;
		feedback?: string;
		score?: number;
		passed?: boolean;
	};

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const { praxisId, action, submission, feedback, score, passed } = body;

	if (!praxisId || !action) {
		throw error(400, 'Missing required fields: praxisId, action');
	}

	// Validate praxis exists
	const praxis = getPraxisExercise(praxisId);
	if (!praxis) {
		throw error(404, 'Praxis exercise not found');
	}

	const tracker = new ProgressTracker(db);

	try {
		if (action === 'start') {
			const attemptId = await tracker.startPraxis(user.id, praxisId);

			return json({
				success: true,
				message: 'Praxis started',
				attemptId
			});
		} else if (action === 'submit') {
			// Validation for submit action
			if (submission === undefined) {
				throw error(400, 'Missing submission data');
			}

			if (typeof score !== 'number' || score < 0 || score > 1) {
				throw error(400, 'Score must be a number between 0 and 1');
			}

			if (typeof passed !== 'boolean') {
				throw error(400, 'Passed must be a boolean');
			}

			// Get the most recent attempt for this praxis
			const attempts = await tracker.getPraxisAttempts(user.id, praxisId);
			const latestAttempt = attempts.find((a) => a.status === 'started');

			if (!latestAttempt) {
				throw error(400, 'No started attempt found. Start the praxis first.');
			}

			await tracker.submitPraxis(
				latestAttempt.id,
				submission,
				feedback || '',
				score,
				passed
			);

			return json({
				success: true,
				message: passed ? 'Praxis passed!' : 'Praxis submitted. Try again!',
				attemptId: latestAttempt.id,
				score,
				passed,
				feedback
			});
		} else {
			throw error(400, 'Invalid action. Must be "start" or "submit"');
		}
	} catch (err) {
		console.error('Error tracking praxis progress:', err);
		throw error(500, 'Failed to track praxis progress');
	}
};

/**
 * GET /api/progress/praxis?praxisId={id}
 *
 * Returns all attempts for a specific praxis exercise.
 */
export const GET: RequestHandler = async ({ url, platform, locals }) => {
	const user = locals.user;

	if (!user) {
		throw error(401, 'Authentication required');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const praxisId = url.searchParams.get('praxisId');

	if (!praxisId) {
		throw error(400, 'Missing query parameter: praxisId');
	}

	// Validate praxis exists
	const praxis = getPraxisExercise(praxisId);
	if (!praxis) {
		throw error(404, 'Praxis exercise not found');
	}

	const tracker = new ProgressTracker(db);

	try {
		const attempts = await tracker.getPraxisAttempts(user.id, praxisId);

		return json({
			success: true,
			praxisId,
			attempts
		});
	} catch (err) {
		console.error('Error fetching praxis attempts:', err);
		throw error(500, 'Failed to fetch praxis attempts');
	}
};
