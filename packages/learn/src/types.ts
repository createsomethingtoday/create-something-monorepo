/**
 * CREATE SOMETHING Learn - Types
 */

// ─────────────────────────────────────────────────────────────────────────────
// Authentication
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthTokens {
	accessToken: string;
	refreshToken: string;
	expiresAt: number; // Unix timestamp
}

export interface User {
	id: string;
	email: string;
	name?: string;
	tier: 'free' | 'pro' | 'agency';
}

export interface AuthState {
	version: 1;
	tokens: AuthTokens;
	user: User;
}

export interface MagicLinkPollResponse {
	status: 'pending' | 'verified' | 'expired';
	message: string;
	accessToken?: string;
	refreshToken?: string;
	expiresIn?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Learning Paths & Lessons
// ─────────────────────────────────────────────────────────────────────────────

export interface Lesson {
	id: string;
	title: string;
	description: string;
	duration: string;
}

export interface Path {
	id: string;
	title: string;
	subtitle: string;
	description: string;
	lessons: Lesson[];
	prerequisites?: string[];
}

export interface LessonContent {
	path: {
		id: string;
		title: string;
		subtitle: string;
	};
	lesson: Lesson;
	content: {
		markdown: string;
		frontmatter: Record<string, unknown>;
		headings: Array<{ level: number; text: string; id: string }>;
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress Tracking
// ─────────────────────────────────────────────────────────────────────────────

export interface LessonProgress {
	lessonId: string;
	pathId: string;
	status: 'not_started' | 'in_progress' | 'completed';
	visits: number;
	timeSpent: number;
	completedAt?: number;
}

export interface PathProgress {
	pathId: string;
	status: 'not_started' | 'in_progress' | 'completed';
	lessonsCompleted: number;
	totalLessons: number;
	currentLesson?: string;
	startedAt?: number;
	completedAt?: number;
}

export interface ProgressStats {
	totalPaths: number;
	pathsStarted: number;
	pathsCompleted: number;
	lessonsCompleted: number;
	totalLessons: number;
	totalTimeSpent: number;
}

export interface ProgressOverview {
	user: User;
	pathProgress: PathProgress[];
	lessonProgress: LessonProgress[];
	stats: ProgressStats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Offline Queue
// ─────────────────────────────────────────────────────────────────────────────

export interface QueuedAction {
	id: string;
	type: 'lesson_complete';
	payload: unknown;
	createdAt: number;
}

export interface OfflineQueue {
	version: 1;
	actions: QueuedAction[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────────────────────────────

export interface CacheManifest {
	version: 1;
	lessons: Record<string, { fetchedAt: number; etag?: string }>;
	progress?: { fetchedAt: number };
}
