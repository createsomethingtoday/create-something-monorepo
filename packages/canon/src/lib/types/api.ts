/**
 * Standardized API Response Types
 *
 * All API endpoints should use these types for consistent responses.
 *
 * Success: { success: true, data: T }
 * Error: { success: false, error: string, correlationId?: string }
 *
 * @example
 * // Success response
 * return json({ success: true, data: user } as ApiResponse<User>);
 *
 * // Error response with correlation ID
 * const correlationId = generateCorrelationId();
 * logError('User fetch', err, correlationId);
 * return json({
 *   success: false,
 *   error: 'Failed to fetch user',
 *   correlationId
 * } as ApiResponse<never>, { status: 500 });
 */

/**
 * Standard API response envelope
 */
export type ApiResponse<T> =
	| { success: true; data: T }
	| { success: false; error: string; correlationId?: string; message?: string };

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
	success: true;
	data: T[];
	pagination: {
		total: number;
		offset: number;
		limit: number;
		hasMore: boolean;
	};
}

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(
	response: ApiResponse<T>
): response is { success: true; data: T } {
	return response.success === true;
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse<T>(
	response: ApiResponse<T>
): response is { success: false; error: string; correlationId?: string } {
	return response.success === false;
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T): ApiResponse<T> {
	return { success: true, data };
}

/**
 * Create an error response with optional correlation ID
 */
export function errorResponse(
	error: string,
	correlationId?: string
): ApiResponse<never> {
	return correlationId
		? { success: false, error, correlationId }
		: { success: false, error };
}
