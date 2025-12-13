/**
 * Progress Store
 *
 * Client-side state for learner progress.
 * Syncs with the database via API endpoints.
 *
 * Canon: The store holds the state; the UI reveals the journey.
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

export interface LessonProgress {
	lessonId: string;
	pathId: string;
	status: 'not_started' | 'in_progress' | 'completed';
	visits: number;
	timeSpent: number;
	completedAt: number | null;
}

export interface PathProgress {
	pathId: string;
	status: 'not_started' | 'in_progress' | 'completed';
	lessonsCompleted: number;
	totalLessons: number;
	currentLesson: string | null;
	startedAt: number | null;
	completedAt: number | null;
}

export interface ProgressStats {
	totalPaths: number;
	pathsStarted: number;
	pathsCompleted: number;
	lessonsCompleted: number;
	totalLessons: number;
	totalTimeSpent: number;
}

export interface ProgressState {
	pathProgress: PathProgress[];
	lessonProgress: LessonProgress[];
	stats: ProgressStats;
	loading: boolean;
	error: string | null;
}

// ───────────────────────────────────────────────────────────────────────────
// Store
// ───────────────────────────────────────────────────────────────────────────

const initialState: ProgressState = {
	pathProgress: [],
	lessonProgress: [],
	stats: {
		totalPaths: 0,
		pathsStarted: 0,
		pathsCompleted: 0,
		lessonsCompleted: 0,
		totalLessons: 0,
		totalTimeSpent: 0
	},
	loading: false,
	error: null
};

const progressStore = writable<ProgressState>(initialState);

// ───────────────────────────────────────────────────────────────────────────
// Actions
// ───────────────────────────────────────────────────────────────────────────

/**
 * Fetch the user's complete progress from the API.
 */
async function fetchProgress() {
	if (!browser) return;

	progressStore.update((state) => ({ ...state, loading: true, error: null }));

	try {
		const response = await fetch('/api/progress', {
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch progress: ${response.statusText}`);
		}

		const data = (await response.json()) as {
			pathProgress: PathProgress[];
			lessonProgress: LessonProgress[];
			stats: ProgressStats;
		};

		progressStore.update((state) => ({
			...state,
			pathProgress: data.pathProgress || [],
			lessonProgress: data.lessonProgress || [],
			stats: data.stats || state.stats,
			loading: false,
			error: null
		}));
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		progressStore.update((state) => ({
			...state,
			loading: false,
			error: message
		}));
		console.error('Error fetching progress:', err);
	}
}

/**
 * Start a lesson.
 */
async function startLesson(pathId: string, lessonId: string): Promise<void> {
	if (!browser) return;

	try {
		const response = await fetch('/api/progress/lesson', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ pathId, lessonId, action: 'start' })
		});

		if (!response.ok) {
			throw new Error(`Failed to start lesson: ${response.statusText}`);
		}

		// Refresh progress
		await fetchProgress();
	} catch (err) {
		console.error('Error starting lesson:', err);
		throw err;
	}
}

/**
 * Complete a lesson.
 */
async function completeLesson(
	pathId: string,
	lessonId: string,
	timeSpent: number
): Promise<{ pathCompleted: boolean }> {
	if (!browser) return { pathCompleted: false };

	try {
		const response = await fetch('/api/progress/lesson', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ pathId, lessonId, action: 'complete', timeSpent })
		});

		if (!response.ok) {
			throw new Error(`Failed to complete lesson: ${response.statusText}`);
		}

		const data = (await response.json()) as { pathCompleted: boolean };

		// Refresh progress
		await fetchProgress();

		return { pathCompleted: data.pathCompleted || false };
	} catch (err) {
		console.error('Error completing lesson:', err);
		throw err;
	}
}

/**
 * Start a praxis exercise.
 */
async function startPraxis(praxisId: string): Promise<number> {
	if (!browser) return -1;

	try {
		const response = await fetch('/api/progress/praxis', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ praxisId, action: 'start' })
		});

		if (!response.ok) {
			throw new Error(`Failed to start praxis: ${response.statusText}`);
		}

		const data = (await response.json()) as { attemptId: number };
		return data.attemptId;
	} catch (err) {
		console.error('Error starting praxis:', err);
		throw err;
	}
}

/**
 * Submit a praxis exercise.
 */
async function submitPraxis(
	praxisId: string,
	submission: unknown,
	score: number,
	passed: boolean,
	feedback?: string
): Promise<{ passed: boolean; score: number; feedback?: string }> {
	if (!browser) return { passed: false, score: 0 };

	try {
		const response = await fetch('/api/progress/praxis', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ praxisId, action: 'submit', submission, score, passed, feedback })
		});

		if (!response.ok) {
			throw new Error(`Failed to submit praxis: ${response.statusText}`);
		}

		const data = (await response.json()) as {
			passed: boolean;
			score: number;
			feedback?: string;
		};

		// Refresh progress
		await fetchProgress();

		return {
			passed: data.passed,
			score: data.score,
			feedback: data.feedback
		};
	} catch (err) {
		console.error('Error submitting praxis:', err);
		throw err;
	}
}

/**
 * Get praxis attempts for a specific exercise.
 */
async function getPraxisAttempts(praxisId: string) {
	if (!browser) return [];

	try {
		const response = await fetch(`/api/progress/praxis?praxisId=${encodeURIComponent(praxisId)}`, {
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch praxis attempts: ${response.statusText}`);
		}

		const data = (await response.json()) as { attempts: unknown[] };
		return data.attempts || [];
	} catch (err) {
		console.error('Error fetching praxis attempts:', err);
		return [];
	}
}

// ───────────────────────────────────────────────────────────────────────────
// Derived Stores
// ───────────────────────────────────────────────────────────────────────────

/**
 * Get progress for a specific lesson.
 */
export function getLessonProgress(pathId: string, lessonId: string) {
	return derived(progressStore, ($progress) =>
		$progress.lessonProgress.find((lp) => lp.pathId === pathId && lp.lessonId === lessonId)
	);
}

/**
 * Get progress for a specific path.
 */
export function getPathProgress(pathId: string) {
	return derived(progressStore, ($progress) =>
		$progress.pathProgress.find((pp) => pp.pathId === pathId)
	);
}

/**
 * Get overall progress percentage (0-100).
 */
export const overallProgress = derived(progressStore, ($progress) => {
	if ($progress.stats.totalLessons === 0) return 0;
	return Math.round(($progress.stats.lessonsCompleted / $progress.stats.totalLessons) * 100);
});

// ───────────────────────────────────────────────────────────────────────────
// Exports
// ───────────────────────────────────────────────────────────────────────────

export const progress = {
	subscribe: progressStore.subscribe,
	fetch: fetchProgress,
	startLesson,
	completeLesson,
	startPraxis,
	submitPraxis,
	getPraxisAttempts
};
