/**
 * Validation utilities for CREATE SOMETHING
 *
 * Shared validation patterns to ensure consistency across packages.
 * Follows DRY principle - define once, use everywhere.
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
