export interface RuntimeEnv {
	ADMIN_EMAILS?: string;
	ADMIN_INITIAL_PASSWORD?: string;
	ADMIN_PASSWORD?: string;
	RESEND_API_KEY?: string;
	RESEND_FROM_EMAIL?: string;
	PUBLIC_BASE_URL?: string;
}

export function getRuntimeEnv(platform?: App.Platform): RuntimeEnv {
	return platform?.env ?? {};
}

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function getAdminEmails(env: RuntimeEnv): string[] {
	return (env.ADMIN_EMAILS ?? '')
		.split(',')
		.map((email) => normalizeEmail(email))
		.filter(Boolean);
}

export function isAllowedAdminEmail(email: string, env: RuntimeEnv): boolean {
	const normalized = normalizeEmail(email);
	const allowedEmails = getAdminEmails(env);
	return allowedEmails.includes(normalized);
}

export function getBootstrapPassword(env: RuntimeEnv): string | null {
	return env.ADMIN_INITIAL_PASSWORD || env.ADMIN_PASSWORD || null;
}

export function getPublicBaseUrl(url: URL, env: RuntimeEnv): string {
	const configured = env.PUBLIC_BASE_URL?.trim();
	if (configured) return configured.replace(/\/+$/, '');
	return url.origin;
}
