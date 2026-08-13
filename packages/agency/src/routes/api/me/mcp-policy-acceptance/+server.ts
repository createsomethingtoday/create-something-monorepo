import type { RequestHandler } from './$types';
import { createMcpPolicyAcceptancePostHandler } from '$lib/server/mcp-policy-acceptance-core';
import { ensureAgencyMcpEntitlement, requireAgencySessionUser } from '$lib/server/mcp-token';
import { recordAgencyMcpPolicyAcceptance } from '$lib/server/mcp-entitlements';

export const POST: RequestHandler = createMcpPolicyAcceptancePostHandler({
  requireAgencySessionUser,
  ensureAgencyMcpEntitlement,
  recordAgencyMcpPolicyAcceptance
});
