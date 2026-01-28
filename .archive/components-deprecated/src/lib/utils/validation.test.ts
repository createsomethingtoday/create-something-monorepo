/**
 * Validation Utilities Tests
 *
 * Tests for shared validation patterns used across API endpoints.
 * Critical path: these utilities protect form submissions, auth, and data integrity.
 */

import { describe, it, expect } from 'vitest';
import {
	isValidEmail,
	normalizeEmail,
	isValidPhone,
	normalizePhone,
	sanitizeHtml,
	isValidUrl,
	isEmpty,
	hasItems,
	hasOne,
	first,
	validateStringField,
	validateStringFields
} from './validation';

describe('isValidEmail', () => {
	it('validates standard email addresses', () => {
		expect(isValidEmail('user@example.com')).toBe(true);
		expect(isValidEmail('test.user@domain.co.uk')).toBe(true);
		expect(isValidEmail('name+tag@gmail.com')).toBe(true);
	});

	it('rejects emails without @ symbol', () => {
		expect(isValidEmail('userexample.com')).toBe(false);
	});

	it('rejects emails without local part', () => {
		expect(isValidEmail('@example.com')).toBe(false);
	});

	it('rejects emails without domain', () => {
		expect(isValidEmail('user@')).toBe(false);
	});

	it('rejects emails without TLD', () => {
		expect(isValidEmail('user@example')).toBe(false);
	});

	it('rejects emails with invalid domain start', () => {
		expect(isValidEmail('user@.com')).toBe(false);
	});

	it('rejects empty string', () => {
		expect(isValidEmail('')).toBe(false);
	});

	it('rejects null and undefined', () => {
		expect(isValidEmail(null as unknown as string)).toBe(false);
		expect(isValidEmail(undefined as unknown as string)).toBe(false);
	});

	it('rejects non-string values', () => {
		expect(isValidEmail(123 as unknown as string)).toBe(false);
		expect(isValidEmail({} as unknown as string)).toBe(false);
	});

	it('rejects emails that are too short', () => {
		expect(isValidEmail('a@b')).toBe(false);
		expect(isValidEmail('a@b.c')).toBe(true); // Exactly 5 chars
	});

	it('rejects emails that are too long (>254 chars)', () => {
		const longLocal = 'a'.repeat(250);
		expect(isValidEmail(`${longLocal}@example.com`)).toBe(false);
	});

	it('trims whitespace before validation', () => {
		expect(isValidEmail('  user@example.com  ')).toBe(true);
	});

	it('validates special characters in local part', () => {
		expect(isValidEmail('user.name@example.com')).toBe(true);
		expect(isValidEmail("user!#$%&'*+/=?^_`{|}~@example.com")).toBe(true);
	});
});

