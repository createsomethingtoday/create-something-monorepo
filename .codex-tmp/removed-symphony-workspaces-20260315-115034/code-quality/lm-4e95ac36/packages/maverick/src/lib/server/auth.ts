/**
 * Auth utilities for Maverick X
 * Validates sessions against KV store
 */

/**
 * Validate a session ID against the KV session store.
 * Returns the session data if valid, null otherwise.
 */
export async function validateSession(
	sessionId: string,
	sessions: KVNamespace
): Promise<{ email: string; createdAt: number } | null> {
	try {
		const data = await sessions.get(sessionId);
		if (!data) return null;
		return JSON.parse(data);
	} catch {
		return null;
	}
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

/**
 * HTML-escape a string to prevent XSS in email templates.
 */
export function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
