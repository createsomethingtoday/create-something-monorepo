import type { ApplicationAccessState } from '@create-something/canon/auth/access';

import { CloudflareWorkspaceRouter } from './workspace-router.js';

export interface ClientWorkspaceSandboxGateway {
  fetch(sandboxId: string, request: Request): Promise<Response>;
}

export interface ClientWorkspaceWorkerOptions {
  cookieSecret: string;
  resolveAccess(request: Request): Promise<ApplicationAccessState>;
  sandbox: ClientWorkspaceSandboxGateway;
}

export interface ClientWorkspaceWorker {
  fetch(request: Request): Promise<Response>;
}

function isDocumentRequest(request: Request): boolean {
  return request.headers.get('accept')?.includes('text/html') === true;
}

function deniedResponse(request: Request, access: ApplicationAccessState): Response {
  if (isDocumentRequest(request)) {
    return new Response(null, { status: 303, headers: { location: access.signInUrl || '/sign-in' } });
  }
  const anonymous = access.status === 'anonymous' || access.status === 'invalid';
  return Response.json(
    { error: anonymous ? 'authentication_required' : 'workspace_access_denied' },
    { status: anonymous ? 401 : 403 }
  );
}

function requestWithoutBrowserAuthority(request: Request): Request {
  const headers = new Headers(request.headers);
  headers.delete('cookie');
  headers.delete('authorization');
  headers.delete('cf-access-jwt-assertion');
  headers.delete('x-forwarded-user');
  headers.delete('x-forwarded-email');
  return new Request(request, { headers });
}

function withWorkspaceCookie(response: Response, setCookie: string | null): Response {
  if (!setCookie) return response;
  const headers = new Headers(response.headers);
  headers.append('set-cookie', setCookie);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function createClientWorkspaceWorker(
  options: ClientWorkspaceWorkerOptions
): ClientWorkspaceWorker {
  const router = new CloudflareWorkspaceRouter({ cookieSecret: options.cookieSecret });

  return {
    async fetch(request) {
      const access = await options.resolveAccess(request);
      if (access.status !== 'allowed') return deniedResponse(request, access);

      const route = await router.resolve({ access, request });
      const response = await options.sandbox.fetch(
        route.sandboxId,
        requestWithoutBrowserAuthority(request)
      );
      return withWorkspaceCookie(response, route.setCookie);
    }
  };
}
