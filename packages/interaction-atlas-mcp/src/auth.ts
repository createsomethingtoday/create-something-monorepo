/**
 * Interaction Atlas — Auth Provider
 *
 * V1 is intentionally simple: we support public read-only access (no key) and
 * optional API-key based account scoping for client-specific workflows.
 *
 * For production, you likely want OAuth or a proper token store. This provider
 * keeps the primitive relative while we prove out the Atlas workflow layer.
 */

import type { AuthProvider, AccountContext } from '@create-something/mcp-core';
import { AuthError, defaultPolicy } from '@create-something/mcp-core';
import type { D1Database } from '@create-something/mcp-core';

export type InteractionAtlasEnv = {
  /**
   * Optional API key map for multi-account access.
   *
   * Format:
   *   "key1:account-a,key2:account-b"
   *   "key1:account-a:admin,key2:account-b:operator"
   *
   * If unset, any presented API key maps to the `default` account.
   */
  API_KEYS?: string;
  GIT_SHA?: string;
  RUNTIME_REF?: string;
  POLICY_VERSION_ID?: string;
  DB?: D1Database;
};

type AccountRole = 'admin' | 'operator' | 'auditor' | 'readonly';

type ApiKeyBinding = {
  accountId: string;
  role: AccountRole;
};

function parseApiKeys(value: string | undefined): Map<string, ApiKeyBinding> {
  const map = new Map<string, ApiKeyBinding>();
  if (!value) return map;

  for (const rawPair of value.split(',')) {
    const pair = rawPair.trim();
    if (!pair) continue;
    const idx = pair.indexOf(':');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const rhs = pair.slice(idx + 1).trim();
    const [accountIdRaw, roleRaw] = rhs.split(':');
    const accountId = accountIdRaw?.trim();
    const role = roleRaw?.trim() as AccountRole | undefined;
    if (!key || !accountId) continue;
    map.set(key, {
      accountId,
      role: role === 'admin' || role === 'operator' || role === 'auditor' || role === 'readonly' ? role : 'operator',
    });
  }

  return map;
}

function roleCanWrite(role: AccountRole): boolean {
  return role === 'admin' || role === 'operator';
}

function roleCanApprove(role: AccountRole): boolean {
  return role === 'admin' || role === 'operator';
}

function extractApiKey(request: Request | null): string | null {
  if (!request) return process.env.API_KEY ?? null;

  const headerKey = request.headers.get('x-api-key');
  if (headerKey) return headerKey;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  return null;
}

export class InteractionAtlasAuthProvider implements AuthProvider<InteractionAtlasEnv> {
  async resolve(request: Request | null, env?: InteractionAtlasEnv): Promise<AccountContext> {
    const apiKey = extractApiKey(request);
    const requestUrl = request ? new URL(request.url) : null;
    const baseUrl = requestUrl ? `${requestUrl.protocol}//${requestUrl.host}` : null;
    const gitSha = env?.GIT_SHA ?? process.env.GIT_SHA ?? 'unknown';
    const runtimeRef = env?.RUNTIME_REF ?? process.env.RUNTIME_REF ?? 'unknown';
    const policyVersionId = env?.POLICY_VERSION_ID ?? process.env.POLICY_VERSION_ID ?? 'policy-v1';

    // Public, read-only access (used for the workflow viewer).
    if (!apiKey) {
      return {
        accountId: 'public',
        tokenProvider: { getAccessToken: async () => '' },
        metadata: {
          auth: 'none',
          baseUrl,
          gitSha,
          runtimeRef,
          policyVersionId,
          db: env?.DB,
        },
        policy: defaultPolicy({
          readOnly: true,
          scopes: ['atlas:read', 'workflow:read'],
          constraints: {
            allowVersionOverride: false,
            allowVersionSelectionWrite: false,
          },
        }),
      };
    }

    const configuredKeys = parseApiKeys(env?.API_KEYS ?? process.env.API_KEYS);
    const binding = configuredKeys.size > 0 ? configuredKeys.get(apiKey) : { accountId: 'default', role: 'operator' as AccountRole };

    if (configuredKeys.size > 0 && !binding) {
      throw new AuthError('Invalid API key.');
    }
    const accountId = binding?.accountId ?? 'default';
    const role = binding?.role ?? 'operator';
    const canWrite = roleCanWrite(role);
    const canApprove = roleCanApprove(role);

    return {
      accountId,
      tokenProvider: { getAccessToken: async () => apiKey },
      metadata: {
        auth: 'api_key',
        role,
        baseUrl,
        gitSha,
        runtimeRef,
        policyVersionId,
        db: env?.DB,
      },
      policy: defaultPolicy({
        readOnly: !canWrite,
        scopes: canWrite ? ['atlas:read', 'workflow:read', 'workflow:write'] : ['atlas:read', 'workflow:read'],
        constraints: {
          allowVersionOverride: canWrite,
          allowVersionSelectionWrite: canWrite,
          allowControlPlaneWrite: canWrite,
          allowApprovalDecide: canApprove,
        },
      }),
    };
  }
}
