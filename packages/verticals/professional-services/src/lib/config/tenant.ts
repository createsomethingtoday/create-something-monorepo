/**
 * Tenant Configuration Loader
 *
 * Resolves tenant config from D1 database based on subdomain.
 * Falls back to static siteConfig for development/preview.
 *
 * Architecture:
 * - Production: subdomain → D1 lookup → merged config
 * - Development: static siteConfig
 * - Preview: ?tenant=id query param → D1 lookup
 */

import { siteConfig, type SiteConfig } from './site';

// Type for tenant record from D1
export interface TenantRecord {
	id: string;
	subdomain: string;
	config: Record<string, unknown>;
	status: string;
}

// Type for the platform environment
interface PlatformEnv {
	DB?: D1Database;
}

interface D1Database {
	prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T = unknown>(): Promise<T | null>;
}

/**
 * Extract subdomain from hostname
 *
 * Examples:
 * - "demo.createsomething.space" → "demo"
 * - "localhost:5173" → null (development)
 * - "custom-domain.com" → null (custom domain, resolved differently)
 */
export function extractSubdomain(hostname: string): string | null {
	// Development
	if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
		return null;
	}

	// Check for our platform domains
	const platformDomains = ['createsomething.space', 'createsomething.io'];

	for (const domain of platformDomains) {
		if (hostname.endsWith(domain)) {
			const subdomain = hostname.replace(`.${domain}`, '').split('.').pop();
			return subdomain && subdomain !== 'www' ? subdomain : null;
		}
	}

	return null;
}

/**
 * Load tenant config from D1
 */
async function loadTenantFromDb(
	db: D1Database,
	subdomain: string
): Promise<TenantRecord | null> {
	const result = await db
		.prepare('SELECT id, subdomain, config, status FROM tenants WHERE subdomain = ? AND status = ?')
		.bind(subdomain, 'active')
		.first<{ id: string; subdomain: string; config: string; status: string }>();

	if (!result) {
		return null;
	}

	return {
		id: result.id,
		subdomain: result.subdomain,
		config: JSON.parse(result.config),
		status: result.status
	};
}

/**
 * Load tenant by ID (for preview mode)
 */
async function loadTenantById(
	db: D1Database,
	tenantId: string
): Promise<TenantRecord | null> {
	const result = await db
		.prepare('SELECT id, subdomain, config, status FROM tenants WHERE id = ?')
		.bind(tenantId)
		.first<{ id: string; subdomain: string; config: string; status: string }>();

	if (!result) {
		return null;
	}

	return {
		id: result.id,
		subdomain: result.subdomain,
		config: JSON.parse(result.config),
		status: result.status
	};
}

/**
 * Merge tenant config with default siteConfig
 *
 * Tenant config overrides defaults, but siteConfig provides
 * structure and fallbacks for missing fields.
 */
function mergeConfig(tenantConfig: Record<string, unknown>): SiteConfig {
	// Deep merge with type coercion
	return {
		// Identity
		name: (tenantConfig.name as string) || siteConfig.name,
		tagline: (tenantConfig.tagline as string) || siteConfig.tagline,
		description: (tenantConfig.description as string) || siteConfig.description,

		// Contact
		email: (tenantConfig.email as string) || siteConfig.email,
		phone: (tenantConfig.phone as string) || siteConfig.phone,
		address: tenantConfig.address
			? {
					street: (tenantConfig.address as Record<string, string>).street || siteConfig.address.street,
					city: (tenantConfig.address as Record<string, string>).city || siteConfig.address.city,
					state: (tenantConfig.address as Record<string, string>).state || siteConfig.address.state,
					zip: (tenantConfig.address as Record<string, string>).zip || siteConfig.address.zip,
					country: (tenantConfig.address as Record<string, string>).country || siteConfig.address.country
				}
			: siteConfig.address,

		// Social
		social: tenantConfig.social
			? {
					instagram: (tenantConfig.social as Record<string, string>).instagram || siteConfig.social.instagram,
					pinterest: (tenantConfig.social as Record<string, string>).pinterest || siteConfig.social.pinterest
				}
			: siteConfig.social,

		// SEO
		url: (tenantConfig.url as string) || siteConfig.url,
		locale: (tenantConfig.locale as string) || siteConfig.locale,

		// Hero
		hero: tenantConfig.hero
			? {
					image: (tenantConfig.hero as Record<string, string>).image || siteConfig.hero.image,
					alt: (tenantConfig.hero as Record<string, string>).alt || siteConfig.hero.alt,
					caption: (tenantConfig.hero as Record<string, string>).caption || siteConfig.hero.caption
				}
			: siteConfig.hero,

		// Projects (array - replace entirely if provided)
		projects: Array.isArray(tenantConfig.projects) && tenantConfig.projects.length > 0
			? (tenantConfig.projects as unknown as typeof siteConfig.projects)
			: siteConfig.projects,

		// Studio
		studio: tenantConfig.studio
			? {
					headline: (tenantConfig.studio as Record<string, unknown>).headline as string || siteConfig.studio.headline,
					philosophy: (tenantConfig.studio as Record<string, unknown>).philosophy as string || siteConfig.studio.philosophy,
					approach: Array.isArray((tenantConfig.studio as Record<string, unknown>).approach)
						? (tenantConfig.studio as Record<string, unknown>).approach as string[]
						: siteConfig.studio.approach,
					founders: Array.isArray((tenantConfig.studio as Record<string, unknown>).founders)
						? (tenantConfig.studio as Record<string, unknown>).founders as typeof siteConfig.studio.founders
						: siteConfig.studio.founders
				}
			: siteConfig.studio,

		// Services (array - replace entirely if provided)
		services: Array.isArray(tenantConfig.services) && tenantConfig.services.length > 0
			? (tenantConfig.services as unknown as typeof siteConfig.services)
			: siteConfig.services,

		// Recognition (array - replace entirely if provided)
		recognition: Array.isArray(tenantConfig.recognition)
			? (tenantConfig.recognition as unknown as typeof siteConfig.recognition)
			: siteConfig.recognition
	} as SiteConfig;
}

/**
 * Get site config for the current request
 *
 * Resolution order:
 * 1. Preview mode (?tenant=id) → load by ID
 * 2. Subdomain resolution → load by subdomain
 * 3. Fallback → static siteConfig
 */
export async function getSiteConfig(
	url: URL,
	platform?: { env?: PlatformEnv }
): Promise<{ config: SiteConfig; tenant: TenantRecord | null; source: 'tenant' | 'preview' | 'static' }> {
	const db = platform?.env?.DB;

	// 1. Check for preview mode
	const previewTenantId = url.searchParams.get('tenant');
	if (previewTenantId && db) {
		const tenant = await loadTenantById(db, previewTenantId);
		if (tenant) {
			return {
				config: mergeConfig(tenant.config),
				tenant,
				source: 'preview'
			};
		}
	}

	// 2. Try subdomain resolution
	const subdomain = extractSubdomain(url.hostname);
	if (subdomain && db) {
		const tenant = await loadTenantFromDb(db, subdomain);
		if (tenant) {
			return {
				config: mergeConfig(tenant.config),
				tenant,
				source: 'tenant'
			};
		}
	}

	// 3. Fallback to static config
	return {
		config: siteConfig,
		tenant: null,
		source: 'static'
	};
}

/**
 * Type guard to check if we're in tenant mode
 */
export function isTenantMode(source: 'tenant' | 'preview' | 'static'): boolean {
	return source === 'tenant' || source === 'preview';
}
