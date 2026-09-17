/**
 * Template view counts from the first-party beacon
 * (`packages/webflow-template-views`, deployed in the Webflow Hosting
 * Cloudflare account).
 *
 * The beacon keys views by the marketplace URL slug
 * (`/templates/html/<slug>`), which the Airtable asset exposes as
 * `🏸Admin Detail Page Path (🏗️ only)`. Sessions (first view per browser
 * session) is the unique-viewer stand-in shown as "viewers".
 *
 * Every call degrades to "unknown" (undefined) on missing config or upstream
 * failure so a beacon outage never renders as zero traffic.
 */
import type { Asset } from './airtable';

export const DEFAULT_TEMPLATE_VIEWS_STATS_URL =
	'https://webflow-template-views.webflow-inc.workers.dev';

const TOTALS_BATCH_SIZE = 50;
const CACHE_TTL_SECONDS = 15 * 60;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_HISTORY_DAYS = 365;

export interface TemplateViewsEnv {
	TEMPLATE_VIEWS_STATS_URL?: string;
	TEMPLATE_VIEWS_STATS_API_KEY?: string;
	SESSIONS?: KVNamespace;
}

export interface TemplateViewTotals {
	slug: string;
	views: number;
	sessions: number;
	firstDay: string | null;
	lastDay: string | null;
}

export interface TemplateViewDay {
	day: string;
	views: number;
	sessions: number;
}

/**
 * Derive the beacon slug for an asset from its marketplace detail path or
 * listing URL. Returns undefined for apps and for templates without a path.
 */
export function deriveBeaconSlug(
	asset: Pick<Asset, 'type' | 'adminDetailPagePath' | 'marketplaceUrl'>
): string | undefined {
	if (asset.type !== 'Template') return undefined;

	for (const candidate of [asset.adminDetailPagePath, asset.marketplaceUrl]) {
		const slug = slugFromPath(candidate);
		if (slug) return slug;
	}
	return undefined;
}

function slugFromPath(value?: string | null): string | undefined {
	if (!value) return undefined;
	let path = value.trim();
	if (!path) return undefined;
	try {
		if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
	} catch {
		return undefined;
	}
	const match = /\/templates\/html\/([a-z0-9-]+)\/?$/i.exec(path);
	return match ? match[1].toLowerCase() : undefined;
}

function isConfigured(env: TemplateViewsEnv | undefined): env is TemplateViewsEnv & {
	TEMPLATE_VIEWS_STATS_API_KEY: string;
} {
	return Boolean(env?.TEMPLATE_VIEWS_STATS_API_KEY);
}

function baseUrl(env: TemplateViewsEnv): string {
	return (env.TEMPLATE_VIEWS_STATS_URL || DEFAULT_TEMPLATE_VIEWS_STATS_URL).replace(/\/+$/, '');
}

async function fetchJson<T>(url: string, apiKey: string, fetchImpl: typeof fetch): Promise<T | null> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const response = await fetchImpl(url, {
			headers: { Authorization: `Bearer ${apiKey}` },
			signal: controller.signal
		});
		if (!response.ok) {
			console.warn('[template-views] upstream returned', response.status, url.split('?')[0]);
			return null;
		}
		return (await response.json()) as T;
	} catch (err) {
		console.warn('[template-views] fetch failed', err instanceof Error ? err.message : err);
		return null;
	} finally {
		clearTimeout(timer);
	}
}

function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
	return out;
}

function totalsCacheKey(slug: string): string {
	return `template-views:totals:${slug}`;
}

/**
 * Lifetime beacon totals for a set of slugs. Slugs missing from the result had
 * no recorded views (the beacon only writes rows for slugs it has seen) — the
 * caller decides whether that means 0 or unknown. Returns null when the beacon
 * is unconfigured or every batch failed.
 */
