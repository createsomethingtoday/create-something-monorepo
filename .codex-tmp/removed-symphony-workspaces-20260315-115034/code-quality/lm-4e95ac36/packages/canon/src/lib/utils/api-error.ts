/**
 * API Error Handling Utilities
 *
 * Unified error handling for SvelteKit API endpoints.
 * Eliminates duplicate try/catch patterns across +server.ts files.
 *
 * @example
 * import { handleApiError, catchApiError, ApiError } from '@create-something/canon/utils';
 *
 * // Option 1: Wrap entire handler
 * export const POST = catchApiError('Profile API', async ({ request }) => {
 *   // Your handler code - errors automatically caught and logged
 *   return json({ success: true });
 * });
 *
 * // Option 2: Manual catch block
 * try {
 *   // handler code
 * } catch (err) {
 *   return handleApiError('Profile API', err);
 * }
 */

import { json, error as svelteKitError } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { generateCorrelationId, log } from './errors.js';

// ============================================
// Types
// ============================================

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
	success: false;
	error: string;
	correlationId: string;
	message?: string;
}

/**
 * API handler function type
 */
export type ApiHandler<T = unknown> = (
	event: RequestEvent
) => Promise<Response> | Response;

/**
 * Options for error handling
 */
export interface HandleErrorOptions {
	/** Include stack trace in development */
	includeStack?: boolean;
	/** Default HTTP status code */
	defaultStatus?: number;
	/** Custom error mapper */
	mapError?: (err: unknown) => { message: string; status: number };
}

// ============================================
// Custom Error Classes
// ============================================

/**
 * API Error with status code
 *
 * Throw this for controlled API errors with specific status codes.
 *
 * @example
 * throw new ApiError('User not found', 404);
 * throw new ApiError('Unauthorized', 401);
 */
export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number = 500,
		public readonly code?: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}

/**
 * Validation Error (400)
 */
export class ValidationError extends ApiError {
	constructor(message: string, public readonly field?: string) {
		super(message, 400, 'VALIDATION_ERROR');
		this.name = 'ValidationError';
	}
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends ApiError {
	constructor(resource: string) {
		super(`${resource} not found`, 404, 'NOT_FOUND');
		this.name = 'NotFoundError';
	}
}

/**
 * Unauthorized Error (401)
 */
export class UnauthorizedError extends ApiError {
	constructor(message = 'Unauthorized') {
		super(message, 401, 'UNAUTHORIZED');
		this.name = 'UnauthorizedError';
	}
}

/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends ApiError {
	constructor(message = 'Forbidden') {
		super(message, 403, 'FORBIDDEN');
		this.name = 'ForbiddenError';
	}
}

// ============================================
// Error Handlers
// ============================================

/**
 * Handle an API error and return standardized response
 *
 * Extracts error info, generates correlation ID, logs the error,
 * and returns a properly formatted JSON response.
 *
 * @param context - Context string for logging (e.g., 'Profile API', 'Auth')
 * @param err - The caught error
 * @param options - Optional configuration
 *
 * @example
 * catch (err) {
 *   return handleApiError('Profile API', err);
 * }
 */
export function handleApiError(
	context: string,
	err: unknown,
	options: HandleErrorOptions = {}
): Response {
	const { defaultStatus = 500, mapError } = options;
	const correlationId = generateCorrelationId();

	// Determine status and message
	let status = defaultStatus;
	let message = 'An unexpected error occurred';

	if (err instanceof ApiError) {
		status = err.status;
		message = err.message;
	} else if (mapError) {
		const mapped = mapError(err);
		status = mapped.status;
		message = mapped.message;
	} else if (err instanceof Error) {
		message = err.message;
		// Check for SvelteKit errors
		if ('status' in err && typeof err.status === 'number') {
			status = err.status;
		}
	}

	// Log the error
	log.error(`[${context}] ${message}`, {
		correlationId,
		error: err,
		context
	});

	// Return response
	const response: ApiErrorResponse = {
		success: false,
		error: message,
		correlationId
	};

	return json(response, { status });
}

/**
 * Create a wrapped API handler with automatic error handling
 *
 * Wraps your handler function to catch any errors and return
 * a standardized error response.
 *
 * @param context - Context string for logging
 * @param handler - Your API handler function
 * @param options - Optional configuration
 *
 * @example
 * export const POST = catchApiError('Profile API', async ({ request, locals }) => {
 *   const body = await request.json();
 *   const user = locals.user;
 *
 *   if (!user) throw new UnauthorizedError();
 *
 *   // Do work...
 *   return json({ success: true, data: result });
 * });
 */
export function catchApiError<T extends RequestEvent = RequestEvent>(
	context: string,
	handler: (event: T) => Promise<Response> | Response,
	options: HandleErrorOptions = {}
): (event: T) => Promise<Response> {
	return async (event: T) => {
		try {
			return await handler(event);
		} catch (err) {
			// Re-throw SvelteKit redirect/error responses
			if (err instanceof Response) {
				throw err;
			}
			// Check for SvelteKit error() calls
			if (
				err &&
				typeof err === 'object' &&
				'status' in err &&
				'body' in err &&
				typeof (err as { status: number }).status === 'number'
			) {
				throw err;
			}
			return handleApiError(context, err, options);
		}
	};
}

// ============================================
// Utility Functions
// ============================================

/**
 * Assert a condition, throwing ApiError if false
 *
 * @example
 * assertApi(user !== null, 'User not found', 404);
 * assertApi(user.role === 'admin', 'Admin access required', 403);
 */
export function assertApi(
	condition: unknown,
	message: string,
	status = 400
): asserts condition {
	if (!condition) {
		throw new ApiError(message, status);
	}
}

/**
 * Assert user is authenticated
 *
 * @example
 * assertAuth(locals.user);
 * // locals.user is now typed as non-null
 */
export function assertAuth<T>(user: T | null | undefined): asserts user is T {
	if (!user) {
		throw new UnauthorizedError();
	}
}

/**
 * Assert a resource exists
 *
 * @example
 * const user = await db.getUserById(id);
 * assertFound(user, 'User');
 * // user is now typed as non-null
 */
export function assertFound<T>(
	resource: T | null | undefined,
	resourceName: string
): asserts resource is T {
	if (!resource) {
		throw new NotFoundError(resourceName);
	}
}

/**
 * Create a standardized success response
 *
 * @example
 * return apiSuccess({ user: updatedUser });
 * return apiSuccess({ message: 'Email sent' });
 */
export function apiSuccess<T>(data: T, status = 200): Response {
	return json({ success: true, data }, { status });
}

/**
 * Create a standardized error response without throwing
 *
 * @example
 * if (!isValid) {
 *   return apiError('Invalid input', 400);
 * }
 */
export function apiError(message: string, status = 400): Response {
	const correlationId = generateCorrelationId();
	return json(
		{
			success: false,
			error: message,
			correlationId
		} as ApiErrorResponse,
		{ status }
	);
}
