/**
 * GDPR Compliance Utilities
 *
 * Functions for handling user data deletion and anonymization.
 */

/**
 * Anonymize user's analytics events by setting user_id to null
 *
 * This preserves aggregate analytics while removing PII linkage.
 * Required for GDPR "right to be forgotten" compliance.
 */
export async function anonymizeUserAnalytics(db: D1Database, userId: string): Promise<void> {
	// Anonymize unified_events
	await db
		.prepare('UPDATE unified_events SET user_id = NULL WHERE user_id = ?')
		.bind(userId)
		.run();

	// Anonymize unified_sessions
	await db
		.prepare('UPDATE unified_sessions SET user_id = NULL WHERE user_id = ?')
		.bind(userId)
		.run();
}
