/**
 * Environment Variable Access
 *
 * - env(key) reads direct process.env (useful for scripts/tests).
 * - resolveRuntimeEnv merges local process.env with Worker/Pages runtime env so
 *   routes can call one helper in both environments.
 */

export function env(key: string): string | undefined {
	return process.env[key];
}

export function resolveRuntimeEnv(
	platformEnv?: Record<string, string | undefined> | null
): Record<string, string | undefined> {
	const resolved: Record<string, string | undefined> = {};

	for (const [key, value] of Object.entries(process.env)) {
		resolved[key] = value;
	}

	if (platformEnv) {
		for (const [key, value] of Object.entries(platformEnv)) {
			if (typeof value === 'string') {
				resolved[key] = value;
			}
		}
	}

	return resolved;
}
