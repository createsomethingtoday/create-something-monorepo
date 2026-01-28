/**
 * API Error Handling Tests
 *
 * Tests for unified error handling utilities used across API endpoints.
 * Critical path: protects all SvelteKit API routes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	ApiError,
	ValidationError,
	NotFoundError,
	UnauthorizedError,
	ForbiddenError,
	handleApiError,
	catchApiError,
	assertApi,
	assertAuth,
	assertFound,
	apiSuccess,
	apiError
} from './api-error';

// Mock the errors module
vi.mock('./errors.js', () => ({
	generateCorrelationId: () => 'cs-test-123',
	log: {
		error: vi.fn()
	}
}));

describe('ApiError', () => {
	it('creates error with message and default status 500', () => {
		const error = new ApiError('Something went wrong');
		expect(error.message).toBe('Something went wrong');
		expect(error.status).toBe(500);
		expect(error.name).toBe('ApiError');
	});

	it('creates error with custom status', () => {
		const error = new ApiError('Bad request', 400);
		expect(error.status).toBe(400);
	});

	it('creates error with custom code', () => {
		const error = new ApiError('Rate limited', 429, 'RATE_LIMIT');
		expect(error.code).toBe('RATE_LIMIT');
	});

	it('is an instance of Error', () => {
		const error = new ApiError('Test');
		expect(error).toBeInstanceOf(Error);
	});
});

describe('ValidationError', () => {
	it('creates error with status 400', () => {
		const error = new ValidationError('Invalid email');
		expect(error.message).toBe('Invalid email');
		expect(error.status).toBe(400);
		expect(error.code).toBe('VALIDATION_ERROR');
		expect(error.name).toBe('ValidationError');
	});

	it('includes field name when provided', () => {
		const error = new ValidationError('Invalid format', 'email');
		expect(error.field).toBe('email');
	});

	it('is an instance of ApiError', () => {
		const error = new ValidationError('Test');
		expect(error).toBeInstanceOf(ApiError);
	});
});

describe('NotFoundError', () => {
	it('creates error with status 404', () => {
		const error = new NotFoundError('User');
		expect(error.message).toBe('User not found');
		expect(error.status).toBe(404);
		expect(error.code).toBe('NOT_FOUND');
		expect(error.name).toBe('NotFoundError');
	});

	it('formats resource name in message', () => {
		const error = new NotFoundError('Template');
		expect(error.message).toBe('Template not found');
	});
});

describe('UnauthorizedError', () => {
	it('creates error with status 401 and default message', () => {
		const error = new UnauthorizedError();
		expect(error.message).toBe('Unauthorized');
		expect(error.status).toBe(401);
		expect(error.code).toBe('UNAUTHORIZED');
		expect(error.name).toBe('UnauthorizedError');
	});

	it('allows custom message', () => {
		const error = new UnauthorizedError('Session expired');
		expect(error.message).toBe('Session expired');
	});
});

describe('ForbiddenError', () => {
	it('creates error with status 403 and default message', () => {
		const error = new ForbiddenError();
		expect(error.message).toBe('Forbidden');
		expect(error.status).toBe(403);
		expect(error.code).toBe('FORBIDDEN');
		expect(error.name).toBe('ForbiddenError');
	});

	it('allows custom message', () => {
		const error = new ForbiddenError('Admin access required');
		expect(error.message).toBe('Admin access required');
	});
});

describe('handleApiError', () => {
	it('returns JSON response with error info', async () => {
		const error = new ApiError('Test error', 400);
		const response = handleApiError('Test API', error);

		expect(response.status).toBe(400);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Test error');
		expect(body.correlationId).toBe('cs-test-123');
	});

	it('uses default 500 status for unknown errors', async () => {
		const error = new Error('Unknown error');
		const response = handleApiError('Test API', error);

		expect(response.status).toBe(500);

		const body = await response.json();
		expect(body.error).toBe('Unknown error');
	});

	it('respects custom default status', async () => {
		const error = new Error('Unknown');
		const response = handleApiError('Test API', error, { defaultStatus: 503 });

		expect(response.status).toBe(503);
	});

	it('uses custom error mapper when provided', async () => {
		const error = { code: 'CUSTOM_ERROR' };
		const response = handleApiError('Test API', error, {
			mapError: (err) => ({
				message: 'Custom mapped error',
				status: 422
			})
		});

		expect(response.status).toBe(422);

		const body = await response.json();
		expect(body.error).toBe('Custom mapped error');
	});

	it('extracts status from SvelteKit-like errors', async () => {
		const error = Object.assign(new Error('Not found'), { status: 404 });
		const response = handleApiError('Test API', error);

		expect(response.status).toBe(404);
	});

	it('handles non-Error thrown values', async () => {
		const response = handleApiError('Test API', 'string error');

		expect(response.status).toBe(500);

		const body = await response.json();
		expect(body.error).toBe('An unexpected error occurred');
	});
});

describe('catchApiError', () => {
	it('passes through successful responses', async () => {
		const handler = catchApiError('Test', async () => {
			return new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		});

		const response = await handler({} as any);
		expect(response.status).toBe(200);

		const body = await response.json();
		expect(body.success).toBe(true);
	});

	it('catches and handles ApiError', async () => {
		const handler = catchApiError('Test', async () => {
			throw new ApiError('Bad request', 400);
		});

		const response = await handler({} as any);
		expect(response.status).toBe(400);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Bad request');
	});

	it('catches and handles generic errors', async () => {
		const handler = catchApiError('Test', async () => {
			throw new Error('Something broke');
		});

		const response = await handler({} as any);
		expect(response.status).toBe(500);

		const body = await response.json();
		expect(body.error).toBe('Something broke');
	});

	it('re-throws Response objects', async () => {
		const redirectResponse = new Response(null, { status: 302 });

		const handler = catchApiError('Test', async () => {
			throw redirectResponse;
		});

		await expect(handler({} as any)).rejects.toBe(redirectResponse);
	});

	it('re-throws SvelteKit error objects', async () => {
		const svelteKitError = { status: 404, body: { message: 'Not found' } };

		const handler = catchApiError('Test', async () => {
			throw svelteKitError;
		});

		await expect(handler({} as any)).rejects.toBe(svelteKitError);
	});
});

describe('assertApi', () => {
	it('does not throw when condition is truthy', () => {
		expect(() => assertApi(true, 'Error')).not.toThrow();
		expect(() => assertApi('string', 'Error')).not.toThrow();
		expect(() => assertApi(1, 'Error')).not.toThrow();
		expect(() => assertApi({}, 'Error')).not.toThrow();
	});

	it('throws ApiError when condition is falsy', () => {
		expect(() => assertApi(false, 'Must be true')).toThrow(ApiError);
		expect(() => assertApi(null, 'Must exist')).toThrow(ApiError);
		expect(() => assertApi(undefined, 'Must exist')).toThrow(ApiError);
		expect(() => assertApi(0, 'Must be non-zero')).toThrow(ApiError);
		expect(() => assertApi('', 'Must be non-empty')).toThrow(ApiError);
	});

	it('uses provided message', () => {
		try {
			assertApi(false, 'Custom error message');
		} catch (err) {
			expect((err as ApiError).message).toBe('Custom error message');
		}
	});

	it('uses provided status code', () => {
		try {
			assertApi(false, 'Not found', 404);
		} catch (err) {
			expect((err as ApiError).status).toBe(404);
		}
	});

	it('defaults to 400 status', () => {
		try {
			assertApi(false, 'Bad request');
		} catch (err) {
			expect((err as ApiError).status).toBe(400);
		}
	});
});

describe('assertAuth', () => {
	it('does not throw when user exists', () => {
		expect(() => assertAuth({ id: '123' })).not.toThrow();
		expect(() => assertAuth('user-id')).not.toThrow();
	});

	it('throws UnauthorizedError when user is null', () => {
		expect(() => assertAuth(null)).toThrow(UnauthorizedError);
	});

	it('throws UnauthorizedError when user is undefined', () => {
		expect(() => assertAuth(undefined)).toThrow(UnauthorizedError);
	});

	it('throws with 401 status', () => {
		try {
			assertAuth(null);
		} catch (err) {
			expect((err as UnauthorizedError).status).toBe(401);
		}
	});
});

describe('assertFound', () => {
	it('does not throw when resource exists', () => {
		expect(() => assertFound({ id: '123' }, 'User')).not.toThrow();
		expect(() => assertFound('data', 'Resource')).not.toThrow();
	});

	it('throws NotFoundError when resource is null', () => {
		expect(() => assertFound(null, 'User')).toThrow(NotFoundError);
	});

	it('throws NotFoundError when resource is undefined', () => {
		expect(() => assertFound(undefined, 'Template')).toThrow(NotFoundError);
	});

	it('includes resource name in error message', () => {
		try {
			assertFound(null, 'User');
		} catch (err) {
			expect((err as NotFoundError).message).toBe('User not found');
		}
	});
});

describe('apiSuccess', () => {
	it('returns JSON response with success true', async () => {
		const response = apiSuccess({ user: { id: '123' } });

		expect(response.status).toBe(200);

		const body = await response.json();
		expect(body.success).toBe(true);
		expect(body.data).toEqual({ user: { id: '123' } });
	});

	it('allows custom status code', async () => {
		const response = apiSuccess({ created: true }, 201);

		expect(response.status).toBe(201);
	});

	it('handles primitive data', async () => {
		const response = apiSuccess('OK');

		const body = await response.json();
		expect(body.data).toBe('OK');
	});

	it('handles null data', async () => {
		const response = apiSuccess(null);

		const body = await response.json();
		expect(body.data).toBe(null);
	});
});

describe('apiError', () => {
	it('returns JSON response with success false', async () => {
		const response = apiError('Invalid input');

		expect(response.status).toBe(400);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Invalid input');
		expect(body.correlationId).toBe('cs-test-123');
	});

	it('allows custom status code', async () => {
		const response = apiError('Service unavailable', 503);

		expect(response.status).toBe(503);
	});

	it('defaults to 400 status', async () => {
		const response = apiError('Bad request');

		expect(response.status).toBe(400);
	});
});
