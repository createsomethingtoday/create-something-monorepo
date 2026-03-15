/**
 * Error utilities and structured logging for CREATE SOMETHING
 *
 * Provides consistent error handling with correlation IDs
 * and structured JSON logging for production debugging.
 *
 * Design: Zero-dependency structured logging optimized for Cloudflare Workers.
 * Uses console.* methods with JSON output for log aggregation compatibility.
 */

// ============================================
// Correlation IDs
// ============================================

/**
 * Generate a unique correlation ID for request tracing
 *
 * Format: cs-{timestamp}-{random}
 * Example: cs-1735580400-a1b2c3
 *
 * Short enough to include in logs, unique enough for debugging.
 */
export function generateCorrelationId(): string {
	const timestamp = Math.floor(Date.now() / 1000).toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `cs-${timestamp}-${random}`;
}

// ============================================
// Error Response
// ============================================

/**
 * Error response structure with correlation ID
 */
export interface ErrorResponse {
	success: false;
	error: string;
	correlationId: string;
	message?: string;
}

/**
 * Create a standardized error response with correlation ID
 *
 * @param error - Error message or description
 * @param correlationId - Optional existing correlation ID (generates new one if not provided)
 * @param message - Optional additional message for the user
 *
 * @example
 * // In a SvelteKit API endpoint
 * catch (err) {
 *   const correlationId = generateCorrelationId();
 *   log.error('API error', { correlationId, err });
 *   return json(createErrorResponse('Failed to process request', correlationId), { status: 500 });
 * }
 */
export function createErrorResponse(
	error: string,
	correlationId?: string,
	message?: string
): ErrorResponse {
	return {
		success: false,
		error,
		correlationId: correlationId || generateCorrelationId(),
		...(message && { message })
	};
}

// ============================================
// Structured Logging
// ============================================

/**
 * Log levels with numeric priority for filtering
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3
};

/**
 * Structured log entry
 */
export interface LogEntry {
	level: LogLevel;
	message: string;
	timestamp: string;
	correlationId?: string;
	context?: string;
	error?: {
		message: string;
		stack?: string;
		name?: string;
	};
	[key: string]: unknown;
}

/**
 * Format an error object for logging
 */
function formatError(error: unknown): LogEntry['error'] | undefined {
	if (!error) return undefined;
	if (error instanceof Error) {
		return {
			message: error.message,
			stack: error.stack,
			name: error.name
		};
	}
	return { message: String(error) };
}

/**
 * Create a structured log entry
 */
function createLogEntry(
	level: LogLevel,
	message: string,
	metadata?: Record<string, unknown>
): LogEntry {
	const entry: LogEntry = {
		level,
		message,
		timestamp: new Date().toISOString()
	};

	if (metadata) {
		// Extract special fields
		const { correlationId, context, error, ...rest } = metadata;

		if (correlationId) entry.correlationId = String(correlationId);
		if (context) entry.context = String(context);
		if (error) entry.error = formatError(error);

		// Add remaining metadata
		Object.assign(entry, rest);
	}

	return entry;
}

/**
 * Structured logger for CREATE SOMETHING
 *
 * Outputs JSON-formatted logs compatible with log aggregation services
 * (Cloudflare Workers Logs, Datadog, etc.)
 *
 * @example
 * import { log } from '@create-something/canon/utils';
 *
 * // Simple logging
 * log.info('User signed up', { userId: '123', email: 'user@example.com' });
 *
 * // Error logging with correlation ID
 * const correlationId = generateCorrelationId();
 * log.error('Payment failed', { correlationId, error: err, amount: 100 });
 *
 * // Debug logging (filtered in production by log level)
 * log.debug('Cache hit', { key: 'user:123' });
 */
export const log = {
	/**
	 * Debug-level log (development only)
	 */
	debug(message: string, metadata?: Record<string, unknown>): void {
		const entry = createLogEntry('debug', message, metadata);
		console.debug(JSON.stringify(entry));
	},

	/**
	 * Info-level log (normal operations)
	 */
	info(message: string, metadata?: Record<string, unknown>): void {
		const entry = createLogEntry('info', message, metadata);
		console.info(JSON.stringify(entry));
	},

	/**
	 * Warning-level log (potential issues)
	 */
	warn(message: string, metadata?: Record<string, unknown>): void {
		const entry = createLogEntry('warn', message, metadata);
		console.warn(JSON.stringify(entry));
	},

	/**
	 * Error-level log (failures)
	 */
	error(message: string, metadata?: Record<string, unknown>): void {
		const entry = createLogEntry('error', message, metadata);
		console.error(JSON.stringify(entry));
	},

	/**
	 * Create a child logger with bound context
	 *
	 * @example
	 * const reqLog = log.child({ correlationId, path: '/api/users' });
	 * reqLog.info('Request started');
	 * reqLog.error('Request failed', { error: err });
	 */
	child(context: Record<string, unknown>) {
		return {
			debug: (message: string, metadata?: Record<string, unknown>) =>
				log.debug(message, { ...context, ...metadata }),
			info: (message: string, metadata?: Record<string, unknown>) =>
				log.info(message, { ...context, ...metadata }),
			warn: (message: string, metadata?: Record<string, unknown>) =>
				log.warn(message, { ...context, ...metadata }),
			error: (message: string, metadata?: Record<string, unknown>) =>
				log.error(message, { ...context, ...metadata })
		};
	}
};

// ============================================
// Legacy API (backward compatibility)
// ============================================

/**
 * Log an error with correlation ID and structured context
 *
 * @deprecated Use `log.error()` instead for consistent structured logging
 *
 * @param context - What operation was being performed
 * @param error - The error that occurred
 * @param correlationId - Correlation ID for tracing
 * @param metadata - Additional context for debugging
 *
 * @example
 * // Old style (still works)
 * logError('Contact form submission', err, correlationId, { email: 'user@...' });
 *
 * // New style (preferred)
 * log.error('Contact form submission', { correlationId, error: err, email: 'user@...' });
 */
export function logError(
	context: string,
	error: unknown,
	correlationId: string,
	metadata?: Record<string, unknown>
): void {
	log.error(context, {
		correlationId,
		error,
		...metadata
	});
}
