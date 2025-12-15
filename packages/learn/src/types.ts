/**
 * CREATE SOMETHING Learn - Types
 *
 * Canon: Types are the skeleton of understanding.
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
	praxis?: string;
}

export interface Path {
	id: string;
	title: string;
	subtitle: string;
	description: string;
	principle: string;
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
// Praxis Exercises
// ─────────────────────────────────────────────────────────────────────────────

export interface PraxisAttempt {
	id: number;
	praxisId: string;
	status: 'started' | 'submitted' | 'passed' | 'failed';
	submission?: unknown;
	feedback?: string;
	score?: number;
	startedAt: number;
	submittedAt?: number;
}

export interface PraxisSubmission {
	targetPath?: string;
	reflection: string;
	auditResult?: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Offline Queue
// ─────────────────────────────────────────────────────────────────────────────

export interface QueuedAction {
	id: string;
	type: 'lesson_complete' | 'praxis_submit' | 'reflection';
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

// ─────────────────────────────────────────────────────────────────────────────
// Ethos Layer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A principle in the user's personal ethos.
 * Principles are high-level guidelines derived from the Subtractive Triad.
 */
export interface EthosPrinciple {
	id: string;
	text: string;
	level: 'dry' | 'rams' | 'heidegger'; // Which triad level it derives from
	domain?: string; // Optional domain (e.g., "components", "api", "tests")
	createdAt: number;
	updatedAt: number;
}

/**
 * A constraint that enforces a principle.
 * Constraints are concrete rules Claude Code can check.
 */
export interface EthosConstraint {
	id: string;
	principleId: string; // Links to the principle it enforces
	pattern: string; // Glob pattern for files (e.g., "*.test.ts", "src/api/*")
	rule: string; // The constraint rule
	severity: 'error' | 'warning' | 'info';
	createdAt: number;
}

/**
 * A health check for the codebase.
 * Health checks are quantitative metrics.
 */
export interface EthosHealthCheck {
	id: string;
	name: string;
	description: string;
	metric: string; // What to measure (e.g., "bundle_size", "dependency_count")
	threshold: string; // The threshold (e.g., "< 200KB", "> 80%")
	command?: string; // Optional command to run
	createdAt: number;
}

/**
 * The user's complete ethos configuration.
 * This is what gets persisted and referenced by Claude Code.
 */
export interface UserEthos {
	version: 1;
	name: string; // Name for this ethos (e.g., "My React Principles")
	description?: string;
	principles: EthosPrinciple[];
	constraints: EthosConstraint[];
	healthChecks: EthosHealthCheck[];
	createdAt: number;
	updatedAt: number;
}

/**
 * Actions that can be performed on the ethos.
 */
export type EthosAction =
	| { type: 'view' }
	| { type: 'add_principle'; text: string; level: EthosPrinciple['level']; domain?: string }
	| { type: 'add_constraint'; principleId: string; pattern: string; rule: string; severity?: EthosConstraint['severity'] }
	| { type: 'add_health_check'; name: string; description: string; metric: string; threshold: string; command?: string }
	| { type: 'remove_principle'; id: string }
	| { type: 'remove_constraint'; id: string }
	| { type: 'remove_health_check'; id: string }
	| { type: 'clear' }
	| { type: 'export' }
	| { type: 'import'; ethos: UserEthos };
