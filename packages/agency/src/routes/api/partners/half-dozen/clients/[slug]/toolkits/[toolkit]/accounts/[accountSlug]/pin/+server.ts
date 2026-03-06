import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	HALF_DOZEN_PARTNER_KEY,
	PartnerAuthHttpError,
	getPartnerClientBySlug,
	normalizePartnerSlug,
	normalizeToolkitSlug,
	parseJsonObject,
	randomId,
	requirePartnerAdmin,
	type PartnerAuthToolkitAccountRow,
	type PartnerAuthToolkitPinRow,
} from '$lib/server/partner-auth';

interface PinAccountBody {
	tool_name?: string;
	metadata?: Record<string, unknown>;
}

export const POST: RequestHandler = async ({ request, params, platform }) => {
	try {
		const env = platform?.env;
		if (!env?.DB) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const actor = requirePartnerAdmin(request, env);
		const slug = normalizePartnerSlug(params.slug);
		const toolkit = normalizeToolkitSlug(params.toolkit);
		const accountSlug = normalizePartnerSlug(params.accountSlug);
		if (!slug || !toolkit || !accountSlug) {
			return json({ error: 'invalid_request', message: 'Valid client, toolkit, and account slugs are required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, HALF_DOZEN_PARTNER_KEY, slug);
		if (!client) {
			return json({ error: 'not_found', message: 'Partner client not found' }, { status: 404 });
		}

		const body = (await request.json().catch(() => null)) as PinAccountBody | null;
		const toolName = String(body?.tool_name ?? '').trim();
		if (!toolName) {
			return json({ error: 'invalid_request', message: 'tool_name is required' }, { status: 400 });
		}

		const account = await env.DB.prepare(
			`SELECT * FROM partner_auth_toolkit_accounts
			 WHERE partner_client_id = ? AND toolkit = ? AND account_slug = ?
			 LIMIT 1`
		)
			.bind(client.id, toolkit, accountSlug)
			.first<PartnerAuthToolkitAccountRow>();
		if (!account) {
			return json({ error: 'not_found', message: 'Toolkit account binding not found' }, { status: 404 });
		}
		if (account.status !== 'active') {
			return json({ error: 'invalid_state', message: 'Only active accounts can be pinned.' }, { status: 409 });
		}

		const existing = await env.DB.prepare(
			`SELECT * FROM partner_auth_toolkit_pins
			 WHERE partner_client_id = ? AND toolkit = ? AND tool_name = ?
			 LIMIT 1`
		)
			.bind(client.id, toolkit, toolName)
			.first<PartnerAuthToolkitPinRow>();
		const metadata = {
			...parseJsonObject(existing?.metadata_json),
			...(body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {}),
			pinned_by: actor,
		};

		if (existing) {
			await env.DB.prepare(
				`UPDATE partner_auth_toolkit_pins
				 SET account_slug = ?, metadata_json = ?, updated_at = datetime('now')
				 WHERE id = ?`
			)
				.bind(accountSlug, JSON.stringify(metadata), existing.id)
				.run();
		} else {
			await env.DB.prepare(
				`INSERT INTO partner_auth_toolkit_pins (
					 id, partner_client_id, toolkit, tool_name, account_slug, metadata_json
				 ) VALUES (?, ?, ?, ?, ?, ?)`
			)
				.bind(randomId('patoolpin'), client.id, toolkit, toolName, accountSlug, JSON.stringify(metadata))
				.run();
		}

		await env.DB.prepare(
			`INSERT INTO partner_auth_toolkit_events (
				 id, partner_client_id, toolkit, account_slug, event_type, actor, metadata_json
			 ) VALUES (?, ?, ?, ?, 'tool_pinned', ?, ?)`
		)
			.bind(
				randomId('patoolevent'),
				client.id,
				toolkit,
				accountSlug,
				actor,
				JSON.stringify({ tool_name: toolName })
			)
			.run();

		return json({
			client_slug: client.slug,
			toolkit,
			tool_name: toolName,
			account_slug: accountSlug,
		});
	} catch (error) {
		if (error instanceof PartnerAuthHttpError) {
			return json({ error: error.code, message: error.message }, { status: error.status });
		}

		return json(
			{ error: 'internal_error', message: error instanceof Error ? error.message : 'Unexpected error' },
			{ status: 500 }
		);
	}
};
