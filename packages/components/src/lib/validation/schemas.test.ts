/**
 * Validation Schema Tests
 *
 * Tests for shared Zod validation schemas used across API endpoints.
 * Critical path: these schemas protect all form submissions and auth flows.
 */

import { describe, it, expect } from 'vitest';
import {
	emailSchema,
	nameSchema,
	phoneSchema,
	passwordSchema,
	contactSchema,
	loginSchema,
	signupSchema,
	magicLinkSchema,
	paginationSchema,
	parseBody,
	parseQuery
} from './schemas';

describe('emailSchema', () => {
	it('validates correct email format', () => {
		const result = emailSchema.safeParse('test@example.com');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe('test@example.com');
		}
	});

	it('normalizes email to lowercase', () => {
		const result = emailSchema.safeParse('TEST@EXAMPLE.COM');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe('test@example.com');
		}
	});

	it('rejects email with leading/trailing whitespace', () => {
		// Zod validates before transforming, so whitespace causes validation failure
		// This is correct API behavior - clients should send properly formatted data
		const result = emailSchema.safeParse('  test@example.com  ');
		expect(result.success).toBe(false);
	});

	it('rejects empty string', () => {
		const result = emailSchema.safeParse('');
		expect(result.success).toBe(false);
	});

	it('rejects invalid email format', () => {
		const result = emailSchema.safeParse('notanemail');
		expect(result.success).toBe(false);
	});

	it('rejects email without domain', () => {
		const result = emailSchema.safeParse('test@');
		expect(result.success).toBe(false);
	});

	it('rejects email without @', () => {
		const result = emailSchema.safeParse('testexample.com');
		expect(result.success).toBe(false);
	});
});

describe('nameSchema', () => {
	it('validates name within limits', () => {
		const result = nameSchema.safeParse('John Doe');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe('John Doe');
		}
	});

	it('trims whitespace', () => {
		const result = nameSchema.safeParse('  John Doe  ');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe('John Doe');
		}
	});

	it('rejects empty string', () => {
		const result = nameSchema.safeParse('');
		expect(result.success).toBe(false);
	});

	it('rejects names over 100 characters', () => {
		const longName = 'A'.repeat(101);
		const result = nameSchema.safeParse(longName);
		expect(result.success).toBe(false);
	});

	it('accepts names at 100 characters', () => {
		const maxName = 'A'.repeat(100);
		const result = nameSchema.safeParse(maxName);
		expect(result.success).toBe(true);
	});
});

describe('phoneSchema', () => {
	it('validates E.164 format', () => {
		const result = phoneSchema.safeParse('+14155551234');
		expect(result.success).toBe(true);
	});

	it('validates without plus prefix', () => {
		const result = phoneSchema.safeParse('14155551234');
		expect(result.success).toBe(true);
	});

	it('rejects empty string', () => {
		const result = phoneSchema.safeParse('');
		expect(result.success).toBe(false);
	});

	it('rejects invalid format with letters', () => {
		const result = phoneSchema.safeParse('+1415abc1234');
		expect(result.success).toBe(false);
	});

	it('rejects numbers starting with 0', () => {
		const result = phoneSchema.safeParse('0123456789');
		expect(result.success).toBe(false);
	});
});

describe('passwordSchema', () => {
	it('validates password at minimum length', () => {
		const result = passwordSchema.safeParse('12345678');
		expect(result.success).toBe(true);
	});

	it('rejects password under 8 characters', () => {
		const result = passwordSchema.safeParse('1234567');
		expect(result.success).toBe(false);
	});

	it('rejects password over 128 characters', () => {
		const longPassword = 'A'.repeat(129);
		const result = passwordSchema.safeParse(longPassword);
		expect(result.success).toBe(false);
	});

	it('accepts password at 128 characters', () => {
		const maxPassword = 'A'.repeat(128);
		const result = passwordSchema.safeParse(maxPassword);
		expect(result.success).toBe(true);
	});
});

