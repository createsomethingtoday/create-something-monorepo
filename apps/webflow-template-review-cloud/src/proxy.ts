export const TEMPLATE_REVIEW_UPSTREAM_ORIGIN =
  'https://webflow-template-review-mcp.createsomething.workers.dev';

export interface TemplateReviewProxyDependencies {
  fetch?: (request: Request) => Promise<Response>;
}

export async function proxyTemplateReviewRequest(
  request: Request,
  dependencies: TemplateReviewProxyDependencies = {},
): Promise<Response> {
  const publicUrl = new URL(request.url);
  const upstreamUrl = new URL(`${publicUrl.pathname}${publicUrl.search}`, TEMPLATE_REVIEW_UPSTREAM_ORIGIN);
  const upstreamRequest = new Request(upstreamUrl, request);
  const upstreamResponse = await (dependencies.fetch ?? globalThis.fetch)(upstreamRequest);
  const responseHeaders = new Headers(upstreamResponse.headers);
  const publicOrigin = publicUrl.origin;
  const challenge = responseHeaders.get('WWW-Authenticate');
  if (challenge) {
    responseHeaders.set(
      'WWW-Authenticate',
      challenge.replaceAll(TEMPLATE_REVIEW_UPSTREAM_ORIGIN, publicOrigin),
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
      headers: responseHeaders,
    });
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}
