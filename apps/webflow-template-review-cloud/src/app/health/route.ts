import { TEMPLATE_REVIEW_UPSTREAM_ORIGIN } from '../../proxy';

export const dynamic = 'force-dynamic';

const JSON_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

export async function GET(request: Request): Promise<Response> {
  const publicOrigin = new URL(request.url).origin;
  try {
    const upstreamResponse = await fetch(`${TEMPLATE_REVIEW_UPSTREAM_ORIGIN}/health`, {
      headers: { Accept: 'application/json' },
    });
    const health = await upstreamResponse.json();
    return Response.json(
      {
        name: 'webflow-template-review-cloud',
        status: upstreamResponse.ok ? 'ok' : 'degraded',
        adapter: 'transparent-proxy',
        publicOrigin,
        upstream: {
          origin: TEMPLATE_REVIEW_UPSTREAM_ORIGIN,
          status: upstreamResponse.status,
          health,
        },
        endpoints: {
          mcp: '/mcp',
          sse: '/sse',
          discovery: '/.well-known/oauth-protected-resource',
        },
      },
      {
        status: upstreamResponse.ok ? 200 : 502,
        headers: JSON_HEADERS,
      },
    );
  } catch {
    return Response.json(
      {
        name: 'webflow-template-review-cloud',
        status: 'degraded',
        adapter: 'transparent-proxy',
        publicOrigin,
        upstream: {
          origin: TEMPLATE_REVIEW_UPSTREAM_ORIGIN,
          status: null,
          error: 'Template Review Worker is unavailable.',
        },
      },
      { status: 502, headers: JSON_HEADERS },
    );
  }
}
