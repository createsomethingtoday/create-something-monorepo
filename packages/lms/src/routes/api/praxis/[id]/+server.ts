/**
 * Praxis Exercise API
 *
 * GET /api/praxis/:id
 *
 * Returns praxis exercise details including Claude Code prompt.
 * Designed for Learn MCP consumption.
 * Canon: Exercise delivery without ceremony.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getPraxisExercise } from '$lib/content/praxis';
import { PATHS } from '$lib/content/paths';

export const GET: RequestHandler = async ({ params }) => {
	const { id } = params;

	// Fetch exercise
	const exercise = getPraxisExercise(id);
	if (!exercise) {
		throw error(404, `Exercise not found: ${id}`);
	}

	// Get path title
	const path = PATHS.find((p) => p.id === exercise.pathId);
	const pathTitle = path?.title ?? exercise.pathId;

	// Return structured JSON response
	return json(
		{
			exercise: {
				id: exercise.id,
				lessonId: exercise.lessonId,
				pathId: exercise.pathId,
				title: exercise.title,
				description: exercise.description,
				type: exercise.type,
				difficulty: exercise.difficulty,
				duration: exercise.duration,
				objectives: exercise.objectives,
				beadsTasks: exercise.beadsTasks || [],
				claudeCodePrompt: exercise.claudeCodePrompt || null
			},
			pathTitle
		},
		{
			headers: {
				'Cache-Control': 'public, max-age=3600', // 1 hour cache
				ETag: `"praxis-${id}-${Date.now()}"`
			}
		}
	);
};
