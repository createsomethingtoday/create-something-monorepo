/**
 * Shared hash utilities
 * Used for privacy-preserving analytics (hashing emails, etc.)
 */

/**
 * Hash a string using SHA-256, returning first 16 hex characters
 * Used for privacy-preserving user identification in analytics
 */
export async function hashString(str: string): Promise<string> {
	if (!str) return 'anonymous';
	try {
		const encoder = new TextEncoder();
		const data = encoder.encode(str);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')
			.substring(0, 16);
	} catch {
		return 'hash_error';
	}
}
