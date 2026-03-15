/**
 * Progress Overview API
 *
 * Returns the learner's complete progress across all paths.
 * Canon: The journey spirals—each return deepens understanding.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { PATHS } from '$lib/content/paths';

/**
 * GET /api/progress
 *
 * Returns the authenticated user's full progress data.
 */
export const GET: RequestHandler = async ({ platform, locals }) => {
	const user = locals.user;

	if (!user) {
		throw error(401, 'Authentication required');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	try {
		// Fetch path progress
		const pathProgressResult = await db
			.prepare(
				`
        SELECT path_id, status, current_lesson, started_at, completed_at
        FROM path_progress
        WHERE learner_id = ?
      `
			)
			.bind(user.id)
			.all();

		const pathProgressMap = new Map(
			(pathProgressResult.results || []).map((row: Record<string, unknown>) => [
				row.path_id as string,
				row
			])
		);

		// Fetch lesson progress
		const lessonProgressResult = await db
			.prepare(
				`
        SELECT path_id, lesson_id, status, visits, time_spent, completed_at
        FROM lesson_progress
        WHERE learner_id = ?
      `
			)
			.bind(user.id)
			.all();

		const lessonProgressList = (lessonProgressResult.results || []).map(
			(row: Record<string, unknown>) => ({
				lessonId: row.lesson_id as string,
				pathId: row.path_id as string,
				status: row.status as 'not_started' | 'in_progress' | 'completed',
				visits: (row.visits as number) || 0,
				timeSpent: (row.time_spent as number) || 0,
				completedAt: (row.completed_at as number) || null
			})
		);

		// Count completed lessons per path
		const completedByPath = new Map<string, number>();
		for (const lp of lessonProgressList) {
			if (lp.status === 'completed') {
				completedByPath.set(lp.pathId, (completedByPath.get(lp.pathId) || 0) + 1);
			}
		}

		// Build path progress with lesson counts
		const pathProgress = PATHS.map((path) => {
			const dbProgress = pathProgressMap.get(path.id) as Record<string, unknown> | undefined;
			return {
				pathId: path.id,
				status: (dbProgress?.status as string) || 'not_started',
				lessonsCompleted: completedByPath.get(path.id) || 0,
				totalLessons: path.lessons.length,
				currentLesson: (dbProgress?.current_lesson as string) || null,
				startedAt: (dbProgress?.started_at as number) || null,
				completedAt: (dbProgress?.completed_at as number) || null
			};
		});

		// Calculate stats
		const stats = {
			totalPaths: PATHS.length,
			pathsStarted: pathProgress.filter((p) => p.status !== 'not_started').length,
			pathsCompleted: pathProgress.filter((p) => p.status === 'completed').length,
			lessonsCompleted: lessonProgressList.filter((l) => l.status === 'completed').length,
			totalLessons: PATHS.reduce((sum, p) => sum + p.lessons.length, 0),
			totalTimeSpent: lessonProgressList.reduce((sum, l) => sum + l.timeSpent, 0)
		};

		return json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				name: user.name
			},
			pathProgress,
			lessonProgress: lessonProgressList,
			stats
		});
	} catch (err) {
		console.error('Error fetching progress:', err);
		throw error(500, 'Failed to fetch progress data');
	}
};
