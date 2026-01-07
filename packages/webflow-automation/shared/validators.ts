/**
 * Validation utilities
 * 
 * These are TypeScript versions for reference and testing.
 * Copy logic to JavaScript for use in Airtable scripts.
 */

export interface ValidationResult {
	valid: boolean;
	error?: string;
	value?: string;
}

/**
 * Validates workspace slug format
 * 
 * Requirements:
 * - 3-63 characters
 * - Alphanumeric, hyphens, underscores
 * - Must start and end with alphanumeric
 * - Case-insensitive
 * 
 * @example
 * validateWorkspaceSlug('my-workspace') // { valid: true, value: 'my-workspace' }
 * validateWorkspaceSlug('ab') // { valid: false, error: '...' }
 * validateWorkspaceSlug('-invalid') // { valid: false, error: '...' }
 */
export function validateWorkspaceSlug(slug: string | null | undefined): ValidationResult {
	if (!slug || typeof slug !== 'string') {
		return {
			valid: false,
			error: 'Workspace slug is required'
		};
	}

	const trimmedSlug = slug.trim();

	// Check length
	if (trimmedSlug.length < 3) {
		return {
			valid: false,
			error: 'Workspace slug must be at least 3 characters'
		};
	}

	if (trimmedSlug.length > 63) {
		return {
			valid: false,
			error: 'Workspace slug must be 63 characters or less'
		};
	}

	// Check format: alphanumeric + hyphens/underscores, must start/end with alphanumeric
	const slugRegex = /^[a-z0-9][a-z0-9-_]*[a-z0-9]$/i;
	if (!slugRegex.test(trimmedSlug)) {
		// More specific error messages
		if (trimmedSlug.startsWith('-') || trimmedSlug.startsWith('_')) {
			return {
				valid: false,
				error: 'Workspace slug must start with a letter or number'
			};
		}
		if (trimmedSlug.endsWith('-') || trimmedSlug.endsWith('_')) {
			return {
				valid: false,
				error: 'Workspace slug must end with a letter or number'
			};
		}
		return {
			valid: false,
			error: 'Workspace slug can only contain letters, numbers, hyphens, and underscores'
		};
	}

	return {
		valid: true,
		value: trimmedSlug
	};
}

/**
 * Validates email address format
 */
export function validateEmail(email: string | null | undefined): ValidationResult {
	if (!email || typeof email !== 'string') {
		return {
			valid: false,
			error: 'Email is required'
		};
	}

	const trimmedEmail = email.trim().toLowerCase();

	// Basic email regex (RFC 5322 simplified)
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	if (!emailRegex.test(trimmedEmail)) {
		return {
			valid: false,
			error: 'Invalid email format'
		};
	}

	if (trimmedEmail.length > 254) {
		return {
			valid: false,
			error: 'Email is too long'
		};
	}

	return {
		valid: true,
		value: trimmedEmail
	};
}

/**
 * Validates URL format
 */
export function validateUrl(url: string | null | undefined, required = false): ValidationResult {
	if (!url || typeof url !== 'string') {
		return {
			valid: !required,
			error: required ? 'URL is required' : undefined
		};
	}

	const trimmedUrl = url.trim();

	try {
		const parsed = new URL(trimmedUrl);
		
		// Only allow http/https
		if (!['http:', 'https:'].includes(parsed.protocol)) {
			return {
				valid: false,
				error: 'URL must use http or https protocol'
			};
		}

		return {
			valid: true,
			value: trimmedUrl
		};
	} catch {
		return {
			valid: false,
			error: 'Invalid URL format'
		};
	}
}

/**
 * Validates that a string is not empty
 */
export function validateRequired(
	value: string | null | undefined,
	fieldName: string = 'Field'
): ValidationResult {
	if (!value || typeof value !== 'string' || value.trim().length === 0) {
		return {
			valid: false,
			error: `${fieldName} is required`
		};
	}

	return {
		valid: true,
		value: value.trim()
	};
}

/**
 * Validates string length
 */
export function validateLength(
	value: string | null | undefined,
	min: number,
	max: number,
	fieldName: string = 'Field'
): ValidationResult {
	if (!value || typeof value !== 'string') {
		return {
			valid: false,
			error: `${fieldName} is required`
		};
	}

	const length = value.trim().length;

	if (length < min) {
		return {
			valid: false,
			error: `${fieldName} must be at least ${min} characters`
		};
	}

	if (length > max) {
		return {
			valid: false,
			error: `${fieldName} must be ${max} characters or less`
		};
	}

	return {
		valid: true,
		value: value.trim()
	};
}

