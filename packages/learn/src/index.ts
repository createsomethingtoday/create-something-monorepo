/**
 * @createsomething/learn
 *
 * MCP server for CREATE SOMETHING methodology learning.
 * Integrates with Claude Code for distributed education.
 *
 * @example
 * // In Claude Code settings:
 * {
 *   "mcpServers": {
 *     "learn": {
 *       "command": "npx",
 *       "args": ["@createsomething/learn"]
 *     }
 *   }
 * }
 *
 * @packageDocumentation
 */

// Types
export type {
	AuthTokens,
	User,
	AuthState,
	Lesson,
	Path,
	LessonContent,
	ProgressOverview,
	PraxisAttempt,
	OfflineQueue,
	CacheManifest
} from './types.js';

// Auth
export { loadAuth, saveAuth, clearAuth, isAuthenticated, getCurrentUser } from './auth/storage.js';
export { authenticateWithMagicLink } from './auth/magic-link.js';

// Client
export { LMSClient } from './client/lms-api.js';

// Cache
export {
	getCachedLesson,
	cacheLesson,
	isLessonCached,
	clearLessonCache,
	getLessonWithCache
} from './cache/lessons.js';

// Tools (for programmatic use)
export {
	authenticateTool,
	handleAuthenticate,
	statusTool,
	handleStatus,
	lessonTool,
	handleLesson,
	completeTool,
	handleComplete,
	praxisTool,
	handlePraxis
} from './tools/index.js';