describe('contactSchema', () => {
	it('validates complete contact submission', () => {
		const result = contactSchema.safeParse({
			name: 'John Doe',
			email: 'john@example.com',
			message: 'Hello, I have a question.'
		});
		expect(result.success).toBe(true);
	});

	it('validates with optional phone', () => {
		const result = contactSchema.safeParse({
			name: 'John Doe',
			email: 'john@example.com',
			message: 'Hello',
			phone: '+14155551234'
		});
		expect(result.success).toBe(true);
	});

	it('validates with empty phone string', () => {
		const result = contactSchema.safeParse({
			name: 'John Doe',
			email: 'john@example.com',
			message: 'Hello',
			phone: ''
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing name', () => {
		const result = contactSchema.safeParse({
			email: 'john@example.com',
			message: 'Hello'
		});
		expect(result.success).toBe(false);
	});

	it('rejects missing email', () => {
		const result = contactSchema.safeParse({
			name: 'John Doe',
			message: 'Hello'
		});
		expect(result.success).toBe(false);
	});

	it('rejects missing message', () => {
		const result = contactSchema.safeParse({
			name: 'John Doe',
			email: 'john@example.com'
		});
		expect(result.success).toBe(false);
	});

	it('rejects message over 5000 characters', () => {
		const result = contactSchema.safeParse({
			name: 'John Doe',
			email: 'john@example.com',
			message: 'A'.repeat(5001)
		});
		expect(result.success).toBe(false);
	});
});

describe('loginSchema', () => {
	it('validates login credentials', () => {
		const result = loginSchema.safeParse({
			email: 'user@example.com',
			password: 'mypassword'
		});
		expect(result.success).toBe(true);
	});

	it('normalizes email to lowercase', () => {
		const result = loginSchema.safeParse({
			email: 'USER@EXAMPLE.COM',
			password: 'mypassword'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.email).toBe('user@example.com');
		}
	});

	it('rejects empty password', () => {
		const result = loginSchema.safeParse({
			email: 'user@example.com',
			password: ''
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid email', () => {
		const result = loginSchema.safeParse({
			email: 'notanemail',
			password: 'mypassword'
		});
		expect(result.success).toBe(false);
	});
});

describe('signupSchema', () => {
	it('validates signup with all fields', () => {
		const result = signupSchema.safeParse({
			email: 'user@example.com',
			password: 'securepassword123',
			name: 'New User',
			source: 'landing-page'
		});
		expect(result.success).toBe(true);
	});

	it('validates signup without optional fields', () => {
		const result = signupSchema.safeParse({
			email: 'user@example.com',
			password: 'securepassword123'
		});
		expect(result.success).toBe(true);
	});

	it('enforces password minimum length', () => {
		const result = signupSchema.safeParse({
			email: 'user@example.com',
			password: 'short'
		});
		expect(result.success).toBe(false);
	});
});

describe('magicLinkSchema', () => {
	it('validates magic link request', () => {
		const result = magicLinkSchema.safeParse({
			email: 'user@example.com',
			sessionId: 'a'.repeat(32)
		});
		expect(result.success).toBe(true);
	});

	it('rejects short session ID', () => {
		const result = magicLinkSchema.safeParse({
			email: 'user@example.com',
			sessionId: 'tooshort'
		});
		expect(result.success).toBe(false);
	});
});

describe('paginationSchema', () => {
	it('parses string numbers from query params', () => {
		const result = paginationSchema.safeParse({
			limit: '20',
			offset: '40'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.limit).toBe(20);
			expect(result.data.offset).toBe(40);
		}
	});

	it('uses defaults for missing values', () => {
		const result = paginationSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.limit).toBe(20);
			expect(result.data.offset).toBe(0);
		}
	});

	it('clamps limit to maximum 100', () => {
		const result = paginationSchema.safeParse({
			limit: '200'
		});
		expect(result.success).toBe(false);
	});

	it('rejects negative offset', () => {
		const result = paginationSchema.safeParse({
			offset: '-5'
		});
		expect(result.success).toBe(false);
	});
});

describe('parseBody', () => {
	it('parses valid JSON body', async () => {
		const mockRequest = {
			json: async () => ({ email: 'test@example.com', password: 'password123' })
		} as Request;

		const result = await parseBody(mockRequest, loginSchema);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.email).toBe('test@example.com');
		}
	});

	it('returns error for invalid data', async () => {
		const mockRequest = {
			json: async () => ({ email: 'notanemail', password: 'password123' })
		} as Request;

		const result = await parseBody(mockRequest, loginSchema);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('email');
		}
	});

	it('returns error for invalid JSON', async () => {
		const mockRequest = {
			json: async () => {
				throw new Error('Invalid JSON');
			}
		} as Request;

		const result = await parseBody(mockRequest, loginSchema);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('Invalid JSON body');
		}
	});
});

describe('parseQuery', () => {
	it('parses valid query params', () => {
		const params = new URLSearchParams('limit=50&offset=10');
		const result = parseQuery(params, paginationSchema);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.limit).toBe(50);
			expect(result.data.offset).toBe(10);
		}
	});

	it('returns error for invalid params', () => {
		const params = new URLSearchParams('limit=invalid');
		const result = parseQuery(params, paginationSchema);
		expect(result.success).toBe(false);
	});
});