describe('normalizeEmail', () => {
	it('converts to lowercase', () => {
		expect(normalizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
		expect(normalizeEmail('Test.User@Domain.Com')).toBe('test.user@domain.com');
	});

	it('trims whitespace', () => {
		expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
	});

	it('returns null for invalid emails', () => {
		expect(normalizeEmail('notanemail')).toBe(null);
		expect(normalizeEmail('')).toBe(null);
		expect(normalizeEmail('@example.com')).toBe(null);
	});
});

describe('isValidPhone', () => {
	it('validates E.164 international format', () => {
		expect(isValidPhone('+14155551234')).toBe(true);
		expect(isValidPhone('+442071234567')).toBe(true);
	});

	it('validates 10-digit US numbers', () => {
		expect(isValidPhone('4155551234')).toBe(true);
	});

	it('validates formatted US numbers', () => {
		expect(isValidPhone('415-555-1234')).toBe(true);
		expect(isValidPhone('(415) 555-1234')).toBe(true);
		expect(isValidPhone('415.555.1234')).toBe(true);
	});

	it('rejects empty string', () => {
		expect(isValidPhone('')).toBe(false);
	});

	it('rejects null and undefined', () => {
		expect(isValidPhone(null as unknown as string)).toBe(false);
		expect(isValidPhone(undefined as unknown as string)).toBe(false);
	});

	it('rejects non-string values', () => {
		expect(isValidPhone(123 as unknown as string)).toBe(false);
	});

	it('rejects numbers with letters', () => {
		expect(isValidPhone('415-ABC-1234')).toBe(false);
	});

	it('rejects numbers that are too short (<7 digits)', () => {
		expect(isValidPhone('123456')).toBe(false);
		expect(isValidPhone('1234567')).toBe(true); // Exactly 7 digits
	});

	it('rejects numbers that are too long (>15 digits)', () => {
		expect(isValidPhone('+1234567890123456')).toBe(false);
		expect(isValidPhone('+123456789012345')).toBe(true); // Exactly 15 digits
	});
});

describe('normalizePhone', () => {
	it('normalizes 10-digit US numbers to E.164', () => {
		expect(normalizePhone('4155551234')).toBe('+14155551234');
		expect(normalizePhone('415-555-1234')).toBe('+14155551234');
		expect(normalizePhone('(415) 555-1234')).toBe('+14155551234');
	});

	it('normalizes 11-digit US numbers with country code', () => {
		expect(normalizePhone('14155551234')).toBe('+14155551234');
	});

	it('preserves numbers already in E.164 format', () => {
		expect(normalizePhone('+14155551234')).toBe('+14155551234');
		expect(normalizePhone('+442071234567')).toBe('+442071234567');
	});

	it('adds + prefix to international numbers', () => {
		expect(normalizePhone('442071234567')).toBe('+442071234567');
	});

	it('uses custom default country code', () => {
		expect(normalizePhone('7911234567', '44')).toBe('+447911234567');
	});

	it('returns null for invalid phones', () => {
		expect(normalizePhone('')).toBe(null);
		expect(normalizePhone('abc')).toBe(null);
		expect(normalizePhone('123')).toBe(null);
	});
});

describe('sanitizeHtml', () => {
	it('escapes HTML special characters', () => {
		expect(sanitizeHtml('<script>alert("xss")</script>')).toBe(
			'&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
		);
	});

	it('escapes ampersands', () => {
		expect(sanitizeHtml('foo & bar')).toBe('foo &amp; bar');
	});

	it('escapes angle brackets', () => {
		expect(sanitizeHtml('<div>')).toBe('&lt;div&gt;');
	});

	it('escapes double quotes', () => {
		expect(sanitizeHtml('"quoted"')).toBe('&quot;quoted&quot;');
	});

	it('escapes single quotes', () => {
		expect(sanitizeHtml("it's")).toBe('it&#039;s');
	});

	it('returns empty string for null/undefined', () => {
		expect(sanitizeHtml(null as unknown as string)).toBe('');
		expect(sanitizeHtml(undefined as unknown as string)).toBe('');
	});

	it('returns empty string for non-strings', () => {
		expect(sanitizeHtml(123 as unknown as string)).toBe('');
		expect(sanitizeHtml({} as unknown as string)).toBe('');
	});

	it('leaves safe text unchanged', () => {
		expect(sanitizeHtml('Hello, World!')).toBe('Hello, World!');
	});
});

describe('isValidUrl', () => {
	it('validates http URLs', () => {
		expect(isValidUrl('http://example.com')).toBe(true);
		expect(isValidUrl('http://example.com/path')).toBe(true);
	});

	it('validates https URLs', () => {
		expect(isValidUrl('https://example.com')).toBe(true);
		expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
	});

	it('rejects URLs without protocol', () => {
		expect(isValidUrl('example.com')).toBe(false);
		expect(isValidUrl('www.example.com')).toBe(false);
	});

	it('rejects non-http protocols by default', () => {
		expect(isValidUrl('ftp://example.com')).toBe(false);
		expect(isValidUrl('file://path/to/file')).toBe(false);
		expect(isValidUrl('javascript:alert(1)')).toBe(false);
	});

	it('allows custom protocols', () => {
		expect(isValidUrl('ftp://example.com', ['ftp:'])).toBe(true);
		expect(isValidUrl('mailto:user@example.com', ['mailto:'])).toBe(true);
	});

	it('rejects empty string', () => {
		expect(isValidUrl('')).toBe(false);
	});

	it('rejects null and undefined', () => {
		expect(isValidUrl(null as unknown as string)).toBe(false);
		expect(isValidUrl(undefined as unknown as string)).toBe(false);
	});

	it('rejects malformed URLs', () => {
		expect(isValidUrl('not a url')).toBe(false);
		expect(isValidUrl('http://')).toBe(false);
	});
});

describe('isEmpty', () => {
	it('returns true for null', () => {
		expect(isEmpty(null)).toBe(true);
	});

	it('returns true for undefined', () => {
		expect(isEmpty(undefined)).toBe(true);
	});

	it('returns true for empty array', () => {
		expect(isEmpty([])).toBe(true);
	});

	it('returns false for non-empty array', () => {
		expect(isEmpty([1])).toBe(false);
		expect(isEmpty([1, 2, 3])).toBe(false);
	});
});

describe('hasItems', () => {
	it('returns false for null', () => {
		expect(hasItems(null)).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(hasItems(undefined)).toBe(false);
	});

	it('returns false for empty array', () => {
		expect(hasItems([])).toBe(false);
	});

	it('returns true for non-empty array', () => {
		expect(hasItems([1])).toBe(true);
		expect(hasItems([1, 2, 3])).toBe(true);
	});
});

describe('hasOne', () => {
	it('returns false for null', () => {
		expect(hasOne(null)).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(hasOne(undefined)).toBe(false);
	});

	it('returns false for empty array', () => {
		expect(hasOne([])).toBe(false);
	});

	it('returns true for single-item array', () => {
		expect(hasOne([1])).toBe(true);
		expect(hasOne(['item'])).toBe(true);
	});

	it('returns false for multi-item array', () => {
		expect(hasOne([1, 2])).toBe(false);
		expect(hasOne([1, 2, 3])).toBe(false);
	});
});

describe('first', () => {
	it('returns undefined for null', () => {
		expect(first(null)).toBe(undefined);
	});

	it('returns undefined for undefined', () => {
		expect(first(undefined)).toBe(undefined);
	});

	it('returns undefined for empty array', () => {
		expect(first([])).toBe(undefined);
	});

	it('returns first item from array', () => {
		expect(first([1, 2, 3])).toBe(1);
		expect(first(['a', 'b', 'c'])).toBe('a');
		expect(first([{ id: 1 }])).toEqual({ id: 1 });
	});
});

describe('validateStringField', () => {
	describe('required validation', () => {
		it('fails for null when required', () => {
			const result = validateStringField(null, 'name');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('name is required');
		});

		it('fails for undefined when required', () => {
			const result = validateStringField(undefined, 'name');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('name is required');
		});

		it('fails for empty string when required', () => {
			const result = validateStringField('', 'name');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('name is required');
		});

		it('fails for whitespace-only when required', () => {
			const result = validateStringField('   ', 'name');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('name is required');
		});

		it('passes for null when not required', () => {
			const result = validateStringField(null, 'name', { required: false });
			expect(result.valid).toBe(true);
			expect(result.value).toBe('');
		});
	});

	describe('type validation', () => {
		it('fails for non-string values', () => {
			const result = validateStringField(123, 'name');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('name must be a string');
		});

		it('fails for object values', () => {
			const result = validateStringField({}, 'name');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('name must be a string');
		});

		it('fails for array values', () => {
			const result = validateStringField([], 'name');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('name must be a string');
		});
	});

	describe('trim behavior', () => {
		it('trims whitespace by default', () => {
			const result = validateStringField('  hello  ', 'name');
			expect(result.valid).toBe(true);
			expect(result.value).toBe('hello');
		});

		it('preserves whitespace when trim is false', () => {
			const result = validateStringField('  hello  ', 'name', { trim: false });
			expect(result.valid).toBe(true);
			expect(result.value).toBe('  hello  ');
		});
	});

	describe('length validation', () => {
		it('fails when below minLength', () => {
			const result = validateStringField('ab', 'name', { minLength: 3 });
			expect(result.valid).toBe(false);
			expect(result.error).toBe('name must be at least 3 characters');
		});

		it('passes at exact minLength', () => {
			const result = validateStringField('abc', 'name', { minLength: 3 });
			expect(result.valid).toBe(true);
		});

		it('fails when above maxLength', () => {
			const result = validateStringField('abcd', 'name', { maxLength: 3 });
			expect(result.valid).toBe(false);
			expect(result.error).toBe('name must be at most 3 characters');
		});

		it('passes at exact maxLength', () => {
			const result = validateStringField('abc', 'name', { maxLength: 3 });
			expect(result.valid).toBe(true);
		});

		it('validates length after trimming', () => {
			const result = validateStringField('  ab  ', 'name', { minLength: 3 });
			expect(result.valid).toBe(false);
		});
	});

	describe('pattern validation', () => {
		it('fails when pattern does not match', () => {
			const result = validateStringField('abc123', 'code', {
				pattern: /^[A-Z]+$/,
				patternMessage: 'code must be uppercase letters only'
			});
			expect(result.valid).toBe(false);
			expect(result.error).toBe('code must be uppercase letters only');
		});

		it('passes when pattern matches', () => {
			const result = validateStringField('ABC', 'code', { pattern: /^[A-Z]+$/ });
			expect(result.valid).toBe(true);
		});

		it('uses default pattern error message', () => {
			const result = validateStringField('abc', 'code', { pattern: /^[A-Z]+$/ });
			expect(result.error).toBe('code format is invalid');
		});
	});
});

describe('validateStringFields', () => {
	it('validates multiple fields', () => {
		const result = validateStringFields(
			{ name: 'John', email: 'john@example.com' },
			{
				name: { required: true, minLength: 1 },
				email: { required: true }
			}
		);
		expect(result.valid).toBe(true);
		expect(result.values).toEqual({ name: 'John', email: 'john@example.com' });
		expect(result.errors).toEqual([]);
	});

	it('collects all errors', () => {
		const result = validateStringFields(
			{ name: '', email: '' },
			{
				name: { required: true },
				email: { required: true }
			}
		);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('name is required');
		expect(result.errors).toContain('email is required');
	});

	it('handles missing fields', () => {
		const result = validateStringFields(
			{},
			{
				name: { required: true },
				bio: { required: false }
			}
		);
		expect(result.valid).toBe(false);
		expect(result.errors).toEqual(['name is required']);
		expect(result.values.bio).toBe('');
	});

	it('trims all values', () => {
		const result = validateStringFields(
			{ name: '  John  ', bio: '  Developer  ' },
			{
				name: { required: true },
				bio: { required: false }
			}
		);
		expect(result.values).toEqual({ name: 'John', bio: 'Developer' });
	});
});
