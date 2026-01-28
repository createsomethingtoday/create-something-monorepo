/**
 * Validation utilities for CREATE SOMETHING
 *
 * Shared validation patterns to ensure consistency across packages.
 * Follows DRY principle - define once, use everywhere.
 *
 * @example
 * import { isEmpty, hasItems, validateStringField } from '@create-something/canon/utils';
 *
 * // Array checks
 * if (isEmpty(records)) return json({ error: 'No records found' });
 * if (hasItems(errors)) return json({ errors });
 *
 * // String field validation
 * const nameResult = validateStringField(body.name, 'name', { required: true, minLength: 1 });
 * if (!nameResult.valid) return json({ error: nameResult.error });
 */

/**
 * RFC 5322 compliant email validation regex
 *
 * More robust than simple patterns - validates:
 * - Local part: letters, numbers, and allowed special chars
 * - Domain: valid domain format with proper TLD
 * - Rejects common invalid patterns like "test@.com" or "@example.com"
 *
 * Note: For perfect RFC 5322 compliance, use a dedicated library.
 * This pattern covers 99.9% of real-world email addresses.
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validate email address format
 *
 * @param email - Email address to validate
 * @returns true if email format is valid
 *
 * @example
 * isValidEmail('user@example.com') // true
 * isValidEmail('user@.com') // false
 * isValidEmail('@example.com') // false
 * isValidEmail('user@example') // false (no TLD)
 */
export function isValidEmail(email: string): boolean {
	if (!email || typeof email !== 'string') {
		return false;
	}

	const trimmed = email.trim();

	// Quick length check
	if (trimmed.length < 5 || trimmed.length > 254) {
		return false;
	}

	return EMAIL_REGEX.test(trimmed);
}

/**
 * Normalize email address for storage/comparison
 *
 * - Trims whitespace
 * - Converts to lowercase
 *
 * @param email - Email address to normalize
 * @returns Normalized email or null if invalid
 */
export function normalizeEmail(email: string): string | null {
	if (!isValidEmail(email)) {
		return null;
	}
	return email.trim().toLowerCase();
}

/**
 * Validate phone number format (E.164 format preferred)
 *
 * Accepts:
 * - +1234567890 (E.164 international format)
 * - 1234567890 (US 10-digit)
 * - 123-456-7890 (US formatted)
 * - (123) 456-7890 (US formatted with parens)
 *
 * @param phone - Phone number to validate
 * @returns true if phone format is valid
 */
export function isValidPhone(phone: string): boolean {
	if (!phone || typeof phone !== 'string') {
		return false;
	}

	// Remove common formatting characters
	const digits = phone.replace(/[\s\-\(\)\.]/g, '');

	// Must have at least 7 digits (shortest valid phone)
	// and at most 15 (E.164 max)
	if (!/^\+?\d{7,15}$/.test(digits)) {
		return false;
	}

	return true;
}

/**
 * Normalize phone number to E.164 format
 *
 * @param phone - Phone number to normalize
 * @param defaultCountryCode - Country code to add if missing (default: '1' for US)
 * @returns Normalized phone number or null if invalid
 */
export function normalizePhone(phone: string, defaultCountryCode = '1'): string | null {
	if (!isValidPhone(phone)) {
		return null;
	}

	const digits = phone.replace(/[\s\-\(\)\.]/g, '');

	// Already has country code
	if (digits.startsWith('+')) {
		return digits;
	}

	// 10-digit US number
	if (digits.length === 10) {
		return `+${defaultCountryCode}${digits}`;
	}

	// 11-digit with country code
	if (digits.length === 11 && digits.startsWith(defaultCountryCode)) {
		return `+${digits}`;
	}

	// Return with + prefix
	return `+${digits}`;
}

/**
 * Sanitize string for safe display (prevent XSS)
 *
 * @param input - String to sanitize
 * @returns Sanitized string with HTML entities escaped
 */
