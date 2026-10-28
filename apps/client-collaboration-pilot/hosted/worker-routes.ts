import { proposalHttp } from './agent-http.mjs';
import { BoundaryError, type D1 } from './common';
import { membershipBoundary } from './identity';
import { persistence } from './persistence';
import { collaborationService } from './service';
import { httpBoundary } from './http';
import { MAVERICK_PROJECT } from './project';
import { workerPreview, workerPreviewTarget } from './worker-preview';
export function isCollaborationRoute(path: string) {
  return path === '/collaboration' || path.startsWith('/collaboration/') ||
    path === '/api/collaboration' || path.startsWith('/api/collaboration/');
}
export function workerCollaborationRoutes(options: {
  db: D1; origin: string;
  source: { commit: string; raw: string; repositoryPath: string };
  assets: Record<string, { body: string; contentType: string }>;
  identity?: ReturnType<typeof membershipBoundary>;
}) {
  const { db, origin, source, assets } = options;
  const project = MAVERICK_PROJECT.project;
  const identity = options.identity ?? membershipBoundary(db, {
    issuer: MAVERICK_PROJECT.issuer, audience: MAVERICK_PROJECT.audience,
    jwksUrl: MAVERICK_PROJECT.issuer + '/.well-known/jwks.json',
  });
  const store = persistence(db, identity.accepts);
  const target = workerPreviewTarget(origin);
  const preview = workerPreview({ store, source, project, repository: MAVERICK_PROJECT.repository, target });
  return { async fetch(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    if (!isCollaborationRoute(url.pathname)) return null;
    try {
      if (url.origin !== origin || url.search) throw new BoundaryError('request_rejected', 403);
      if (url.pathname === '/api/collaboration/mcp') {
        if (request.headers.has('origin') && request.headers.get('origin') !== origin) throw new BoundaryError('request_rejected', 403);
        const grant = await identity.resolveTaskGrant(request, project, origin + '/api/collaboration/mcp');
        const service = collaborationService({ store, project, repository: MAVERICK_PROJECT.repository, target,
          readObservation: () => preview.readObservation(grant.member) });
        return await proposalHttp(request, service.agentTools(grant.member, grant.taskId));
      }
      const member = await identity.resolve(request, project);
      const previewPath = url.pathname.match(/^\/collaboration\/preview\/(?:([a-f0-9-]{36})\/)?$/);
      if (request.method === 'GET' && previewPath) return await preview.render(member, previewPath[1]);
      const sourcePath = url.pathname.match(/^\/collaboration\/source\/([a-f0-9-]{36})\.json$/);
      if (request.method === 'GET' && sourcePath) return Response.json(await preview.sourceProposal(member, sourcePath[1]), { headers: {
        'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff',
        'content-disposition': 'attachment; filename="reviewed-source-proposal.json"',
      } });
      if (request.method === 'GET' && url.pathname === '/collaboration') return new Response(null, { status: 303, headers: { location: '/collaboration/' } });
      if (request.method === 'GET' && Object.hasOwn(assets, url.pathname)) {
        const asset = assets[url.pathname];
        return new Response(asset.body, { headers: {
          'content-type': asset.contentType, 'cache-control': 'private, no-store',
          'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
          'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
        } });
      }
      const service = collaborationService({ store, project, repository: MAVERICK_PROJECT.repository, target,
        readObservation: () => preview.readObservation(member), productionApprover: MAVERICK_PROJECT.productionApprover });
      return await httpBoundary({ origin, project, identity, service,
        publishPreview: preview.publish,
      }).fetch(request);
    } catch (e) {
      return Response.json({ error: e instanceof BoundaryError ? e.code : 'temporarily_unavailable' }, {
        status: e instanceof BoundaryError ? e.status : 503, headers: { 'cache-control': 'no-store' },
      });
    }
  } };
}

// Refresh before the HTML redirect; never proxy an unauthorized document to Sandbox.
export async function serveCollaboration(request: Request,
  routes: { fetch(r: Request): Promise<Response | null> },
  refreshAccess: (r: Request) => Promise<{ request: Request; setCookies: string[] } | null>,
) {
  let response = await routes.fetch(request);
  let cookies: string[] = [];
  if (response?.status === 401) {
    const refreshed = await refreshAccess(request);
    if (refreshed) { cookies = refreshed.setCookies; response = await routes.fetch(refreshed.request); }
  }
  if (response?.status === 401 && request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
    response = new Response(null, { status: 303, headers: { location: '/sign-in?next=collaboration', 'cache-control': 'no-store' } });
  const headers = new Headers(response?.headers);
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(response?.body ?? null, { status: response?.status ?? 404, headers });
}
