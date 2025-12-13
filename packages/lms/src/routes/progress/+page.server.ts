/**
 * Progress Page Server
 *
 * Fetches learner progress data from the database.
 * Canon: The data flows; the learner sees their journey.
 */

import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { PATHS } from '$content/paths';

interface PathProgress {
	pathId: string;
	status: 'not_started' | 'in_progress' | 'completed';
	lessonsCompleted: number;
	totalLessons: number;
	currentLesson: string | null;
	startedAt: number | null;
	completedAt: number | null;
}

interface LessonProgress {
	lessonId: string;
	pathId: string;
	status: 'not_started' | 'in_progress' | 'completed';
	visits: number;
	timeSpent: number;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
	// Check authentication via locals (set by hooks)
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/login?redirect=/progress');
	}

	const db = platform?.env?.DB;

	if (!db) {
		// Return empty progress if no database
		return {
			user,
			pathProgress: PATHS.map((path) => ({
				pathId: path.id,
				status: 'not_started' as const,
				lessonsCompleted: 0,
				totalLessons: path.lessons.length,
				currentLesson: null,
				startedAt: null,
				completedAt: null
			})),
			lessonProgress: [],
			stats: {
				totalPaths: PATHS.length,
				pathsStarted: 0,
				pathsCompleted: 0,
				lessonsCompleted: 0,
				totalLessons: PATHS.reduce((sum, p) => sum + p.lessons.length, 0),
				totalTimeSpent: 0
			}
		};
	}

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
      SELECT path_id, lesson_id, status, visits, time_spent
      FROM lesson_progress
      WHERE learner_id = ?
    `
		)
		.bind(user.id)
		.all();

	const lessonProgressList: LessonProgress[] = (lessonProgressResult.results || []).map(
		(row: Record<string, unknown>) => ({
			lessonId: row.lesson_id as string,
			pathId: row.path_id as string,
			status: row.status as 'not_started' | 'in_progress' | 'completed',
			visits: (row.visits as number) || 0,
			timeSpent: (row.time_spent as number) || 0
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
	const pathProgress: PathProgress[] = PATHS.map((path) => {
		const dbProgress = pathProgressMap.get(path.id) as Record<string, unknown> | undefined;
		return {
			pathId: path.id,
			status: (dbProgress?.status as PathProgress['status']) || 'not_started',
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

	return {
		user,
		pathProgress,
		lessonProgress: lessonProgressList,
		stats
	};
};
