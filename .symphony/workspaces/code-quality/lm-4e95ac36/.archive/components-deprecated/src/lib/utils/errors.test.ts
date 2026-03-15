/**
 * Error utilities and structured logging tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	generateCorrelationId,
	createErrorResponse,
	log,
	logError
} from './errors';

describe('generateCorrelationId', () => {
	it('generates ID with correct format', () => {
		const id = generateCorrelationId();
		expect(id).toMatch(/^cs-[a-z0-9]+-[a-z0-9]+$/);
	});

	it('generates unique IDs', () => {
		const ids = new Set<string>();
		for (let i = 0; i < 100; i++) {
			ids.add(generateCorrelationId());
		}
		expect(ids.size).toBe(100);
	});

	it('includes timestamp component', () => {
		const before = Math.floor(Date.now() / 1000);
		const id = generateCorrelationId();
		const after = Math.floor(Date.now() / 1000);

		// Extract timestamp from ID (second segment after cs-)
		const timestampBase36 = id.split('-')[1];
		const timestamp = parseInt(timestampBase36, 36);

		expect(timestamp).toBeGreaterThanOrEqual(before);
		expect(timestamp).toBeLessThanOrEqual(after);
	});
});

describe('createErrorResponse', () => {
	it('creates error response with provided correlation ID', () => {
		const response = createErrorResponse('Test error', 'cs-test-123');
		expect(response).toEqual({
			success: false,
			error: 'Test error',
			correlationId: 'cs-test-123'
		});
	});

	it('generates correlation ID when not provided', () => {
		const response = createErrorResponse('Test error');
		expect(response.success).toBe(false);
		expect(response.error).toBe('Test error');
		expect(response.correlationId).toMatch(/^cs-[a-z0-9]+-[a-z0-9]+$/);
	});

	it('includes optional message', () => {
		const response = createErrorResponse('Internal error', 'cs-123', 'Please try again');
		expect(response.message).toBe('Please try again');
	});

	it('omits message when not provided', () => {
		const response = createErrorResponse('Error');
		expect('message' in response).toBe(false);
	});
});

describe('log', () => {
	let consoleSpy: {
		debug: ReturnType<typeof vi.spyOn>;
		info: ReturnType<typeof vi.spyOn>;
		warn: ReturnType<typeof vi.spyOn>;
		error: ReturnType<typeof vi.spyOn>;
	};

	beforeEach(() => {
		consoleSpy = {
			debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
			info: vi.spyOn(console, 'info').mockImplementation(() => {}),
			warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
			error: vi.spyOn(console, 'error').mockImplementation(() => {})
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('log.debug', () => {
		it('outputs JSON with debug level', () => {
			log.debug('Test message');
			expect(consoleSpy.debug).toHaveBeenCalledTimes(1);

			const output = JSON.parse(consoleSpy.debug.mock.calls[0][0]);
			expect(output.level).toBe('debug');
			expect(output.message).toBe('Test message');
			expect(output.timestamp).toBeDefined();
		});
	});

	describe('log.info', () => {
		it('outputs JSON with info level', () => {
			log.info('User logged in', { userId: '123' });
			expect(consoleSpy.info).toHaveBeenCalledTimes(1);

			const output = JSON.parse(consoleSpy.info.mock.calls[0][0]);
			expect(output.level).toBe('info');
			expect(output.message).toBe('User logged in');
			expect(output.userId).toBe('123');
		});
	});

	describe('log.warn', () => {
		it('outputs JSON with warn level', () => {
			log.warn('Rate limit approaching', { remaining: 10 });
			expect(consoleSpy.warn).toHaveBeenCalledTimes(1);

			const output = JSON.parse(consoleSpy.warn.mock.calls[0][0]);
			expect(output.level).toBe('warn');
			expect(output.remaining).toBe(10);
		});
	});

	describe('log.error', () => {
		it('outputs JSON with error level', () => {
			log.error('Request failed');
			expect(consoleSpy.error).toHaveBeenCalledTimes(1);

			const output = JSON.parse(consoleSpy.error.mock.calls[0][0]);
			expect(output.level).toBe('error');
			expect(output.message).toBe('Request failed');
		});

		it('formats Error objects', () => {
			const testError = new Error('Something went wrong');
			log.error('Operation failed', { error: testError });

			const output = JSON.parse(consoleSpy.error.mock.calls[0][0]);
			expect(output.error.message).toBe('Something went wrong');
			expect(output.error.name).toBe('Error');
			expect(output.error.stack).toBeDefined();
		});

		it('extracts correlation ID as top-level field', () => {
			log.error('Failed', { correlationId: 'cs-test-123', extra: 'data' });

			const output = JSON.parse(consoleSpy.error.mock.calls[0][0]);
			expect(output.correlationId).toBe('cs-test-123');
			expect(output.extra).toBe('data');
		});
	});

	describe('log.child', () => {
		it('creates child logger with bound context', () => {
			const childLog = log.child({ correlationId: 'cs-child-123', path: '/api/test' });

			childLog.info('Request received');
			childLog.error('Request failed', { status: 500 });

			const infoOutput = JSON.parse(consoleSpy.info.mock.calls[0][0]);
			expect(infoOutput.correlationId).toBe('cs-child-123');
			expect(infoOutput.path).toBe('/api/test');

			const errorOutput = JSON.parse(consoleSpy.error.mock.calls[0][0]);
			expect(errorOutput.correlationId).toBe('cs-child-123');
			expect(errorOutput.status).toBe(500);
		});

		it('allows child context to be overridden', () => {
			const childLog = log.child({ correlationId: 'cs-original' });
			childLog.info('Test', { correlationId: 'cs-override' });

			const output = JSON.parse(consoleSpy.info.mock.calls[0][0]);
			expect(output.correlationId).toBe('cs-override');
		});
	});
});

describe('logError (legacy API)', () => {
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('logs with structured format', () => {
		const testError = new Error('Test error');
		logError('Contact form', testError, 'cs-legacy-123', { email: 'test@example.com' });

		expect(errorSpy).toHaveBeenCalledTimes(1);

		const output = JSON.parse(errorSpy.mock.calls[0][0]);
		expect(output.level).toBe('error');
		expect(output.message).toBe('Contact form');
		expect(output.correlationId).toBe('cs-legacy-123');
		expect(output.error.message).toBe('Test error');
		expect(output.email).toBe('test@example.com');
	});
});
