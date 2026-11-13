import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';
import { MAX_ACTIVE_API_KEYS } from '$lib/server/api-keys';
import { CREATOR_API_QUOTA, getApiKeyUsage, type ApiKeyUsage } from '$lib/server/creator-api';

function laterOf(a: string | undefined, b: string | undefined): string | null {
	if (!a) return b ?? null;
	if (!b) return a;
	return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	try {
		const airtable = getAirtableClient(platform?.env);
		const apiKeys = await airtable.listApiKeys(locals.user.email);

		// Requests this dashboard served are counted in D1. The Airtable columns
		// hold what the original dashboard counted, so the two are added together.
		let usage = new Map<string, ApiKeyUsage>();
		if (platform?.env?.DB && apiKeys.length > 0) {
			try {
				usage = await getApiKeyUsage(
					platform.env.DB,
					apiKeys.map((apiKey) => apiKey.id)
				);
			} catch (err) {
				console.error('[API Keys] Usage read failed:', err);
			}
		}

		const keys = apiKeys.map((apiKey) => {
			const used = usage.get(apiKey.id);
			return {
				keyId: apiKey.id,
				keyName: apiKey.name,
				keyPrefix: apiKey.keyPrefix || 'N/A',
				status: apiKey.status,
				scopes: apiKey.scopes,
				createdAt: apiKey.createdAt || null,
				lastUsed: laterOf(apiKey.lastUsedAt, used?.lastUsedAt),
				expiresAt: apiKey.expiresAt || null,
				requestCount: (apiKey.requestCount || 0) + (used?.requestCount || 0)
			};
		});

		const stats = keys.reduce(
			(acc, key) => {
				acc.total++;
				if (key.status === 'Active') acc.active++;
				if (key.status === 'Revoked') acc.revoked++;
				if (key.status === 'Expired') acc.expired++;
				return acc;
			},
			{ total: 0, active: 0, revoked: 0, expired: 0 }
		);

		return json({
			keys,
			...stats,
			limits: {
				requestsPerHour: CREATOR_API_QUOTA.requests,
				maxActiveKeys: MAX_ACTIVE_API_KEYS
			}
		});
	} catch (err) {
		console.error('[API Keys] Error:', err);
		throw error(500, 'Failed to list API keys');
	}
};
