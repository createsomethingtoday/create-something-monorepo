/**
 * Context-Aware Logger with D1 Persistence
 *
 * Creates loggers with bound context (service name, correlation ID, etc.)
 * for consistent, structured logging across API endpoints.
 *
 * Supports optional D1 persistence for agent-queryable error tracking.
 * Agents can query persisted errors to analyze patterns, correlate issues,
 * and autonomously respond to recurring problems.
 *
 * @example
 * import { createLogger, createPersistentLogger } from '@create-something/components/utils';
 *
 * // Simple logger (console only)
 * const logger = createLogger('ProfileAPI');
 *
 * // Persistent logger (console + D1)
 * const logger = createPersistentLogger('ProfileAPI', {
 *   db: platform.env.DB,
 *   waitUntil: ctx.waitUntil.bind(ctx)
 * });
 *
 * // Use throughout the handler
 * logger.info('Fetching profile', { userId });
 * logger.error('Failed to update', { error }); // This gets persisted to D1
 */

import { log, generateCorrelationId, type LogLevel } from './errors.js';

// ============================================
// Types
// ============================================

/**
 * D1 Database interface (Cloudflare D1)
 */
interface D1Database {
	prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	run(): Promise<D1Result>;
	all<T = unknown>(): Promise<D1QueryResult<T>>;
}

interface D1Result {
	success: boolean;
	error?: string;
}

interface D1QueryResult<T> {
	results: T[] | null;
	success: boolean;
	error?: string;
}

/**
 * Logger context that gets included in every log entry
 */
export interface LoggerContext {
	/** Service or component name */
	service?: string;
	/** Request correlation ID */
	correlationId?: string;
	/** Environment (production, development) */
	environment?: string;
	/** Request path */
	path?: string;
	/** HTTP method */
	method?: string;
	/** User ID if authenticated */
	userId?: string;
	/** Additional static context */
	[key: string]: unknown;
}

/**
 * Options for persistent logger
 */
export interface PersistentLoggerOptions {
	/** D1 database instance */
	db: D1Database;
	/** Optional waitUntil for non-blocking persistence */
	waitUntil?: (promise: Promise<unknown>) => void;
	/** Minimum level to persist (default: 'warn') */
	minPersistLevel?: 'warn' | 'error';
}

/**
 * Logger interface
 */
