/**
 * Subdomain Validation API
 *
 * GET /api/subdomain/check?subdomain=example
 *
 * Public endpoint for real-time subdomain availability checking.
 * Used by the configuration wizard during checkout.
 *
 * Canon: The infrastructure recedes; the user types and knows immediately.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface SubdomainCheckResponse {
	available: boolean;
	subdomain: string;
	reason?: 'taken' | 'reserved' | 'invalid' | 'too_short' | 'invalid_chars' | 'starts_ends_hyphen';
	suggestion?: string;
}

// Reserved subdomains - protected from user registration
// Synced from router worker for consistency
const RESERVED_SUBDOMAINS = new Set([
	// Platform
	'www',
	'api',
	'app',
	'admin',
	'dashboard',
	// Auth
	'auth',
	'login',
	'signup',
	'sso',
	// Infrastructure
	'mail',
	'smtp',
	'imap',
	'cdn',
	'assets',
	'static',
	'custom',
	// Environments
	'dev',
	'staging',
	'test',
	'beta',
	'preview',
	// Support
	'help',
	'support',
	'docs',
	'status',
	// Financial
	'billing',
	'payment',
	'checkout',
	// Content
	'blog',
	'news',
	// CREATE SOMETHING properties
	'space',
	'io',
	'agency',
	'ltd',
	'templates',
	'id',
	'learn',
	// Common squatting targets
	'root',
	'system',
	'null',
	'undefined',
	'admin',
	'administrator',
	'webmaster',
	'hostmaster',
	'postmaster',
	'abuse'
]);

/**
 * Validate subdomain format
 * - 3+ characters
 * - Lowercase alphanumeric + hyphens
 * - Cannot start or end with hyphen
 */
function validateSubdomain(subdomain: string): { valid: boolean; reason?: SubdomainCheckResponse['reason'] } {
	// Length check
	if (subdomain.length < 3) {
		return { valid: false, reason: 'too_short' };
	}

	// Max length (63 is DNS limit)
	if (subdomain.length > 63) {
		return { valid: false, reason: 'invalid' };
	}

	// Character check: lowercase alphanumeric + hyphens only
	if (!/^[a-z0-9-]+$/.test(subdomain)) {
		return { valid: false, reason: 'invalid_chars' };
	}

	// Cannot start or end with hyphen
	if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
		return { valid: false, reason: 'starts_ends_hyphen' };
	}

	// Cannot have consecutive hyphens (reserved for punycode)
	if (subdomain.includes('--')) {
		return { valid: false, reason: 'invalid' };
	}

	return { valid: true };
}

/**
 * Generate alternative subdomain suggestions
 */
function generateSuggestion(subdomain: string): string | undefined {
	// Add a random 2-digit suffix
	const suffix = Math.floor(Math.random() * 90 + 10);
	return `${subdomain}${suffix}`;
}

export const GET: RequestHandler = async ({ url, platform }) => {
	const subdomain = url.searchParams.get('subdomain')?.toLowerCase().trim();

	if (!subdomain) {
		throw error(400, 'Missing subdomain parameter');
	}

	// 1. Validate format
	const validation = validateSubdomain(subdomain);
	if (!validation.valid) {
		return json({
			available: false,
			subdomain,
			reason: validation.reason
		} satisfies SubdomainCheckResponse);
	}

	// 2. Check reserved words
	if (RESERVED_SUBDOMAINS.has(subdomain)) {
		return json({
			available: false,
			subdomain,
			reason: 'reserved',
			suggestion: generateSuggestion(subdomain)
		} satisfies SubdomainCheckResponse);
	}

	// 3. Check D1 for existing tenants
	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	try {
		const existing = await db
			.prepare('SELECT id FROM tenants WHERE subdomain = ?')
			.bind(subdomain)
			.first();

		if (existing) {
			return json({
				available: false,
				subdomain,
				reason: 'taken',
				suggestion: generateSuggestion(subdomain)
			} satisfies SubdomainCheckResponse);
		}

		// Available!
		return json({
			available: true,
			subdomain
		} satisfies SubdomainCheckResponse);
	} catch (err) {
		console.error('Subdomain check error:', err);
		throw error(500, 'Failed to check subdomain availability');
	}
};