export async function fetchTemplateViewTotals(
	env: TemplateViewsEnv | undefined,
	slugs: string[],
	options?: { fetch?: typeof fetch; waitUntil?: (promise: Promise<unknown>) => void }
): Promise<Map<string, TemplateViewTotals> | null> {
	if (!isConfigured(env)) return null;
	const unique = Array.from(new Set(slugs.filter(Boolean)));
	if (unique.length === 0) return new Map();

	const fetchImpl = options?.fetch ?? fetch;
	const result = new Map<string, TemplateViewTotals>();
	const kv = env.SESSIONS;

	// Read-through cache: a 15 minute TTL keeps dashboard ↔ detail navigation
	// off the beacon while staying fresh enough for daily-granularity data.
	const misses: string[] = [];
	if (kv) {
		await Promise.all(
			unique.map(async (slug) => {
				try {
					const cached = await kv.get<TemplateViewTotals>(totalsCacheKey(slug), 'json');
					if (cached) result.set(slug, cached);
					else misses.push(slug);
				} catch {
					misses.push(slug);
				}
			})
		);
	} else {
		misses.push(...unique);
	}

	if (misses.length === 0) return result;

	let anyBatchSucceeded = false;
	const batches = await Promise.all(
		chunk(misses, TOTALS_BATCH_SIZE).map((batch) =>
			fetchJson<{ rows?: Array<Record<string, unknown>> }>(
				`${baseUrl(env)}/stats/totals?slugs=${encodeURIComponent(batch.join(','))}`,
				env.TEMPLATE_VIEWS_STATS_API_KEY,
				fetchImpl
			).then((payload) => ({ batch, payload }))
		)
	);

	for (const { batch, payload } of batches) {
		if (!payload) continue;
		anyBatchSucceeded = true;
		const seen = new Map<string, TemplateViewTotals>();
		for (const row of payload.rows ?? []) {
			const slug = typeof row.slug === 'string' ? row.slug : null;
			if (!slug) continue;
			seen.set(slug, {
				slug,
				views: Number(row.views) || 0,
				sessions: Number(row.sessions) || 0,
				firstDay: typeof row.first_day === 'string' ? row.first_day : null,
				lastDay: typeof row.last_day === 'string' ? row.last_day : null
			});
		}
		for (const slug of batch) {
			const totals = seen.get(slug) ?? { slug, views: 0, sessions: 0, firstDay: null, lastDay: null };
			result.set(slug, totals);
			if (kv) {
				const put = kv
					.put(totalsCacheKey(slug), JSON.stringify(totals), { expirationTtl: CACHE_TTL_SECONDS })
					.catch(() => {});
				options?.waitUntil ? options.waitUntil(put) : void put;
			}
		}
	}

	if (!anyBatchSucceeded && result.size === 0) return null;
	return result;
}

/**
 * Daily beacon rows for one slug, oldest first. Null when unconfigured or the
 * upstream call failed; an empty array when the slug simply has no views.
 */
export async function fetchTemplateViewDaily(
	env: TemplateViewsEnv | undefined,
	slug: string,
	days: number,
	options?: { fetch?: typeof fetch }
): Promise<TemplateViewDay[] | null> {
	if (!isConfigured(env) || !slug) return null;
	const clamped = Math.min(MAX_HISTORY_DAYS, Math.max(1, Math.floor(days)));
	const payload = await fetchJson<{ rows?: Array<Record<string, unknown>> }>(
		`${baseUrl(env)}/stats?slug=${encodeURIComponent(slug)}&days=${clamped}`,
		env.TEMPLATE_VIEWS_STATS_API_KEY,
		options?.fetch ?? fetch
	);
	if (!payload) return null;
	return (payload.rows ?? [])
		.filter((row) => typeof row.day === 'string')
		.map((row) => ({
			day: row.day as string,
			views: Number(row.views) || 0,
			sessions: Number(row.sessions) || 0
		}))
		.sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * Populate `uniqueViewers` on template assets from beacon sessions. Assets
 * without a resolvable slug, and every asset when the beacon is unavailable,
 * keep `uniqueViewers` undefined so the UI renders "unknown", not "0".
 */
export async function applyTemplateViews<T extends Asset>(
	env: TemplateViewsEnv | undefined,
	assets: T[],
	options?: { fetch?: typeof fetch; waitUntil?: (promise: Promise<unknown>) => void }
): Promise<T[]> {
	const slugByAssetId = new Map<string, string>();
	for (const asset of assets) {
		const slug = deriveBeaconSlug(asset);
		if (slug) slugByAssetId.set(asset.id, slug);
	}
	if (slugByAssetId.size === 0) return assets;

	const totals = await fetchTemplateViewTotals(env, Array.from(slugByAssetId.values()), options);
	if (!totals) return assets;

	return assets.map((asset) => {
		const slug = slugByAssetId.get(asset.id);
		if (!slug) return asset;
		const entry = totals.get(slug);
		if (!entry) return asset;
		return { ...asset, beaconSlug: slug, uniqueViewers: entry.sessions };
	});
}