export interface Logger {
	debug(message: string, metadata?: Record<string, unknown>): void;
	info(message: string, metadata?: Record<string, unknown>): void;
	warn(message: string, metadata?: Record<string, unknown>): void;
	error(message: string, metadata?: Record<string, unknown>): void;
	/** Create a child logger with additional context */
	child(context: Record<string, unknown>): Logger;
	/** Get the current correlation ID (generates one if not set) */
	getCorrelationId(): string;
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a contextualized logger
 *
 * @param service - Service name (e.g., 'ProfileAPI', 'AuthHandler')
 * @param context - Additional context to include in all logs
 *
 * @example
 * // Simple service logger
 * const logger = createLogger('ProfileAPI');
 * logger.info('Processing request');
 *
 * // Logger with correlation ID
 * const reqLogger = createLogger('ProfileAPI', {
 *   correlationId: generateCorrelationId(),
 *   path: '/api/profile'
 * });
 * reqLogger.info('Request started');
 * reqLogger.error('Request failed', { error: err });
 *
 * // Child logger for sub-operations
 * const dbLogger = reqLogger.child({ operation: 'database' });
 * dbLogger.info('Querying user');
 */
export function createLogger(service: string, context: LoggerContext = {}): Logger {
	const baseContext: LoggerContext = {
		service,
		...context
	};

	// Ensure we have a correlation ID
	if (!baseContext.correlationId) {
		baseContext.correlationId = generateCorrelationId();
	}

	const formatMessage = (message: string) => `[${service}] ${message}`;

	return {
		debug(message: string, metadata?: Record<string, unknown>) {
			log.debug(formatMessage(message), { ...baseContext, ...metadata });
		},

		info(message: string, metadata?: Record<string, unknown>) {
			log.info(formatMessage(message), { ...baseContext, ...metadata });
		},

		warn(message: string, metadata?: Record<string, unknown>) {
			log.warn(formatMessage(message), { ...baseContext, ...metadata });
		},

		error(message: string, metadata?: Record<string, unknown>) {
			log.error(formatMessage(message), { ...baseContext, ...metadata });
		},

		child(additionalContext: Record<string, unknown>): Logger {
			return createLogger(service, { ...baseContext, ...additionalContext });
		},

		getCorrelationId(): string {
			return baseContext.correlationId as string;
		}
	};
}

// ============================================
// Persistent Logger Factory (D1 Integration)
// ============================================

/**
 * Extract error details from various error formats
 */
function extractErrorDetails(metadata?: Record<string, unknown>): {
	errorName: string | null;
	errorMessage: string | null;
	stackTrace: string | null;
} {
	if (!metadata?.error) {
		return { errorName: null, errorMessage: null, stackTrace: null };
	}

	const err = metadata.error;
	if (err instanceof Error) {
		return {
			errorName: err.name,
			errorMessage: err.message,
			stackTrace: err.stack || null
		};
	}

	if (typeof err === 'object' && err !== null) {
		const errObj = err as Record<string, unknown>;
		return {
			errorName: (errObj.name as string) || null,
			errorMessage: (errObj.message as string) || null,
			stackTrace: (errObj.stack as string) || null
		};
	}

	return {
		errorName: null,
		errorMessage: String(err),
		stackTrace: null
	};
}

/**
 * Persist error to D1 for agent analysis
 */
async function persistErrorToD1(
	db: D1Database,
	level: 'warn' | 'error',
	service: string,
	message: string,
	context: LoggerContext,
	metadata?: Record<string, unknown>
): Promise<void> {
	try {
		const { errorName, errorMessage, stackTrace } = extractErrorDetails(metadata);

		// Filter out the error object from metadata before stringifying
		const cleanMetadata = metadata ? { ...metadata } : {};
		delete cleanMetadata.error;

		await db
			.prepare(
				`INSERT INTO agent_error_logs (
					level, service, message, correlation_id, path, method, user_id,
					metadata, error_name, error_message, stack_trace, resolution_status
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`
			)
			.bind(
				level,
				service,
				message,
				context.correlationId || null,
				context.path || null,
				context.method || null,
				context.userId || null,
				Object.keys(cleanMetadata).length > 0 ? JSON.stringify(cleanMetadata) : null,
				errorName,
				errorMessage,
				stackTrace
			)
			.run();
	} catch (persistError) {
		// Log persistence failure to console but don't throw
		// We never want persistence to break the application
		console.error('[Logger] Failed to persist error to D1:', persistError);
	}
}

/**
 * Create a logger that persists errors/warnings to D1 for agent analysis
 *
 * @param service - Service name (e.g., 'ProfileAPI', 'AuthHandler')
 * @param options - D1 database and persistence options
 * @param context - Additional context to include in all logs
 *
 * @example
 * // In a SvelteKit endpoint
 * export const POST: RequestHandler = async ({ platform, request }) => {
 *   const logger = createPersistentLogger('ProfileAPI', {
 *     db: platform.env.DB,
 *     waitUntil: ctx.waitUntil.bind(ctx)
 *   }, {
 *     path: '/api/profile',
 *     method: 'POST'
 *   });
 *
 *   try {
 *     // ... handler logic
 *   } catch (err) {
 *     logger.error('Profile update failed', { error: err, userId });
 *     // Error is automatically persisted to D1 for agent analysis
 *   }
 * };
 */
export function createPersistentLogger(
	service: string,
	options: PersistentLoggerOptions,
	context: LoggerContext = {}
): Logger {
	const { db, waitUntil, minPersistLevel = 'warn' } = options;
	const baseContext: LoggerContext = {
		service,
		...context
	};

	// Ensure we have a correlation ID
	if (!baseContext.correlationId) {
		baseContext.correlationId = generateCorrelationId();
	}

	const formatMessage = (message: string) => `[${service}] ${message}`;

	const shouldPersist = (level: 'warn' | 'error'): boolean => {
		if (minPersistLevel === 'error') {
			return level === 'error';
		}
		return true; // 'warn' includes both warn and error
	};

	const persistIfNeeded = (
		level: 'warn' | 'error',
		message: string,
		metadata?: Record<string, unknown>
	) => {
		if (!shouldPersist(level)) return;

		const persistPromise = persistErrorToD1(db, level, service, message, baseContext, metadata);

		if (waitUntil) {
			// Non-blocking persistence using Cloudflare's waitUntil
			waitUntil(persistPromise);
		} else {
			// Fire and forget (not ideal but maintains non-blocking behavior)
			persistPromise.catch(() => {
				// Already logged in persistErrorToD1
			});
		}
	};

	return {
		debug(message: string, metadata?: Record<string, unknown>) {
			log.debug(formatMessage(message), { ...baseContext, ...metadata });
		},

		info(message: string, metadata?: Record<string, unknown>) {
			log.info(formatMessage(message), { ...baseContext, ...metadata });
		},

		warn(message: string, metadata?: Record<string, unknown>) {
			log.warn(formatMessage(message), { ...baseContext, ...metadata });
			persistIfNeeded('warn', message, metadata);
		},

		error(message: string, metadata?: Record<string, unknown>) {
			log.error(formatMessage(message), { ...baseContext, ...metadata });
			persistIfNeeded('error', message, metadata);
		},

		child(additionalContext: Record<string, unknown>): Logger {
			return createPersistentLogger(service, options, { ...baseContext, ...additionalContext });
		},

		getCorrelationId(): string {
			return baseContext.correlationId as string;
		}
	};
}

// ============================================
// Request Logger Factory
// ============================================

/**
 * Create a logger for a SvelteKit request
 *
 * Automatically extracts useful context from the request event.
 *
 * @param service - Service name
 * @param event - SvelteKit request event
 *
 * @example
 * export const POST: RequestHandler = async (event) => {
 *   const logger = createRequestLogger('ProfileAPI', event);
 *   logger.info('Processing profile update');
 *   // ...
 * };
 */
export function createRequestLogger(
	service: string,
	event: { url: URL; request: Request }
): Logger {
	return createLogger(service, {
		correlationId: generateCorrelationId(),
		path: event.url.pathname,
		method: event.request.method
	});
}

/**
 * Request event with platform for persistent logger
 */
interface PersistentRequestEvent {
	url: URL;
	request: Request;
	platform?: {
		env?: {
			DB?: D1Database;
		};
		ctx?: {
			waitUntil: (promise: Promise<unknown>) => void;
		};
	};
}

/**
 * Create a persistent logger for a SvelteKit request
 *
 * Automatically extracts context and D1 from the request event.
 * Falls back to non-persistent logger if D1 is not available.
 *
 * @param service - Service name
 * @param event - SvelteKit request event with platform
 *
 * @example
 * export const POST: RequestHandler = async (event) => {
 *   const logger = createPersistentRequestLogger('ProfileAPI', event);
 *   logger.error('Something failed', { error }); // Auto-persisted to D1
 * };
 */
export function createPersistentRequestLogger(
	service: string,
	event: PersistentRequestEvent
): Logger {
	const context: LoggerContext = {
		correlationId: generateCorrelationId(),
		path: event.url.pathname,
		method: event.request.method
	};

	const db = event.platform?.env?.DB;
	if (!db) {
		// Fallback to non-persistent logger
		return createLogger(service, context);
	}

	return createPersistentLogger(
		service,
		{
			db,
			waitUntil: event.platform?.ctx?.waitUntil?.bind(event.platform.ctx)
		},
		context
	);
}

// ============================================
// Timing Utilities
// ============================================

/**
 * Create a timer for measuring operation duration
 *
 * @example
 * const timer = createTimer();
 * await someOperation();
 * logger.info('Operation complete', { duration: timer.elapsed() });
 */
export function createTimer(): { elapsed: () => number; elapsedMs: () => string } {
	const start = performance.now();

	return {
		/** Get elapsed time in milliseconds */
		elapsed: () => Math.round(performance.now() - start),
		/** Get elapsed time as formatted string */
		elapsedMs: () => `${Math.round(performance.now() - start)}ms`
	};
}

/**
 * Log the duration of an async operation
 *
 * @example
 * const result = await logDuration(logger, 'Database query', async () => {
 *   return await db.query('SELECT * FROM users');
 * });
 */
export async function logDuration<T>(
	logger: Logger,
	operation: string,
	fn: () => Promise<T>
): Promise<T> {
	const timer = createTimer();
	logger.debug(`${operation} started`);

	try {
		const result = await fn();
		logger.info(`${operation} completed`, { duration: timer.elapsedMs() });
		return result;
	} catch (error) {
		logger.error(`${operation} failed`, { duration: timer.elapsedMs(), error });
		throw error;
	}
}

// ============================================
// Agent Error Query Utilities
// ============================================

/**
 * Error log entry from D1
 */
export interface ErrorLogEntry {
	id: string;
	level: 'error' | 'warn' | 'fatal';
	service: string;
	message: string;
	correlation_id: string | null;
	path: string | null;
	method: string | null;
	user_id: string | null;
	metadata: string | null;
	error_name: string | null;
	error_message: string | null;
	stack_trace: string | null;
	created_at: string;
	resolution_status: 'new' | 'analyzing' | 'resolved' | 'wontfix' | 'recurring' | null;
}

/**
 * Error pattern from v_error_patterns view
 */
export interface ErrorPattern {
	service: string;
	message: string;
	error_name: string | null;
	path: string | null;
	occurrence_count: number;
	first_seen: string;
	last_seen: string;
	unique_requests: number;
	affected_users: number;
}

/**
 * Agent utilities for querying error logs
 *
 * These utilities enable AI agents to programmatically analyze application errors.
 *
 * @example
 * // In an agent context
 * const patterns = await AgentErrorQueries.getErrorPatterns(db);
 * const unresolvedErrors = await AgentErrorQueries.getUnresolvedErrors(db);
 */
export const AgentErrorQueries = {
	/**
	 * Get error patterns from the last 7 days
	 */
	async getErrorPatterns(db: D1Database): Promise<ErrorPattern[]> {
		const result = await db
			.prepare('SELECT * FROM v_error_patterns ORDER BY occurrence_count DESC LIMIT 100')
			.all<ErrorPattern>();
		return result.results || [];
	},

	/**
	 * Get unresolved errors (new or recurring)
	 */
	async getUnresolvedErrors(db: D1Database, limit = 50): Promise<ErrorLogEntry[]> {
		const result = await db
			.prepare(
				`SELECT * FROM agent_error_logs 
				 WHERE resolution_status IN ('new', 'recurring')
				 ORDER BY created_at DESC 
				 LIMIT ?`
			)
			.bind(limit)
			.all<ErrorLogEntry>();
		return result.results || [];
	},

	/**
	 * Get errors by service
	 */
	async getErrorsByService(db: D1Database, service: string, limit = 50): Promise<ErrorLogEntry[]> {
		const result = await db
			.prepare(
				`SELECT * FROM agent_error_logs 
				 WHERE service = ? 
				 ORDER BY created_at DESC 
				 LIMIT ?`
			)
			.bind(service, limit)
			.all<ErrorLogEntry>();
		return result.results || [];
	},

	/**
	 * Get errors by correlation ID (trace a request)
	 */
	async getErrorsByCorrelationId(
		db: D1Database,
		correlationId: string
	): Promise<ErrorLogEntry[]> {
		const result = await db
			.prepare(
				`SELECT * FROM agent_error_logs 
				 WHERE correlation_id = ? 
				 ORDER BY created_at ASC`
			)
			.bind(correlationId)
			.all<ErrorLogEntry>();
		return result.results || [];
	},

	/**
	 * Mark an error as being analyzed by an agent
	 */
	async markAsAnalyzing(db: D1Database, errorId: string, agentId: string): Promise<void> {
		await db
			.prepare(
				`UPDATE agent_error_logs 
				 SET resolution_status = 'analyzing', 
				     analyzed_at = CURRENT_TIMESTAMP,
				     analyzed_by = ?
				 WHERE id = ?`
			)
			.bind(agentId, errorId)
			.run();
	},

	/**
	 * Mark an error as resolved
	 */
	async markAsResolved(
		db: D1Database,
		errorId: string,
		notes: string,
		linkedIssueId?: string
	): Promise<void> {
		await db
			.prepare(
				`UPDATE agent_error_logs 
				 SET resolution_status = 'resolved',
				     resolution_notes = ?,
				     linked_issue_id = ?
				 WHERE id = ?`
			)
			.bind(notes, linkedIssueId || null, errorId)
			.run();
	},

	/**
	 * Get daily error summary for trend analysis
	 */
	async getDailyErrorSummary(
		db: D1Database
	): Promise<Array<{ date: string; service: string; level: string; error_count: number }>> {
		const result = await db
			.prepare('SELECT * FROM v_error_daily_summary')
			.all<{ date: string; service: string; level: string; error_count: number }>();
		return result.results || [];
	}
};

// ============================================
// Convenience Exports
// ============================================

/**
 * Pre-configured loggers for common services
 *
 * @example
 * import { loggers } from '@create-something/components/utils';
 *
 * loggers.auth.info('User logged in', { userId });
 * loggers.api.error('Request failed', { error });
 */
export const loggers = {
	/** Auth-related logging */
	auth: createLogger('Auth'),
	/** API endpoint logging */
	api: createLogger('API'),
	/** Database operation logging */
	db: createLogger('Database'),
	/** External service logging */
	external: createLogger('External'),
	/** Background job logging */
	jobs: createLogger('Jobs')
};
