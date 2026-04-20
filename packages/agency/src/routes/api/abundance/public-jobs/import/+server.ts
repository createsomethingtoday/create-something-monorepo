import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { importPublicJobs, type PublicJobImportSource } from '$lib/server/abundance-public-jobs';
import { requireAgencyOperator } from '$lib/server/operator-auth';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		await requireAgencyOperator({ cookies, platform });

		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
		if (!body || Array.isArray(body)) {
			return json(
				{ error: 'invalid_request', message: 'Request body must be a JSON object' },
				{ status: 400 }
			);
		}

		const source = normalizeSource(body.source);
		if (!source) {
			return json(
				{ error: 'invalid_request', message: 'source must be "adzuna" or "exa"' },
				{ status: 400 }
			);
		}

		const result = await importPublicJobs({
			db,
			env: platform.env,
			source,
			query: normalizeNullableString(body.query),
			location: normalizeNullableString(body.location),
			country: normalizeNullableString(body.country),
			limit: normalizeNullableInteger(body.limit) ?? undefined,
			page: normalizeNullableInteger(body.page) ?? undefined,
			domains: normalizeDomains(body.domains)
		});

		return json({
			success: true,
			...result
		});
	} catch (error) {
		return json(
			{
				error: 'internal_error',
				message: error instanceof Error ? error.message : 'Unexpected error'
			},
			{ status: 500 }
		);
	}
};

function normalizeSource(value: unknown): PublicJobImportSource | null {
	if (value === 'adzuna' || value === 'exa') {
		return value;
	}

	return null;
}

function normalizeNullableString(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();
	return normalized ? normalized : null;
}

function normalizeNullableInteger(value: unknown): number | null {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? Math.trunc(value) : null;
	}

	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();
	if (!normalized) {
		return null;
	}

	const parsed = Number.parseInt(normalized, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDomains(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) {
		return undefined;
	}

	return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}
