import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	listAgencyIdentitySeeds,
	normalizeAgencyServiceTier,
	upsertAgencyIdentitySeed,
} from '$lib/server/mcp-entitlements';
import { requireAgencyOperator } from '$lib/server/operator-auth';

interface UpsertBody {
	auth_email?: string;
	auth_subject?: string | null;
	account_id?: string;
	tenant_id?: string;
	workspace_account_id?: string | null;
	service_tier?: string | null;
	managed_bearer_allowed?: boolean;
	org_membership_active?: boolean;
	service_entitled?: boolean;
	policy_accepted?: boolean;
	contract_active?: boolean;
	billing_active?: boolean;
	status?: string;
	invited_at?: string | null;
	bound_at?: string | null;
	metadata?: Record<string, unknown>;
	import_text?: string;
}

export const GET: RequestHandler = async ({ url, request, platform }) => {
	try {
		await requireAgencyOperator({ request, platform });
		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const seeds = await listAgencyIdentitySeeds(db, {
			limit: Number.parseInt(url.searchParams.get('limit') ?? '100', 10),
			search: url.searchParams.get('search') ?? undefined,
		});

		return json({ seeds });
	} catch (error) {
		return handleError(error);
	}
};

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const operator = await requireAgencyOperator({ request, platform });
		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const body = (await request.json().catch(() => null)) as UpsertBody | null;
		if (body?.import_text?.trim()) {
			const parsedRows = parseDelimitedSeedText(body.import_text);
			if (parsedRows.length === 0) {
				return json({ error: 'invalid_request', message: 'Import text does not contain any rows' }, { status: 400 });
			}

			const imported: Array<{ auth_email: string; account_id: string; tenant_id: string }> = [];
			const errors: string[] = [];

			for (const [index, row] of parsedRows.entries()) {
				try {
					const authEmail = row.auth_email?.trim();
					const accountId = row.account_id?.trim();
					const tenantId = row.tenant_id?.trim();
					if (!authEmail || !accountId || !tenantId) {
						throw new Error('auth_email, account_id, and tenant_id are required');
					}

					const metadata = parseMetadata(row.metadata_json);
					const seed = await upsertAgencyIdentitySeed(db, {
						authEmail,
						authSubject: nullable(row.auth_subject),
						accountId,
						tenantId,
						workspaceAccountId: nullable(row.workspace_account_id) ?? accountId,
						serviceTier: normalizeAgencyServiceTier(row.service_tier),
						managedBearerAllowed: parseBoolean(row.managed_bearer_allowed, true),
						orgMembershipActive: parseBoolean(row.org_membership_active, true),
						serviceEntitled: parseBoolean(row.service_entitled, true),
						policyAccepted: parseBoolean(row.policy_accepted, false),
						contractActive: parseBoolean(row.contract_active, true),
						billingActive: parseBoolean(row.billing_active, true),
						status: row.status?.trim() || 'seeded',
						invitedAt: nullable(row.invited_at),
						boundAt: nullable(row.bound_at),
						metadata: {
							operator_email: operator.email,
							updated_via: 'agency_identity_seed_admin_bulk_import',
							import_row: index + 2,
							...metadata,
						},
					});

					if (!seed) {
						throw new Error('Identity seed store is unavailable');
					}

					imported.push({
						auth_email: authEmail.toLowerCase(),
						account_id: accountId,
						tenant_id: tenantId,
					});
				} catch (error) {
					errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unexpected error'}`);
				}
			}

			if (imported.length === 0) {
				return json(
					{ error: 'invalid_request', message: 'No rows were imported', errors },
					{ status: 400 }
				);
			}

			return json({
				imported,
				imported_count: imported.length,
				error_count: errors.length,
				errors,
			});
		}

		if (!body?.auth_email?.trim() || !body.account_id?.trim() || !body.tenant_id?.trim()) {
			return json(
				{ error: 'invalid_request', message: 'auth_email, account_id, and tenant_id are required' },
				{ status: 400 }
			);
		}

		const seed = await upsertAgencyIdentitySeed(db, {
			authEmail: body.auth_email,
			authSubject: body.auth_subject,
			accountId: body.account_id,
			tenantId: body.tenant_id,
			workspaceAccountId: body.workspace_account_id ?? body.account_id,
			serviceTier: normalizeAgencyServiceTier(body.service_tier),
			managedBearerAllowed: body.managed_bearer_allowed,
			orgMembershipActive: body.org_membership_active,
			serviceEntitled: body.service_entitled,
			policyAccepted: body.policy_accepted,
			contractActive: body.contract_active,
			billingActive: body.billing_active,
			status: body.status ?? 'seeded',
			invitedAt: body.invited_at ?? null,
			boundAt: body.bound_at ?? null,
			metadata: {
				operator_email: operator.email,
				updated_via: 'agency_identity_seed_admin_api',
				...(body.metadata ?? {}),
			},
		});

		if (!seed) {
			return json({ error: 'unavailable', message: 'Identity seed store is unavailable' }, { status: 503 });
		}

		return json({ seed });
	} catch (error) {
		return handleError(error);
	}
};

function handleError(error: unknown) {
	if (error && typeof error === 'object' && 'status' in error && 'body' in error) {
		const kitError = error as { status: number; body?: { message?: string } };
		return json({ error: 'request_failed', message: kitError.body?.message ?? 'Request failed' }, { status: kitError.status });
	}
	return json(
		{ error: 'internal_error', message: error instanceof Error ? error.message : 'Unexpected error' },
		{ status: 500 }
	);
}

function parseDelimitedSeedText(source: string): Array<Record<string, string>> {
	const lines = source
		.split(/\r?\n/)
		.map((line) => line.trimEnd())
		.filter((line) => line.trim().length > 0);

	if (lines.length < 2) {
		return [];
	}

	const delimiter = lines[0].includes('\t') ? '\t' : ',';
	const headers = parseDelimitedLine(lines[0], delimiter).map((value) => value.trim());

	return lines.slice(1).map((line) => {
		const values = parseDelimitedLine(line, delimiter);
		return headers.reduce<Record<string, string>>((record, header, index) => {
			record[header] = values[index] ?? '';
			return record;
		}, {});
	});
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
	const values: string[] = [];
	let current = '';
	let quoted = false;

	for (let index = 0; index < line.length; index += 1) {
		const char = line[index];
		if (char === '"') {
			if (quoted && line[index + 1] === '"') {
				current += '"';
				index += 1;
			} else {
				quoted = !quoted;
			}
			continue;
		}

		if (char === delimiter && !quoted) {
			values.push(current);
			current = '';
			continue;
		}

		current += char;
	}

	values.push(current);
	return values;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
	if (!value?.trim()) return fallback;
	return ['1', 'true', 'yes', 'y'].includes(value.trim().toLowerCase());
}

function nullable(value: string | null | undefined): string | null {
	const normalized = value?.trim();
	return normalized ? normalized : null;
}

function parseMetadata(raw: string | undefined): Record<string, unknown> {
	if (!raw?.trim()) {
		return {};
	}

	const parsed = JSON.parse(raw) as unknown;
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('metadata_json must be a JSON object');
	}

	return parsed as Record<string, unknown>;
}
