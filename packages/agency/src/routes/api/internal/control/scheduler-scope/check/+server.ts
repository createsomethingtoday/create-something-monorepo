import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { constantTimeEqual } from '$lib/server/mcp-entitlements';
import { findControlSchedulerActivationScope } from '$lib/server/control-scheduler-scope';

interface SchedulerScopeCheckBody {
  activation_id?: string;
  account_id?: string;
  tenant_id?: string;
  workspace_account_id?: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
  const env = platform?.env;
  if (!env?.DB) {
    return json({ allowed: false, reason: 'agency_database_unavailable' }, { status: 503 });
  }
  const expectedKey = env.AGENCY_INTERNAL_API_KEY?.trim();
  if (!expectedKey) {
    return json({ allowed: false, reason: 'agency_internal_api_not_configured' }, { status: 503 });
  }
  const providedKey =
    request.headers.get('X-API-Key')?.trim() ??
    request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ??
    null;
  if (!providedKey || !constantTimeEqual(expectedKey, providedKey)) {
    return json({ allowed: false, reason: 'unauthorized' }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as SchedulerScopeCheckBody | null;
  const activationId = body?.activation_id?.trim();
  const accountId = body?.account_id?.trim();
  const tenantId = body?.tenant_id?.trim();
  const workspaceAccountId = body?.workspace_account_id?.trim();
  if (!activationId || !accountId || !tenantId || !workspaceAccountId) {
    return json({ allowed: false, reason: 'exact_control_scope_required' }, { status: 400 });
  }
  return json(
    await findControlSchedulerActivationScope(env.DB, {
      activationId,
      accountId,
      tenantId,
      workspaceAccountId
    })
  );
};
