import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAllowedUploadUrl } from '@create-something/webflow-dashboard-core/uploads-url';
import { isTrustedRequestOrigin } from '$lib/server/security';
import {
	callStorefrontService,
	isValidIdempotencyKey,
	sanitizeError,
	sanitizeOwnerView,
	sanitizePreview,
	sanitizeReceipt,
	storefrontConfig,
	storefrontEnabledFor
} from '$lib/server/storefront';

const noStore = { 'Cache-Control': 'no-store, private' };

type Action = 'save' | 'selections' | 'publish' | 'unpublish';

const ACTIONS: Record<Action, { method: 'PUT' | 'POST'; path: string }> = {
	save: { method: 'PUT', path: '/v1/owner/storefront' },
	selections: { method: 'PUT', path: '/v1/owner/storefront/selections' },
	publish: { method: 'POST', path: '/v1/owner/storefront/publish' },
	unpublish: { method: 'POST', path: '/v1/owner/storefront/unpublish' }
};

/**
 * GET /api/storefront            owner view (draft, receipt, candidates)
 * GET /api/storefront?probe=1    { enabled } only; no service call
 * GET /api/storefront?preview=1  preview DTO built from the committed draft
 *
 * Disabled (flag off, misconfigured, not on the beta allowlist) is a normal
 * 200 { enabled: false } so the UI simply hides the tab.
 */
export const GET: RequestHandler = async ({ url, locals, platform }) => {
	const email = locals.user?.email;
	if (!email) return json({ error: 'unauthorized' }, { status: 401, headers: noStore });

	const config = storefrontConfig(platform?.env);
	if (!config.enabled || !storefrontEnabledFor(config, email)) {
		return json({ enabled: false }, { headers: noStore });
	}
	if (url.searchParams.has('probe')) return json({ enabled: true }, { headers: noStore });

	const preview = url.searchParams.has('preview');
	const result = await callStorefrontService(config, {
		method: 'GET',
		path: preview ? '/v1/owner/storefront/preview' : '/v1/owner/storefront',
		actorEmail: email
	});
	if (result.status !== 200) {
		return json(sanitizeError(result.body, result.status), { status: result.status, headers: noStore });
	}
	const body = preview ? sanitizePreview(result.body) : sanitizeOwnerView(result.body);
	return json({ enabled: true, ...body }, { headers: noStore });
};

/**
 * POST /api/storefront { action, expectedDraftVersion, fields | selections }
 * Header: Idempotency-Key (generated per user action by the browser).
 *
 * The origin check runs here even if the request carries an Authorization
 * header: the global hook skips origin checks for header-authenticated
 * callers, but this route only ever acts on the cookie session.
 */
export const POST: RequestHandler = async ({ request, url, locals, platform }) => {
	const env = platform?.env;
	if (!isTrustedRequestOrigin(request, url.origin, env?.CSRF_TRUSTED_ORIGINS, env?.ENVIRONMENT)) {
		return json({ error: 'forbidden', message: 'Invalid request origin' }, { status: 403, headers: noStore });
	}
	const email = locals.user?.email;
	if (!email) return json({ error: 'unauthorized' }, { status: 401, headers: noStore });

	const config = storefrontConfig(env);
	if (!config.enabled || !storefrontEnabledFor(config, email)) {
		return json({ error: 'storefront_disabled' }, { status: 404, headers: noStore });
	}

	const idempotencyKey = request.headers.get('Idempotency-Key');
	if (!isValidIdempotencyKey(idempotencyKey)) {
		return json({ error: 'idempotency_key_required' }, { status: 400, headers: noStore });
	}

	let body: Record<string, unknown>;
	try {
		const parsed = (await request.json()) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
		body = parsed as Record<string, unknown>;
	} catch {
		return json({ error: 'invalid_request', message: 'Body must be a JSON object' }, { status: 400, headers: noStore });
	}

	const action = body.action as Action;
	// Own keys only: 'constructor' or '__proto__' must not resolve to a target.
	const target = typeof action === 'string' && Object.hasOwn(ACTIONS, action) ? ACTIONS[action] : undefined;
	if (!target) return json({ error: 'invalid_request', message: 'Unknown action' }, { status: 400, headers: noStore });

	let payload: Record<string, unknown> = {};
	if (action === 'save') {
		const fields = body.fields && typeof body.fields === 'object' ? (body.fields as Record<string, unknown>) : null;
		if (!fields) return json({ error: 'invalid_request', message: 'fields required' }, { status: 400, headers: noStore });
		const cover = typeof fields.coverUrl === 'string' ? fields.coverUrl.trim() : '';
		if (cover && !isAllowedUploadUrl(cover, url.origin, env?.CSRF_TRUSTED_ORIGINS)) {
			return json(
				{ error: 'validation_failed', message: 'Cover must be an image uploaded through this dashboard' },
				{ status: 422, headers: noStore }
			);
		}
		payload = { expectedDraftVersion: body.expectedDraftVersion, fields };
	} else if (action === 'selections') {
		payload = { expectedDraftVersion: body.expectedDraftVersion, selections: body.selections };
	} else if (action === 'publish') {
		payload = { expectedDraftVersion: body.expectedDraftVersion };
	}

	const result = await callStorefrontService(config, {
		method: target.method,
		path: target.path,
		actorEmail: email,
		body: payload,
		idempotencyKey
	});
	if (result.status !== 200 && result.status !== 202) {
		return json(sanitizeError(result.body, result.status), { status: result.status, headers: noStore });
	}
	const sanitized =
		action === 'publish' || action === 'unpublish'
			? { receipt: sanitizeReceipt(result.body) }
			: sanitizeOwnerView(result.body);
	return json(sanitized, { status: result.status, headers: noStore });
};
