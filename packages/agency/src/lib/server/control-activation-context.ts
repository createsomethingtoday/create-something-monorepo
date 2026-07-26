import { error } from '@sveltejs/kit';
import { ensureAgencyMcpEntitlement, type AgencySessionUser } from './mcp-token.js';
import { deriveControlActivationRole } from './control-activation-role.js';

export async function resolveControlActivationContext(input: {
  platform: App.Platform | undefined;
  user: AgencySessionUser;
  clock?: () => string;
}) {
  const { row, decision, snapshot } = await ensureAgencyMcpEntitlement({
    platform: input.platform,
    user: input.user
  });
  if (!decision.allowed) throw error(403, `Control access denied: ${decision.reason}`);
  if (snapshot.service_tier === 'mcp_only') {
    throw error(403, 'Control access requires a governed execution entitlement');
  }
  if (!row.account_id || !row.tenant_id || !row.workspace_account_id) {
    throw error(403, 'Control identity is not fully provisioned');
  }
  const scope = {
    authSubject: input.user.id,
    accountId: row.account_id,
    tenantId: row.tenant_id,
    workspaceAccountId: row.workspace_account_id
  };
  return {
    scope,
    actor: {
      subject: input.user.id,
      role: deriveControlActivationRole({
        email: input.user.email,
        metadataJson: row.metadata_json,
        operatorEmails: input.platform?.env?.AGENCY_OPERATOR_EMAILS
      }),
      entitlement: {
        schema: 'create-something/control-entitlement-snapshot@1' as const,
        source: 'agency_mcp_entitlements' as const,
        accountId: scope.accountId,
        tenantId: scope.tenantId,
        workspaceAccountId: scope.workspaceAccountId,
        capturedAt: (input.clock ?? (() => new Date().toISOString()))(),
        allowed: decision.allowed,
        reason: decision.reason,
        snapshot
      }
    }
  };
}
