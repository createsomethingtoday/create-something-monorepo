/**
 * Error utilities for CREATE SOMETHING
 *
 * Provides consistent error handling with correlation IDs
 * for debugging production issues.
 */

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
 *   console.error('API error:', { correlationId, err });
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

/**
 * Log an error with correlation ID and structured context
 *
 * @param context - What operation was being performed
 * @param error - The error that occurred
 * @param correlationId - Correlation ID for tracing
 * @param metadata - Additional context for debugging
 *
 * @example
 * catch (err) {
 *   const correlationId = generateCorrelationId();
 *   logError('Contact form submission', err, correlationId, { email: 'user@...' });
 *   return json(createErrorResponse('Failed to submit', correlationId), { status: 500 });
 * }
 */
export function logError(
	context: string,
	error: unknown,
	correlationId: string,
	metadata?: Record<string, unknown>
): void {
	console.error(`[${correlationId}] ${context}:`, {
		error: error instanceof Error ? error.message : String(error),
		stack: error instanceof Error ? error.stack : undefined,
		correlationId,
		timestamp: new Date().toISOString(),
		...metadata
	});
}
