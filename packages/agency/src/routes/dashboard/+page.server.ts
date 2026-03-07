import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ensureAgencyMcpEntitlement } from '$lib/server/mcp-token';
import { postIdentityAdmin, PartnerAuthHttpError } from '$lib/server/partner-auth';

interface CommercialStateRow {
	service_tier: string | null;
	subscription_status: string | null;
	contract_active: number;
	billing_active: number;
	current_period_end: string | null;
	last_invoice_status: string | null;
}

interface ContractStateRow {
	contract_reference: string;
	contract_status: 'draft' | 'pending' | 'active' | 'paused' | 'expired' | 'terminated';
	effective_at: string | null;
	expires_at: string | null;
}

interface PartnerSummaryRow {
	partner_key: string;
	slug: string;
	status: string;
	workspace_account_id: string;
	identity_tenant_id: string | null;
	owner_email: string | null;
	consent_active: number;
	toolkit_accounts: number;
	notion_accounts: number;
}

interface TokenMetadataResponse {
	token: {
		id: string;
		auth_subject: string;
		auth_email: string | null;
		account_id: string;
		tenant_id: string;
		token_prefix: string;
		tool_mode: 'read_only' | 'read_write';
		toolkit_profile: string[];
		allowed_tool_prefixes: string[];
		last_used_at: string | null;
		revoked_at: string | null;
		created_at: string;
		updated_at: string;
		active: boolean;
	} | null;
}

interface PasswordUserResponse {
	user: {
		id: string;
		email: string;
		email_verified: boolean;
	} | null;
	has_password: boolean;
}

async function loadTokenSnapshot(platform: App.Platform | undefined, authSubject: string) {
	const env = platform?.env;
	if (!env) {
		return {
			token: null,
			available: false,
			error: 'Platform env is unavailable',
		};
	}

	try {
		const payload = await postIdentityAdmin<TokenMetadataResponse>(env, '/v1/mcp/long-lived-tokens/admin-get', {
			auth_subject: authSubject,
		});
		return {
			token: payload.token,
			available: true,
			error: null,
		};
	} catch (error) {
		if (error instanceof PartnerAuthHttpError) {
			return {
				token: null,
				available: false,
				error: error.message,
			};
		}

		return {
			token: null,
			available: false,
			error: error instanceof Error ? error.message : 'Failed to load token state',
		};
	}
}

async function loadPasswordSnapshot(platform: App.Platform | undefined, email: string) {
	const env = platform?.env;
	if (!env) {
		return {
			hasPassword: false,
			email: null,
			emailVerified: false,
			identityUserExists: false,
			available: false,
			error: 'Platform env is unavailable',
		};
	}

	try {
		const payload = await postIdentityAdmin<PasswordUserResponse>(env, '/v1/auth/password/admin-get', {
			email,
		});
		return {
			hasPassword: payload.has_password,
			email: payload.user?.email ?? email,
			emailVerified: payload.user?.email_verified ?? false,
			identityUserExists: Boolean(payload.user),
			available: true,
			error: null,
		};
	} catch (error) {
		if (error instanceof PartnerAuthHttpError) {
			return {
				hasPassword: false,
				email,
				emailVerified: false,
				identityUserExists: false,
				available: false,
				error: error.message,
			};
		}

		return {
			hasPassword: false,
			email,
			emailVerified: false,
			identityUserExists: false,
			available: false,
			error: error instanceof Error ? error.message : 'Failed to load password state',
		};
	}
}

export const load: PageServerLoad = async ({ parent, platform }) => {
	const { user } = await parent();

	if (!user) {
		throw redirect(303, '/login?redirect=/dashboard');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw redirect(303, '/login?error=database_unavailable');
	}

	const { row: entitlement, decision } = await ensureAgencyMcpEntitlement({
		platform,
		user,
	});

	const normalizedEmail = user.email.toLowerCase();

	const [commercial, contract, partner, tokenSnapshot, passwordSnapshot] = await Promise.all([
		db
			.prepare(
				`SELECT service_tier, subscription_status, contract_active, billing_active,
				        current_period_end, last_invoice_status
				 FROM agency_commercial_accounts
				 WHERE normalized_email = ?
				 ORDER BY billing_active DESC, contract_active DESC, updated_at DESC
				 LIMIT 1`
			)
			.bind(normalizedEmail)
			.first<CommercialStateRow>(),
		db
			.prepare(
				`SELECT contract_reference, contract_status, effective_at, expires_at
				 FROM agency_contract_state
				 WHERE auth_subject = ? OR normalized_email = ?
				 ORDER BY contract_active DESC, updated_at DESC
				 LIMIT 1`
			)
			.bind(user.id, normalizedEmail)
			.first<ContractStateRow>(),
		db
			.prepare(
				`SELECT
				    c.partner_key,
				    c.slug,
				    c.status,
				    c.workspace_account_id,
				    c.identity_tenant_id,
				    c.owner_email,
				    CASE WHEN consent.id IS NULL THEN 0 ELSE 1 END AS consent_active,
				    COUNT(DISTINCT CASE WHEN toolkit.status = 'active' THEN toolkit.id END) AS toolkit_accounts,
				    COUNT(DISTINCT CASE WHEN notion.status = 'active' THEN notion.id END) AS notion_accounts
				 FROM partner_auth_clients c
				 LEFT JOIN partner_auth_consents consent
				   ON consent.partner_client_id = c.id
				  AND consent.revoked_at IS NULL
				  AND (consent.expires_at IS NULL OR consent.expires_at > datetime('now'))
				 LEFT JOIN partner_auth_toolkit_accounts toolkit
				   ON toolkit.partner_client_id = c.id
				 LEFT JOIN partner_auth_notion_accounts notion
				   ON notion.partner_client_id = c.id
				 WHERE c.identity_user_id = ?
				    OR lower(COALESCE(c.owner_email, '')) = ?
				 GROUP BY c.id, c.partner_key, c.slug, c.status, c.workspace_account_id, c.identity_tenant_id, c.owner_email, consent.id
				 ORDER BY
				    CASE c.status
				      WHEN 'active' THEN 0
				      WHEN 'paused' THEN 1
				      WHEN 'initialized' THEN 2
				      ELSE 3
				    END,
				    c.updated_at DESC
				 LIMIT 1`
			)
			.bind(user.id, normalizedEmail)
			.first<PartnerSummaryRow>(),
		loadTokenSnapshot(platform, user.id),
		loadPasswordSnapshot(platform, user.email),
	]);

	return {
		user,
		overview: {
			accessAllowed: decision.allowed,
			accessReason: decision.reason,
			serviceTier: commercial?.service_tier ?? entitlement.service_tier ?? 'agency',
			connectedAccounts: (partner?.toolkit_accounts ?? 0) + (partner?.notion_accounts ?? 0),
			tokenActive: Boolean(tokenSnapshot.token?.active),
			hasChatGptPassword: passwordSnapshot.hasPassword,
		},
		entitlement: {
			updatedAt: entitlement.updated_at,
			accountId: entitlement.account_id,
			tenantId: entitlement.tenant_id,
			decision,
		},
		access: {
			token: tokenSnapshot.token,
			tokenAvailable: tokenSnapshot.available,
			tokenError: tokenSnapshot.error,
			password: passwordSnapshot,
		},
		commercial: commercial ?? null,
		contract: contract ?? null,
		partner: partner ?? null,
	};
};
