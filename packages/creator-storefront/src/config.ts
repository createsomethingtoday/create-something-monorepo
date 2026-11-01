import { StorefrontError } from './errors';

/**
 * Worker bindings. Every binding is optional in the type so a missing one is
 * reported by requireConfig instead of crashing at first use.
 */
export interface Env {
	READ_MODEL?: D1Database;
	CREATOR_WRITER?: DurableObjectNamespace;
	AIRTABLE_API_KEY?: string;
	/** Asset Dashboard → service. Owner scope only. */
	OWNER_API_KEY?: string;
	/** Marketplace staff tooling → service. Staff scope only. */
	STAFF_API_KEY?: string;
	/** Comma-separated HTTPS origins of the dashboard upload path. */
	ALLOWED_COVER_ORIGINS?: string;
	TEMPLATE_SEARCH_URL?: string;
	/** Local fixture runs only: loopback Airtable stand-in. */
	AIRTABLE_API_BASE_URL?: string;
}

export interface AuthoringConfig {
	readModel: D1Database;
	writerNamespace: DurableObjectNamespace;
	airtableApiKey: string;
	airtableApiBaseUrl?: string;
	ownerApiKey: string;
	staffApiKey: string;
	allowedCoverOrigins: string[];
	templateSearchUrl: string;
}

const MIN_KEY_LENGTH = 32;

function httpsOrigin(value: string): string | null {
	try {
		const url = new URL(value.trim());
		return url.protocol === 'https:' && url.origin === value.trim().replace(/\/$/, '') ? url.origin : null;
	} catch {
		return null;
	}
}

function isLoopback(value: string): boolean {
	try {
		const host = new URL(value).hostname;
		return host === '127.0.0.1' || host === 'localhost' || host === '[::1]';
	} catch {
		return false;
	}
}

export interface PublicConfig {
	readModel: D1Database;
	templateSearchUrl: string;
}

/** Public reads need the read model and template-search (selections are re-checked per read). */
export function requirePublicConfig(env: Env): PublicConfig {
	const missing: string[] = [];
	if (!env.READ_MODEL) missing.push('READ_MODEL');
	if (!env.TEMPLATE_SEARCH_URL?.trim()) missing.push('TEMPLATE_SEARCH_URL');
	const invalid = env.TEMPLATE_SEARCH_URL && !httpsOrigin(env.TEMPLATE_SEARCH_URL) ? ['TEMPLATE_SEARCH_URL'] : [];
	if (missing.length || invalid.length) {
		throw new StorefrontError('not_configured', 'Storefront public reads are not configured', {
			details: { missing, invalid }
		});
	}
	return { readModel: env.READ_MODEL!, templateSearchUrl: env.TEMPLATE_SEARCH_URL! };
}

/** Readiness report for /health/ready. Names only, never values. */
export function readiness(env: Env): { public: string[]; authoring: string[] } {
	const problems = (fn: () => unknown): string[] => {
		try {
			fn();
			return [];
		} catch (error) {
			const details = (error as StorefrontError).details as { missing?: string[]; invalid?: string[] } | undefined;
			return [...(details?.missing ?? []), ...(details?.invalid ?? []).map((name) => `invalid:${name}`)];
		}
	};
	return { public: problems(() => requirePublicConfig(env)), authoring: problems(() => requireAuthoringConfig(env)) };
}

/**
 * Authoring needs every binding and secret. Reports names only, never values.
 */
export function requireAuthoringConfig(env: Env): AuthoringConfig {
	const missing: string[] = [];
	const invalid: string[] = [];
	if (!env.READ_MODEL) missing.push('READ_MODEL');
	if (!env.CREATOR_WRITER) missing.push('CREATOR_WRITER');
	for (const name of ['AIRTABLE_API_KEY', 'OWNER_API_KEY', 'STAFF_API_KEY', 'ALLOWED_COVER_ORIGINS', 'TEMPLATE_SEARCH_URL'] as const) {
		if (!env[name]?.trim()) missing.push(name);
	}

	if (env.OWNER_API_KEY && env.OWNER_API_KEY.length < MIN_KEY_LENGTH) invalid.push('OWNER_API_KEY');
	if (env.STAFF_API_KEY && env.STAFF_API_KEY.length < MIN_KEY_LENGTH) invalid.push('STAFF_API_KEY');
	if (env.OWNER_API_KEY && env.OWNER_API_KEY === env.STAFF_API_KEY) invalid.push('OWNER_API_KEY=STAFF_API_KEY');

	const origins = (env.ALLOWED_COVER_ORIGINS ?? '').split(',').map((v) => v.trim()).filter(Boolean);
	const parsedOrigins = origins.map(httpsOrigin);
	if (origins.length && parsedOrigins.some((o) => !o)) invalid.push('ALLOWED_COVER_ORIGINS');
	if (env.TEMPLATE_SEARCH_URL && !httpsOrigin(env.TEMPLATE_SEARCH_URL)) invalid.push('TEMPLATE_SEARCH_URL');
	if (env.AIRTABLE_API_BASE_URL && !isLoopback(env.AIRTABLE_API_BASE_URL)) invalid.push('AIRTABLE_API_BASE_URL');

	if (missing.length || invalid.length) {
		throw new StorefrontError('not_configured', 'Storefront authoring is not configured', {
			details: { missing, invalid: [...new Set(invalid)] }
		});
	}

	return {
		readModel: env.READ_MODEL!,
		writerNamespace: env.CREATOR_WRITER!,
		airtableApiKey: env.AIRTABLE_API_KEY!,
		airtableApiBaseUrl: env.AIRTABLE_API_BASE_URL,
		ownerApiKey: env.OWNER_API_KEY!,
		staffApiKey: env.STAFF_API_KEY!,
		allowedCoverOrigins: parsedOrigins as string[],
		templateSearchUrl: env.TEMPLATE_SEARCH_URL!
	};
}
