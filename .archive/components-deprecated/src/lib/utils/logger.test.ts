/**
 * Context-Aware Logger Tests
 *
 * Tests for the contextualized logging factory used across API endpoints.
 * Critical path: logging infrastructure for debugging and monitoring.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, createRequestLogger, createTimer, logDuration, loggers } from './logger';

// Mock the errors module
vi.mock('./errors.js', () => ({
	generateCorrelationId: vi.fn(() => 'cs-mock-123'),
	log: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

// Import after mock setup to get the mocked version
import { log, generateCorrelationId } from './errors.js';

describe('createLogger', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('creates logger with service name', () => {
		const logger = createLogger('TestService');

		logger.info('Test message');

		expect(log.info).toHaveBeenCalledWith(
			'[TestService] Test message',
			expect.objectContaining({ service: 'TestService' })
		);
	});

	it('includes correlation ID in all logs', () => {
		const logger = createLogger('TestService');

		logger.info('Test message');

		expect(log.info).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ correlationId: 'cs-mock-123' })
		);
	});

	it('uses provided correlation ID', () => {
		const logger = createLogger('TestService', { correlationId: 'cs-custom-456' });

		logger.info('Test message');

		expect(log.info).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ correlationId: 'cs-custom-456' })
		);
	});

	it('includes additional context in all logs', () => {
		const logger = createLogger('TestService', {
			userId: '123',
			environment: 'test'
		});

		logger.info('Test message');

		expect(log.info).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				userId: '123',
				environment: 'test'
			})
		);
	});

	it('merges metadata with base context', () => {
		const logger = createLogger('TestService', { baseKey: 'baseValue' });

		logger.info('Test message', { extraKey: 'extraValue' });

		expect(log.info).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				baseKey: 'baseValue',
				extraKey: 'extraValue'
			})
		);
	});

	it('allows metadata to override base context', () => {
		const logger = createLogger('TestService', { key: 'base' });

		logger.info('Test message', { key: 'override' });

		expect(log.info).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ key: 'override' })
		);
	});

	describe('log levels', () => {
		it('logs debug messages', () => {
			const logger = createLogger('TestService');
			logger.debug('Debug message');
			expect(log.debug).toHaveBeenCalled();
		});

		it('logs info messages', () => {
			const logger = createLogger('TestService');
			logger.info('Info message');
			expect(log.info).toHaveBeenCalled();
		});

		it('logs warn messages', () => {
			const logger = createLogger('TestService');
			logger.warn('Warning message');
			expect(log.warn).toHaveBeenCalled();
		});

		it('logs error messages', () => {
			const logger = createLogger('TestService');
			logger.error('Error message');
			expect(log.error).toHaveBeenCalled();
		});
	});

	describe('child logger', () => {
		it('creates child with additional context', () => {
			const parentLogger = createLogger('TestService');
			const childLogger = parentLogger.child({ operation: 'database' });

			childLogger.info('Child message');

			expect(log.info).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					service: 'TestService',
					operation: 'database'
				})
			);
		});

		it('inherits parent correlation ID', () => {
			const parentLogger = createLogger('TestService', { correlationId: 'cs-parent-123' });
			const childLogger = parentLogger.child({ operation: 'test' });

			childLogger.info('Child message');

			expect(log.info).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ correlationId: 'cs-parent-123' })
			);
		});

		it('can override parent context', () => {
			const parentLogger = createLogger('TestService', { level: 'parent' });
			const childLogger = parentLogger.child({ level: 'child' });

			childLogger.info('Child message');

			expect(log.info).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ level: 'child' })
			);
		});
	});

	describe('getCorrelationId', () => {
		it('returns the correlation ID', () => {
			const logger = createLogger('TestService', { correlationId: 'cs-test-789' });
			expect(logger.getCorrelationId()).toBe('cs-test-789');
		});

		it('returns generated correlation ID when not provided', () => {
			const logger = createLogger('TestService');
			expect(logger.getCorrelationId()).toBe('cs-mock-123');
		});
	});
});

describe('createRequestLogger', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('extracts URL path from request event', () => {
		const event = {
			url: new URL('https://example.com/api/profile'),
			request: { method: 'POST' } as Request
		};

		const logger = createRequestLogger('ProfileAPI', event);
		logger.info('Test message');

		expect(log.info).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ path: '/api/profile' })
		);
	});

	it('extracts HTTP method from request event', () => {
		const event = {
			url: new URL('https://example.com/api/users'),
			request: { method: 'GET' } as Request
		};

		const logger = createRequestLogger('UsersAPI', event);
		logger.info('Test message');

		expect(log.info).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ method: 'GET' })
		);
	});

	it('generates correlation ID for request', () => {
		const event = {
			url: new URL('https://example.com/api/test'),
			request: { method: 'POST' } as Request
		};

		const logger = createRequestLogger('TestAPI', event);

		expect(logger.getCorrelationId()).toBe('cs-mock-123');
		expect(generateCorrelationId).toHaveBeenCalled();
	});
});

describe('createTimer', () => {
	it('returns elapsed time in milliseconds', async () => {
		const timer = createTimer();

		// Wait a small amount
		await new Promise((resolve) => setTimeout(resolve, 50));

		const elapsed = timer.elapsed();
		expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some tolerance
		expect(elapsed).toBeLessThan(200);
	});

	it('returns elapsed time as formatted string', async () => {
		const timer = createTimer();

		await new Promise((resolve) => setTimeout(resolve, 10));

		const formatted = timer.elapsedMs();
		expect(formatted).toMatch(/^\d+ms$/);
	});

	it('continues tracking after first call', async () => {
		const timer = createTimer();

		await new Promise((resolve) => setTimeout(resolve, 20));
		const first = timer.elapsed();

		await new Promise((resolve) => setTimeout(resolve, 20));
		const second = timer.elapsed();

		expect(second).toBeGreaterThan(first);
	});
});

describe('logDuration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('logs start and completion of operation', async () => {
		const logger = createLogger('TestService');

		await logDuration(logger, 'Test operation', async () => {
			return 'result';
		});

		expect(log.debug).toHaveBeenCalledWith(
			expect.stringContaining('Test operation started'),
			expect.any(Object)
		);
		expect(log.info).toHaveBeenCalledWith(
			expect.stringContaining('Test operation completed'),
			expect.objectContaining({ duration: expect.stringMatching(/^\d+ms$/) })
		);
	});

	it('returns the result of the operation', async () => {
		const logger = createLogger('TestService');

		const result = await logDuration(logger, 'Test', async () => {
			return { data: 'test' };
		});

		expect(result).toEqual({ data: 'test' });
	});

	it('logs error and rethrows on failure', async () => {
		const logger = createLogger('TestService');
		const testError = new Error('Test error');

		await expect(
			logDuration(logger, 'Failing operation', async () => {
				throw testError;
			})
		).rejects.toThrow(testError);

		expect(log.error).toHaveBeenCalledWith(
			expect.stringContaining('Failing operation failed'),
			expect.objectContaining({
				duration: expect.stringMatching(/^\d+ms$/),
				error: testError
			})
		);
	});
});

describe('loggers', () => {
	it('provides pre-configured auth logger', () => {
		expect(loggers.auth).toBeDefined();
		expect(loggers.auth.info).toBeInstanceOf(Function);
	});

	it('provides pre-configured api logger', () => {
		expect(loggers.api).toBeDefined();
		expect(loggers.api.info).toBeInstanceOf(Function);
	});

	it('provides pre-configured db logger', () => {
		expect(loggers.db).toBeDefined();
		expect(loggers.db.info).toBeInstanceOf(Function);
	});

	it('provides pre-configured external logger', () => {
		expect(loggers.external).toBeDefined();
		expect(loggers.external.info).toBeInstanceOf(Function);
	});

	it('provides pre-configured jobs logger', () => {
		expect(loggers.jobs).toBeDefined();
		expect(loggers.jobs.info).toBeInstanceOf(Function);
	});
});
