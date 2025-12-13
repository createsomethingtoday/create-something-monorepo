/**
 * Lesson Progress API
 *
 * Tracks lesson start and completion events.
 * Canon: The API recedes; the learning progresses.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { ProgressTracker } from '$lib/progress/tracker';
import { getPath } from '$lib/content/paths';

/**
 * POST /api/progress/lesson
 *
 * Body:
 *  - pathId: string
 *  - lessonId: string
 *  - action: 'start' | 'complete'
 *  - timeSpent?: number (seconds, for complete action)
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
		pathId?: string;
		lessonId?: string;
		action?: string;
		timeSpent?: number;
	};

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const { pathId, lessonId, action, timeSpent } = body;

	if (!pathId || !lessonId || !action) {
		throw error(400, 'Missing required fields: pathId, lessonId, action');
	}

	// Validate path and lesson exist
	const path = getPath(pathId);
	if (!path) {
		throw error(404, 'Path not found');
	}

	const lesson = path.lessons.find((l) => l.id === lessonId);
	if (!lesson) {
		throw error(404, 'Lesson not found');
	}

	const tracker = new ProgressTracker(db);

	try {
		if (action === 'start') {
			await tracker.startLesson(user.id, pathId, lessonId);

			return json({
				success: true,
				message: 'Lesson started',
				progress: await tracker.getLessonProgress(user.id, pathId, lessonId)
			});
		} else if (action === 'complete') {
			const seconds = typeof timeSpent === 'number' && timeSpent > 0 ? timeSpent : 0;

			await tracker.completeLesson(user.id, pathId, lessonId, seconds);

			// Check if all lessons in the path are completed
			const pathProgress = await tracker.getPathProgress(user.id, pathId);
			if (pathProgress && pathProgress.lessonsCompleted === path.lessons.length) {
				await tracker.completePath(user.id, pathId);
			}

			return json({
				success: true,
				message: 'Lesson completed',
				progress: await tracker.getLessonProgress(user.id, pathId, lessonId),
				pathCompleted: pathProgress?.lessonsCompleted === path.lessons.length
			});
		} else {
			throw error(400, 'Invalid action. Must be "start" or "complete"');
		}
	} catch (err) {
		console.error('Error tracking lesson progress:', err);
		throw error(500, 'Failed to track lesson progress');
	}
};
