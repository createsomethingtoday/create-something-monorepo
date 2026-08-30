export const TEMPLATE_REVIEW_UPSTREAM_ORIGIN =
  'https://webflow-template-review-mcp.createsomething.workers.dev';

const ACCESS_ASSERTION_HEADER = 'cf-access-jwt-assertion';
const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'content-type',
  'last-event-id',
  'mcp-protocol-version',
  'mcp-session-id'
] as const;

export interface TemplateReviewProxyDependencies {
  fetch?: (request: Request) => Promise<Response>;
}

function accessUpstreamPath(pathname: string): string | null {
  if (pathname === '/mcp' || pathname.startsWith('/mcp/')) return `/access${pathname}`;
  if (pathname === '/sse' || pathname.startsWith('/sse/')) return `/access${pathname}`;
  return null;
}

function forwardedHeaders(request: Request, accessAssertion: string | null): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (accessAssertion) headers.set(ACCESS_ASSERTION_HEADER, accessAssertion);
  return headers;
}

function unauthorized(): Response {
  return Response.json(
    {
      error: 'unauthorized',
      message: 'Missing Cloudflare Access application assertion.'
    },
    { status: 401 }
  );
}

export async function proxyTemplateReviewRequest(
  request: Request,
  dependencies: TemplateReviewProxyDependencies = {}
): Promise<Response> {
  const publicUrl = new URL(request.url);
  const accessPath = accessUpstreamPath(publicUrl.pathname);
  const accessAssertion = request.headers.get(ACCESS_ASSERTION_HEADER)?.trim() || null;
  if (accessPath && !accessAssertion) return unauthorized();

  const upstreamPath = accessPath ?? publicUrl.pathname;
  const upstreamUrl = new URL(
    `${upstreamPath}${publicUrl.search}`,
    TEMPLATE_REVIEW_UPSTREAM_ORIGIN
  );
  const body =
    request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer();
  const upstreamRequest = new Request(upstreamUrl, {
    method: request.method,
    headers: forwardedHeaders(request, accessPath ? accessAssertion : null),
    body,
    redirect: 'manual'
  });
  const upstreamResponse = await (dependencies.fetch ?? globalThis.fetch)(upstreamRequest);
  const responseHeaders = new Headers(upstreamResponse.headers);
  const publicOrigin = publicUrl.origin;
  const challenge = responseHeaders.get('WWW-Authenticate');
  if (challenge) {
    responseHeaders.set(
      'WWW-Authenticate',
      challenge.replaceAll(TEMPLATE_REVIEW_UPSTREAM_ORIGIN, publicOrigin)
    );
  }

  if (publicUrl.pathname.startsWith('/.well-known/oauth-protected-resource')) {
    const payload = (await upstreamResponse.json()) as Record<string, unknown>;
    if (typeof payload.resource === 'string') {
      payload.resource = payload.resource.replace(TEMPLATE_REVIEW_UPSTREAM_ORIGIN, publicOrigin);
    }
    responseHeaders.delete('Content-Length');
    responseHeaders.set('Content-Type', 'application/json');
    return new Response(JSON.stringify(payload, null, 2), {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders
    });
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders
  });
}
