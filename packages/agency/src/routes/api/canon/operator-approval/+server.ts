import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { CanonApprovalUpdateBody } from '$lib/canon/control';
import { persistCanonApprovalUpdate } from '$lib/server/canon-approval';
import { requireAgencyOperator } from '$lib/server/operator-auth';

const TRUSTED_WEBFLOW_OPERATOR_ORIGINS = new Set(['https://governed-workflow-console.webflow.io']);

export const OPTIONS: RequestHandler = async ({ request, url, platform }) => {
	return new Response(null, { status: 204, headers: buildOperatorCorsHeaders(request, url, platform?.env) });
};

export const POST: RequestHandler = async ({ request, url, cookies, platform }) => {
	const headers = buildOperatorCorsHeaders(request, url, platform?.env);

	if (!isTrustedOperatorOrigin(request, url, platform?.env)) {
		return json({ error: 'Origin is not allowed for operator approval updates.' }, { status: 403, headers });
	}

	let body: CanonApprovalUpdateBody;

	try {
		body = (await request.json()) as CanonApprovalUpdateBody;
	} catch {
		return json({ error: 'Request body must be JSON.' }, { status: 400, headers });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Approval updates require the Cloudflare D1 binding.' }, { status: 503, headers });
	}

	try {
		const operator = await requireAgencyOperator({ cookies, platform });
		const result = await persistCanonApprovalUpdate({
			db: platform.env.DB,
			body,
			actorOverride: operator.email
		});

		return json(result.body, {
			status: result.ok ? 200 : result.status,
			headers: {
				...headers,
				'cache-control': 'no-store'
			}
		});
	} catch (error) {
		if (error && typeof error === 'object' && 'status' in error) {
			const kitError = error as { status: number; body?: { message?: string } };
			return json(
				{ error: kitError.body?.message ?? (kitError.status === 401 ? 'Authentication required' : 'Operator access required') },
				{ status: kitError.status, headers }
			);
		}

		return json(
			{ error: error instanceof Error ? error.message : 'Unable to update approval.' },
			{ status: 500, headers }
		);
	}
};

function buildOperatorCorsHeaders(request: Request, url: URL, env?: App.Platform['env']): HeadersInit {
	const origin = request.headers.get('origin')?.trim();
	const headers: Record<string, string> = {
		'access-control-allow-methods': 'POST, OPTIONS',
		'access-control-allow-headers': 'content-type',
		'vary': 'Origin'
	};

	if (!origin) {
		headers['access-control-allow-origin'] = url.origin;
		headers['access-control-allow-credentials'] = 'true';
		return headers;
	}

	if (isAllowedOperatorOrigin(origin, url, env)) {
		headers['access-control-allow-origin'] = origin;
		headers['access-control-allow-credentials'] = 'true';
	}

	return headers;
}

function isTrustedOperatorOrigin(request: Request, url: URL, env?: App.Platform['env']) {
	const origin = request.headers.get('origin')?.trim();
	return !origin || isAllowedOperatorOrigin(origin, url, env);
}

function isAllowedOperatorOrigin(origin: string, url: URL, env?: App.Platform['env']) {
	const configuredOrigins = parseConfiguredOrigins(env?.CANON_OPERATOR_ORIGINS);

	try {
		const parsedOrigin = new URL(origin);
		if (parsedOrigin.origin === url.origin) return true;
		if (configuredOrigins.has(parsedOrigin.origin)) return true;
		if (TRUSTED_WEBFLOW_OPERATOR_ORIGINS.has(parsedOrigin.origin)) return true;
		if (parsedOrigin.protocol === 'https:' && isCreateSomethingAgencyHost(parsedOrigin.hostname)) return true;
		if (isLocalhost(parsedOrigin.hostname) && isLocalhost(url.hostname)) return true;
	} catch {
		return false;
	}

	return false;
}

function parseConfiguredOrigins(raw: string | undefined) {
	return new Set(
		(raw ?? '')
			.split(',')
			.map((value) => value.trim().replace(/\/+$/, ''))
			.filter(Boolean)
	);
}

function isCreateSomethingAgencyHost(hostname: string) {
	return hostname === 'createsomething.agency' || hostname.endsWith('.createsomething.agency');
}

function isLocalhost(hostname: string) {
	return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}
