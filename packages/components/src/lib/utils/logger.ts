/**
 * Context-Aware Logger
 *
 * Creates loggers with bound context (service name, correlation ID, etc.)
 * for consistent, structured logging across API endpoints.
 *
 * Builds on the base `log` utility from errors.ts but provides
 * a factory pattern for creating contextualized loggers.
 *
 * @example
 * import { createLogger } from '@create-something/components/utils';
 *
 * // Create a logger for a specific service
 * const logger = createLogger('ProfileAPI');
 *
 * // Use throughout the handler
 * logger.info('Fetching profile', { userId });
 * logger.error('Failed to update', { error });
 *
 * // Or with correlation ID
 * const reqLogger = createLogger('ProfileAPI', { correlationId });
 * reqLogger.info('Request started');
 */

import { log, generateCorrelationId, type LogLevel } from './errors.js';

// ============================================
// Types
// ============================================

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
	/** Additional static context */
	[key: string]: unknown;
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
