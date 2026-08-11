export interface RuntimeEnv {
	ADMIN_PASSWORD?: string;
	PUBLIC_BASE_URL?: string;
}

export function getRuntimeEnv(platform?: App.Platform): RuntimeEnv {
	return platform?.env ?? {};
}

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function getSharedAdminPassword(env: RuntimeEnv): string | null {
	return env.ADMIN_PASSWORD || null;
}

export function getPublicBaseUrl(url: URL, env: RuntimeEnv): string {
	const configured = env.PUBLIC_BASE_URL?.trim();
	if (configured) return configured.replace(/\/+$/, '');
	return url.origin;
}