export function sanitizeHtml(input: string): string {
	if (!input || typeof input !== 'string') {
		return '';
	}

	return input
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/**
 * Validate URL format
 *
 * @param url - URL to validate
 * @param allowedProtocols - Allowed protocols (default: ['http:', 'https:'])
 * @returns true if URL format is valid
 */
export function isValidUrl(url: string, allowedProtocols = ['http:', 'https:']): boolean {
	if (!url || typeof url !== 'string') {
		return false;
	}

	try {
		const parsed = new URL(url);
		return allowedProtocols.includes(parsed.protocol);
	} catch {
		return false;
	}
}

// ============================================
// Array Validation Helpers
// ============================================

/**
 * Check if an array is empty or nullish
 *
 * Replaces common pattern: `if (records.length === 0)`
 *
 * @param arr - Array to check
 * @returns true if array is null, undefined, or empty
 *
 * @example
 * if (isEmpty(records)) {
 *   return json({ error: 'No records found' }, { status: 404 });
 * }
 */
export function isEmpty<T>(arr: T[] | null | undefined): arr is null | undefined | [] {
	return !arr || arr.length === 0;
}

/**
 * Check if an array has items
 *
 * Replaces common pattern: `if (errors.length > 0)`
 *
 * @param arr - Array to check
 * @returns true if array has at least one item
 *
 * @example
 * if (hasItems(validationErrors)) {
 *   return json({ errors: validationErrors }, { status: 400 });
 * }
 */
export function hasItems<T>(arr: T[] | null | undefined): arr is [T, ...T[]] {
	return arr !== null && arr !== undefined && arr.length > 0;
}

/**
 * Check if array has exactly one item
 */
export function hasOne<T>(arr: T[] | null | undefined): arr is [T] {
	return arr !== null && arr !== undefined && arr.length === 1;
}

/**
 * Get first item or undefined (type-safe)
 */
export function first<T>(arr: T[] | null | undefined): T | undefined {
	return arr?.[0];
}

// ============================================
// String Field Validation
// ============================================

export interface StringFieldOptions {
	/** Field is required (default: true) */
	required?: boolean;
	/** Minimum length after trim */
	minLength?: number;
	/** Maximum length */
	maxLength?: number;
	/** Trim whitespace (default: true) */
	trim?: boolean;
	/** Custom validation pattern */
	pattern?: RegExp;
	/** Custom pattern error message */
	patternMessage?: string;
}

export interface StringFieldResult {
	valid: boolean;
	value: string;
	error?: string;
}

/**
 * Validate a string field with common rules
 *
 * Replaces duplicate patterns like:
 * `if (!name || typeof name !== 'string' || name.trim().length === 0)`
 *
 * @param value - Value to validate
 * @param fieldName - Name for error messages
 * @param options - Validation options
 *
 * @example
 * const nameResult = validateStringField(body.name, 'name', {
 *   required: true,
 *   minLength: 1,
 *   maxLength: 100
 * });
 *
 * if (!nameResult.valid) {
 *   return json({ error: nameResult.error }, { status: 400 });
 * }
 *
 * const name = nameResult.value; // Trimmed, validated string
 */
export function validateStringField(
	value: unknown,
	fieldName: string,
	options: StringFieldOptions = {}
): StringFieldResult {
	const { required = true, minLength, maxLength, trim = true, pattern, patternMessage } = options;

	// Type check
	if (value === null || value === undefined) {
		if (required) {
			return { valid: false, value: '', error: `${fieldName} is required` };
		}
		return { valid: true, value: '' };
	}

	if (typeof value !== 'string') {
		return { valid: false, value: '', error: `${fieldName} must be a string` };
	}

	// Process value
	const processed = trim ? value.trim() : value;

	// Empty check for required fields
	if (required && processed.length === 0) {
		return { valid: false, value: '', error: `${fieldName} is required` };
	}

	// Length checks
	if (minLength !== undefined && processed.length < minLength) {
		return {
			valid: false,
			value: processed,
			error: `${fieldName} must be at least ${minLength} characters`
		};
	}

	if (maxLength !== undefined && processed.length > maxLength) {
		return {
			valid: false,
			value: processed,
			error: `${fieldName} must be at most ${maxLength} characters`
		};
	}

	// Pattern check
	if (pattern && !pattern.test(processed)) {
		return {
			valid: false,
			value: processed,
			error: patternMessage || `${fieldName} format is invalid`
		};
	}

	return { valid: true, value: processed };
}

/**
 * Validate multiple string fields at once
 *
 * @example
 * const result = validateStringFields(body, {
 *   name: { required: true, maxLength: 100 },
 *   email: { required: true, pattern: EMAIL_PATTERN },
 *   bio: { required: false, maxLength: 500 }
 * });
 *
 * if (!result.valid) {
 *   return json({ errors: result.errors }, { status: 400 });
 * }
 */
export function validateStringFields(
	obj: Record<string, unknown>,
	fields: Record<string, StringFieldOptions>
): { valid: boolean; values: Record<string, string>; errors: string[] } {
	const values: Record<string, string> = {};
	const errors: string[] = [];

	for (const [fieldName, options] of Object.entries(fields)) {
		const result = validateStringField(obj[fieldName], fieldName, options);
		if (!result.valid && result.error) {
			errors.push(result.error);
		}
		values[fieldName] = result.value;
	}

	return {
		valid: errors.length === 0,
		values,
		errors
	};
}
