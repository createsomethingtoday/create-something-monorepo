import type { Asset } from './airtable';

/**
 * Short-TTL read-through cache for the dashboard asset list.
 *
 * Airtable is the source of truth but costs 100-500ms per list fetch; this
 * keeps repeat navigations (dashboard ↔ detail ↔ dashboard) instant. Mutation
 * routes call invalidateAssetsCache() so a fresh fetch follows every change,
 * and the TTL bounds staleness for writes made outside the dashboard.
 */
const CACHE_TTL_SECONDS = 60;

function cacheKey(email: string): string {
	return `assets-cache:${email.trim().toLowerCase()}`;
}

export async function getCachedAssets(kv: KVNamespace, email: string): Promise<Asset[] | null> {
	try {
		return await kv.get<Asset[]>(cacheKey(email), 'json');
	} catch {
		return null;
	}
}

export function setCachedAssets(
	kv: KVNamespace,
	email: string,
	assets: Asset[],
	waitUntil?: (promise: Promise<unknown>) => void
): void {
	const put = kv
		.put(cacheKey(email), JSON.stringify(assets), { expirationTtl: CACHE_TTL_SECONDS })
		.catch(() => {
			// Cache writes are best-effort; the next request just misses.
		});

	if (waitUntil) {
		waitUntil(put);
	}
}

export async function invalidateAssetsCache(kv: KVNamespace, email: string): Promise<void> {
	try {
		await kv.delete(cacheKey(email));
	} catch {
		// Best-effort: the short TTL bounds staleness if the delete fails.
	}
}
