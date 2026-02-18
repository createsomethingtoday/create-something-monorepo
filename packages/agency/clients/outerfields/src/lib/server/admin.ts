export interface AdminEnv extends Record<string, string | undefined> {
	VIDEO_ADMIN_EMAILS?: string;
	VIDEO_SERIES_ADMIN_EMAILS?: string;
}

function normalizeEmailList(value: string): string[] {
	return value
		.split(',')
		.map((entry) => entry.trim().toLowerCase())
		.filter(Boolean);
}

/**
 * Centralized admin allowlist check.
 *
 * Admin is defined by an email allowlist in env vars:
 * - Prefer VIDEO_ADMIN_EMAILS
 * - Back-compat: fall back to VIDEO_SERIES_ADMIN_EMAILS
 */
export function isAdminUser(
	user: App.Locals['user'] | null | undefined,
	env: AdminEnv | null | undefined = process.env
): boolean {
	if (!user?.email) return false;

	const configured = env?.VIDEO_ADMIN_EMAILS || env?.VIDEO_SERIES_ADMIN_EMAILS;
	if (!configured) return false;

	return normalizeEmailList(configured).includes(user.email.toLowerCase());
}
