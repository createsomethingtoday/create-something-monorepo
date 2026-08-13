import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ensureAgencyMcpEntitlement } from '$lib/server/mcp-token';
import {
  getSettledValue,
  loadManagedTokenSnapshot,
  loadPasswordSnapshot
} from '$lib/server/access-state';
import { resolveMcpAccessAssignment } from '$lib/server/mcp-access-assignments';
import { normalizeAgencyServiceTier } from '$lib/server/mcp-entitlements';
import { listPartnerProspectClaimsForAgencyUser } from '$lib/server/partner-prospect-discovery';

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

function readPolicyAcceptanceReceipt(metadataJson: string): {
  acceptedAt: string | null;
  policyReference: string | null;
} {
  try {
    const metadata = JSON.parse(metadataJson) as Record<string, unknown>;
    return {
      acceptedAt:
        typeof metadata.policy_accepted_at === 'string' ? metadata.policy_accepted_at : null,
      policyReference:
        typeof metadata.policy_reference === 'string' ? metadata.policy_reference : null
    };
  } catch {
    return { acceptedAt: null, policyReference: null };
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
    user
  });

  const normalizedEmail = user.email.toLowerCase();

  const [
    commercialResult,
    contractResult,
    partnerResult,
    tokenSnapshotResult,
    passwordSnapshotResult,
    prospectsResult
  ] = await Promise.allSettled([
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
    loadManagedTokenSnapshot(platform, user.id),
    loadPasswordSnapshot(platform, user.email),
    listPartnerProspectClaimsForAgencyUser({
      db,
      authSubject: user.id,
      email: user.email,
      env: platform?.env
    })
  ]);

  const commercial = getSettledValue(commercialResult, null);
  const contract = getSettledValue(contractResult, null);
  const partner = getSettledValue(partnerResult, null);
  const tokenSnapshot = getSettledValue(tokenSnapshotResult, {
    token: null,
    available: false,
    error: 'Token state is temporarily unavailable'
  });
  const passwordSnapshot = getSettledValue(passwordSnapshotResult, {
    hasPassword: false,
    email: user.email,
    emailVerified: false,
    identityUserExists: false,
    available: false,
    error: 'Password state is temporarily unavailable'
  });
  const prospects = getSettledValue(prospectsResult, []);
  const policyAcceptanceReceipt = readPolicyAcceptanceReceipt(entitlement.metadata_json);
  const assignment = await resolveMcpAccessAssignment(db, {
    email: user.email,
    accountId: entitlement.account_id,
    tenantId: entitlement.tenant_id,
    workspaceAccountId: entitlement.workspace_account_id,
    authSubject: user.id
  });

  return {
    user,
    overview: {
      accessAllowed: decision.allowed,
      accessReason: decision.reason,
      serviceTier: normalizeAgencyServiceTier(commercial?.service_tier ?? entitlement.service_tier),
      connectedAccounts: (partner?.toolkit_accounts ?? 0) + (partner?.notion_accounts ?? 0),
      tokenActive: Boolean(tokenSnapshot.token?.active),
      hasChatGptPassword: passwordSnapshot.hasPassword
    },
    entitlement: {
      updatedAt: entitlement.updated_at,
      accountId: entitlement.account_id,
      tenantId: entitlement.tenant_id,
      decision,
      policyAcceptedAt: policyAcceptanceReceipt.acceptedAt,
      policyReference: policyAcceptanceReceipt.policyReference
    },
    access: {
      token: tokenSnapshot.token,
      tokenAvailable: tokenSnapshot.available,
      tokenError: tokenSnapshot.error,
      password: passwordSnapshot
    },
    commercial: commercial ?? null,
    contract: contract ?? null,
    partner: partner ?? null,
    prospects,
    assignment
  };
};
