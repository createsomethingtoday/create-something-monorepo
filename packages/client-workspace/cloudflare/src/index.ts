import { getSandbox, Sandbox } from '@cloudflare/sandbox';
import { resolveApplicationAccess } from '@create-something/canon/auth/access';

import { createIdentityRoutes } from '../../src/lib/cloudflare/identity-routes.js';
import { D1WorkspaceActivityLedger } from '../../src/lib/cloudflare/activity-ledger.js';
import { CloudflareSandboxGateway } from '../../src/lib/cloudflare/sandbox-gateway.js';
import {
  D1WorkspaceSnapshotLedger,
  R2WorkspaceSnapshotObjects
} from '../../src/lib/cloudflare/snapshot-bindings.js';
import { WorkspaceSnapshotStore } from '../../src/lib/cloudflare/snapshot-store.js';
import { createClientWorkspaceWorker } from '../../src/lib/cloudflare/worker.js';

interface Env {
  Sandbox: DurableObjectNamespace<Sandbox>;
  DB: D1Database;
  SNAPSHOTS: R2Bucket;
  IDENTITY_API_URL: string;
  CS_IDENTITY_ISSUER: string;
  CS_IDENTITY_JWKS_URL: string;
  CS_IDENTITY_AUDIENCE: string;
  CS_AUTH_ALLOWED_EMAILS: string;
  WORKSPACE_COOKIE_SECRET: string;
  OPENAI_API_KEY: string;
}

const securityHeaders: Record<string, string> = {
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};

function withSecurityHeaders(response: Response, setCookies: string[] = []): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value);
  headers.set('cache-control', headers.get('cache-control') ?? 'no-store');
  for (const value of setCookies) headers.append('set-cookie', value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export { Sandbox };

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    const identityRoutes = createIdentityRoutes({
      identityApiUrl: env.IDENTITY_API_URL,
      fetch: globalThis.fetch
    });
    const identityResponse = await identityRoutes.fetch(request);
    if (identityResponse) return withSecurityHeaders(identityResponse);

    if (!env.WORKSPACE_COOKIE_SECRET || !env.OPENAI_API_KEY) {
      return withSecurityHeaders(
        Response.json({ error: 'workspace_not_configured' }, { status: 503 })
      );
    }

    const applicationAccess = (protectedRequest: Request) =>
      resolveApplicationAccess({
        request: protectedRequest,
        signInUrl: '/sign-in',
        verification: {
          issuer: env.CS_IDENTITY_ISSUER,
          jwksUrl: env.CS_IDENTITY_JWKS_URL,
          audience: [env.CS_IDENTITY_AUDIENCE],
          fetch: globalThis.fetch
        },
        policy: {
          allowedEmails: env.CS_AUTH_ALLOWED_EMAILS.split(',')
            .map((email) => email.trim())
            .filter(Boolean)
        },
        preview: { enabled: false, environment: 'production' }
      });
    let refreshedCookies: string[] = [];
    const resolveAccess = async (protectedRequest: Request) => {
      const initial = await applicationAccess(protectedRequest);
      if (initial.status !== 'anonymous' && initial.status !== 'invalid') return initial;
      const refreshed = await identityRoutes.refreshAccess(protectedRequest);
      if (!refreshed) return initial;
      refreshedCookies = refreshed.setCookies;
      return await applicationAccess(refreshed.request);
    };

    const worker = createClientWorkspaceWorker({
      cookieSecret: env.WORKSPACE_COOKIE_SECRET,
      resolveAccess,
      sandbox: new CloudflareSandboxGateway({
        binding: env.Sandbox,
        openaiApiKey: env.OPENAI_API_KEY,
        snapshots: new WorkspaceSnapshotStore({
          ledger: new D1WorkspaceSnapshotLedger(env.DB),
          objects: new R2WorkspaceSnapshotObjects(env.SNAPSHOTS)
        }),
        activity: new D1WorkspaceActivityLedger(env.DB),
        waitUntil: (task) => context.waitUntil(task),
        onSnapshotError: (snapshot) =>
          console.error('client_workspace_snapshot_failed', snapshot),
        onActivityError: (activity) =>
          console.error('client_workspace_activity_failed', activity),
        getSandbox(binding, sandboxId, options) {
          return getSandbox(
            binding as DurableObjectNamespace<Sandbox>,
            sandboxId,
            options
          ) as never;
        }
      })
    });

    try {
      return withSecurityHeaders(await worker.fetch(request), refreshedCookies);
    } catch (error) {
      console.error('client_workspace_request_failed', {
        path: new URL(request.url).pathname,
        kind: error instanceof Error ? error.name : 'unknown'
      });
      return withSecurityHeaders(
        Response.json({ error: 'workspace_unavailable' }, { status: 503 }),
        refreshedCookies
      );
    }
  }
};
