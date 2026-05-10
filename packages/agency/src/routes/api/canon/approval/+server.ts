import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canonCorsHeaders, type CanonApprovalUpdateBody } from '$lib/canon/control';
import { constantTimeEqual } from '$lib/server/mcp-entitlements';
import { persistCanonApprovalUpdate } from '$lib/server/canon-approval';

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 204, headers: canonCorsHeaders });
};

export const POST: RequestHandler = async ({ request, platform }) => {
	let body: CanonApprovalUpdateBody;

	try {
		body = (await request.json()) as CanonApprovalUpdateBody;
	} catch {
		return json({ error: 'Request body must be JSON.' }, { status: 400, headers: canonCorsHeaders });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Approval updates require the Cloudflare D1 binding.' }, { status: 503, headers: canonCorsHeaders });
	}

	const expectedKey = platform.env.AGENCY_INTERNAL_API_KEY?.trim();
	if (!expectedKey) {
		return json({ error: 'Approval updates require AGENCY_INTERNAL_API_KEY.' }, { status: 503, headers: canonCorsHeaders });
	}

	const providedKey = parseInternalCredential(request);
	if (!providedKey || !constantTimeEqual(expectedKey, providedKey)) {
		return json({ error: 'Missing or invalid approval credential.' }, { status: 401, headers: canonCorsHeaders });
	}

	const result = await persistCanonApprovalUpdate({ db: platform.env.DB, body, actorFallback: 'Internal API' });

	return json(result.body, {
		status: result.ok ? 200 : result.status,
		headers: {
			...canonCorsHeaders,
			'cache-control': 'no-store'
		}
	});
};

function parseInternalCredential(request: Request): string | null {
	return (
		request.headers.get('X-API-Key')?.trim() ??
		request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ??
		null
	);
}
